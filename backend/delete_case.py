import os
import django

# Setup Django environment
import sys
# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'comp_project.settings')
django.setup()

from compensation.models import CompensationCase

def delete_case(case_id):
    try:
        case = CompensationCase.objects.get(case_id=case_id)
        name = case.soldier_full_name
        case.delete() # This will cascade delete documents, committee members, assessments, and audit logs
        print(f"Successfully deleted case {case_id} ({name}) and all related data.")
    except CompensationCase.DoesNotExist:
        print(f"Case {case_id} not found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    delete_case("TPF-2026-00008")
