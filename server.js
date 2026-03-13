const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        rooms[roomId] = { players: {}, food: {x: 15, y: 15, color: '#ff3e3e'} };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (data) => {
        if (rooms[data.code]) {
            socket.join(data.code);
            socket.emit('joinedSuccess', data.code);
        } else {
            socket.emit('error', 'Өрөө олдсонгүй!');
        }
    });

    socket.on('updatePos', (data) => {
        if (rooms[data.code]) {
            rooms[data.code].players[socket.id] = {
                snake: data.snake,
                score: data.score,
                name: data.name,
                color: data.color
            };
            io.to(data.code).emit('gameState', rooms[data.code]);
        }
    });

    socket.on('foodEaten', (data) => {
        if (rooms[data.code]) {
            const colors = ['#FFD700', '#FF00FF', '#00FFFF', '#ADFF2F', '#FF4500'];
            rooms[data.code].food = {
                x: Math.floor(Math.random() * 25),
                y: Math.floor(Math.random() * 25),
                color: colors[Math.floor(Math.random() * colors.length)]
            };
            io.to(data.code).emit('gameState', rooms[data.code]);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on ${PORT}`));
