const express = require("express");
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
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

    // Receive data chunks
    socket.on('stream-data', (chunk) => {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

        // ✅ Start ffmpeg only when first chunk arrives
        if (!streamStarted) {
            streamStarted = true;
            console.log("Starting FFmpeg now...");

            ffmpeg = spawn('ffmpeg', [
                '-f', 'webm',
                '-i', 'pipe:0',

                '-c:v', 'libx264', // rtmp
                '-crf', '18',

                '-preset', 'veryfast',
                '-tune', 'zerolatency',

                '-g', '50',
                '-c:a', 'aac', // rtmp ko aac chahiye
                '-b:a', '128k',
                '-ac', '2', // stereo
                '-ar', '48000',
                '-vf', 'scale=1280:720', // forcing 

                '-f', 'flv',
                'rtmp://localhost/live'
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

            // 🧠 Flush buffered chunks
            for (const chunk of bufferQueue) {
                ffmpeg.stdin.write(chunk);
            }
            bufferQueue = [];
        }

        if (ffmpeg) {
            ffmpeg.stdin.write(data);
        } else {
            // 🔄 Buffer it temporarily until FFmpeg starts
            bufferQueue.push(data);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill('SIGINT');
        }
    });
});


server.listen(3001)