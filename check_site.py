#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
microNature 双语站点 · 上线前自检
用法：在站点根目录执行  python3 check_site.py
只读，不修改任何文件。全部通过时退出码为 0。
"""
import os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.abspath(__file__))
ZH = ["index.html", "about.html", "environmentaffordance.html",
      "insight.html", "atlas.html", "map.html"]
EN = ["en/" + f for f in ZH]
ASSETS = ["site.css", "site.js", "atlas.js", "demo.css", "atlas.css", "atlas-base.css"]
# Blog articles live one level down (中) and two levels down (英). The Insight
# list pages themselves stay in ZH/EN above. Both articles are now bilingual.
BLOG_ZH = ["insight/01-capability-deployment-paradox.html",
           "insight/02-who-underwrites-deep-sea-autonomy.html"]
BLOG_EN = ["en/insight/01-capability-deployment-paradox.html",
           "en/insight/02-raising-machines-in-the-deep.html"]
BLOG = BLOG_ZH + BLOG_EN
# Site-wide machine-readable files (crawler + LLM/AI-agent infrastructure) and
# the branded Open Graph cards referenced by the blog pages.
INFRA = ["robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt"]
OG = ["og/blog-zh.png", "og/blog-en.png",
      "og/insight-01-zh.png", "og/insight-01-en.png",
      "og/insight-02-zh.png", "og/insight-02-en.png"]
SITE = "https://micronature.pages.dev"

VOID = {"meta", "link", "br", "img", "hr", "input", "line", "rect", "circle",
        "path", "use", "source", "ellipse", "polygon", "polyline", "stop",
        "image", "col", "tspan"}
CJK = re.compile(r'[\u3000-\u303f\u4e00-\u9fff\uff01-\uff65]')

fails = []
def bad(msg):
    fails.append(msg); print("  FAIL  " + msg)

print("== 1. 文件齐全 ==")
for f in ZH + EN + ASSETS + BLOG + INFRA + OG:
    if os.path.exists(os.path.join(ROOT, f)):
        print("   ok   " + f)
    else:
        bad("缺少文件 " + f)

print("\n== 2. 链接可解析 ==")
for f in ZH + EN + BLOG:
    p = os.path.join(ROOT, f)
    if not os.path.exists(p):
        continue
    base = os.path.dirname(p)
    s = open(p, encoding="utf-8").read()
    body = re.sub(r'<script[\s\S]*?</script>', '', s)
    refs = set(re.findall(r'href="([^"#:]+\.html)[^"]*"', body))
    refs |= set(re.findall(r'(?:href|src)="((?:\.\./)?[\w.-]+\.(?:css|js))"', s))
    miss = [h for h in sorted(refs)
            if not os.path.exists(os.path.normpath(os.path.join(base, h)))]
    if miss:
        bad(f + " 断链 " + ", ".join(miss))
    else:
        print("   ok   " + f)

print("\n== 3. 标签闭合与嵌套 ==")
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.st = []; self.err = 0
    def handle_starttag(self, t, a):
        if t not in VOID:
            self.st.append(t)
    def handle_endtag(self, t):
        if self.st and self.st[-1] == t:
            self.st.pop()
        elif t in self.st:
            self.err += 1
            while self.st and self.st.pop() != t:
                pass
for f in ZH + EN + BLOG:
    p = os.path.join(ROOT, f)
    if not os.path.exists(p):
        continue
    pr = P(); pr.feed(open(p, encoding="utf-8").read())
    if pr.st or pr.err:
        bad(f + " 未闭合 " + str(pr.st[:3]) + " 错序 " + str(pr.err))
    else:
        print("   ok   " + f)

print("\n== 4. 英文页无残留中文（语言开关上的「中」字除外）==")
for f in EN + BLOG_EN:
    p = os.path.join(ROOT, f)
    if not os.path.exists(p):
        continue
    left = set(CJK.findall(open(p, encoding="utf-8").read())) - {"\u4e2d"}
    if left:
        bad(f + " 残留 " + "".join(sorted(left)))
    else:
        print("   ok   " + f)

print("\n== 5. 语言开关成对 ==")
for f in ZH:
    p, q = os.path.join(ROOT, f), os.path.join(ROOT, "en", f)
    if not (os.path.exists(p) and os.path.exists(q)):
        continue
    a = open(p, encoding="utf-8").read()
    b = open(q, encoding="utf-8").read()
    ok = ('href="en/%s"' % f) in a and ('href="../%s"' % f) in b
    ok = ok and 'class="nav-lang"' in a and 'class="nav-lang"' in b
    print(("   ok   " if ok else "  FAIL  ") + f + " <-> en/" + f)
    if not ok:
        fails.append("语言开关不成对 " + f)

print("\n== 6. hreflang 三行齐全 ==")
for f in ZH:
    for path, need in ((f, 'href="en/%s"' % f), ("en/" + f, 'href="../%s"' % f)):
        p = os.path.join(ROOT, path)
        if not os.path.exists(p):
            continue
        s = open(p, encoding="utf-8").read()
        n = len(re.findall(r'<link rel="alternate" hreflang=', s))
        if n != 3 or need not in s:
            bad(path + " hreflang 异常，共 %d 行" % n)
        else:
            print("   ok   " + path)

print("\n== 7. 机器可读文件自洽（sitemap / llms / og:image 指向真实文件）==")
def url_to_local(u):
    """Map a canonical clean URL back to a local file path."""
    if u.startswith(SITE):
        u = u[len(SITE):]
    u = u.split("?")[0].split("#")[0].rstrip(".")
    if u in ("", "/"):
        return "index.html"
    u = u.lstrip("/")
    if u.endswith("/"):
        return u + "index.html"
    for ext in (".html", ".xml", ".txt", ".png"):
        if u.endswith(ext):
            return u
    return u + ".html"

problems = 0
sm_path = os.path.join(ROOT, "sitemap.xml")
sm = open(sm_path, encoding="utf-8").read() if os.path.exists(sm_path) else ""
sm_urls = re.findall(r'<loc>([^<]+)</loc>', sm)
sm_urls += re.findall(r'hreflang="[^"]+"\s+href="([^"]+)"', sm)
for u in sm_urls:
    loc = url_to_local(u)
    if not os.path.exists(os.path.join(ROOT, loc)):
        bad("sitemap 指向不存在的文件 " + u + " -> " + loc); problems += 1
for lf in ("llms.txt", "llms-full.txt"):
    p = os.path.join(ROOT, lf)
    if not os.path.exists(p):
        continue
    for u in set(re.findall(re.escape(SITE) + r'/[^\s)】」，。]*',
                            open(p, encoding="utf-8").read())):
        loc = url_to_local(u)
        if not os.path.exists(os.path.join(ROOT, loc)):
            bad(lf + " 指向不存在的文件 " + u + " -> " + loc); problems += 1
for f in BLOG + ["insight.html", "en/insight.html"]:
    p = os.path.join(ROOT, f)
    if not os.path.exists(p):
        continue
    for u in re.findall(r'property="og:image"\s+content="([^"]+)"',
                        open(p, encoding="utf-8").read()):
        loc = url_to_local(u)
        if not os.path.exists(os.path.join(ROOT, loc)):
            bad(f + " og:image 指向不存在的文件 " + u + " -> " + loc); problems += 1
if not problems:
    print("   ok   sitemap %d 个 <loc> · llms/og:image 引用全部落地" % len(re.findall(r'<loc>', sm)))

print("\n" + ("全部通过，可以上传。" if not fails else "共 %d 项未通过，见上。" % len(fails)))
sys.exit(1 if fails else 0)
