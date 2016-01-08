var zeromq = require('zmq');
var microtime = require('microtime');
var socket = zeromq.socket('pub');

var addresses = require('../util/get-local-ip-address.js')();
//// Original
socket.bindSync('epgm://' + addresses[0] + ';224.0.0.1:5555');

var msgId = 0;
var randomString = (Math.random()).toString(16);

setInterval(() => {
    console.log('<' + msgId + '> Sending message over socket');
    socket.send('roomId ' + msgId + ' ' + microtime.now());
    msgId++;
}, 1000);
