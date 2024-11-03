class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    initialize(authToken) {
        if (!authToken) {
            console.error('No auth token provided');
            return;
        }

        try {
            this.socket = io(window.location.origin, {
                auth: { token: authToken },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5
            });

            this.setupListeners();
        } catch (error) {
            console.error('Socket initialization error:', error);
        }
    }

    setupListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.connected = true;
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.connected = false;
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    getSocket() {
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    emit(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
        } else {
            console.error('Socket not connected');
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
}

// Create singleton instance
const socketService = new SocketService();
window.socketService = socketService; // Make it globally available