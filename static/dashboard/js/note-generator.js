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
        this.createQuizCheckbox = document.getElementById('create-quiz');
        this.includeTimestampsCheckbox = document.getElementById('include-timestamps');
        this.enhanceTranscriptCheckbox = document.getElementById('enhance-transcript');

        // Get CSRF token
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        // Add state for notes
        this.originalNote = '';
        this.translatedNote = '';
        this.currentLanguage = 'original';

        this.initializeEventListeners();
    }

    async generateNote() {
        const youtubeUrl = this.youtubeUrlInput.value.trim();
        if (!youtubeUrl) {
            this.showError('Please enter a YouTube URL');
            return;
        }
        
        // Hide any previous error
        this.errorSection.classList.add('hidden');
        
        // Show loading state
        this.loadingSection.classList.remove('hidden');
        this.resultSection.classList.add('hidden');
        
        const formData = new FormData();
        formData.append('youtube_url', youtubeUrl);
        formData.append('ai_model', this.aiModelSelect.value);
        formData.append('include_timestamps', this.includeTimestampsCheckbox.checked);
        formData.append('create_quiz', this.createQuizCheckbox.checked);
        formData.append('enhance_transcript', this.enhanceTranscriptCheckbox.checked);
        
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
            
            // Store original note
            this.originalNote = data.note_content || '';
            this.translatedNote = ''; // Reset translated note
            
            // Show result based on current language
            if (this.generateNoteCheckbox.checked) {
                this.updateNoteContent();
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

    updateNoteContent() {
        if (!this.originalNote && !this.translatedNote) {
            this.noteContent.innerHTML = '<p class="text-gray-500 italic">Generated notes will appear here...</p>';
            return;
        }

        if (this.currentLanguage === 'original') {
            this.noteContent.innerHTML = this.originalNote;
        } else if (this.currentLanguage === 'english') {
            if (this.translatedNote) {
                this.noteContent.innerHTML = this.translatedNote;
            } else {
                // Initiate translation if we don't have the English version
                this.translateNote();
            }
        }
    }

    async translateNote() {
        if (!this.originalNote) {
            console.error('No original text to translate');
            this.showTranslationError('No text available for translation');
            return;
        }

        // Show loading state with progress indicator
        this.noteContent.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 space-y-4">
                <div class="w-full max-w-md bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div class="bg-indigo-600 h-2.5 rounded-full w-0 transition-all duration-300" id="translation-progress"></div>
                </div>
                <p class="text-gray-600" id="translation-status">Preparing translation...</p>
            </div>`;

        const progressBar = document.getElementById('translation-progress');
        const statusText = document.getElementById('translation-status');

        try {
            // Start translation
            statusText.textContent = 'Processing transcript...';
            progressBar.style.width = '20%';

            // First process the audio transcript
            const formData = new FormData();
            formData.append('transcript', this.originalNote);

            const audioResponse = await fetch('/dashboard/playback/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                }
            });

            progressBar.style.width = '50%';
            statusText.textContent = 'Generating translation...';

            if (!audioResponse.ok) {
                const errorData = await audioResponse.json();
                throw new Error(errorData.error || 'Failed to process audio');
            }

            const data = await audioResponse.json();

            if (!data.success) {
                throw new Error(data.error || 'Translation process failed');
            }

            progressBar.style.width = '80%';
            statusText.textContent = 'Finalizing...';

            // Store the translated text
            this.translatedNote = data.translated_text;
            
            // Update the display
            setTimeout(() => {
                progressBar.style.width = '100%';
                this.noteContent.innerHTML = this.translatedNote;

                // Update audio sources if available
                const audioPlayer = document.querySelector('audio');
                if (audioPlayer) {
                    const audioSource = audioPlayer.querySelector('source');
                    if (audioSource) {
                        audioSource.src = this.currentLanguage === 'original' 
                            ? '/media/audio/original.mp3' 
                            : '/media/audio/translated.mp3';
                        audioPlayer.load();
                    }
                }
                
                // Show success message
                const successIndicator = document.createElement('div');
                successIndicator.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg transition-opacity duration-500 flex items-center space-x-2';
                successIndicator.innerHTML = `
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Translation completed</span>
                `;
                document.body.appendChild(successIndicator);
                
                setTimeout(() => {
                    successIndicator.style.opacity = '0';
                    setTimeout(() => successIndicator.remove(), 500);
                }, 2000);
            }, 500);

        } catch (error) {
            console.error('Translation error:', error);
            this.showTranslationError(error.message);
        }
    }

    showTranslationError(message) {
        this.noteContent.innerHTML = `
            <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">Translation Failed</h3>
                        <div class="mt-2 text-sm text-red-700">
                            ${message}
                        </div>
                        <div class="mt-4 flex space-x-4">
                            <button type="button" 
                                onclick="this.closest('.bg-red-50').remove(); document.getElementById('lang-english').click();"
                                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                Retry Translation
                            </button>
                            <button type="button" 
                                onclick="this.closest('.bg-red-50').remove(); document.getElementById('lang-hindi').click();"
                                class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Back to Original
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
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

        // Add language toggle listeners with improved feedback
        const langOriginalBtn = document.getElementById('lang-hindi');
        const langEnglishBtn = document.getElementById('lang-english');

        if (langOriginalBtn && langEnglishBtn) {
            const updateLanguageButtons = (activeBtn, inactiveBtn) => {
                // Update button states
                activeBtn.classList.add('active', 'bg-indigo-600', 'text-white');
                activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
                inactiveBtn.classList.remove('active', 'bg-indigo-600', 'text-white');
                inactiveBtn.classList.add('bg-gray-100', 'text-gray-700');
                
                // Disable both buttons during translation
                activeBtn.disabled = true;
                inactiveBtn.disabled = true;
                
                // Re-enable after a short delay
                setTimeout(() => {
                    activeBtn.disabled = false;
                    inactiveBtn.disabled = false;
                }, 1000);
            };

            langOriginalBtn.addEventListener('click', async () => {
                if (this.currentLanguage !== 'original') {
                    this.currentLanguage = 'original';
                    updateLanguageButtons(langOriginalBtn, langEnglishBtn);
                    this.updateNoteContent();
                }
            });

            langEnglishBtn.addEventListener('click', async () => {
                if (this.currentLanguage !== 'english') {
                    this.currentLanguage = 'english';
                    updateLanguageButtons(langEnglishBtn, langOriginalBtn);
                    this.updateNoteContent();
                }
            });
        }
    }
}

export default NoteGenerator; 