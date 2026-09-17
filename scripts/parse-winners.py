"""
Turn the `cyph_winners` wysiwyg blob on each award event into structured rows.

The source has no winner records: an editor typed the whole results list into one
rich-text field, year after year since 2022. Structure survives in the markup
even though the tags vary - a bold run names the category, the text after it
names the winner, and a heading opens a group of categories.

Three parsers were measured against all 48 events that carry winners:

    rule                        pairs  categories  malformed
    naive bold/plain            2982      1217        36
    treat ALL-CAPS as heading   2909      1100        10   <- lost 73 real pairs
    split on "CATEGORIES"       2981      1168        11

The middle rule reads well but eats categories that are legitimately uppercase.
Group headings in this corpus always carry the word CATEGORY or CATEGORIES, so
splitting on it is both safer and more precise.

All three inferred the category/winner boundary from a *change in emphasis*, and
so returned nothing at all for three 2025 events - 35,656 characters of results,
dropped with no error:

    37916  10,613  MENA Awards 2025          pair wrapped in <h5>, so both halves
                                             read as a group heading; the winner is
                                             de-emphasised by <span font-weight:400>,
                                             which no rule looked at
    35520  20,920  WBA Awards 2025           <p><strong>cat</strong><br><strong>win</strong></p>
                                             - the winner is bolded too, so both
                                             halves merge into one category
    34601   4,123  WealthTech Americas 2025  same bolded winner, and no <p> at all:
                                             the pair is two <strong>s on adjacent
                                             lines, the block break is a blank line

35532 is the control: byte-for-byte the same editor and tool as 35520 (the
`data-start`/`data-end` attributes come from a paste out of a markdown tool), but
with the winner left plain. It parsed fine under the old rule. So the three are
not a new editing habit, they are the old habit with the winner bolded - the same
illness as the 11 records `--report` already listed, taken to 100% of the record.

So emphasis is a hint, not the boundary. This parser segments on structure first:

    block      <p> <div> <h1..h6> <li> <tr> ..., or a blank line in the raw text
    segment    <br>, or a single newline, inside a block

and then reads each block:

    heading element, 1 segment    -> group heading
    heading element, 2+ segments  -> segment 0 is the category, the rest the winner
    2 segments, same emphasis     -> segment 0 is the category, segment 1 the winner
    anything else                 -> emphasis decides, as before

A two-segment block reads positionally unless it is the ordinary [bold, plain]
shape, which stays on the run path so that a winner split across several runs is
handled the way it always was. That also picks up 16613, the one event that
writes the pair the other way round - plain category, then bold winner - whose
every row was previously reversed and shifted by one.

Only the last branch is the old behaviour, so the rule is strictly additive.
Measured over all 48 events:

    rule                        events  pairs  categories  groups  malformed
    split on "CATEGORIES"          45    2981      1168      176      11
    block-aware                    48    3247      1210      193       7
    + heading qualifier fixed      48    3247      1165      202       6
    + heading case-insensitive     48    3247      1148      212       2
    + dash qualifier               48    3247      1147      212       2

The last three rows are the HEADING comment above. None of them changes a pair, a
winner or the row order - only group and category text.

  qualifier   77 truncated group names recover in full and 110 categories lose
              the fragment glued to their front, across 19 events. Groups rise
              because a truncated name merged groups differing only in the
              qualifier: "TECHNOLOGY CATEGORIES (" was standing in for both
              "(IN-HOUSE)" and "(EXTERNAL SUPPLIER)" in 16613.
  case        137 of the 174 rows that had no group get their real one, across
              20953, 22122, 24939 and 32212. 32 categories lose a glued heading.
  dash        9 rows in 26744, 1 of them a glued category.

Categories fall throughout because de-fragmented names collapse onto names that
already existed. The count printed below is case-folded and whitespace-collapsed,
so it is lower than the number of distinct raw strings - 1147 against 1262, the
gap being 106 category names that are spelled more than one way across the years
("Pure Play Private Bank" against "PURE PLAY PRIVATE BANK").

37 rows still carry a null group, all of them event 29430. That one is not a
case or punctuation problem: its section headings are "US - GENERAL WEALTHTECH"
and the like, marked up as an underlined <b> rather than a heading element, and
they never contain the word CATEGORY at all, so nothing keyed on that word can
find them. 34601 writes the same programme with <h4> and does get its groups.

41 of the 45 working events come out byte-identical. The 4 that change all gain:
41907 +6, 34009 +2, 39405 +1, because a category and its winner that shared one
<p> used to run together into one 120-character category, and 16613 +1 from the
inversion above. That is also why malformed falls from 11 to 7, and 2 of the 7
left are simply long real category names, not breakage. The 4 genuinely broken
ones are still hand-fixed; `--report` lists them.

Known, not fixed here, both need a decision before load:

  - 29430's 37 rows have no group, for the reason given above: its headings are
    neither heading elements nor carry the word CATEGORY. Recovering them needs a
    different signal - the underline, or an all-caps standalone run - and the
    docblock records above why an all-caps rule was rejected once already.

  - 35520 and 35532 hold the same winners list. 114 of 115 rows match on
    category+winner in both directions; the one exception is a wording variant
    ("Independent Trust or Fiduciary Company (Greater China Region)" against
    "(Greater China)", same winner). Both carry the same 15 groups, rotated so
    that each record leads with its own programme's sections. They are distinct
    published events with distinct taxonomy terms - 47 "WealthBriefingAsia
    Awards" and 48 "WealthBriefingAsia Greater China Awards" - and distinct live
    URLs, both from 2025-06-05. So a combined list was typed once and pasted into
    both records, and both live pages show it today. Migrating both faithfully
    reproduces what is published; whether the client wants them split is a
    question for them, not an edit for us.

Usage:
    python3 scripts/parse-winners.py .migration-source/wp-events.json
    python3 scripts/parse-winners.py .migration-source/wp-events.json --report
    python3 scripts/parse-winners.py .migration-source/wp-events.json --out PATH

Without --out the rows go to <input>-winners.json, which the Sanity loader reads.
"""

