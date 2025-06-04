import { loadYouTubeVideo, extractVideoId } from './youtube.js';

class NoteGenerator {
    constructor() {
        this.youtubeUrlInput = document.getElementById('youtube-url');
        this.generateBtn = document.getElementById('generate-btn');
        this.resultSection = document.getElementById('result-section');
        this.loadingSection = document.getElementById('loading-section');
        this.errorSection = document.getElementById('error-section');
        this.errorMessage = document.getElementById('error-message');
        this.noteContent = document.getElementById('note-content');
        this.transcriptSection = document.getElementById('transcript-section');
        this.transcriptContent = document.getElementById('transcript-content');
        this.tokensRemaining = document.getElementById('tokens-remaining');
        this.saveNoteBtn = document.getElementById('save-note-btn');
        this.downloadNoteBtn = document.getElementById('download-note-btn');
        this.fullscreenNoteBtn = document.getElementById('fullscreen-note-btn');
        this.fullscreenModal = document.getElementById('fullscreen-modal');
        this.modalContent = document.getElementById('modal-content');
        this.closeModal = document.getElementById('close-modal');
        this.aiModelSelect = document.getElementById('ai-model');
        this.generateNoteCheckbox = document.getElementById('generate-note');
        this.showTranscriptCheckbox = document.getElementById('show-transcript');
        this.enhanceTranscriptCheckbox = document.getElementById('enhance-transcript');

        // Get CSRF token
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        this.initializeEventListeners();
    }

    async generateNote() {
        const youtubeUrl = this.youtubeUrlInput.value.trim();
        if (!youtubeUrl) {
            this.showError('Please enter a YouTube URL');
            return;
        }
        
        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            this.showError('Invalid YouTube URL');
            return;
        }
        
        // Show loading
        this.resultSection.classList.add('hidden');
        this.errorSection.classList.add('hidden');
        this.loadingSection.classList.remove('hidden');
        
        // Get form data
        const formData = new FormData();
        formData.append('youtube_url', youtubeUrl);
        formData.append('ai_model', this.aiModelSelect.value);
        formData.append('generate_note', this.generateNoteCheckbox.checked);
        formData.append('show_transcript', this.showTranscriptCheckbox.checked);
        formData.append('include_timestamps', document.getElementById('include-timestamps').checked);
        formData.append('create_quiz', document.getElementById('create-quiz').checked);
        formData.append('enhance_transcript', this.enhanceTranscriptCheckbox.checked);
        formData.append('csrfmiddlewaretoken', this.csrfToken);
        
        try {
            const response = await fetch('/dashboard/generate-note/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                }
            });
            
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error('Invalid response format. Expected JSON, got: ' + text);
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate note');
            }
            
            // Update tokens remaining
            this.tokensRemaining.textContent = data.tokens_remaining;
            
            // Show result
            if (this.generateNoteCheckbox.checked) {
                this.noteContent.innerHTML = data.note_content || '<p class="text-gray-500 italic">Generated notes will appear here...</p>';
            } else {
                this.noteContent.innerHTML = '<p class="text-gray-500 italic">Note generation disabled</p>';
            }
            
            if (data.transcript && (this.showTranscriptCheckbox.checked || this.enhanceTranscriptCheckbox.checked)) {
                this.transcriptContent.innerHTML = data.transcript;
                this.transcriptSection.classList.remove('hidden');
            } else {
                this.transcriptSection.classList.add('hidden');
            }
            
            if (data.video_id) {
                loadYouTubeVideo(data.video_id);
            }
            
            this.loadingSection.classList.add('hidden');
            this.resultSection.classList.remove('hidden');
            
            // Save note ID for save button
            if (data.note_id) {
                this.saveNoteBtn.dataset.noteId = data.note_id;
            }
        } catch (error) {
            console.error('Error generating note:', error);
            this.loadingSection.classList.add('hidden');
            this.showError(error.message);
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorSection.classList.remove('hidden');
    }

    downloadNote() {
        const content = this.noteContent.innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cleannote.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showFullscreenNote() {
        this.modalContent.innerHTML = this.noteContent.innerHTML;
        this.fullscreenModal.classList.remove('hidden');
    }

    initializeEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generateNote());
        this.downloadNoteBtn.addEventListener('click', () => this.downloadNote());
        this.fullscreenNoteBtn.addEventListener('click', () => this.showFullscreenNote());
        this.closeModal.addEventListener('click', () => {
            this.fullscreenModal.classList.add('hidden');
        });

        // Show/hide transcript based on checkbox
        this.showTranscriptCheckbox.addEventListener('change', () => {
            if (this.showTranscriptCheckbox.checked && 
                this.transcriptContent.innerHTML.trim() !== '<p class="text-gray-500 italic">Transcript will appear here...</p>') {
                this.transcriptSection.classList.remove('hidden');
            } else {
                this.transcriptSection.classList.add('hidden');
            }
        });
    }
}

export default NoteGenerator; 