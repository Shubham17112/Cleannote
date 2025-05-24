# from youtube_transcript_api import YouTubeTranscriptApi
# video_id = "PGUdWfB8nLg"
# try:
#     transcript = YouTubeTranscriptApi.get_transcript(video_id)
#     print("Transcript:", [item['text'] for item in transcript][:10])  # Print first 10 transcript items
# except Exception as e:
#     print("Error:", str(e))


# from utils import get_youtube_transcript

# video_id = "PGUdWfB8nLg"
# transcript = get_youtube_transcript(video_id, enhance_transcript=True)
# if transcript:
#     print("Transcript:", transcript[:200])  # Print first 200 characters
# else:
#     print("Failed to retrieve transcript")

import whisper
import yt_dlp
import tempfile
import os

video_id = "PGUdWfB8nLg"
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
        print(f"Downloading audio to {temp_dir}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f'https://www.youtube.com/watch?v={video_id}'])
            audio_file = f"{temp_dir}/{video_id}.mp3"
        if not os.path.exists(audio_file):
            print(f"Audio file not found: {audio_file}")
            raise FileNotFoundError("Audio download failed")
        print(f"Transcribing audio: {audio_file}")
        model = whisper.load_model("base")
        result = model.transcribe(audio_file)
        print("Whisper Transcript:", result["text"][:200])
except Exception as e:
    print("Whisper Error:", str(e))