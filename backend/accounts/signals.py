# accounts/signals.py
from django.contrib.auth.signals import user_logged_in, user_password_changed
from django.dispatch import receiver
from .middleware.default_password import DefaultPasswordMiddleware

@receiver(user_password_changed)
def clear_default_password_flag(sender, user, **kwargs):
    # This will be called when password is changed via admin or set_password()
    if hasattr(user, '_request'):  # if request is available
        DefaultPasswordMiddleware.clear_flag(user._request)