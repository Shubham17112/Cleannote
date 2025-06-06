#### 2. Updated View (`views.py`)

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from .models import Note, AIModel, UserAPIKey
from .utils import extract_video_id, get_youtube_transcript, calculate_token_usage
import json
import google.generativeai as genai
import openai
import os
from django.conf import settings
from langdetect import detect
from deep_translator import GoogleTranslator
from gtts import gTTS

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
    
    # Get transcript using utils.py
    transcript = get_youtube_transcript(video_id, enhance_transcript)
    if not transcript:
        return JsonResponse({'error': 'Unable to fetch transcript'}, status=400)
    
    # Get AI model
    ai_model = get_object_or_404(AIModel, id=ai_model_id)
    
    # Try user API keys first
    user_api_keys = UserAPIKey.objects.filter(user=request.user, ai_model=ai_model) 
    note_content = ""
    success = False
    
    for api_key in user_api_keys:
        try:
            note_content = process_with_ai(transcript, api_key.api_key, include_timestamps, create_quiz, ai_model.name)
            print('user api key used',  api_key.api_key)
            success = True
            break
        except Exception as e:
            print(f"User API key error for {ai_model.name}: {str(e)}")
            continue
    
    # Try default API key only if no user keys succeed
    if not success and ai_model.api_key_field:
        try:
            note_content = process_with_ai(transcript, ai_model.api_key_field, include_timestamps, create_quiz, ai_model.name)
            print('defult api key used', ai_model.api_key_field)
            success = True
        except Exception as e:
            print(f"Default API key error for {ai_model.name}: {str(e)}")
    
    if not success:
        return JsonResponse({'error': 'All API keys exhausted or invalid'}, status=400)
    
    # Calculate tokens using utils.py
    tokens_used = calculate_token_usage(note_content)
    if hasattr(request.user, 'profile'):
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
    )
    
    return JsonResponse({
        'note_id': note.id,
        'note_content': note_content,
        'video_id': video_id,
        'tokens_remaining': request.user.profile.tokens_remaining,
        'transcript': transcript 
    })

@login_required
@require_POST
def save_api_keys(request):
    ai_model_id = request.POST.get('ai_model')
    api_keys = json.loads(request.POST.get('api_keys', '[]'))
    
    try:
        ai_model = get_object_or_404(AIModel, id=ai_model_id)
        
        # Clear existing keys for this model and user
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
                model="gpt-3.5-turbo",
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

def process_audio_transcript(request):
    if request.method == 'POST':
        try:
            transcript = request.POST.get('transcript', '')
            if not transcript:
                return JsonResponse({'error': 'No transcript provided'}, status=400)
            
            # Create media directory if it doesn't exist
            audio_dir = os.path.join(settings.MEDIA_ROOT, 'audio')
            os.makedirs(audio_dir, exist_ok=True)
            
            # Detect language
            try:
                detected_lang = detect(transcript)
                print(f"Detected language: {detected_lang}")
            except:
                detected_lang = 'en'  # Default to English if detection fails
            
            # Generate original audio
            try:
                original_path = os.path.join(audio_dir, 'original.mp3')
                tts = gTTS(text=transcript, lang=detected_lang)
                tts.save(original_path)
                print(f"Original audio saved to: {original_path}")
            except Exception as e:
                print(f"Error generating original audio: {str(e)}")
                return JsonResponse({'error': 'Failed to generate audio'}, status=500)
            
            # Initialize variables
            translated_text = ''
            
            # Always attempt translation if not already in English
            if detected_lang != 'en':
                try:
                    # Split text into manageable chunks
                    chunks = transcript.split('\n')
                    translated_chunks = []
                    
                    translator = GoogleTranslator(source=detected_lang, target='en')
                    
                    for chunk in chunks:
                        if not chunk.strip():
                            translated_chunks.append('')
                            continue
                            
                        # Split long chunks into sentences
                        if len(chunk) > 500:
                            sentences = chunk.split('. ')
                            translated_sentences = []
                            
                            for sentence in sentences:
                                if sentence.strip():
                                    try:
                                        translated = translator.translate(sentence.strip())
                                        translated_sentences.append(translated)
                                    except Exception as e:
                                        print(f"Translation error for sentence: {str(e)}")
                                        translated_sentences.append(sentence)
                                        
                            translated_chunk = '. '.join(translated_sentences)
                        else:
                            try:
                                translated_chunk = translator.translate(chunk)
                            except Exception as e:
                                print(f"Translation error for chunk: {str(e)}")
                                translated_chunk = chunk
                                
                        translated_chunks.append(translated_chunk)
                    
                    translated_text = '\n'.join(translated_chunks)
                    
                    # Generate translated audio
                    try:
                        translated_path = os.path.join(audio_dir, 'translated.mp3')
                        tts_en = gTTS(text=translated_text, lang='en')
                        tts_en.save(translated_path)
                        print(f"Translated audio saved to: {translated_path}")
                    except Exception as e:
                        print(f"Error generating translated audio: {str(e)}")
                        
                except Exception as e:
                    print(f"Translation error: {str(e)}")
                    return JsonResponse({'error': f'Translation failed: {str(e)}'}, status=500)
            else:
                # If original is English, use it as translated text
                translated_text = transcript
            
            context = {
                'original_text': transcript,
                'translated_text': translated_text,
                'is_translated': detected_lang != 'en',
                'detected_language': detected_lang,
                'success': True
            }
            
            return JsonResponse(context)
            
        except Exception as e:
            print(f"Process error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@login_required
@require_POST
def translate_text(request):
    try:
        print("=== Translation Request Received ===")
        data = json.loads(request.body)
        text = data.get('text', '')
        source = data.get('source', 'auto')
        target = data.get('target', 'en')

        if not text:
            return JsonResponse({'error': 'No text provided'}, status=400)

        # Split text into paragraphs
        paragraphs = text.split('\n')
        translated_paragraphs = []
        
        # Initialize translator
        translator = GoogleTranslator(source=source, target=target)
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                translated_paragraphs.append('')
                continue
                
            try:
                # Further split long paragraphs into sentences if needed
                if len(paragraph) > 500:  # Google's limit is around 5000 chars
                    sentences = paragraph.split('. ')
                    translated_sentences = []
                    
                    for sentence in sentences:
                        if not sentence.strip():
                            continue
                        try:
                            translated = translator.translate(sentence.strip())
                            translated_sentences.append(translated)
                        except Exception as e:
                            print(f"Error translating sentence: {str(e)}")
                            translated_sentences.append(sentence)  # Keep original on error
                            
                    translated_paragraph = '. '.join(translated_sentences)
                else:
                    translated_paragraph = translator.translate(paragraph.strip())
                    
                translated_paragraphs.append(translated_paragraph)
                
            except Exception as e:
                print(f"Error translating paragraph: {str(e)}")
                translated_paragraphs.append(paragraph)  # Keep original on error
                
        # Join all translated paragraphs
        translated_text = '\n'.join(translated_paragraphs)
        
        if not translated_text:
            raise Exception("Translation resulted in empty text")
            
        return JsonResponse({
            'translatedText': translated_text,
            'source': source,
            'target': target
        })
            
    except json.JSONDecodeError as e:
        print(f"JSON Decode error: {str(e)}")
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return JsonResponse({
            'error': f"Translation failed: {str(e)}",
            'details': {
                'source': source,
                'target': target,
                'textLength': len(text) if 'text' in locals() else 0
            }
        }, status=500)