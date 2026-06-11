import logging
from django.conf import settings
from django.contrib.auth.hashers import check_password
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

    def __init__(self, get_response):
        self.get_response = get_response
        self._change_url = getattr(settings, 'DEFAULT_PASSWORD_CHANGE_URL', '/api/auth/users/change-password/')
        self._exempt_urls = self._build_exempt_urls()
        self._default_passwords = self._build_password_list()
        logger.info("✅ DefaultPasswordMiddleware initialized")

    def _build_exempt_urls(self) -> list:
        defaults = [
            self._change_url,
            '/api/auth/login/',
            '/api/auth/logout/',
            '/api/token/',
            '/api/token/refresh/',
            '/admin/',
        ]
        extra = getattr(settings, 'DEFAULT_PASSWORD_EXEMPT_URLS', [])
        return list(set(defaults + list(extra)))

    def _build_password_list(self) -> list:
        extra = getattr(settings, 'DEFAULT_PASSWORDS', [])
        return list(set(BUILTIN_DEFAULT_PASSWORDS + [p.lower() for p in extra]))

    def _is_exempt(self, request) -> bool:
        return any(request.path.startswith(url) for url in self._exempt_urls)

    def __call__(self, request):
        user = getattr(request, 'user', None)

        if user and user.is_authenticated and not self._is_exempt(request):

            if getattr(user, 'must_change_password', False):
                logger.warning("User '%s' must change password (flag set)", user.get_username())
                return JsonResponse({
                    'detail': 'You must change your password before continuing.',
                    'requires_password_change': True,
                    'change_url': self._change_url,
                }, status=403)

            if self._has_default_password(user):
                logger.warning("User '%s' has a weak/default password", user.get_username())
                return JsonResponse({
                    'detail': 'Your password is weak or default. Please change it to continue.',
                    'requires_password_change': True,
                    'change_url': self._change_url,
                }, status=403)

        return self.get_response(request)

    def _has_default_password(self, user) -> bool:
        hashed = getattr(user, 'password', None)
        if not hashed:
            return False

        candidates = list(self._default_passwords)

        username = user.get_username()
        if username:
            candidates += [username, username.lower(), username.upper()]

        email = getattr(user, 'email', '') or ''
        if email and '@' in email:
            candidates.append(email.split('@')[0].lower())

        for candidate in candidates:
            try:
                if check_password(candidate, hashed):
                    return True
            except Exception:
                continue

        return False

    @staticmethod
    def clear_flag(request) -> None:
        pass
