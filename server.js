const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let rooms = {};
const words = ["the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog", "programming", "javascript", "code", "typing", "speed", "challenge", "monkey", "keyboard", "battle", "online", "developer", "system", "logic", "word", "test", "practice", "future", "world", "simple", "complex", "game", "winner", "screen", "focus", "rhythm", "accuracy", "percent", "minute", "stable", "server", "connection", "dynamic", "static", "render", "github", "friend", "room", "start", "finish", "fast", "slow", "energy"];

function generateText(len) {
    let result = [];
    for(let i=0; i<len; i++) result.push(words[Math.floor(Math.random() * words.length)]);
    return result.join(" ");
}

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        rooms[roomId] = { 
            players: {}, 
            text: generateText(50), // 50 үг
            status: 'waiting',
            host: socket.id
        };
        socket.join(roomId);
        socket.emit('roomCreated', { code: roomId, isHost: true });
    });

    socket.on('joinRoom', (data) => {
        const code = data.code.toUpperCase();
        if (rooms[code]) {
            socket.join(code);
            socket.emit('joinedSuccess', { code: code, isHost: false, text: rooms[code].text });
        } else {
            socket.emit('errorMsg', 'Өрөө олдсонгүй!');
        }
    });

    socket.on('startGame', (data) => {
        if (rooms[data.code] && rooms[data.code].host === socket.id) {
            rooms[data.code].status = 'playing';
            io.to(data.code).emit('gameStart');
        }
    });

    socket.on('updateProgress', (data) => {
        const room = rooms[data.code];
        if (room) {
            room.players[socket.id] = { name: data.name, progress: data.progress, wpm: data.wpm };
            io.to(data.code).emit('gameState', room.players);
            if (data.progress >= 100 && room.status !== 'ended') {
                room.status = 'ended';
                io.to(data.code).emit('gameOver', data.name);
            }
        }
    });
});

http.listen(process.env.PORT || 3000);
