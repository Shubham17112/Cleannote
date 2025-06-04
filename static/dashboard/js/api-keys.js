// API Key Management functionality
class APIKeyManager {
    constructor() {
        this.apiKeyModal = document.getElementById('api-key-modal');
        this.manageApiKeysBtn = document.getElementById('manage-api-keys');
        this.addApiKeyBtn = document.getElementById('add-api-key');
        this.saveApiKeysBtn = document.getElementById('save-api-keys');
        this.cancelApiKeysBtn = document.getElementById('cancel-api-keys');
        this.apiKeysContainer = document.getElementById('api-keys-container');
        this.aiModelSelect = document.getElementById('ai-model');
        this.selectedModelName = document.getElementById('selected-model-name');

        // Get CSRF token
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        this.initializeEventListeners();
    }

    async loadAPIKeys() {
        const selectedModelId = this.aiModelSelect.value;
        const selectedModelText = this.aiModelSelect.options[this.aiModelSelect.selectedIndex].text;
        
        try {
            const response = await fetch(`/dashboard/get_api_keys?ai_model=${selectedModelId}`, {
                method: 'GET',
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

            this.apiKeysContainer.innerHTML = '';
            this.selectedModelName.textContent = selectedModelText;
            
            if (data.api_keys && data.api_keys.length > 0) {
                data.api_keys.forEach(key => this.addApiKeyInput(key));
            } else {
                this.addApiKeyInput();
            }
            
            this.apiKeyModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading API keys:', error);
            this.showError('Failed to load API keys');
        }
    }

    addApiKeyInput(value = '') {
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-2 mb-2';
        div.innerHTML = `
            <input type="text" class="api-key-input flex-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" value="${value}" placeholder="Enter API key">
            <button type="button" class="remove-api-key inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                Remove
            </button>
        `;
        this.apiKeysContainer.appendChild(div);
        
        div.querySelector('.remove-api-key').addEventListener('click', () => {
            if (this.apiKeysContainer.children.length > 1) {
                div.remove();
            }
        });
    }

    async saveAPIKeys() {
        const apiKeys = Array.from(document.querySelectorAll('.api-key-input'))
            .map(input => input.value.trim())
            .filter(key => key !== '');
        
        const formData = new FormData();
        formData.append('ai_model', this.aiModelSelect.value);
        formData.append('api_keys', JSON.stringify(apiKeys));
        formData.append('csrfmiddlewaretoken', this.csrfToken);
        
        try {
            const response = await fetch('/dashboard/save_api_keys', {
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
                throw new Error(data.error || 'Failed to save API keys');
            }
            
            this.apiKeyModal.classList.add('hidden');
            alert('API keys saved successfully');
        } catch (error) {
            console.error('Error saving API keys:', error);
            this.showError(error.message);
        }
    }

    showError(message) {
        // You can implement your error handling here
        console.error(message);
    }

    initializeEventListeners() {
        this.manageApiKeysBtn.addEventListener('click', () => this.loadAPIKeys());
        this.addApiKeyBtn.addEventListener('click', () => this.addApiKeyInput());
        this.saveApiKeysBtn.addEventListener('click', () => this.saveAPIKeys());
        this.cancelApiKeysBtn.addEventListener('click', () => {
            this.apiKeyModal.classList.add('hidden');
        });
    }
}

export default APIKeyManager; 