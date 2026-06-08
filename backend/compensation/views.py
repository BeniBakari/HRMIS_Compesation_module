from datetime import date, timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction

from .models import (
    CompensationCase, CaseDocument, CommitteeMember,
    MemberAssessmentInput, CompensationFormula, Assessment,
    AuditLog, Notification, REQUIRED_DOCS,
    ACTION_CASE_SUBMITTED, ACTION_VALIDATION_DECISION,
    ACTION_COMMITTEE_FORMED, ACTION_MEMBER_INPUT, ACTION_ASSESSMENT_COMPLETE,
)
from .permissions import (
    IsRPC, IsCompensationHQ, IsCompensationCO,
    IsCompensationSO, IsCompensationChief,
    IsCP_HRM, IsCommitteeMember, IsAnyStaff,
)
from .serializers import (
    CaseListSerializer, CaseDetailSerializer, CaseSubmissionSerializer,
    DocumentUploadSerializer, CommitteeFormationSerializer,
    MemberInputSerializer, AssessmentSerializer, FormulaSerializer,
    AuditLogSerializer, NotificationSerializer, HQReviewSerializer,
)
from .utils import (
    generate_case_id, validate_documents, transition_status,
    compute_final_assessment, send_notification, get_client_ip,
    signature_hash, fetch_soldier_from_hr_core,
)
from accounts.models import User


# ── User group helpers ────────────────────────────────────────────────────────

def _hq_users_only():
    return list(User.objects.filter(role='COMPENSATION_HQ', is_active=True))

def _co_users():
    return list(User.objects.filter(role='COMPENSATION_HQ_CO', is_active=True))

def _so_users():
    return list(User.objects.filter(role='COMPENSATION_HQ_SO', is_active=True))

def _chief_users():
    return list(User.objects.filter(role='COMPENSATION_HQ_CHIEF', is_active=True))

def _hq_users():
    return list(User.objects.filter(
        role__in=['COMPENSATION_HQ_CO', 'COMPENSATION_HQ_SO', 'COMPENSATION_HQ_CHIEF'],
        is_active=True,
    ))

def _igp_users():
    return list(User.objects.filter(role__in=['CP_HRM', 'CP_HRM_DELEGATE'], is_active=True))

def _finance_users():
    return list(User.objects.filter(role='FINANCE', is_active=True))


# ── Phase 1: RPC submits case ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsRPC])
def lookup_soldier(request, force_number):
    data = fetch_soldier_from_hr_core(force_number)
    if data:
        return Response(data)
    return Response(
        {'detail': 'Soldier not found in HR Core, or HR Core integration is not configured. '
                   'Please enter soldier details manually.'},
        status=status.HTTP_404_NOT_FOUND,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRPC])
