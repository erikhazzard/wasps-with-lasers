var zeromq = require('zmq');
var microtime = require('microtime');
// ZMQ config
var socket = zeromq.socket('pub');

var program = require('commander');
program
    .version('0.0.1')
    .option('-n, --numMessagesPerSecond [numMessagesPerSecond]', 'How many messages to publish per second')
    .option('-t, --timeout [timeout]', 'Length of time before publishing next message batch (in milliseconds, defaults to 1000, or 1 second)')
    .option('-p, --numPasses [numPasses]', 'If provided, will stop after n passes (after messages have been published p times)')
    .option('-h, --hostSocket [hostSocket]', 'Full socket address, e.g., tcp://127.0.0.1:2002')
    .parse(process.argv);
/**
 * To publish more than 1 per second, increase this value. Note that the more
 * clients connected to the change feed, the fewer messages / sec can be
 * published with this
 */
var NUM_MESSAGES = isNaN(+program.numMessagesPerSecond) ? 1 : +program.numMessagesPerSecond;
var NUM_PASSES = isNaN(+program.numPasses) ? Infinity : +program.numPasses;
var TIMEOUT = isNaN(+program.timeout) ? 1000 : +program.timeout;

var PORT = program.hostSocket ? program.hostSocket : 'tcp://127.0.0.1:2002';
socket.bindSync(PORT);

var ROUTING_KEY = 'roomId1';

var msgId = 0;
var curPass = 0;

console.log('Running with ' + NUM_MESSAGES + ' messages / ' +
    TIMEOUT + 'ms | ' + NUM_PASSES + ' passes to: ' + PORT);

setTimeout(() => {
/**
 * Start publisher
 */
var pubInterval = setInterval(() => {
    var i = 0;
    curPass++;

    for (i = NUM_MESSAGES; i > 0; i--) {
        console.log('publish', '[' + msgId + '] published message');
        socket.send(ROUTING_KEY + ' ' + msgId + ' ' + microtime.now());
        msgId++;
    }

    // exit process if we've reached the number of passes
    if (curPass >= NUM_PASSES) {
        clearInterval(pubInterval);
        setTimeout(() => {
            return process.exit(1);
        }, 500);
    }
}, TIMEOUT);

}, 1000); // call publisher after a short delay
