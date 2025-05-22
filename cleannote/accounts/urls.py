from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('subscription/', views.subscription_view, name='subscription'),
    path('payment/success/', views.payment_success, name='payment_success'),
]
