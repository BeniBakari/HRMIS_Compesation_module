from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import requests

from .models import User, ROLE_CHOICES
from .serializers import LoginSerializer, UserSerializer, UserCreateSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        print(serializer.errors)  # Debugging line
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data['user']
    refresh = RefreshToken.for_user(user)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except TokenError:
        pass
    return Response({'detail': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    return Response(UserSerializer(request.user).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    
    """ADMIN only — create a new system user."""
    if not (request.user.has_role('ADMIN') or request.user.has_role('CP_HRM')):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        return Response({
            "user_id": user.id,
            "full_name": user.get_full_name(),
            "force_number": user.force_number,
            "rank": user.rank,
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List users — filtered by role for dropdown usage in committee assignment."""
    role = request.query_params.get('role')
    qs = User.objects.all()
    if role:
        qs = qs.filter(role=role.upper())
    return Response(UserSerializer(qs, many=True).data)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lookup_user_by_force_number(request):
    force_number = request.query_params.get('force_number', '').strip()
    if not force_number:
        return Response({'error': 'force_number is required.'}, status=400)
    try:
        user = User.objects.get(force_number=force_number)
        return Response({
            'user_id':      user.id,
            'full_name':    user.get_full_name(),
            'rank':         user.rank,
            'force_number': user.force_number,
        })
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)



HRMIS_TO_USER_MAP = {
    "email": "email",
    "force_number": "force_number",
    "fname": "first_name",
    "mname": "middle_name",
    "lname": "last_name",
    "checkno": "check_number",
    "nin": "nin",
    "rank": "rank",
    "designation": "role",
    "department": "unit",
    "commands": "station",
    "phoneno": "phone",
    "photo": "profile_photo",
    "signature": "signature",
}
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sync_user_with_hrmis(request, user_id):
    """Check HRMIS data for a user and decide workflow routing without updating role."""
    try:
        user = User.objects.get(id=user_id)
        check_number = user.check_number
        if not check_number:
            return Response(
                {"message": "User has no check_number."},
                status=status.HTTP_400_BAD_REQUEST
            )

        hrmis_data = fetch_hrmis_data(check_number)
        if not hrmis_data or "info" not in hrmis_data:
            return Response(
                {"message": "No data found in HRMIS."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        info = hrmis_data["info"]

        # Map HRMIS fields to User fields, but skip 'role'
        for hrmis_field, user_field in HRMIS_TO_USER_MAP.items():
            if user_field == "role":
                continue  # explicitly skip updating role
            if hrmis_field in info and info[hrmis_field] is not None:
                setattr(user, user_field, info[hrmis_field])

        # If you don’t want to update *any* profile fields, comment out user.save()
        user.save()

        # Decide recipients, status, and message dynamically
        hq_users = list(User.objects.filter(role='COMPENSATION_HQ', is_active=True))
        co_users = list(User.objects.filter(role='COMPENSATION_HQ_CO', is_active=True))

        if hq_users:
            new_status = 'HQ_APPROVED'
            recipients = hq_users
            message = f"User {user.get_full_name()} verified with HRMIS and forwarded to HQ."
        elif co_users:
            new_status = 'CO_APPROVED'
            recipients = co_users
            message = f"User {user.get_full_name()} verified with HRMIS and forwarded to CO."
        else:
            new_status = 'NO_RECIPIENT'
            recipients = []
            message = f"User {user.get_full_name()} verified with HRMIS, but no HQ/CO recipients found."

        return Response(
            {
                "status": new_status,
                "message": message,
                "recipients": [u.email for u in recipients],
                "data": {
                    "user_id": user.id,
                    "full_name": user.get_full_name(),
                    "rank": user.rank,
                    "force_number": user.force_number,
                    "check_number": user.check_number,
                    "email": user.email,
                    "unit": user.unit,
                    "station": user.station,
                    "phone": user.phone,
                    "nin": user.nin,
                    # role intentionally excluded from sync
                }
            },
            status=status.HTTP_200_OK
        )

    except User.DoesNotExist:
        return Response(
            {"message": "User not found."},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request, user_id):
    """Get user details by ID."""
    try:
        user = User.objects.get(id=user_id)
        return Response(UserSerializer(user).data)
    except User.DoesNotExist:
        return Response({'message': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_active(request, user_id):
    """Toggle a user's active status (active → inactive, inactive → active)."""
    try:
        user = User.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save()

        return Response(
            {
                "message": f"User {'activated' if user.is_active else 'deactivated'} successfully.",
                "user_id": user.id,
                "is_active": user.is_active,
            },
            status=status.HTTP_200_OK
        )

    except User.DoesNotExist:
        return Response(
            {"message": "User not found."},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request, user_id):
    """Change a user's password securely."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'message': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    current_password = request.data.get('current_password')
    new_password     = request.data.get('new_password')

    if not current_password or not new_password:
        return Response({'message': 'Both current and new password are required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # ✅ Verify current password
    if not user.check_password(current_password):
        return Response({'message': 'Current password is incorrect.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # ✅ Optional: enforce minimum length or other validators
    if len(new_password) < 8:
        return Response({'message': 'New password must be at least 8 characters.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # ✅ Set new password
    user.set_password(new_password)
    user.save()

    return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)

def fetch_hrmis_data(check_number):
    response = requests.post(
        "http://192.168.10.12/api/authentication",
        headers={
            "key": "mainstore",
            "value": "cc7bdc8b80572f99848145c70d219969d476a53c",
            "Content-Type": "application/json",
        },
        json={"checkno": check_number},
    )

    return response.json()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_role(request, user_id):
    """Update a user's role (ADMIN only)."""
    if not request.user.has_role('ADMIN'):
        return Response({'message': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'message': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_role = request.data.get('role')
    if isinstance(new_role, dict):
        new_role = new_role.get('role')  # ✅ unwrap nested dict

    if not new_role:
        return Response({'message': 'Role is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Hard‑coded valid roles
    valid_roles = {
        "ADMIN",
        "RPC",
        "COMPENSATION_HQ",
        "COMPENSATION_HQ_CO",
        "COMPENSATION_HQ_SO",
        "COMPENSATION_HQ_CHIEF",
        "CP_HRM",
        "CP_ADMINISTRATION",
        "COMMITTEE_MEMBER",
    }

    if new_role not in valid_roles:
        return Response({'message': 'Invalid role specified.'}, status=status.HTTP_400_BAD_REQUEST)

    user.role = new_role
    user.save()

    return Response(
        {
            "message": f"User role updated to {new_role}.",
            "user_id": user.id,
            "new_role": user.role,
        },
        status=status.HTTP_200_OK
    )
