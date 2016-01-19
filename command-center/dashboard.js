/**
 *
 * Dashboard
 *  Subscriber dashboard
 *
 */

var blessed = require('blessed');
var contrib = require('blessed-contrib');
var screen = blessed.screen()

/**
 *
 * Get command line options
 *
 */
var program = require('commander');
program
    .version('0.0.1')
    .option('-c, --numCPUs [numCPUs]', 'How many CPUs (processes) to launch')
    .option('-n, --numConnections [numConnections]', 'How many connections per CPU')
    .option('-H, --host [host]', 'Service host')
    .option('-P, --port [port]', 'Service port')
    .option('-C, --cluster [cluster]', 'Should cluster? (For redis clustered) True or false')
    .parse(process.argv);

if (program.host) { CONNECT_CONFIG.host = program.host; }
if (program.port) { CONNECT_CONFIG.port = program.port; }
var NUM_CONNECTIONS = isNaN(+program.numConnections) ? 1 : +program.numConnections;
var NUM_CPUS = isNaN(+program.numCPUs) ? 8 : +program.numCPUs;

var CONNECT_CONFIG = {host: 'localhost', port: 6379};
CONNECT_CONFIG.host = CONNECT_CONFIG.host || 'localhost';
CONNECT_CONFIG.port = CONNECT_CONFIG.port || 6379;

var USE_CLUSTER = false;
if (program.cluster || ('' + program.cluster).toLowerCase() === 'true') { USE_CLUSTER = true; }



//create layout
var grid = new contrib.grid({rows: 12, cols: 12, screen: screen})

/**
 *
 * Right Side - command info
 *
 */
var lcdLineOne = grid.set(0, 10, 2, 2, contrib.lcd, {
    label: 'Test Type',
    display: 'SUB',
    segmentWidth: 0.07,
    segmentInterval: 0.11,
    strokeWidth: 0.1,
    elements: 3,
    elementSpacing: 4,
    elementPadding: 2
});

var start = new Date();
var displayRunningTime = grid.set(2, 10, 2, 2, contrib.lcd, {
    label: 'Seconds Running',
    display: '0',
    segmentWidth: 0.05,
    segmentInterval: 0.12,
    strokeWidth: 0.1,
    elements: 5,
    elementSpacing: 4,
    elementPadding: 2
});
setInterval(function () {
    displayRunningTime.setDisplay(((new Date() - start) / 1000) | 0);
}, 1000);

// Command Info
var tableOptions =  grid.set(4, 10, 7, 2, contrib.table, {
    fg: 'white',
    label: 'Run Options',
    interactive: false,
    columnSpacing: 1,
    columnWidth: [19, 18]
});
tableOptions.setData({
    headers: [
        'command',
        'value'
    ],
    data: [
        ['-c CPUs', NUM_CPUS],
        ['-n Connections', NUM_CONNECTIONS],
        ['-H Host', CONNECT_CONFIG.host],
        ['-P Port', CONNECT_CONFIG.port]
    ]
});


/**
 *
 * Table of timing values
 *
 */
var tableTimings =  grid.set(0, 6, 7, 4, contrib.table, {
    fg: 'green',
    label: 'Active Processes',
    interactive: false,
    columnSpacing: 1,
    columnWidth: [14, 10, 10, 16, 14]
});

//set dummy data for table
var tableTimingsData = []
function generateTable() {
    if (tableTimingsData.length > 40) {
        tableTimingsData.pop();
    }

    tableTimingsData.unshift([
        1,
        2,
        3,
        4,
        (new Date()).toLocaleTimeString()
    ]);

    tableTimings.setData({
       headers: [
           'Messages', 'Min', 'Max', 'Total Messages', 'Time'
       ],
       data: tableTimingsData
   });
}
generateTable()
setInterval(generateTable, 1000)


/** 
 *
 * Timings
 *
 */
var timingsLineChart = grid.set(0, 0, 6, 6, contrib.line, 
          { showNthLabel: 5
          , maxY: 100
          , label: 'Total Transactions'
          , showLegend: true
          , legend: {width: 10}})

// Log sample
var timingLog = grid.set(7, 6, 5, 4, contrib.log, { 
    label: 'Sampled Response Rates',
    fg: "green", 
    selectedFg: "green"
})
timingLog.log('Message');


//dummy data
var servers = ['US1', 'US2', 'EU1', 'AU1', 'AS1', 'JP1']
var commands = ['grep', 'node', 'java', 'timer', '~/ls -l', 'netns', 'watchdog', 'gulp', 'tar -xvf', 'awk', 'npm install']



//set line charts dummy data
var transactionsData = {
   title: 'USA',
   style: {line: 'red'},
   x: [],
   y: []
};

var transactionsData1 = {
   title: 'Europe',
   style: {line: 'yellow'},
   x: [],
   y: []
};

setLineData([transactionsData, transactionsData1], timingsLineChart);

function setLineData(mockData, line) {
  for (var i=0; i < mockData.length; i++) {
    var num = Math.random() * 1000 | 0;
    mockData[i].x.push(Math.random() * 10 | 0);
    mockData[i].y.push(num);

    if (mockData[i].x.length > 20) { 
        mockData[i].x.shift();
        mockData[i].y.shift();
    }
  }
  
  line.setData(mockData);
}


screen.key(['escape', 'q', 'C-c'], function(ch, key) { return process.exit(0); });

setInterval(function() {
    setLineData([
        transactionsData, 
        transactionsData1
    ], timingsLineChart);

   screen.render()
}, 200)

screen.render();
