from django.contrib.auth.signals import user_password_changed
from django.dispatch import receiver
from .middleware.default_password import DefaultPasswordMiddleware


@receiver(user_password_changed)
def clear_default_password_flag(sender, request, user, **kwargs):
    """
    Called automatically when password is changed via Django admin or set_password().
    Clears the middleware session flag so user is no longer blocked.
    """
    if request is not None:
        DefaultPasswordMiddleware.clear_flag(request)

    # ✅ Also clear the database flag (covers cases where request is None, e.g. management commands)
    if hasattr(user, 'must_change_password') and user.must_change_password:
        user.must_change_password = False
        user.save(update_fields=['must_change_password'])