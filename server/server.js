const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // Your React app URL
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

// Store active streams
const activeStreams = new Map();
const streamBuffers = new Map();

// YouTube RTMP configuration
const YOUTUBE_RTMP_URL = 'rtmp://a.rtmp.youtube.com/live2/';
const YOUTUBE_STREAM_KEY = 'af49-pwf7-xcjp-8mgg-ck19'; // Replace with your actual stream key

// FFmpeg configuration for YouTube Live
const getFFmpegArgs = (streamKey) => [
    '-f', 'webm',
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-r', '30',
    '-g', '60',
    '-keyint_min', '60',
    '-sc_threshold', '0',
    '-b:v', '2500k',
    '-maxrate', '2500k',
    '-bufsize', '5000k',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'flv',
    `${YOUTUBE_RTMP_URL}${streamKey}`
];

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.emit('welcome', 'Connected to streaming server');

    socket.on('start-stream', async (data) => {
        console.log(`Starting stream for ${socket.id}:`, data);

        try {
            const streamId = socket.id;

            // Initialize buffer for this stream
            streamBuffers.set(streamId, []);

            // Stream to YouTube Live
            const ffmpegArgs = getFFmpegArgs(YOUTUBE_STREAM_KEY);

            // Create FFmpeg process for YouTube streaming
            const ffmpegStream = spawn('ffmpeg', ffmpegArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Handle FFmpeg stdout/stderr for streaming
            ffmpegStream.stdout.on('data', (data) => {
                console.log(`FFmpeg stream stdout: ${data}`);
            });

            ffmpegStream.stderr.on('data', (data) => {
                console.log(`FFmpeg stream stderr: ${data}`);
            });

            ffmpegStream.on('close', (code) => {
                console.log(`FFmpeg stream process exited with code ${code}`);
                // Cleanup on process close
                activeStreams.delete(streamId);
                streamBuffers.delete(streamId);
            });

            ffmpegStream.on('error', (error) => {
                console.error('FFmpeg stream error:', error);
                socket.emit('stream-error', { message: 'Streaming failed', error: error.message });
                // Cleanup on error
                activeStreams.delete(streamId);
                streamBuffers.delete(streamId);
            });

            // Handle stdin errors
            ffmpegStream.stdin.on('error', (error) => {
                console.error('FFmpeg stdin error:', error);
                // Don't crash the server, just log the error
            });

            // Store stream info
            activeStreams.set(streamId, {
                ffmpegStream,
                startTime: new Date(),
                title: data.title || 'Live Stream',
                description: data.description || ''
            });

            socket.emit('stream-started', {
                streamId,
                message: 'Stream started successfully'
            });

        } catch (error) {
            console.error('Error starting stream:', error);
            socket.emit('stream-error', { message: 'Failed to start stream', error: error.message });
        }
    });

    socket.on('stream-data', (buffer) => {
        const streamId = socket.id;
        const streamInfo = activeStreams.get(streamId);

        if (streamInfo && buffer) {
            try {
                // Convert ArrayBuffer to Buffer
                const dataBuffer = Buffer.from(buffer);

                // Write to FFmpeg stdin for streaming with error handling
                if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed && streamInfo.ffmpegStream.stdin && !streamInfo.ffmpegStream.stdin.destroyed) {
                    streamInfo.ffmpegStream.stdin.write(dataBuffer, (error) => {
                        if (error) {
                            console.error('Error writing to FFmpeg stdin:', error);
                        }
                    });
                }

                // Store in buffer (optional - for buffering/analysis)
                const bufferArray = streamBuffers.get(streamId) || [];
                bufferArray.push(dataBuffer);

                // Keep only last 100 chunks to prevent memory issues
                if (bufferArray.length > 100) {
                    bufferArray.shift();
                }
                streamBuffers.set(streamId, bufferArray);

            } catch (error) {
                console.error('Error processing stream data:', error);
            }
        }
    });

    socket.on('stop-stream', () => {
        const streamId = socket.id;
        const streamInfo = activeStreams.get(streamId);

        if (streamInfo) {
            console.log(`Stopping stream for ${streamId}`);

            try {
                // Close FFmpeg stdin and terminate process
                if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed) {
                    // Remove listeners to prevent memory leaks
                    streamInfo.ffmpegStream.removeAllListeners();

                    // Gracefully close stdin
                    if (streamInfo.ffmpegStream.stdin && !streamInfo.ffmpegStream.stdin.destroyed) {
                        streamInfo.ffmpegStream.stdin.end();
                    }

                    // Set timeout for force kill
                    setTimeout(() => {
                        if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed) {
                            streamInfo.ffmpegStream.kill('SIGKILL');
                        }
                    }, 3000);

                    // Attempt graceful termination first
                    streamInfo.ffmpegStream.kill('SIGTERM');
                }

                // Cleanup
                activeStreams.delete(streamId);
                streamBuffers.delete(streamId);

                socket.emit('stream-stopped', {
                    message: 'Stream stopped successfully',
                    duration: Date.now() - streamInfo.startTime.getTime()
                });

            } catch (error) {
                console.error('Error stopping stream:', error);
                // Force cleanup even if there's an error
                try {
                    if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed) {
                        streamInfo.ffmpegStream.kill('SIGKILL');
                    }
                } catch (killError) {
                    console.error('Force kill failed:', killError);
                } finally {
                    activeStreams.delete(streamId);
                    streamBuffers.delete(streamId);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);

        // Cleanup any active streams with proper error handling
        const streamInfo = activeStreams.get(socket.id);
        if (streamInfo) {
            try {
                if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed) {
                    // Remove all listeners to prevent memory leaks
                    streamInfo.ffmpegStream.removeAllListeners();

                    // Gracefully close stdin
                    if (streamInfo.ffmpegStream.stdin && !streamInfo.ffmpegStream.stdin.destroyed) {
                        streamInfo.ffmpegStream.stdin.end();
                    }

                    // Force kill after timeout
                    setTimeout(() => {
                        if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed) {
                            streamInfo.ffmpegStream.kill('SIGKILL');
                        }
                    }, 3000);

                    // Immediate terminate
                    streamInfo.ffmpegStream.kill('SIGTERM');
                }
            } catch (error) {
                console.error(`Error cleaning up stream for ${socket.id}:`, error);
                // Force kill if there's an error
                try {
                    if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed) {
                        streamInfo.ffmpegStream.kill('SIGKILL');
                    }
                } catch (killError) {
                    console.error('Force kill failed:', killError);
                }
            } finally {
                // Always cleanup maps
                activeStreams.delete(socket.id);
                streamBuffers.delete(socket.id);
                console.log(`Cleaned up stream for disconnected client: ${socket.id}`);
            }
        }
    });
});

