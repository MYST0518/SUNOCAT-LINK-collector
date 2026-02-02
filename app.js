// ===================================
// SUNO Playlist Player - App Logic (Enhanced)
// ===================================

// ===================================
//    Internationalization Manager
// ===================================
class I18nManager {
    constructor() {
        this.LANG_KEY = 'suno_language';
        this.translations = window.translations || {}; // Access from window object
        this.currentLang = this.detectLanguage(); // Then detect language
    }

    // Detect user's language
    detectLanguage() {
        // Priority: LocalStorage > Browser Language > Default (ja)
        const stored = localStorage.getItem(this.LANG_KEY);
        if (stored && this.translations[stored]) {
            return stored;
        }

        // Browser language detection
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0]; // en-US -> en

        // Map to supported languages
        const supported = ['ja', 'en', 'zh', 'ko'];
        if (supported.includes(langCode)) {
            return langCode;
        }

        // Default to Japanese
        return 'ja';
    }

    // Get translation
    t(key) {
        const lang = this.translations[this.currentLang];
        return lang && lang[key] ? lang[key] : key;
    }

    // Set language
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.error(`Language ${lang} not supported`);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem(this.LANG_KEY, lang);
        this.updateDOM();
    }

    // Update all DOM elements with data-i18n attribute
    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            // Update element text
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }

            // Also update title attribute if it exists
            if (element.hasAttribute('title')) {
                element.setAttribute('title', translation);
            }
        });

        // Update document title
        document.title = this.t('appName');

        // Dispatch event for custom updates
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { lang: this.currentLang }
        }));
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLang;
    }
}

// ===================================
//    Theme Manager
// ===================================
class ThemeManager {
    constructor() {
        this.THEME_KEY = 'suno_theme';
        this.currentTheme = this.detectTheme();

        // Icon mapping for different themes
        this.icons = {
            default: {
                logo: '🐈‍⬛',
                play: '🐾',
                pause: '⏸',
                shuffle: '🔀',
                previous: '⏮',
                next: '⏭',
                repeat: '🔁',
                repeatOne: '🔂',
                volume: '🔊',
                mute: '🔇'
            },
            tabby: {
                logo: '🐈',
                play: '🐾',
                pause: '😼',
                shuffle: '🐈',
                previous: '⏮',
                next: '⏭',
                repeat: '🔄',
                repeatOne: '🐱',
                volume: '😺',
                mute: '😿'
            },
            sakura: {
                logo: '🌸',
                play: '🐾',
                pause: '😽',
                shuffle: '🐈',
                previous: '⏮',
                next: '⏭',
                repeat: '🔄',
                repeatOne: '🤍',
                volume: '😺',
                mute: '😿'
            }
        };
    }

    // Detect user's theme preference
    detectTheme() {
        // Priority: LocalStorage > Default (default)
        const stored = localStorage.getItem(this.THEME_KEY);
        if (stored && (stored === 'default' || stored === 'tabby' || stored === 'sakura')) {
            return stored;
        }
        return 'default';
    }

    // Set theme
    setTheme(theme) {
        if (theme !== 'default' && theme !== 'tabby' && theme !== 'sakura') {
            console.error(`Theme ${theme} not supported`);
            return;
        }

        this.currentTheme = theme;
        localStorage.setItem(this.THEME_KEY, theme);
        this.applyTheme();
    }

    // Apply theme to DOM
    applyTheme() {
        const html = document.documentElement;

        if (this.currentTheme && this.currentTheme !== 'default') {
            html.setAttribute('data-theme', this.currentTheme);
        } else {
            html.removeAttribute('data-theme');
        }

        // Update theme-specific icons
        this.updateThemeIcons();

        // Dispatch event for custom updates
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme }
        }));
    }

    // Get icon based on current theme
    getIcon(name) {
        const themeIcons = this.icons[this.currentTheme] || this.icons.default;
        return themeIcons[name] || this.icons.default[name];
    }

    // Update icons based on theme
    updateThemeIcons() {
        // Update logo
        const logoIcon = document.querySelector('.logo-icon');
        if (logoIcon) logoIcon.textContent = this.getIcon('logo');

        // Update control buttons (that aren't dynamically changed by state)
        const prevBtn = document.querySelector('#prevBtn span');
        if (prevBtn) prevBtn.textContent = this.getIcon('previous');

        const nextBtn = document.querySelector('#nextBtn span');
        if (nextBtn) nextBtn.textContent = this.getIcon('next');

        // Note: Play/Pause/Shuffle/Repeat are managed by SUNOPlaylist class
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Initialize theme on page load
    init() {
        this.applyTheme();
    }
}


