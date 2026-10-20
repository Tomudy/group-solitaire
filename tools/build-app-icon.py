#!/usr/bin/env python3
"""从 1024 版 logo 图标稿生成微信小程序上传用图标。

- 自动检测内容边界并重新光学居中（消除生成稿的偏移）
- 统一 12% 安全边距，保证微信圆角裁切后图形完整
- 输出 144（微信建议规格）与 512（高清备用）
- 另合成一张圆角裁切 + 小尺寸可读性预览图

用法:
  python tools/build-app-icon.py <源图路径> [背景色 hex]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SAFE_PAD = 0.12          # 四周安全边距比例
FG_TOL = 45              # 前景判定容差（与背景色的通道距离）


def detect_bbox(img: Image.Image, bg) -> tuple[int, int, int, int]:
    """按背景色差值找出内容边界。"""
    rgb = img.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    step = 2
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b = px[x, y]
            d = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
            if d > FG_TOL:
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y
    if max_x < 0:
        raise SystemExit("没找到任何前景像素，检查一下背景色容差")
    # 粗扫描后再向外/内补 2px 余量
    return max(0, min_x - 2), max(0, min_y - 2), min(w - 1, max_x + 2), min(h - 1, max_y + 2)


def build_square(src: Image.Image, bg, size: int) -> Image.Image:
    bbox = detect_bbox(src, bg)
    content = src.crop(bbox).convert("RGBA")

    # 内容放进目标画布，四边各留 SAFE_PAD
    inner = int(size * (1 - 2 * SAFE_PAD))
    cw, ch = content.size
    scale = min(inner / cw, inner / ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    content = content.resize((nw, nh), Image.LANCZOS)

    canvas = Image.new("RGBA", (size, size), bg + (255,))
    canvas.paste(content, ((size - nw) // 2, (size - nh) // 2), content)
    return canvas


def rounded(im: Image.Image, radius_ratio: float = 0.22) -> Image.Image:
    r = int(im.width * radius_ratio)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=r, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def build_preview(icon: Image.Image) -> Image.Image:
    """浅色/深色背景 + 圆角裁切 + 多尺寸可读性。"""
    sizes = [144, 72, 48, 32]
    pad, label_h = 48, 90
    block_h = 144 + 24
    W = sizes[0] + pad * 2 + 24
    H = pad + label_h + len(sizes) * block_h + pad
    out = Image.new("RGB", (W * 2 + 24, H), (245, 245, 247))
    d = ImageDraw.Draw(out)

    for xi, bg in enumerate([(255, 255, 255), (32, 32, 34)]):
        x0 = xi * (W + 24)
        for i, s in enumerate(sizes):
            thumb = rounded(icon.resize((s, s), Image.LANCZOS))
            y = pad + label_h + i * block_h
            tile = Image.new("RGBA", (s + 24, s + 24), bg + (255,))
            tile.paste(thumb, (12, 12), thumb)
            out.paste(tile, (x0 + 24, y), tile)
            d.line([(x0 + 24, y + s + 24 + 8), (x0 + 24 + 240, y + s + 24 + 8)], fill=(210, 210, 214))
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src_path = Path(sys.argv[1])
    src = Image.open(src_path).convert("RGBA")
    bg = tuple(int(sys.argv[2].lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) if len(sys.argv) > 2 \
        else src.convert("RGB").getpixel((6, 6))

    icon_512 = build_square(src, bg, 512)
    icon_144 = icon_512.resize((144, 144), Image.LANCZOS)

    out144 = ROOT / "logo-icon.png"
    out512 = ROOT / "logo-icon-512.png"
    preview = ROOT / "logo-icon-preview.png"
    icon_144.save(out144)
    icon_512.save(out512)
    build_preview(icon_144).save(preview)

    print(f"背景取样: rgb{bg}")
    print(f"{out144}  {out144.stat().st_size/1024:.0f} KB  144x144")
    print(f"{out512}  {out512.stat().st_size/1024:.0f} KB  512x512")
    print(f"{preview}  {preview.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
