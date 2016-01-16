# Benchmarks - Inserts

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

