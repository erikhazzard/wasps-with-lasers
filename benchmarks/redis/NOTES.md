# Notes
-It seems that redis is not the bottle. At 2k messages / sec with 5k on each server
and 100 locally, messages are still delivered no problem.

* Core problem is the on message callbacks are triggered too much
