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
