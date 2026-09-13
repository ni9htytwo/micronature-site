#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
microNature — llms.txt / llms-full.txt generator (LLM & AI-agent referencing).

Follows the llmstxt.org proposal. Instead of hand-writing these files (which
drifts out of sync), this reads each public page's OWN head — canonical /
og:title / og:description / <title> / <meta description> — and, for the blog
articles, the JSON-LD (author, datePublished) plus the extracted body text.

Outputs (written next to this script, deployed with the site):
  llms.txt       concise curated markdown index of the whole site
  llms-full.txt  the index + the full readable text of every Insight article
  sitemap.xml    every public URL with hreflang alternates (same page pairs)

To add a future article: append its (zh, en) path pair to ARTICLES and re-run
  python3 make_llms.py
"""
import os, re, json
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://micronature.pages.dev"
SITE_LASTMOD = "2026-09-13"          # date of the current site-wide deploy
# Pages actually touched in this deploy get a lastmod; untouched sample/company
# pages are left without one rather than asserting a wrong date.
LASTMOD_TODAY = {
    "index.html", "en/index.html", "insight.html", "en/insight.html",
    "insight/01-capability-deployment-paradox.html",
    "en/insight/01-capability-deployment-paradox.html",
    "insight/02-who-underwrites-deep-sea-autonomy.html",
    "en/insight/02-raising-machines-in-the-deep.html",
}

# Public pages, as (zh_path, en_path). Deck drafts are intentionally excluded.
CORE = [
    ("index.html", "en/index.html", "Home"),
    ("about.html", "en/about.html", "About / 我们"),
    ("environmentaffordance.html", "en/environmentaffordance.html",
     "Environment Affordance™"),
    ("map.html", "en/map.html", "Affordance Map (sample deliverable)"),
    ("atlas.html", "en/atlas.html", "Sensor Deception Library (sample deliverable)"),
    ("insight.html", "en/insight.html", "Insight — blog index / 思考"),
]
# Blog articles, as (zh_path, en_path). Newest first.
ARTICLES = [
    ("insight/02-who-underwrites-deep-sea-autonomy.html",
     "en/insight/02-raising-machines-in-the-deep.html"),
    ("insight/01-capability-deployment-paradox.html",
     "en/insight/01-capability-deployment-paradox.html"),
]

VOID = {"meta", "link", "br", "img", "hr", "input", "source", "col", "use",
        "line", "rect", "circle", "path", "ellipse", "polygon", "polyline",
        "stop", "image", "tspan", "area", "base", "embed", "track", "wbr"}
SKIP_TAGS = {"script", "style", "noscript", "svg", "nav", "head"}
SKIP_CLASS = {"tblock", "rail", "toc", "toc-list", "hero-spec", "nav-lang",
              "nav-theme", "nav-links", "nav-mark", "nav-in", "foot", "site-foot",
              "uplink", "cta", "pair", "lang-switch"}
CONTENT_TAGS = {"h1", "h2", "h3", "h4", "p", "li", "blockquote"}
CONTENT_CLASS = {"statement", "lede", "hero-lede", "mnote", "p", "notes"}


def clean_url(path):
    """Derive the canonical clean URL for a local file path."""
    u = path[:-5] if path.endswith(".html") else path   # strip .html
    if u.endswith("/index"):
        u = u[:-5]                                       # en/index -> en/
    if u == "index":
        u = ""
    return SITE + "/" + u.lstrip("/")


def read(path):
    p = os.path.join(ROOT, path)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def meta(html, pattern):
    m = re.search(pattern, html)
    return m.group(1).strip() if m else ""


def head_info(path):
    """title / description / canonical / og-type for any page, with fallbacks."""
    html = read(path)
    canonical = meta(html, r'rel="canonical"\s+href="([^"]+)"') or clean_url(path)
    title = (meta(html, r'property="og:title"\s+content="([^"]+)"')
             or meta(html, r'<title>([^<]+)</title>'))
    desc = (meta(html, r'property="og:description"\s+content="([^"]+)"')
            or meta(html, r'<meta name="description"\s+content="([^"]+)"'))
    ogtype = meta(html, r'property="og:type"\s+content="([^"]+)"')
    return {"path": path, "url": canonical, "title": title.strip(),
            "desc": desc.strip(), "type": ogtype}


def jsonld(html):
    m = re.search(r'<script type="application/ld\+json">([\s\S]*?)</script>', html)
    if not m:
        return {}
    try:
        data = json.loads(m.group(1))
    except Exception:
        return {}
    for node in (data.get("@graph", []) if isinstance(data, dict) else []):
        if isinstance(node, dict) and node.get("@type") == "BlogPosting":
            return node
    return data if isinstance(data, dict) else {}


class Extractor(HTMLParser):
    """Pull clean readable blocks (headings, paragraphs, list items) out of the
    document body, skipping nav/decorative/script regions."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self.stack = []          # (tag, class_set, skipped)
        self.skip = 0
        self.buf = None
        self.buf_kind = None

    def _is_content(self, tag, clset):
        return tag in CONTENT_TAGS or bool(clset & CONTENT_CLASS)

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        clset = set(dict(attrs).get("class", "").split())
        skipped = tag in SKIP_TAGS or bool(clset & SKIP_CLASS)
        self.stack.append((tag, clset, skipped))
        if skipped:
            self.skip += 1
            return
        if self.skip == 0 and self.buf is None and self._is_content(tag, clset):
            self.buf = []
            self.buf_kind = tag if tag in ("h1", "h2", "h3", "h4") else "p"

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        # pop to the matching open tag (well-formed input keeps this aligned)
        while self.stack:
            t, clset, skipped = self.stack.pop()
            if skipped:
                self.skip = max(0, self.skip - 1)
            if self.buf is not None and self._is_content(t, clset):
                text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
                if text:
                    self.blocks.append((self.buf_kind, text))
                self.buf = None
                self.buf_kind = None
            if t == tag:
                break

    def handle_data(self, data):
        if self.skip == 0 and self.buf is not None and data:
            self.buf.append(data)


