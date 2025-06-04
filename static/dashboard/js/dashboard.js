import SidebarManager from './sidebar.js';
import APIKeyManager from './api-keys.js';
import NoteGenerator from './note-generator.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize all components
        const sidebarManager = new SidebarManager();
        const apiKeyManager = new APIKeyManager();
        const noteGenerator = new NoteGenerator();
    } catch (error) {
        console.error('Error initializing components:', error);
    }
}); 