// Playlist Storage Manager
class PlaylistStorage {
    constructor() {
        this.STORAGE_KEY = 'suno_playlists';
        this.FAVORITES_KEY = 'suno_favorites';
        this.CURRENT_KEY = 'suno_current';
        this.LIKED_TRACKS_KEY = 'suno_liked_tracks';
        this.MAX_RECENT = 10;
    }

    // Get all recent playlists
    getRecentPlaylists() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading recent playlists:', error);
            return [];
        }
    }

    // Save playlist to recent
    savePlaylist(playlist) {
        if (playlist.length === 0) return null;

        try {
            const recent = this.getRecentPlaylists();

            // Create playlist object
            const playlistObj = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                trackCount: playlist.length,
                tracks: playlist.map(t => ({
                    uuid: t.uuid,
                    title: t.title,
                    artist: t.artist
                })),
                firstTrack: playlist[0].title
            };

            // Remove duplicates (same track order)
            const uuids = JSON.stringify(playlistObj.tracks.map(t => t.uuid));
            const filtered = recent.filter(p =>
                JSON.stringify(p.tracks.map(t => t.uuid)) !== uuids
            );

            // Add to beginning
            filtered.unshift(playlistObj);

            // Keep only MAX_RECENT
            const trimmed = filtered.slice(0, this.MAX_RECENT);

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));

            return playlistObj.id;
        } catch (error) {
            console.error('Error saving playlist:', error);
            return null;
        }
    }

    // Save current playlist
    saveCurrent(playlist) {
        if (playlist.length === 0) return;

        try {
            const data = {
                timestamp: new Date().toISOString(),
                tracks: playlist.map(t => ({
                    uuid: t.uuid,
                    title: t.title,
                    artist: t.artist
                }))
            };
            localStorage.setItem(this.CURRENT_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving current playlist:', error);
        }
    }

    // Get current playlist
    getCurrent() {
        try {
            const data = localStorage.getItem(this.CURRENT_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading current playlist:', error);
            return null;
        }
    }

    // Get favorites
    getFavorites() {
        try {
            const data = localStorage.getItem(this.FAVORITES_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading favorites:', error);
            return [];
        }
    }

    // Toggle favorite
    toggleFavorite(playlistId) {
        try {
            const favorites = this.getFavorites();
            const recent = this.getRecentPlaylists();
            const playlist = recent.find(p => p.id === playlistId);

            if (!playlist) return false;

            const index = favorites.findIndex(f => f.id === playlistId);

            if (index >= 0) {
                // Remove from favorites
                favorites.splice(index, 1);
            } else {
                // Add to favorites
                favorites.push({ ...playlist, favorited: true });
            }

            localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
            return index < 0; // Return true if added
        } catch (error) {
            console.error('Error toggling favorite:', error);
            return false;
        }
    }

    // Check if favorited
    isFavorite(playlistId) {
        const favorites = this.getFavorites();
        return favorites.some(f => f.id === playlistId);
    }

    // Delete playlist from recent
    deletePlaylist(playlistId) {
        try {
            const recent = this.getRecentPlaylists();
            const filtered = recent.filter(p => p.id !== playlistId);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));

            // Also remove from favorites if exists
            const favorites = this.getFavorites();
            const filteredFavs = favorites.filter(f => f.id !== playlistId);
            localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(filteredFavs));

            return true;
        } catch (error) {
            console.error('Error deleting playlist:', error);
            return false;
        }
    }

    // Clear all
    clearAll() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.FAVORITES_KEY);
            localStorage.removeItem(this.CURRENT_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    // Liked tracks (individual)
    getLikedTracks() {
        try {
            const liked = localStorage.getItem(this.LIKED_TRACKS_KEY);
            return liked ? JSON.parse(liked) : [];
        } catch (e) {
            return [];
        }
    }

    toggleTrackLike(uuid) {
        try {
            const liked = this.getLikedTracks();
            const index = liked.indexOf(uuid);
            if (index >= 0) {
                liked.splice(index, 1);
            } else {
                liked.push(uuid);
            }
            localStorage.setItem(this.LIKED_TRACKS_KEY, JSON.stringify(liked));
            return index < 0;
        } catch (e) {
            return false;
        }
    }

    isTrackLiked(uuid) {
        return this.getLikedTracks().includes(uuid);
    }
}

