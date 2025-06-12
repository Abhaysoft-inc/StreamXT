const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

streamKey = process.env.STREAM_KEY;

// YouTube RTMP settings
const YOUTUBE_URL = 'rtmp://a.rtmp.youtube.com/live2/';

io.on('connection', socket => {
    console.log('Client connected:', socket.id);
    let ffmpeg = null;
    

    socket.on('set-stream-key', key => {
        streamKey = key;
        console.log('Stream key received:', streamKey);
    });



    socket.on('start-stream', () => {
        if (!streamKey) {
            console.error('Stream key is missing. Cannot start streaming.');
            return;
        }

        // Function to start ffmpeg process
        const startFfmpeg = () => {
            ffmpeg = spawn('ffmpeg', [
                '-i', 'pipe:0',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-tune', 'zerolatency',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-pix_fmt', 'yuv420p',
                '-f', 'flv',
                `${YOUTUBE_URL}${streamKey}`
            ]);

            ffmpeg.stderr.on('data', data => {
                console.log('FFmpeg:', data.toString());
            });

            ffmpeg.on('error', error => {
                console.error('FFmpeg process error:', error);
                socket.emit('ffmpeg-error', `FFmpeg error: ${error.message}`);
                restartFfmpeg();
            });

            ffmpeg.on('exit', (code, signal) => {
                if (code !== 0) {
                    const msg = `FFmpeg exited with code ${code} and signal ${signal}`;
                    console.error(msg);
                    socket.emit('ffmpeg-error', msg);
                    restartFfmpeg();
                }
            });
        };

        // Function to restart ffmpeg
        const restartFfmpeg = () => {
            if (ffmpeg) {
                ffmpeg.stdin.end();
                ffmpeg.kill();
                ffmpeg = null;
            }
            // Restart ffmpeg after short delay
            setTimeout(() => {
                startFfmpeg();
            }, 1000);
        };

        startFfmpeg();
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

    socket.on('stream-stopped', () => {
        console.log('Stream stopped by client:', socket.id);
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill();
            ffmpeg = null;
        }
        streamKey = null;
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
