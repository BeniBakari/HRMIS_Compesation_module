import random
import requests
from django.contrib.sessions.backends.db import SessionStore

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import User


# ---------------------------------------------------------------------------
# NIDA helpers
# ---------------------------------------------------------------------------
NIDA_API_URL = "http://192.168.57.17:83/api/v1/nida"


HRMIS_API_URL  = "http://192.168.10.12/api/authentication"
HRMIS_HEADERS  = {
    "key":   "mainstore",
    "value": "cc7bdc8b80572f99848145c70d219969d476a53c",
    "Content-Type": "application/json",
}



def fetch_nida_info(nin: str) -> dict | None:
    """
    Call the NIDA API with form data and return the info dict, or None on failure.
    """
    try:
        cleaned_nin = "".join(ch for ch in nin if ch.isdigit())
        resp = requests.post(
            NIDA_API_URL,
            data={"nin": cleaned_nin},  # form-encoded
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("Result") or data.get("obj") or data
    except Exception:
        return None

def fetch_hrmis_nin(check_number: str) -> str | None:
    """
    Pull a user record from HRMIS and return the NIN field, or None.
    """
    try:
        resp = requests.post(
            HRMIS_API_URL,
            headers=HRMIS_HEADERS,
            json={"checkno": check_number},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        info = data.get("info", {})
        return info.get("nin") or None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Question bank
# Eight possible questions derived from NIDA data fields.
# Each entry: (question_text, nida_field_key, answer_normaliser)
# ---------------------------------------------------------------------------

def _norm(val: str) -> str:
    return str(val).strip().lower()


QUESTION_BANK = [
    {
        "id": "q_fname",
        "question": "What is your first name as registered on your National ID?",
        "field": "FirstName",        # adjust to actual NIDA response key
    },
    {
        "id": "q_lname",
        "question": "What is your last (family) name as registered on your National ID?",
        "field": "Surname",
    },
    {
        "id": "q_dob",
        "question": "What is your date of birth (DD/MM/YYYY)?",
        "field": "DateOfBirth",
    },
    {
        "id": "q_gender",
        "question": "What is your gender as registered on your National ID? (Male / Female)",
        "field": "Sex",
    },
    {
        "id": "q_region",
        "question": "What region were you born in?",
        "field": "BirthRegion",
    },
    {
        "id": "q_district",
        "question": "What district were you born in?",
        "field": "BirthDistrict",
    },
    {
        "id": "q_mother",
        "question": "What is your mother's first name as registered on your National ID?",
        "field": "MotherFirstName",
    },
    {
        "id": "q_father",
        "question": "What is your father's first name as registered on your National ID?",
        "field": "FatherFirstName",
    },
]


import random

def _norm(value: str) -> str:
    """
    Normalize answers for comparison — strip spaces, uppercase, etc.
    """
    return value.strip().upper()

QUESTION_BANK = [
    {
        "id": "birthward",
        "field": "BIRTHWARD",
        "question": "In which ward were you born?"
    },
    {
        "id": "permanent_village",
        "field": "PERMANENTVILLAGE",
        "question": "What is the name of your permanent village?"
    },
    {
        "id": "mothers_middle_name",
        "field": "MOTHERSMIDDLENAME",
        "question": "What is your mother's middle name?"
    },
    {
        "id": "primary_school",
        "field": "PRIMARYSCHOOLEDUCATION",
        "question": "Which primary school did you attend?"
    },
    {
        "id": "permanent_district",
        "field": "PERMANENTDISTRICT",
        "question": "What is your permanent district?"
    },
    {
        "id": "permanent_region",
        "field": "PERMANENTREGION",
        "question": "Which region is listed as your permanent residence?"
    },
    {
        "id": "permanent_ward",
        "field": "PERMANENTWARD",
        "question": "What is your permanent ward?"
    },
    {
        "id": "mothers_last_name",
        "field": "MOTHERSLASTNAME",
        "question": "What is your mother's last name?"
    },
]

def build_questions(nida_info: dict, count: int = 5) -> list[dict]:
    """
    Pick `count` random questions whose answers exist in nida_info.
    Returns list of {id, question, answer} dicts (answer is server-side only).
    """
    # Filter only questions with non-empty answers
    available = [
        q for q in QUESTION_BANK
        if nida_info.get(q["field"]) not in (None, "", "N/A")
    ]

    if not available:
        return []

    # Randomly sample up to `count` questions
    chosen = random.sample(available, min(count, len(available)))

    return [
        {
            "id":       q["id"],
            "question": q["question"],
            "answer":   _norm(nida_info[q["field"]]),
        }
        for q in chosen
    ]



# ---------------------------------------------------------------------------
# Step 1 — Validate check number & look up user
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password_step1(request):
    """
    POST { check_number }
    → 200 { session_key, user_id, has_nin }  on success
    → 404 if user not found
    """
    check_number = request.data.get("check_number", "").strip()
    if not check_number:
        return Response(
            {"error": "Check number is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(check_number=check_number)
    except User.DoesNotExist:
        return Response(
            {"error": "No account found with that check number."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Resolve NIN -------------------------------------------------------
    nin = user.nin

    if not nin:
        # Try HRMIS
        nin = fetch_hrmis_nin(check_number)
        if nin:
            user.nin = nin
            user.save(update_fields=["nin"])

    if not nin:
        return Response(
            {"error": "Your account has no NIN on record. Please contact administration."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Fetch NIDA data & build questions ----------------------------------
    nida_response = fetch_nida_info(nin)
    if not nida_response:
        return Response(
            {"error": "Could not retrieve your identity information from NIDA. Please try again later."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    nida_info = nida_response.get("content", {})
    questions = build_questions(nida_info, count=5)
    if len(questions) < 3:
        return Response(
            {"error": "Insufficient identity information available to verify your identity."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Store in server-side session ----------------------------------------
    session = SessionStore()
    session["fp_user_id"]   = user.id
    session["fp_questions"] = questions          # includes answers (server only)
    session["fp_step"]      = "questions"
    session["fp_attempts"]  = 0
    session.set_expiry(900)                      # 15-minute window
    session.create()

    # Return only question text — never the answers -----------------------
    public_questions = [
        {"id": q["id"], "question": q["question"]}
        for q in questions
    ]

    return Response(
        {
            "session_key": session.session_key,
            "questions":   public_questions,
            "full_name":   user.get_full_name(),
            "rank":        user.rank,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# Step 2 — Verify NIDA answers
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password_step2(request):
    """
    POST { session_key, answers: { q_fname: "John", q_lname: "Doe", ... } }
    → 200 { reset_token }  on success
    → 400 on wrong answers
    """
    session_key = request.data.get("session_key", "").strip()
    answers     = request.data.get("answers", {})

    if not session_key:
        return Response({"error": "Session key is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        session = SessionStore(session_key=session_key)
        session.load()   # raises if expired / not found
    except Exception:
        return Response(
            {"error": "Your session has expired. Please start over."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if session.get("fp_step") != "questions":
        return Response(
            {"error": "Invalid session state. Please start over."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Throttle brute-force
    attempts = session.get("fp_attempts", 0)
    if attempts >= 3:
        session.flush()
        return Response(
            {"error": "Too many incorrect attempts. Please start over."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    stored_questions = session.get("fp_questions", [])
    wrong = []
    for q in stored_questions:
        user_answer = _norm(answers.get(q["id"], ""))
        if user_answer != q["answer"]:
            wrong.append(q["id"])

    if wrong:
        session["fp_attempts"] = attempts + 1
        session.save()
        remaining = 3 - session["fp_attempts"]
        return Response(
            {
                "error":     f"Some answers are incorrect. {remaining} attempt(s) remaining.",
                "wrong_ids": wrong,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # All correct — issue a one-time reset token -------------------------
    import secrets
    reset_token = secrets.token_urlsafe(32)

    session["fp_step"]        = "reset"
    session["fp_reset_token"] = reset_token
    session.save()

    return Response({"reset_token": reset_token, "session_key": session_key}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Step 3 — Set new password
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password_step3(request):
    """
    POST { session_key, reset_token, new_password, confirm_password }
    → 200 on success
    """
    session_key   = request.data.get("session_key", "").strip()
    reset_token   = request.data.get("reset_token", "").strip()
    new_password  = request.data.get("new_password", "")
    confirm_password = request.data.get("confirm_password", "")

    if not all([session_key, reset_token, new_password, confirm_password]):
        return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({"error": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response(
            {"error": "Password must be at least 8 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session = SessionStore(session_key=session_key)
        session.load()
    except Exception:
        return Response({"error": "Session expired. Please start over."}, status=status.HTTP_400_BAD_REQUEST)

    if session.get("fp_step") != "reset":
        return Response({"error": "Invalid session state."}, status=status.HTTP_400_BAD_REQUEST)

    if session.get("fp_reset_token") != reset_token:
        return Response({"error": "Invalid reset token."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=session["fp_user_id"])
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    user.set_password(new_password)
    user.save()
    session.flush()   # invalidate session immediately

    return Response({"message": "Password reset successfully. You may now log in."}, status=status.HTTP_200_OK)

# ---------------------------------------------------------------------------
# Per-question answer check (used by the one-by-one frontend flow)
# ---------------------------------------------------------------------------
import secrets

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password_check_answer(request):
    """
    POST
    {
        "session_key": "...",
        "question_id": "...",
        "answer": "..."
    }

    Rules:
    - User can answer or skip (empty string).
    - Every question is submitted exactly once.
    - Correct/incorrect is recorded.
    - After all questions are answered:
        - 3+ correct => success + reset_token
        - otherwise => verification failed
    """

    session_key = request.data.get("session_key", "").strip()
    question_id = request.data.get("question_id", "").strip()

    # IMPORTANT:
    # allow empty string for skipped questions
    user_answer = request.data.get("answer", "")

    if not session_key or not question_id:
        return Response(
            {"error": "session_key and question_id are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session = SessionStore(session_key=session_key)
        session.load()
    except Exception:
        return Response(
            {"error": "Session expired. Please start over."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if session.get("fp_step") != "questions":
        return Response(
            {"error": "Invalid session state. Please start over."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    stored_questions = session.get("fp_questions", [])

    target = next(
        (q for q in stored_questions if q["id"] == question_id),
        None,
    )

    if not target:
        return Response(
            {"error": "Unknown question ID."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Results dictionary
    # Example:
    # {
    #   "birthward": True,
    #   "mother_name": False
    # }
    results = session.get("fp_results", {})

    # Ignore duplicate submissions
    if question_id in results:
        already_correct = results[question_id]

        return Response({
            "correct": already_correct,
            "all_done": False,
            "message": "Question already submitted."
        })

    # Empty answer = skipped = incorrect
    correct = False

    if str(user_answer).strip():
        correct = (
            _norm(user_answer)
            == _norm(target["answer"])
        )

    results[question_id] = correct
    session["fp_results"] = results

    all_ids = {q["id"] for q in stored_questions}
    answered_ids = set(results.keys())

    # Not finished yet
    if answered_ids != all_ids:
        session.save()

        return Response({
            "correct": correct,
            "all_done": False,
            "answered": len(answered_ids),
            "total": len(all_ids),
        })

    # --------------------------------------------------------
    # ALL QUESTIONS COMPLETED
    # --------------------------------------------------------

    correct_count = sum(
        1 for value in results.values()
        if value is True
    )

    passed = correct_count >= 3

    if passed:
        reset_token = secrets.token_urlsafe(32)

        session["fp_step"] = "reset"
        session["fp_reset_token"] = reset_token
        session.save()

        return Response({
            "correct": correct,
            "all_done": True,
            "passed": True,
            "score": correct_count,
            "required_score": 3,
            "reset_token": reset_token,
            "session_key": session_key,
        })

    # Failed verification
    session.flush()

    return Response(
        {
            "correct": correct,
            "all_done": True,
            "passed": False,
            "score": correct_count,
            "required_score": 3,
            "error": (
                f"Identity verification failed. "
                f"You answered {correct_count}/5 questions correctly. "
                f"At least 3 correct answers are required."
            ),
        },
        status=status.HTTP_403_FORBIDDEN,
    )