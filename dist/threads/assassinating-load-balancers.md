---
title: "How to Assassinate 10 Load Balancers and Cut an AWS Bill by 45% Without Anyone Noticing"
description: "Two and a half months, roughly $200K a year, and not one customer-facing change. A field guide to cutting a cloud bill quietly."
author: "Rajat Khirid"
published: 2026-09-14
category: "Infrastructure"
tags: ["AWS", "FinOps", "Graviton", "Load Balancers", "SQS", "Savings Plans"]
url: "https://rajatdev.fun/threads/assassinating-load-balancers/"
canonical: "https://rajatdev.fun/threads/assassinating-load-balancers/"
word_count: 531
reading_time_minutes: 2
---

# How to Assassinate 10 Load Balancers and Cut an AWS Bill by 45% Without Anyone Noticing

The bill was somewhere between $35,000 and $38,000 a month. Two and a half months later it was between $19,000 and $21,000, which works out to roughly $200,000 a year. Availability didn't change, nobody shipped a feature differently, and nobody outside the team noticed anything, which was the point.

Cost work gets a bad name because it is usually done loudly: a freeze on new resources, a spreadsheet of blame, a quarter of people arguing about tags. None of that was necessary. Most of the money was going to things nobody had looked at since they were created.

## Rule one: commitments go last

The tempting first move is to buy Savings Plans, because it is one click and the discount is large. It is also the move that locks in whatever waste you already have, for one to three years. If you commit to the spend of an over-provisioned fleet, you have made the waste cheaper rather than removing it.

So the order was: right-size, re-platform, consolidate, and only then commit, once capacity had settled into something predictable.

## The data tier

The databases were the biggest line, and the most interesting.

- **Aurora Serverless to provisioned Graviton.** Serverless is a good deal when load is spiky or unknown. Ours was neither. A steady workload on Serverless pays a premium for elasticity it never uses, so it moved to provisioned r7g instances.
- **Redis to Valkey, on Graviton.** Same workload, same client libraries, cheaper hardware.
- **Redshift dc2.large to RA3.** The dc2 family bundles storage with compute, so holding about 2 TB of data meant paying for compute just to have somewhere to keep it. RA3 separates the two.
- **Heavy Athena scans, rerouted.** Athena bills by data scanned. A few queries scanned the same large datasets over and over; a right-sized database answers them for a fraction of the cost.

## Compute

ECS Fargate is lovely until you read the invoice. The services moved to EC2 on Graviton, with Spot capacity for the jobs that can survive an interruption. CI runners moved to self-hosted machines as well, which turned a per-minute bill into a fixed one.

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

With the fleet right-sized and the architecture settled, the remaining baseline was steady enough to commit to. Compute Savings Plans went on last, sized to what was actually left.

The billing dashboard has not been the same since. Neither have the ten load balancers.
