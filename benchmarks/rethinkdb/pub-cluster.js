"use strict";

/**
 * Tests publishing using multiple processes
 *
 *
 * @module pub-cluster.js
 */

var fs = require('fs');
var d3 = require('d3');
var _ = require('lodash');
var uuid = require('uuid');
var async = require('async');
var logger = require('bragi');
var cluster = require('cluster');
var Table = require('cli-table');
var microtime = require('microtime');
var rethinkDb = require('rethinkdb');
logger.transports.get('Console').property('showMeta', false);
logger.options.groupsEnabled = ['master'];

var chart = require('chart');
var stats = require('stats-lite');

var program = require('commander');
program
    .version('0.0.1')
    .option('-c, --numCPUs [numCPUs]', 'How many CPUs')
    .option('-n, --numMessagesPerSecond [numMessagesPerSecond]', 'How many messages to publish per second')
    .option('-t, --timeout [timeout]', 'Length of time before publishing next message batch (in milliseconds, defaults to 1000, or 1 second)')
    .option('-p, --numPasses [numPasses]', 'If provided, will stop after n passes (after messages have been published p times)')
    .option('-D, --database <database>', 'RethinkBD db (`test` by default)')
    .option('-T, --table <table>', 'RethinkBD table name (`messages` by default)')
    .option('-H, --host <host>', 'RethinkBD host')
    .option('-P, --port <port>', 'RethinkBD port')
    .parse(process.argv);

// To publish more than 1 per second, increase this value. Note that the more
// clients connected to the change feed, the fewer messages / sec can be
// published with this
var NUM_MESSAGES = isNaN(+program.numMessagesPerSecond) ? 1 : +program.numMessagesPerSecond;
var NUM_PASSES = isNaN(+program.numPasses) ? Infinity : +program.numPasses;
var TIMEOUT = isNaN(+program.timeout) ? 1000 : +program.timeout;
// use 1 process by defualt
var NUM_CPUS = isNaN(+program.numCPUs) ? 1 : +program.numCPUs;

var TABLE_NAME = program.table || 'messages';
var DATABASE = program.database || 'test';

var CONNECT_CONFIG = {host: 'localhost', port: 28015};
if (program.host) { CONNECT_CONFIG.host = program.host; }
if (program.port) { CONNECT_CONFIG.port = program.port; }

var DURABILITY = 'soft';
var START = microtime.now();

/**
 *
 * Start it
 *
 */

