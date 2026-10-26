"""
URL routing configuration for the authentication and user management API.
"""

from django.urls import path
from .views import (
    CustomTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    MeView,
    InviteUserView,
    AcceptInvitationView,
    ChangePasswordView,
    UserListView,
    UserDetailView,
    CreateUserView
)

urlpatterns = [
    # Authentication & Session Management (Cookie-enabled)
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # Authenticated User Profile Operations
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Invitation Acceptance (For invited recipients only - no public registration)
    path('accept-invitation/', AcceptInvitationView.as_view(), name='accept_invitation'),
    
    # Administrative Endpoints (Admin only)
    path('invite/', InviteUserView.as_view(), name='invite_user'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/create/', CreateUserView.as_view(), name='user_create'),
    path('users/<uuid:pk>/', UserDetailView.as_view(), name='user_detail'),
]
