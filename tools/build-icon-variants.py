#!/usr/bin/env python3
"""从 512 图标稿派生两个小程序码中心优化版头像。

A 融合版：纯白底 + 原色图形放大（占比 84%，边距 8%）
B 反白版：珊瑚橙满底 + 白色图形放大（占比 78%）

用法: python tools/build-icon-variants.py <512源图路径>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FG_TOL_LO, FG_TOL_HI = 25, 85  # 软 alpha 阈值


def analyze(src: Image.Image):
    """按珊瑚橙色相检测前景（r 远大于 g/b），免疫背景渐晕。"""
    rgb = src.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    alpha = Image.new("L", rgb.size, 0)
    ap = alpha.load()
    fr = fg = fb = n = 0
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            score = (r - g) + (r - b)
            a = 0 if score <= 40 else (255 if score >= 140 else int((score - 40) * 255 / 100))
            ap[x, y] = a
            if a > 200:
                fr += r; fg += g; fb += b; n += 1
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
    if max_x < 0:
        raise SystemExit("未检测到珊瑚色前景")
    fg_color = (fr // n, fg // n, fb // n)
    return alpha.crop((min_x, min_y, max_x + 1, max_y + 1)), fg_color


def place(canvas: Image.Image, content: Image.Image, ratio: float, use_alpha=True):
    size = canvas.width
    inner = int(size * ratio)
    cw, ch = content.size
    scale = min(inner / cw, inner / ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    resized = content.resize((nw, nh), Image.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized if use_alpha else None)


def rounded(im: Image.Image, radius_ratio: float = 0.22) -> Image.Image:
    r = int(im.width * radius_ratio)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=r, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def build_preview(icons: list, labels: list) -> Image.Image:
    sizes = [144, 72, 48]
    bgs = [(255, 255, 255), (32, 32, 34)]
    pad, label_h, block_h = 44, 84, 144 + 24
    W, H = pad * 2 + 144 + 24, label_h + len(sizes) * block_h + 24
    out = Image.new("RGB", (W * 2, H), (245, 245, 247))
    d = ImageDraw.Draw(out)
    for xi, bg in enumerate(bgs):
        x0 = xi * W
        for i, (icon, label) in enumerate(zip(icons, labels)):
            s = sizes[0]
            y = label_h + i * block_h
            tile = Image.new("RGBA", (s + 24, s + 24), bg + (255,))
            tile.paste(rounded(icon.resize((s, s), Image.LANCZOS)), (12, 12), rounded(icon.resize((s, s), Image.LANCZOS)))
            out.paste(tile, (x0 + pad, y), tile)
            d.text((x0 + pad + s + 40, y + 56), label, fill=(90, 90, 90) if xi == 0 else (200, 200, 200),
                   font=ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 15))
            d.line([(x0 + pad, y + s + 24 + 6), (x0 + pad + 220, y + s + 24 + 6)], fill=(210, 210, 214))
    return out


def main():
    src = Image.open(Path(sys.argv[1])).convert("RGB")
    alpha, fg_color = analyze(src)

    size = 1024
    # A 融合版：白底 + 原色图形 84%
    a = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    colored = Image.new("RGBA", alpha.size, fg_color + (255,))
    colored.putalpha(alpha)
    place(a, colored, 0.84)

    # B 反白版：橙底 + 白色图形 78%
    b = Image.new("RGBA", (size, size), fg_color + (255,))
    white = Image.new("RGBA", alpha.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    place(b, white, 0.78)

    a144 = a.resize((144, 144), Image.LANCZOS)
    b144 = b.resize((144, 144), Image.LANCZOS)
    a144.save(ROOT / "logo-icon-a.png")
    b144.save(ROOT / "logo-icon-b.png")
    a.resize((512, 512), Image.LANCZOS).save(ROOT / "logo-icon-a-512.png")
    b.resize((512, 512), Image.LANCZOS).save(ROOT / "logo-icon-b-512.png")
    prev = build_preview([a144, b144, a144, b144][:2] * 1, ["A 白底融合", "B 橙底反白"])
    # 预览里浅色底排 A/B，深色底也排 A/B
    prev = build_preview([a144, b144], ["A 白底融合", "B 橙底反白"])
    prev.save(ROOT / "logo-icon-variants-preview.png")
    print(f"前景主色 rgb{fg_color}")
    for p in ["logo-icon-a.png", "logo-icon-b.png", "logo-icon-a-512.png", "logo-icon-b-512.png", "logo-icon-variants-preview.png"]:
        f = ROOT / p
        print(f"{f}  {f.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
