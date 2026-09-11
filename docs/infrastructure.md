# Infrastructure

This document explains how traffic reaches the WealthBriefing platform.
It covers Cloudflare, Vercel, and R2.
No infrastructure is provisioned yet.
This is the plan for the engineer who provisions it later.

The platform serves four apex domains from one Next.js app on one Vercel project.
Cloudflare sits in front of Vercel for all four domains.
Cloudflare also serves the static article archive from R2, bypassing Vercel for that path.

## 1. Overview diagram

```
                        Browser
                           |
                           v
              Cloudflare zone (proxy ON)
              wealthbriefing.com
              wealthbriefingasia.com
              familywealthreport.com
              clearviewpublishing.com
                           |
              +------------+------------+
              |                         |
        path = /archive/*         all other paths
              |                         |
              v                         v
       Cloudflare Worker          pass-through
       (R2 binding)                    |
              |                        v
              v                Vercel (one project,
        R2 bucket                four domains attached)
        (archive files)                |
                                        v
                              Next.js proxy.ts
                              resolves brand from
                              the Host header
```

A request for `/archive/*` never reaches Vercel.
The Worker reads the object from R2 and returns it directly.
Every other request passes through Cloudflare unchanged and reaches Vercel.
Next.js then resolves the brand from the `Host` header in `proxy.ts`.

## 2. Why one Vercel project

The tech lead asked whether this needs two or four Vercel projects.
The answer is one project for all four domains.

Separate projects would mean separate builds for identical code.
Each project would need its own environment variable set.
Each project would get its own preview URLs.
Each project would need its own deploy hooks.
None of this buys anything, because the code is the same for all four brands.

Brand is data, not code.
Brand documents live in Sanity, one per publication.
The app resolves brand per request from the hostname.
One Vercel project attaches all four apex domains and their `www` redirects.
One deploy updates all four sites at once.

Vercel functions default to region `iad1`.
Pin them to `lhr1`.
The audience for all four brands is UK and Europe.
`fra1` is an acceptable alternate if `lhr1` has capacity issues.

## 3. Vercel setup

One project.

Domains attached to the project:

- `wealthbriefing.com` (apex, primary)
- `www.wealthbriefing.com` (redirects to apex)
- `wealthbriefingasia.com` (apex, primary)
- `www.wealthbriefingasia.com` (redirects to apex)
- `familywealthreport.com` (apex, primary)
- `www.familywealthreport.com` (redirects to apex)
- `clearviewpublishing.com` (apex, primary)
- `www.clearviewpublishing.com` (redirects to apex)

Vercel handles the `www` to apex redirect once each `www` domain is added and marked as a redirect target.

