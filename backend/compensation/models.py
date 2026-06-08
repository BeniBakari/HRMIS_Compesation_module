from django.db import models
from django.utils import timezone

# ── Choices ──────────────────────────────────────────────────────────────────

INCIDENT_TYPE_CHOICES = [('INJURY', 'Injury'), ('DEATH', 'Death')]

STATUS_CHOICES = [
    ('SUBMITTED',          'Submitted'),
    ('UNDER_REVIEW',       'Under Review'),
    ('HQ_APPROVED',         'HQ Approved' ),
    ('CO_APPROVED',        'CO Approved'),
    ('SO_REVIEWED',        'SO Reviewed'),
    ('PENDING_CP_HRM',        'Pending CP_HRM'),
    ('INCOMPLETE',         'Incomplete'),
    ('RETURNED',           'Returned to RPC'),
    ('REJECTED',           'Rejected'),
    ('COMMITTEE_ASSIGNED', 'Committee Assigned'),
    ('ASSESSED',           'Assessed'),
    ('PAID',               'Paid'),
]

SEVERITY_CHOICES = [
    ('MINOR', 'Minor'),
    ('MODERATE', 'Moderate'),
    ('SEVERE', 'Severe'),
    ('CRITICAL', 'Critical'),
    ('PERMANENT', 'Permanent'),
    ('FATAL', 'Fatal'),
]

DOC_TYPE_CHOICES = [
    ('OB_EXTRACT', 'OB Extract'),
    ('PF3', 'PF3'),
    ('PF90', 'PF90'),
    ('PF115', 'PF115'),
    ('MEDICAL_REPORT', 'Medical Report'),
    ('POSTMORTEM_REPORT', 'Postmortem Report'),
    ('DEATH_CERTIFICATE', 'Death Certificate'),
    ('NATIONAL_ID', 'National ID / Force ID'),
]

COMMITTEE_ROLE_CHOICES = [
    ('RPC', 'RPCROLE'),
    ('HQ_REPRESENTATIVE', 'HQ Representative'),
    ('OCD', 'OCD'),
    ('REGISTERED_DOCTOR', 'Registered Doctor'),
]

REQUIRED_DOCS = {
    'INJURY': ['OB_EXTRACT', 'PF3', 'MEDICAL_REPORT', 'NATIONAL_ID'],
    'DEATH':  ['OB_EXTRACT', 'PF90', 'PF115', 'MEDICAL_REPORT', 'POSTMORTEM_REPORT', 'DEATH_CERTIFICATE'],
}

# VALID_TRANSITIONS = {
#     'SUBMITTED':          ['UNDER_REVIEW'],
#     'UNDER_REVIEW':       ['VERIFIED'],
#     'CO_APPROVED':        ['CO_APPROVED', 'INCOMPLETE', 'REJECTED'],
#     'SO_REVIEWED':        ['SO_REVIEWED'],
#     'PENDING_CP_HRM':        ['PENDING_CP_HRM'],
#     'INCOMPLETE':         ['SUBMITTED'],
#     'VERIFIED':           ['COMMITTEE_ASSIGNED'],
#     'COMMITTEE_ASSIGNED': ['ASSESSED'],
#     'ASSESSED':           ['PAID'],
#     'REJECTED':           [],
#     'PAID':               [],
# }
VALID_TRANSITIONS = {
    'SUBMITTED': ['UNDER_REVIEW'],
    'UNDER_REVIEW': ['HQ_APPROVED', 'RETURNED', 'REJECTED'],
    'HQ_APPROVED': ['CO_APPROVED', 'RETURNED', 'REJECTED'],
    'CO_APPROVED': ['SO_REVIEWED', 'RETURNED', 'REJECTED'],
    'SO_REVIEWED': ['PENDING_CP_HRM', 'RETURNED', 'REJECTED'],
    'PENDING_CP_HRM': ['COMMITTEE_ASSIGNED'],
    'INCOMPLETE': ['SUBMITTED'],
    'COMMITTEE_ASSIGNED': ['ASSESSED'],
    'ASSESSED': ['PAID'],
    'RETURNED': ['SUBMITTED'],
    'REJECTED': [],
    'PAID': [],
}



