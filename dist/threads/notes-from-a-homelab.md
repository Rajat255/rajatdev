---
title: "Why I Traded My Portfolio Template for Newsprint"
description: "A short note on serving this site from a box at home, and on why the weird, independent web is worth the trouble."
author: "Rajat Khirid"
published: 2026-10-26
category: "Field Notes"
tags: ["Homelab", "Self-hosting", "Astro", "Independent Web"]
url: "https://rajatdev.fun/threads/notes-from-a-homelab/"
canonical: "https://rajatdev.fun/threads/notes-from-a-homelab/"
word_count: 364
reading_time_minutes: 2
---

# Why I Traded My Portfolio Template for Newsprint

The previous version of this site was a single page of frosted-glass cards floating over an animated aurora. It was well built, and it looked like every other developer portfolio on the internet, mine included. It said "please hire me" very politely (and it did sometimes work), but it didn't say much else.

This version is a page of type on cream paper, and the change was mostly about what a page is allowed to contain.

## A portfolio is a pitch

A portfolio has one job, so everything on it has to serve that job. A personal site doesn't. The engineering is still here, in full, on [the builds page](/builds/). But the front page is also allowed to mention a Camus novel and a motorbike ride down the Konkan coast, and there's a [whole page for books and rabbit holes](/threads/). Those things are true about me too, and the template had no place to put them.

## The box

This site is served from a machine from my home. A request for it goes through Cloudflare's edge, down an encrypted tunnel, over an ordinary residential fibre line, through a reverse proxy, and into a container on a bare-metal Linux host. What comes back is a folder of static HTML that Astro built ahead of time.

There is no database and no server-side code, so the box barely notices visitors. You can see [its readings](/builds/#homelab) on the builds page. The uptime guarantee is simple: if you can read this, it is up.

## Why bother

Hosting it myself is not the cheapest way to put a website online, and it's certainly not the easiest. But the address is mine, the hardware is mine, and nobody's algorithm decides who sees it. If the site breaks, it breaks because of something I did, which also means I can fix it, which does keep happening. 

The independent web runs on people doing slightly impractical things with their own corner of it: blogs with strange layouts, digital gardens, sites that are just a list of the books someone liked. This is my corner. And it could be something else entirely the next time you visit, so keep visiting.

Thanks for reading.
