/**
 * Redis util
 *
 * @module redis-client
 */
var redis = require('redis');
var logger = require('bragi');

//Create client
var redisClient = redis.createClient();
redisClient.select(10); // use a different DB

redisClient.on('error', function(err) { logger.log('error:redis-api', 'Redis client error:' + err); });
redisClient.on('connect', function(err, msg) { logger.log('redis-api', 'Redis connected to redis'); });

//export the client
module.exports = redisClient;
