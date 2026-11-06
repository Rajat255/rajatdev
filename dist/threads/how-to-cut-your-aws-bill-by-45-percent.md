---
title: "How to Cut an AWS Bill by 45% Without Anyone Noticing"
description: "Two and a half months, roughly $200K a year, and not one customer-facing change. A field guide to cutting a cloud bill quietly."
author: "Rajat Khirid"
published: 2026-09-14
category: "Infrastructure"
tags: ["AWS", "FinOps", "Graviton", "Load Balancers", "SQS", "Savings Plans"]
url: "https://rajatdev.fun/threads/how-to-cut-your-aws-bill-by-45-percent/"
canonical: "https://rajatdev.fun/threads/how-to-cut-your-aws-bill-by-45-percent/"
word_count: 925
reading_time_minutes: 4
---

# How to Cut an AWS Bill by 45% Without Anyone Noticing

The bill was somewhere between $35,000 and $38,000 a month. Two and a half months later it was between $18,000 and $20,000, which works out to roughly $200,000 a year. Availability didn't change, nobody shipped a feature differently, and nobody outside the team noticed anything, which was the point.

Cost work gets a bad name because it is usually done loudly: a freeze on new resources, existing apps running slow, a spreadsheet of blame, and arguing about tags. Most of the money was going to things nobody had looked at since they were created. And we did not achieve this by simply buying out the AWS servers in advance.

## Rule one: commitments go last

The tempting first move and the lowest hanging fruit of them all is always to buy Savings Plans and Reservations, It is what most of the consultants in the field suggest, because it is one click and the discount is large. It is also the move that locks in whatever waste you already have, for one to three years. If you commit to the spend of an over-provisioned fleet, you have made the waste cheaper rather than removing it.

So the order was: right-size, re-platform, consolidate, and only then commit, once capacity had settled into something predictable.

## The data tier

The databases were the biggest line, and the most interesting.

- **Aurora Serverless to provisioned Graviton.** Serverless is a good deal when load is spiky or unknown. Understanding where our spikes came from was a crucial task, we spent some time looking at the usage graphs, the website traffic goes up drastically during the evening but the database spikes did not show the same pattern, it looked rather like some crons were running. We looked removed heavy crons, looked at the most time consuming queries and built and index for their tables, a few optimizations in the code and we had a system where the load predictable. And a steady workload on Serverless pays a premium for elasticity it never uses, so it moved to provisioned r7g instances. Further down the road we changed the storage to I/O Optimized as our data storage was rathr less but the TPM was slightly high which worked greatly in ur favour.
- **Redis to Valkey, on Graviton.** Valkey was launched by AWS on AWS as an answer to the pricing model of Redis, it is esentially just a fork of redis when it was free. Now at the time of writing this page I hear that redis has again put out their new version with a free pricing. Although AWS has kind of now locked in the people who migrated to valkey by selling reservations tied to the engine, we have little incentive to go back to Redis anyways.
- **Redshift dc2.large to RA3.** The dc2 family bundles storage with compute so if your data warehouse requires more storage you've got buy RAM and CPU as well, so holding about 2 TB of data meant paying for compute just to have somewhere to keep it. RA3 separates the two and moving to it made huge sense.
- **Heavy Athena scans, rerouted.** Athena bills by data scanned. And we had so many automations which started small but as time went by the data kept piling up, and just in a few years we had hundreds of automations scanning TBs of data per day, queries kept scanning the same large datasets over and over; We created right-sized database put in the seeded the data into it and now the automations run at fraction of the cost. We were even able to turn off the database when the automations were not runing.

## Compute

ECS Fargate which is publicized as a serverless, and an all time running server is lovely until you read the invoice, escpecially when you are restricted to only use x86 processors. I moved the all our ECS services to EC2 on Graviton, with Spot capacity for the jobs that can survive an interruption. 

## The assassinations

There were 14 Application Load Balancers. Each one carries an hourly charge whether it serves a million requests or none, and most of ours fronted a single small service.

An ALB listener can route by host header and path to many target groups, so one load balancer can do the job of several. Fourteen became four.

> Nobody files a ticket about a load balancer that no longer exists. That is the whole trick.

## The quiet one: SQS long-polling

Short polling returns immediately, usually with nothing in it, and every empty receive is a billed request. Consumers that poll in a tight loop run up a surprising bill for doing nothing. Long-polling makes the request wait for a message instead:

```hcl
resource "aws_sqs_queue" "jobs" {
  name                      = "jobs"
  receive_wait_time_seconds = 20 # long-poll: far fewer empty, billed receives
}
```

That one setting cut SQS costs by about 90%.

---

## Then, and only then, the commitment

With the the architecture settled, the fleet right-sized, and the system optimized the remaining baseline was steady enough to commit to. Compute Savings Plans went on last, sized to what was actually left.
The databases, elasticache, and elasticSearch nodes were now reserved, instances and lambdas shared the saving plans.

The billing dashboard has not been the same since. Even 
after 1.5 years of scaling out and growing we still haven't every crossed the 25K USD mark. Writing the prcess down does make me feel like we had to know a lot of stuff and get everything right at each step, but the process itself was super easy, just look at the bill, get your pain points ready, and start with the largest and highest impact ones to the smallest.
