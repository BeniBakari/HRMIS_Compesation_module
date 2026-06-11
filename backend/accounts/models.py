from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


ROLE_CHOICES = [
    ('ADMIN', 'Administrator'),
    ('RPC', "RPC / Unit Commander"),
    ('COMPENSATION_HQ', 'Compensation HQ'),
    ('COMPENSATION_HQ_CO', 'Compensation HQ - CO'),
    ('COMPENSATION_HQ_SO', 'Compensation HQ - SO'),
    ('COMPENSATION_HQ_CHIEF', 'Compensation HQ - Chief'),
    ('CP_HRM', 'CP Human Resource Management'),
    ('CP_ADMINISTRATION', 'CP_ADMINISTRATION'),
    ('COMMITTEE_MEMBER', 'Committee Member'),
]

RANK_CHOICES = [
    ('CP', 'Inspector General of Police'),
    ('DCP', 'Deputy CP_ADMINISTRATION'),
    ('CASP', 'Commissioner of Police'),
    ('SACP', 'Senior Assistant Commissioner'),
    ('ACP', 'Assistant Commissioner'),
    ('SSP', 'Senior Superintendent'),
    ('SP', 'Superintendent'),
    ('ASP', 'Assistant Superintendent'),
    ('INSP', 'Inspector'),
    ('A/INSP', 'Acting Inspector'),
    ('RSM', 'Regimental Sergeant Major'),
    ('S/SGT', 'Staff Sergeant'),
    ('SGT', 'Sergeant'),
    ('CPL', 'Corporal'),
    ('PC', 'Police Constable'),
    ('CIVILIAN', 'Civilian'),
    ('DR', 'Doctor'),
]


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('role', 'ADMIN')
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    force_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100)
    check_number = models.CharField(max_length=100, blank=True, default='')
    nin = models.CharField(max_length=100, blank=True, default='')
    rank = models.CharField(max_length=20, choices=RANK_CHOICES, default='PC')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='RPC')
    unit = models.CharField(max_length=255, blank=True, default='')
    station = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
   # ✅ NEW: Force password change on first login
    must_change_password = models.BooleanField(default=False)
    profile_photo = models.TextField(blank=True, default='')  # Base64-encoded image
    signature = models.TextField(blank=True, default='')      # Base64-encoded image
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'comp_users'

    def get_profile_photo(self, mime: str = 'image/jpeg') -> str:
        """Return a ready-to-use data URI, or empty string if not set."""
        if not self.profile_photo:
            return ''
        return f'data:{mime};base64,{self.profile_photo}'
 
    def get_signature(self, mime: str = 'image/png') -> str:
        """Return a ready-to-use data URI, or empty string if not set."""
        if not self.signature:
            return ''
        return f'data:{mime};base64,{self.signature}'
    def get_full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p).strip()

    def get_short_name(self):
        return self.first_name
    def get_rank(self):
        return self.rank
    def get_initials(self):
        parts = [self.first_name, self.last_name]
        return ''.join(p[0].upper() for p in parts if p)

    def has_role(self, role_name):
        if self.role == 'ADMIN':
            return True
        return self.role.upper() == role_name.upper()

    def has_any_role(self, roles):
        if self.role == 'ADMIN':
            return True
        return self.role.upper() in [r.upper() for r in roles]

    def __str__(self):
        return f"{self.force_number or self.email} — {self.get_full_name()} ({self.role})"

    def sync_with_hrmis(self, hrmis_data):
        """Update user fields based on HRMIS data."""
        self.first_name = hrmis_data.get('first_name', self.first_name)
        self.middle_name = hrmis_data.get('middle_name', self.middle_name)
        self.last_name = hrmis_data.get('last_name', self.last_name)
        self.rank = hrmis_data.get('rank', self.rank)
        self.unit = hrmis_data.get('unit', self.unit)
        self.station = hrmis_data.get('station', self.station)
        # Note: We typically wouldn't update force_number or role from HRMIS
        self.save()