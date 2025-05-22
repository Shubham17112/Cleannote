from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.dashboard, name='index'),
    path('generate-note/', views.generate_note, name='generate_note'),
    path('note/<int:note_id>/', views.note_detail, name='note_detail'),
    path('save-api-key/', views.save_api_key, name='save_api_key'),
]
