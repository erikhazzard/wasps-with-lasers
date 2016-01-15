/**
 *
 * sub-cluster
 *      Tests using cluster module to spawn multiple processes with mulitple
 *      clients
 */
var d3 = require('d3');
var _ = require('lodash');
var uuid = require('uuid');
var async = require('async');
var logger = require('bragi');
var cluster = require('cluster');
var microtime = require('microtime');
var ss = require('simple-statistics');
logger.transports.get('Console').property('showMeta', false);

var r = require('rethinkdb');
var CONNECT_CONFIG = {host: 'localhost', port: 28015};

/**
 * CONFIG
 */
var TABLE_NAME = 'messages';

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
    .option('-n, --numConnections [numConnections]', 'How many connections per CPU')
    .option('-c, --numCPUs [numCPUs]', 'How many CPUs')
    .option('-h, --host [host]', 'RethinkBD host')
    .option('-p, --port [port]', 'RethinkBD port')
    .parse(process.argv);

var NUM_CONNECTIONS = isNaN(+program.numConnections) ? 1 : +program.numConnections;
var NUM_CPUS = isNaN(+program.numCPUs) ? 8 : +program.numCPUs;
if (program.host) { CONNECT_CONFIG.host = program.host; }
if (program.port) { CONNECT_CONFIG.port = program.port; }

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
    var numRows = 0;
    var times = [];
    var timesLatest = [];

    logger.log('cluster-master', 'Starting up with ' +
        NUM_CPUS + ' CPUs and ' + NUM_CONNECTIONS + ' connections per CPU ' +
        ' | ' + (NUM_CPUS * NUM_CONNECTIONS) + ' total queues');

    _.each(workers, function (worker) {
        worker.on('message', function(message) {
            numRows += message.rowLength;
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
            d3.format(',')(numRows) + '> number of rows (squashed) ' +
            d3.format(',')(totalMessagesReceived) + '> total');
        logger.log('cluster-master', '\t MIN (current): ' + ss.min(timesLatest) + 'ms');
        logger.log('cluster-master', '\t MAX (current): ' + ss.max(timesLatest) + 'ms');
        logger.log('cluster-master', '\t MEAN (current): ' + ss.mean(timesLatest) + 'ms');
        logger.log('cluster-master', '\t HARMONIC MEAN (current): ' + ss.harmonicMean(timesLatest) + 'ms');

        /*
        logger.log('cluster-master', '\t MIN: ' + ss.min(times) + 'ms');
        logger.log('cluster-master', '\t MAX: ' + ss.max(times) + 'ms');
        logger.log('cluster-master', '\t MEAN: ' + ss.mean(times) + 'ms');
        logger.log('cluster-master', '\t HARMONIC MEAN: ' + ss.harmonicMean(times) + 'ms');
        */

        totalMessagesReceivedLatest = 0;
        timesLatest = [];
        numRows = 0;
    }, 1000);


} else {
    /**
     * Setup C * N change feed listeners
     *
     * NOTES: If the limit is set to much above 20, rethink will always throw
     * errors. e.g., if the eachLimit limit value is 100, we will see:
     *
     *
     * Unhandled rejection ReqlDriverError: First argument to `run` must be an open connection.
    at ReqlDriverError.ReqlError [as constructor] (/[...]/node_modules/rethinkdb/errors.js:23:13)
    at new ReqlDriverError (/[...]/node_modules/rethinkdb/errors.js:68:50)
    at Changes.TermBase.run (/[...]/node_modules/rethinkdb/ast.js:129:29)
    ...
     *
     */
    async.eachLimit(
        _.range(NUM_CONNECTIONS),
        // if we set to much higher, rethink will always throw connection errors
        20,
        function setupConnection (connectionIndex, cb) {
            var connection;
            var messagesReceived = 0;
            var previousId = -1;

            r.connect(CONNECT_CONFIG, function(err, conn) {
                connection = conn;

                // spit out progress at 10 % intervals
                if (connectionIndex > 1 && connectionIndex % (NUM_CONNECTIONS / 10) === 0) {
                    logger.log('worker:bound:' + process.pid,
                    '<' + ((connectionIndex / NUM_CONNECTIONS) * 100) +
                    '% done> Bound to queue. Waiting for messages...');

                }

                // Listen for changes
                r.table(TABLE_NAME).changes({
                    // squash: true
                }).run(connection, function(err, cursor) {
                    cursor.each(function(err, row) {
                        if (err) { console.log('ERROR: ' + err); }

                        var diff = (microtime.now() - row.new_val.date) / 1000;
                        messagesReceived++;

                        process.send({
                            messagesReceived: messagesReceived,
                            rowLength: row.length,
                            time: diff
                        });
                    });
                });

                return setTimeout(cb, Math.random() * 200 | 0);
            });
    }, function (){
        logger.log('worker:bound:' + process.pid,
        'Done! Waiting for messages');
    });
}
