const jwt = require('jsonwebtoken');

class SocketService {
  constructor() {
    this.io = null;
  }

  initialize(io) {
    this.io = io;

    this.io.use(this.authMiddleware.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  authMiddleware(socket, next) {
    const { token } = socket.handshake.auth;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }

  handleConnection(socket) {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error from ${socket.id}:`, error);
    });

    this.sendInitialData(socket);
  }

  sendInitialData(socket) {
    // Implement sending initial data to the connected client
  }

  emit(event, data) {
    if (!this.io) {
      console.error('Socket.IO not initialized');
      return;
    }
    this.io.emit(event, data);
  }

  emitToRoom(room, event, data) {
    if (!this.io) {
      console.error('Socket.IO not initialized');
      return;
    }
    this.io.to(room).emit(event, data);
  }

  joinRoom(socket, room) {
    socket.join(room);
  }

  leaveRoom(socket, room) {
    socket.leave(room);
  }
}

module.exports = new SocketService();
