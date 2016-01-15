/**
 *
 * Exposes a single AMQP connection object
 *
 * NOTE: We could use the wrapper to create a pool of connection objects. For now,
 * we're just using a pool of channel objects to publish messages to. Using the
 * cluster module, each process would get its own connection object, so a pool
 * of connections *may* not be necessary
 *
 */
var amqpConnectionObject = require('./amqp-connection-wrapper.js');

// TODO: could pass in amqp connection properties
var amqpObj = amqpConnectionObject();

// immediately connect
amqpObj.connect();

module.exports = amqpObj;
