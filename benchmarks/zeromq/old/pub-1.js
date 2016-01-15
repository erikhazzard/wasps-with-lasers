var zeromq = require('zmq');
var microtime = require('microtime');
var socket = zeromq.socket('pub');

socket.bindSync('tcp://127.0.0.1:2002');

var msgId = 0;
var randomString = (Math.random()).toString(16);

setInterval(() => {
    console.log('<' + msgId + '> Sending message over socket');
    socket.send('roomId ' + msgId + ' ' + microtime.now());
    msgId++;
}, 1000);
