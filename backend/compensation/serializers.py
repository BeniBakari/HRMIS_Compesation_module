from rest_framework import serializers
from datetime import date
import base64

from .models import (
    CompensationCase, CaseDocument, CommitteeMember, MemberAssessmentInput,
    CompensationFormula, Assessment, AuditLog, Notification, REQUIRED_DOCS,
)
from accounts.serializers import UserSerializer


# ── Document ──────────────────────────────────────────────────────────────────

class CaseDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_display = serializers.SerializerMethodField()

    class Meta:
        model  = CaseDocument
        fields = [
            'id', 'doc_type', 'file', 'file_content_type',
            'original_filename', 'file_size',
            'uploaded_by_display', 'uploaded_at',
            'is_verified', 'verified_at',
            'is_rejected',        # ← MPYA: kuonyesha kama document imekataliwa
            'rejection_reason',   # ← MPYA: sababu ya kukataliwa
        ]
        read_only_fields = ['id', 'uploaded_at', 'verified_at']

    def get_uploaded_by_display(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else None


class DocumentUploadSerializer(serializers.Serializer):
    doc_type = serializers.ChoiceField(choices=[
        'OB_EXTRACT', 'PF3', 'PF90', 'PF115',
        'MEDICAL_REPORT', 'POSTMORTEM_REPORT', 'DEATH_CERTIFICATE', 'NATIONAL_ID',
    ])
    file     = serializers.CharField()  # base64 string
    filename = serializers.CharField(max_length=255, required=False, default='document')

    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
    }
    MAX_SIZE_BYTES = 10 * 1024 * 1024

    def validate_file(self, value):
        if not isinstance(value, str) or not value.startswith("data:"):
            raise serializers.ValidationError(
                'Expected base64 string starting with "data:<mime>;base64,"'
            )

        try:
            header, encoded = value.split(",", 1)
            mime_type = header.split(";")[0].replace("data:", "").strip()
        except ValueError:
            raise serializers.ValidationError(
                'Invalid base64 format. Expected: data:<mime>;base64,<data>'
            )

        if mime_type not in self.ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                f'Unsupported file type "{mime_type}". Allowed: {", ".join(self.ALLOWED_MIME_TYPES)}'
            )

        try:
            decoded = base64.b64decode(encoded)
        except Exception:
            raise serializers.ValidationError("Invalid base64 encoding.")

        file_size = len(decoded)
        if file_size > self.MAX_SIZE_BYTES:
            raise serializers.ValidationError(
                f"File too large. Maximum allowed: {self.MAX_SIZE_BYTES // (1024 * 1024)} MB."
            )

        self._validated_mime_type = mime_type
        self._validated_size      = file_size

        return encoded

    def validate(self, data):
        try:
            decoded = base64.b64decode(data['file'])
            data['file_content_type'] = getattr(self, '_validated_mime_type', 'application/octet-stream')
            data['file_size']         = getattr(self, '_validated_size', len(decoded))
        except Exception:
            data['file_content_type'] = 'application/octet-stream'
            data['file_size']         = 0
        return data


# ── Committee ─────────────────────────────────────────────────────────────────

class CommitteeMemberSerializer(serializers.ModelSerializer):
    user_display        = serializers.SerializerMethodField()
    has_submitted_input = serializers.SerializerMethodField()
    force_number        = serializers.SerializerMethodField()
    rank                = serializers.SerializerMethodField()
    region              = serializers.SerializerMethodField()
    signature           = serializers.SerializerMethodField()

    class Meta:
        model  = CommitteeMember
        fields = [
            'id', 'user_id', 'user_display', 'role', 'assigned_at',
            'appointment_letter_path', 'has_submitted_input',
            'force_number', 'rank', 'region', 'signature',
        ]
        read_only_fields = ['id', 'assigned_at']

    def get_user_display(self, obj):
        return f"{obj.user.rank} {obj.user.get_full_name()}" if obj.user else None

    def get_has_submitted_input(self, obj):
        return hasattr(obj, 'assessment_input')

    def get_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_force_number(self, obj):
        return obj.user.force_number if obj.user else None

    def get_rank(self, obj):
        return obj.user.rank if obj.user else None

    def get_signature(self, obj):
        if not obj.user:
            return None
        return obj.user.signature

    def get_region(self, obj):
        if not obj.user:
            return None
        return (
            getattr(obj.user, 'region', None)
            or getattr(obj.user, 'commands', None)
            or getattr(obj.user, 'stations', None)
            or None
        )


class CommitteeMemberInputSerializer(serializers.Serializer):
    user_id      = serializers.IntegerField(required=True)
    role         = serializers.CharField(max_length=100, required=True)
    force_number = serializers.CharField(max_length=50, required=False, allow_blank=True)


