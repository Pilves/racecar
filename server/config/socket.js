const socketIO = require('socket.io');

class SocketService {
    constructor() {
        this.io = null;
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
        });
    }

    emit(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}

module.exports = new SocketService();