import collections
import json
import re
import sys
from html import unescape
from html.parser import HTMLParser

WINNERS_FIELD = "acf[field_62d19318eb2b5]"  # cyph_winners
PROGRAMME_FIELD = "acf[field_631b482396f48]"  # awards_event_programme

# A heading names a group of categories and always contains the word itself,
# optionally followed by a region in brackets: "PRIVATE BANKING CATEGORIES (ASIA)".
#
# The bracketed qualifier has to be matched before the run of non-letters, not
# after it. Written the other way round, `[^A-Za-z]*` reaches past the opening
# bracket, the optional group then has nothing to match, and the qualifier is
# split down the middle: "SWISS NATIONAL CATEGORIES (COMPANY)" became the group
# "SWISS NATIONAL CATEGORIES (" plus a stray "COMPANY)" that glued itself to the
# first real category of the group. It is `*`, not `?`, because two events write
# two qualifiers: "... CATEGORIES (PAN-ASIA) (IN-HOUSE SOLUTIONS)".
#
# Taking the whole qualifier into the group is safe here: no category in the
# corpus starts with a bracket (0 of 3247), while 744 end with one, so a leading
# bracket always belongs to the heading and a trailing one to the category.
#
# re.I because 4 events write their headings in title case - "Overall Pan-Asia
# Categories (Company)" - and a case-sensitive pattern simply cannot see them.
# It is additive, not looser: of every run in the corpus, exactly 32 become
# headings under re.I that did not before, all 32 leave an empty remainder (so
# none of them splits a real category), and no run that already matched has its
# split moved. No category text anywhere contains the word in lower case.
# One event sets its qualifier off with a dash instead of brackets - 26744's
# "TECHNOLOGY CATEGORIES - NON-BANKING COMPANIES" - which is the same bug wearing
# different punctuation: it left the group as "TECHNOLOGY CATEGORIES -" and glued
# "NON-BANKING COMPANIES" to the front of the first category. A dash is far more
# ambiguous than a bracket, because categories use it freely ("Private Bank -
# ESG"), so this absorbs one only when what follows is upper case AND runs to the
# end of the run. No category in the corpus follows the heading word in upper
# case, and "CATEGORIES - Best Wealth Manager" still splits as it always did.
HEADING = re.compile(
    r"^(.*?CATEGOR(?:Y|IES)\b(?:\s*\([^)]*\))*"
    r"(?:\s*[-–—]\s*(?-i:[A-Z][A-Z0-9 &/'.\-]*)(?=\s*$))?"
    r"[^A-Za-z]*)\s*(.*)$",
    re.S | re.I,
)

