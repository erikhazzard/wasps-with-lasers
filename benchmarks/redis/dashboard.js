/**
 *
 * Dashboard
 *  Subscriber dashboard
 *
 */

process.setMaxListeners(0);
require('events').EventEmitter.prototype._maxListeners = 10000;

var d3 = require('d3');
var _ = require('lodash');
var uuid = require('uuid');
var redis = require('redis');
var async = require('async');
var logger = require('bragi');
var cluster = require('cluster');
var microtime = require('microtime');
var ss = require('simple-statistics');
logger.transports.get('Console').property('showMeta', false);

var setupDashboard = require('./setup-dashboard.js');

/**
 *
 * Get command line options
 *
 */
var program = require('commander');
program
    .version('0.0.1')
    .option('-c, --numCPUs [numCPUs]', 'How many CPUs (processes) to launch')
    .option('-n, --numConnections [numConnections]', 'How many connections per CPU')
    .option('-H, --host [host]', 'Service host')
    .option('-P, --port [port]', 'Service port')
    .option('-C, --cluster [cluster]', 'Should cluster? (For redis clustered) True or false')
    .parse(process.argv);

if (program.host) { CONNECT_CONFIG.host = program.host; }
if (program.port) { CONNECT_CONFIG.port = program.port; }
var NUM_CONNECTIONS = isNaN(+program.numConnections) ? 1 : +program.numConnections;
var NUM_CPUS = isNaN(+program.numCPUs) ? 8 : +program.numCPUs;

var CONNECT_CONFIG = {host: 'localhost', port: 6379};
CONNECT_CONFIG.host = CONNECT_CONFIG.host || 'localhost';
CONNECT_CONFIG.port = CONNECT_CONFIG.port || 6379;

var USE_CLUSTER = false;
if (program.cluster || ('' + program.cluster).toLowerCase() === 'true') { USE_CLUSTER = true; }
var TABLE_NAME = 'messages';

if(cluster.isMaster){
    /**
     *
     * Master
     *
     */

    var workers = [];
    for(var i = 0; i < NUM_CPUS; i++ ){
        workers.push(cluster.fork());
    }

    /**
     *
     * Right Side - command info
     *
     */
    var dashboard = setupDashboard({
        commandArguments: {
            NUM_CPUS: NUM_CPUS,
            NUM_CONNECTIONS: NUM_CONNECTIONS,
            CONNECT_CONFIG: CONNECT_CONFIG
        }
    });

    /**
     *
     * Listen for worker messages
     *
     */
    var numWorkersConnected = 0;
    var totalMessagesReceived = 0;
    var totalMessagesReceivedLatest = 0;
    var times = [];
    var timesLatest = [];
    var minCurrent = Infinity;
    var maxCurrent = 0;
    var minAll = Infinity;
    var maxAll = 0;

    _.each(workers, function (worker) {
        worker.on('message', function (message) {
            if (message.messageType === 'workerConnectedComplete') {
                numWorkersConnected++;

                if (numWorkersConnected >= NUM_CPUS) {
                    // all done
                }

            } else if (message.messageType === 'updateLog') {
                dashboard.update({
                    type: 'log',
                    options: { message: message.message }
                });

            } else if (message.messageType === 'clientUpdate') {
                totalMessagesReceived += message.messagesReceived;
                totalMessagesReceivedLatest += message.messagesReceived;

                if (message.minTime < minCurrent) { minCurrent = message.minTime; }
                if (message.maxTime > maxCurrent) { maxCurrent = message.maxTime; }
                if (message.minTime < minAll) { minAll = message.minTime; }
                if (message.maxTime > maxAll) { maxAll = message.maxTime; }
            }
        });
    });


    // Update dashboard every second
    setInterval(() => {
        dashboard.update({
            type: 'table',
            options: {
                totalMessagesReceivedLatest: totalMessagesReceivedLatest,
                totalMessagesReceived: totalMessagesReceived,
                minAll: minAll,
                maxAll: maxAll,
                minCurrent: minCurrent,
                maxCurrent: maxCurrent
            }
        });

        totalMessagesReceivedLatest = 0;
        timesLatest = [];
        minCurrent = Infinity;
        maxCurrent = 0;
    }, 1000);


    /**
     *
     * Close
     *
     */
    function close () {
        logger.log('cluster-master', 'Total received: ' + totalMessagesReceived);
        logger.log('cluster-master', '\t MIN: ' + minAll + 'ms');
        logger.log('cluster-master', '\t MAX: ' + maxAll + 'ms');
        logger.log('cluster-master', '\t MEAN: ' + ss.mean(times) + 'ms');

        return process.exit(1);
    }

    process.on('SIGINT', close);
    process.on('SIGHUP', close);
    process.on('SIGTERM', close);
    process.on('uncaughtException', function (err) {
        logger.log('error:master', 'uncaught error: ' + err.stack);
        return close();
    });


} else {
    /**
     *
     * Worker
     *
     */
    // ioredis
    var Redis = require('ioredis');
    var client;

    if (USE_CLUSTER) {
        client = new Redis.Cluster([
            { port: 7000, host: CONNECT_CONFIG.host },
            { port: 7001, host: CONNECT_CONFIG.host },
            { port: 7002, host: CONNECT_CONFIG.host }
        ]);

    } else {
        client = new Redis({
            port: CONNECT_CONFIG.port,
            host: CONNECT_CONFIG.host
        });
    }

    var messagesReceived = 0;
    var previousId = -1;
    var times = [];
    var minTime = Infinity;
    var maxTime = 0;


    // send message to worker process every ~1 second
    setInterval(function sendInfoToMaster () {
        process.send({
            messageType: 'clientUpdate',
            messagesReceived: messagesReceived,
            times: times,
            minTime: minTime,
            maxTime: maxTime
        });

        times = [];
        minTime = Infinity;
        maxTime = 0;
        messagesReceived = 0;
    }, 450);

    var lastDiff = 0;
    setInterval(function sendLog () {
        if (Math.random() < 0.2) {
            if (lastDiff !== 0) {
                process.send({
                    messageType: 'updateLog',
                    message: lastDiff + 'ms'
                });
                lastDiff = 0;
            }
        }
    }, 300);


    client.on('connect', function () {
        async.eachLimit(
            _.range(NUM_CONNECTIONS),
            20,
            function setupConnection (connectionIndex, cb) {
                /**
                 * Listen for messages over subscriber service
                 */
                client.on('message', function (channel, message) {
                    var diff = (microtime.now() - +message) / 1000;
                    lastDiff = diff;
                    messagesReceived++;
                    // times.push(diff);
                    if (diff < minTime) { minTime = diff; }
                    if (diff > maxTime) { maxTime = diff; }
                });

                // could sub to multiple rooms here
                client.subscribe(TABLE_NAME, function () {
                    return setTimeout(cb, Math.random() * 10 | 0);
                });

        }, function (){
            process.send({ messageType: 'workerConnectedComplete' });
        });
    });
}
