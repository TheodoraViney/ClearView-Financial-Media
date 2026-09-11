# WealthBriefing Group Platform

Consolidation of four WealthBriefing Group websites onto one Next.js and Sanity platform.
Client is ClearView Financial Media Ltd, London.
Delivery by FocusReactive under a fixed-price contract.

This file is the project context.
It is the source of truth for agents and for new engineers.
Read it before you write schema or touch the archive pipeline.

## 1. The product

Four publications move to one codebase and one deployment.

| Brand | Domain | Role |
| --- | --- | --- |
| WealthBriefing | wealthbriefing.com | Editorial. 82% of traffic. Fronts the archive. |
| WealthBriefingAsia | wealthbriefingasia.com | Editorial. |
| Family Wealth Report | familywealthreport.com | Editorial. |
| ClearView Publishing | clearviewpublishing.com | Group front door. Events and awards. |

Each publication keeps its own apex domain.
This protects the SEO authority of each brand.
The client reopened this decision in writing and won it.
Do not propose consolidation to a single domain.

The client makes money from awards programmes and conferences.
Editorial traffic ranks below sponsorship revenue in their priorities.
This is why 242 event records get a scripted migration and 100,141 articles get frozen as static files.

## 2. Stack

- Next.js on Vercel Pro. One deployment serves all four domains.
- Sanity CMS, Growth plan.
- Cloudflare in front of Vercel. R2 for the static archive.
- Algolia Grow for search.
- Brevo for newsletter and signup forms.
- Google Ad Manager for advertising. CookieYes for consent.

Vercel functions default to `iad1`.
Pin them to `lhr1` or `fra1`.

## 2a. Codebase

Single Next.js 16 app at the repo root with Sanity Studio embedded at `/studio`.
One Vercel project serves all four domains.
Infrastructure and routing are described in `docs/infrastructure.md`.

### Commands

```
pnpm dev          # http://{brand}.localhost:3000, see docs/infrastructure.md section 8
pnpm certs        # one-time mkcert certificate for localhost and *.localhost
pnpm dev:https    # https://{brand}.localhost:3000, needed for cross-brand Presentation previews
pnpm typegen      # extract schema and generate src/sanity/types.ts, run after any schema or query change
pnpm typecheck
pnpm lint
pnpm build
pnpm seed:brands  # create the four brand documents, needs SANITY_API_WRITE_TOKEN
```

Copy `.env.example` to `.env.local` and fill the two tokens.

### Brand resolution

`src/proxy.ts` reads the `Host` header, maps it to a brand key in `src/brands.ts`, and rewrites the request to `/sites/{brand}/...`.
Pages live under `src/app/sites/[brand]/`.
Direct requests to `/sites/*` return 404, so the internal prefix is never reachable.
Unknown hosts (Vercel previews) fall back to `DEFAULT_BRAND`, switchable with the httpOnly `brand` cookie via `/api/brand/{key}`.
The cookie is ignored on known hosts.

The prefix is `/sites`, not `/_sites`.
Next treats `_`-prefixed app folders as private and the URL-encoded workaround breaks `generateStaticParams`.

### Content model conventions

- Brand assignment is stored as brand KEY strings, not references. `post.brands` is a checkbox multiselect of editorial brands. `page.brand` is a radio of all four.
- Brand settings documents have fixed ids `brand-{key}` from `brandDocumentId()` in `src/brands.ts`.
- Never put a `.` in a document id. Sanity gives anonymous readers access to root-path ids only, and the site reads published content without a token so it stays CDN-cacheable. A dotted id is invisible to the site.
- Every content query in `src/sanity/queries.ts` takes `$brand` and filters by it. Fetching a post on the wrong brand host returns 404, never a redirect.

### Caching

`cacheComponents` is on.
`src/sanity/live.ts` holds the app's only `'use cache'` boundary, `cachedSanity`.
Sanity Live tags each cached result with the documents that produced it, so publishing a WealthBriefing-only post never expires Family Wealth Report's pages.
Cache expiry is triggered by `<SanityLive>` in a visitor's browser.
`curl` alone never expires anything.
In dev, `'use cache'` entries persist in `.next/dev/cache` across restarts; delete that folder after seeding content by script.

## 3. Architecture rules

These rules are settled.
Breaking one rebuilds the thing the architecture exists to avoid.

### Routing keys on the hostname

Middleware resolves the publication from the `Host` header.
There is no path prefix such as `/asia/`.
The client brief describes path prefixes and was superseded on 2026-08-06.
Any document older than that date describes a deleted architecture.