HEAD_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
BLOCK_TAGS = HEAD_TAGS | {
    "p", "div", "li", "ul", "ol", "blockquote", "table", "thead", "tbody",
    "tr", "td", "th", "section", "article", "center", "hr", "figure",
}
FONT_WEIGHT = re.compile(r"font-weight\s*:\s*([a-z0-9]+)", re.I)
# The only weight in the corpus is 400, used on 2,401 spans to un-bold a winner
# that sits inside a bold or heading element. Treat anything under 500 as plain.
PLAIN_WEIGHTS = {"100", "200", "300", "400", "normal", "lighter"}


class _Blocks(HTMLParser):
    """Flatten the markup into blocks -> segments -> (text, emphasised) runs."""

    def __init__(self):
        super().__init__()
        self.blocks = []
        self._bold = 0
        self._head = 0
        self._weights = []  # stack of (tag, is_plain) from inline font-weight
        self._open()

    def _open(self, heading=False):
        self._block = {"heading": heading, "segments": []}
        self._seg = []

    def _break_segment(self):
        if self._seg:
            self._block["segments"].append(self._seg)
        self._seg = []

    def _close(self, heading=False):
        self._break_segment()
        if self._block["segments"]:
            self.blocks.append(self._block)
        self._open(heading)

    @property
    def _emphasised(self):
        # An inline font-weight is explicit and beats the surrounding tags: that
        # is the only thing marking the winner apart inside an <h5> in 37916.
        for _, plain in reversed(self._weights):
            return not plain
        return bool(self._bold or self._head)

    def handle_starttag(self, tag, attrs):
        if tag == "br":
            self._break_segment()
            return
        if tag in BLOCK_TAGS:
            self._close(tag in HEAD_TAGS)
            if tag in HEAD_TAGS:
                self._head += 1
            return
        if tag in ("b", "strong"):
            self._bold += 1
        match = FONT_WEIGHT.search(dict(attrs).get("style") or "")
        if match:
            self._weights.append((tag, match.group(1).lower() in PLAIN_WEIGHTS))

    def handle_startendtag(self, tag, attrs):
        if tag == "br":
            self._break_segment()
        else:
            self.handle_starttag(tag, attrs)
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in BLOCK_TAGS:
            if tag in HEAD_TAGS:
                self._head = max(0, self._head - 1)
            self._close()
            return
        if tag in ("b", "strong"):
            self._bold = max(0, self._bold - 1)
        for i in range(len(self._weights) - 1, -1, -1):
            if self._weights[i][0] == tag:
                del self._weights[i]
                break

    def handle_data(self, data):
        emphasised = self._emphasised
        data = unescape(data).replace("\xa0", " ")
        # 34601 and 30758 have no block tags around the pairs at all: wpautop
        # never ran on the stored value, so the blank line is the only block
        # break there, and the single newline the only segment break.
        for b, chunk in enumerate(re.split(r"\n[ \t]*\n", data)):
            if b:
                self._close(self._block["heading"])
            for s, piece in enumerate(chunk.split("\n")):
                if s:
                    self._break_segment()
                piece = piece.strip()
                if piece:
                    self._seg.append((piece, emphasised))

    def finish(self):
        self._close()
        return self.blocks


