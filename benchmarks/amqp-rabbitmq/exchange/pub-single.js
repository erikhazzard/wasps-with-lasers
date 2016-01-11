var publisher = require('../util/publisher.js')({shouldLog: true});
var microtime = require('microtime');

var program = require('commander');
program
    .version('0.0.1')
    .option('-n, --numMessagesPerSecond [numMessagesPerSecond]', 'How many messages to publish per second')
    .option('-t, --timeout [timeout]', 'Length of time before publishing next message batch (in milliseconds, defaults to 1000, or 1 second)')
    .parse(process.argv);
/**
 * To publish more than 1 per second, increase this value. Note that the more
 * clients connected to the change feed, the fewer messages / sec can be
 * published with this
 */
var NUM_MESSAGES = isNaN(+program.numMessagesPerSecond) ? 1 : +program.numMessagesPerSecond;
var TIMEOUT = isNaN(+program.timeout) ? 1000 : +program.timeout;
var ROOM_KEY = 'roomId1';
var EXCHANGE = 'chatMessages';
var i = 0;
var msgId = 0;

setInterval(() => {
    for (i = NUM_MESSAGES; i > 0; i--) {
        publisher.publish(EXCHANGE, ROOM_KEY, msgId + ' ' + microtime.now());
        msgId++;
    }
}, TIMEOUT);
