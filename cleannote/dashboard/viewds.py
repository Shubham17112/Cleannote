from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from .models import Note, AIModel, UserAPIKey
from .utils import extract_video_id, get_youtube_transcript, calculate_token_usage
import json
import google.generativeai as genai
import openai

# Default API keys for testing
DEFAULT_API_KEYS = {
    'Gemini': 'AIzaSyDs9YPEqFHpkQXaFRUQLdEio6_nD56n5CI',
    'GPT': 'YOUR_DEFAULT_OPENAI_API_KEY'
}

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
    show_transcript = request.POST.get('show_transcript') == 'true'  # New parameter
    
    video_id = extract_video_id(youtube_url)
    if not video_id:
        return JsonResponse({'error': 'Invalid YouTube URL'}, status=400)
    
    # Get transcript if either show_transcript or enhance_transcript is true
    transcript = get_youtube_transcript(video_id, enhance_transcript) if (show_transcript or enhance_transcript) else ''
    if not transcript and (show_transcript or enhance_transcript):
        return JsonResponse({'error': 'Unable to fetch transcript'}, status=400)
    
    # Get AI model
    ai_model = get_object_or_404(AIModel, id=ai_model_id)
    
    # Process note only if generate_note is true
    generate_note = request.POST.get('generate_note') == 'true'
    note_content = ""
    success = True
    
    if generate_note:
        # Try user API keys first
        user_api_keys = UserAPIKey.objects.filter(user=request.user, ai_model=ai_model)
        success = False
        
        for api_key in user_api_keys:
            try:
                note_content = process_with_ai(transcript, api_key.api_key, include_timestamps, create_quiz, ai_model.name)
                success = True
                break
            except Exception as e:
                continue
        
        # Try default API key if user keys fail or don't exist
        if not success and ai_model.name in DEFAULT_API_KEYS:
            try:
                note_content = process_with_ai(transcript, DEFAULT_API_KEYS[ai_model.name], include_timestamps, create_quiz, ai_model.name)
                success = True
            except Exception as e:
                pass
        
        if not success:
            return JsonResponse({'error': 'All API keys exhausted or invalid'}, status=400)
    
    # Calculate tokens and save note only if note was generated
    tokens_used = calculate_token_usage(note_content) if generate_note else 0
    if generate_note and hasattr(request.user, 'profile'):
        request.user.profile.tokens_remaining -= tokens_used
        request.user.profile.save()
    
    note = Note.objects.create(
        user=request.user,
        ai_model=ai_model,
        title=f"Notes for YouTube video {video_id}",
        content=note_content,
        youtube_url=youtube_url,
        video_id=video_id,
        tokens_used=tokens_used
    ) if generate_note else None
    
    return JsonResponse({
        'note_id': note.id if note else None,
        'note_content': note_content,
        'video_id': video_id,
        'tokens_remaining': request.user.profile.tokens_remaining if hasattr(request.user, 'profile') else 0,
        'transcript': transcript if (show_transcript or enhance_transcript) else ''
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
                    api_key=key.strip()
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
    ).values_list('api_key', flat=True)
    
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
    prompt = f"Generate detailed notes from the following transcript:\n\n{transcript}\n\n"
    if include_timestamps:
        prompt += "Include timestamps in the notes where relevant.\n"
    if create_quiz:
        prompt += "Generate a short quiz with 3-5 questions based on the content.\n"
    prompt += "Format the output in clear, concise markdown."
    
    if ai_model_name.lower() == 'gemini':
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")
    
    elif ai_model_name.lower() == 'gpt':
        try:
            openai.api_key = api_key
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",  # or gpt-4 if available
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates notes from transcripts."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    else:
        raise Exception(f"Unsupported AI model: {ai_model_name}")