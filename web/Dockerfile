FROM node:22.12.0

WORKDIR /server

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "streamingserver.js"]
