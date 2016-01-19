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

    var displayType = grid.set(0, 10, 2, 2, contrib.lcd, {
        label: 'Test Type',
        display: 'SUB',
        segmentWidth: 0.07,
        segmentInterval: 0.11,
        strokeWidth: 0.1,
        elements: 3,
        elementSpacing: 4,
        elementPadding: 2
    });

    // Command Info
    var tableOptions = grid.set(2, 10, 4, 2, contrib.table, {
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

    // average actual publisher messages
    var publisherRate = grid.set(5, 10, 2, 2, contrib.lcd, {
        label: 'Estimated Publisher Rate',
        color: 'white',
        display: '1241',
        segmentWidth: 0.05,
        segmentInterval: 0.12,
        strokeWidth: 0.2,
        elements: 5,
        elementSpacing: 3,
        elementPadding: 1
    });

    var displayTotalClients = grid.set(7, 10, 3, 2, contrib.lcd, {
        label: 'Total Clients',
        color: 'red',
        display: '0%',
        segmentWidth: 0.06,
        segmentInterval: 0.12,
        strokeWidth: 0.3,
        elements: 5,
        elementSpacing: 4,
        elementPadding: 2
    });

    var start = new Date();
    var displayRunningTime = grid.set(10, 10, 2, 2, contrib.lcd, {
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
        screen.render();
    }, 1000);

    /**
     *
     * Middle content (timings)
     *
     */
    /**
     *
     * Table of timing values
     *
     */
    var tableTimings = grid.set(0, 6, 5, 4, contrib.table, {
        fg: 'green',
        label: 'Last Data Per Second',
        interactive: false,
        columnSpacing: 1,
        columnWidth: [14, 10, 10, 16, 14]
    });

    var workerRatesTable = grid.set(5, 6, 7, 3, contrib.table, {
        fg: 'green',
        label: 'Rates per worker',
        interactive: false,
        columnSpacing: 1,
        columnWidth: [14, 20]
    });

    // Log sample
    var timingLog = grid.set(5, 9, 7, 1, contrib.log, {
        label: 'Sampled Response Rates',
        fg: 'white',
        selectedFg: 'green'
    });

    /**
     *
     * Left side - line chart
     *
     */
    // Line chart
    var timingsLineChart = grid.set(0, 0, 11, 6, contrib.line, {
        showNthLabel: 5,
        maxY: 100,
        label: 'Timings',
        showLegend: true,
        legend: {width: 10}
    });
    var lineData = {
        max: {
            title: 'Max',
            style: {line: 'red'},
            x: [],
            y: []
        },
        min: {
            title: 'Min',
            style: {line: 'blue'},
            x: [],
            y: []
        },
        sample: {
            title: 'Sample',
            style: {line: 'white'},
            x: [],
            y: []
        }
    };

    function updateLineChart (lineOptions) {
        lineOptions = lineOptions || {};
        /**
         * Update line chart
         */
        var now = new Date();
        now = now.getMinutes() + ':' + now.getSeconds();

        lineData.min.x.push(now);
        lineData.min.y.push(lineOptions.min || 0);

        lineData.max.x.push(now);
        lineData.max.y.push(lineOptions.max || 0);

        lineData.sample.x.push(now);
        lineData.sample.y.push(lineOptions.sample || 0);

        if (lineData.min.x.length > 25) {
            lineData.min.x.shift();
            lineData.min.y.shift();

            lineData.max.x.shift();
            lineData.max.y.shift();

            lineData.sample.x.shift();
            lineData.sample.y.shift();
        }
        timingsLineChart.setData(_.values(lineData));
    }


    /**
     *
     * Render it
     *
     */
    setInterval(function() { screen.render(); }, 1500);
    screen.render();

    // provide direct access to screen
    returnObject.screen = screen;

    /**
     *
     * External update function
     *
     */
    var tableTimingsData = [];

    returnObject.update = function update (innerOptions) {
        /**
         *
         * Table timings data
         *
         */
        var updateOptions = innerOptions.options;

        if (innerOptions.type === 'table' ) {
            // update table
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

            // Update line chart
            updateLineChart({
                min: updateOptions.minCurrent,
                max: updateOptions.maxCurrent,
                sample: updateOptions.sample
            });

            // Update message rate per workers
            workerRatesTable.setData({
                headers: [
                    'Worker ID', 'Message Rate'
                ],
                data: _.map(updateOptions.messageRatesPerWorker, function (val, key) {
                    return [key, d3.format(',')(val)];
                })
            });

            // update estimated publisher rate
            // total messages per process / connected clients
            // first get average
            var avg = _.sum(_.values(updateOptions.messageRatesPerWorker)) / (
                Object.keys(updateOptions.messageRatesPerWorker).length);
            avg = (avg / +options.commandArguments.NUM_CONNECTIONS) | 0;
            publisherRate.setDisplay(avg);


        } else if (innerOptions.type === 'log') {
            // log some data
            timingLog.log(updateOptions.message);

        } else if (innerOptions.type === 'clientsConnected') {
            var totalConnections = +options.commandArguments.NUM_CPUS * +options.commandArguments.NUM_CONNECTIONS;

            // update # of clients connected
            if (updateOptions.done === true) {
                displayTotalClients.setOptions({ color: 'white' });
                displayTotalClients.setDisplay(updateOptions.value);

            } else {
                displayTotalClients.setDisplay(updateOptions.value);
                displayTotalClients.setOptions({ color: 'red' });
            }
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
