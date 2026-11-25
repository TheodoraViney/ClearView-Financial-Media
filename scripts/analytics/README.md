# Analytics configuration scripts

Apply one analytics configuration to the four brands' Google Tag Manager containers and GA4 properties.
The configuration lives in `config.ts`: dataLayer variables, one Custom Event trigger per app event, GA4 event tags, consent requirements, custom dimensions and key events.
Every tag the scripts create has the blocking trigger `Block - not production`: it fires only where the page pushed `site_env: 'production'`, so staging, dev, previews and the legacy sites (which push no `site_env`) send nothing to the Network property or as key events.
The event list must match `AnalyticsEvents` in `src/lib/analytics.ts`.

The scripts run as you, through your own Google account. They never publish a GTM container: publishing stays a click in the GTM UI.

## One-time setup

1. In Google Cloud Console, pick or create a project. Enable the **Tag Manager API** and the **Google Analytics Admin API**.
2. Under APIs & Services → OAuth consent screen, set the app up as Internal, or as External in Testing with your address as a test user.
   In Testing, refresh tokens expire after 7 days; the script then opens the sign-in again.
3. Under Credentials, create an **OAuth client ID** of type **Desktop app** and download its JSON.
   Save it as `.google-oauth-client.json` at the repo root (gitignored) or anywhere outside the repo.
4. Your Google account needs **Publish** (or at least Approve) access to the four GTM containers and **Editor** access to the GA4 properties.
5. Add to `.env.local` (bun loads it):

```
GOOGLE_OAUTH_CLIENT_FILE=.google-oauth-client.json
GA4_NETWORK_MEASUREMENT_ID=G-6CTZQHSNL3   # optional override, default in config.ts
GA4_NETWORK_PROPERTY_ID=565701135   # optional override, default in config.ts
```

The first run opens the browser for consent and caches a refresh token in `.google-token.json` (gitignored, mode 0600).
Delete that file to sign in as someone else.
The requested scopes are Tag Manager edit containers, edit container versions and read only, and Analytics edit and read only. There is no Tag Manager publish scope.

## Runbook

```
pnpm analytics:gtm --dry-run            # offline, prints every entity; no sign-in
pnpm analytics:gtm --plan               # reads each container, prints what would change
pnpm analytics:gtm --apply              # writes the "focusreactive-analytics" workspace and creates a version
pnpm analytics:gtm --apply --no-version # writes the workspace only
pnpm analytics:ga4 --plan
pnpm analytics:ga4 --apply
```

Add `--brand wealthbriefing` (or `wealthbriefingasia`, `familywealthreport`, `clearview`; `network` for GA4) to limit a run to one brand.
Start with one brand.

1. `--plan` both scripts and read the output. `+` creates, `~` updates, `!` is a same-named entity the script did not create and will not touch, `?` is something expected but not found.
2. `--apply` GTM. It writes into a workspace named `focusreactive-analytics`, creating it if absent, then creates a container **version** from it. Nothing is published.
3. Until the version is published, `--plan` compares with the live version and keeps reporting every change; that is expected.
   For a 0-change check before publishing, run `--plan --snapshot <version json>` against the new version saved in API shape (one brand per file, with `--brand`).
4. In GTM, open the new version → **Preview**, on BOTH a legacy URL (for example https://www.wealthbriefing.com/) and the new site (production build, `NEXT_PUBLIC_SITE_ENV=production`). Check that:
   - nothing fires before consent, on either: on the Tag Assistant **Hits sent** tab there is no hit to the brand G- id or to the Network G- id;
   - on the legacy URL, the client's Google tag and Crazy Egg still fire after accepting analytics in the consent banner, and no tag from these scripts fires;
   - on the new site, the Google tag, Crazy Egg, the Network Google tag and the event tags fire after consent, and each event carries `publication`;
   - tags held back by consent fire once consent is granted on the same page, without a reload.
5. Publish the version by hand in the GTM UI.
   If the Submit panel offers to link the Google tag to a Google Analytics account, answer **Do not add**: the account is read-only to us.
   The containers are live on the legacy sites, so publishing changes them the same day: GA4 and Crazy Egg there will then require analytics consent.
6. `--apply` GA4. Custom dimensions and key events are created when missing; "page views on browser history events" is switched on when off.
7. Run `--plan` for both scripts again: after publishing it should report nothing to change.

## Safety

- Entities the scripts create carry `[managed by scripts/analytics]` in their notes. Only those are updated.
- The existing Google tag and Crazy Egg tag are found by type, not name, and only get the `publication` shared event parameter and the `analytics_storage` consent requirement added. Their other settings are kept.
- Creating a GA4 event tag for a measurement id makes GTM add, by itself, a "Google Analytics G-..." destination tag (`dest_ga`) that fires on Initialization with no consent and no blocking trigger, plus two container settings (`gtag_config`) with automatic events and user-provided data collection (email, phone, address) switched on.
  `--apply` re-reads the workspace after the tags and patches them in a second pass: the destination tags get the `analytics_storage` consent requirement and `Block - not production`, and both settings are switched off.
- Before creating the version, `--apply` runs a quick preview and prints its compiler error flag. A failed `create_version` is retried once; if it fails again, create the version from the workspace in the GTM UI.
- Nothing in GTM or GA4 is deleted. The one exception is a workspace the same run created and then had nothing to put in.
- GTM requests are throttled to one every 4 seconds (`GTM_MIN_INTERVAL_MS`) to stay inside the API's default quota. A full four-container apply takes several minutes.
- GTM allows three workspaces per container on the free tier. If three already exist, `--apply` fails at workspace creation; remove an unused one in the UI first.