### Brand separation is data, not schema

One `publication` document type holds four documents.
Each carries domain, logo, colour tokens, navigation, footer, banner positions, newsletter template, analytics stream and ad unit prefix.

There are no per-brand document subtypes.
There are no per-brand datasets.
Separate datasets break the central awards and events records.
Cross-dataset references are an Enterprise feature.

### No legacy article ever enters Sanity

The 100,141 measured legacy articles ship as flat HTML on Cloudflare R2.
Editorial is forward-only from launch.

Do not model an `Article` type for legacy content.
Do not write an importer.
Do not import metadata stubs so editors can reference old articles.

### Sanity Growth is a 25,000 document hard stop

There is no overage.
Drafts count. All datasets count.
At the measured rate of about 3,100 articles per year that is roughly eight years.

Auto-retiring old articles into the static archive would hold the count flat.
It is in neither the contract Schedule nor the estimate.

### The archive is a second origin

`/archive/...` is a static rewrite to R2.
The prefix is deliberately disjoint from app routes.
This avoids a per-request precedence lookup and keeps the archive edge-cacheable.

The Next.js fallback-rewrite model was evaluated and rejected.

### Archive URLs are /archive/{id}/{slug}

The id comes first. The slug is cosmetic.
7,729 legacy URLs sit on 3,469 reused addresses.
The worst address is reused 105 times.
The collisions are distinct articles, not revisions.
A year prefix cannot separate a daily column.

This prefix has never been named to the client.
Surface it in Discovery before the redirect baseline is frozen.

### Cache keys must include the host

Brand resolves from the hostname and is trusted downstream.
Two CDNs are stacked.
If either cache key omits the host, one brand's HTML serves on another brand's domain.

Cross-brand serving is a tested area of the security assessment.
A high finding there blocks launch sign-off.
Exhaustive cache-key analysis is out of scope, so this must be right by construction.

### Search reaches the archive, listings do not

Editorial listings, category pages and author pages show post-launch content only.
Site search is different.
The archive is indexed in the same Algolia index.
A reader searching on launch day gets twenty years of results.

The Algolia index has two producers.
The export pipeline emits archive records.
The CMS syncs post-launch content on publish.
Exporter and indexer are one piece of work.

Full body text is not indexed.
Matching runs on headline, standfirst, publication, type, date, author and an extract.
Debounce is a build requirement at about 2.5 requests per search.

### No Content-Security-Policy ships

Google Ad Manager creative loads from origins nobody can enumerate in advance.
A strict policy either degrades to `unsafe-inline` or blocks ad revenue.
This is a contractual exclusion, sold as purchasable extra scope.

The client brief lists CSP in its fixed stack.
An engineer applying FocusReactive defaults will try to build one.

HSTS ships.
Do not set the preload flag at launch.

### Do not install @getbrevo/brevo

The official Node SDK v6.0.3 declares no licence at all.
There is no `license` field and no LICENSE file.
The contract has an IP-transfer clause and a committed licence report at handover.

Use plain `fetch` against the Brevo REST API.

### There are no user accounts

No logins, no paywall, no payments anywhere.
The only real access boundary is unpublished Sanity content.

The security assessment targets draft leakage, GROQ injection, CMS-authored `javascript:` hrefs, cross-brand page serving and DNS takeover.

## 4. Where the complexity is

### Archive extraction

Four traps compound against a legacy estate that fails silently.

- `printarticle.php` truncates body text at inline keyword links. Use `article.php/x?id=N`.
- The `iso-8859-1` meta tag is a lie. 56 of 56 sampled files decode as strict UTF-8. Pin UTF-8 at the byte level.
- The client apex-to-www 301 percent-decodes the path. Request `www` and preserve percent-encoding.
- 2,459 sitemap addresses hard-400. 3,345 silently return a different article with a 200. The silent kind reports success and appears in no error log.

### Crawl throughput is unreconciled

Two measurements from the same day disagree by about 120x.
One says about 112k ids and 5 GB in about 3 hours at 4 concurrent.
The other says the server returns empty-body 500s after roughly 5 requests in a minute.

At the lower figure the same crawl takes over two weeks.
Re-measure sustained throughput in week one before planning the export or the cutover window.

Their `robots.txt` asks crawl-delay 60 on wealthbriefing.com and 30 on the others.
Honoured literally that is 78 days.
The ask to the client is an agreed rate and an off-peak window, not just a waiver.

