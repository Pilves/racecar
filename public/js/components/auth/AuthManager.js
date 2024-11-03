class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.authScreen = document.getElementById('authScreen');
        this.mainApp = document.getElementById('mainApp');
        this.authForm = document.getElementById('authForm');
        this.authError = document.getElementById('authError');
        this.interfaceType = this.getInterfaceType();

        this.initialize();
    }

    initialize() {
        if (this.authForm) {
            this.authForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Check if already authenticated
        if (this.token) {
            this.validateToken();
        }
    }

    getInterfaceType() {
        const path = window.location.pathname;
        if (path.includes('front-desk')) return 'front-desk';
        if (path.includes('race-control')) return 'race-control';
        if (path.includes('lap-line-tracker')) return 'lap-line-tracker';
        return null;
    }

    async handleLogin(e) {
        e.preventDefault();
        const accessKey = document.getElementById('accessKey').value;

        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accessKey,
                    interfaceType: this.interfaceType
                }),
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('authToken', this.token);

                // Initialize socket connection with the token
                await socketService.initialize(this.token);

                this.showMainApp();
            } else {
                this.showError(data.message || 'Authentication failed');
                document.getElementById('accessKey').value = '';
            }
        } catch (error) {
            this.showError('Connection error. Please try again.');
            console.error('Auth error:', error);
        }
    }

    async validateToken() {
        try {
            const response = await fetch('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                // Initialize socket connection with the token
                await socketService.initialize(this.token);
                this.showMainApp();
            } else {
                localStorage.removeItem('authToken');
                this.token = null;
                this.showAuthScreen();
            }
        } catch (error) {
            console.error('Token validation error:', error);
            localStorage.removeItem('authToken');
            this.token = null;
            this.showAuthScreen();
        }
    }

    showError(message) {
        this.authError.textContent = message;
        this.authError.classList.remove('hidden');
        setTimeout(() => {
            this.authError.classList.add('hidden');
        }, 3000);
    }

    showMainApp() {
        this.authScreen.classList.add('hidden');
        this.mainApp.classList.remove('hidden');
        window.dispatchEvent(new CustomEvent('auth:complete'));
    }

    showAuthScreen() {
        this.authScreen.classList.remove('hidden');
        this.mainApp.classList.add('hidden');
    }

    logout() {
        localStorage.removeItem('authToken');
        socketService.disconnect();
        this.token = null;
        window.location.reload();
    }
}