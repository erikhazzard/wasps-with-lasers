# ZeroMQ benchmarks

This is the fastest by a pretty large margin, however, message delivery is not
guaranteed. TCP message delivery even on a single node with these tests is
often unreliable, where 5 - 10% of messages are just not received by the subscriber.
Sometimes, subscribers will never get any messages published - unsure why this is.
Usually happens after running a few tests.

ICP, however, is extremely fast as expected on a SSD, but the practical limits
for it are for a single machine (which, for our case of a local pub/sub proxy,
is quite alright).
    NOTE: With IPC, OS open file limits must be set to ensure errors aren't thrown when
    too many clients are connceted


## File overview

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
* -h is the optional host. Defaults to `tcp://127.0.0.1:2002`. Can use a different address, or protocol


# Test results - Single machine
These tests were run on a single machine. This is *not* a realistic test case,
as in production multiple machines would be used, but this can be a fairly
useful test case to get a sense of some limits.

NOTE: By default, this uses host `tcp://127.0.0.1:2002`.

# *800 clients*
`node sub-cluster.js -c 8 -n 100`

## _1 message / sec_
Publish 1 message per second (100 passes)
`node pub-single.js -t 1000 -n 1 -p 100`

Subscriber output:
    [  cluster-master  ] 		 MIN: 0.416ms
    [  cluster-master  ] 		 MAX: 31.004ms
    [  cluster-master  ] 		 MEAN: 11.162182105103062ms
    [  cluster-master  ] 		 HARMONIC MEAN: 6.561511876889734ms


## _10 message / sec_
Bursty behavior - 10 msgs published every 1000ms
`node pub-single.js -t 1000 -n 10 -p 100`

Subscriber output (tcp):
    [  cluster-master  ] 		 MIN: 0.545ms
    [  cluster-master  ] 		 MAX: 703.144ms
    [  cluster-master  ] 		 MEAN: 296.4506303737413ms
    [  cluster-master  ] 		 HARMONIC MEAN: 135.9290209818416ms
_NOTE: This is fast, however, sometimes messages are dopped. Other times, we get all 800k. Cannot easily reproduce dropped messages_

Subscriber output (ipc):
    [  cluster-master  ] 		 MIN: 0.354ms
    [  cluster-master  ] 		 MAX: 105.781ms
    [  cluster-master  ] 		 MEAN: 38.45009104750147ms
    [  cluster-master  ] 		 HARMONIC MEAN: 17.194819278916103ms
_NOTE: All messages  (800,000) are received in all tests runs. Very fast and reliable_


## _100 message / sec_
`node pub-single.js -t 1000 -n 100 -p 10`

Subscriber output:
    [  cluster-master  ] 		 MIN: 0.321ms
    [  cluster-master  ] 		 MAX: 842.622ms
    [  cluster-master  ] 		 MEAN: 303.28082107474165ms
    [  cluster-master  ] 		 HARMONIC MEAN: 140.05989677896767ms
_NOTE: No messages were dropped. All 8million were received_

Subscriber output:
    [  cluster-master  ] 		 MIN: 0.297ms
    [  cluster-master  ] 		 MAX: 978.658ms
    [  cluster-master  ] 		 MEAN: 312.7539568823995ms
    [  cluster-master  ] 		 HARMONIC MEAN: 128.68453569066858ms
_NOTE: All messages (8 million) are received in all tests. Very fast, and no performance degradation over time like rabbitmq / rethinkdb. Messages received quickly every after 100 passes_


# *8000 clients*
`node sub-cluster.js -c 8 -n 1000`

## _1 message / sec_
Publish 1 message per second (100 passes)
`node pub-single.js -t 1000 -n 1 -p 100`

Subscriber output (ipc):
    [  cluster-master  ] 		 HARMONIC MEAN (current): nullms
    [  cluster-master  ] 		 MIN: 1.812ms
    [  cluster-master  ] 		 MAX: 382.512ms
    [  cluster-master  ] 		 MEAN: 189.3913791250003ms
    [  cluster-master  ] 		 HARMONIC MEAN: 82.06769921556615ms
_NOTE: All messages delivered, no slow downs. If -c is greater than number of CPUs, however, some messages will be dropped_
