'use strict';

const MESSAGE_ENUM = Object.freeze({
  SELF_CONNECTED: "SELF_CONNECTED",
  CLIENT_CONNECTED: "CLIENT_CONNECTED",
  CLIENT_DISCONNECTED: "CLIENT_DISCONNECTED",
  CLIENT_MESSAGE: "CLIENT_MESSAGE",
  SERVER_MESSAGE: "SERVER_MESSAGE",
});

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';
const decoder = new TextDecoder('utf-8');

const server = express()
  .use(express.static(__dirname + '/public/'))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });
var id = 1;
var SOCKETS = [];
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.username = "user" + id++;
  ws.status = "Idle";
  var clientsInfo = SOCKETS.map(s => { return { "name": s.username, "status": s.status }; });
  ws.send(JSON.stringify({type: MESSAGE_ENUM.SELF_CONNECTED, body: { name: ws.username, clients: clientsInfo }}));
  SOCKETS.forEach(s => {
    s.send(JSON.stringify({type: MESSAGE_ENUM.CLIENT_CONNECTED, body: { name: ws.username, status: ws.status }}));
  });
  // if (wss.clients.size > 2) {
  //   ws.close();
  // }
  SOCKETS.push(ws);
  ws.on('close', () => console.log('Client disconnected'));
  ws.on("message", (data) => {
    var clientMsg = JSON.parse(data)
    console.log(ws.username + " sent: " + data);

    switch(clientMsg.type) {
      case MESSAGE_ENUM.CLIENT_MESSAGE:
        var msg = {
            type: MESSAGE_ENUM.CLIENT_MESSAGE,
            sender: ws.username,
            body: clientMsg.body
        };
        if (msg.body.recipient)
          SOCKETS.find(s => s.username == msg.body.recipient).send(JSON.stringify(msg));
        else
          SOCKETS.forEach(s => s.send(JSON.stringify(msg)));
        break;
      default:
        console.log("Type: ", clientMsg.type);
        break;
    }
  });
  ws.on("close",() => {
    SOCKETS.splice(SOCKETS.indexOf(ws),1);
    SOCKETS.forEach(s => s.send(JSON.stringify({type: MESSAGE_ENUM.CLIENT_DISCONNECTED,body: { name: ws.username}})));
  })
});