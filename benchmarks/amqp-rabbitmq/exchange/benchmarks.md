# RabbitMQ Benchmarks

* sub-cluster.js : Runs 1 or more processes to listen for published messages. Will 
create n listeners per process. Ideally, this should be run 1 process per CPU. Example:

`node sub-cluster -c 8 -n 100` 
* -c is the number of CPUs your machine has (processes to run)
* -n is the number of connections to spin up per process)

* pub.js: Runs a single process to publish messages every passed in timeout. e.g.,: 

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

Subscriber aggregated output:

    [  cluster-master  ] 		 MIN: 4.061ms
    [  cluster-master  ] 		 MAX: 74.49ms
    [  cluster-master  ] 		 MEAN: 36.169ms
    [  cluster-master  ] 		 HARMONIC MEAN: 28.188ms

## _10 message / sec_
Bursty behavior - 10 msgs published every 1000ms
`node pub-single.js -t 1000 -n 10 -p 100`

Subscriber aggregated output:

    [  cluster-master  ]         MIN: 4.105ms
    [  cluster-master  ]         MAX: 468.556ms
    [  cluster-master  ]         MEAN: 173.222ms
    [  cluster-master  ]         HARMONIC MEAN: 101.495ms

## _100 message / sec_
Bursty behavior - 100 msgs published every 1000ms. 
NOTE: Rabbitmq maintains around ~23k messages / sec delivery rate, spikes to 30k

We run only 10 passes because after leaving this running, the message delivery
time becomes unacceptable (>10 seconds per message, longer the longer it is
left running)

`node pub-single.js -t 1000 -n 100 -p 10`

Subscriber aggregated output:

    [  cluster-master  ] 		 MIN: 33.367ms
    [  cluster-master  ] 		 MAX: 60661.352ms
    [  cluster-master  ] 		 MEAN: 28002.247579243394ms
    [  cluster-master  ] 		 HARMONIC MEAN: 8200.15304578496ms

_NOTE : after running for a while, we see later messages have a min delivery
time for 100167!! (That's 100 seconds). So, we get reliable message delivery
at the cost of performance_


# *8000 clients*
`node sub-cluster.js -c 8 -n 1000`

## _1 message / sec_
Publish 1 message per second (100 passes)
`node pub-single.js -t 1000 -n 1 -p 100`

Subscriber aggregated output:

    [  cluster-master  ] 		 MIN: 21.902ms
    [  cluster-master  ] 		 MAX: 702.219ms
    [  cluster-master  ] 		 MEAN: 297.11190574978656ms
    [  cluster-master  ] 		 HARMONIC MEAN: 192.82640534107128ms
