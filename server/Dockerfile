# Use minimal Ubuntu base image
FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install curl, ffmpeg, Node.js (v18), and other dependencies
RUN apt-get update && \
    apt-get install -y curl ffmpeg build-essential && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the port your app listens on
EXPOSE 3001

# Run the app
CMD ["node", "index.js"]
