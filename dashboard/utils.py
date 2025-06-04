import re
import requests
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
import whisper
import yt_dlp
import tempfile
import os

def extract_video_id(youtube_url):
    """Extract the video ID from a YouTube URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})',
        r'(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    
    return None

def get_youtube_transcript(video_id, enhance_transcript):
    """Get the transcript of a YouTube video, optionally using Whisper for enhanced transcription"""
    try:
        # Try YouTube's transcript API
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = ' '.join([item['text'] for item in transcript_list])
        if not enhance_transcript:
            print(transcript_text)
            return transcript_text
        
        # If enhanced transcription is requested, use Whisper
        with tempfile.TemporaryDirectory() as temp_dir:
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': f'{temp_dir}/%(id)s.%(ext)s',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }],
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=True)
                audio_file = f"{temp_dir}/{video_id}.mp3"
            
            # Transcribe with Whisper
            model = whisper.load_model("base")
            result = model.transcribe(audio_file)
            return result["text"]
    except TranscriptsDisabled:
        if enhance_transcript:
            # Use Whisper as fallback
            try:
                with tempfile.TemporaryDirectory() as temp_dir:
                    ydl_opts = {
                        'format': 'bestaudio/best',
                        'outtmpl': f'{temp_dir}/%(id)s.%(ext)s',
                        'postprocessors': [{
                            'key': 'FFmpegExtractAudio',
                            'preferredcodec': 'mp3',
                        }],
                    }
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=True)
                        audio_file = f"{temp_dir}/{video_id}.mp3"
                    
                    model = whisper.load_model("base")
                    result = model.transcribe(audio_file)
                    return result["text"]
            except Exception as e:
                print(f"Whisper transcription error: {str(e)}")
                return None
        return None
    except Exception as e:
        print(f"Transcript API error: {str(e)}")
        return None

def calculate_token_usage(text):
    """Calculate token usage based on text length"""
    return max(100, len(text) // 4)