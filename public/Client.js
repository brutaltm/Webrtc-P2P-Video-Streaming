const MESSAGE_ENUM = Object.freeze({
  SELF_CONNECTED: "SELF_CONNECTED",
  CLIENT_CONNECTED: "CLIENT_CONNECTED",
  CLIENT_DISCONNECTED: "CLIENT_DISCONNECTED",
  CLIENT_MESSAGE: "CLIENT_MESSAGE",
  SERVER_MESSAGE: "SERVER_MESSAGE",
});
//const localVideo = document.getElementById('localVideo');
const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
const lanOnly = true;
let localStream;
let remoteStream;
var alreadySendOne = false;
var ignoreOffers = false;

document.getElementById("localButton").onclick = () => getLocalVideo();
document.getElementById("localVideoButton").onclick = () => getLocalVideoFromSrc();
document.getElementById("offerButton").onclick = () => zaoferuj();
document.getElementById("displayStreamButton").onclick = () => recordScreen();
document.getElementById("reStreamButton").onclick = () => {
  localStream = remoteStream;
  console.log(localStream);
}
//const ws = createConnection("localhost",7777);
let HOST = location.origin.replace(/^http/, 'ws')
console.log("WS Server IP: "+HOST);

const configuration = lanOnly ? {} : {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
let peerConnection = createRTCConnection(), connection2;

let ws = createConnection(HOST);
//isStunAddressUp("stun.l.google.com:19302", 5000).then(result => console.log(result));

//getLocalVideoFromSrc();
var id = 1;

function getPeerConnection() {
  return peerConnection;
}

function createRTCConnection() {
  let peerConnection2 = new RTCPeerConnection(configuration);
  peerConnection2.identyfikator = id++;
  peerConnection2.addEventListener('icecandidate', event => {
    console.log("Nie wysyłam tego: ",event.candidate);
    if (event.candidate/* && !alreadySendOne*/) {
      alreadySendOne = true;
      console.log("New ice candidate: ",event.candidate);
      ws.send(JSON.stringify({ type: MESSAGE_ENUM.CLIENT_MESSAGE, body: { subject: "newIceCandidate", candidate: event.candidate } }));
    }
  });
  peerConnection2.addEventListener("track", event => {
    console.log("Przyszedł stream: ",event);
    remoteStream = event.streams[0];
    remoteVideo.srcObject = event.streams[0];
    // const [remoteStream1] = event.streams;
    
    // remoteVideo.srcObject = remoteStream1;
    console.log(remoteVideo);
    setTimeout(() => peerConnection = createRTCConnection(),5000);
  });
  return peerConnection2;
}

function getLocalVideoFromSrc() {
  document.getElementById("localButton").disabled = true;
  localVideo.src="chrome.webm";
  if (localVideo.captureStream) {
    localStream = localVideo.captureStream();
    console.log('Captured stream from leftVideo with captureStream',localStream);
  } else 
  if (localVideo.mozCaptureStream) {
    localStream = localVideo.mozCaptureStream();
    console.log('Captured stream from leftVideo with mozCaptureStream()',localStream);
  } else {
    console.log("Couldn't capture stream.");
  }
  if (localStream) { 
    console.log("localStream",localStream);
    localVideo.oncanplay = () => {
      //remoteVideo.srcObject = localStream;
      // localStream.getTracks().forEach(t => {
      //   console.log("track: ",t);
      //   peerConnection.addTrack(t, localStream);
      // });
    }
    
  }
}

function getLocalVideo() {
  document.getElementById("localButton").disabled = true;
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      localVideo.srcObject = stream;
      localStream = stream;
      console.log("Lokalny Stream: ",localStream);
      // localStream.getTracks().forEach(t => {
      //   peerConnection.addTrack(t, localStream);
      // });
      //peerConnection.addStream(localStream);
      //zaoferuj();
    })
    .catch(reason => {
      console.log("Nieudało się przechwycić kamery " + reason);
    });
}

function zaoferuj(recipient) {
  localStream.getTracks().forEach(t => {
    peerConnection.addTrack(t, localStream);
  });
  peerConnection.createOffer({
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
  }).then(desc => {
    peerConnection.setLocalDescription(desc).then((description) => {
      ws.send(JSON.stringify({ type: MESSAGE_ENUM.CLIENT_MESSAGE, body: { subject: "offer", offer: desc, recipient: recipient } }));
    })
  });
}