def body_text(path):
    """Full readable text of an article as a markdown-ish string."""
    html = read(path)
    # only the main document region
    m = re.search(r'<main[\s\S]*?</main>', html)
    region = m.group(0) if m else html
    ex = Extractor()
    ex.feed(region)
    out, seen = [], set()
    dropped_title = False
    for kind, text in ex.blocks:
        if text in seen:            # drop exact dupes (e.g. repeated lede)
            continue
        seen.add(text)
        if kind == "h1" and not dropped_title:
            dropped_title = True    # the banner above already carries the title
            continue
        if kind in ("h1", "h2", "h3", "h4"):
            out.append("\n## " + text + "\n")
        else:
            out.append(text)
    return "\n\n".join(out).strip()


def article_meta(path):
    html = read(path)
    j = jsonld(html)
    author = ""
    if isinstance(j.get("author"), dict):
        author = j["author"].get("name", "")
    return {"author": author,
            "date": j.get("datePublished", ""),
            "keywords": j.get("keywords", [])}


def build_sitemap():
    """sitemap.xml from the same page pairs, with hreflang alternates."""
    def entry(loc, zh_url, en_url, lastmod):
        s = ["  <url>", "    <loc>%s</loc>" % loc,
             '    <xhtml:link rel="alternate" hreflang="zh-Hans" href="%s"/>' % zh_url,
             '    <xhtml:link rel="alternate" hreflang="en" href="%s"/>' % en_url,
             '    <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>' % zh_url]
        if lastmod:
            s.append("    <lastmod>%s</lastmod>" % lastmod)
        s.append("  </url>")
        return "\n".join(s)

    urls = []
    for zh, en, _label in CORE:
        zu, eu = clean_url(zh), clean_url(en)
        urls.append(entry(zu, zu, eu, SITE_LASTMOD if zh in LASTMOD_TODAY else None))
        urls.append(entry(eu, zu, eu, SITE_LASTMOD if en in LASTMOD_TODAY else None))
    for zh, en in ARTICLES:
        zu, eu = clean_url(zh), clean_url(en)
        urls.append(entry(zu, zu, eu, SITE_LASTMOD))
        urls.append(entry(eu, zu, eu, SITE_LASTMOD))
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + "\n".join(urls) + "\n</urlset>\n")
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(xml)
    return len(urls)