class SUNOPlaylist {
    constructor() {
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;

        // DOM Elements
        this.elements = {
            linksInput: document.getElementById('linksInput'),
            loadBtn: document.getElementById('loadBtn'),
            toggleInputBtn: document.getElementById('toggleInputBtn'),
            inputContent: document.getElementById('inputContent'),
            shareBtn: document.getElementById('shareBtn'),
            shareDropdown: document.getElementById('shareDropdown'),
            shareTwitter: document.getElementById('shareTwitter'),
            shareLine: document.getElementById('shareLine'),
            shareFacebook: document.getElementById('shareFacebook'),
            shareCopy: document.getElementById('shareCopy'),
            audioPlayer: document.getElementById('audioPlayer'),
            playBtn: document.getElementById('playBtn'),
            playIcon: document.getElementById('playIcon'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            shuffleBtn: document.getElementById('shuffleBtn'),
            shuffleIcon: document.getElementById('shuffleIcon'),
            seekBackBtn: document.getElementById('seekBackBtn'),
            seekForwardBtn: document.getElementById('seekForwardBtn'),
            repeatBtn: document.getElementById('repeatBtn'),
            repeatIcon: document.getElementById('repeatIcon'),
            clearBtn: document.getElementById('clearBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile'),
            downloadBtn: document.getElementById('downloadBtn'),
            progressBar: document.getElementById('progressBar'),
            progress: document.getElementById('progress'),
            currentTime: document.getElementById('currentTime'),
            duration: document.getElementById('duration'),
            volumeSlider: document.getElementById('volumeSlider'),
            trackTitle: document.getElementById('trackTitle'),
            trackArtist: document.getElementById('trackArtist'),
            playlistContainer: document.getElementById('playlist'),
            trackCount: document.getElementById('trackCount'),
            toast: document.getElementById('toast'),
            loadingProgress: document.getElementById('loadingProgress'),
            progressText: document.getElementById('progressText'),
            progressBarFill: document.getElementById('progressBarFill'),
            offlineBanner: document.getElementById('offlineBanner'),
            helpBtn: document.getElementById('helpBtn'),
            helpModal: document.getElementById('helpModal'),
            closeHelpBtn: document.getElementById('closeHelpBtn'),
            historyBtn: document.getElementById('historyBtn'),
            historyModal: document.getElementById('historyModal'),
            historyList: document.getElementById('historyList'),
            closeHistoryBtn: document.getElementById('closeHistoryBtn'),
            openSunoBtn: document.getElementById('openSunoBtn'),
            donateBtn: document.getElementById('donateBtn'),
            helpDonateBtn: document.getElementById('helpDonateBtn'),
            donateModal: document.getElementById('donateModal'),
            closeDonateBtn: document.getElementById('closeDonateBtn'),
            bmacLink: document.getElementById('bmacLink'),
            wishlistLink: document.getElementById('wishlistLink')
        };

        // Loading state
        this.loadingStates = new Map();

        // Error tracking
        this.isOffline = !navigator.onLine;

        // Playback modes
        this.shuffleMode = false;
        this.repeatMode = 'none'; // 'none', 'all', 'one'
        this.originalPlaylist = [];

        // Storage
        this.storage = new PlaylistStorage();

        // Drag and drop state
        this.draggedIndex = null;

        this.init();
    }

    init() {
        // Event Listeners
        this.elements.loadBtn.addEventListener('click', () => this.loadPlaylist());
        this.elements.toggleInputBtn?.addEventListener('click', () => this.toggleInputSection());
        this.elements.shareBtn?.addEventListener('click', () => this.toggleShareDropdown());
        this.elements.shareTwitter?.addEventListener('click', () => this.shareToTwitter());
        this.elements.shareLine?.addEventListener('click', () => this.shareToLine());
        this.elements.shareFacebook?.addEventListener('click', () => this.shareToFacebook());
        this.elements.shareCopy?.addEventListener('click', () => this.copyShareUrl());
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevBtn.addEventListener('click', () => this.playPrevious());
        this.elements.nextBtn.addEventListener('click', () => this.playNext());
        this.elements.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.elements.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.elements.seekBackBtn?.addEventListener('click', () => this.seekRelative(-5));
        this.elements.seekForwardBtn?.addEventListener('click', () => this.seekRelative(5));
        this.elements.clearBtn.addEventListener('click', () => this.clearPlaylist());
        this.elements.importBtn.addEventListener('click', () => this.triggerImport());
        this.elements.importFile.addEventListener('change', (e) => this.importPlaylist(e));
        this.elements.downloadBtn.addEventListener('click', () => this.downloadPlaylist());
        this.elements.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.elements.progressBar.addEventListener('click', (e) => this.seek(e));
        this.elements.helpBtn.addEventListener('click', () => this.toggleHelpModal());
        this.elements.closeHelpBtn.addEventListener('click', () => this.toggleHelpModal());
        this.elements.donateBtn?.addEventListener('click', (e) => this.handleDonate(e));
        this.elements.helpDonateBtn?.addEventListener('click', (e) => this.handleDonate(e));

        // Donate modal listeners
        this.elements.closeDonateBtn?.addEventListener('click', () => {
            this.elements.donateModal?.classList.remove('show');
        });
        this.elements.donateModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.donateModal) {
                this.elements.donateModal?.classList.remove('show');
            }
        });
        [this.elements.bmacLink, this.elements.wishlistLink].forEach(link => {
            link?.addEventListener('click', () => {
                setTimeout(() => this.elements.donateModal?.classList.remove('show'), 500);
            });
        });

        // Re-add click listener as fallback/safety for the main link
        this.elements.openSunoBtn?.addEventListener('click', (e) => {
            const href = this.elements.openSunoBtn.getAttribute('href');
            if (!href || href === '#' || href.includes('javascript:')) {
                e.preventDefault();
                this.openInSuno();
            }
        });

        // Help modal tab switching
        document.querySelectorAll('.help-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchHelpTab(tabName);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.share-container')) {
                this.elements.shareDropdown?.classList.remove('show');
            }
        });

        // Close help modal when clicking outside
        this.elements.helpModal.addEventListener('click', (e) => {
            if (e.target === this.elements.helpModal) {
                this.toggleHelpModal();
            }
        });

        // Drag and Drop delegation for playlist
        this.setupDragAndDrop();

        // Audio Events
        this.elements.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.elements.audioPlayer.addEventListener('ended', () => {
            if (this.repeatMode === 'one') {
                this.play();
            } else {
                this.playNext();
            }
        });
        this.elements.audioPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
        this.elements.audioPlayer.addEventListener('error', (e) => this.handleError(e));

        // Listen for theme changes to update icons
        window.addEventListener('themeChanged', () => this.updateControlIcons());

        // Set initial volume
        this.elements.audioPlayer.volume = 0.8;

        // Setup offline detection
        this.setupOfflineDetection();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Check URL for shared playlist
        this.loadFromURL();

        // History button event listeners
        this.elements.historyBtn.addEventListener('click', () => this.toggleHistoryModal());
        this.elements.closeHistoryBtn.addEventListener('click', () => this.toggleHistoryModal());
        this.elements.historyModal.addEventListener('click', (e) => {
            if (e.target === this.elements.historyModal) {
                this.toggleHistoryModal();
            }
        });
    }

    // Setup offline detection
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            const message = window.i18n ? window.i18n.t('onlineMessage') : 'Online';
            this.showToast(message, 'success');
            this.isOffline = false;
            if (this.elements.offlineBanner) {
                this.elements.offlineBanner.classList.remove('show');
            }
        });

        window.addEventListener('offline', () => {
            const message = window.i18n ? window.i18n.t('offlineMessage') : 'Offline';
            this.showToast(message, 'error');
            this.isOffline = true;
            if (this.elements.offlineBanner) {
                this.elements.offlineBanner.classList.add('show');
            }
        });

        // Show banner if offline
        setTimeout(async () => {
            this.isOffline = !navigator.onLine;
            if (this.isOffline && this.elements.offlineBanner) {
                this.elements.offlineBanner.classList.add('show');
            } else if (this.elements.offlineBanner) {
                this.elements.offlineBanner.classList.remove('show');
            }
        }, 3000);
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input field
            if (this.isInputFocused()) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.seekRelative(-5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.seekRelative(5);
                    break;
                case 'KeyN':
                    e.preventDefault();
                    this.playNext();
                    break;
                case 'KeyP':
                    e.preventDefault();
                    this.playPrevious();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMute();
                    break;
            }
        });
    }

    // Check if input field is focused
    isInputFocused() {
        const active = document.activeElement;
        return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    }

    // Setup Drag and Drop event delegation
    setupDragAndDrop() {
        const container = this.elements.playlistContainer;

        container.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.playlist-item');
            if (!item) return;

            this.draggedIndex = parseInt(item.dataset.index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.draggedIndex.toString());

            // UI feedback
            setTimeout(() => {
                item.classList.add('dragging');
                container.classList.add('is-dragging');
            }, 0);
        });

        container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            const item = e.target.closest('.playlist-item');
            if (item && this.draggedIndex !== null) {
                const targetIndex = parseInt(item.dataset.index);
                if (targetIndex !== this.draggedIndex) {
                    item.classList.add('drag-over');
                }
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const item = e.target.closest('.playlist-item');
            if (item && this.draggedIndex !== null) {
                const targetIndex = parseInt(item.dataset.index);
                if (targetIndex !== this.draggedIndex) {
                    item.classList.add('drag-over');
                }
            }
        });

        container.addEventListener('dragleave', (e) => {
            const item = e.target.closest('.playlist-item');
            if (item && !item.contains(e.relatedTarget)) {
                item.classList.remove('drag-over');
            }
        });

        container.addEventListener('dragend', (e) => {
            const dragging = container.querySelector('.dragging');
            if (dragging) dragging.classList.remove('dragging');
            container.classList.remove('is-dragging');
            container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            this.draggedIndex = null;
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('is-dragging');

            const item = e.target.closest('.playlist-item');

            let fromIndex = this.draggedIndex;
            if (fromIndex === null) {
                const data = e.dataTransfer.getData('text/plain');
                if (data !== "") fromIndex = parseInt(data);
            }

            this.draggedIndex = null;
            container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

            if (fromIndex !== null) {
                let targetIndex;
                if (item) {
                    targetIndex = parseInt(item.dataset.index);
                } else {
                    targetIndex = this.playlist.length - 1;
                }

                if (targetIndex !== fromIndex) {
                    this.reorderPlaylist(fromIndex, targetIndex);
                }
            }
        });
    }

    // Reorder tracks in the playlist
    reorderPlaylist(fromIndex, toIndex) {
        try {
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

            const currentPlaylist = [...this.playlist];
            const currentPlayingTrack = currentPlaylist[this.currentIndex];
            const currentUuid = currentPlayingTrack ? currentPlayingTrack.uuid : null;

            const movedTrack = currentPlaylist.splice(fromIndex, 1)[0];
            currentPlaylist.splice(toIndex, 0, movedTrack);

            this.playlist = currentPlaylist;
            this.originalPlaylist = [...currentPlaylist];

            if (currentUuid) {
                const newIndex = this.playlist.findIndex(t => t.uuid === currentUuid);
                if (newIndex !== -1) {
                    this.currentIndex = newIndex;
                }
            }

            this.renderPlaylist(true);
            this.updateNowPlaying();
            this.updateURL();
            this.autoSave();
            this.syncInputToPlaylist();
            this.showToast('順序を入れ替えました', 'success');

        } catch (error) {
            console.error('[DnD] Error during reorder:', error);
            this.renderPlaylist(true);
        }
    }

    // Sync textarea links
    syncInputToPlaylist() {
        const urls = this.playlist.map(t => `https://suno.com/song/${t.uuid}`);
        this.elements.linksInput.value = urls.join('\n');
    }

    // Load playlist from URL parameters
    loadFromURL() {
        const path = window.location.pathname;
        if (path.startsWith('/p/')) {
            const shortId = path.substring(3);
            if (shortId) {
                this.loadFromShortUrl(shortId);
                return;
            }
        }

        const params = new URLSearchParams(window.location.search);
        const compressed = params.get('p') || params.get('tracks');
        if (compressed) {
            try {
                let uuids = [];
                // Check if it's compressed or legacy
                if (params.get('p')) {
                    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
                    uuids = decompressed.split(',');
                } else {
                    uuids = compressed.split(',');
                }

                if (uuids.length > 0) {
                    const urls = uuids.map(uuid => `https://suno.com/song/${uuid}`);
                    this.elements.linksInput.value = urls.join('\n');
                    setTimeout(() => this.loadPlaylist(), 500);
                }
            } catch (error) {
                console.error('Failed to load URL playlist:', error);
            }
        }
    }

    // Load from short URL
    async loadFromShortUrl(shortId) {
        this.showToast(window.i18n.t('toastLoading'));
        try {
            const response = await fetch(`/api/get-playlist?id=${shortId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.uuids && data.uuids.length > 0) {
                const urls = data.uuids.map(uuid => `https://suno.com/song/${uuid}`);
                this.elements.linksInput.value = urls.join('\n');
                setTimeout(() => this.loadPlaylist(), 500);
            }
        } catch (error) {
            console.error('Failed to load short URL:', error);
            this.showToast('読み込みに失敗しました', 'error');
        }
    }

    extractUUID(url) {
        const songMatch = url.match(/\/song\/([a-f0-9-]{36})/i);
        if (songMatch) return songMatch[1];
        const uuidMatch = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (uuidMatch) return uuidMatch[1];
        return null;
    }

    async fetchSongMetadata(uuid, retries = 3) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await fetch(`/api/metadata?uuid=${uuid}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (data.title) return {
                    title: data.title,
                    artist: data.artist || 'SUNO',
                    thumbnail: data.thumbnail
                };
                throw new Error('No metadata');
            } catch (error) {
                if (attempt === retries - 1) return { title: null, artist: null, error: error.message };
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    async resolveShortLink(shortId) {
        try {
            const response = await fetch(`/api/resolve?id=${shortId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.uuid || null;
        } catch (error) {
            return null;
        }
    }

    async loadPlaylist() {
        const text = this.elements.linksInput.value.trim();
        if (!text) return;

        this.showToast(window.i18n.t('toastLoading'));
        this.showLoadingProgress(true);

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        this.playlist = [];
        this.loadingStates.clear();

        for (let i = 0; i < lines.length; i++) {
            let uuid = this.extractUUID(lines[i]);
            if (!uuid && lines[i].includes('/s/')) {
                const shortMatch = lines[i].match(/\/s\/([a-zA-Z0-9]+)/);
                if (shortMatch) uuid = await this.resolveShortLink(shortMatch[1]);
            }

            if (uuid) {
                this.playlist.push({
                    uuid: uuid,
                    mp3Url: `https://cdn1.suno.ai/${uuid}.mp3`,
                    title: `Track ${this.playlist.length + 1}`,
                    artist: 'Loading...',
                    isLiked: this.storage.isTrackLiked(uuid),
                    error: null
                });
                this.loadingStates.set(uuid, 'loading');
            }
        }

        if (this.playlist.length === 0) {
            this.showToast('有効なリンクがありません', 'error');
            this.showLoadingProgress(false);
            return;
        }

        this.renderPlaylist();
        this.loadTrack(0);

        const promises = this.playlist.map(async (track) => {
            const meta = await this.fetchSongMetadata(track.uuid);
            if (meta && meta.title) {
                track.title = this.decodeHtmlEntities(meta.title);
                track.artist = this.decodeHtmlEntities(meta.artist);
                track.thumbnail = meta.thumbnail;
                this.loadingStates.set(track.uuid, 'loaded');
            } else {
                track.artist = 'Error';
                this.loadingStates.set(track.uuid, 'error');
            }
            this.renderPlaylist();
            if (this.playlist[this.currentIndex].uuid === track.uuid) this.updateNowPlaying();
        });

        await Promise.all(promises);
        this.showLoadingProgress(false);
        this.updateURL();
        this.autoSave();
    }

    updateURL() {
        if (this.playlist.length === 0) return;
        const uuids = this.playlist.map(t => t.uuid).join(',');
        const compressed = LZString.compressToEncodedURIComponent(uuids);
        window.history.replaceState({}, '', `${window.location.pathname}?p=${compressed}`);
    }

    toggleInputSection() {
        const content = this.elements.inputContent;
        const btn = this.elements.toggleInputBtn;

        if (content.style.display === 'none') {
            // 展開
            content.style.display = 'block';
            btn.textContent = '▲';
            btn.title = '折りたたむ';
        } else {
            // 折りたたむ
            content.style.display = 'none';
            btn.textContent = '▼';
            btn.title = '展開する';
        }
    }

    toggleShareDropdown() {
        this.elements.shareDropdown?.classList.toggle('show');
    }

    async getShareUrl() {
        try {
            const uuids = this.playlist.map(t => t.uuid);
            const response = await fetch('/api/save-playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuids })
            });
            const data = await response.json();
            return `${window.location.origin}/p/${data.id}`;
        } catch (e) {
            const uuids = this.playlist.map(t => t.uuid).join(',');
            return `${window.location.origin}${window.location.pathname}?p=${LZString.compressToEncodedURIComponent(uuids)}`;
        }
    }

    async shareToTwitter() {
        const url = await this.getShareUrl();
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('🎵 Check out this playlist!')}`, '_blank');
        this.elements.shareDropdown?.classList.remove('show'); // 自動で閉じる
    }
    async shareToLine() {
        const url = await this.getShareUrl();
        window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`, '_blank');
        this.elements.shareDropdown?.classList.remove('show'); // 自動で閉じる
    }
    async shareToFacebook() {
        const url = await this.getShareUrl();
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        this.elements.shareDropdown?.classList.remove('show'); // 自動で閉じる
    }
    async copyShareUrl() {
        const url = await this.getShareUrl();
        await navigator.clipboard.writeText(url);
        this.showToast('Copied!');
        this.elements.shareDropdown?.classList.remove('show');
    }

    renderPlaylist(ignoreGuard = false) {
        if (!ignoreGuard && this.draggedIndex !== null) return;
        this.elements.trackCount.textContent = `${this.playlist.length}曲`;
        this.elements.playlistContainer.innerHTML = this.playlist.map((track, index) => {
            const thumbnail = track.thumbnail ? `<img src="${track.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'">` : '🎵';
            return `
                <div class="playlist-item ${index === this.currentIndex ? 'active' : ''}" data-index="${index}" draggable="true">
                    <span class="drag-handle">≡</span>
                    <span class="item-number">${index + 1}</span>
                    <div class="item-art">
                        ${thumbnail}
                    </div>
                    <div class="item-info">
                        <div class="item-title">${this.escapeHtml(track.title)}</div>
                        <div class="item-artist">${this.escapeHtml(track.artist)}</div>
                    </div>
                    <div class="item-actions">
                        <a href="https://suno.com/song/${track.uuid}" target="_blank" rel="noopener noreferrer" class="action-btn-sm link-btn-sm" onclick="event.stopPropagation(); window.open('https://suno.com/song/${track.uuid}', '_blank'); return false;" title="SUNOで開く">SUNO</a>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.playlistContainer.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.drag-handle')) return;
                this.loadTrack(parseInt(item.dataset.index));
                this.play();
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    decodeHtmlEntities(text) {
        if (!text) return '';
        const txt = document.createElement("textarea");
        txt.innerHTML = text;
        return txt.value;
    }

    updateNowPlaying() {
        const track = this.playlist[this.currentIndex];
        if (track) {
            this.elements.trackTitle.textContent = track.title;
            this.elements.trackArtist.textContent = track.artist;

            // Update album art
            const albumArtContainer = document.querySelector('.album-art');
            if (albumArtContainer) {
                if (track.thumbnail) {
                    albumArtContainer.innerHTML = `<img src="${track.thumbnail}" alt="" onerror="this.innerHTML='🎵'">`;
                } else {
                    albumArtContainer.innerHTML = '🎵';
                }
            }

            // Update Suno Link (Main Button)
            if (this.elements.openSunoBtn) {
                if (track.uuid) {
                    const url = `https://suno.com/song/${track.uuid}`;
                    this.elements.openSunoBtn.href = url;
                    this.elements.openSunoBtn.style.display = 'flex';
                    // Fallback for some browsers: ensure it opens in new tab
                    this.elements.openSunoBtn.setAttribute('target', '_blank');
                    this.elements.openSunoBtn.setAttribute('rel', 'noopener noreferrer');
                } else {
                    this.elements.openSunoBtn.style.display = 'none';
                }
            }
        }
    }

    // Background update removed - clashes with themes


    openInSuno(uuid) {
        const id = uuid || (this.playlist[this.currentIndex] ? this.playlist[this.currentIndex].uuid : null);
        if (!id) return;
        window.open(`https://suno.com/song/${id}`, '_blank');
    }

    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        this.currentIndex = index;
        this.elements.audioPlayer.src = this.playlist[index].mp3Url;
        this.updateNowPlaying();
        this.renderPlaylist();
    }

    togglePlay() { this.isPlaying ? this.pause() : this.play(); }
    play() {
        if (this.playlist.length === 0) return;
        this.elements.audioPlayer.play().then(() => {
            this.isPlaying = true;
            this.updateControlIcons();
            // Ensure first update
            this.updateProgress();
        });
    }
    pause() {
        this.elements.audioPlayer.pause();
        this.isPlaying = false;
        this.updateControlIcons();
    }

    playNext() {
        if (this.playlist.length === 0) return;

        let nextIndex = this.currentIndex + 1;
        if (nextIndex >= this.playlist.length) {
            if (this.repeatMode === 'all') {
                nextIndex = 0;
            } else {
                return;
            }
        }

        this.loadTrack(nextIndex);
        if (this.isPlaying) this.play();
    }
    playPrevious() {
        if (this.playlist.length === 0) return;

        let prevIndex = this.currentIndex - 1;
        if (prevIndex < 0) {
            if (this.repeatMode === 'all') {
                prevIndex = this.playlist.length - 1;
            } else {
                return;
            }
        }

        this.loadTrack(prevIndex);
        if (this.isPlaying) this.play();
    }

    setVolume(v) { this.elements.audioPlayer.volume = v / 100; }
    seek(e) {
        const rect = this.elements.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.elements.audioPlayer.currentTime = percent * this.elements.audioPlayer.duration;
    }
    seekRelative(s) {
        this.elements.audioPlayer.currentTime += s;
        this.updateProgress();
    }
    toggleMute() { this.elements.audioPlayer.muted = !this.elements.audioPlayer.muted; }

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        if (this.shuffleMode) {
            this.originalPlaylist = [...this.playlist];
            this.playlist.sort(() => Math.random() - 0.5);
        } else {
            this.playlist = [...this.originalPlaylist];
        }
        this.currentIndex = 0;
        this.renderPlaylist();
        this.loadTrack(0);
    }

    toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        this.repeatMode = modes[(modes.indexOf(this.repeatMode) + 1) % modes.length];
        this.showToast(this.repeatMode);
    }

    clearPlaylist() {
        if (confirm('Clear?')) {
            this.playlist = [];
            this.renderPlaylist();
        }
    }

    triggerImport() { this.elements.importFile.click(); }
    async importPlaylist(e) { /* Simplified for brevity */ }
    downloadPlaylist() { /* Simplified */ }
    toggleHelpModal() { this.elements.helpModal.classList.toggle('show'); }
    switchHelpTab(tab) {
        document.querySelectorAll('.help-tab, .help-tab-content').forEach(el => el.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
        document.getElementById(`${tab}Tab`)?.classList.add('active');
    }

    updateProgress() {
        if (!this.elements.audioPlayer.duration) return;
        const p = (this.elements.audioPlayer.currentTime / this.elements.audioPlayer.duration) * 100;
        this.elements.progress.style.width = `${p}%`;
        this.elements.currentTime.textContent = this.formatTime(this.elements.audioPlayer.currentTime);
    }

    updateDuration() {
        if (!this.elements.audioPlayer.duration) return;
        this.elements.duration.textContent = this.formatTime(this.elements.audioPlayer.duration);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    handleError(e) { this.playNext(); }
    showLoadingProgress(show) { this.elements.loadingProgress.classList.toggle('show', show); }
    showToast(m, type = 'default') {
        this.elements.toast.textContent = m;
        this.elements.toast.className = `toast show ${type}`;
        setTimeout(() => this.elements.toast.classList.remove('show'), 3000);
    }
    autoSave() { this.storage.saveCurrent(this.playlist); }
    restoreLastPlaylist() {
        const c = this.storage.getCurrent();
        if (c && c.tracks.length > 0) {
            this.elements.linksInput.value = c.tracks.map(t => `https://suno.com/song/${t.uuid}`).join('\n');
            this.loadPlaylist();
        }
    }
    toggleHistoryModal() { this.elements.historyModal.classList.toggle('show'); }
    updateControlIcons() {
        this.elements.playIcon.textContent = this.isPlaying ? window.themeManager.getIcon('pause') : window.themeManager.getIcon('play');
    }

    handleDonate(e) {
        if (e) e.preventDefault();

        const theme = document.documentElement.getAttribute('data-theme');
        let nyaaText = 'Thanks! ❤️';
        if (theme === 'tabby') nyaaText = 'Nyaa! 🐾';
        if (theme === 'sakura') nyaaText = 'Nyaa! 🌸';

        this.createNyaaEffect(nyaaText);

        // Show selection modal with slight delay for effect
        setTimeout(() => {
            this.elements.donateModal?.classList.add('show');
        }, 600);
    }

    createNyaaEffect(text) {
        const effect = document.createElement('div');
        effect.className = 'nyaa-effect';
        effect.textContent = text;
        effect.style.left = '50%';
        effect.style.top = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(effect);
        setTimeout(() => { effect.remove(); }, 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new I18nManager();
    window.i18n.updateDOM();
    window.themeManager = new ThemeManager();
    window.themeManager.init();
    window.sunoPlaylist = new SUNOPlaylist();

    const themeBtn = document.getElementById('themeBtn');
    const themeDropdown = document.getElementById('themeDropdown');
    if (themeBtn && themeDropdown) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdown.classList.toggle('show');
        });
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => {
                window.themeManager.setTheme(opt.dataset.theme);
                themeDropdown.classList.remove('show');
            });
        });
    }

    const langBtn = document.getElementById('languageBtn');
    const langDropdown = document.getElementById('languageDropdown');
    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('show');
        });
        document.querySelectorAll('.language-option').forEach(opt => {
            opt.addEventListener('click', () => {
                window.i18n.setLanguage(opt.dataset.lang);
                langDropdown.classList.remove('show');
            });
        });
    }
});
