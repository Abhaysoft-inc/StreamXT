const express = require('express')
const cors = require("cors")
const http = require('http')
const { Server } = require("socket.io");
const { log } = require('console');

const app = express()
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

io.on('connection', (socket) => {
    console.log(socket.id)
    socket.emit("welcome", "Welcome to the calling server!");
});

server.listen(3001, () => {
    console.log('3001');

});