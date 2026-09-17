# Migration baseline

The inventory of every page on the four legacy domains: what exists, how many, and what
each becomes. It is the reference the migration is measured against at the end.

Artifact: `baseline.csv`, 308,107 rows, one per distinct legacy URL.
Rebuild in ~4 seconds with `python3 scripts/build-baseline.py`.

Measured 2026-09-14 from the published sitemaps of all four domains, plus a 21-request
structural check of site navigation.

Every count below carries its unit and its method. A row with a recorded gap is finished.
A round number with no method behind it is not.

## 1. Units

The corpus has been described as 100k, 200k and 300k. Those are different units, and all
of them are correct.

| Figure | Unit | Measured |
| --- | --- | --- |
| Articles | sitemap entries under `article.php`, per domain | 106,474 |
| Distinct article slugs | per domain, after normalising case and encoding | 100,553 |
| Identifier ceiling | highest `?id=` seen | 208,772 |
| Distinct article URLs | across three editorial domains | 307,555 |
| Total sitemap entries | across three editorial domains | 319,678 |

### The 100,141 figure counts addresses, not articles

The sitemap emits one entry per article, repeating the URL where a slug is reused. The
worst address appears 105 times on all three domains.

Confirmed two ways on 2026-09-14:

1. In wealthbriefingasia.com's own sitemap, 493 slugs carry more than one distinct `?id=`.
   One slug carries 25.
2. Five articles fetched by id under one shared slug returned five different dates, five
   different bodies and five different hashes, with no shared text. The server returned
   the id requested in all five cases.

So one sitemap entry is one article. The corpus is ~106,474 articles, not ~100,141.
The three editorial domains carry the same articles, so that is the total, not per domain.

Article count drives R2 objects and Algolia records, which is the client's recurring cost,
and the Schedule fixes the figure before those costs are committed.

### The three domains carry the same articles

Comparing slugs with every separator removed: 100,432 distinct slugs across the three
domains, 100,427 present on all three, none unique to a single domain.

Slug alone cannot join an article across domains: the typographic apostrophe survives on
wealthbriefingasia.com and familywealthreport.com and is stripped on wealthbriefing.com.

## 2. Inventory

Per editorial domain, then multiplied by three.

Template numbers are from Deliverables section 3. **Which legacy family maps to which
template is this document's proposal, not an agreed mapping.** Nothing in the project
documents assigns them. Some are near-direct: `page.php?p=contact` and the policy pages
are what template 14 describes as "about, contact, policies", and the clearviewpublishing
events are template 08 by the migration section. Others are a reading: the 75
`section.php` type listings are put against template 04 "Category / topic listing" because
that is the closest fit, not because anyone said so.

Confirm the column before the baseline is frozen.

| Family | URL shape | Per domain | 3 domains | Destination |
| --- | --- | --- | --- | --- |
| Articles | `article.php/{slug}` | 106,474 entries / 102,208 URLs | 307,555 URLs | Static archive |
| Editorial type listings | `section.php?type=` | 75 | 225 | Template 04 |
| Static pages | `page.php?p=` | 7 | 21 | Template 14 |
| Homepage | `/` and `index.php` | 2 | 6 | Template 02 |
| Register | `register.php` | 1 | 3 | TBD |
| Subscribe | `subscribe.php` | 1 | 3 | Template 12 |
| WealthTalk | `wealthtalk.php` | 1 | 3 | TBD |

The seven static pages are overview, contact, advertise, editorial, termsandconditions,
privacypolicy, disclaimer.

### clearviewpublishing.com

From the Yoast sitemap index. 291 distinct URLs.

| Family | URL shape | Count | Destination |
| --- | --- | --- | --- |
| Events | `/events/{slug}/` | 244 | Template 08 |
| Resources | `/resource/{slug}/` | 13 | Template 09 |
| Static pages | various | 13 | Templates 01, 14 |
| Acclaim | `/acclaim/{slug}/` | 9 | Template 06 |
| Awards programmes | `/acclaim-awards-programme/{slug}/` | 7 | Template 06 |
| Event categories | `/events-category/{slug}/` | 4 | TBD |
| Resource categories | `/resource-categories/{slug}/` | 1 | TBD |

Events are 244 against the contractual 242. The Schedule carries events added before
launch at no change.

Companies and People have admin menus but no public URLs and no sitemap. They migrate as
referenced entities, not pages, and need no redirects.

The five taxonomy URLs are a family no project document names. They need a destination
rule.