class CommitteeFormationSerializer(serializers.Serializer):
    meeting_date      = serializers.DateField()
    digital_signature = serializers.CharField(
        required=False, allow_blank=True, default=''
    )
    members = CommitteeMemberInputSerializer(many=True, min_length=4, max_length=4)

    def validate_meeting_date(self, v):
        if v < date.today():
            raise serializers.ValidationError('Meeting date cannot be in the past.')
        return v

    def validate_members(self, members):
        from accounts.models import User
        required = {'RPC', 'HQ_REPRESENTATIVE', 'OCD', 'REGISTERED_DOCTOR'}
        seen     = set()

        for m in members:
            if 'role' not in m:
                raise serializers.ValidationError("Each member needs 'role'.")

            role = m['role']

            if role not in required:
                raise serializers.ValidationError(f"Invalid role '{role}'.")

            if role in seen:
                raise serializers.ValidationError(f"Role '{role}' appears more than once.")

            seen.add(role)

            if m.get('user_id'):
                if not User.objects.filter(pk=m['user_id']).exists():
                    raise serializers.ValidationError(f"User {m['user_id']} not found.")
            elif m.get('force_number'):
                user = User.objects.filter(force_number=m['force_number']).first()
                if not user:
                    raise serializers.ValidationError(
                        f"User with force number {m['force_number']} not found in system. "
                        f"Please register them first."
                    )
            else:
                raise serializers.ValidationError("Each member needs 'user_id' or 'force_number'.")

        if seen != required:
            missing = required - seen
            raise serializers.ValidationError(f"Missing roles: {', '.join(missing)}")

        return members


# ── Assessment ────────────────────────────────────────────────────────────────

class MemberInputSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MemberAssessmentInput
        fields = ['id', 'injury_percentage', 'severity_class', 'assessment_notes', 'submitted_at']
        read_only_fields = ['id', 'submitted_at']

    def validate_injury_percentage(self, v):
        if not (0 <= v <= 100):
            raise serializers.ValidationError('Must be between 0 and 100.')
        return v

    def validate_assessment_notes(self, v):
        if len(v.strip()) > 50:
            raise serializers.ValidationError('Maximum 50 characters allowed.')
        return v


class AssessmentSerializer(serializers.ModelSerializer):
    formula_detail = serializers.SerializerMethodField()

    class Meta:
        model  = Assessment
        fields = [
            'id', 'final_injury_percentage', 'final_severity_class',
            'suggested_amount', 'currency', 'requires_manual_review',
            'report_path', 'computed_at', 'formula_detail',
        ]

    def get_formula_detail(self, obj):
        if not obj.formula:
            return None
        f = obj.formula
        return {
            'id':             f.id,
            'base_amount':    str(f.base_amount),
            'multiplier':     str(f.multiplier),
            'currency':       f.currency,
            'effective_from': f.effective_from.isoformat(),
        }


# ── Formula ───────────────────────────────────────────────────────────────────

