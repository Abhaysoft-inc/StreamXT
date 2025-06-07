import express from 'express';
import http from 'http';
import { Server as IOserver } from 'socket.io';
import cors from 'cors';
import { spawn } from 'child_process';
import { PassThrough } from 'stream';

const app = express();
const server = http.createServer(app);
app.use(cors());

const io = new IOserver(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        maxHttpBufferSize: 1e8
    }
});

// Create a PassThrough stream to pipe data to FFmpeg
const inputStream = new PassThrough();

const options = [
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-r', '30',
    '-g', '60',
    '-keyint_min', '30',
    '-b:v', '2500k',
    '-bufsize', '5000k',
    '-maxrate', '2500k',
    '-pix_fmt', 'yuv420p',
    '-f', 'flv',
    'rtmp://a.rtmp.youtube.com/live2/af49-pwf7-xcjp-8mgg-ck19'
];

const ffmpegProcess = spawn('ffmpeg', options);

// Pipe the input stream to FFmpeg's stdin
inputStream.pipe(ffmpegProcess.stdin);

ffmpegProcess.stdout.on('data', (data) => {
    console.log(`ffmpeg stdout: ${data}`);
});

ffmpegProcess.stderr.on('data', (data) => {
    console.error(`ffmpeg stderr: ${data}`);
});

ffmpegProcess.on('close', (code) => {
    console.log(`ffmpeg process exited with code ${code}`);
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('welcome', `Connected to ${socket.id}`);

    socket.on('stream', (chunk) => {
        // Write the buffer directly to the input stream
        inputStream.write(chunk);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        // cleanup function chalana h jisse ki sab kuch band ho jay aur stream ruk jay
    });
});

server.listen(3001, () => {
    console.log("Server is running on PORT 3001");
});

// Handle process termination
process.on('SIGINT', () => {
    ffmpegProcess.kill('SIGINT');
    process.exit();
});