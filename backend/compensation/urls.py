from django.urls import path
from . import views

urlpatterns = [

    # ── Phase 1: Submission ──────────────────────────
    path('soldiers/<str:force_number>/', views.lookup_soldier),

    path('cases/', views.list_cases),
    path('cases/submit/', views.submit_case),

    path(
        'cases/<str:case_id>/documents/upload/',
        views.upload_document
    ),

    path(
        'cases/<str:case_id>/resubmit/',
        views.resubmit_case,
        name='resubmit-case'
    ),

    # ── Phase 2: Review Workflow ─────────────────────
    path(
        'cases/<str:case_id>/',
        views.get_case
    ),

    path(
        'cases/<str:case_id>/documents/verify/',
        views.verify_document
    ),

    # HQ
    path(
        'cases/<str:case_id>/hq-review/',
        views.hq_review_case,
        name='hq-review'
    ),

    # CO
    path(
        'cases/<str:case_id>/co-review/',
        views.co_review_case,
        name='co-review'
    ),

    # SO
    path(
        'cases/<str:case_id>/so-review/',
        views.so_review_case,
        name='so-review'
    ),

    # CHIEF
    path(
        'cases/<str:case_id>/chief-review/',
        views.chief_review_case,
        name='chief-review'
    ),

    # ── Phase 3: Committee ───────────────────────────
    path(
        'cases/<str:case_id>/committee/suggest/',
        views.suggest_committee
    ),

    path(
        'cases/<str:case_id>/committee/',
        views.form_committee
    ),

    # ── Phase 4: Assessment ──────────────────────────
    path(
        'cases/<str:case_id>/assessment/input/',
        views.submit_input
    ),

    path(
        'cases/<str:case_id>/assessment/',
        views.get_assessment
    ),

    # ── Audit & Reminders ────────────────────────────
    path(
        'reminders/',
        views.send_reminders
    ),

    path(
        'cases/<str:case_id>/audit/',
        views.case_audit
    ),

    # ── Formulas ─────────────────────────────────────
    path(
        'formulas/',
        views.formula_list_create
    ),

    path(
        'formulas/<int:pk>/',
        views.formula_detail
    ),

    # ── Notifications ────────────────────────────────
    path(
        'notifications/',
        views.my_notifications
    ),

    path(
        'notifications/<int:pk>/read/',
        views.mark_read
    ),

    path(
        'notifications/read-all/',
        views.mark_all_read
    ),
    path(
        'cases/<str:case_id>/documents/<int:doc_id>/reject/',
         views.reject_document),
]