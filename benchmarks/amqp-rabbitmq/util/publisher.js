/**
 *
 * publish
 * Publishes a message to an exchange via channels
 * Uses channel-connection-pool.js as a dependency for the connection pool.
 *
 */
var logger = require('bragi');

/**
 *
 * Publisher exported function. To use, call like:
 *
 * var myPublisher = require('./publisher')({key: value });
 * myPublisher.publish(exchange, routingKey, message);
 *
 * @param {Object} options - optional configuration object
 * @param {Boolean} shouldLog - defaults to `true`. If `false`, will not log
 *
 */
function publisher (options) {
    // connectionPool is an object of exchange keys whose value is an array of
    // channels
    var connectionPool = require('./channel-connection-pool.js')();

    // any non false value will be set as true
    var shouldLog = (options.shouldLog === false ? false : true);

    // round robin which exchange to publish to
    var index = 0;

    /**
     *
     *
     * @param {String} exchange - target exchange to publish to
     * @param {String} routingKey - target topic key
     * @param {String | Object} message - message string (or object that gets
     *      stringified) to publish over the exchange with specified routing key
     */
    function publishToExchange (exchange, routingKey, message, numTries){
        // Publishing a passed in message to the exchange with passed in routing key
        numTries = numTries || 0;
        index++;

        // overflow (reset to 0) / invalid object protection
        if (!connectionPool.pool[exchange] || index >= connectionPool.pool[exchange].length) {
            index = 0;
        }

        // Ensure exchanges exist. If they don't, store message until they do
        if (!connectionPool.pool[exchange] || connectionPool.pool[exchange].length < 1) {
            if (shouldLog) {
                logger.log('publishToExchange:notSetup', 'Exchange is not yet setup. Setting timeout ⤴︎');
            }

            numTries++;
            return setTimeout(function publishLater () {
                return publishToExchange(exchange, routingKey, message, numTries);
            }, 250 * numTries);
        }

        if (shouldLog) {
            logger.log('silly/publishToExchange',
                '◯  publishing message (' + message.messageType + ') ' +
                ': to ' + exchange + ' | routing key: ' + routingKey +
                ' | Pool: ' + index +
                ' | messageId : ' + message.messageId,
                typeof message === 'object' ? {} : { message: message }
            );
        }

        // stringify if necessary
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }

        // publish it
        connectionPool.pool[exchange][index].publish(exchange, routingKey, new Buffer(message));
    }

    return {
        publish: publishToExchange
    };
}

module.exports = publisher;
