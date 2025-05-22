import json
import requests
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.conf import settings
from django.contrib import messages
from .models import AIModel, Note, UserAPIKey
from accounts.models import UserProfile
from .utils import get_youtube_transcript, calculate_token_usage, extract_video_id

@login_required
def dashboard(request):
    """Main dashboard view"""
    # Check if user has a subscription
    try:
        profile = request.user.profile
        if not profile.subscription:
            return redirect('accounts:subscription')
    except UserProfile.DoesNotExist:
        return redirect('accounts:subscription')
    
    # Get AI models
    ai_models = AIModel.objects.all()
    default_model = AIModel.objects.filter(is_default=True).first()
    
    # Get user's saved API keys
    user_api_keys = {key.ai_model.id: key.api_key for key in UserAPIKey.objects.filter(user=request.user)}
    
    # Get user's recent notes
    recent_notes = Note.objects.filter(user=request.user).order_by('-created_at')[:5]
    
    context = {
        'ai_models': ai_models,
        'default_model': default_model,
        'user_api_keys': user_api_keys,
        'recent_notes': recent_notes,
        'tokens_remaining': profile.tokens_remaining,
    }
    
    return render(request, 'dashboard/dashboard.html', context)

@login_required
def generate_note(request):
    """Generate a note from a YouTube URL"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=400)
    
    youtube_url = request.POST.get('youtube_url')
    model_id = request.POST.get('ai_model')
    custom_api_key = request.POST.get('api_key', '').strip()
    
    # Validate inputs
    if not youtube_url:
        return JsonResponse({'error': 'YouTube URL is required'}, status=400)
    
    # Get user profile
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        return JsonResponse({'error': 'User profile not found'}, status=400)
    
    # Get AI model
    try:
        ai_model = AIModel.objects.get(id=model_id) if model_id else AIModel.objects.filter(is_default=True).first()
        if not ai_model:
            return JsonResponse({'error': 'No AI model available'}, status=400)
    except AIModel.DoesNotExist:
        return JsonResponse({'error': 'Invalid AI model'}, status=400)
    
    # Get YouTube transcript
    video_id = extract_video_id(youtube_url)
    if not video_id:
        return JsonResponse({'error': 'Invalid YouTube URL'}, status=400)
    
    transcript = get_youtube_transcript(video_id)
    if not transcript:
        return JsonResponse({'error': 'Failed to get transcript'}, status=400)
    
    # Calculate token usage
    token_usage = calculate_token_usage(transcript)
    
    # Check if user has enough tokens
    if not profile.consume_tokens(token_usage):
        return JsonResponse({
            'error': 'Not enough tokens',
            'tokens_remaining': profile.tokens_remaining,
            'tokens_required': token_usage
        }, status=400)
    
    # Determine which API key to use
    api_key = None
    if custom_api_key:
        api_key = custom_api_key
    else:
        # Try to get user's saved API key
        try:
            user_api_key = UserAPIKey.objects.get(user=request.user, ai_model=ai_model)
            api_key = user_api_key.api_key
        except UserAPIKey.DoesNotExist:
            # Use default API key from settings
            api_key_field = ai_model.api_key_field
            api_key = getattr(settings, api_key_field, None)
    
    if not api_key:
        # Refund tokens since we couldn't process the request
        profile.tokens_remaining += token_usage
        profile.save()
        return JsonResponse({'error': 'No API key available for the selected model'}, status=400)
    
    # Process with AI model
    try:
        # This is a simplified example - in a real app, you'd have different API integrations
        prompt = f"Create comprehensive notes from this YouTube video transcript:\n\n{transcript}"
        
        # Example API call (adjust based on the actual API you're using)
        response = requests.post(
            "https://api.example.com/generate",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"prompt": prompt, "max_tokens": 1000}
        )
        
        if response.status_code != 200:
            # Refund tokens on failure
            profile.tokens_remaining += token_usage
            profile.save()
            return JsonResponse({'error': 'Failed to generate notes'}, status=400)
        
        result = response.json()
        note_content = result.get('text', '')
        
        # Save the note
        note = Note.objects.create(
            user=request.user,
            youtube_url=youtube_url,
            title=f"Notes for {video_id}",
            content=note_content,
            ai_model=ai_model,
            tokens_used=token_usage
        )
        
        return JsonResponse({
            'success': True,
            'note_id': note.id,
            'note_content': note_content,
            'tokens_used': token_usage,
            'tokens_remaining': profile.tokens_remaining,
            'video_id': video_id
        })
        
    except Exception as e:
        # Refund tokens on exception
        profile.tokens_remaining += token_usage
        profile.save()
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def note_detail(request, note_id):
    """View a single note"""
    note = get_object_or_404(Note, id=note_id, user=request.user)
    video_id = extract_video_id(note.youtube_url)
    
    return render(request, 'dashboard/note_detail.html', {
        'note': note,
        'video_id': video_id
    })

@login_required
def save_api_key(request):
    """Save a custom API key for a model"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=400)
    
    model_id = request.POST.get('ai_model')
    api_key = request.POST.get('api_key', '').strip()
    
    if not model_id or not api_key:
        return JsonResponse({'error': 'Model ID and API key are required'}, status=400)
    
    try:
        ai_model = AIModel.objects.get(id=model_id)
        
        # Update or create the API key
        UserAPIKey.objects.update_or_create(
            user=request.user,
            ai_model=ai_model,
            defaults={'api_key': api_key}
        )
        
        return JsonResponse({'success': True})
    except AIModel.DoesNotExist:
        return JsonResponse({'error': 'Invalid AI model'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
