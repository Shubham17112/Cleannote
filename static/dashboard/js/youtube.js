// YouTube player functionality
let mainPlayer = null;
let previewPlayer = null;
let currentVideoId = '';
let isAPIReady = false;

// Load YouTube IFrame API
function loadYouTubeAPI() {
    if (window.YT) {
        // API already loaded
        isAPIReady = true;
        initializePlayers();
        return;
    }

    // Create YouTube API script
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Define the callback for when API is ready
    window.onYouTubeIframeAPIReady = function() {
        isAPIReady = true;
        initializePlayers();
    };
}

function initializePlayers() {
    // Initialize preview player
    const previewContainer = document.getElementById('youtube-preview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewPlayer = createPlayer('youtube-preview', true);
    }

    // Initialize main player
    const mainContainer = document.getElementById('youtube-player');
    if (mainContainer) {
        mainContainer.innerHTML = '';
        mainPlayer = createPlayer('youtube-player', false);
    }
}

function createPlayer(containerId, isPreview) {
    return new YT.Player(containerId, {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'enablejsapi': 1,
            'origin': window.location.origin,
            'autoplay': 0,
            'rel': 0,
            'modestbranding': 1,
            'controls': isPreview ? 0 : 1, // No controls for preview
            'showinfo': isPreview ? 0 : 1  // No info for preview
        },
        events: {
            'onReady': (event) => onPlayerReady(event, isPreview),
            'onStateChange': (event) => onPlayerStateChange(event, isPreview),
            'onError': (event) => onPlayerError(event, isPreview)
        }
    });
}

function onPlayerReady(event, isPreview) {
    console.log(`YouTube ${isPreview ? 'preview' : 'main'} player is ready`);
    // If we have a pending video ID, load it
    if (currentVideoId) {
        loadVideoInPlayer(isPreview ? previewPlayer : mainPlayer, currentVideoId, isPreview);
    }
}

function onPlayerStateChange(event, isPreview) {
    // -1 (unstarted)
    // 0 (ended)
    // 1 (playing)
    // 2 (paused)
    // 3 (buffering)
    // 5 (video cued)
    console.log(`Player ${isPreview ? 'preview' : 'main'} state changed:`, event.data);
    
    // For preview player, pause when video starts playing
    if (isPreview && event.data === YT.PlayerState.PLAYING) {
        event.target.pauseVideo();
    }
}

function onPlayerError(event, isPreview) {
    console.error(`YouTube ${isPreview ? 'preview' : 'main'} player error:`, event.data);
    // Handle specific error codes
    switch (event.data) {
        case 2:
            console.error('Invalid video ID');
            break;
        case 5:
            console.error('HTML5 player error');
            break;
        case 100:
            console.error('Video not found or removed');
            break;
        case 101:
        case 150:
            console.error('Video playback not allowed');
            break;
    }
}

function loadYouTubeVideo(videoId) {
    if (!videoId) {
        console.error('No video ID provided');
        return;
    }
    
    // Store the video ID
    currentVideoId = videoId;
    
    // If API is not ready yet, wait for it
    if (!isAPIReady) {
        loadYouTubeAPI();
        return;
    }

    // Load video in both players
    loadVideoInPlayer(previewPlayer, videoId, true);
    loadVideoInPlayer(mainPlayer, videoId, false);
}

function loadVideoInPlayer(player, videoId, isPreview) {
    if (!player) {
        console.error(`${isPreview ? 'Preview' : 'Main'} player not initialized`);
        return;
    }

    try {
        if (player.loadVideoById) {
            const config = {
                videoId: videoId,
                startSeconds: 0,
                suggestedQuality: isPreview ? 'medium' : 'large'
            };
            
            if (isPreview) {
                // For preview, use cueVideoById to prevent autoplay
                player.cueVideoById(config);
    } else {
                player.loadVideoById(config);
            }
        } else {
            console.error(`${isPreview ? 'Preview' : 'Main'} player not properly initialized`);
            initializePlayers();
        }
    } catch (error) {
        console.error(`Error loading video in ${isPreview ? 'preview' : 'main'} player:`, error);
        initializePlayers();
    }
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
    if (!url) return false;
    
    // Handle both youtu.be and youtube.com URLs
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
        return match[2];
    }
    
    // Handle shortened URLs
    const shortMatch = url.match(/^.*youtu\.be\/([^#&?]*).*/);
    if (shortMatch && shortMatch[1].length === 11) {
        return shortMatch[1];
    }
    
    return false;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadYouTubeAPI);

// Export functions for external use
export { loadYouTubeVideo, extractVideoId }; 