class FormulaSerializer(serializers.ModelSerializer):
    created_by_display = serializers.SerializerMethodField()

    class Meta:
        model  = CompensationFormula
        fields = [
            'id', 'incident_type', 'severity_class', 'base_amount',
            'multiplier', 'currency', 'effective_from', 'effective_to',
            'description', 'created_by_display', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_created_by_display(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def validate(self, data):
        ef = data.get('effective_from')
        et = data.get('effective_to')
        if ef and et and et < ef:
            raise serializers.ValidationError('effective_to cannot be before effective_from.')
        return data


# ── Audit & Notification ──────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    actor_display = serializers.SerializerMethodField()

    class Meta:
        model  = AuditLog
        fields = [
            'id', 'actor_display', 'action', 'from_status', 'to_status',
            'metadata', 'ip_address', 'created_at',
        ]

    def get_actor_display(self, obj):
        return obj.actor.get_full_name() if obj.actor else 'System'


class CaseDetailSerializer(serializers.ModelSerializer):
    documents            = CaseDocumentSerializer(many=True, read_only=True)
    committee_members    = CommitteeMemberSerializer(many=True, read_only=True)
    assessment           = AssessmentSerializer(read_only=True)
    audit_logs           = AuditLogSerializer(many=True, read_only=True)
    submitted_by_display = serializers.SerializerMethodField()
    status_label         = serializers.SerializerMethodField()
    incident_type_label  = serializers.SerializerMethodField()
    required_documents   = serializers.SerializerMethodField()
    submitted_members    = serializers.SerializerMethodField()
    progress             = serializers.SerializerMethodField()

    class Meta:
        model  = CompensationCase
        fields = [
            'case_id', 'incident_type', 'incident_type_label', 'status', 'status_label',
            'soldier_id', 'soldier_force_number', 'soldier_full_name',
            'soldier_rank', 'soldier_district',
            'incident_date','region',  'incident_time', 'incident_location',
            'nature_of_incident', 'duty_context',
            'submitted_by_display', 'submitted_at',
            'review_comments', 'reviewed_at',
            'hq_comments', 'hq_reviewed_at',
            'co_comments', 'co_reviewed_at',
            'so_comments', 'so_reviewed_at',
            'chief_comments', 'chief_reviewed_at',
            'meeting_date', 'igp_approved_at',
            'created_at', 'updated_at',
            'required_documents',
            'documents', 'committee_members', 'assessment', 'audit_logs',
            'submitted_members', 'progress',
        ]

    def get_submitted_by_display(self, obj):
        return f"{obj.submitted_by.rank} {obj.submitted_by.get_full_name()}"

    def get_status_label(self, obj):
        return obj.get_status_display()

    def get_incident_type_label(self, obj):
        return obj.get_incident_type_display()

    def get_required_documents(self, obj):
        return REQUIRED_DOCS.get(obj.incident_type, [])

    def get_submitted_members(self, obj):
        submitted = obj.committee_members.filter(assessment_input__isnull=False)
        return [
            {
                "id":                m.id,
                "user_id":           m.user_id,
                "role":              m.role,
                "full_name":         m.user.get_full_name() if m.user else None,
                "force_number":      m.user.force_number if m.user else None,
                "signature":         m.user.signature if m.user else None,
                "submitted_at":      m.assessment_input.submitted_at if m.assessment_input else None,
                "notes":             m.assessment_input.assessment_notes if m.assessment_input else None,
                "severity":          m.assessment_input.severity_class if m.assessment_input else None,
                "injury_percentage": m.assessment_input.injury_percentage if m.assessment_input else None,
                "agreed_amount":     str(m.assessment_input.agreed_amount)
                                     if m.assessment_input and m.assessment_input.agreed_amount is not None
                                     else None,
            }
            for m in submitted
        ]

    def get_progress(self, obj):
        total     = obj.committee_members.count()
        submitted = obj.committee_members.filter(assessment_input__isnull=False).count()
        return {
            "submitted":  submitted,
            "total":      total,
            "percentage": (submitted / total * 100) if total else 0,
        }


# ── Case ──────────────────────────────────────────────────────────────────────

class CaseListSerializer(serializers.ModelSerializer):
    submitted_by_display = serializers.SerializerMethodField()
    pending_docs_count   = serializers.SerializerMethodField()
    status_label         = serializers.SerializerMethodField()

    class Meta:
        model = CompensationCase
        fields = [
            'id', 'case_id', 'incident_type', 'status', 'status_label',
            'soldier_force_number', 'soldier_full_name', 'soldier_rank',
            'incident_date', 'submitted_by_display', 'submitted_at', 'pending_docs_count',
        ]

    def get_submitted_by_display(self, obj):
        return f"{obj.submitted_by.rank} {obj.submitted_by.get_full_name()}"

    def get_pending_docs_count(self, obj):
        req      = REQUIRED_DOCS.get(obj.incident_type, [])
        verified = set(obj.documents.filter(is_verified=True).values_list('doc_type', flat=True))
        return len([d for d in req if d not in verified])

    def get_status_label(self, obj):
        return obj.get_status_display()


class NotificationSerializer(serializers.ModelSerializer):
    corresponding_case = CaseDetailSerializer(read_only=True, source='case')

    class Meta:
        model  = Notification
        fields = ['id', 'case_id', 'event', 'message', 'is_read', 'created_at', 'corresponding_case']
        read_only_fields = ['id', 'case_id', 'event', 'message', 'created_at']


# ── Submission & Review ───────────────────────────────────────────────────────

class CaseSubmissionSerializer(serializers.Serializer):
    incident_type        = serializers.ChoiceField(choices=['INJURY', 'DEATH'])
    soldier_force_number = serializers.CharField(max_length=50)
    soldier_full_name    = serializers.CharField(max_length=300)
    soldier_rank         = serializers.CharField(max_length=50)
    soldier_district     = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    incident_date        = serializers.DateField()
    incident_time        = serializers.TimeField(
        format='%H:%M', required=False, allow_null=True, default=None
    )
    incident_location    = serializers.CharField(max_length=500)
    nature_of_incident   = serializers.CharField()
    duty_context         = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_incident_date(self, v):
        if v > date.today():
            raise serializers.ValidationError('Incident date cannot be in the future.')
        return v


class HQReviewSerializer(serializers.Serializer):
    DECISIONS = [('APPROVED', 'Approved'), ('RETURNED', 'Returned'), ('REJECTED', 'Rejected')]

    decision           = serializers.ChoiceField(choices=DECISIONS)
    comments           = serializers.CharField(required=False, allow_blank=True, default='')
    justification      = serializers.CharField(required=False, allow_blank=True, default='')

    # ── MPYA: IDs za documents zilizokataliwa ─────────────────────────────────
    rejected_documents = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text="Orodha ya IDs za documents zilizo na makosa"
    )

    def validate(self, data):
        d = data['decision']

        # RETURNED: lazima aandike comment NA achague documents
        if d == 'RETURNED':
            if not data.get('comments', '').strip():
                raise serializers.ValidationError(
                    {'comments': 'Return comments are required.'}
                )
            if not data.get('rejected_documents'):
                raise serializers.ValidationError(
                    {'rejected_documents': 'Tafadhali chagua documents zilizo na makosa.'}
                )

        # REJECTED: lazima aandike justification
        if d == 'REJECTED' and not data.get('comments', '').strip():
            raise serializers.ValidationError(
                {'justification': 'Rejection comments are required.'}
            )

        return data