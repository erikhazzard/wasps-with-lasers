var zeromq = require('zmq');
var microtime = require('microtime');
var socket = zeromq.socket('pub');

socket.bindSync('ipc://test');

var msgId = 0;
var randomString = (Math.random()).toString(16);

setInterval(() => {
    console.log('<' + msgId + '> Sending message over socket');
    socket.send('roomId ' + msgId + ' ' + microtime.now());
    msgId++;
}, 1000);