### Redirect verification can pass and still be wrong

306,641 legacy article URLs across three editorial domains.
Plus 289 URLs on clearviewpublishing.com.
Verification runs across the full baseline, not a top-N sample.

The script asserts one 301 to a live 200, with a correct canonical and no `noindex`.
It cannot assert the destination is the right article.
Correctness is defined by the generated map itself.

A systematic identifier-resolution error passes the launch gate.
It surfaces only under real traffic, after browsers cached a permanent redirect.

Mitigation: cut over on 302, then flip to 301 once destinations are confirmed under live traffic.
Put this in the cutover runbook.
This is an internal decision and is deliberately absent from client documents.

### Reused slugs reverse legacy behaviour

The legacy resolver serves the oldest edition of a shared address.
This is deterministic across repeated fetches.
The contract Schedule redirects to the most recent edition instead.

A parity check reports about 3,469 intentional mismatches on wealthbriefing.com alone.
Assert the new rule in the verification script, not legacy behaviour.

### Cutover mechanics

- Lower DNS TTLs to five minutes at least 48 hours before cutover. Restore after. This is a client dependency.
- "Parallel run" does not mean legacy sites keep serving. The redirects are the mechanism. Legacy infrastructure stays on standby.
- Re-run the export and the redirect baseline immediately before cutover. This catches about 14 weeks of newsroom output. Ids are sequential, so the delta is "ids above the last one crawled".

### Multi-brand forces every response dynamic

In the demo, the root layout and the home page both await `headers()`.
Content comes through `defineLive`.
Nothing prerenders and nothing ISR-caches.

Traffic is not the problem.
187,837 pageviews per month across four domains is about 0.07 requests per second.
The point is that a hostname-multiplexed app needs a deliberate caching design.
Do not inherit a 55-document prototype shortcut.

### Sanity Presentation cannot tell the brands apart

All four publications render at the same routes.
Route matching cannot know which brand a document belongs to.

The demo uses a `?brand=` query parameter and a first-match-wins `mainDocuments` filter.
This has a known defect.
Opening Presentation bare pairs the WealthBriefing preview with the Family Wealth Report home document.

The contract promises click-to-edit with live preview on all four brands.
This needs real per-hostname preview-origin resolution.

### Stega breaks brand theming in draft mode

Visual Editing embeds about 1,200 zero-width characters in every returned string.
A hex colour stops being a valid CSS colour.
Measured as a white-on-white hero inside Presentation while live sites were fine.

Clean individual values with `stegaClean`.
Never clean the whole document, or text loses click-to-edit.

### Awards and events migration

The source is WordPress, not Sanity and not the legacy PHP estate.
242 published event records. 253 including drafts.
77 ACF fields on the events edit screen, including repeaters, groups and `post_object` relations.

It is ACF, not Pods.
Every document before 2026-08-06 said Pods and was wrong.

The events, companies and people CPTs are not REST-exposed.
Dates and venues are structured fields, so this migrates as records rather than prose parsing.

This WordPress was hit by ClickFix malware on 2026-08-20.
Scan everything imported, whatever the export date.

### Media

26,950 files against 275 real content records.
A 170-file sample came back 97% unattached to any post.

Storage is settled at 26.41 GB against a 100 GB cap.
25,380 images at 0.20 MB mean is 5.2 GB.
1,207 PDFs are 14.8 GB, which is 56% of all bytes.
42 videos are 6.3 GB. Growth is 2.6 GB per year.

Carrying everything is affordable.
The resize-on-upload argument is dead as a capacity case.
A per-record reference walk is still needed, for hygiene.

### Author metadata is present but empty

Measured on 40 archive articles.
Byline 40 of 40. Date 40 of 40. Job title 25 of 40. Firm 1 of 40.
All three together 0 of 40.

Do not render job title or employer on archive pages.
Do not build an archive author facet around them.
The CMS author template is unaffected, because it holds post-launch content only.

## 5. Scope

### MVP

10 unique blocks, multi-brand foundation, ClearView events and awards migration, GAM foundation, signup forms to Brevo, newsletter integration, semantic search foundation.

Templates 01, 02 and 15 are MVP: group overview homepage, publication homepage, shared record listings.
16 templates total across MVP and Phase 2.

### Phase 2

Hosting behind Cloudflare, full analytics and tracking, 20 more unique blocks for 30 total, content hubs for blog and events and awards, editorial archive export to static HTML, full GAM integration, search filters and facets.

### Out of scope

