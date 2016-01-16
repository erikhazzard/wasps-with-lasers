var _ = require('lodash');
var logger = require('bragi');
var EventEmitter = require('events');
var amqp = require('amqplib/callback_api');

var defaultAmqpOptions = {host: 'amqp://localhost'};

// for wasp testing
// TODO: get from env or pass in
// defaultAmqpOptions.host = 'amqp://172.30.0.179';
//defaultAmqpOptions.host = 'amqp://52.90.230.226:5672';
//defaultAmqpOptions.host = 'amqp://guest:guest@52.90.230.226:5672';

/**
 *
 * Wrapped AMQP connection which handles reconnecting and initial setup
 * Called like:
 *
 *  var connectionObject = require('./amqp-connection-wrapper')({
 *      // amqp options
 *  });
 *  connectionObject.connect();
 *
 *  Must call .connect() to connect. A few other properties are exposed:
 *      status: either 'connecting', 'connected', or 'reconnecting'
 *      conn: raw amqp connection object
 *
 *  @param {Object} options - configuration options
 *  @param {Object} options.amqpOptions - amqp server config. Note if not passed
 *      in, will default to localhost
 *  @param {String} options.amqpOptions.host - amqp server host
 */
function createAmqpConnection (options) {
    options = options || {};
    var amqpOptions = options.amqpOptions || defaultAmqpOptions;
    amqpOptions.host = amqpOptions.host || defaultAmqpOptions.host || 'amqp://localhost';

    var BACKOFF_LIMIT = 3000; // in seconds

    // setup event emitter
    var _emitter = new EventEmitter();

    /**
     * Setup return object
     */
    var returnObject = {};
    returnObject.conn = null;

    _.each(EventEmitter.prototype, function (val, key) {
        // provide access to methods such as .on, .emit, etc.
        returnObject[key] = val;
    });

    // status can be one of:
    //      'connecting', 'connected', 'reconnecting'
    returnObject.status = 'connecting';
    returnObject.reconnectAttempt = 0;
    // first connection is a legit, all subsequent connections are reconnects
    returnObject.reconnects = -1;

    var _reconnectTimeout;

    /**
     * Internal reconnect call, called when connection is lost to AMQP server
     */
    function reconnect () {
        logger.log('error:amqp-connection:reconnect', 'reconnecting');

        // update object status
        returnObject.status = 'reconnecting';
        returnObject.conn = null;
        returnObject.reconnectAttempt++;

        // inform listeners
        returnObject.emit('error', returnObject);

        clearTimeout(_reconnectTimeout);

        // set a simple backoff timer
        _reconnectTimeout = setTimeout(
            returnObject.connect,
            Math.min(80 * returnObject.reconnectAttempt, BACKOFF_LIMIT)
        );

        return returnObject;
    }

    /**
     * main connection function which handles connecting to AMQP and listening
     * for errors
     */
    returnObject.connect = function connect () {
        logger.log('amqp-connection:connect',
        'Attempting to connect to %j', amqpOptions);

        // reset connection objets
        returnObject.conn = null;
        returnObject.status = 'connecting';

        /**
         * Connect to amqp serverjjj
         */
        amqp.connect(amqpOptions.host, function connectToAmqp (err, conn) {
            if (err || !conn) {
                logger.log('error:amqp-connection:connect', 'error connecting: ' + err);
                return reconnect();
            }

            returnObject.conn = conn;
            returnObject.status = 'connected';
            returnObject.reconnectAttempt = 0;
            returnObject.reconnects++;

            logger.log('amqp-connection:connect:success', 'Connected!');
            returnObject.emit('connected', returnObject);

            // handle errors and disconnections
            conn.on('error', function (connErr) {
                logger.log('error:amqp-connection:connectionError',
                'error received: ' + connErr);
            });
            conn.on('close', reconnect);

            return returnObject;
        });
    };

    return returnObject;
};

module.exports = createAmqpConnection;
