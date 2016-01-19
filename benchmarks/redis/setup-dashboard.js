/**
 *
 * Dashboard
 *  Subscriber dashboard
 *
 */
var d3 = require('d3');
var _ = require('lodash');
var uuid = require('uuid');
var microtime = require('microtime');
var ss = require('simple-statistics');

var blessed = require('blessed');
var contrib = require('blessed-contrib');

module.exports = function setupDashboard (options) {
    options = options || {};
    options.commandArguments = options.commandArguments || {};
    options.commandArguments.CONNECT_CONFIG = options.commandArguments.CONNECT_CONFIG || {};

    var screen = blessed.screen();

    /**
     *
     * Setup dashboard
     *
     */
    var returnObject = {};

    //create layout
    var grid = new contrib.grid({rows: 12, cols: 12, screen: screen});

    var lcdLineOne = grid.set(0, 10, 3, 2, contrib.lcd, {
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
    var displayRunningTime = grid.set(3, 10, 3, 2, contrib.lcd, {
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
    var tableOptions = grid.set(6, 10, 6, 2, contrib.table, {
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
            ['-c CPUs', options.commandArguments.NUM_CPUS],
            ['-n Connections', options.commandArguments.NUM_CONNECTIONS],
            ['-H Host', options.commandArguments.CONNECT_CONFIG.host],
            ['-P Port', options.commandArguments.CONNECT_CONFIG.port]
        ]
    });


    /**
     *
     * Table of timing values
     *
     */
    var tableTimings = grid.set(0, 6, 7, 4, contrib.table, {
        fg: 'green',
        label: 'Active Processes',
        interactive: false,
        columnSpacing: 1,
        columnWidth: [14, 10, 10, 16, 14]
    });

    /**
     *
     * Timings
     *
     */
    var timingsLineChart = grid.set(0, 0, 6, 6, contrib.line, {
        showNthLabel: 5,
        maxY: 100,
        label: 'Total Transactions',
        showLegend: true,
        legend: {width: 10}
    });

    // Log sample
    var timingLog = grid.set(7, 6, 5, 4, contrib.log, {
        label: 'Sampled Response Rates',
        fg: 'green',
        selectedFg: 'green'
    });


    //dummy data
    var servers = ['US1', 'US2', 'EU1', 'AU1', 'AS1', 'JP1'];
    var commands = ['grep', 'node', 'java', 'timer', '~/ls -l', 'netns', 'watchdog', 'gulp', 'tar -xvf', 'awk', 'npm install'];


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
    setLineData([transactionsData, transactionsData1], timingsLineChart);

    setInterval(function() { screen.render(); }, 800);
    screen.render();

    // provide direct access to screen
    returnObject.screen = screen;

    /**
     *
     * External update function
     *
     */
    var tableTimingsData = [];

    returnObject.update = function update (options) {
        /**
         *
         * Table timings data
         *
         */
        var updateOptions = options.options;

        if (options.type === 'table' ) {
            if (tableTimingsData.length > 40) { tableTimingsData.pop(); }

            tableTimingsData.unshift([
                d3.format(',')(updateOptions.totalMessagesReceivedLatest),
                updateOptions.minCurrent + 'ms',
                updateOptions.maxCurrent + 'ms',
                d3.format(',')(updateOptions.totalMessagesReceived),
                (new Date()).toLocaleTimeString()
            ]);

            tableTimings.setData({
                headers: [
                    'Messages', 'Min', 'Max', 'Total Messages', 'Time'
                ],
                data: tableTimingsData
            });

        } else if (options.type === 'log') {
            timingLog.log(updateOptions.message);
        }

        screen.render();
    };



    /**
     *
     * Return object
     *
     */
    return returnObject;
};
