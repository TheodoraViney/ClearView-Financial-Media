#!/usr/bin/env python3
"""Build the migration URL baseline from the four legacy sitemaps.

One row per distinct legacy URL. Crawl-derived columns are left empty until
crawl permission and an agreed rate land; see docs/migration-baseline.md.

Re-run immediately before cutover: the Schedule requires a second capture so
URLs published during the build are covered.

    python3 scripts/build-baseline.py --out baseline.csv [--cache DIR]
"""

import argparse, csv, pathlib, re, sys, urllib.request
from collections import Counter

UA = "FocusReactive-migration-baseline/1.0 (+contracted developer, ClearView Financial Media)"

# Editorial sitemaps are advertised in each robots.txt. clearviewpublishing.com
# publishes no Sitemap: line; its Yoast index is read directly.
EDITORIAL = {
    "wealthbriefing.com": "https://wealthbriefing.com/html/sitemap.xml.php",
    "wealthbriefingasia.com": "https://www.wealthbriefingasia.com/sitemap.xml.php",
    "familywealthreport.com": "https://www.familywealthreport.com/sitemap.xml.php",
}
CVP_INDEX = "https://clearviewpublishing.com/sitemap_index.xml"

LOC = re.compile(r"<loc>([^<]*)</loc>")
ID = re.compile(r"[?&]id=(\d+)")

# family -> destination rule. TBD means the rule is not settled yet; the blocking
# owner is recorded in docs/migration-baseline.md, not here.
DESTINATION = {
    "article": "archive",
    "section_listing": "template_04",
    "static_page": "template_14",
    "homepage": "template_02",
    "group_homepage": "template_01",
    "register": "TBD",
    "subscribe": "template_12",
    "wealthtalk": "TBD",
    "event": "template_08",
    "resource": "template_09",
    "acclaim": "template_06",
    "acclaim_listing": "template_15",
    "awards_programme": "template_06",
    "event_taxonomy": "TBD",
    "resource_taxonomy": "TBD",
}


def fetch(url, cache: pathlib.Path, name: str) -> str:
    path = cache / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=300) as r:
        # The legacy pages declare iso-8859-1 and lie about it; decode as UTF-8.
        body = r.read().decode("utf-8")
    cache.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")
    return body


def classify_editorial(url: str) -> str:
    path = re.sub(r"^https?://[^/]+", "", url)
    if "article.php" in path:
        return "article"
    if "section.php" in path:
        return "section_listing"
    if "page.php" in path:
        return "static_page"
    if path in ("", "/") or path.endswith("/index.php"):
        return "homepage"
    if "register" in path:
        return "register"
    if "subscribe" in path:
        return "subscribe"
    if "wealthtalk" in path:
        return "wealthtalk"
    return "unclassified"


def classify_cvp(url: str) -> str:
    path = re.sub(r"^https?://[^/]+", "", url)
    if path in ("", "/"):
        return "group_homepage"
    if path == "/acclaim/":
        return "acclaim_listing"
    for prefix, family in (
        ("/events-category/", "event_taxonomy"),
        ("/resource-categories/", "resource_taxonomy"),
        ("/acclaim-awards-programme/", "awards_programme"),
        ("/events/", "event"),
        ("/resource/", "resource"),
        ("/acclaim/", "acclaim"),
    ):
        if path.startswith(prefix):
            return family
    return "static_page"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="baseline.csv")
    ap.add_argument("--cache", default="baseline-cache")
    args = ap.parse_args()
    cache = pathlib.Path(args.cache)

    rows, unclassified = [], Counter()

    for domain, sitemap in EDITORIAL.items():
        locs = LOC.findall(fetch(sitemap, cache, f"{domain}.xml"))
        entries = Counter(locs)
        for url in sorted(entries):
            family = classify_editorial(url)
            if family == "unclassified":
                unclassified[domain] += 1
            m = ID.search(url)
            rows.append((url, domain, family, m.group(1) if m else "", entries[url],
                         DESTINATION.get(family, "TBD")))

    index = fetch(CVP_INDEX, cache, "clearviewpublishing.com-index.xml")
    seen = {}
    for sub in LOC.findall(index):
        name = "clearviewpublishing.com-" + sub.rstrip("/").split("/")[-1]
        for url in LOC.findall(fetch(sub, cache, name)):
            seen[url] = seen.get(url, 0) + 1
    for url in sorted(seen):
        family = classify_cvp(url)
        rows.append((url, "clearviewpublishing.com", family, "", seen[url],
                     DESTINATION.get(family, "TBD")))

    header = ["url", "domain", "family", "id", "entries", "destination_rule",
              "status", "title", "meta", "canonical"]
    with open(args.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        for r in rows:
            w.writerow([*r, "", "", "", ""])

    by_family = Counter(r[2] for r in rows)
    by_domain = Counter(r[1] for r in rows)
    print(f"{args.out}: {len(rows)} rows")
    for k, v in sorted(by_domain.items()):
        print(f"  {k:<28} {v:>7}")
    print()
    for k, v in by_family.most_common():
        print(f"  {k:<20} {v:>7}  -> {DESTINATION.get(k, 'TBD')}")
    if unclassified:
        print("\nUNCLASSIFIED (a new family, not a rounding error):", dict(unclassified))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