def build():
    # ---------- llms.txt ----------
    L = []
    L.append("# microNature")
    L.append("")
    L.append("> microNature builds the real-world infrastructure for physical "
             "intelligence: turning actual deployment sites into trainable, "
             "validatable, scorable digital proving grounds (Environment "
             "Affordance™), and supplying the scene data and domain-native "
             "physics models that embodied AI is missing. Bilingual site "
             "(English + 中文).")
    L.append("")
    L.append("Canonical site: " + SITE + "/")
    L.append("Contact: see the About page. All articles are original writing by "
             "the microNature team.")
    L.append("")
    L.append("## Company & product")
    for zh, en, label in CORE:
        z, e = head_info(zh), head_info(en)
        desc = e["desc"] or z["desc"]
        line = "- [%s](%s): %s" % (label, e["url"], desc)
        line += " — 中文: %s" % z["url"]
        L.append(line)
    L.append("")
    L.append("## Blog · Insight (思考)")
    L.append("Observations and opinions on how physical intelligence actually "
             "gets deployed. Each piece stands alone.")
    L.append("")
    for zh, en in ARTICLES:
        z, e = head_info(zh), head_info(en)
        am = article_meta(en) or article_meta(zh)
        byline = " (by %s, %s)" % (am["author"], am["date"]) if am.get("author") else ""
        L.append("- [%s](%s): %s%s" % (e["title"], e["url"], e["desc"], byline))
        L.append("  - 中文版: [%s](%s)" % (z["title"], z["url"]))
    L.append("")
    L.append("## Machine-readable files")
    L.append("- [sitemap.xml](%s/sitemap.xml): every public URL with hreflang "
             "alternates." % SITE)
    L.append("- [llms-full.txt](%s/llms-full.txt): full text of the Insight "
             "articles inline." % SITE)
    L.append("- [feed](%s/insight): blog index (HTML)." % SITE)
    L.append("")
    llms_txt = "\n".join(L).rstrip() + "\n"

    # ---------- llms-full.txt ----------
    F = []
    F.append("# microNature — full content (llms-full.txt)")
    F.append("")
    F.append("> Full readable text of the microNature Insight blog, inline, so "
             "an LLM can quote or reason over it without fetching each page. "
             "For the site index see llms.txt. Canonical site: " + SITE + "/")
    F.append("")
    for zh, en in ARTICLES:
        for path in (en, zh):
            info = head_info(path)
            am = article_meta(path)
            lang = "en" if path.startswith("en/") else "zh-Hans"
            F.append("\n" + "=" * 72)
            F.append("## " + info["title"])
            F.append("=" * 72)
            F.append("URL: " + info["url"])
            F.append("Language: %s | Author: %s | Published: %s"
                     % (lang, am.get("author", ""), am.get("date", "")))
            if am.get("keywords"):
                F.append("Keywords: " + ", ".join(am["keywords"]))
            F.append("")
            F.append(body_text(path))
            F.append("")
    llms_full = "\n".join(F).rstrip() + "\n"

    open(os.path.join(ROOT, "llms.txt"), "w", encoding="utf-8").write(llms_txt)
    open(os.path.join(ROOT, "llms-full.txt"), "w", encoding="utf-8").write(llms_full)
    n = build_sitemap()
    print("wrote llms.txt (%d bytes), llms-full.txt (%d bytes), sitemap.xml (%d URLs)"
          % (len(llms_txt.encode()), len(llms_full.encode()), n))


if __name__ == "__main__":
    build()
