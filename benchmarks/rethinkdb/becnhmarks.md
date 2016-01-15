# RethinkDB Benchmarks

* sub-cluster.js : Runs 1 or more processes to listen for published messages. Will 
create n listeners per process. Ideally, this should be run 1 process per CPU. Example:

`node sub-cluster -c 8 -n 100` 
* -c is the number of CPUs your machine has (processes to run)
* -n is the number of connections to spin up per process)

* pub.js: Runs a single process to publish messages every passed in timeout. 
Will also setup table if it does not exist. e.g.,: 

`node pub.js -t 1000 -n 1 -p 10` 
* -t is the timeout value in milliseconds to wait before publishing a message
* -n is the number of messages to publish per timeout
* -p is the number of passes to run before exiting (if -t 1000 -n 1 -p 10, it would publish 1 message per second 10 times and then exit)


# Test results - Single machine
These tests were run on a single machine. This is *not* a realistic test case,
as in production multiple machines would be used, but this can be a fairly
useful test case to get a sense of some limits.

# *800 clients*
`node sub-cluster.js -c 8 -n 100`

## _1 message / sec_
Publish 1 message per second (100 passes)
`node pub-single.js -t 1000 -n 1 -p 100`

Subscriber output:

    [  cluster-master  ] 		 MIN: 7.405ms
    [  cluster-master  ] 		 MAX: 71.456ms
    [  cluster-master  ] 		 MEAN: 33.02752776041681ms
    [  cluster-master  ] 		 HARMONIC MEAN: 28.79685231508572ms

## _10 message / sec_
Bursty behavior - 10 msgs published every 1000ms
`node pub-single.js -t 1000 -n 10 -p 100`

Subscriber output:

    [  cluster-master  ] 		 MIN: 6.491ms
    [  cluster-master  ] 		 MAX: 310.265ms
    [  cluster-master  ] 		 MEAN: 145.2491082723199ms
    [  cluster-master  ] 		 HARMONIC MEAN: 93.6223116125523ms

_NOTE: Insert callback times jump to ~160ms per insert when inserting multiple
at a time with 800 clients connected_

## _100 message / sec_
Bursty behavior - 100 msgs published every 1000ms. 

`node pub-single.js -t 1000 -n 100 -p 10`

Subscriber output:

    [  cluster-master  ] 		 MIN: 6.462ms
    [  cluster-master  ] 		 MAX: 1416.673ms
    [  cluster-master  ] 		 MEAN: 437.7074635853893ms
    [  cluster-master  ] 		 HARMONIC MEAN: 354.5674385994731ms

_NOTE: Insert callback timing range from 20 - 1000ms. There is also seemingly a delay (after pub process finishes running, messages are still being received by subscribers for ~30 seconds or so, but this is far less a delay than RabbitMQ_


# *8000 clients*
`node sub-cluster.js -c 8 -n 1000`

## _1 message / sec_
Publish 1 message per second (100 passes)
`node pub-single.js -t 1000 -n 1 -p 100`

Subscriber output:

    [  cluster-master  ] 		 MIN: 47.531ms
    [  cluster-master  ] 		 MAX: 548.466ms
    [  cluster-master  ] 		 MEAN: 234.34434398798103ms
    [  cluster-master  ] 		 HARMONIC MEAN: 179.90869200243316ms

_NOTE: Insert callback times are anywhere from 10ms - 1000ms_

## _10 message / sec_
Publish 1 message per second (100 passes)
`node pub-single.js -t 1000 -n 10 -p 100`

Subscriber output (taken at ~1 minute after pub finished. Messages continued coming in for >5 minutes afterwards):

    [  cluster-master  ] 		 MIN: 69.997ms
    [  cluster-master  ] 		 MAX: 162940.945ms
    [  cluster-master  ] 		 MEAN: 79375.3107447822ms
    [  cluster-master  ] 		 HARMONIC MEAN: 22006.123494804797ms

_NOTE: Insert callback times plummet. After a few passes, they start at 41962ms+ (41 seconds) and climb to 74656ms (74 seconds) after 100 passes. After passes stop, subscribers continue to receive messages for minutes afterwards, with min times reaching > 150320ms (150 seconds). Writes continue coming in minutes after node processes is ended. Web console also crashed (failed o read data) after ~3 minutes_

Final after all messages received:
    [  cluster-master  ] 		 MIN: 69.997ms
    [  cluster-master  ] 		 MAX: 361833.463ms (360 seconds, ~6 minutes)
    [  cluster-master  ] 		 MEAN: 142383.72797892956ms
    [  cluster-master  ] 		 HARMONIC MEAN: 34648.945586492875ms
