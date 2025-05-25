document.addEventListener('DOMContentLoaded', () => {
    // YouTube player
    let player;
    let currentVideoId = '';
    
    function onYouTubeIframeAPIReady() {
        // Player will be initialized when a video is loaded
    }
    
    function loadYouTubeVideo(videoId) {
        if (player && currentVideoId === videoId) {
            return;
        }
        
        currentVideoId = videoId;
        
        if (player) {
            player.loadVideoById(videoId);
        } else {
            player = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1
                }
            });
        }
    }
    
    // Extract YouTube video ID from URL
    function extractVideoId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : false;
    }
    
    // DOM elements
    const youtubeUrlInput = document.getElementById('youtube-url');
    const generateBtn = document.getElementById('generate-btn');
    const resultSection = document.getElementById('result-section');
    const loadingSection = document.getElementById('loading-section');
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    const noteContent = document.getElementById('note-content');
    const transcriptSection = document.getElementById('transcript-section');
    const transcriptContent = document.getElementById('transcript-content');
    const tokensRemaining = document.getElementById('tokens-remaining');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const downloadNoteBtn = document.getElementById('download-note-btn');
    const fullscreenNoteBtn = document.getElementById('fullscreen-note-btn');
    const fullscreenModal = document.getElementById('fullscreen-modal');
    const modalContent = document.getElementById('modal-content');
    const closeModal = document.getElementById('close-modal');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebar = document.querySelector('.sidebar');
    const aiModelSelect = document.getElementById('ai-model');
    const manageApiKeysBtn = document.getElementById('manage-api-keys');
    const apiKeyModal = document.getElementById('api-key-modal');
    const addApiKeyBtn = document.getElementById('add-api-key');
    const saveApiKeysBtn = document.getElementById('save-api-keys');
    const cancelApiKeysBtn = document.getElementById('cancel-api-keys');
    const apiKeysContainer = document.getElementById('api-keys-container');
    const enhanceTranscriptCheckbox = document.getElementById('enhance-transcript');
    const selectedModelName = document.getElementById('selected-model-name');

    // Debug DOM elements
    if (!manageApiKeysBtn) console.error('Manage API Keys button not found');
    if (!apiKeyModal) console.error('API Key Modal not found');
    if (!saveApiKeysBtn) console.error('Save API Keys button not found');
    if (!aiModelSelect) console.error('AI Model Select not found');

    // Sidebar toggle (mobile)
    sidebarToggle.addEventListener('click', () => {
        console.log('Sidebar toggle clicked');
        sidebar.classList.remove('sidebar-closed');
        sidebar.classList.add('sidebar-open');
    });
    
    sidebarClose.addEventListener('click', () => {
        console.log('Sidebar close clicked');
        sidebar.classList.remove('sidebar-open');
        sidebar.classList.add('sidebar-closed');
    });
    
    // API Key Management
    manageApiKeysBtn.addEventListener('click', async () => {
        console.log('Manage API Keys button clicked');
        const selectedModelId = aiModelSelect.value;
        const selectedModelText = aiModelSelect.options[aiModelSelect.selectedIndex].text;
        
        try {
            const response = await fetch(`{% url "dashboard:get_api_keys" %}?ai_model=${selectedModelId}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const data = await response.json();
            apiKeysContainer.innerHTML = '';
            selectedModelName.textContent = selectedModelText;
            
            if (data.api_keys && data.api_keys.length > 0) {
                data.api_keys.forEach(key => addApiKeyInput(key));
            } else {
                addApiKeyInput();
            }
            
            apiKeyModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading API keys:', error);
            showError('Failed to load API keys');
        }
    });
    
    function addApiKeyInput(value = '') {
        console.log('Adding API key input with value:', value);
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-2 mb-2';
        div.innerHTML = `
            <input type="text" class="api-key-input flex-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" value="${value}" placeholder="Enter API key">
            <button type="button" class="remove-api-key inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                Remove
            </button>
        `;
        apiKeysContainer.appendChild(div);
        
        div.querySelector('.remove-api-key').addEventListener('click', () => {
            if (apiKeysContainer.children.length > 1) {
                div.remove();
            }
        });
    }
    
    addApiKeyBtn.addEventListener('click', () => {
        console.log('Add API Key button clicked');
        addApiKeyInput();
    });
    
    saveApiKeysBtn.addEventListener('click', async () => {
        console.log('Save API Keys button clicked');
        const apiKeys = Array.from(document.querySelectorAll('.api-key-input'))
            .map(input => input.value.trim())
            .filter(key => key !== '');
        
        const formData = new FormData();
        formData.append('ai_model', aiModelSelect.value);
        formData.append('api_keys', JSON.stringify(apiKeys));
        formData.append('csrfmiddlewaretoken', '{{ csrf_token }}');
        
        try {
            const response = await fetch('{% url "dashboard:save_api_keys" %}', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save API keys');
            }
            
            apiKeyModal.classList.add('hidden');
            alert('API keys saved successfully');
        } catch (error) {
            console.error('Error saving API keys:', error);
            showError(error.message);
        }
    });
    
    cancelApiKeysBtn.addEventListener('click', () => {
        console.log('Cancel API Keys button clicked');
        apiKeyModal.classList.add('hidden');
    });
    
    // Generate note
    generateBtn.addEventListener('click', async () => {
        console.log('Generate button clicked');
        const youtubeUrl = youtubeUrlInput.value.trim();
        if (!youtubeUrl) {
            showError('Please enter a YouTube URL');
            return;
        }
        
        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            showError('Invalid YouTube URL');
            return;
        }
        
        // Show loading
        resultSection.classList.add('hidden');
        errorSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        
        // Get form data
        const formData = new FormData();
        formData.append('youtube_url', youtubeUrl);
        formData.append('ai_model', aiModelSelect.value);
        formData.append('include_timestamps', document.getElementById('include-timestamps').checked);
        formData.append('create_quiz', document.getElementById('create-quiz').checked);
        formData.append('enhance_transcript', enhanceTranscriptCheckbox.checked);
        formData.append('csrfmiddlewaretoken', '{{ csrf_token }}');
        
        try {
            const response = await fetch('{% url "dashboard:generate_note" %}', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate note');
            }
            
            // Update tokens remaining
            tokensRemaining.textContent = data.tokens_remaining;
            
            // Show result
            noteContent.innerHTML = data.note_content;
            if (data.transcript && enhanceTranscriptCheckbox.checked) {
                transcriptContent.innerHTML = data.transcript;
                transcriptSection.classList.remove('hidden');
            } else {
                transcriptSection.classList.add('hidden');
            }
            loadYouTubeVideo(data.video_id);
            
            loadingSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            
            // Save note ID for save button
            saveNoteBtn.dataset.noteId = data.note_id;
        } catch (error) {
            console.error('Error generating note:', error);
            loadingSection.classList.add('hidden');
            showError(error.message);
        }
    });
    
    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorSection.classList.remove('hidden');
    }
    
    // Fullscreen note
    fullscreenNoteBtn.addEventListener('click', () => {
        console.log('Fullscreen button clicked');
        modalContent.innerHTML = noteContent.innerHTML;
        fullscreenModal.classList.remove('hidden');
    });
    
    // Close modal
    closeModal.addEventListener('click', () => {
        console.log('Close modal button clicked');
        fullscreenModal.classList.add('hidden');
    });
    
    // Download note
    downloadNoteBtn.addEventListener('click', () => {
        console.log('Download button clicked');
        const content = noteContent.innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cleannote.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});