"use strict";

/**
 *
 * sub-cluster
 *      Tests using cluster module to spawn multiple processes with mulitple
 *      clients
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

var CONNECT_CONFIG = {host: 'localhost', port: 6379};

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
    .option('-H, --host [host]', 'RethinkBD host')
    .option('-P, --port [port]', 'RethinkBD port')
    .option('-C, --cluster [cluster]', 'Should cluster? True or false')
    .parse(process.argv);

var NUM_CONNECTIONS = isNaN(+program.numConnections) ? 1 : +program.numConnections;
var NUM_CPUS = isNaN(+program.numCPUs) ? 8 : +program.numCPUs;
if (program.host) { CONNECT_CONFIG.host = program.host; }
if (program.port) { CONNECT_CONFIG.port = program.port; }
CONNECT_CONFIG.host = CONNECT_CONFIG.host || 'localhost';
CONNECT_CONFIG.port = CONNECT_CONFIG.port || 6379;
var USE_CLUSTER = false;
if (program.cluster || ('' + program.cluster).toLowerCase() === 'true') { USE_CLUSTER = true; }

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
    var minCurrent = Infinity;
    var maxCurrent = 0;
    var minAll = Infinity;
    var maxAll = 0;

    logger.log('cluster-master',
        'Connecting to ' + CONNECT_CONFIG.host + ':' + CONNECT_CONFIG.port + ' || ' +
        'Starting up with ' +
        NUM_CPUS + ' CPUs and ' + NUM_CONNECTIONS + ' connections per CPU ' +
        ' | ' + (NUM_CPUS * NUM_CONNECTIONS) + ' total queues');

    _.each(workers, function (worker) {
        worker.on('message', function(message) {
            totalMessagesReceived += message.times.length;
            totalMessagesReceivedLatest += message.times.length;
            timesLatest = timesLatest.concat(message.times);

            if (message.minTime < minCurrent) { minCurrent = message.minTime; }
            if (message.maxTime > maxCurrent) { maxCurrent = message.maxTime; }
            if (message.minTime < minAll) { minAll = message.minTime; }
            if (message.maxTime > maxAll) { maxAll = message.maxTime; }

            // TODO: add this back in - removed now for performance
            // times.push(message.time);
        });
    });

    // Log info every second
    setInterval(() => {
        logger.log('cluster-master', 'Got ' +
           d3.format(',')(totalMessagesReceivedLatest) + ' messages / sec - ' +
            d3.format(',')(totalMessagesReceived) + '> total');
        logger.log('cluster-master', '\t MIN (ALL): ' + minAll + 'ms');
        logger.log('cluster-master', '\t MAX (ALL: ' + maxAll + 'ms');

        logger.log('cluster-master', '\t MIN (current): ' + minCurrent + 'ms');
        logger.log('cluster-master', '\t MAX (current): ' + maxCurrent + 'ms');
        // logger.log('cluster-master', '\t MEAN (current): ' + ss.mean(timesLatest) + 'ms');

        totalMessagesReceivedLatest = 0;
        timesLatest = [];
        numRows = 0;
        minCurrent = Infinity;
        maxCurrent = 0;
    }, 1000);

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
    // var client = require('./redis-client.js');

    // ioredis
    var Redis = require('ioredis');
    var client;

    if (USE_CLUSTER) {
        client = new Redis.Cluster([{
            port: 7000,
            host: CONNECT_CONFIG.host
        }, {
            port: 7001,
            host: CONNECT_CONFIG.host
        }, {
            port: 7002,
            host: CONNECT_CONFIG.host
        }
        ]);

    } else {
        client = new Redis({
            port: CONNECT_CONFIG.port,
            host: CONNECT_CONFIG.host
        });
    }

    client.on('error', function (err) { console.log(err); });
    client.on('disconnect', function (err) { console.log('disconnected'); });
    client.on('reconnect', function (err) { console.log('reconnect'); });
    client.on('connect', function () { 
        console.log('connected');

        async.eachLimit(
            _.range(NUM_CONNECTIONS),
            // if we set to much higher, rethink will always throw connection errors
            20,
            function setupConnection (connectionIndex, cb) {
                var messagesReceived = 0;
                var previousId = -1;
                var times = [];
                var minTime = Infinity;
                var maxTime = 0;

                // spit out progress at 10 % intervals
                if (connectionIndex > 1 && connectionIndex % (NUM_CONNECTIONS / 10) === 0) {
                    logger.log('worker:bound:' + process.pid,
                    '<' + ((connectionIndex / NUM_CONNECTIONS) * 100) +
                    '% done> Bound to queue. Waiting for messages...');
                }

                client.on('message', function (channel, message) {
                    var diff = (Date.now() * 1000 - +message) / 1000;
                    messagesReceived++;

                    times.push(diff);
                    if (diff < minTime) { minTime = diff; }
                    if (diff > maxTime) { maxTime = diff; }

                    if (messagesReceived % 500 === 0) {
                        process.send({
                            messagesReceived: messagesReceived,
                            times: times,
                            minTime: minTime,
                            maxTime: maxTime
                        });

                        times = [];
                        minTime = Infinity;
                        maxTime = 0;
                    }
                });

                // could sub to multiple rooms here
                client.subscribe(TABLE_NAME);

                return setTimeout(cb, Math.random() * 400 | 0);

        }, function (){
            logger.log('worker:bound:' + process.pid,
            'Done! Waiting for messages');
        });
    });
}