Environment variables, set once for the project:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_API_READ_TOKEN`
- `SANITY_API_WRITE_TOKEN`
- `DEFAULT_BRAND`
- `NEXT_PUBLIC_SITE_ENV`

Function region: `lhr1`, set in project settings.
This overrides the Vercel default of `iad1`.

Preview deployments get a Vercel-generated hostname, such as `wealth-briefing-abc123.vercel.app`.
This hostname does not match any entry in `HOST_TO_BRAND`.
`proxy.ts` falls back to the `DEFAULT_BRAND` env var for unknown hosts.
A reviewer can switch the brand shown on a preview through the httpOnly `brand` cookie.
The cookie is set by visiting `/api/brand/{key}`, where `{key}` is one of the four brand keys.
This is the only way to switch brand on an unknown host.
Never switch brand by query parameter.
The demo app had a `?brand=` bug that let any visitor switch brand chrome on any production domain.
That bug does not exist here, because the cookie path is only honoured on unknown hosts.

## 4. Cloudflare setup per zone

Four zones, one per apex domain.
Each zone needs the same configuration.

Proxy mode: ON, for every DNS record that serves traffic.
This is mandatory, not optional.
DNS-only mode passes traffic straight to Vercel with no Cloudflare logic in the path.
In DNS-only mode, Cloudflare cannot route `/archive/*` to the Worker.
Without proxy ON, the R2 archive is unreachable through Cloudflare.

SSL/TLS mode: Full (strict).
This validates the certificate on the Vercel side of the connection.

DNS records per zone:

- Apex (`@`): CNAME to `cname.vercel-dns.com`. Cloudflare flattens this CNAME at the apex automatically, so this works even though apex CNAMEs are normally invalid DNS.
- `www`: CNAME to `cname.vercel-dns.com`. Vercel serves the redirect to apex from this hostname.

Plan tier per zone:

- `wealthbriefing.com`: Pro plan. This domain carries 82% of traffic per README §1. Pro adds the OWASP managed ruleset, bot management, and rate limiting.
- `wealthbriefingasia.com`: Free plan.
- `familywealthreport.com`: Free plan.
- `clearviewpublishing.com`: Free plan.

README §4 notes the cost tradeoff.
Uniform Pro on all four zones costs about $80/month.
The assumed budget line was about $20/month.
Pro on the highest-traffic domain only keeps cost close to the assumption while still covering the domain with the most exposure.

## 5. Archive on R2

One R2 bucket for the archive.
Jurisdiction: EU, set at bucket creation.
Jurisdiction cannot change after creation, so this must be correct on day one.

Object key layout: `archive/{id}/{slug}.html`, plus an assets path for images referenced by each article.
The `id` comes first in the key, matching the URL rule in README §3.
The `slug` is cosmetic and does not need to be unique.

A single Cloudflare Worker is bound to the bucket.
The Worker is deployed with these routes:

- `wealthbriefing.com/archive/*`
- `www.wealthbriefing.com/archive/*`
- `wealthbriefingasia.com/archive/*`
- `www.wealthbriefingasia.com/archive/*`
- `familywealthreport.com/archive/*`
- `www.familywealthreport.com/archive/*`
- `clearviewpublishing.com/archive/*`
- `www.clearviewpublishing.com/archive/*`

Worker behaviour:

- Accepts GET and HEAD only. Reject other methods.
- Looks up the R2 object using the request path as the key.
- Returns 404 on a miss.
- On a hit, sets `Cache-Control: public, max-age=31536000, immutable`. The archive is static and never changes once written, so this header is safe.
- Uses the request path as the key, independent of the Host header. This means all four domains serve the exact same archive copy from one bucket. There is no per-brand duplication of archive content.

The `/archive/` path prefix has not yet been named to the client.
README §3 flags this: surface it in Discovery before the redirect baseline is frozen.
Do not treat `/archive/` as final until the client has confirmed it.

The Worker code will live in `infra/archive-worker/` as a pnpm workspace package.
This is added later, when the Worker is actually built.
This does not require converting the Next app into a monorepo.
The Next app stays at the repo root as the workspace root package.
`pnpm-workspace.yaml` gets `packages: ['infra/*']` added at that point.

## 6. Caching

Cloudflare Cache Rules, per zone:

- Bypass cache for everything, except two path patterns.
- Cache `/archive/*`. This is the static archive, safe to cache at the edge.
- Cache `/_next/static/*`. These are Next.js build assets, safe to cache at the edge.

Everything else bypasses the Cloudflare cache and reaches Vercel.
Vercel already caches app responses through its own data cache and CDN.
Caching the same app response at both Cloudflare and Vercel, with different cache keys, is the risk described in README §4.
Two stacked caches that disagree on what varies a response can serve one brand's HTML on another brand's domain.

The invariant: every cache key must include the host.
Cloudflare includes the host in its cache key by default.
Do not add a Cache Rule that strips or ignores the host.
Vercel keys its cache by deployment, path, and host together.
As long as neither layer is reconfigured to drop the host from its key, brand separation holds at both cache layers.

## 7. Cutover checklist

This follows README §4.

1. Lower DNS TTLs to 300 seconds, at least 48 hours before cutover. Restore normal TTLs after cutover completes.
2. Cut over using 302 redirects first, not 301. This keeps the redirect reversible while destinations are unverified.
3. Confirm destinations are correct under live traffic. Only then flip the redirects to 301.
4. Re-run the export and the redirect baseline immediately before cutover. This catches new articles published since the last export, per README §4.
5. Keep legacy infrastructure on standby for 48 hours after cutover. Legacy sites do not need to keep serving traffic, but they must stay reachable in case a redirect needs correcting.

## 8. Local development

Four local hostnames, one per brand:

- `http://wealthbriefing.localhost:3000`
- `http://wealthbriefingasia.localhost:3000`
- `http://familywealthreport.localhost:3000`
- `http://clearview.localhost:3000`

Chrome resolves any `*.localhost` hostname to loopback natively.
No configuration is needed for Chrome.

Safari and `curl` do not resolve `*.localhost` automatically.
Add these lines to `/etc/hosts` for those tools:

```
127.0.0.1 wealthbriefing.localhost
127.0.0.1 wealthbriefingasia.localhost
127.0.0.1 familywealthreport.localhost
127.0.0.1 clearview.localhost
```

The Studio runs at `http://clearview.localhost:3000/studio`.
Any of the four local hosts serves the same Studio, since the Studio route is not brand-scoped.

Sanity CORS origins to add, in the Sanity project settings:

- `http://wealthbriefing.localhost:3000`
- `http://wealthbriefingasia.localhost:3000`
- `http://familywealthreport.localhost:3000`
- `http://clearview.localhost:3000`
- `https://wealthbriefing.com`
- `https://wealthbriefingasia.com`
- `https://familywealthreport.com`
- `https://clearviewpublishing.com`