function createConnection(serverIP) {
  var username = "";
  var table = document.createElement("table");
  table.id = "clientsTable";
  document.body.append(table);
  const ws = new WebSocket(serverIP);
  ws.onopen = evt => {
    console.log("Otwarte połączenie.");
  };
  ws.onmessage = evt => {
    let peerConnection = getPeerConnection();
    let msg = JSON.parse(evt.data);
    if (msg.sender == username) return;
    switch(msg.type) {
      case MESSAGE_ENUM.SELF_CONNECTED:
        console.log(`You are connected! Your username is ${msg.body.name}`);
        username = msg.body.name;
        if (msg.body.clients.length == 0) break;

        var row = document.createElement("tr");
        for (const prop in msg.body.clients[0]) {
          var th = document.createElement("th");
          th.innerHTML = (prop+"").toUpperCase();
          row.append(th);
        }
        var th = document.createElement("th");
        th.innerHTML = "OPTIONS";
        row.append(th);
        table.append(row);

        msg.body.clients.forEach(c => {
          var r = document.createElement("tr");
          for (const prop in c) {
            var td = document.createElement("td");
            td.innerHTML = c[prop];
            r.appendChild(td);
          }
          var td = document.createElement("td");
          var button = document.createElement("button");
          button.innerHTML = "Send";
          button.onclick = () => zaoferuj(c.name);
          td.append(button);
          r.append(td);
          table.append(r);
        })
        break;
      case MESSAGE_ENUM.CLIENT_CONNECTED:
        console.log(`${msg.body.name} has connected.`);
        if (table.children.length == 0) {
          var row = document.createElement("tr");
          for (const prop in msg.body) {
            var th = document.createElement("th");
            th.innerHTML = (prop+"").toUpperCase();
            row.append(th);
          }
          var th = document.createElement("th");
          th.innerHTML = "OPTIONS";
          row.append(th);
          table.append(row);
        }
        var r = document.createElement("tr");
        for (const prop in msg.body) {
          var td = document.createElement("td");
          td.innerHTML = msg.body[prop];
          r.appendChild(td);
        }
        var td = document.createElement("td");
        var button = document.createElement("button");
        button.innerHTML = "Send";
        button.onclick = () => zaoferuj(msg.body.name);
        td.append(button);
        r.append(td);
        table.append(r);
        break;
      case MESSAGE_ENUM.CLIENT_DISCONNECTED:
        console.log(`${msg.body.name} has disconnected.`);
        var children = Array.from(table.children);
        children.find(r => r.firstChild.innerHTML == msg.body.name).remove();
        break;
      case MESSAGE_ENUM.CLIENT_MESSAGE:
        console.log("Message: ",msg.body.subject);
        if (ignoreOffers === true) return;
        switch(msg.body.subject) {
          case "offer":
            console.log(`Got offer from ${msg.sender}: ${msg.body.offer}`);
            peerConnection.setRemoteDescription(new RTCSessionDescription(msg.body.offer));
            peerConnection.createAnswer().then(desc => {
              desc.sdp = desc.sdp.replace('useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=510000');
              var arr = desc.sdp.split('\r\n');
              arr.forEach((str, i) => {
                if (/^a=fmtp:\d*/.test(str)) {
                  arr[i] = str + ';x-google-max-bitrate=10000;x-google-min-bitrate=0;x-google-start-bitrate=6000';
                } else if (/^a=mid:(1|video)/.test(str)) {
                  arr[i] += '\r\nb=AS:10000';
                }
              });
              desc.sdp = arr.join('\r\n');
              peerConnection.setLocalDescription(desc).then(
                () => ws.send(JSON.stringify({ type: MESSAGE_ENUM.CLIENT_MESSAGE, body: { subject: "answer", answer: desc, recipient: msg.sender } }))
              );
            });
            break;
          case "answer":
            console.log(`Got answer from ${msg.sender}.`);
            const remoteDesc = new RTCSessionDescription(msg.body.answer);
            peerConnection.setRemoteDescription(remoteDesc);
            peerConnection.addEventListener('connectionstatechange', event => {
              console.log("Coś się zmieniło: ", event, peerConnection.connectionState);
              
            });
            break;
          case "newIceCandidate":
            peerConnection.addEventListener('connectionstatechange', event => {
              console.log("Coś się zmieniło: ", event, peerConnection.connectionState);
            });
            peerConnection.addIceCandidate(msg.body.candidate)
            .then(() => console.log("Added ice candidate: ", msg.body.candidate))
            .catch(reason => console.log("Error adding Ice Candidate " + reason));
            //ignoreOffers = true;
            break;
        }
        break;
    }
  };
  ws.onclose = evt => {
    console.log("Connection closed");
    table.replaceChildren();
  };
  return ws;
}

async function recordScreen() {
  localStream = await navigator.mediaDevices.getDisplayMedia({
      audio: { 
        autoGainControl: false,
        channelCount: 2,
        echoCancellation: false,
        googAutoGainControl: false,
        latency: 0,
        noiseSuppression: false,
        sampleRate: 48000,
        sampleSize: 16,
        volume: 1.0
      },
      video: { 
        mediaSource: "screen",
        frameRate: { ideal: 60, max: 60 }
      }
  });
  return localStream;
}