- Industry intelligence layer. A database of Organisations and People linked to awards, events and articles.
- RAG answering over the archive. Search across the archive IS in base scope. Keep this distinction sharp.
- Native event registration forms.
- News feed automation for appointments.
- SEO tools, analytics and A/B tools inside the CMS.
- Multilingual support.
- Independent penetration testing and any certification.
- Archive referenceability. Editors cannot reference an archived article from any CMS page.
- A post-launch warranty period.
- On-call rota, 24/7 SRE, enterprise observability. The client refused these in writing.
- Scheduled unpublish and coordinated multi-document publishing. Sanity deprecated Scheduled Publishing in October 2025. Unpublish now lives in Content Releases, an Enterprise add-on. Cover this in editor training.
- Bulk re-export after launch.
- Exhaustive cache-key analysis, DDoS and load testing.

## 6. Commercials and timeline

Fixed price. Budget is £36,465.
43 engineer-days, 14.6 tech-lead days, plus design.
Start 2026-09-01. End 2026-11-30. Delivery 2026-12-02 to 2026-12-08.

Design phase slipped from 2026-09-01 to 2026-09-14.
The timeline needs revisiting. Current RAG status is At Risk.

The quoted price is the Claude-assisted variant.
The saving is about 28-30% blended and concentrated in design and repeated UI blocks.
Bespoke logic, migration, integrations and QA are not discounted.

There is no warranty period.
Anything failing the seven Section 15 launch sign-off conditions is corrected free with no time limit.
Everything else runs under the Section 17 retainer at 15 hours or £1,000 per month.
Get the sign-off list green before the final milestone.

Change control requires a written quote including schedule impact before work starts.
It grants schedule relief for approved changes.
Use it.

## 7. Success criteria

| Goal | Metric | Target |
| --- | --- | --- |
| Editorial publishes independently | All page types published with no developer | Confirmed at launch acceptance |
| No SEO traffic loss | 301 to 200, correct canonical, no noindex | Full baseline: 306,641 + 289 URLs |
| Performance | Lighthouse | 90+ |
| Accessibility | WCAG | 2.1 AA |
| Analytics | Conversion events in GA4 | Working on all four brands |
| Security | High-and-above findings | Fixed and retested before launch |

The client wants commercial conversion reporting, not pageviews.
The dashboard answers how many award enquiries, event registrations, sponsorship leads and signups happened, by brand.
Publication is a GA4 custom dimension.

## 8. People

### Client

- Stephen Harris. CEO and signatory. Engaged, asks good questions, not technical. Pitch mechanism, not stack names.
- Theodora Viney. Head of Marketing and Content. Day-to-day contact and sole approval contact. She finds the inconsistency in your document.
- Paul Das. CTO at Profundcom. Owns the legacy database and is leaving. Ian at waterskier-software.com administers it.

The client has about 20 people and no in-house dev team.
Anything that needs a deploy to change reads as a defect to them.

### FocusReactive

- Darya Matsviaichuk. Project Manager. Main day-to-day contact.
- Maksim Hodasevich. Tech Lead. Technical decisions and architecture.
- Roman Milosh. Engineer. Implementation.
- Robert Garmaza. Designer.

## 9. Open questions

These block work. Each has a named owner or a settling action.

- Which of the three titles published each archived article. One legacy database column. No fallback. Gates the content model for 100,141+ records.
- Which of two conflicting publication-date fields is authoritative. They disagree on 19% of sampled articles. Drives collision rules, archive ordering and the search date facet. Only correctable by a full re-export, which is out of scope.
- Corpus size. Measured floor 100,141. Identifier ceiling about 208,469. Client says "nearer 200,000". Do not quote a hard figure.
- Whether the CMS article type carries one publication or many. The contract commits a single-value field. The archive export record and the Algolia record provably need multi-value. Settle both before writing schema.
- Written client permission to copy the archive, plus an agreed rate and off-peak window.
- Component library. Base UI is at 1.0.0-rc.0. Radix is MIT and stable. A release candidate under a capped fixed price with IP transfer is a commercial call.
- The starter template. The brief requires naming one. No document names it.
- Search implementation approach. Algolia is named in the client brief but not formally confirmed.
- Editorial section paths per domain, such as /news/ and /features/. Permanent once indexed. Confirm at end of Discovery.
- Alias domains beyond fwreport.com. Must land before the baseline is frozen.
- Ad placement requirements. Due before the design phase.
- Newsletter cadence, daily or weekly. The digest recency rules depend on it.
- Where the 4-hour reaction SLA lives. Committed verbally the day before signature. Confirm Section 17 carries it.

