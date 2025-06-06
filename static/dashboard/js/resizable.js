// Resizable card panels functionality for YouTube video and notes
class ResizableCards {
    constructor() {
        // Initialize properties
        this.isResizing = false;
        this.currentResizer = null;
        this.startX = 0;
        this.startWidth = 0;
        this.containerWidth = 0;

        // DOM elements
        this.container = document.querySelector('.result-card-container');
        this.youtubeCard = document.getElementById('youtube-card');
        this.notesCard = document.getElementById('notes-card');
        this.maximizeButtons = document.querySelectorAll('.maximize-btn');
        this.minimizeButtons = document.querySelectorAll('.minimize-btn');
        this.closeButtons = document.querySelectorAll('.close-btn');

        // Create overlay for resize operations
        this.createResizeOverlay();

        // Initialize event listeners
        this.initEventListeners();
        
        // Initial setup
        this.handleWindowResize();
    }

    createResizeOverlay() {
        this.resizeOverlay = document.createElement('div');
        this.resizeOverlay.className = 'resize-overlay';
        document.body.appendChild(this.resizeOverlay);
    }

    initEventListeners() {
        // Create vertical resizer for horizontal resizing between cards
        if (this.youtubeCard && this.notesCard) {
            const verticalResizer = document.createElement('div');
            verticalResizer.className = 'vertical-resizer';
            this.youtubeCard.appendChild(verticalResizer);
            
            verticalResizer.addEventListener('mousedown', (e) => this.startResize(e));
            verticalResizer.addEventListener('touchstart', (e) => this.startResize(e), { passive: false });
        }

        // Mouse/touch move and up events for resizing
        document.addEventListener('mousemove', (e) => this.resize(e));
        document.addEventListener('touchmove', (e) => this.resize(e), { passive: false });
        document.addEventListener('mouseup', () => this.stopResize());
        document.addEventListener('touchend', () => this.stopResize());

        // Add event listeners for maximize buttons
        this.maximizeButtons.forEach(button => {
            button.addEventListener('click', (e) => this.maximizeCard(e));
        });

        // Add event listeners for minimize buttons
        this.minimizeButtons.forEach(button => {
            button.addEventListener('click', (e) => this.minimizeCard(e));
        });

        // Add event listeners for close buttons
        this.closeButtons.forEach(button => {
            button.addEventListener('click', (e) => this.closeCard(e));
        });

        // Handle window resize
        window.addEventListener('resize', () => this.handleWindowResize());
    }

    startResize(e) {
        e.preventDefault();
        this.isResizing = true;
        this.currentResizer = e.target;
        
        // Store initial positions
        this.startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        
        // Get container dimensions
        const containerRect = this.container.getBoundingClientRect();
        this.containerWidth = containerRect.width;
        
        // Get initial dimensions
        this.startWidth = this.youtubeCard.getBoundingClientRect().width;
        
        // Show overlay
        this.resizeOverlay.classList.add('active');
        this.currentResizer.classList.add('active');
    }

    resize(e) {
        if (!this.isResizing) return;
        
        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const deltaX = clientX - this.startX;
            
        // Calculate new widths
        const minWidth = 300; // Minimum width for each panel
        const maxWidth = this.containerWidth - minWidth;
        const newWidth = Math.min(Math.max(minWidth, this.startWidth + deltaX), maxWidth);
        
        // Calculate percentages
                const youtubePercent = (newWidth / this.containerWidth) * 100;
                const notesPercent = 100 - youtubePercent;
                
        // Update card widths
        this.youtubeCard.style.flex = `0 0 ${youtubePercent}%`;
        this.notesCard.style.flex = `0 0 ${notesPercent}%`;
    }

    stopResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.resizeOverlay.classList.remove('active');
        
        if (this.currentResizer) {
            this.currentResizer.classList.remove('active');
        }
        
        this.currentResizer = null;
    }

    maximizeCard(e) {
        const card = e.target.closest('.result-card');
        if (card) {
            card.classList.add('card-maximized');
            this.updateCardButtons(card, true);
        }
    }

    minimizeCard(e) {
        const card = e.target.closest('.result-card');
        if (card) {
            card.classList.remove('card-maximized');
            this.updateCardButtons(card, false);
        }
    }

    updateCardButtons(card, isMaximized) {
        const maximizeBtn = card.querySelector('.maximize-btn');
        const minimizeBtn = card.querySelector('.minimize-btn');
        
        if (isMaximized) {
            maximizeBtn?.classList.add('hidden');
            minimizeBtn?.classList.remove('hidden');
        } else {
            maximizeBtn?.classList.remove('hidden');
            minimizeBtn?.classList.add('hidden');
        }
    }

    closeCard(e) {
        const card = e.target.closest('.result-card');
        if (card) {
            card.classList.add('hidden');
        }
    }

    handleWindowResize() {
        // Get container dimensions
        if (this.container) {
            const containerRect = this.container.getBoundingClientRect();
            this.containerWidth = containerRect.width;
        }
        
        // Reset dimensions for mobile view
        if (window.innerWidth < 768) {
            this.youtubeCard.style.flex = '';
            this.notesCard.style.flex = '';
        } else if (!this.youtubeCard.style.flex) {
            // Set default 50-50 split on desktop if no custom width set
            this.youtubeCard.style.flex = '0 0 50%';
            this.notesCard.style.flex = '0 0 50%';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const resizableCards = new ResizableCards();
});