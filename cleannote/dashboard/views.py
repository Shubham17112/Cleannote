from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import Note, AIModel, UserAPIKey
from .utils import extract_video_id, get_youtube_transcript, calculate_token_usage
from django.views.decorators.http import require_POST
import json
import google.generativeai as genai

# Default Gemini API key for testing
DEFAULT_GEMINI_API_KEY = "AIzaSyDs9YPEqFHpkQXaFRUQLdEio6_nD56n5CI"  # Replace with your actual Gemini API key

@login_required
def dashboard(request):
    ai_models = AIModel.objects.all()
    recent_notes = Note.objects.filter(user=request.user).order_by('-created_at')[:5]
    tokens_remaining = request.user.profile.tokens_remaining if hasattr(request.user, 'profile') else 0
    
    return render(request, 'dashboard/dashboard.html', {
        'ai_models': ai_models,
        'recent_notes': recent_notes,
        'tokens_remaining': tokens_remaining,
    })

@login_required
@require_POST
def generate_note(request):
    youtube_url = request.POST.get('youtube_url')
    ai_model_id = request.POST.get('ai_model')
    include_timestamps = request.POST.get('include_timestamps') == 'true'
    create_quiz = request.POST.get('create_quiz') == 'true'
    enhance_transcript = request.POST.get('enhance_transcript') == 'true'
    
    video_id = extract_video_id(youtube_url)
    if not video_id:
        return JsonResponse({'error': 'Invalid YouTube URL'}, status=400)
    
    # Get transcript
    transcript = get_youtube_transcript(video_id, enhance_transcript)
    if not transcript:
        return JsonResponse({'error': 'Unable to fetch transcript'}, status=400)
    
    # Try API keys in order
    user_api_keys = UserAPIKey.objects.filter(user=request.user, ai_model_id=ai_model_id)
    ai_model = get_object_or_404(AIModel, id=ai_model_id)
    
    note_content = ""
    success = False
    
    for api_key in user_api_keys:
        try:
            note_content = process_with_ai(transcript, api_key.key, include_timestamps, create_quiz, ai_model.name)
            success = True
            break
        except Exception as e:
            continue
            
    # If no user API keys worked or none exist, try default key for Gemini (for testing)
    if not success:
        try:
            note_content = process_with_ai(transcript, DEFAULT_GEMINI_API_KEY, include_timestamps, create_quiz, ai_model.name)
            success = True
        except Exception as e:
            pass
    
    else:
        print(DEFAULT_GEMINI_API_KEY)
        return JsonResponse({'error': 'All API keys exhausted or invalid'}, status=400)
    
    # Calculate tokens and save note
    tokens_used = calculate_token_usage(note_content)
    if hasattr(request.user, 'profile'):
        request.user.profile.tokens_remaining -= tokens_used
        request.user.profile.save()
    
    note = Note.objects.create(
        user=request.user,
        ai_model=ai_model,
        title=f"Notes for YouTube video {video_id}",
        content=note_content,
        video_id=video_id,
        tokens_used=tokens_used
    )
    
    return JsonResponse({
        'note_id': note.id,
        'note_content': note_content,
        'video_id': video_id,
        'tokens_remaining': request.user.profile.tokens_remaining,
        'transcript': transcript if enhance_transcript else ''
    })

@login_required
@require_POST
def save_api_keys(request):
    ai_model_id = request.POST.get('ai_model')
    api_keys = json.loads(request.POST.get('api_keys', '[]'))
    
    try:
        ai_model = get_object_or_404(AIModel, id=ai_model_id)
        
        # Clear existing keys for this model
        UserAPIKey.objects.filter(user=request.user, ai_model=ai_model).delete()
        
        # Save new keys
        for key in api_keys:
            if key.strip():
                UserAPIKey.objects.create(
                    user=request.user,
                    ai_model=ai_model,
                    key=key.strip()
                )
        
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def get_api_keys(request):
    ai_model_id = request.GET.get('ai_model')
    api_keys = UserAPIKey.objects.filter(
        user=request.user,
        ai_model_id=ai_model_id
    ).values_list('key', flat=True)
    
    return JsonResponse({'api_keys': list(api_keys)})

@login_required
def note_detail(request, note_id):
    note = get_object_or_404(Note, id=note_id, user=request.user)
    transcript = get_youtube_transcript(note.video_id, enhance_transcript=False) if note.video_id else None
    
    return render(request, 'dashboard/note_detail.html', {
        'note': note,
        'transcript': transcript,
    })

def process_with_ai(transcript, api_key, include_timestamps, create_quiz, ai_model_name):
    if ai_model_name == 'Gemini':
        # Configure Gemini API
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')  # Use the appropriate Gemini model
        
        # Create prompt based on options
        prompt = f"Generate detailed notes from the following transcript:\n\n{transcript}\n\n"
        if include_timestamps:
            prompt += "Include timestamps in the notes where relevant.\n"
        if create_quiz:
            prompt += "Generate a short quiz with 3-5 questions based on the content.\n"
        prompt += "Format the output in clear, concise markdown."
        
        # Call Gemini API
        response = model.generate_content(prompt)
        return response.text
    else:
        # Placeholder for other AI models
        return transcript