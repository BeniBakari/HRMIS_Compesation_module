from rest_framework.permissions import BasePermission
from .models import CommitteeMember

def _ok(user, *roles):
    if not user or user.is_anonymous:
        return False
    return user.has_any_role(list(roles))

def _is_hq(user):
    if not user or user.is_anonymous:
        return False
    if user.role == 'ADMIN':
        return True
    return str(user.role or '').startswith('COMPENSATION_')

class IsRPC(BasePermission):
    message = 'RPC or Unit Commander role required.'
    def has_permission(self, request, view):
        return _ok(request.user, 'RPC', 'UNIT_COMMANDER', 'ADMIN')

class IsCompensationHQ(BasePermission):
    """HQ — wa kwanza, anavalidate documents."""
    message = 'Compensation HQ role required.'
    def has_permission(self, request, view):
        return _ok(request.user, 'COMPENSATION_HQ', 'ADMIN')  # ← IMEBADILISHWA

class IsCompensationCO(BasePermission):
    """CO — wa pili, anapokea kutoka HQ."""
    message = 'Compensation HQ-CO role required.'
    def has_permission(self, request, view):
        return _ok(request.user, 'COMPENSATION_HQ_CO', 'ADMIN')

class IsCompensationSO(BasePermission):
    """SO — wa tatu, anapokea kutoka CO."""
    message = 'Compensation HQ-SO role required.'
    def has_permission(self, request, view):
        return _ok(request.user, 'COMPENSATION_HQ_SO', 'ADMIN')

class IsCompensationChief(BasePermission):
    """CHIEF — wa mwisho, anasubmit CP_ADMINISTRATION."""
    message = 'Compensation HQ-Chief role required.'
    def has_permission(self, request, view):
        return _ok(request.user, 'COMPENSATION_HQ_CHIEF', 'ADMIN')

class IsCP_HRM(BasePermission):
    message = 'CP_HRM role required.'
    def has_permission(self, request, view):
        return _ok(request.user, 'CP_HRM', 'ADMIN')

class IsCommitteeMember(BasePermission):
    message = 'You are not assigned as a committee member for this case.'
    def has_permission(self, request, view):
        if not request.user or request.user.is_anonymous:
            return False
        case_id = view.kwargs.get('case_id')
        if not case_id:
            return False
        return CommitteeMember.objects.filter(
            case__case_id=case_id,
            user=request.user
        ).exists()

class IsAnyStaff(BasePermission):
    """Any authenticated, active staff member."""
    message = 'Active staff account required.'
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active)