/**
 * Exposes a subscriber which can create a subscriber to the queue
 *
 * Handles reconnecting (via amqpConnection)
 *
 */
var amqpConnection = require('./amqp-connection.js');

// TODO: Multiple connection objects?

/**
 *
 * Subscriber factory
 *
 */
function createSubscriber (options) {
    var subscriber = {};

    // IDEAS: how to subscribe to multiple topics at once? Another subscribe
    // call ?

    /**
     * subscribe function. Takes in options and a callback, and calls the callback
     * when a message is received
     *
     */
    subscriber.subscribe = function subscribe (options, callback) {
        
    };

    subscriber.unsubscribe = function unsubscribe (options, callback) {
    };

    return subscriber;
}

module.exports = createSubscriber;
