import re
import requests
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled

def extract_video_id(youtube_url):
    """Extract the video ID from a YouTube URL"""
    # Regular expression to match YouTube video IDs
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

def get_youtube_transcript(video_id):
    """Get the transcript of a YouTube video"""
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        
        # Combine all transcript parts into a single text
        transcript_text = ' '.join([item['text'] for item in transcript_list])
        return transcript_text
    except TranscriptsDisabled:
        return None
    except Exception:
        return None

def calculate_token_usage(text):
    """Calculate token usage based on text length
    This is a simplified calculation - in a real app, you'd use a tokenizer
    """
    # Rough estimate: 1 token per 4 characters
    return max(100, len(text) // 4)  # Minimum 100 tokens
