// server/services/socketService.js

const jwt = require('jsonwebtoken');

class SocketService {
    constructor() {
        this.io = null;
        this.connections = new Map();
    }

    initialize(io) {
        this.io = io;

        // Socket.IO middleware for authentication
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.user = decoded;
                next();
            } catch (error) {
                next(new Error('Invalid authentication token'));
            }
        });

        this.io.on('connection', this.handleConnection.bind(this));
    }

    handleConnection(socket) {
        console.log(`Client connected: ${socket.id}`);

        this.connections.set(socket.id, {
            id: socket.id,
            user: socket.user,
            socket: socket
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
            this.connections.delete(socket.id);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`Socket error from ${socket.id}:`, error);
        });

        // Send initial data if needed
        this.sendInitialData(socket);
    }

    sendInitialData(socket) {
        // You can send any initial data the client needs here
        // For example, current race status, driver list, etc.
    }

    // Emit to all clients
    emit(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    // Emit to specific client
    emitTo(socketId, event, data) {
        const connection = this.connections.get(socketId);
        if (connection && connection.socket) {
            connection.socket.emit(event, data);
        }
    }

    // Emit to clients with specific role
    emitToRole(role, event, data) {
        for (const [, connection] of this.connections) {
            if (connection.user.role === role) {
                connection.socket.emit(event, data);
            }
        }
    }

    // Broadcast to all except sender
    broadcast(socket, event, data) {
        socket.broadcast.emit(event, data);
    }
}

module.exports = new SocketService();