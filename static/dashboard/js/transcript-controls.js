// Transcript controls functionality
class TranscriptControls {
    constructor() {
        // UI Elements
        this.speakerBtn = document.getElementById('speaker-btn');
        this.langOriginalBtn = document.getElementById('lang-hindi');  // Rename button but keep ID for now
        this.langEnglishBtn = document.getElementById('lang-english');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.progressBar = document.getElementById('progress-bar');
        this.timeDisplay = document.getElementById('time-display');
        this.noteContent = document.getElementById('note-content');
        
        // State Management
        this.isPlaying = false;
        this.currentLanguage = 'original';
        this.originalText = '';
        this.englishText = '';
        
        // Speech Synthesis Setup
        this.speechSynth = window.speechSynthesis;
        this.utterance = null;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.duration = 0;
        this.progressInterval = null;

        // Initialize
        this.initializeEventListeners();
        this.updateLanguageToggle();
    }

    initializeEventListeners() {
        // Speaker button - triggers TTS
        this.speakerBtn.addEventListener('click', () => this.toggleSpeech());

        // Language toggle buttons
        this.langOriginalBtn.addEventListener('click', () => this.setLanguage('original'));
        this.langEnglishBtn.addEventListener('click', () => this.setLanguage('english'));

        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => this.togglePlayback());

        // Progress bar click handling
        const progressContainer = this.progressBar.parentElement;
        progressContainer.addEventListener('click', (e) => this.handleProgressBarClick(e));

        // Speech synthesis events
        this.speechSynth.addEventListener('start', () => this.onSpeechStart());
        this.speechSynth.addEventListener('end', () => this.onSpeechEnd());
        this.speechSynth.addEventListener('pause', () => this.onSpeechPause());
        this.speechSynth.addEventListener('resume', () => this.onSpeechResume());
        this.speechSynth.addEventListener('boundary', (e) => this.onWordBoundary(e));
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pauseSpeech();
        } else {
            if (this.elapsedTime > 0) {
                this.resumeSpeech();
            } else {
                this.startSpeech();
            }
        }
    }

    startSpeech() {
        if (!this.noteContent.textContent) return;

        this.utterance = new SpeechSynthesisUtterance(this.noteContent.textContent);
        this.utterance.lang = this.currentLanguage === 'original' ? 'hi-IN' : 'en-US';
        this.utterance.rate = 1;
        this.utterance.pitch = 1;

        // Calculate approximate duration (rough estimate)
        this.duration = (this.noteContent.textContent.length / 5) * 1000; // ~200ms per character
        this.startTime = Date.now() - this.elapsedTime;
        
        this.speechSynth.speak(this.utterance);
        this.isPlaying = true;
        this.updatePlayPauseButton();
        this.startProgressTracking();
    }

    pauseSpeech() {
        this.speechSynth.pause();
        this.isPlaying = false;
        this.elapsedTime = Date.now() - this.startTime;
        this.updatePlayPauseButton();
        this.stopProgressTracking();
    }

    resumeSpeech() {
        this.speechSynth.resume();
        this.isPlaying = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.updatePlayPauseButton();
        this.startProgressTracking();
    }

    stopSpeech() {
        this.speechSynth.cancel();
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.updatePlayPauseButton();
        this.stopProgressTracking();
        this.updateProgress(0);
    }

    startProgressTracking() {
        this.stopProgressTracking(); // Clear any existing interval
        this.progressInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const progress = (elapsed / this.duration) * 100;
            this.updateProgress(progress);
        }, 100);
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    updateProgress(progress) {
        // Update progress bar
        this.progressBar.style.width = `${Math.min(100, progress)}%`;
        
        // Update time display
        const elapsed = Math.floor((progress / 100) * this.duration / 1000);
        const total = Math.floor(this.duration / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const totalMinutes = Math.floor(total / 60);
        const totalSeconds = total % 60;
        
        this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
    }

    handleProgressBarClick(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const progress = (x / width) * 100;
        
        // Calculate new time position
        this.elapsedTime = (progress / 100) * this.duration;
        this.startTime = Date.now() - this.elapsedTime;
        
        // Update progress
        this.updateProgress(progress);
        
        // If playing, stop current speech and restart from new position
        if (this.isPlaying) {
            this.stopSpeech();
            this.startSpeech();
        }
    }

    setLanguage(language) {
        // Store current text if not already stored
        if (!this.originalText && language === 'english') {
            this.originalText = this.noteContent.textContent;
        }

        // Stop any ongoing playback
        if (this.isPlaying) {
            this.stopSpeech();
        }

        this.currentLanguage = language;
        this.updateLanguageToggle();

        if (language === 'english' && !this.englishText) {
            // Show loading state
            this.noteContent.innerHTML = '<div class="flex items-center justify-center space-x-2"><svg class="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="text-gray-600">Translating to English...</span></div>';
            
            this.translateToEnglish(this.originalText)
                .then(translatedText => {
                    this.englishText = translatedText;
                    this.updateContent();
                })
                .catch(error => {
                    console.error('Translation error:', error);
                    this.noteContent.innerHTML = '<div class="text-red-500 p-4 rounded-md bg-red-50">Translation failed. Please try again.</div>';
                });
        } else {
            this.updateContent();
        }
    }

    updateLanguageToggle() {
        // Update button text and styles
        this.langOriginalBtn.textContent = 'Original';
        this.langOriginalBtn.classList.toggle('active', this.currentLanguage === 'original');
        this.langEnglishBtn.classList.toggle('active', this.currentLanguage === 'english');
    }

    updateContent() {
        const text = this.currentLanguage === 'original' ? this.originalText : this.englishText;
        if (text) {
            this.noteContent.innerHTML = text;
            // Reset playback state
            this.stopSpeech();
        }
    }

    updatePlayPauseButton() {
        // Update button icon based on play state
        this.playPauseBtn.innerHTML = this.isPlaying ? `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ` : `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        `;
        
        // Add animation class
        this.playPauseBtn.classList.add('play-pause-animation');
        setTimeout(() => this.playPauseBtn.classList.remove('play-pause-animation'), 200);
    }

    onSpeechStart() {
        this.isPlaying = true;
        this.updatePlayPauseButton();
        this.startProgressTracking();
    }

    onSpeechEnd() {
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.updatePlayPauseButton();
        this.stopProgressTracking();
        this.updateProgress(0);
    }

    onSpeechPause() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.stopProgressTracking();
    }

    onSpeechResume() {
        this.isPlaying = true;
        this.updatePlayPauseButton();
        this.startProgressTracking();
    }

    onWordBoundary(event) {
        // Update progress based on spoken word position
        if (event.charIndex && this.utterance) {
            const progress = (event.charIndex / this.utterance.text.length) * 100;
            this.updateProgress(progress);
        }
    }

    async translateToEnglish(text) {
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({
                    text: text,
                    source: 'auto',
                    target: 'en'
                })
            });

            if (!response.ok) {
                throw new Error('Translation request failed');
            }

            const data = await response.json();
            return data.translatedText;
        } catch (error) {
            console.error('Translation API error:', error);
            throw error;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const transcriptControls = new TranscriptControls();
});

export { TranscriptControls }; 