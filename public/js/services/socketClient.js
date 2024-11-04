// Client-side Socket.IO service to handle real-time communication
import '/socket.io/socket.io.js';

class SocketClientService {
  constructor() {
    this.socket = null;
  }

  // Connect to the socket server
  connect(token) {
    this.socket = io('http://localhost:3000', {
      auth: {
        token,
      },
    });

    // Attach default event listeners
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  // Check if socket is connected
  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Add event listener
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit an event to the server
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

const socketClientService = new SocketClientService();
export default socketClientService;
