# StreamXT


StreamXT is a modern web-based streaming platform that allows users to easily stream content to various platforms including YouTube. Built with Next.js and Socket.IO, it provides a seamless streaming experience with a beautiful UI and powerful backend capabilities.

## ✨ Features

- **YouTube Streaming**: Stream directly to YouTube using your stream key
- **Video Recording**: Record high-quality video content
- **Customizable Layouts**: Choose from various layouts for your streams
- **Real-time Communication**: Built with Socket.IO for real-time data transfer
- **Dockerized Backend**: Containerized streaming server for easy deployment
- **Beautiful UI**: Modern, responsive interface built with React and Next.js
- **Authentication**: Secure user authentication with Clerk

## 🛠️ Technologies

- **Frontend**: React, Next.js, Framer Motion
- **Backend**: Node.js, Express, Socket.IO
- **Containerization**: Docker
- **Streaming**: FFmpeg
- **Authentication**: Clerk
- **Styling**: TailwindCSS with RadixUI components
- **Forms**: React Hook Form

## 📋 Prerequisites

- Node.js 18.x or higher
- Docker and Docker Compose
- A YouTube account with streaming enabled (for YouTube streaming functionality)

## 🚀 Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Abhaysoft-inc/streamXT.git
   cd streamXT
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

4. Build the streaming server:
   ```bash
   cd server
   docker compose build
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Start the streaming server:
   ```bash
   cd server
   docker compose up
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Usage

1. Sign up or sign in using the authentication system
2. Navigate to the dashboard to access streaming features
3. To stream to YouTube:
   - Go to the "Stream to YouTube" section
   - Enter your YouTube stream key
   - Configure your stream settings
   - Start streaming!

## 🌐 Project Structure

- `/src`: Frontend code
  - `/app`: Next.js app directory with page components
  - `/components`: React components
  - `/api`: API routes
  - `/handlers`: Event handlers
  - `/lib`: Utility functions
- `/server`: Backend streaming server code
- `/public`: Static assets
- `/designs`: Design assets

## 👨‍💻 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Socket.IO](https://socket.io/)
- [FFmpeg](https://ffmpeg.org/)
- [Docker](https://www.docker.com/)
- [Clerk](https://clerk.dev/)

## 📞 Contact

Abhay Vishwakarma - [GitHub](https://github.com/Abhaysoft-inc)

Project Link: [https://github.com/Abhaysoft-inc/streamXT](https://github.com/Abhaysoft-inc/streamXT)