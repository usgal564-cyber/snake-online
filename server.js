const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Хэрэглэгч холбогдлоо');

    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (data) => {
        socket.join(data.code);
        io.to(data.code).emit('joinedSuccess', data.code);
    });

    socket.on('disconnect', () => {
        console.log('Хэрэглэгч саллаа');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Сервер ${PORT} дээр ажиллаж байна`);
});