# Benchmarks - Inserts

NOTES: To run a proxy, use: /usr/bin/rethinkdb proxy --join 172.30.0.179 --bind all
where the IP is the rethinkdb IP

NOTES: To visualize output, copy data dump from data-output/FILE.json to ../util/data-output/data.json and run a local HTTP server from the ../util/ folder (e.g., `http-server -p 8021`), then open `http://localhost:8021/d3-viz.html`

## Test 1


### Setup:
Single RethinkDB instance, 3 shards.

Publisher command: `node pub-cluster.js -c 8 -n 1 -t 2`

Results: 
Fairly steady 3k inserts per second
┌────────────────────┬──────────────────┬────────────┐
│ #81                │ Current Interval │ All        │
├────────────────────┼──────────────────┼────────────┤
│ Messages Inserted  │                  │ 295,036    │
├────────────────────┼──────────────────┼────────────┤
│ Min                │                  │ 0.684ms    │
├────────────────────┼──────────────────┼────────────┤
│ Max                │                  │ 2959.965ms │
├────────────────────┼──────────────────┼────────────┤
│ Mean               │                  │ 38.61ms    │
├────────────────────┼──────────────────┼────────────┤
│ Standard Deviation │                  │ 193.74ms   │
├────────────────────┼──────────────────┼────────────┤
│ 85 Percentile      │                  │ 33.95      │
├────────────────────┼──────────────────┼────────────┤
│ 95 Percentile      │                  │ 94.84      │
└────────────────────┴──────────────────┴────────────┘


## Test 2
### Setup
Two rethinkdb servers, once instance each. Two shards (one per server), 
four replicas (two per server)


#### Single client
One client (in aws network)
`node pub-cluster.js -c 30 -n 1 -t 4` 

RethinkDB cluster status: 7k messages / sec very steady.

┌────────────────────┬──────────────────┬──────────┐
│ #22                │ Current Interval │ All      │
├────────────────────┼──────────────────┼──────────┤
│ Messages Inserted  │                  │ 165,911  │
├────────────────────┼──────────────────┼──────────┤
│ Min                │                  │ 1.123ms  │
├────────────────────┼──────────────────┼──────────┤
│ Max                │                  │ 205.53ms │
├────────────────────┼──────────────────┼──────────┤
│ Mean               │                  │ 7.46ms   │
├────────────────────┼──────────────────┼──────────┤
│ Standard Deviation │                  │ 17.81ms  │
├────────────────────┼──────────────────┼──────────┤
│ 85 Percentile      │                  │ 8.99     │
├────────────────────┼──────────────────┼──────────┤
│ 95 Percentile      │                  │ 33.27    │
└────────────────────┴──────────────────┴──────────┘

#### Two clients at once
Two clients (in aws network), each running:
`node pub-cluster.js -c 30 -n 1 -t 4` 

After running for a bit, the proxy stops working. No more messages get sent.
Heartbeat time outs: error: Heartbeat timeout, killing connection to peer 172.30.0.178:29015
Caps out at 6.2k writes per second - interface stops responding. Even after publishers stop inserting messages
