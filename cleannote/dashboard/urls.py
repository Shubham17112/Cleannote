from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('generate-note/', views.generate_note, name='generate_note'),
    # path('note/<int:note_id>/', views.note_detail, name='note_detail'),
    path('save-api-key/', views.save_api_keys, name='save_api_keys'),
    path('get_api_keys/', views.get_api_keys, name='get_api_keys'),
]
