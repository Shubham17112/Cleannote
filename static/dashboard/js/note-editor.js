// Note editing functionality
class NoteEditor {
    constructor() {
        this.editButton = document.getElementById('edit-note-btn');
        this.saveButton = document.getElementById('save-note-btn');
        this.noteContent = document.getElementById('note-content');
        this.isEditing = false;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Toggle edit mode when edit button is clicked
        this.editButton.addEventListener('click', () => this.toggleEditMode());
        
        // Save changes when save button is clicked
        this.saveButton.addEventListener('click', () => this.saveChanges());
        
        // Handle keyboard shortcuts
        this.noteContent.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.isEditing) {
                    this.saveChanges();
                }
            }
            
            // Escape to cancel editing
            if (e.key === 'Escape' && this.isEditing) {
                this.cancelEditing();
            }
        });
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        
        // Toggle contenteditable
        this.noteContent.contentEditable = this.isEditing;
        
        // Toggle button visibility
        this.editButton.classList.toggle('hidden');
        this.saveButton.classList.toggle('hidden');
        
        // Add/remove editing class for styling
        this.noteContent.classList.toggle('editing');
        
        if (this.isEditing) {
            // Store original content in case we need to cancel
            this.originalContent = this.noteContent.innerHTML;
            
            // Focus the content area
            this.noteContent.focus();
            
            // Add editing styles
            this.noteContent.style.backgroundColor = '#f9fafb';
            this.noteContent.style.padding = '1rem';
            this.noteContent.style.border = '1px solid #e5e7eb';
            this.noteContent.style.borderRadius = '0.375rem';
            this.noteContent.style.outline = 'none';
        } else {
            // Remove editing styles
            this.noteContent.style.backgroundColor = '';
            this.noteContent.style.padding = '';
            this.noteContent.style.border = '';
            this.noteContent.style.borderRadius = '';
        }
    }

    async saveChanges() {
        try {
            // Here you would typically send the changes to your backend
            // For now, we'll just toggle edit mode off
            const content = this.noteContent.innerHTML;
            
            // Add loading state to save button
            this.saveButton.disabled = true;
            this.saveButton.innerHTML = `
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            `;
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Exit edit mode
            this.toggleEditMode();
            
            // Show success message
            this.showNotification('Changes saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving changes:', error);
            this.showNotification('Error saving changes. Please try again.', 'error');
        } finally {
            // Reset save button
            this.saveButton.disabled = false;
            this.saveButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
            `;
        }
    }

    cancelEditing() {
        if (this.isEditing && this.originalContent) {
            // Restore original content
            this.noteContent.innerHTML = this.originalContent;
            this.toggleEditMode();
        }
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 left-4 p-4 rounded-md shadow-lg z-50 ${
            type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`;
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const noteEditor = new NoteEditor();
});

export { NoteEditor }; 