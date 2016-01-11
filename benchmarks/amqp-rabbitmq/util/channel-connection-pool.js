/**
 *
 * Sets up a connection pool for exchanges
 *
 */
var _ = require('lodash');
var logger = require('bragi');
logger.transports.get('Console').property('showMeta', false);

var amqpConnection = require('./amqp-connection.js');

/**
 * Setup connection pool
 */

// publish to channels. These do not need to be closed after published to
var NUM_CONNECTIONS = 8;
var MAX_RECONNECT_TIMEOUT = 2000;
var DEFAULT_EXCHANGES = ['chatMessages'];

/**
 *
 * @param {Object} options - optional configuration object
 * @param {Array of Strings} exchanges - array of exchanges to create pools for
 *
 */
function createPool (options) {
    options = options || {};

    // Main return object
    var returnObject = {
        pool: {}
    };

    /**
     *
     * Creates a pool of connections to a topic exchange.
     *
     */
    var poolCreationTimeout;
    var reconnectAttempts = 0;
    // keep track to avoid multiple calls

    // get from nconf (or allow passing in?)
    var EXCHANGES = options.exchanges || DEFAULT_EXCHANGES;
    var EXCHANGE_TYPE = 'topic';
    var EXCHANGE_OPTIONS = {durable: true};

    // When connection goes down, we must re-create pool
    amqpConnection.on('error', function (amqpObj) {
        createConnectionPool({error: true});
    });

    /**
     *
     * Creates channels for all passed in exchanges
     *
     */
    function createConnectionPool (options) {
        options = options || {};

        /**
         * try to close out any existing channels
         */
        logger.log('createConnectionPool', 'Setting up connection pool...');

        _.each(EXCHANGES, function (exchange) {
            if (returnObject.pool[exchange]) {
                logger.log('createConnectionPool:closingChannels',
                'closing channels for ' + exchange);

                _.each(returnObject.pool[exchange], function (channel) {
                    if (channel && channel.close) {
                        try { channel.close(); }
                        catch (closeErr) { logger.log('warn:createConnectionPool', 'error closing channel: ' + closeErr); }
                    }
                });
            }
        });

        // Clear out and re-create exchange objects (do this after attempting to
        // close out channels)
        returnObject.pool = {};
        _.each(EXCHANGES, function (exchange) {
            returnObject.pool[exchange] = [];
        });

        /**
         * ensure connection exists. If not, recreate pools
         */
        if (!amqpConnection.conn) {
            logger.log('warn:createConnectionPool', 'No amqp connection exists');

            // keep trying to recreate connection pool
            clearTimeout(poolCreationTimeout);

            reconnectAttempts++;

            poolCreationTimeout = setTimeout(
                createConnectionPool,
                Math.min(50 * reconnectAttempts, MAX_RECONNECT_TIMEOUT)
            );
            return false;
        } else { reconnectAttempts = 0; }

        /**
         *
         * Setup channels for each exchange
         *
         */
        logger.log('createConnectionPool:connected', 'Setting up connection pool...');

        function setupChannel (exchange, i) {
            if (returnObject.pool[exchange].length > NUM_CONNECTIONS) {
                logger.log('warn:createConnectionPool:connected', 'Connections already set up');
                // don't add more channels if we already have enough
                return false;
            }

            amqpConnection.conn.createChannel(function createChannel (channelError, channel) {
                if (channelError) {
                    logger.log('error:createConnectionPool:createChannel',
                    'error setting up channel ' + channelError);

                    return process.nextTick(function () { setupChannel(exchange, i); });
                }

                // create exchange
                channel.assertExchange(
                    exchange,
                    EXCHANGE_TYPE,
                    EXCHANGE_OPTIONS,
                    function exchangeCreated (exchangeError, ok) {
                        if (exchangeError) {
                            logger.log('error:createConnectionPool:createExchange',
                            'error setting up exchange ' + exchangeError);

                            return process.nextTick(function () { setupChannel(exchange, i); });
                        }

                        logger.log('createConnectionPool:createExchange',
                        exchange + ' (' + i + ') Exchange successfully created');

                        // We're good. If we're not good, create another one
                        returnObject.pool[exchange].push(channel);
                    });
            });
        }

        // call it
        setImmediate(function () {
            _.each(EXCHANGES, function exchangeType (exchange) {
                // for each exchange, set up the channels
                _.each(_.range(NUM_CONNECTIONS), function setupExchange (i){
                    setupChannel(exchange, i);
                });
            });
        });
    }
    // immediately attempt to create the connection pool
    createConnectionPool();

    return returnObject;
}

module.exports = createPool;