# ── Audit action codes ──────────────────────────────────────────────────────

ACTION_CASE_SUBMITTED       = 'CASE_SUBMITTED'
ACTION_VALIDATION_DECISION  = 'VALIDATION_DECISION'
ACTION_COMMITTEE_FORMED     = 'COMMITTEE_FORMED'
ACTION_MEMBER_INPUT         = 'MEMBER_INPUT_SUBMITTED'
ACTION_ASSESSMENT_COMPLETE  = 'ASSESSMENT_COMPLETE'


# ── 1. CompensationCase ──────────────────────────────────────────────────────

class CompensationCase(models.Model):
    case_id         = models.CharField(max_length=20, unique=True, db_index=True)
    incident_type   = models.CharField(max_length=6, choices=INCIDENT_TYPE_CHOICES)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUBMITTED')

    soldier_id           = models.BigIntegerField(null=True, blank=True)
    soldier_force_number = models.CharField(max_length=50)
    soldier_full_name    = models.CharField(max_length=300)
    soldier_rank         = models.CharField(max_length=50)
    soldier_district     = models.CharField(max_length=255, blank=True, default='')

    incident_date       = models.DateField()
    incident_time       = models.TimeField(null=True, blank=True)
    incident_location   = models.CharField(max_length=500)
    nature_of_incident  = models.TextField()
    duty_context        = models.TextField()

    submitted_by  = models.ForeignKey('accounts.User', on_delete=models.PROTECT,
                                      related_name='submitted_cases')
    submitted_at  = models.DateTimeField(auto_now_add=True)

    reviewed_by      = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name='reviewed_cases')
    reviewed_at      = models.DateTimeField(null=True, blank=True)
    review_comments  = models.TextField(blank=True, default='')
    # HQ Review
    hq_reviewed_by = models.ForeignKey(
    'accounts.User',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='hq_reviewed_cases'
)

    hq_reviewed_at = models.DateTimeField(
    null=True,
    blank=True
)

    hq_comments = models.TextField(
        blank=True,
        default=''
    )    
    meeting_date         = models.DateField(null=True, blank=True)

    igp_approved_by     = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                                null=True, blank=True, related_name='igp_approved_cases')
    igp_approved_at     = models.DateTimeField(null=True, blank=True)
    igp_signature_hash   = models.CharField(max_length=255, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    co_reviewed_by     = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                           null=True, blank=True, related_name='co_reviewed_cases')
    co_reviewed_at     = models.DateTimeField(null=True, blank=True)
    co_comments        = models.TextField(blank=True, default='')

    so_reviewed_by     = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                           null=True, blank=True, related_name='so_reviewed_cases')
    so_reviewed_at     = models.DateTimeField(null=True, blank=True)
    so_comments        = models.TextField(blank=True, default='')

    chief_reviewed_by  = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                           null=True, blank=True, related_name='chief_reviewed_cases')
    chief_reviewed_at  = models.DateTimeField(null=True, blank=True)
    chief_comments     = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'comp_cases'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.pk} - {self.case_id} — {self.soldier_full_name} ({self.incident_type})"

    def can_transition_to(self, new_status):
        return new_status in VALID_TRANSITIONS.get(self.status, [])

    # ── 🔥 NEW RPC RULE ADDED HERE ──

    def assessment_ready(self):
        """
        True only when ALL committee members have submitted inputs.
        """
        total = self.committee_members.count()
        submitted = self.member_inputs.count()
        return total > 0 and total == submitted

    def rpc_can_submit_assessment(self, user):
        """
        RPC can ONLY submit final assessment when ALL committee members are done.
        """
        if not user or getattr(user, 'role', None) != 'RPC':
            return False

        return self.assessment_ready()


# ── 2. CaseDocument ──────────────────────────────────────────────────────────
# (unchanged)