## 10. Known defects in the demo code

Nothing in the demo is production code.
Three real security bugs are live in it today, and the client has Studio access.

1. `linkResolver()` returns a CMS-authored href with no scheme allowlist. This is stored `javascript:` XSS.
2. The middleware matcher excludes `/api` and dotted paths, while the layout trusts an inbound `x-publication` header.
3. `?brand=` lets any visitor switch brand chrome on any domain.

Fix all three before copying any of that code forward.

The demo has 14 blocks against 16 contracted templates.
Its dependency tree is not the delivered one.
The licence answer given to the client scanned 782 demo packages containing zero Algolia, zero Brevo and zero CookieYes.

## 11. Stale documents to distrust

- Anything dated before 2026-08-06 describes the superseded path-prefix architecture.
- Any document saying Pods instead of ACF for the WordPress events source.
- **The Technical Proposal is stale and still published in public.** Last edited 2026-07-16. It predates the two decisions that reshaped the project. It is live at a `notion.site` address, so the client can read it at any time. It has already generated one client question. Details below.
- A Notion transcript has Eugene saying "that's why we pick OpenNext". He did not. It is a mishearing of Next.js. The contract commits to Vercel Pro.
- Deliverables section 5 says site search is empty at launch. Section 7 is correct: search covers the archive.

### The Technical Proposal, point by point

Source: https://deadpan-coach-3de.notion.site/WealthBriefing-Technical-Proposal-38b9e5177cdd8138a0f4c9312261e69d

| Proposal says | Reality |
| --- | --- |
| "four sites onto a single platform under one domain" | Four apex domains. Overturned by the client on 2026-08-06. |
| "brand sections" and "a group entry point" that routes visitors in | Hostname routing. Each brand is its own site. |
| Recommends Payload with the Ideal CMS layer | Signed on Sanity Growth. |
| Yoast SEO guidance in the editor | Excluded. No SEO tools in the CMS. |
| A GA4 dashboard inside the CMS | Excluded. No analytics tools in the CMS. |
| A/B testing any page from the CMS | Excluded. |
| Save a filled-in block as a reusable preset | Excluded. |
| Schedule publishing and unpublishing | Scheduled unpublish is excluded. Sanity deprecated Scheduled Publishing in October 2025. Unpublish moved to Content Releases, an Enterprise add-on. |
| Comment on any field and tag a colleague | Not in the Sanity scope. |
| "we suggest semantic search" over Algolia | Algolia Grow is the contracted platform. Sanity embeddings can never cover the archive, because they index Sanity documents only. |
| "Pages pre-rendered and served from the edge" | Currently false in the demo. Hostname multiplexing forces every response dynamic. The caching design is an open decision. |
| Payload gives the team its own Postgres in a region of its choice | Argument lost. Sanity datasets are vendor-hosted. EU residency is handled by pinning Vercel, R2 and Algolia instead, and it is deliberately not a contractual representation. |
| Maintenance is "roughly 8 hours a month" | The Section 17 retainer is 15 hours or GBP 1,000 per month. |
| Every legacy URL takes "a single permanent (301) redirect" | True as the client-facing commitment. Internally the cutover runs 302 first, then flips to 301 once destinations are confirmed. |

Two items in the proposal are still correct and worth keeping.
The archive stays static and never enters the CMS.
The entity layer for Organisations and People is a future possibility and stays unpriced.

## 12. Sources

The authoritative documents live in Notion.

| Document | Link |
| --- | --- |
| Project page | https://app.notion.com/p/3c89e5177cdd80dba837df93c9f374fa |
| Build notes, technical deep dive | https://app.notion.com/p/3c89e5177cdd8119b9bad7b48115d5ab |
| Deliverables, fixed price | https://app.notion.com/p/3ac9e5177cdd8164ba4ee1d3e522993f |
| Sales record | https://app.notion.com/p/3989e5177cdd812a98d6d4b3debdcb99 |
| Technical Proposal (STALE, public) | https://deadpan-coach-3de.notion.site/WealthBriefing-Technical-Proposal-38b9e5177cdd8138a0f4c9312261e69d |
| Trello board | https://trello.com/b/42kPhcKW/wealthbriefing |

Slack: `#fr-p-wealth-briefing` internal, `#ext-fr-wealth-briefing` external.

Legacy sites: wealthbriefing.com, wealthbriefingasia.com, familywealthreport.com, clearviewpublishing.com.
