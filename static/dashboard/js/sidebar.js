// Sidebar functionality
class SidebarManager {
    constructor() {
        this.settingsSidebar = document.getElementById('settings-sidebar');
        this.showSettingsBtn = document.getElementById('show-settings');
        this.hideSidebarBtn = document.getElementById('hide-sidebar');
        this.sidebarCloseBtn = document.getElementById('sidebar-close');
        this.settingsDetails = document.getElementById('settings-details');

        this.initializeEventListeners();
        this.hideSettings(); // Initialize as hidden
    }

    showSettings() {
        this.settingsSidebar.classList.remove('sidebar-hidden');
        this.showSettingsBtn.classList.remove('visible');
        this.settingsDetails.style.display = '';
        this.hideSidebarBtn.textContent = 'Hide';
    }

    hideSettings() {
        this.settingsSidebar.classList.add('sidebar-hidden');
        this.showSettingsBtn.classList.add('visible');
        this.settingsDetails.style.display = 'none';
        this.hideSidebarBtn.textContent = 'Show';
    }

    initializeEventListeners() {
        this.hideSidebarBtn.addEventListener('click', () => this.hideSettings());
        this.showSettingsBtn.addEventListener('click', () => this.showSettings());
        
        if (this.sidebarCloseBtn) {
            this.sidebarCloseBtn.addEventListener('click', () => this.hideSettings());
        }
    }
}

export default SidebarManager; 