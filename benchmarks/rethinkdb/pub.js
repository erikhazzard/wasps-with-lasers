var _ = require('lodash');
var d3 = require('d3');
var async = require('async');
var microtime = require('microtime');
var rethinkDb = require('rethinkdb');
var connection = null;

var program = require('commander');
program
    .version('0.0.1')
    .option('-n, --numMessagesPerSecond [numMessagesPerSecond]', 'How many messages to publish per second')
    .option('-t, --timeout [timeout]', 'Length of time before publishing next message batch (in milliseconds, defaults to 1000, or 1 second)')
    .option('-p, --numPasses [numPasses]', 'If provided, will stop after n passes (after messages have been published p times)')
    .option('-h, --host [host]', 'RethinkBD host')
    .option('-p, --port [port]', 'RethinkBD port')
    .parse(process.argv);
/**
 * To publish more than 1 per second, increase this value. Note that the more
 * clients connected to the change feed, the fewer messages / sec can be
 * published with this
 */
var NUM_MESSAGES = isNaN(+program.numMessagesPerSecond) ? 1 : +program.numMessagesPerSecond;
var NUM_PASSES = isNaN(+program.numPasses) ? Infinity : +program.numPasses;
var TIMEOUT = isNaN(+program.timeout) ? 1000 : +program.timeout;

var CONNECT_CONFIG = {host: 'localhost', port: 28015};
if (program.host) { CONNECT_CONFIG.host = program.host; }
if (program.port) { CONNECT_CONFIG.port = program.port; }

var TABLE_NAME = 'messages'; // needs to match sub-cluster.js
var DURABILITY = 'soft';
var START = microtime.now();

console.log('Running with ' + NUM_MESSAGES + ' messages / ' + 
    TIMEOUT + 'ms | ' + NUM_PASSES + ' passes' );

var CUR_PASS = 0;
var NUM_INSERTED = 0;
/**
 * Simple db connection, table setup, and publisher methods
 */
rethinkDb.connect(CONNECT_CONFIG, function(err, conn) {
    if (err) { throw err; }
    connection = conn;

    async.waterfall([
        function createTable (cb) {
            // try to create table if it doesn't exist
            try {
            rethinkDb.db('test')
                .tableCreate(TABLE_NAME, {durability: DURABILITY, primaryKey: 'roomId'})
                .run(connection, function(err, result) {
                    if (err) { }
                    return cb();
                });
            } catch (err) {
                return cb();
            }
        }
    ],
    function setupPublisher (cb) {
        var pubInterval = setInterval(function () {
            // insert data
            var start = microtime.now();
            CUR_PASS++;

            async.eachLimit(_.range(NUM_MESSAGES), 10, function (i, cb) {
                var startSingleMessage = microtime.now();
                rethinkDb.table('messages').insert({
                    date: microtime.now(),
                    dateTime: new Date(),
                    message: "Hello world",
                    username: (Math.random()).toString(16),
                    index: i,
                    roomId: i % 1000
                }).run(connection, function (err, res) {
                    if(err) { console.log(err); }
                    NUM_INSERTED++;
                    return cb();
                });
            }
            , function () {
                console.log('publish/done-with-batch',
                    '<' + CUR_PASS + '> [' + NUM_INSERTED + '] ' +
                    'Inserted [' + d3.format(',')(NUM_INSERTED) + '] messages. ',
                    'Done in ' + ((microtime.now() - start) / 1000) + 'ms');
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

function close () {
    var now = microtime.now();
    console.log('<<< CLOSING >>>');
    console.log('Took ' + (now - START) / 1000 + 'ms');
    console.log('Inserted: ' + NUM_INSERTED + ' messages | ' +
    NUM_PASSES + ' passes completed');

    // console.log((now / 1000 / 60 ) + ' messages / sec');

    return process.exit(1);
}
process.on('SIGINT', close);
process.on('SIGHUP', close);
process.on('SIGTERM', close);
process.on('uncaughtException', close);
