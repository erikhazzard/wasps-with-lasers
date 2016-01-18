# Wasps With Lasers
A benchmarking toolkit for evaluating realtime architecture options. This looks primarily at PubSub systems.

# Why
This is designed to help give insight and answers questions such as:
* How long does it take a client to get a message? How about when there are many 10k's of connected clients? 100k?
* What does reliability look like - how many messages are dropped / never delivered?
* How many connected clients and messages can a single publisher node handle?

# Targets
* RabbitMQ
* RethinkDB
* ZeroMQ
* NanoMsg
* Redis (see note)


## RabbitMQ

## RethinkDB
This is promising and slick, but changeset performance is a big question

## ZeroMQ
Fast, but how is reliability?

## NanoMsg
See ZeroMQ. Maybe is a bit faster?

## Redis

Note: To setup cluster, http://redis.io/topics/cluster-tutorial

# TODO

* Command interface to show sample of data in realtime with line charts
* Have workers send message every ~1 second to master. Don't use process.send() on
each message (overloads worker)
