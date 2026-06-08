from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import forgot_password_views

urlpatterns = [
    path('login/', views.login, name='auth_login'),
    path('logout/', views.logout, name='auth_logout'),
    path('profile/', views.profile, name='auth_profile'),
    path('profile/update/', views.update_profile, name='auth_update_profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/', views.list_users, name='auth_list_users'),
    path('users/create/', views.create_user, name='auth_create_user'),
    path('users/lookup/', views.lookup_user_by_force_number, name='user-lookup'),
    path('users/<int:user_id>/sync/', views.sync_user_with_hrmis, name='user-sync-hrmis'),
    path('users/<int:user_id>/', views.get_user, name='auth_get_user'),
    path('users/<int:user_id>/toggle-active/', views.toggle_active, name='auth_toggle_active'),
    path('users/<int:user_id>/change-password/', views.change_password, name='auth_change_password'),
    path('users/<int:user_id>/update-role/', views.update_role, name='auth_update_role'),


    # Forgot Password wizard — three steps
    path('forgot-password/step1/', forgot_password_views.forgot_password_step1, name='forgot_password_step1'),
    path('forgot-password/check-answer/', forgot_password_views.forgot_password_check_answer, name='forgot_password_check_answer'),
    path('forgot-password/step3/', forgot_password_views.forgot_password_step3, name='forgot_password_step3'),
]
