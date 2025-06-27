const express = require("express");
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs')


// const key = fs.readFileSync('./certs/cert.key');
// const cert = fs.readFileSync('./certs/cert.crt');


const app = express()
const server = http.createServer(app);


const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// ffmpeg options





// listening for connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    let ffmpeg = null;
    let streamStarted = false;
    let bufferQueue = [];
    let streamKey = null;

    // ✅ Listen for the stream key first
    socket.on('set-stream-key', (key) => {
        streamKey = key;
        console.log(`Received stream key from frontend: ${streamKey}`);
    });

    // 🚀 Handle video stream data from frontend
    socket.on('stream-data', (chunk) => {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

        // Only start ffmpeg if streamKey is set
        if (!streamStarted && streamKey) {
            streamStarted = true;
            console.log('Starting FFmpeg with streamKey...');

            ffmpeg = spawn('ffmpeg', [
                '-f', 'webm',
                '-i', 'pipe:0',
                '-c:v', 'libx264',
                '-crf', '18',
                '-preset', 'veryfast',
                '-tune', 'zerolatency',
                '-g', '50',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-ac', '2',
                '-ar', '48000',
                '-vf', 'scale=1280:720',
                '-f', 'flv',
                `rtmp://a.rtmp.youtube.com/live2/${streamKey}`
            ]);

            ffmpeg.stderr.on('data', (data) => {
                console.error(`FFmpeg error: ${data}`);
            });

            ffmpeg.on('close', (code) => {
                console.log(`FFmpeg exited with code ${code}`);
            });

            ffmpeg.stdin.on('error', (err) => {
                console.error('FFmpeg STDIN error:', err);
            });

            // Flush buffered data
            for (const chunk of bufferQueue) {
                ffmpeg.stdin.write(chunk);
            }
            bufferQueue = [];
        }

        if (ffmpeg) {
            ffmpeg.stdin.write(data);
        } else {
            bufferQueue.push(data);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill('SIGINT');
        }
    });
});



server.listen(3001, () => {
    console.log("server is running on port 3001")
})