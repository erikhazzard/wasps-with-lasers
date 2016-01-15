/**
 *
 * sub-cluster
 *      Tests using cluster module to spawn multiple processes with mulitple
 *      clients
 */
require('events').EventEmitter.prototype._maxListeners = 90000;
process.setMaxListeners(90000);

var d3 = require('d3');
var _ = require('lodash');
var uuid = require('uuid');
var async = require('async');
var logger = require('bragi');
var cluster = require('cluster');
var microtime = require('microtime');
var ss = require('simple-statistics');
logger.transports.get('Console').property('showMeta', false);

/**
 * CONFIG
 */
var zmq = require('zmq');

var ROUTING_KEY = 'roomId1';

/**
 *
 * Results:
 *  Single message published:
 *      8 CPUs, 1 queue each (8 total): average ~5ms per message
 *      8 CPUs, 10 each (80 total): average ~10ms per message
 *      8 CPUs, 100 each (800 total): average: 44ms per message (min 10ms, max 84ms)
 *
 */
var program = require('commander');
program
    .version('0.0.1')
    .option('-n, --numConnections [numConnections]', 'How many connections per CPU', 'numConnections')
    .option('-c, --numCPUs [numCPUs]', 'How many CPUs', 'numCPUs')
    .option('-h, --hostSocket [hostSocket]', 'Full socket address, e.g., tcp://127.0.0.1:2002')
    .parse(process.argv);

var PORT = program.hostSocket ? program.hostSocket : 'tcp://127.0.0.1:2002';

var NUM_CONNECTIONS = isNaN(+program.numConnections) ? 1 : +program.numConnections;
var NUM_CPUS = isNaN(+program.numCPUs) ? 8 : +program.numCPUs;

if(cluster.isMaster){
    /**
     *
     * Master - fork processes
     *
     */
    var workers = [];
    for(var i = 0; i < NUM_CPUS; i++ ){
        workers.push(cluster.fork());
    }

    var totalMessagesReceived = 0;
    var totalMessagesReceivedLatest = 0;
    var times = [];
    var timesLatest = [];

    logger.log('cluster-master', 'Starting up with ' +
        NUM_CPUS + ' CPUs and ' + NUM_CONNECTIONS + ' connections per CPU ' +
        ' | ' + (NUM_CPUS * NUM_CONNECTIONS) + ' total queues on ' + PORT);

    _.each(workers, function (worker, index) {
        worker.on('message', function(message) {
            totalMessagesReceived++;
            totalMessagesReceivedLatest++;
            times.push(message.time);
            timesLatest.push(message.time);
        });
    });

    // Log info every second
    setInterval(() => {
        logger.log('cluster-master', 'Got ' +
            d3.format(',')(totalMessagesReceivedLatest) + ' messages - <' +
            d3.format(',')(totalMessagesReceived) + '> total');
        logger.log('cluster-master', '\t MIN (current): ' + ss.min(timesLatest) + 'ms');
        logger.log('cluster-master', '\t MAX (current): ' + ss.max(timesLatest) + 'ms');
        logger.log('cluster-master', '\t MEAN (current): ' + ss.mean(timesLatest) + 'ms');
        logger.log('cluster-master', '\t HARMONIC MEAN (current): ' + ss.harmonicMean(timesLatest) + 'ms');
        logger.log('cluster-master', '\t MIN: ' + ss.min(times) + 'ms');
        logger.log('cluster-master', '\t MAX: ' + ss.max(times) + 'ms');
        logger.log('cluster-master', '\t MEAN: ' + ss.mean(times) + 'ms');
        logger.log('cluster-master', '\t HARMONIC MEAN: ' + ss.harmonicMean(times) + 'ms');

        totalMessagesReceivedLatest = 0;
        timesLatest = [];
    }, 1000);

} else {
    async.eachLimit(
        _.range(NUM_CONNECTIONS),
        20,
        function (connectionIndex, cb) {
            var socket = zmq.socket('sub');
            socket.connect(PORT);
            socket.subscribe(ROUTING_KEY);

            setImmediate(() => {
                if (connectionIndex > 1 && connectionIndex % (NUM_CONNECTIONS / 10) === 0) {
                    logger.log('worker/bound/' + process.pid,
                    '<' + ((connectionIndex / NUM_CONNECTIONS) * 100) +
                    '% done> Bound to queue. Waiting for messages...');
                }

                var messagesReceived = 0;
                socket.on('message', function gotMessage (msg) {
                    messagesReceived++;
                    // console.log(messagesReceived + ' messages received');
                    msg = msg.toString().split(' ');
                    var diff = (microtime.now() - msg[2]) / 1000;
                    messagesReceived++;

                    process.send({
                        messagesReceived: messagesReceived,
                        time: diff
                    });
                });

                return setTimeout(cb, 250 * Math.random() | 0);
            });
        },
        function (){
            logger.log('worker/bound/' + process.pid,
            d3.format(',')(NUM_CONNECTIONS) +
            ' connections bound to queue. Waiting for messages...');
        });
}
