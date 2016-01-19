# *800 clients*
`node sub-cluster.js -c 8 -n 100`

## _1 message / sec_
Publish 1 message per second (100 passes)
`node pub-cluster.js -t 1000 -n 1 -c 1 -p 100`

[  cluster-master  ] 	Total received: 10400
[  cluster-master  ] 		 MIN: 0.397ms
[  cluster-master  ] 		 MAX: 6.327ms
[  cluster-master  ] 		 MEAN: 2.33579711538461ms
[  cluster-master  ] 		 HARMONIC MEAN: 1.9182195670806292ms


## _10 message / sec_
[  cluster-master  ] 	Total received: 228000
[  cluster-master  ] 		 MIN: 0.33ms
[  cluster-master  ] 		 MAX: 18.242ms
[  cluster-master  ] 		 MEAN: 6.668003192982599ms
[  cluster-master  ] 		 HARMONIC MEAN: 4.313213412372611ms

## _100 message / sec_
[  cluster-master  ] 	Total received: 3360000
[  cluster-master  ] 		 MIN: 0.293ms
[  cluster-master  ] 		 MAX: 97.38ms
[  cluster-master  ] 		 MEAN: 34.677810819344884ms
[  cluster-master  ] 		 HARMONIC MEAN: 18.375906239827007ms

Note: No slowdowns. Very steady

# *8000 clients*
`node sub-cluster.js -c 8 -n 1000`

## _10 message / sec_
[  cluster-master  ] 	Total received: 800000
[  cluster-master  ] 		 MIN: 26.152ms
[  cluster-master  ] 		 MAX: 386.233ms
[  cluster-master  ] 		 MEAN: 167.23781696124573ms
[  cluster-master  ] 		 HARMONIC MEAN: 124.16555377288029ms

Note: Very fast, no slow downs

## _50 messages / sec_
[  cluster-master  ] 		 MIN (current): 0.323ms
[  cluster-master  ] 		 MAX (current): 376.611ms
[  cluster-master  ] 		 MEAN (current): 149.23278340674054ms
[  cluster-master  ] 		 HARMONIC MEAN (current): 56.17647388365534ms

## _100 messages / sec_
Note: holds steady at 250k+ messages / sec AFTER publisher stops. 


# TODO: Try many clients, many messages / sec across nodes

# ===============
# Multiple Server Tests

## Single redis server, 3 cluster with 3 replicas (6 total instances)

Publisher:
    ~9,500 messages / second

-Network traffic rates skyrocket to 90+MiB/s with cluster
-Instance CPUs are low utilization (~10-30%)
-More messages / sec published increae rate. Additional subscribers marginally add
traffic oddly

Subscibers:
    Local: 1 (to check that times don't get skewed)

    Server 1: (3 processes) (10 + 10 = 100) - 100 * 3 = 300
    Server 2: (same) 300

-Hold steady after a few clients. Biggest bottleneck is node

=====

## SINGLE INSTANCE

    * Excellent performance. No missed messages, timings don't degrade
10k messages/second
3,600 800 subscribers (two servers) 
    -Still fast. 0 - 250ms delay
    -Local (not on same network) : 34 - 90ms delays. MAX acroos ALL is 1182ms

-40 mb/s
    -Every 400 ubs adds ~4mb / sec, 100 = 1mb/sec

-CPU : ~ 59%

### Test 2:

Iteration 1:
    Pub: 1,000m/s
    CPU: 2 - 3%

    Client 1: 4k connections (2k per CPU)
    CPU on Client: 70 - 85%

    Works Perfectly

Iteration 2: 
    Pub: 1,000m/s
    Data: 100kb/s
    CPU: 3.3 - 4.6%

    Client 1: 4k connections (2k per CPU)
    Client 2: 4k connections (2k per CPU)
    Client 2: 4k connections (2k per CPU)
    CPU on Clients: 70 - 85%


Iteration 3:
    SUB:
    (37k total)
        Client: 12k (5 + 5 + 1 + 1)
        Client 2: 12k (5 + 5 + 1 + 1)
        Client 3: 11k (5 + 5 + 1)
        Local 2k
            times between 6- 17ms !!! (This is connected to AWS)
            Max even with 35k+ clients does not exceed ~100ms (outlier)

    Pub: 100 messages / sec
        Data: 10kb/s
        Pub CPU: 3%
        Sub CPUs: 10 - 25%, gets all
        
    Pub: 1000 messages / sec
        node pub-cluster.js -n 5 -t 100 -c 20 -H 172.30.0.179 
        Pub CPU: ~25%
        never really went above 30
        Sub CPUs: 70 - 100%. Still getting messages

    Works perfectly. Messages come in quickly everywhere

    Left running for ~10 minutes. When stopping, all messages immediately cleared.
    Perfect


    Overall: Pub layer is fast as shit. Subs are fast; nodejs can't handle the
    bandwidth easily
        With 1k messages / sec test:
               37,000,000 messages / sec (37million)
             2,220,000,000 messages / min (2.22 billion)
            22,200,000,000 messages / 10 min

    TODO: Write scripts to connect to server and exectue scripts


Iteration 4:
    Each server: 24.5k clients (`node sub-cluster.js -c 5 -n 700 -H 172.30.0.179` run 7 times)

    Total: 73500 total clients

    Pub:
        NOTE: Subs perform better (don't crash) when publiser is not bursty

    * 1 msg/s
        -local: 14 - 25ms
        -clients: everyone gets it fast. No slow downs
        -CPU: 0%

    * 10 msg/s
        -local: 14 - 25ms
        -Pub CPU: ~0%

    * 20 msg/s
        -local: same
        -Pub CPU: ~0%
        Sub cpus: 5 - 7%

    * 60 msg/s
        -Local: same
        -Pub CPU: 5 - 7%
        -Sub cpus: 15 - 20%
        -Pub bandwidth: 200kb/s

    * 120 msg/s
        -Pub CPU: 9-17% (hovers around 10-11% usually)
        -Sub CPUs: ~30%
        -Local: 9-30ms (still unaffected)

    * 800 msg/s
        -redis at ~40%
        -subs > 100% cpu with -c 5 and -n 700
        -Subs at 60% with -n 5 and -n 300. Holds well ( 1,500 clinets)

    * 8000 msg/s
        -sub : 1 cpu with 250 clients handles well, 80% cpu


## Cluster
Pub: 10k/sec
    After 400 subs, network traffic is over 100 mb/sec. Then it goes down to
    80mb/sec and additional subs don't add more (why?)

Pub: 500 / sec:
    8 mb/s

