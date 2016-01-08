/**
 *
 * sub-cluster
 *      Tests using cluster module to spawn multiple processes with mulitple
 *      clients
 */
var d3 = require('d3');
var _ = require('lodash');
var uuid = require('uuid');
var logger = require('bragi');
var cluster = require('cluster');
var microtime = require('microtime');
var ss = require('simple-statistics');
logger.transports.get('Console').property('showMeta', false);

var zmq = require('zmq');
var socket = zmq.socket('sub');

//var port = 'tcp://127.0.0.1:2002';
var port = 'inproc://127.0.0.1:2002';

/**
 * CONFIG
 */
var subKey = 'roomId';

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
    .parse(process.argv);

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
    var times = [];
    var start = microtime.now();

    logger.log('cluster-master', 'Starting up with ' +
        NUM_CPUS + ' CPUs and ' + NUM_CONNECTIONS + ' connections per CPU ' +
        ' | ' + (NUM_CPUS * NUM_CONNECTIONS) + ' total queues');

    _.each(workers, function (worker) {
        worker.on('message', function(message) {
            if (totalMessagesReceived % (NUM_CPUS * NUM_CONNECTIONS) === 1) {
                logger.log('cluster-master', '>> Restarting timer: ' + totalMessagesReceived);
                start = microtime.now();
            }

            totalMessagesReceived++;
            times.push(message.time);

            // reset
            if (totalMessagesReceived % (NUM_CPUS * NUM_CONNECTIONS) === 0) {
                logger.log('cluster-master', '[' + ((microtime.now() - start) / 1000) +
                    'ms] Got ' + d3.format(',')(NUM_CPUS * NUM_CONNECTIONS) +
                    ' messages - <' +
                    d3.format(',')(totalMessagesReceived) + '> total');
                logger.log('cluster-master', '\t MIN: ' + ss.min(times) + 'ms');
                logger.log('cluster-master', '\t MAX: ' + ss.max(times) + 'ms');
                logger.log('cluster-master', '\t MEAN: ' + ss.mean(times) + 'ms');
                logger.log('cluster-master', '\t HARMONIC MEAN: ' + ss.harmonicMean(times) + 'ms');
                start = microtime.now();
            }
        });
    });

} else {
    _.each(_.range(NUM_CONNECTIONS), function (connectionIndex) {
        var messageTimings = [];

        socket.identity = 'subscriber' + uuid.v4();

        socket.connect(port);
        socket.subscribe(subKey);

        logger.log('sub:' + process.pid, 'Bound to queue. Waiting for messages...');

        var previousId = -1;
        var messagesReceived = 0;

        socket.on('message', function(data) {
            var msg = data.toString().split(' ');
            var diff = (microtime.now() - msg[2]) / 1000;
            messagesReceived++;

            // logger.log('sub:message:' + process.pid, '<' + msg[1] + '> [' + diff + 'ms] Message received');
            previousId = msg[1];

            process.send({
                messagesReceived: messagesReceived,
                time: diff
            });
        });
    });
}
