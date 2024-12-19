const express = require('express');
const ioRedis = require('ioredis');
const http = require('http');
const app  = express();
app.use(express.json);
const server = http.createServer(app);
require('dotenv').config();
const socket = require('socket.io')
const io = socket(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const client =  new ioRedis(6379,'127.0.0.1');
const redis = require("socket.io-redis");
const {socketConnection} = require("./socketServer");

io.adapter(redis({ host: 'localhost', port: 6379 }))


client.on('connect', function() {
    console.log('Connected to Redis');
});
client.on('ready', function () {
    console.log('Redis client is ready');
});
client.on('error', function (err) {
    console.error('Redis error:', err);
});
client.subscribe('message');
client.on('subscribe', function (channel, count) {
    console.log('Subscribed to channel:', channel);
});
client.on('message', function (channel, message) {
    message = JSON.parse(message)
    if (message){
        const dataObject = message.data;
        const {channelName,data} = dataObject;
        io.emit(channelName,JSON.stringify(data));

    }
    console.log(message)
});
socketConnection(io).then((io)=>{
    console.log('socket connected!!!!')
});
var broadcastPort = 3001;
server.listen(broadcastPort, function () {
    console.log('Socket server is running.');
});