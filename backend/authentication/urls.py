"""
URL configuration for authentication app.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    LogoutView,
    MeView,
    RegisterView,
    InviteUserView,
    ChangePasswordView,
    UserListView,
    UserDetailView,
    CreateUserView
)

urlpatterns = [
    # JWT Authentication
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # User management
    path('me/', MeView.as_view(), name='me'),
    path('register/', RegisterView.as_view(), name='register'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Admin functions - User CRUD
    path('invite/', InviteUserView.as_view(), name='invite_user'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/create/', CreateUserView.as_view(), name='user_create'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
]
