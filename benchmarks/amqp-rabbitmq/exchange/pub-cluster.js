var publisher = require('../util/publisher.js')({shouldLog: false});

var cluster = require('cluster');
var NUM_CPUS = require('os').cpus().length;

if(cluster.isMaster){
    var workers = [];
    for(var i = 0; i < NUM_CPUS; i++ ){
        workers.push(cluster.fork());
    }
} else {
    function pub() {
        publisher.publish('chatMessages', 'roomId1', 'Hello world');
        setImmediate(pub);
    }
    pub();
}
