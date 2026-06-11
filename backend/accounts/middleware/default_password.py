import logging
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.hashers import check_password
from django.shortcuts import redirect
from django.urls import reverse, NoReverseMatch
from django.http import JsonResponse
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
        print("✅ DefaultPasswordMiddleware: Successfully initialized!")
        logger.info("DefaultPasswordMiddleware initialized successfully")
        
        self._change_url = self._resolve_change_url()
        self._exempt_urls = self._build_exempt_urls()
        self._default_passwords = self._build_password_list()

    def _resolve_change_url(self) -> str:
        configured = getattr(settings, "DEFAULT_PASSWORD_CHANGE_URL", None)
        if configured:
            return configured
        return "/api/auth/users/change-password/"   # Default for your React + DRF setup

    def _build_exempt_urls(self) -> list:
        defaults = [
            self._change_url,
            "/api/auth/login/",
            "/api/auth/logout/",
            "/api/token/",
            "/api/token/refresh/",
            "/admin/logout/",
            "/accounts/logout/",
        ]
        extra = getattr(settings, "DEFAULT_PASSWORD_EXEMPT_URLS", [])
        return list(set(defaults + list(extra)))

    def _build_password_list(self) -> list:
        extra = getattr(settings, "DEFAULT_PASSWORDS", [])
        return list(set(BUILTIN_DEFAULT_PASSWORDS + [p.lower() for p in extra]))

    def _is_exempt(self, request) -> bool:
        return any(request.path.startswith(url) for url in self._exempt_urls)

    def __call__(self, request):
        user = getattr(request, "user", None)

        # Only check authenticated users
        if user and user.is_authenticated and not self._is_exempt(request):
            flag = request.session.get(self.SESSION_KEY)

            if flag is None:
                has_default = self._has_default_password(request)
                request.session[self.SESSION_KEY] = has_default
                request.session.modified = True
                flag = has_default

            if flag is True:
                # API Response (for React Frontend)
                if request.headers.get('Accept') == 'application/json' or 'api' in request.path.lower():
                    return JsonResponse({
                        "detail": "Nenosiri lako ni dhaifu au la kawaida. Tafadhali libadilishe ili uendelee.",
                        "requires_password_change": True,
                        "change_url": self._change_url
                    }, status=403)

                # Normal Django redirect (if needed)
                messages.warning(
                    request,
                    "Nenosiri lako ni dhaifu au la kawaida. Tafadhali libadilishe ili uendelee."
                )
                return redirect(self._change_url)

        return self.get_response(request)

    def _has_default_password(self, request) -> bool:
        user = request.user
        hashed = getattr(user, 'password', None)
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
                        "Weak/default password detected for user '%s' (id=%s)",
                        username or "unknown", user.pk
                    )
                    return True
            except Exception:
                continue

        return False

    @staticmethod
    def clear_flag(request) -> None:
        """Call this after successful password change"""
        if hasattr(request, 'session'):
            request.session.pop(DefaultPasswordMiddleware.SESSION_KEY, None)
            request.session.modified = True