if(cluster.isMaster){
    logger.log('master', 'Running with ' + NUM_MESSAGES + ' messages / ' +
        TIMEOUT + 'ms | ' + NUM_PASSES + ' passes | ' +
        'DB: ' + DATABASE + ' | on table: ' + TABLE_NAME);

    /**
     *
     * Master - fork processes
     *
     */
    var workers = [];
    for(var i = 0; i < NUM_CPUS; i++ ){
        workers.push(cluster.fork());
    }

    /**
     * handle messages from worker
     */
    var currentMessagesInserted = 0;
    var currentIteration = 0;
    var minCurrent = Infinity;
    var maxCurrent = 0;
    var currentTimes = [];
    var allTimes = [];

    var minAll = Infinity;
    var maxAll = 0;
    var totalMessagesInserted = 0;

    _.each(workers, function (worker) {
        worker.on('message', function(message) {
            // logger.log('master', 'message: %j', message);

            // track values
            totalMessagesInserted += message.numMessages;
            currentMessagesInserted += message.numMessages;

            currentTimes.push(message.time);
            allTimes.push(message.time);

            if (message.time < minAll) { minAll = message.time; }
            if (message.time > maxAll) { maxAll = message.time; }
            if (message.time < minCurrent) { minCurrent = message.time; }
            if (message.time > maxCurrent) { maxCurrent = message.time; }
        });
    });

    /**
     * Calculates and prints data
     * @param {Boolean} calculateAllData - specifies whether to do calculations
     * on the entire data set. This is expensive, and done only by default
     * when the process ends
     */
    function printInformation (calculateAllData) {
        currentIteration++;

        var table = new Table({
            head: ['#' + currentIteration, 'Current Interval', 'All']
        });
        table.push(
            {'Messages Inserted': [
                d3.format(',')(currentMessagesInserted) + ' msg/s',
                d3.format(',')(totalMessagesInserted)
            ]},
            {'Min': [
                minCurrent + 'ms',
                minAll + 'ms'
            ]},
            {'Max': [
                maxCurrent + 'ms',
                maxAll + 'ms'
            ]},
            {'Mean': [
                d3.round(stats.mean(currentTimes), 2) + 'ms',
                calculateAllData ? d3.round(stats.mean(allTimes), 2) + 'ms' : '-'
            ]},
            {'Standard Deviation': [
                d3.round(stats.stdev(currentTimes), 2) + 'ms',
                calculateAllData ? d3.round(stats.stdev(allTimes), 2) + 'ms' : '-'
            ]},
            {'85 Percentile': [
                d3.round(stats.percentile(currentTimes, 0.85), 2),
                calculateAllData ? d3.round(stats.percentile(allTimes, 0.85), 2) : '-'
            ]},
            {'95 Percentile': [
                d3.round(stats.percentile(currentTimes, 0.95), 2),
                calculateAllData ? d3.round(stats.percentile(allTimes, 0.95), 2) : '-'
            ]}
        );

        logger.log('master', '[' + (new Date()).toLocaleTimeString() +
        '] Stats \n' + table.toString());
        console.log(chart(currentTimes, { width: 80, height: 14 }));

        // reset values
        currentMessagesInserted = 0;
        minCurrent = Infinity;
        maxCurrent = 0;
        currentTimes = [];
    }

    setTimeout(function () {
        // Log stats every second
        setInterval(printInformation, 1000);
    }, 200);

    /**
     * Handle closing
     */
    function close () {
        // TODO: Put this in master; send a message instead in the worker
        var now = microtime.now();
        printInformation(true);
        logger.log('master:close', '<<< CLOSING >>>');
        logger.log('master:close', 'Took ' + d3.format(',')((now - START) / 1000) + 'ms');


        // write data
        fs.writeFileSync(
            // filename
            'data-output/' +
            ((new Date()).toLocaleTimeString()).replace(' ', '-') +
            '__c' + NUM_CPUS + '-n' + NUM_MESSAGES + '-p' + NUM_PASSES + '.json',
            // data
            '[{"type": "RethinkDB", "c": ' + NUM_CPUS +
                ', "n": ' + NUM_MESSAGES +
                ', "timeout": ' + TIMEOUT +
                ', "data": [' + allTimes + ']}]',
            // encoding
            'utf-8'
        );

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
     * Simple db connection, table setup, and publisher methods
     */
    var CUR_PASS = 0;
    var NUM_INSERTED = 0;

    var connection = null;
    rethinkDb.connect(CONNECT_CONFIG, function(err, conn) {
        if (err) { throw err; }
        connection = conn;

        async.waterfall([
            function createTable (cb) {
                // try to create table if it doesn't exist
                try {
                rethinkDb.db(DATABASE)
                    .tableCreate(TABLE_NAME, {
                        durability: DURABILITY,
                        primaryKey: 'roomId'
                    })
                    .run(connection, function(err, result) {
                        if (err) {
                            // most likely we will see a table already exists
                            // error here
                        }
                        return cb();
                    });
                } catch (err) {
                    return cb();
                }
            }
        ],
        function setupPublisher (cb) {
            var workerId = process.pid;
            var pubInterval = setInterval(function () {
                // insert data
                var start = microtime.now();
                CUR_PASS++;

                async.eachLimit(_.range(NUM_MESSAGES), 20, function (i, cb) {
                    setImmediate(() => {
                        var startSingleMessage = microtime.now();

                        rethinkDb.table(TABLE_NAME).insert({
                            date: startSingleMessage,
                            dateTime: Date.now(),
                            message: 'Hello world',
                            username: 'pub-test',
                            workerId: workerId,
                            pass: CUR_PASS,
                            numInserted: NUM_INSERTED,
                            roomId: uuid.v4()
                        }).run(connection, function (err, res) {
                            if(err) { logger.log('error:insert', err); }
                            NUM_INSERTED++;
                            return cb();
                        });
                    });
                },
                function () {
                    var diff = (microtime.now() - start) / 1000;
                    logger.log('publish/done-with-batch|' + workerId,
                        '<' + CUR_PASS + '> [' + NUM_INSERTED + '] ' +
                        'Inserted [' + d3.format(',')(NUM_INSERTED) + '] messages. ',
                        'Done in ' + (diff) + 'ms');

                    process.send({
                        numMessages: NUM_MESSAGES,
                        numPasses: CUR_PASS,
                        time: diff
                    });
                });

                if (CUR_PASS >= NUM_PASSES) {
                    clearInterval(pubInterval);
                    setTimeout(() => {
                        return close();
                    }, 500);
                }
            }, TIMEOUT);
        });
    });
}
