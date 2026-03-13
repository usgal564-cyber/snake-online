const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 7); // Санамсаргүй 5 оронтой код
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        io.to(roomId).emit('playerJoined', 'Шинэ тоглогч орж ирлээ!');
    });

    // Могойн хөдөлгөөний датаг дамжуулах хэсэг...
});

http.listen(3000, () => { console.log('Сервер 3000 порт дээр аслаа'); });