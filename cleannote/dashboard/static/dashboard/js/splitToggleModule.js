export function initializeSplitToggle() {
    // DOM elements for split bar and toggle functionality
    const toggleYoutubeBtn = document.getElementById('toggle-youtube');
    const youtubeContainer = document.querySelector('.youtube-container');
    const noteContainer = document.querySelector('.note-container');
    const splitBar = document.querySelector('.split-bar');

    // Debug DOM elements
    if (!toggleYoutubeBtn) console.error('Toggle YouTube button not found');
    if (!youtubeContainer) console.error('YouTube container not found');
    if (!noteContainer) console.error('Note container not found');
    if (!splitBar) console.error('Split bar not found');

    // Toggle YouTube player visibility
    toggleYoutubeBtn.addEventListener('click', () => {
        console.log('Toggle YouTube button clicked');
        youtubeContainer.classList.toggle('hidden');
        splitBar.classList.toggle('hidden');
        if (youtubeContainer.classList.contains('hidden')) {
            noteContainer.classList.remove('flex-1');
            noteContainer.classList.add('flex-[2]');
            toggleYoutubeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
            `;
        } else {
            noteContainer.classList.remove('flex-[2]');
            noteContainer.classList.add('flex-1');
            toggleYoutubeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            `;
        }
    });

    // Split bar resizing
    let isDragging = false;

    splitBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const container = document.querySelector('.flex.w-full');
        const containerRect = container.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth >= 30 && newWidth <= 70) {
            youtubeContainer.style.flex = `${newWidth}%`;
            noteContainer.style.flex = `${100 - newWidth}%`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.cursor = 'default';
    });
}