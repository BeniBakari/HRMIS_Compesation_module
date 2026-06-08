import logging
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.hashers import check_password
from django.shortcuts import redirect
from django.urls import reverse, NoReverseMatch

logger = logging.getLogger(__name__)

BUILTIN_DEFAULT_PASSWORDS = [
    "password", "password1", "password123",
    "123456", "12345678", "123456789", "1234567890",
    "admin", "admin123", "administrator",
    "letmein", "welcome", "welcome1",
    "changeme", "change_me", "default",
    "pass", "pass123", "qwerty", "qwerty123",
    "abc123", "iloveyou", "secret",
    "test", "test123", "guest", "guest123",
    "user", "user123", "login", "login123", "!@#$1234",
]


class DefaultPasswordMiddleware:
    SESSION_KEY = "_default_pwd_checked"

    def __init__(self, get_response):
        self.get_response = get_response
        self._change_url = self._resolve_change_url()
        self._exempt_urls = self._build_exempt_urls()
        self._default_passwords = self._build_password_list()

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _resolve_change_url(self) -> str:
        configured = getattr(settings, "DEFAULT_PASSWORD_CHANGE_URL", None)
        if configured:
            return configured
        for name in ("password_change", "account_change_password"):
            try:
                return reverse(name)
            except NoReverseMatch:
                pass
        return "/accounts/password_change/"

    def _build_exempt_urls(self) -> list:
        defaults = [
            self._change_url,
            "/accounts/logout/",
            "/accounts/login/",
            "/admin/logout/",
            "/api/auth/login/",
            "/api/auth/logout/",
            "/api/token/",
            "/api/token/refresh/",
        ]
        extra = getattr(settings, "DEFAULT_PASSWORD_EXEMPT_URLS", [])
        return list(set(defaults + list(extra)))

    def _build_password_list(self) -> list:
        extra = getattr(settings, "DEFAULT_PASSWORDS", [])
        return list(set(BUILTIN_DEFAULT_PASSWORDS + [p.lower() for p in extra]))

    def _is_exempt(self, request) -> bool:
        return any(request.path.startswith(url) for url in self._exempt_urls)

    # ------------------------------------------------------------------ #
    # Main entry point — only ONE __call__                                 #
    # ------------------------------------------------------------------ #

    def __call__(self, request):
        user = getattr(request, "user", None)
        print("DefaultPasswordMiddleware: Checking user", user)
        # Only act on authenticated users outside exempt paths
        if user and user.is_authenticated and not self._is_exempt(request):
            flag = request.session.get(self.SESSION_KEY)

            # Not checked yet this session — check now
            if flag is None:
                if self._has_default_password(request):
                    request.session[self.SESSION_KEY] = True
                    request.session.modified = True
                else:
                    request.session[self.SESSION_KEY] = False
                    request.session.modified = True
                flag = request.session.get(self.SESSION_KEY)

            # If flagged, block and redirect
            if flag is True:
                messages.warning(
                    request,
                    "Nenosiri lako ni dhaifu au la kawaida. Tafadhali libadilishe ili uendelee.",
                )
                return redirect(self._change_url)

        return self.get_response(request)

    # ------------------------------------------------------------------ #
    # Password check                                                       #
    # ------------------------------------------------------------------ #

    def _has_default_password(self, request) -> bool:
        user = request.user
        hashed = user.password
        if not hashed:
            return False

        candidates = list(self._default_passwords)

        username = user.get_username()
        if username:
            candidates += [username, username.lower(), username.upper()]

        email = getattr(user, "email", "") or ""
        if email and "@" in email:
            candidates.append(email.split("@")[0].lower())

        for candidate in candidates:
            try:
                if check_password(candidate, hashed):
                    logger.warning(
                        "Mtumiaji '%s' (id=%s) anatumia nenosiri dhaifu.",
                        username,
                        user.pk,
                    )
                    return True
            except Exception:
                continue

        return False

    # ------------------------------------------------------------------ #
    # Call this after successful password change to lift the lock         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def clear_flag(request) -> None:
        request.session.pop(DefaultPasswordMiddleware.SESSION_KEY, None)
        request.session.modified = True