const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Хранение информации о пользователях в каждой комнате
const rooms = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle join room
    socket.on('joinRoom', (data) => {
        const { room, name } = data;

        socket.join(room);

        if (!rooms[room]) {
            rooms[room] = {};
        }

        rooms[room][socket.id] = name;

        console.log(`Client ${name} joined room: ${room}`);

        // Notify existing users in the room about the new user
        const userIds = Object.keys(rooms[room]);
        if (userIds.length === 1) {
            // First user in the room, no opponent
            socket.emit('opponent', { id: null, name: null });
        } else {
            // There are other users in the room
            const opponentId = userIds.find(id => id !== socket.id);
            if (opponentId) {
                socket.emit('opponent', { id: opponentId, name: rooms[room][opponentId] });
                io.to(opponentId).emit('opponent', { id: socket.id, name: name });
            }
        }

        // Notify all clients in the room about the new user
        for (let [id, opponentName] of Object.entries(rooms[room])) {
            if (id !== socket.id) {
                socket.emit('opponent', { id: id, name: opponentName });
                io.to(id).emit('opponent', { id: socket.id, name: name });
            }
        }
    });

    // Handle leave room
    socket.on('leaveRoom', (room) => {
        socket.leave(room);

        if (rooms[room] && rooms[room][socket.id]) {
            const name = rooms[room][socket.id];
            delete rooms[room][socket.id];
            io.to(room).emit('message', `User ${name} left room ${room}`);

            // Notify remaining clients about the left user
            const remainingUsers = Object.entries(rooms[room]);
            if (remainingUsers.length > 0) {
                const [firstUserId] = remainingUsers;
                io.to(firstUserId[0]).emit('opponent', { id: null, name: null });
                for (const [id] of remainingUsers) {
                    if (id !== firstUserId[0]) {
                        io.to(id).emit('opponent', { id: firstUserId[0], name: rooms[room][firstUserId[0]] });
                    }
                }
            } else {
                io.to(room).emit('opponent', { id: null, name: null });
            }
        }
    });

    // Handle chat message
    socket.on('chatMessage', (data) => {
        io.to(data.room).emit('message', `${data.message} (from ${socket.id})`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        for (const room in rooms) {
            if (rooms[room][socket.id]) {
                const name = rooms[room][socket.id];
                delete rooms[room][socket.id];
                io.to(room).emit('message', `User ${name} left room ${room}`);

                // Notify remaining clients about the left user
                const remainingUsers = Object.entries(rooms[room]);
                if (remainingUsers.length > 0) {
                    const [firstUserId] = remainingUsers;
                    io.to(firstUserId[0]).emit('opponent', { id: null, name: null });
                    for (const [id] of remainingUsers) {
                        if (id !== firstUserId[0]) {
                            io.to(id).emit('opponent', { id: firstUserId[0], name: rooms[room][firstUserId[0]] });
                        }
                    }
                } else {
                    io.to(room).emit('opponent', { id: null, name: null });
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