Two static pages need a decision rather than a redirect: `/awards-submissions-saved/`
looks like a form-state page, and `/virtual-family-office-fintech-summit-2020-replay/` is
a 2020 event held as a page rather than an event record.

One event page needs a decision about its listing rather than its address.
`/events/swiss-finance-institute-international-wealth-management-retreat/` is the only one
of the 255 exported event records carrying no `events-category` term, so no listing claims
it. Measured 2026-09-17 in the export: event dated September 2013, record created
2015-07-14, carrying a start date, an end date and 811 characters of body text and nothing
else. The address is kept and answers 200 either way; the open question is whether the
page appears under summits, under briefings, or on no listing at all. This document's
destination column reads `awardsProgramme / conferenceEvent` for it, which is the same
question left open.

### Total

308,107 distinct URLs: 307,816 editorial and 291 on clearviewpublishing.com.

The contractual figure is 306,641 + 289 = 306,930. The difference of ~1,177 is output
since the original measurement, which is what the pre-launch re-capture exists to catch.

### Alias domains

`baseline.csv` covers the four publication domains. fwreport.com is a fifth host and is
not in the file, because it carries no pages of its own.

Measured 2026-09-14: it mirrors the whole path, one hop, then 200.

    fwreport.com/{any path}  ->  301  ->  www.familywealthreport.com/{same path}

So it is a rule, not 102,763 rows. Expanding it into the file would double the
verification target and prove nothing the rule does not.

The Schedule describes an alias as taking "a single permanent (301) redirect to that
publication". The measured behaviour is a per-URL path mirror, which is a different thing.
Verification should assert the rule on a spread of paths rather than on the root alone.

Whether other alias domains exist is open. Registrar access answers it definitively and is
a client dependency for cutover regardless.

### Families that do not exist

There are no author pages, no category or tag pages, and no separate research pages.
Content is grouped only by the 75 `section.php` types.

Confirmed twice: absent from every sitemap, and absent from the internal links on the
pages fetched. Those links resolve only to `article.php`, `section.php`, `page.php`,
`printarticle.php`, `sharearticle.php`, `registernow.php`, `subscribe.php`, `index.php`
and `login.php`.

`login.php` is in no sitemap and therefore not in the inventory. The new platform has no
user accounts, so it needs a decision rather than an equivalent.

### Reused addresses

| Domain | Reused addresses | URLs carrying `?id=` |
| --- | --- | --- |
| wealthbriefing.com | 3,472 | 0 |
| wealthbriefingasia.com | 3,070 | 9,141 |
| familywealthreport.com | 3,070 | 9,143 |

9,612 addresses are reused across the three domains, hiding 11,862 articles.

wealthbriefing.com publishes no identifier in any URL. That matters for the redirect map,
which is generated from identifiers, and it is work for that task rather than this one.

## 3. Defects found in the source data

| Defect | Consequence |
| --- | --- |
| Sitemaps publish unencoded spaces, e.g. `section.php?type=Daily News Analysis` | A standard HTTP client refuses the address. The baseline must settle which form is canonical for matching |
| `https://wealthbriefing.com/` returns a 62-byte meta-refresh to `/html/index.php` | The redirect map must target the content, not the stub |
| Three `article.php/` URLs with an empty slug, one per domain, each listed 6 times | 18 sitemap entries point at an article with no address |

## 4. Gaps

| Gap | What closes it |
| --- | --- |
| Destination rule for the five taxonomy URLs, plus `register` and `wealthtalk` | Client, with the editorial section paths |
| Listing for the one uncategorised event, `swiss-finance-institute-international-wealth-management-retreat` | Client. Summit, briefing, or off every listing |
| Alias domains beyond fwreport.com | Registrar or DNS access, which is a client dependency anyway |
| Every URL's status, title, meta and canonical | A pass over all 308,107 pages. Blocked on written crawl permission |
| Organic entry pages, most-linked | Search Console access on all four domains |

The four empty columns in `baseline.csv` are filled by a single pass over every page:
71 days at the rate the `robots.txt` files ask, about 28 hours at one request per second.
That pass is the same crawl as the archive export and belongs with it, not here.

## 5. Freeze

The baseline is agreed and fixed at the end of Discovery, then re-captured immediately
before launch.

Launch sign-off measures against it: every URL in the agreed baseline must return a single
301 to a live 200 with no noindex. If section 2 grows, the verification target grows, and
the client sees that before the number is contractual.
