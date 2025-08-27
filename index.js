import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3000;
const httpServer = createServer(); // Create a standard HTTP server

const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow connections from any origin
    }
});

const pendingPairs = new Map();

io.on('connection', (socket) => {
    console.log(`[Connect] Client connected: ${socket.id}`);
    const pairingToken = uuidv4();
    pendingPairs.set(pairingToken, socket.id);
    socket.emit('pairing-token', pairingToken);
    console.log(`[Token] Sent token ${pairingToken} to ${socket.id}`);

    socket.on('pair-device', (token) => {
        console.log(`[Pairing] Received request with token: ${token}`);
        if (pendingPairs.has(token)) {
            const desktopSocketId = pendingPairs.get(token);
            const desktopSocket = io.sockets.sockets.get(desktopSocketId);
            if (desktopSocket) {
                const roomName = `room-${token}`;
                desktopSocket.join(roomName);
                socket.join(roomName);
                io.to(roomName).emit('pairing-successful');
                console.log(`[Success] Paired ${socket.id} and ${desktopSocketId} in room: ${roomName}`);
                pendingPairs.delete(token);
            }
        }
    });

    socket.on('new_notification', (data) => {
        const room = Array.from(socket.rooms)[1];
        if (room) {
            socket.to(room).emit('receive_notification', data);
            console.log(`[Notification] Relayed notification to room: ${room}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Disconnect] Client disconnected: ${socket.id}`);
    });
});

// Start the server
httpServer.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
    console.log(`Server link: http://localhost:${PORT}`);
});   
