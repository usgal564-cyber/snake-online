const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let rooms = {};
const textBank = [
    "the quick brown fox jumps over the lazy dog",
    "programming is the art of telling a computer what to do",
    "javascript is a versatile language for web development",
    "practice makes perfect when it comes to typing speed"
];

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        rooms[roomId] = { 
            players: {}, 
            text: textBank[Math.floor(Math.random() * textBank.length)],
            status: 'waiting'
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (data) => {
        const roomCode = data.code.toUpperCase();
        if (rooms[roomCode]) {
            socket.join(roomCode);
            socket.emit('joinedSuccess', {code: roomCode, text: rooms[roomCode].text});
        } else {
            socket.emit('errorMsg', 'Өрөө олдсонгүй!');
        }
    });

    socket.on('playerReady', (data) => {
        const room = rooms[data.code.toUpperCase()];
        if (room) {
            room.players[socket.id] = { name: data.name, progress: 0, wpm: 0, ready: true };
            const playersArr = Object.values(room.players);
            if (playersArr.length >= 2) {
                room.status = 'playing';
                io.to(data.code.toUpperCase()).emit('gameStart');
            }
        }
    });

    socket.on('updateProgress', (data) => {
        const room = rooms[data.code.toUpperCase()];
        if (room && room.players[socket.id]) {
            room.players[socket.id].progress = data.progress;
            room.players[socket.id].wpm = data.wpm;
            io.to(data.code.toUpperCase()).emit('gameState', room.players);
            
            if (data.progress >= 100) {
                io.to(data.code.toUpperCase()).emit('gameOver', room.players[socket.id].name);
                room.status = 'ended';
            }
        }
    });
});

http.listen(process.env.PORT || 3000);