def submit_case(request):
    s = CaseSubmissionSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

    d       = s.validated_data
    ip      = get_client_ip(request)
    case_id = generate_case_id()

    case = CompensationCase.objects.create(
        case_id              = case_id,
        incident_type        = d['incident_type'],
        soldier_force_number = d['soldier_force_number'],
        soldier_full_name    = d['soldier_full_name'],
        soldier_rank         = d['soldier_rank'],
        soldier_district     = d.get('soldier_district', ''),
        incident_date        = d['incident_date'],
        incident_time        = d['incident_time'],
        incident_location    = d['incident_location'],
        nature_of_incident   = d['nature_of_incident'],
        duty_context         = d['duty_context'],
        status               = 'SUBMITTED',
        submitted_by         = request.user,
    )

    AuditLog.objects.create(
        case        = case,
        actor       = request.user,
        action      = ACTION_CASE_SUBMITTED,
        from_status = '',
        to_status   = 'SUBMITTED',
        metadata    = {
            'incident_type': case.incident_type,
            'force_number':  case.soldier_force_number,
        },
        ip_address  = ip,
    )

    send_notification(case, 'CASE_SUBMITTED', _hq_users_only())

    return Response(
        {'case_id': case.case_id, 'status': case.status,
         'message': f'Case {case.case_id} submitted successfully.'},
        status=status.HTTP_201_CREATED,
    )

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRPC])
def upload_document(request, case_id):
    try:
        #  Ensure case exists
        try:
            case = CompensationCase.objects.get(case_id=case_id)
        except CompensationCase.DoesNotExist:
            return Response({'error': 'Case not found.'}, status=status.HTTP_404_NOT_FOUND)

        #  Permission check
        if case.submitted_by != request.user and request.user.role != 'ADMIN':
            return Response(
                {'error': 'You can only upload documents for your own cases.'},
                status=status.HTTP_403_FORBIDDEN
            )

        #  Status check
        if case.status not in ('SUBMITTED', 'RETURNED', 'UNDER_REVIEW'):
            return Response(
                {'error': f'Documents can only be uploaded when SUBMITTED, RETURNED, or UNDER_REVIEW. '
                          f'Current: {case.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        #  Validate payload with serializer
        s = DocumentUploadSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

        doc_type    = s.validated_data['doc_type']
        file_base64 = s.validated_data['file']          # raw base64 payload (already validated)
        filename    = s.validated_data.get('filename') or 'document'
        file_size   = s.validated_data.get('file_size', 0)
        mime_type   = s.validated_data.get('file_content_type', 'application/octet-stream')

        #  Ensure doc_type is required for this case type
        if doc_type not in REQUIRED_DOCS.get(case.incident_type, []):
            return Response(
                {'error': f"'{doc_type}' is not required for {case.incident_type} cases."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        #  Remove any existing document of same type
        CaseDocument.objects.filter(case=case, doc_type=doc_type).delete()

        #  Store base64 string directly in DB
        doc = CaseDocument.objects.create(
            case              = case,
            doc_type          = doc_type,
            file              = file_base64,   
            original_filename = filename,
            file_size         = file_size,
            file_content_type = mime_type,
            uploaded_by       = request.user,
            is_verified       = False,
            verified_by       = None,
            verified_at       = None,
        )

        from .serializers import CaseDocumentSerializer
        return Response(
            CaseDocumentSerializer(doc, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        import traceback
        print("DEBUG UPLOAD ERROR:")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRPC])
def resubmit_case(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response({'error': 'Case not found.'}, status=status.HTTP_404_NOT_FOUND)

    if case.status != 'RETURNED':
        return Response(
            {'error': f'Can only resubmit RETURNED cases. Current: {case.status}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if case.submitted_by != request.user:
        return Response(
            {'error': 'Only the original submitter can resubmit.'},
            status=status.HTTP_403_FORBIDDEN
        )

    ip = get_client_ip(request)

    case.status = 'SUBMITTED'
    case.save(update_fields=['status', 'updated_at'])

    AuditLog.objects.create(
        case=case,
        actor=request.user,
        action=ACTION_CASE_SUBMITTED,
        from_status='RETURNED',
        to_status='SUBMITTED',
        metadata={'resubmitted': True},
        ip_address=ip,
    )

    send_notification(
        case,
        'CASE_RESUBMITTED',
        _hq_users_only()
    )

    return Response({
        'case_id': case.case_id,
        'status': case.status,
        'message': 'Case resubmitted successfully.',
    })


# ── Phase 2: List & detail ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAnyStaff])
def list_cases(request):
    user = request.user
    role = str(user.role or '')
    print(f"User {user.id} with role {role} is listing cases.")
    print(role == 'COMPENSATION_HQ_CO')
    qs = CompensationCase.objects.all()

    if role in ('RPC', 'UNIT_COMMANDER'):
        qs = qs.filter(submitted_by=user)

    elif role == 'COMPENSATION_HQ':
        qs = qs.filter(
            status__in=[
                'SUBMITTED',
                'UNDER_REVIEW',
                
            ]
        )

    elif role == 'COMPENSATION_HQ_CO':
        qs = qs.filter(
            status__in=[
                'HQ_APPROVED',
                'CO_APPROVED',
                'RETURNED',
                'REJECTED',
            ]
        )

    elif role == 'COMPENSATION_HQ_SO':
        qs = qs.filter(
            status__in=[
                'CO_APPROVED',
                'SO_REVIEWED',
                'RETURNED',
                'REJECTED',
            ]
        )

    elif role == 'COMPENSATION_HQ_CHIEF':
        qs = qs.filter(
            status__in=[
                'SO_REVIEWED',
                'PENDING_CP_HRM',
                'RETURNED',
                'REJECTED',
            ]
        )

    elif role == 'COMMITTEE_MEMBER':
        assigned_ids = (
            CommitteeMember.objects
            .filter(user=user)
            .values_list('case_id', flat=True)
        )
        qs = qs.filter(pk__in=assigned_ids)

    if request.query_params.get('case_type'):
        qs = qs.filter(
            incident_type=request.query_params.get('case_type')
        )

    if request.query_params.get('status'):
        qs = qs.filter(
            status=request.query_params.get('status')
        )

    return Response(
        CaseListSerializer(qs, many=True).data
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAnyStaff])
def get_case(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response(
            {'error': 'Case not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    user = request.user
    role = str(user.role or '')

    if role in ('RPC', 'UNIT_COMMANDER'):
        if case.submitted_by != user:
            return Response(
                {'error': 'Access denied.'},
                status=status.HTTP_403_FORBIDDEN
            )

    if role == 'COMMITTEE_MEMBER':
        if not case.committee_members.filter(user=user).exists():
            return Response(
                {'error': 'You are not assigned to this case.'},
                status=status.HTTP_403_FORBIDDEN
            )

    # HQ ndiye wa kwanza kuanza review
    if case.status == 'SUBMITTED' and role == 'COMPENSATION_HQ':
        try:
            transition_status(
                case,
                'UNDER_REVIEW',
                user,
                ip=get_client_ip(request),
                meta={
                    'triggered_by': 'hq_case_opened'
                }
            )

            case.refresh_from_db()

        except ValueError:
            pass
    print(case)
    return Response(
        CaseDetailSerializer(
            case,
            context={'request': request}
        ).data
    )


# ── Phase 2: HQ document verification ────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompensationHQ])
def verify_document(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response({'error': 'Case not found.'}, status=status.HTTP_404_NOT_FOUND)

    if case.status not in ('SUBMITTED', 'UNDER_REVIEW'):
        return Response(
            {'error': f'Documents can only be verified when SUBMITTED or UNDER_REVIEW. '
                      f'Current: {case.status}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    doc_id = request.data.get('document_id')
    is_ver = request.data.get('is_verified', False)

    try:
        doc = CaseDocument.objects.get(id=doc_id, case=case)
    except CaseDocument.DoesNotExist:
        return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

    doc.is_verified = bool(is_ver)
    doc.verified_by = request.user
    doc.verified_at = timezone.now()
    doc.save(update_fields=['is_verified', 'verified_by', 'verified_at'])

    from .serializers import CaseDocumentSerializer
    return Response(CaseDocumentSerializer(doc, context={'request': request}).data)


# ── Phase 2: HQ review chain ──────────────────────────────────────────────────





@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompensationHQ])
def hq_review_case(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response(
            {'error': 'Case not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if case.status not in ('SUBMITTED', 'UNDER_REVIEW'):
        return Response(
            {
                'error': (
                    f'HQ can only review SUBMITTED/UNDER_REVIEW cases. '
                    f'Current: {case.status}.'
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    decision = request.data.get('decision')
    comments = request.data.get('notes', '').strip()

    if not decision or not comments:
        return Response(
            {'error': 'Both decision and notes are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    ip = get_client_ip(request)
    now = timezone.now()

    if decision == 'APPROVED':

        unverified = case.documents.filter(
            is_verified=False
        ).count()

        if unverified > 0:
            return Response(
                {
                    'error': (
                        f'{unverified} document(s) are still unverified. '
                        f'Verify all documents before approving.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        hq_users = _hq_users_only()
        co_users = _co_users()

        if hq_users:
            new_status = 'HQ_APPROVED'
            recipients = hq_users
            message = 'Case approved by HQ and forwarded to HQ staff.'
        elif co_users:
            new_status = 'CO_APPROVED'
            recipients = co_users
            message = 'Case approved by HQ and forwarded to CO.'

    elif decision == 'RETURNED':

        new_status = 'RETURNED'
        recipients = [case.submitted_by]
        message = 'Case returned to RPC by HQ.'

    else:

        new_status = 'REJECTED'
        recipients = [case.submitted_by]
        message = 'Case rejected by HQ.'

    case.hq_reviewed_by = request.user
    case.hq_reviewed_at = now
    case.hq_comments = comments
    case.status = new_status

    case.save(
        update_fields=[
            'status',
            'hq_reviewed_by',
            'hq_reviewed_at',
            'hq_comments',
            'updated_at',
        ]
    )

    AuditLog.objects.create(
        case=case,
        actor=request.user,
        action='HQ_REVIEW',
        from_status='UNDER_REVIEW',
        to_status=new_status,
        metadata={
            'decision': decision,
            'comments': comments,
        },
        ip_address=ip,
    )

    send_notification(
        case,
        f'HQ_{decision}',
        recipients
    )

    return Response({
        'case_id': case.case_id,
        'status': case.status,
        'message': message,
    })



@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompensationCO])
def co_review_case(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response(
            {'error': 'Case not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if case.status != 'HQ_APPROVED':
        return Response(
            {
                'error': (
                    f'CO can only review HQ_APPROVED cases. '
                    f'Current: {case.status}.'
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    decision = request.data.get('decision')
    comments = request.data.get('notes', '').strip()

    if not decision or not comments:
        return Response(
            {'error': 'Both decision and notes are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    ip = get_client_ip(request)
    now = timezone.now()

    if decision == 'APPROVED':
        new_status = 'CO_APPROVED'
        recipients = _so_users()
        message = 'Case approved by CO and forwarded to SO.'

    elif decision == 'RETURNED':
        new_status = 'RETURNED'
        recipients = [case.submitted_by]
        message = 'Case returned to RPC by CO.'

    else:
        new_status = 'REJECTED'
        recipients = [case.submitted_by]
        message = 'Case rejected by CO.'

    case.co_reviewed_by = request.user
    case.co_reviewed_at = now
    case.co_comments = comments
    case.status = new_status

    case.save(
        update_fields=[
            'status',
            'co_reviewed_by',
            'co_reviewed_at',
            'co_comments',
            'updated_at',
        ]
    )

    AuditLog.objects.create(
        case=case,
        actor=request.user,
        action='CO_REVIEW',
        from_status='HQ_APPROVED',
        to_status=new_status,
        metadata={
            'decision': decision,
            'comments': comments,
        },
        ip_address=ip,
    )

    send_notification(
        case,
        f'CO_{decision}',
        recipients
    )

    return Response({
        'case_id': case.case_id,
        'status': case.status,
        'message': message,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompensationSO])
def so_review_case(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response(
            {'error': 'Case not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if case.status != 'CO_APPROVED':
        return Response(
            {
                'error': f'SO can only review CO_APPROVED cases. Current: {case.status}.'
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    decision = request.data.get('decision')
    comments = request.data.get('notes', '').strip()

    if not decision or not comments:
        return Response(
            {'error': 'Both decision and notes are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    ip = get_client_ip(request)
    now = timezone.now()

    if decision == 'APPROVED':
        new_status = 'SO_REVIEWED'
        recipients = _chief_users()
        message = 'Case approved by SO and forwarded to Chief.'

    elif decision == 'RETURNED':
        new_status = 'RETURNED'
        recipients = [case.submitted_by]
        message = 'Case returned to RPC by SO.'

    else:
        new_status = 'REJECTED'
        recipients = [case.submitted_by]
        message = 'Case rejected by SO.'

    case.so_reviewed_by = request.user
    case.so_reviewed_at = now
    case.so_comments = comments
    case.status = new_status

    case.save(update_fields=[
        'status',
        'so_reviewed_by',
        'so_reviewed_at',
        'so_comments',
        'updated_at',
    ])

    AuditLog.objects.create(
        case=case,
        actor=request.user,
        action='SO_REVIEW',
        from_status='CO_APPROVED',
        to_status=new_status,
        metadata={
            'decision': decision,
            'comments': comments,
        },
        ip_address=ip,
    )

    send_notification(case, f'SO_{decision}', recipients)

    return Response({
        'case_id': case.case_id,
        'status': case.status,
        'message': message,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompensationChief])
def chief_review_case(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response(
            {'error': 'Case not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if case.status != 'SO_REVIEWED':
        return Response(
            {
                'error': (
                    f'Chief can only review SO_REVIEWED cases. '
                    f'Current: {case.status}.'
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    decision = request.data.get('decision')
    comments = request.data.get('notes', '').strip()

    if not decision or not comments:
        return Response(
            {'error': 'Both decision and notes are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    ip = get_client_ip(request)
    now = timezone.now()

    if decision == 'APPROVED':
        new_status = 'PENDING_CP_HRM'
        recipients = _igp_users()
        message = 'Case approved by Chief and forwarded to CP_HRM.'

    elif decision == 'RETURNED':
        new_status = 'RETURNED'
        recipients = [case.submitted_by]
        message = 'Case returned to RPC by Chief.'

    else:
        new_status = 'REJECTED'
        recipients = [case.submitted_by]
        message = 'Case rejected by Chief.'

    case.chief_reviewed_by = request.user
    case.chief_reviewed_at = now
    case.chief_comments = comments
    case.status = new_status

    case.save(update_fields=[
        'status',
        'chief_reviewed_by',
        'chief_reviewed_at',
        'chief_comments',
        'updated_at',
    ])

    AuditLog.objects.create(
        case=case,
        actor=request.user,
        action='CHIEF_REVIEW',
        from_status='SO_REVIEWED',
        to_status=new_status,
        metadata={
            'decision': decision,
            'comments': comments,
        },
        ip_address=ip,
    )

    send_notification(
        case,
        f'CHIEF_{decision}',
        recipients
    )

    return Response({
        'case_id': case.case_id,
        'status': case.status,
        'message': message,
    })

# ── Phase 3: CP_HRM forms committee ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCP_HRM])
def suggest_committee(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response({'error': 'Case not found.'}, status=status.HTTP_404_NOT_FOUND)

    rpc_user = case.submitted_by
    hq       = User.objects.filter(role__startswith='COMPENSATION_HQ', is_active=True).first()
    ocd      = User.objects.filter(role__icontains='OCD', is_active=True).first()
    doctor   = User.objects.filter(rank='DR', is_active=True).first()

    def fmt(u):
        return {'user_id': u.id, 'display': f"{u.rank} {u.get_full_name()}"} if u else None

    return Response({'case_id': case_id, 'suggestions': {
        'RPC':               fmt(rpc_user),
        'HQ_REPRESENTATIVE': fmt(hq),
        'OCD':               fmt(ocd),
        'REGISTERED_DOCTOR': fmt(doctor),
    }})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCP_HRM])
def form_committee(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response({'error': 'Case not found.'}, status=status.HTTP_404_NOT_FOUND)

    if case.status != 'PENDING_CP_HRM':
        return Response(
            {'error': f'Committee can only be formed when PENDING_CP_HRM. Current: {case.status}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = CommitteeFormationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data         = serializer.validated_data
    members_data = data['members']
    ip           = get_client_ip(request)
    now          = timezone.now()
    sig          = signature_hash(request.user.id, case.case_id, now)

    users_cache     = {}
    seen            = set()
    created_members = []
    member_users    = []

    try:
        with transaction.atomic():
            case.committee_members.all().delete()

            for m in members_data:
                user_id      = m.get('user_id')
                force_number = m.get('force_number')
                email        = m.get('email')

                if email:
                    email = email.lower().strip()

                identifier = user_id or force_number or email
                if not identifier:
                    continue

                identifier = str(identifier).lower().strip()
                if identifier in seen:
                    continue
                seen.add(identifier)

                user = None
                if user_id:
                    user = users_cache.get(user_id) or User.objects.filter(pk=user_id).first()
                    if not user:
                        continue
                    users_cache[user_id] = user
                elif force_number:
                    user = users_cache.get(force_number) or User.objects.filter(force_number=force_number).first()
                    if not user:
                        continue
                    users_cache[force_number] = user
                elif email:
                    user, _ = User.objects.get_or_create(
                        email=email,
                        defaults={"force_number": force_number}
                    )
                    users_cache[email] = user
                else:
                    continue

                member = CommitteeMember.objects.create(
                    case=case,
                    user=user,
                    role=m.get('role'),
                    assigned_by=request.user,
                )
                created_members.append(member)
                member_users.append(user)

            case.meeting_date       = data['meeting_date']
            case.igp_approved_by    = request.user
            case.igp_approved_at    = now
            case.igp_signature_hash = sig
            case.status             = 'COMMITTEE_ASSIGNED'
            case.save(update_fields=[
                'meeting_date', 'igp_approved_by', 'igp_approved_at',
                'igp_signature_hash', 'status', 'updated_at',
            ])

            AuditLog.objects.create(
                case        = case,
                actor       = request.user,
                action      = ACTION_COMMITTEE_FORMED,
                from_status = 'PENDING_CP_HRM',
                to_status   = 'COMMITTEE_ASSIGNED',
                metadata    = {
                    'approved_by':  request.user.id,
                    'members': [
                        {
                            'identifier': m.get('user_id') or m.get('force_number') or m.get('email'),
                            'role': m.get('role'),
                        }
                        for m in members_data
                    ],
                    'meeting_date':            data['meeting_date'].isoformat(),
                    'digital_signature_hash':  sig,
                },
                ip_address = ip,
            )

    except Exception as e:
        return Response(
            {'error': f'Failed to form committee: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    send_notification(case, 'COMMITTEE_FORMED', list(set(member_users + [case.submitted_by])))

    from .serializers import CommitteeMemberSerializer
    return Response({
        'case_id':      case.case_id,
        'status':       case.status,
        'meeting_date': data['meeting_date'].isoformat(),
        'members':      CommitteeMemberSerializer(created_members, many=True).data,
        'message':      'Committee formed successfully.',
    }, status=status.HTTP_201_CREATED)


# ── Phase 4: Committee assessment ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCommitteeMember])
def submit_input(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response({'error': 'Case not found.'}, status=status.HTTP_404_NOT_FOUND)

    if case.status != 'COMMITTEE_ASSIGNED':
        return Response(
            {'error': f'Inputs only accepted when COMMITTEE_ASSIGNED. Current: {case.status}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        member = CommitteeMember.objects.get(case=case, user=request.user)
    except CommitteeMember.DoesNotExist:
        return Response({'error': 'You are not assigned to this case.'},
                        status=status.HTTP_403_FORBIDDEN)

    if hasattr(member, 'assessment_input'):
        return Response({'error': 'You have already submitted your input.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # ── RPC RULE: lazima awe wa mwisho kuwasilisha ──────────────────────────
    agreed_amount = None
    if member.role == 'RPC':
        other_members = case.committee_members.exclude(user=request.user)
        pending = other_members.filter(assessment_input__isnull=True)
        if pending.exists():
            pending_names = list(pending.values_list('user__first_name', flat=True))
            return Response(
                {
                    'error':           'RPC_BLOCKED',
                    'detail':          (
                        f'Kama RPC, lazima uwasilishe mwisho. '
                        f'Wanachama {pending.count()} bado hawajawasilisha.'
                    ),
                    'pending_count':   pending.count(),
                    'pending_members': pending_names,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── RPC lazima atoe agreed_amount ───────────────────────────────────
        raw_amount = request.data.get('agreed_amount')
        if raw_amount is None or raw_amount == '':
            return Response(
                {'error': 'RPC lazima atoe agreed_amount (kiasi kilichokubalika).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            agreed_amount = float(raw_amount)
            if agreed_amount < 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {'error': 'agreed_amount lazima iwe nambari sahihi (e.g. 650000).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
    # ───────────────────────────────────────────────────────────────────────

    s = MemberInputSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

    d  = s.validated_data
    ip = get_client_ip(request)

    MemberAssessmentInput.objects.create(
        case              = case,
        committee_member  = member,
        injury_percentage = d['injury_percentage'],
        severity_class    = d['severity_class'],
        assessment_notes  = d['assessment_notes'],
        agreed_amount     = agreed_amount,
    )

    AuditLog.objects.create(
        case        = case,
        actor       = request.user,
        action      = ACTION_MEMBER_INPUT,
        from_status = 'COMMITTEE_ASSIGNED',
        to_status   = 'COMMITTEE_ASSIGNED',
        metadata    = {
            'role':          member.role,
            'severity':      d['severity_class'],
            'pct':           str(d['injury_percentage']),
            'is_rpc':        member.role == 'RPC',
            'agreed_amount': str(agreed_amount) if agreed_amount is not None else None,
        },
        ip_address  = ip,
    )

    total = case.committee_members.count()
    done  = case.member_inputs.count()

    if done >= total:
        return _finalize(case, request.user, ip)

    return Response(
        {'message':   f'Input saved. {total - done} member(s) still pending.',
         'submitted': done,
         'total':     total},
        status=status.HTTP_201_CREATED,
    )


def _finalize(case, actor, ip):
    try:
        r = compute_final_assessment(case)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    a = Assessment.objects.create(
        case                    = case,
        formula                 = r['formula'],
        final_injury_percentage = r['final_injury_percentage'],
        final_severity_class    = r['final_severity_class'],
        suggested_amount        = r['suggested_amount'],
        currency                = r['currency'],
        requires_manual_review  = r['requires_manual_review'],
    )

    AuditLog.objects.create(
        case        = case,
        actor       = actor,
        action      = ACTION_ASSESSMENT_COMPLETE,
        from_status = 'COMMITTEE_ASSIGNED',
        to_status   = 'ASSESSED',
        metadata    = {
            'formula_id':             a.formula.id if a.formula else None,
            'pct':                    str(a.final_injury_percentage),
            'severity':               a.final_severity_class,
            'amount':                 str(a.suggested_amount),
            'requires_manual_review': a.requires_manual_review,
        },
        ip_address  = ip,
    )

    case.status = 'ASSESSED'
    case.save(update_fields=['status', 'updated_at'])

    recipients = list(set(_hq_users() + _igp_users() + _finance_users()))
    send_notification(case, 'ASSESSMENT_COMPLETE', recipients)

    return Response({
        'case_id':    case.case_id,
        'status':     case.status,
        'assessment': AssessmentSerializer(a).data,
        'message': (
            'Assessment complete.'
            if not a.requires_manual_review
            else 'Assessment complete — requires manual review (no formula matched).'
        ),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_assessment(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
        return Response(AssessmentSerializer(case.assessment).data)
    except (CompensationCase.DoesNotExist, Assessment.DoesNotExist):
        return Response({'error': 'Assessment not found.'}, status=status.HTTP_404_NOT_FOUND)


# ── Reminders ─────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompensationHQ])
def send_reminders(request):
    cutoff = date.today() - timedelta(days=3)
    cases  = CompensationCase.objects.filter(
        status='COMMITTEE_ASSIGNED', meeting_date__lte=cutoff,
    )
    count = 0
    for case in cases:
        submitted     = set(case.member_inputs.values_list('committee_member__user_id', flat=True))
        pending       = list(case.committee_members.exclude(user_id__in=submitted)
                             .values_list('user', flat=True))
        pending_users = list(User.objects.filter(pk__in=pending))
        if pending_users:
            send_notification(case, 'ASSESSMENT_REMINDER', pending_users)
            count += len(pending_users)
    return Response({'reminders_sent': count})


# ── Formulas ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsCompensationHQ])
def formula_list_create(request):
    if request.method == 'GET':
        return Response(FormulaSerializer(CompensationFormula.objects.all(), many=True).data)
    s = FormulaSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    formula = s.save(created_by=request.user)
    return Response(FormulaSerializer(formula).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, IsCompensationHQ])
def formula_detail(request, pk):
    try:
        formula = CompensationFormula.objects.get(pk=pk)
    except CompensationFormula.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(FormulaSerializer(formula).data)
    if request.method == 'PATCH':
        s = FormulaSerializer(formula, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    formula.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Notifications ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    notifs = Notification.objects.filter(recipient=request.user)
    return Response(NotificationSerializer(notifs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_read(request, pk):
    try:
        n = Notification.objects.get(pk=pk, recipient=request.user)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return Response({'id': n.id, 'is_read': True})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'detail': 'All notifications marked as read.'})


# ── Audit log ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAnyStaff])
def case_audit(request, case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
    except CompensationCase.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(AuditLogSerializer(case.audit_logs.all(), many=True).data)