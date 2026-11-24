# Analytics

This document explains what the four websites track and how to read it.
It is written for the commercial and marketing team.
A short technical appendix at the end is for whoever maintains Google Tag Manager later.

Dashboard: link to be added.

## 1. Where the data lives

Each site keeps its own Google Tag Manager (GTM) container and its own Google Analytics 4 (GA4) property.

| Site | GTM container | GA4 measurement ID |
| --- | --- | --- |
| WealthBriefing | GTM-N289V7M | G-CRT9ZTT2W3 |
| WealthBriefingAsia | GTM-TL59BQC | G-TQPHF0K17Y |
| Family Wealth Report | GTM-MCCMFH8 | G-84B40V6NWC |
| ClearView Publishing | GTM-N9LBW5C | G-MFTQ96Q6FD |

Every container also sends the same data to one combined property, **WealthBriefing Group – Network** (G-6CTZQHSNL3).
Use the Network property to read the four sites as one network.
Use a site's own property to look at that site alone.

On the new sites, every hit carries the site it came from, in the **Publication** dimension.
The Network property and the key events only receive traffic from the live new sites.
Staging and preview sites, and the legacy sites until they are replaced, send nothing to them.
The Publication values are:

| Publication value | Site |
| --- | --- |
| `wealthbriefing` | WealthBriefing |
| `wealthbriefingasia` | WealthBriefingAsia |
| `familywealthreport` | Family Wealth Report |
| `clearview` | ClearView Publishing |

In the Network property, filter or break down by Publication to see one site, or to compare them.

## 2. Key events

Key events are the commercial conversions.
GA4 counts them in its Key events reports.

| Event | When it is sent | Extra detail |
| --- | --- | --- |
| `newsletter_signup` | A reader submits the subscribe pop-up and the signup is accepted. | **Signup location**: `header`, `banner` or `stay_informed`, the button that opened the pop-up. |
| `newsletter_confirm` | A reader clicks the confirmation link in the double opt-in email, the second email of the signup. The count is approximate: a repeated click on the confirmation link can occasionally count twice. | None. |
| `sponsorship_enquiry` | The sponsorship enquiry form is sent successfully. | None. |
| `contact_enquiry` | The contact form is sent successfully. | None. |
| `award_entry_click` | A reader clicks an awards programme's register or enter button, which goes to the external entry form. | **Awards programme**: the programme's title. `link_url`: the address of the entry form. |
| `report_download` | A reader clicks a research report's download button. | **Report**: the report's title. `link_url`: the address the button opens. |

How to read two of them:

- `newsletter_signup` counts signups started. `newsletter_confirm` counts signups the reader confirmed. The gap between them is readers who never clicked the email link.
- `report_download` counts clicks on the download button. The button opens the report's download form, its Issuu page, or the PDF itself, whichever the report has. It counts requests started, not files delivered. When the button opens the PDF, GA4 also records its automatic `file_download` event for the same click.

## 3. Other events

`article_view` is sent each time an article page is shown.
It is recorded, but it is not a key event.

| Detail | Meaning |
| --- | --- |
| **Content source** | `cms` for an article published on the new sites, `archive` for an article from the legacy archive. |
| `article_id` | The article's identifier. |

GA4 also records these automatically on every site:

- `page_view`, including moves between pages inside the site.
- `scroll`, when a reader scrolls through 90% of a page.
- `click`, when a reader follows a link to another website.
- `file_download`, when a reader opens a file such as a PDF.
- Site search.

## 4. Custom dimensions

These are registered on every property, so they appear in reports and in the dimension picker.

| Dimension | Filled by |
| --- | --- |
| Publication | Every event |
| Signup location | `newsletter_signup` |
| Awards programme | `award_entry_click` |
| Report | `report_download` |
| Content source | `article_view` |

## 5. How to read the reports

1. Open the GA4 property: the Network property for the whole group, or a site's own property.
2. Go to **Reports → Engagement → Events** for every event, or **Reports → Engagement → Key events** for conversions only.
3. To split by site, add the **Publication** dimension with the dimension picker on the report table, or add a comparison per Publication value.
4. To split a key event by its detail, click the event name and look at its parameters, or add the matching dimension, for example **Awards programme**.
5. For custom tables, use **Explore**. Add Event name and Publication as dimensions and Event count or Key events as metrics.

## 6. What the numbers mean

**Only consenting visitors are counted.**
The sites use CookieYes with Google Consent Mode v2.
Analytics records a visitor only after they accept analytics cookies.
Read every count as a floor, not as the total number of visitors.
Visitors can change their choice at any time through **Cookie settings** in the footer.

**Data starts on launch day.**
The new sites send data from the day they go live.
GA4 dimensions only apply to data collected after they were created. GA4 does not fill them in for earlier data.

**Previews are not counted.**
Pages opened from the CMS preview send nothing.

## 7. What is not tracked

- What happens inside external platforms. A click on an awards entry button is counted; the completed entry inside the entry platform (for example Jotform) is not. This can be configured later if those platforms support it.
- Event registrations. Event pages have no registration button today.

## Appendix: technical notes

This section is for whoever maintains GTM and GA4.

### How the site sends events

The site pushes each event to `window.dataLayer` as `{ event, ...params }`.
For example: `{ event: 'award_entry_click', programme: '...', link_url: '...' }`.
The site never checks consent itself. Consent Mode applies inside GTM.

On every page the order is:

1. Google Consent Mode v2 defaults, all denied except security storage.
2. The brand's CookieYes banner, which sends the visitor's choice as a consent update.
3. The page context `{ publication, site_env }`, pushed to the dataLayer.
4. The brand's GTM container.

GTM reads `publication` from the page context and attaches it to every GA4 hit.

The event list lives in `src/lib/analytics.ts`.

### GTM naming

| Item | Name pattern |
| --- | --- |
| Data layer variables | `DLV - {name}`, for example `DLV - publication` |
| Custom Event triggers | `CE - {event}`, for example `CE - newsletter_signup` |
| GA4 event tags, site property | `GA4 Event - {event}` |
| GA4 event tags, Network property | `GA4 Network Event - {event}` |
| Network Google tag | `Google tag - Network` |
| Blocking trigger | `Block - not production` |

Items created by the setup scripts carry `[managed by scripts/analytics]` in their Notes.
The scripts only ever update those items.
Event tags require `analytics_storage` consent.
Every tag the scripts create is blocked by `Block - not production` unless the page pushed `site_env: 'production'`.
The site's existing Google tag and Crazy Egg are not blocked, because the legacy sites still need them.

### Changing things

- **Which events count as key events**: GA4 Admin → Key events. Mark or unmark the event. No deploy is needed.
- **A new event**: needs a code change on the site plus a trigger and tags in each GTM container.
- **A new custom dimension**: GA4 Admin → Custom definitions, on each property that needs it.

The setup scripts that create the GTM and GA4 configuration live in `scripts/analytics/`.
See [scripts/analytics/README.md](../scripts/analytics/README.md) for how to run them.
