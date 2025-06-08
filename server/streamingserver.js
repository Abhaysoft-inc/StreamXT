const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "http://localhost:3000" }
});

// YouTube RTMP settings
const YOUTUBE_URL = 'rtmp://a.rtmp.youtube.com/live2/';
const STREAM_KEY = 'af49-pwf7-xcjp-8mgg-ck19'; // Replace with your stream key

io.on('connection', socket => {
    console.log('Client connected:', socket.id);
    let ffmpeg = null;

    socket.on('start-stream', () => {
        // Basic FFmpeg configuration
        ffmpeg = spawn('ffmpeg', [
            '-i', 'pipe:0',          // Input from pipe
            '-c:v', 'libx264',       // Video codec
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-f', 'flv',            // Output format
            `${YOUTUBE_URL}${STREAM_KEY}`
        ]);

        // Log FFmpeg output for debugging
        ffmpeg.stderr.on('data', data => {
            console.log('FFmpeg:', data.toString());
        });
    });

    socket.on('stream-data', chunk => {

        if (ffmpeg && ffmpeg.stdin.writable) {
            ffmpeg.stdin.write(Buffer.from(chunk));

        }
    });

    socket.on('stop-stream', () => {
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill();
            ffmpeg = null;
        }
    });

    socket.on('disconnect', () => {
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill();
            ffmpeg = null;
        }
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(3001, () => {
    console.log('Server running on port 3001');
});