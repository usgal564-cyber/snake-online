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
            food: {x: 10, y: 10, color: '#ff3e3e'},
            status: 'waiting' // waiting, playing, ended
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
            room.players[socket.id] = { 
                name: data.name, 
                ready: true, 
                snake: [{x: 10, y: 10}, {x: 10, y: 11}], 
                score: 0, 
                color: '#4CAF50',
                dx: 0, dy: 0
            };
            
            const playersArr = Object.values(room.players);
            if (playersArr.length === 2 && playersArr.every(p => p.ready)) {
                room.status = 'playing';
                io.to(data.code).emit('gameStart', room);
            } else {
                io.to(data.code).emit('waitingForPartner', playersArr.length);
            }
        }
    });

    socket.on('updateInput', (data) => {
        if (rooms[data.code] && rooms[data.code].players[socket.id]) {
            rooms[data.code].players[socket.id].dx = data.dx;
            rooms[data.code].players[socket.id].dy = data.dy;
        }
    });

    socket.on('rematchRequest', (data) => {
        if (rooms[data.code]) {
            rooms[data.code].status = 'waiting';
            for (let id in rooms[data.code].players) {
                rooms[data.code].players[id].ready = false;
                rooms[data.code].players[id].snake = [{x: 10, y: 10}, {x: 10, y: 11}];
                rooms[data.code].players[id].score = 0;
            }
            io.to(data.code).emit('resetUI');
        }
    });

    // Тоглоомын логикийг сервер дээр 100ms тутамд ажиллуулах (Бие биенээ харах гол түлхүүр)
    setInterval(() => {
        for (let code in rooms) {
            const room = rooms[code];
            if (room.status === 'playing') {
                for (let id in room.players) {
                    const p = room.players[id];
                    if (p.dx === 0 && p.dy === 0) continue;

                    const head = { x: p.snake[0].x + p.dx, y: p.snake[0].y + p.dy };
                    
                    // Хана мөргөх
                    if (head.x < 0 || head.x >= 25 || head.y < 0 || head.y >= 25) {
                        room.status = 'ended';
                        io.to(code).emit('gameOver', p.name + " хожигдлоо!");
                        break;
                    }

                    p.snake.unshift(head);
                    if (head.x === room.food.x && head.y === room.food.y) {
                        p.score += 10;
                        p.color = room.food.color;
                        const colors = ['#FFD700', '#FF00FF', '#00FFFF', '#ADFF2F'];
                        room.food = { 
                            x: Math.floor(Math.random()*25), 
                            y: Math.floor(Math.random()*25), 
                            color: colors[Math.floor(Math.random()*colors.length)] 
                        };
                    } else {
                        p.snake.pop();
                    }
                }
                io.to(code).emit('gameState', room);
            }
        }
    }, 100);
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server is running...'));