def _text(segment):
    return " ".join(text for text, _ in segment).strip()


def _runs(html):
    """-> [(kind, text)] where kind is heading | category | winner."""
    parser = _Blocks()
    parser.feed(html)

    runs = []
    for block in parser.finish():
        segments = block["segments"]
        if block["heading"]:
            if len(segments) == 1:
                runs.append(("heading", _text(segments[0])))
            else:
                # An <h5> holding a whole pair is not a group heading (37916).
                runs.append(("category", _text(segments[0])))
                runs.append(("winner", " ".join(_text(s) for s in segments[1:]).strip()))
            continue

        emphasis = [all(e for _, e in s) for s in segments]
        if len(segments) == 2 and emphasis != [True, False]:
            # [True, True] and [False, False]: emphasis cannot separate the two
            #   halves, so the line break is the boundary (35520, 34601).
            # [False, True]: the pair is written the other way round (16613).
            # [True, False] is the ordinary shape. It stays on the run path
            #   below, which gives the same answer but keeps the old handling of
            #   a winner split across several runs. Sending it here too would
            #   rewrite text in 11 events that are already correct.
            runs.append(("category", _text(segments[0])))
            runs.append(("winner", _text(segments[1])))
            continue

        for segment in segments:
            for text, emphasised in segment:
                runs.append(("category" if emphasised else "winner", text))

    return runs


def parse_winners(html):
    """-> [(group, category, winner)] for one event's winners field."""
    group = None
    category = None
    rows = []

    for kind, text in _runs(html):
        if not text:
            continue
        if kind == "heading":
            group, category = text, None
        elif kind == "category":
            match = HEADING.match(text)
            if match and match.group(1).strip():
                # A bold run that carries a heading inside it: split the two apart
                # rather than letting the heading become part of the category name.
                group = match.group(1).strip()
                category = match.group(2).strip() or None
            else:
                # Consecutive bold runs are one category split across tags.
                category = text if not category else f"{category} {text}"
        elif category:
            rows.append((group, category.strip(), text))
            category = None

    return rows


def programme_of(record):
    value = record["fields"].get(PROGRAMME_FIELD)
    if isinstance(value, list) and value:
        return value[0].get("label") or value[0].get("value")
    if isinstance(value, dict):
        return value.get("label")
    return None


def main():
    path = sys.argv[1]
    report = "--report" in sys.argv
    out = path.replace(".json", "-winners.json")
    if "--out" in sys.argv:
        out = sys.argv[sys.argv.index("--out") + 1]

    records = json.load(open(path))["records"]
    rows = []
    for record in records:
        html = record["fields"].get(WINNERS_FIELD)
        if not html:
            continue
        for group, category, winner in parse_winners(html):
            rows.append(
                {
                    "eventId": record["id"],
                    "event": record["title"],
                    "programme": programme_of(record),
                    "group": group,
                    "category": category,
                    "winner": winner,
                }
            )

    categories = collections.Counter(re.sub(r"\s+", " ", r["category"].lower()) for r in rows)
    malformed = [c for c in categories if len(c) > 85]

    print(f"events with winners : {len({r['eventId'] for r in rows})}")
    print(f"category -> winner  : {len(rows)}")
    print(f"distinct categories : {len(categories)}")
    print(f"distinct groups     : {len({r['group'] for r in rows if r['group']})}")
    print(f"malformed           : {len(malformed)}  ({len(malformed) / len(categories) * 100:.1f}%)")

    if report:
        print("\nmalformed, fix by hand:")
        for c in sorted(malformed, key=len, reverse=True):
            print(f"  [{len(c)}] {c[:110]}")

    json.dump(rows, open(out, "w"), ensure_ascii=False, indent=1)
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
