const socketIO = require('socket.io');

class SocketService {
    constructor() {
        this.io = null;
        this.connections = new Map();
    }

    initialize(server) {
        this.io = socketIO(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.io.on('connection', this.handleConnection.bind(this));
    }

    handleConnection(socket) {
        console.log('Client connected:', socket.id);
        
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            this.connections.delete(socket.id);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    emitToAll(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    emitToRoom(room, event, data) {
        if (this.io) {
            this.io.to(room).emit(event, data);
        }
    }
}

module.exports = new SocketService();