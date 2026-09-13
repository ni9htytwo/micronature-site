#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
microNature — reusable Open Graph card generator (the "Insight blog" series).
Renders a 1200x630 branded card with crisp, exact title text using the site's
own fonts and the white logo lockup. To add a future article, append one entry
to CARDS and re-run:  python3 make_og.py
Output goes to ./og/*.png (deployed with the site; referenced by og:image).
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "og")
os.makedirs(OUT, exist_ok=True)

W, H = 1200, 630
M = 84                      # margin
BG_TOP = (16, 24, 20)       # #101814
BG_BOT = (9, 14, 12)        # deep green-black
INK    = (236, 235, 229)    # warm white
INK2   = (168, 174, 169)
INK3   = (134, 141, 136)
RULE   = (46, 58, 52)
SIGNAL = (210, 243, 95)     # #D2F35F
ACCENT = (100, 180, 137)    # #64B489

F = lambda rel, size: ImageFont.truetype(os.path.join(ROOT, rel), size)
ARCH_B  = "Archivo/static/Archivo-Bold.ttf"
ARCH_M  = "Archivo/static/Archivo-Medium.ttf"
NOTO_B  = "Noto_Sans_SC/static/NotoSansSC-Bold.ttf"
NOTO_M  = "Noto_Sans_SC/static/NotoSansSC-Medium.ttf"
MONO_SB = "IBM_Plex_Mono/IBMPlexMono-SemiBold.ttf"
MONO_M  = "IBM_Plex_Mono/IBMPlexMono-Medium.ttf"
LOGO    = os.path.join(ROOT, "LOGO microNature/micronature-horizontal-white.png")
MARK    = os.path.join(ROOT, "LOGO microNature/micronature-mark-white.png")


def gradient():
    img = Image.new("RGB", (W, H), BG_TOP)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        c = tuple(round(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    return img


def watermark(img):
    """Faint pine mark, bottom-right, bleeding off the edge."""
    mark = Image.open(MARK).convert("RGBA")
    w = 620
    mark = mark.resize((w, round(w * mark.height / mark.width)), Image.LANCZOS)
    alpha = mark.split()[3].point(lambda p: int(p * 0.055))
    mark.putalpha(alpha)
    img_rgba = img.convert("RGBA")
    img_rgba.alpha_composite(mark, (W - w + 150, H - mark.height + 90))
    return img_rgba.convert("RGB")


def paste_logo(img):
    logo = Image.open(LOGO).convert("RGBA")
    h = 40
    logo = logo.resize((round(h * logo.width / logo.height), h), Image.LANCZOS)
    img.convert("RGBA").alpha_composite(logo, (M, 66))
    return img


def tracked_width(d, text, font, tracking):
    return sum(d.textlength(c, font=font) + tracking for c in text) - tracking


def draw_tracked(d, x, y, text, font, fill, tracking, align="left"):
    if align == "right":
        x = x - tracked_width(d, text, font, tracking)
    for c in text:
        d.text((x, y), c, font=font, fill=fill)
        x += d.textlength(c, font=font) + tracking


def wrap(d, text, font, maxw, cjk=False):
    lines, cur = [], ""
    if cjk:
        for ch in text:
            if d.textlength(cur + ch, font=font) <= maxw or not cur:
                cur += ch
            else:
                lines.append(cur); cur = ch
    else:
        for word in text.split():
            t = (cur + " " + word).strip()
            if d.textlength(t, font=font) <= maxw or not cur:
                cur = t
            else:
                lines.append(cur); cur = word
    if cur:
        lines.append(cur)
    return lines


def card(spec):
    img = watermark(gradient())
    img = paste_logo(img) if False else img  # logo pasted after Draw (below)
    d = ImageDraw.Draw(img)

    cjk = spec.get("cjk", False)
    # top-right kicker
    draw_tracked(d, W - M, 80, spec["kicker"], F(MONO_SB, 22), SIGNAL, 3, align="right")

    # title + optional deck, vertically placed in the mid band
    tsize = 58 if cjk else 66
    tfont = F(NOTO_B if cjk else ARCH_B, tsize)
    tlines = wrap(d, spec["title"], tfont, W - 2 * M, cjk=cjk)[:3]
    tlh = round(tsize * 1.14)
    deck = spec.get("deck")
    dsize = 27 if cjk else 28
    dfont = F(NOTO_M if cjk else ARCH_M, dsize)
    dlines = wrap(d, deck, dfont, W - 2 * M - 40, cjk=cjk)[:2] if deck else []
    dlh = round(dsize * 1.42)

    block_h = len(tlines) * tlh + (18 + len(dlines) * dlh if dlines else 0)
    top = 210
    if block_h < 210:
        top = 210 + (210 - block_h) // 3
    y = top
    for ln in tlines:
        d.text((M, y), ln, font=tfont, fill=INK)
        y += tlh
    if dlines:
        y += 16
        for ln in dlines:
            d.text((M, y), ln, font=dfont, fill=INK2)
            y += dlh

    # bottom divider + byline
    d.line([(M, 528), (W - M, 528)], fill=RULE, width=1)
    d.text((M, 552), spec["byline"], font=F(MONO_SB, 23), fill=INK2)
    draw_tracked(d, W - M, 556, "micronature.pages.dev", F(MONO_M, 20), INK3, 1.5, align="right")

    # paste the white logo lockup last (needs alpha)
    img = img.convert("RGBA")
    logo = Image.open(LOGO).convert("RGBA")
    lh = 40
    logo = logo.resize((round(lh * logo.width / logo.height), lh), Image.LANCZOS)
    img.alpha_composite(logo, (M, 66))
    img.convert("RGB").save(os.path.join(OUT, spec["out"]), "PNG", optimize=True)
    print("wrote og/" + spec["out"])


CARDS = [
    dict(out="blog-zh.png", cjk=True, kicker="MICRONATURE · 思考",
         title="思考", deck="物理智能如何真正落地的观察与判断。",
         byline="microNature Blog"),
    dict(out="blog-en.png", cjk=False, kicker="MICRONATURE · INSIGHT",
         title="Insight", deck="Observations and opinions on how physical intelligence actually gets deployed.",
         byline="microNature Blog"),
    dict(out="insight-01-zh.png", cjk=True, kicker="INSIGHT · MN-A1",
         title="能力与部署的悖论",
         deck="算力、数据与四条数据获取路径：规模定律为何至今没有出现。",
         byline="Stephen · 2026.08"),
    dict(out="insight-01-en.png", cjk=False, kicker="INSIGHT · MN-A1",
         title="The Capability–Deployment Paradox",
         deck="Compute, data, and the four paths to get it — why robots still have no scaling law.",
         byline="Stephen · 2026.08"),
    dict(out="insight-02-zh.png", cjk=True, kicker="INSIGHT · MN-A2",
         title="试错这么贵，谁来托举深海自主化",
         deck="成本、验证与环境：把“能力瓶颈”与“验证瓶颈”拆开来看。",
         byline="Manda · 2026.09.12"),
    dict(out="insight-02-en.png", cjk=False, kicker="INSIGHT · MN-A2",
         title="Raising Machines in the Deep",
         deck="Why Trial and Error Is the Costliest Thing at Sea",
         byline="Manda · 2026.09.13"),
]

if __name__ == "__main__":
    for s in CARDS:
        card(s)
    print("\nDONE:", len(CARDS), "cards ->", OUT)
