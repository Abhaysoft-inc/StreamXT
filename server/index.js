import express from 'express'
import http from 'http'

const app = express();
const server = http.createServer(app);





server.listen(3001, () => {
    console.log("Server is running on port 3000")
})