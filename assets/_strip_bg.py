"""
剥离 Figma 导出的烧入灰色背景，恢复 alpha 透明。
对每个目标像素：根据它与 bg_rgb 的颜色距离推算 alpha，
并按 premultiplied alpha 反演还原前景纯色，避免边缘灰光晕。
"""
from PIL import Image
import numpy as np
import os, sys

BG_RGB = (240, 240, 240)
TOLERANCE = 4   # 颜色距离 ≤ 这值的像素视作纯背景 → 全透明
EDGE_RANGE = 24 # 颜色距离从 TOLERANCE 到这值之间做平滑过渡

# 处理列表（必须保留 alpha 透明的切图）
TARGETS = [
    # filter-region
    "mt-anchor.png", "mt-favorite.png", "mt-football.png",
    "mt-basketball.png", "mt-esports.png",
    "league-ucl.png", "league-pl.png", "league-seriea.png",
    "league-laliga.png", "league-ligue1.png",
    "search-icon.png", "yen-coin.png",
    "mk-logo.png", "panda-logo.png", "im-logo.png", "saba-logo.png",
    "promo-ribbon.png",
    # bottom-float
    "sport-ico-01.png", "sport-ico-02.png", "sport-ico-03.png",
    "sport-ico-04.png", "sport-ico-05.png",
    # tabbar
    "common-tabbar.png",
]

def strip_bg(path):
    im = Image.open(path).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    br, bg, bb = BG_RGB

    # Chebyshev distance to bg
    dist = np.maximum(np.maximum(np.abs(r - br), np.abs(g - bg)), np.abs(b - bb))

    # 距离 -> 新 alpha (0~255)
    new_a = np.clip((dist - TOLERANCE) * (255.0 / EDGE_RANGE), 0.0, 255.0)

    # 反推前景纯色：mixed = fg*a + bg*(1-a) → fg = (mixed - bg*(1-a)) / a
    alpha_norm = new_a / 255.0
    safe_a = np.maximum(alpha_norm, 1e-3)
    for c, bg_c in enumerate(BG_RGB):
        unmixed = (arr[..., c] - bg_c * (1.0 - alpha_norm)) / safe_a
        arr[..., c] = np.where(new_a > 0, np.clip(unmixed, 0, 255), 0)

    arr[..., 3] = new_a

    out = Image.fromarray(arr.astype(np.uint8), "RGBA")
    out.save(path, optimize=True)

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    for name in TARGETS:
        p = os.path.join(here, name)
        if not os.path.exists(p):
            print(f"  MISSING {name}")
            continue
        strip_bg(p)
        # 验证
        im = Image.open(p)
        w, h = im.size
        px = im.load()
        corner = px[0, 0]
        print(f"  {name:24} -> corner_TL={corner}")

if __name__ == "__main__":
    main()
