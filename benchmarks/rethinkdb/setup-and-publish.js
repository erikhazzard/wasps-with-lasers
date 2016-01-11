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
    .parse(process.argv);
/**
 * To publish more than 1 per second, increase this value. Note that the more
 * clients connected to the change feed, the fewer messages / sec can be
 * published with this
 */
var NUM_MESSAGES = isNaN(+program.numMessagesPerSecond) ? 1 : +program.numMessagesPerSecond;
var TIMEOUT = isNaN(+program.timeout) ? 1000 : +program.timeout;


var TABLE_NAME = 'messages'; // needs to match sub-cluster.js
var DURABILITY = 'soft';

console.log('Running with ' + NUM_MESSAGES + ' messages / ' + 
    TIMEOUT + 'ms');

/**
 * Simple db connection, table setup, and publisher methods
 */
rethinkDb.connect({host: 'localhost', port: 28015}, function(err, conn) {
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
        setInterval(function () {
            // insert data
            var start = microtime.now();
            var numInserted = 0;

            async.eachLimit(_.range(NUM_MESSAGES), 50, function (i, cb) {
                rethinkDb.table('messages').insert({
                    date: microtime.now(),
                    dateTime: new Date(),
                    message: "Hello world",
                    username: (Math.random()).toString(16),
                    index: i,
                    roomId: i % 1000
                }).run(connection, function (err, res) {
                    if(err) { console.log(err); }

                    console.log('publish/single', 'Inserted single message : ' +
                    'Done in ' + ((microtime.now() - start) / 1000) + 'ms');

                    numInserted++;
                    return cb();
                });
            }, function () {
                console.log('publish/done-with-batch', 
                    'Inserted [' + d3.format(',')(numInserted) + '] messages. ',
                    'Done in ' + ((microtime.now() - start) / 1000) + 'ms');

                /**
                 * If we only want to publish a single message, we can exit now
                 */
                // process.exit(1);
            });
        }, TIMEOUT);
    });
});
