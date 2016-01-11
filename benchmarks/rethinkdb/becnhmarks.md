# RethinkDB Benchmarks

OSX 

## Single Message

`node sub-cluster.js -c 8 -n 1`

*8 CPUs, 1 connection each.*
[  cluster-master  ] 	[0.31ms] Got 8 messages - <8> total
[  cluster-master  ] 		 MIN: 6.558ms
[  cluster-master  ] 		 MAX: 6.745ms
[  cluster-master  ] 		 MEAN: 6.646999999999999ms
[  cluster-master  ] 		 HARMONIC MEAN: 6.646222994892627ms

*8 CPUs, 10 connections each (80 total)*
[  cluster-master  ] 	[0.864ms] Got 80 messages - <80> total
[  cluster-master  ] 		 MIN: 7.597ms
[  cluster-master  ] 		 MAX: 12.333ms
[  cluster-master  ] 		 MEAN: 10.13155ms
[  cluster-master  ] 		 HARMONIC MEAN: 9.965972774346284ms

*8 CPUs, 100 connections each (800 total)*
[  cluster-master  ] 	[52.208ms] Got 800 messages - <800> total
[  cluster-master  ] 		 MIN: 15.748ms
[  cluster-master  ] 		 MAX: 76.387ms
[  cluster-master  ] 		 MEAN: 59.91147874999999ms
[  cluster-master  ] 		 HARMONIC MEAN: 54.69172381918395ms

*8 CPUs, 1000 connections each (8000 total)*
[  cluster-master  ] 	[553.938ms] Got 8,000 messages - <8,000> total
[  cluster-master  ] 		 MIN: 98.357ms
[  cluster-master  ] 		 MAX: 654.078ms
[  cluster-master  ] 		 MEAN: 461.0412097500005ms
[  cluster-master  ] 		 HARMONIC MEAN: 357.1078050265658ms

NOTE: when inserting a single record with 8k connected clients, single insert
can take 100 - 800ms - for a single insert
