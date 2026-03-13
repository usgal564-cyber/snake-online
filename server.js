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
            food: {x: 5, y: 5, color: '#ff3e3e'},
            status: 'waiting',
            speed: 200 // Эхлэх хурд аажуу (200ms)
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
            // Тоглогч бүрт өөр өөр эхлэх цэг өгөх
            const startPos = Object.keys(room.players).length === 0 ? {x: 5, y: 10} : {x: 20, y: 10};
            room.players[socket.id] = { 
                name: data.name, 
                ready: true, 
                snake: [startPos, {x: startPos.x, y: startPos.y + 1}], 
                score: 0, 
                color: '#4CAF50',
                dx: 0, dy: 0
            };
            
            const playersArr = Object.values(room.players);
            if (playersArr.length === 2 && playersArr.every(p => p.ready)) {
                room.status = 'playing';
                room.speed = 200; // Хурдыг шинэчлэх
                io.to(data.code).emit('gameStart', room);
                startGameLoop(data.code);
            } else {
                io.to(data.code).emit('waitingForPartner', playersArr.length);
            }
        }
    });

    socket.on('updateInput', (data) => {
        if (rooms[data.code] && rooms[data.code].players[socket.id]) {
            const p = rooms[data.code].players[socket.id];
            // Өөдөөсөө эргэхийг хориглох
            if (data.dx === -p.dx && data.dx !== 0) return;
            if (data.dy === -p.dy && data.dy !== 0) return;
            p.dx = data.dx;
            p.dy = data.dy;
        }
    });

    function startGameLoop(code) {
        if (!rooms[code] || rooms[code].status !== 'playing') return;

        const room = rooms[code];
        for (let id in room.players) {
            const p = room.players[id];
            if (p.dx === 0 && p.dy === 0) continue;

            const head = { x: p.snake[0].x + p.dx, y: p.snake[0].y + p.dy };

            // Хана мөргөх эсвэл өөрийгөө мөргөх
            if (head.x < 0 || head.x >= 25 || head.y < 0 || head.y >= 25) {
                room.status = 'ended';
                io.to(code).emit('gameOver', p.name + " хожигдлоо!");
                return;
            }

            p.snake.unshift(head);

            // Идэш идэх
            if (head.x === room.food.x && head.y === room.food.y) {
                p.score += 10;
                p.color = room.food.color;
                // Хурд нэмэх (хамгийн багадаа 50ms хүртэл)
                if (room.speed > 50) room.speed -= 5; 
                
                const colors = ['#FFD700', '#FF00FF', '#00FFFF', '#ADFF2F', '#FF4500'];
                room.food = { 
                    x: Math.floor(Math.random() * 23) + 1, 
                    y: Math.floor(Math.random() * 23) + 1, 
                    color: colors[Math.floor(Math.random() * colors.length)] 
                };
            } else {
                p.snake.pop();
            }
        }

        io.to(code).emit('gameState', room);
        
        // Хурд өөрчлөгдөх боломжтойгоор дараагийн циклийг дуудах
        setTimeout(() => startGameLoop(code), room.speed);
    }

    socket.on('rematchRequest', (data) => {
        if (rooms[data.code]) {
            rooms[data.code].status = 'waiting';
            rooms[data.code].players = {};
            io.to(data.code).emit('resetUI');
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server is running...'));
