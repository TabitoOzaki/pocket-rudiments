#!/usr/bin/env python3
"""
アプリアイコン・Android のアダプティブアイコン・スプラッシュを作る。
design/snare-mark.png（黒地に白い線画）の明るさを透明度として白いマークに変え、
黒い背景に重ねる。

使い方:
  python3 scripts/make-icons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
MARK_SOURCE = ROOT / 'design' / 'snare-mark.png'
# これより暗い画素は背景とみなしてマークの範囲から外す
BACKGROUND_THRESHOLD = 40
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)
ICON_SIZE = 1024


def load_mark():
    """線画を白いマーク（透過 PNG）にし、余白を切り詰めて返す"""
    luminance = Image.open(MARK_SOURCE).convert('L')
    bounds = luminance.point(lambda value: 255 if value > BACKGROUND_THRESHOLD else 0).getbbox()
    alpha = luminance.crop(bounds)
    mark = Image.new('RGBA', alpha.size, WHITE)
    mark.putalpha(alpha)
    return mark


def place(canvas, mark, width_ratio):
    """マークの幅を canvas の width_ratio 倍にして中央に重ねる"""
    width = round(canvas.width * width_ratio)
    height = round(mark.height * width / mark.width)
    scaled = mark.resize((width, height), Image.LANCZOS)
    canvas.alpha_composite(scaled, ((canvas.width - width) // 2, (canvas.height - height) // 2))


def main():
    background = Image.new('RGBA', (ICON_SIZE, ICON_SIZE), BLACK)
    size = ICON_SIZE
    mark = load_mark()

    # Android のアダプティブアイコンの背景
    background.convert('RGB').save(ASSETS / 'adaptive-icon-bg.png', optimize=True)

    # iOS のアイコン（透過不可なので背景と合成して RGB で保存）
    icon = background.copy()
    place(icon, mark, 0.66)
    icon.convert('RGB').save(ASSETS / 'icon.png', optimize=True)

    # Android の前景は丸や角丸で切り抜かれるので、中央の安全領域（約 66%）に収める
    foreground = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    place(foreground, mark, 0.5)
    foreground.save(ASSETS / 'adaptive-icon.png', optimize=True)

    # スプラッシュ（中央にマークを置く）
    splash = Image.new('RGBA', (1284, 2778), BLACK)
    place(splash, mark, 0.4)
    splash.convert('RGB').save(ASSETS / 'splash.png', optimize=True)


if __name__ == '__main__':
    main()
