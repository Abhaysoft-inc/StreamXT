# Use Node.js LTS version as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server code
COPY . .

# Expose port for WebSocket server
EXPOSE 3001

# Start the server
CMD ["node", "streamingserver.js"] 