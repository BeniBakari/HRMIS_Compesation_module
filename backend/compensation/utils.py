import hashlib
import os
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import (
    CompensationCase, CompensationFormula, AuditLog, Notification,
    REQUIRED_DOCS, VALID_TRANSITIONS,
)


# ── Case ID ──────────────────────────────────────────────────────────────────

def generate_case_id():
    year = date.today().year
    prefix = f"TPF-{year}-"
    last = (
        CompensationCase.objects
        .filter(case_id__startswith=prefix)
        .order_by('-case_id')
        .values_list('case_id', flat=True)
        .first()
    )
    seq = (int(last.split('-')[-1]) + 1) if last else 1
    return f"{prefix}{seq:05d}"


# ── Document validation ───────────────────────────────────────────────────────

def validate_documents(case):
    print(f"Validating documents for case {case.case_id}...")  # Debug log
    required = REQUIRED_DOCS.get(case.incident_type, [])
    uploaded = {d.doc_type: d for d in case.documents.all()}
    missing    = [dt for dt in required if dt not in uploaded]
    unverified = [dt for dt in required if dt in uploaded and not uploaded[dt].is_verified]
    return {'valid': not missing and not unverified, 'missing': missing, 'unverified': unverified}


# ── Status transition ─────────────────────────────────────────────────────────

def transition_status(case, new_status, actor, ip=None, meta=None):
    if not case.can_transition_to(new_status):
        valid = VALID_TRANSITIONS.get(case.status, [])
        raise ValueError(
            f"Cannot move '{case.case_id}' from '{case.status}' to '{new_status}'. "
            f"Valid: {valid or ['none — terminal status']}."
        )
    old = case.status
    case.status = new_status
    case.save(update_fields=['status', 'updated_at'])
    AuditLog.objects.create(
        case=case, actor=actor, action='STATUS_CHANGED',
        from_status=old, to_status=new_status,
        metadata=meta or {}, ip_address=ip,
    )


# ── Formula lookup ────────────────────────────────────────────────────────────

def lookup_formula(incident_type, severity_class, on_date=None):
    on_date = on_date or date.today()
    return (
        CompensationFormula.objects
        .filter(
            incident_type=incident_type,
            severity_class=severity_class,
            effective_from__lte=on_date,
        )
        .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=on_date))
        .order_by('-effective_from')
        .first()
    )


# ── Assessment computation ───────────────────────────────────────────────────

SEVERITY_ORDER = ['MINOR', 'MODERATE', 'SEVERE','CRITICAL', 'PERMANENT', 'FATAL']


def compute_final_assessment(case):
    inputs = list(case.member_inputs.all())
    if not inputs:
        raise ValueError('No member inputs found.')

    avg_pct = (
        sum(Decimal(str(i.injury_percentage)) for i in inputs) / len(inputs)
    ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    final_pct = Decimal('100.00') if case.incident_type == 'DEATH' else avg_pct

    counts = {}
    for i in inputs:
        counts[i.severity_class] = counts.get(i.severity_class, 0) + 1
    max_c = max(counts.values())
    candidates = [s for s, c in counts.items() if c == max_c]
    final_severity = max(candidates, key=lambda s: SEVERITY_ORDER.index(s))

    formula = lookup_formula(case.incident_type, final_severity)
    if formula:
        amount = (
            Decimal(str(formula.base_amount))
            * Decimal(str(formula.multiplier))
            * (final_pct / Decimal('100'))
        ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        currency = formula.currency
    else:
        amount = Decimal('0.00')
        currency = 'TZS'

    return {
        'formula': formula,
        'final_injury_percentage': final_pct,
        'final_severity_class': final_severity,
        'suggested_amount': amount,
        'currency': currency,
        'requires_manual_review': formula is None,
    }


# ── Notifications ─────────────────────────────────────────────────────────────

MESSAGES = {
    'CASE_SUBMITTED':      'A new case has been submitted and is awaiting HQ validation.',
    'CASE_RETURNED':       'Your case has been returned. Review the comments and re-submit.',
    'CASE_REJECTED':       'Your compensation case has been rejected.',
    'CASE_VERIFIED':       'Case verified. Awaiting committee formation by the CP_ADMINISTRATION Office.',
    'COMMITTEE_FORMED':    'You have been appointed to the compensation assessment committee.',
    'ASSESSMENT_REMINDER': 'Reminder: your assessment input is overdue.',
    'ASSESSMENT_COMPLETE': 'The committee assessment is complete. Case ready for review.',
}


def send_notification(case, event, recipients):
    body = MESSAGES.get(event, event)
    msg = (
        f"[{event}] Case {case.case_id} | {case.incident_type} | "
        f"{case.soldier_rank} {case.soldier_full_name}. {body}"
    )
    Notification.objects.bulk_create([
        Notification(case=case, recipient=r, event=event, message=msg)
        for r in recipients
    ])


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')


def signature_hash(user_id, case_id, ts):
    return hashlib.sha256(f"{user_id}:{case_id}:{ts.isoformat()}".encode()).hexdigest()


ALLOWED_EXTS  = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_file(f):
    ext = os.path.splitext(f.name)[1].lower()
    if ext not in ALLOWED_EXTS:
        return False, f"'{f.name}': only PDF, JPG, PNG allowed."
    if f.size > MAX_FILE_SIZE:
        return False, f"'{f.name}' exceeds 10 MB ({f.size/1024/1024:.1f} MB)."
    return True, None


# ── Optional HR Core soldier lookup ──────────────────────────────────────────

def fetch_soldier_from_hr_core(force_number):
    """
    If HR_CORE_API_URL is configured in settings, attempt to fetch soldier
    details from the external HRMIS. Returns dict or None.
    """
    api_url = getattr(settings, 'HR_CORE_API_URL', '')
    token   = getattr(settings, 'HR_CORE_API_TOKEN', '')
    if not api_url:
        return None
    try:
        import urllib.request, json
        url = f"{api_url.rstrip('/')}/api/external/authentication/?force_number={force_number}"
        req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return data
    except Exception:
        return None
