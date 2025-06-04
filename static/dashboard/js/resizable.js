// Resizable card panels functionality for YouTube video and notes
class ResizableCards {
    constructor() {
        // Initialize properties
        this.isResizing = false;
        this.currentResizer = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.containerWidth = 0;
        this.resizeDirection = '';

        // DOM elements
        this.container = document.querySelector('.result-card-container');
        this.youtubeCard = document.getElementById('youtube-card');
        this.notesCard = document.getElementById('notes-card');
        this.notesContent = document.querySelector('.notes-content');
        this.maximizeButtons = document.querySelectorAll('.maximize-btn');
        this.minimizeButtons = document.querySelectorAll('.minimize-btn');
        this.closeButtons = document.querySelectorAll('.close-btn');

        // Create overlay for resize operations
        this.createResizeOverlay();

        // Initialize event listeners
        this.initializeEventListeners();
        
        // Initial setup
        this.handleWindowResize();
        this.setupLazyLoading();
    }

    createResizeOverlay() {
        this.resizeOverlay = document.createElement('div');
        this.resizeOverlay.className = 'resize-overlay';
        document.body.appendChild(this.resizeOverlay);
    }

    initializeEventListeners() {
        // Create vertical resizer for horizontal resizing between cards
        if (this.youtubeCard && this.notesCard) {
            const verticalResizer = document.createElement('div');
            verticalResizer.className = 'vertical-resizer';
            this.youtubeCard.appendChild(verticalResizer);
            
            verticalResizer.addEventListener('mousedown', (e) => this.startResize(e, 'horizontal'));
            verticalResizer.addEventListener('touchstart', (e) => this.startResize(e, 'horizontal'), { passive: false });
        }

        // Create horizontal resizer for vertical resizing
        if (this.notesCard) {
            const horizontalResizer = document.createElement('div');
            horizontalResizer.className = 'horizontal-resizer';
            this.notesCard.appendChild(horizontalResizer);
            
            horizontalResizer.addEventListener('mousedown', (e) => this.startResize(e, 'vertical'));
            horizontalResizer.addEventListener('touchstart', (e) => this.startResize(e, 'vertical'), { passive: false });
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

    startResize(e, direction) {
        e.preventDefault();
        this.isResizing = true;
        this.resizeDirection = direction;
        this.currentResizer = e.target;
        
        // Store initial positions
        this.startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        this.startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        
        // Get container dimensions
        const containerRect = this.container.getBoundingClientRect();
        this.containerWidth = containerRect.width;
        
        // Get initial dimensions
        if (direction === 'horizontal') {
            this.startWidth = this.youtubeCard.getBoundingClientRect().width;
        } else {
            this.startHeight = this.notesCard.getBoundingClientRect().height;
        }
        
        // Show overlay
        this.resizeOverlay.classList.add('active');
        this.currentResizer.classList.add('active');
    }

    resize(e) {
        if (!this.isResizing) return;
        
        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
        
        if (this.resizeDirection === 'horizontal') {
            this.handleHorizontalResize(clientX);
        } else {
            this.handleVerticalResize(clientY);
        }
    }

    handleHorizontalResize(clientX) {
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

    handleVerticalResize(clientY) {
        const deltaY = clientY - this.startY;
        const newHeight = Math.max(300, this.startHeight + deltaY); // Minimum height of 300px
        
        // Update card height
        this.notesCard.style.height = `${newHeight}px`;
        this.notesContent.style.height = `${newHeight - 52}px`; // Subtract header height
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
            
            // Reset custom height when minimizing
            if (card === this.notesCard) {
                card.style.height = '';
                this.notesContent.style.height = '';
            }
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
            this.notesCard.style.height = '';
            this.notesContent.style.height = '';
        } else if (!this.youtubeCard.style.flex) {
            // Set default 50-50 split on desktop if no custom width set
            this.youtubeCard.style.flex = '0 0 50%';
            this.notesCard.style.flex = '0 0 50%';
        }
    }

    setupLazyLoading() {
        if (!this.notesContent) return;

        // Create intersection observer for lazy loading
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            root: this.notesContent,
            threshold: 0.1
        });

        // Function to chunk content for lazy loading
        const chunkContent = () => {
            const content = this.notesContent.innerHTML;
            const words = content.split(' ');
            const chunkSize = 500; // Words per chunk
            const chunks = [];

            for (let i = 0; i < words.length; i += chunkSize) {
                const chunk = words.slice(i, i + chunkSize).join(' ');
                chunks.push(chunk);
            }

            // Clear content and add chunks
            this.notesContent.innerHTML = '';
            chunks.forEach((chunk, index) => {
                const div = document.createElement('div');
                div.className = 'lazy-content';
                div.innerHTML = chunk;
                this.notesContent.appendChild(div);
                observer.observe(div);

                // Add loading indicator between chunks
                if (index < chunks.length - 1) {
                    const indicator = document.createElement('div');
                    indicator.className = 'load-more-indicator';
                    indicator.textContent = 'Scroll to load more...';
                    this.notesContent.appendChild(indicator);
                }
            });
        };

        // Call chunkContent when new content is added
        const contentObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    chunkContent();
                }
            });
        });

        contentObserver.observe(this.notesContent, { childList: true });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const resizableCards = new ResizableCards();
});

export { ResizableCards };