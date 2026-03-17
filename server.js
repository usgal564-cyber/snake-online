const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        rooms[roomId] = { 
            players: {}, 
            food: {x: 12, y: 12, color: '#ff3e3e'},
            status: 'waiting',
            speed: 220 
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (data) => {
        const room = rooms[data.code];
        if (room && Object.keys(room.players).length < 2) {
            socket.join(data.code);
            socket.emit('joinedSuccess', data.code);
        } else {
            socket.emit('error', 'Өрөө дүүрсэн эсвэл олдсонгүй!');
        }
    });

    socket.on('playerReady', (data) => {
        const room = rooms[data.code];
        if (room) {
            const isFirst = Object.keys(room.players).length === 0;
            const startPos = isFirst ? {x: 5, y: 12} : {x: 19, y: 12};
            room.players[socket.id] = { 
                name: data.name, 
                ready: true, 
                snake: [startPos, {x: startPos.x, y: startPos.y + (isFirst ? 1 : -1)}], 
                score: 0, 
                color: isFirst ? '#4CAF50' : '#2196F3',
                dx: 0, dy: 0
            };
            
            const playersArr = Object.values(room.players);
            if (playersArr.length === 2 && playersArr.every(p => p.ready)) {
                room.status = 'playing';
                room.speed = 220;
                io.to(data.code).emit('gameStart', room);
                startGameLoop(data.code);
            }
        }
    });

    socket.on('updateInput', (data) => {
        const room = rooms[data.code];
        if (room && room.players[socket.id]) {
            const p = room.players[socket.id];
            if (data.dx === -p.dx && data.dx !== 0) return;
            if (data.dy === -p.dy && data.dy !== 0) return;
            p.dx = data.dx; p.dy = data.dy;
        }
    });

    function startGameLoop(code) {
        const room = rooms[code];
        if (!room || room.status !== 'playing') return;

        let gameOverMsg = "";
        const ids = Object.keys(room.players);

        for (let id of ids) {
            const p = room.players[id];
            if (p.dx === 0 && p.dy === 0) continue;

            const head = { x: p.snake[0].x + p.dx, y: p.snake[0].y + p.dy };

            // 1. Хана мөргөх
            if (head.x < 0 || head.x >= 25 || head.y < 0 || head.y >= 25) {
                gameOverMsg = p.name + " хана мөргөж хожигдлоо!";
                room.status = 'ended';
            }

            // 2. Өөрийгөө болон өрсөлдөгчөө мөргөх
            for (let otherId of ids) {
                room.players[otherId].snake.forEach((part, index) => {
                    if (head.x === part.x && head.y === part.y) {
                        gameOverMsg = p.name + " мөргөлдөж хожигдлоо!";
                        room.status = 'ended';
                    }
                });
            }

            if (room.status === 'ended') break;

            p.snake.unshift(head);

            // 3. Хоол идэх
            if (head.x === room.food.x && head.y === room.food.y) {
                p.score += 10;
                p.color = room.food.color;
                if (room.speed > 70) room.speed -= 4; 
                room.food = { 
                    x: Math.floor(Math.random() * 23) + 1, 
                    y: Math.floor(Math.random() * 23) + 1, 
                    color: ['#FFD700', '#FF00FF', '#00FFFF', '#ADFF2F'][Math.floor(Math.random()*4)]
                };
            } else {
                p.snake.pop();
            }
        }

        if (room.status === 'ended') {
            io.to(code).emit('gameOver', gameOverMsg);
        } else {
            io.to(code).emit('gameState', room);
            setTimeout(() => startGameLoop(code), room.speed);
        }
    }

    socket.on('rematchRequest', (data) => {
        if (rooms[data.code]) {
            rooms[data.code].status = 'waiting';
            rooms[data.code].players = {};
            io.to(data.code).emit('resetUI');
        }
    });
});

http.listen(process.env.PORT || 3000);