// API endpoints
app.get('/api/streams', (req, res) => {
    const streams = Array.from(activeStreams.entries()).map(([id, info]) => ({
        id,
        title: info.title,
        description: info.description,
        startTime: info.startTime,
        duration: Date.now() - info.startTime.getTime()
    }));

    res.json({ streams });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        activeStreams: activeStreams.size,
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Streaming server running on port ${PORT}`);
    console.log('YouTube streaming server ready');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');

    // Stop all active streams with proper error handling
    activeStreams.forEach((streamInfo, streamId) => {
        try {
            if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed) {
                streamInfo.ffmpegStream.removeAllListeners();
                if (streamInfo.ffmpegStream.stdin && !streamInfo.ffmpegStream.stdin.destroyed) {
                    streamInfo.ffmpegStream.stdin.end();
                }
                streamInfo.ffmpegStream.kill('SIGTERM');

                // Force kill after timeout
                setTimeout(() => {
                    if (streamInfo.ffmpegStream && !streamInfo.ffmpegStream.killed) {
                        streamInfo.ffmpegStream.kill('SIGKILL');
                    }
                }, 2000);
            }
        } catch (error) {
            console.error(`Error stopping stream ${streamId}:`, error);
        }
    });

    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit, just log the error
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit, just log the error
});