class CaseDocument(models.Model):
    case = models.ForeignKey(CompensationCase, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)

    file = models.TextField()
    file_content_type = models.CharField(max_length=100, default='application/pdf')
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='uploaded_docs')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_docs')
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'comp_documents'
        unique_together = ['case', 'doc_type']


# ── 3. CommitteeMember ───────────────────────────────────────────────
# (unchanged)

class CommitteeMember(models.Model):
    case = models.ForeignKey(CompensationCase, on_delete=models.CASCADE, related_name='committee_members')
    user = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='committee_assignments')
    role = models.CharField(max_length=30, choices=COMMITTEE_ROLE_CHOICES)
    assigned_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='committees_formed')
    assigned_at = models.DateTimeField(auto_now_add=True)
    appointment_letter_path = models.CharField(max_length=500, blank=True, default='')

    class Meta:
        db_table = 'comp_committee_members'
        unique_together = ['case', 'role']


# ── 4. MemberAssessmentInput ───────────────────────────────────────────
# (unchanged)

class MemberAssessmentInput(models.Model):
    case = models.ForeignKey(CompensationCase, on_delete=models.CASCADE, related_name='member_inputs')
    committee_member = models.OneToOneField(CommitteeMember, on_delete=models.CASCADE, related_name='assessment_input')

    injury_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    severity_class = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    agreed_amount     = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)  # ← RPC peke yake
    assessment_notes = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

# ── 5. CompensationFormula ────────────────────────────────────────────────────

class CompensationFormula(models.Model):
    incident_type  = models.CharField(max_length=6,  choices=INCIDENT_TYPE_CHOICES)
    severity_class = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    base_amount    = models.DecimalField(max_digits=15, decimal_places=2)
    multiplier     = models.DecimalField(max_digits=6,  decimal_places=3)
    currency       = models.CharField(max_length=3, default='TZS')
    effective_from = models.DateField()
    effective_to   = models.DateField(null=True, blank=True)
    description    = models.CharField(max_length=500, blank=True, default='')
    created_by     = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                        null=True, related_name='formulas_created')
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comp_formulas'
        ordering = ['-effective_from']

    def __str__(self):
        return f"{self.incident_type}/{self.severity_class} × {self.multiplier} (from {self.effective_from})"


# ── 6. Assessment ─────────────────────────────────────────────────────────────

class Assessment(models.Model):
    case                    = models.OneToOneField(CompensationCase, on_delete=models.CASCADE,
                                                   related_name='assessment')
    formula                 = models.ForeignKey(CompensationFormula, on_delete=models.PROTECT,
                                                null=True, blank=True)
    final_injury_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    final_severity_class    = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    suggested_amount        = models.DecimalField(max_digits=15, decimal_places=2)
    currency                = models.CharField(max_length=3, default='TZS')
    requires_manual_review  = models.BooleanField(default=False)
    report_path             = models.CharField(max_length=500, blank=True, default='')
    computed_at             = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comp_assessments'

    def __str__(self):
        return f"{self.case.case_id} — TZS {self.suggested_amount}"


# ── 7. AuditLog (append-only) ─────────────────────────────────────────────────

class AuditLog(models.Model):
    case        = models.ForeignKey(CompensationCase, on_delete=models.CASCADE,
                                    related_name='audit_logs')
    actor       = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                    null=True, related_name='audit_actions')
    action      = models.CharField(max_length=50)
    from_status = models.CharField(max_length=20, blank=True, default='')
    to_status   = models.CharField(max_length=20)
    metadata    = models.JSONField(default=dict)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comp_audit_logs'
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError('AuditLog records are immutable.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError('AuditLog records cannot be deleted.')


# ── 8. Notification ───────────────────────────────────────────────────────────

class Notification(models.Model):
    case         = models.ForeignKey(CompensationCase, on_delete=models.CASCADE,
                                     related_name='notifications')
    recipient    = models.ForeignKey('accounts.User', on_delete=models.CASCADE,
                                     related_name='comp_notifications')
    event        = models.CharField(max_length=60)
    message      = models.TextField()
    is_read      = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comp_notifications'
        ordering = ['-created_at']



