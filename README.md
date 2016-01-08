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
Redis has a built in Pub/Sub system. This can be tested, but also let's test some
alternatives and see where the tradeoffs are, maybe even some wacky things:
    * Pulling a ZSETs every 1/n seconds, using ZRANGEBYSCORE to get new messages
    * Use LRANGE with offsets - has a bad tradeoff of duplicating messages and missing messages if more messages were received than from a range
