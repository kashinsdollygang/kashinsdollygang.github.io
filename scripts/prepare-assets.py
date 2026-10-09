#!/usr/bin/env python3
"""
Готовит веб-версии изображений из оригиналов в assets-src/.

Оригиналы НЕ изменяются. Скрипт создаёт производные файлы в public/images/:
  - fleet/   — постеры парка техники в WebP (640 и 1120 px по ширине), без изменений композиции;
  - scenes/  — кадрирование нижней части постеров (только техника) для первого экрана и сцен.
               Подпись постера (текст на фоне слева сверху) в кадрированной версии
               затемняется размытым фоном. Пиксели самой техники не затрагиваются —
               прямоугольники затемнения подобраны так, чтобы не пересекаться с оборудованием;
  - brand/   — логотип KASHIN'S DOLLY GANG с прозрачным фоном (альфа из яркости),
               без перерисовки и изменения пропорций;
  - og-image.jpg, apple-touch-icon.png.

Шрифты (OFL) подмножествуются до латиницы и кириллицы в WOFF.

Запуск:  python3 scripts/prepare-assets.py   (нужны Pillow и fontTools)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "public" / "images"

FLEET = [
    "01-movietech-magnum-dolly-electric-column.jpg",
    "02-movietech-magnum-dolly-base.png",
    "03-panther-classic-plus.png",
    "04-gfm-gf-primo-dolly.png",
    "05-gfm-gf-secondo-dolly.png",
    "06-gfm-gf-quad-dolly.png",
    "07-gfm-grip-kit-dolly.png",
    "08-gfm-gf-mod-jib.png",
    "09-gfm-gf-tele-jib.png",
    "10-gfm-column-operator-jib.png",
    "11-gfm-lite-dolly.png",
    "12-scorpio-10-operator-jib.png",
    "13-dji-ronin-2.png",
]

# name: (source poster, crop box, rectangles of poster caption to darken — all in source coords)
# Рамка постера (тонкая линия) находится примерно в 14–16 px от края — кроп берётся внутри неё.
SCENES = {
    "magnum-electric-column": (FLEET[0], (24, 310, 1098, 1374), [(0, 306, 512, 352), (0, 352, 232, 432)]),
    "primo-on-rails": (FLEET[3], (24, 308, 1098, 1374), [(0, 304, 530, 352), (0, 352, 232, 428)]),
    "scorpio-jib": (FLEET[11], (24, 420, 1098, 1374), []),
    "ronin-2": (FLEET[12], (24, 322, 1098, 1374), [(0, 318, 614, 354), (0, 354, 334, 434)]),
}


def save_webp(im: Image.Image, path: Path, width: int, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.width > width:
        h = round(im.height * width / im.width)
        im = im.resize((width, h), Image.LANCZOS)
    im.save(path, "WEBP", quality=quality, method=6)


def fleet():
    for name in FLEET:
        im = Image.open(SRC / "fleet" / name).convert("RGB")
        stem = Path(name).stem
        save_webp(im, OUT / "fleet" / f"{stem}-640.webp", 640, 84)
        save_webp(im, OUT / "fleet" / f"{stem}-1120.webp", 1120, 88)


def scenes():
    for key, (name, box, rects) in SCENES.items():
        im = Image.open(SRC / "fleet" / name).convert("RGB")
        if rects:
            mask = Image.new("L", im.size, 0)
            d = ImageDraw.Draw(mask)
            for r in rects:
                d.rectangle(r, fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(2))
            # заливка — средний тон фона прямо под подписью (там нет текста и техники)
            sample = im.crop((30, 440, 230, 470)).resize((1, 1), Image.BOX).getpixel((0, 0))
            bg = Image.new("RGB", im.size, sample)
            im = Image.composite(bg, im, mask)
        crop = im.crop(box)
        save_webp(crop, OUT / "scenes" / f"{key}-1074.webp", 1074, 86)
        save_webp(crop, OUT / "scenes" / f"{key}-640.webp", 640, 82)
        if key == "magnum-electric-column":
            crop.save(ROOT / "assets-src" / "_og-source.png")


def logo():
    src = Image.open(SRC / "brand" / "kashins-dolly-gang-logo-original.png").convert("L")
    # белый знак на чёрном: яркость → альфа, цвет — чистый белый
    alpha = src.point(lambda v: 0 if v < 18 else (255 if v > 235 else int((v - 18) * 255 / 217)))
    bbox = alpha.getbbox()
    pad = 8
    bbox = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, src.width), min(bbox[3] + pad, src.height))
    alpha = alpha.crop(bbox)
    white = Image.new("RGBA", alpha.size, (255, 255, 255, 0))
    white.putalpha(alpha)
    (OUT / "brand").mkdir(parents=True, exist_ok=True)
    w = white.resize((800, round(white.height * 800 / white.width)), Image.LANCZOS)
    w.save(OUT / "brand" / "kdg-logo-white.png", optimize=True)
    w.save(OUT / "brand" / "kdg-logo-white.webp", "WEBP", quality=92, method=6)
    return white


def og(logo_rgba: Image.Image):
    W, H = 1200, 630
    canvas = Image.new("RGB", (W, H), (5, 6, 7))
    photo = Image.open(ROOT / "assets-src" / "_og-source.png").convert("RGB")
    ph = photo.resize((round(photo.width * H / photo.height), H), Image.LANCZOS)
    # мягкое затухание фото влево
    fade = Image.new("L", ph.size, 255)
    fd = ImageDraw.Draw(fade)
    for x in range(260):
        fd.line([(x, 0), (x, H)], fill=int(255 * x / 260))
    canvas.paste(ph, (W - ph.width + 40, 0), fade)
    lg = logo_rgba.resize((560, round(logo_rgba.height * 560 / logo_rgba.width)), Image.LANCZOS)
    canvas.paste(lg, (64, (H - lg.height) // 2 - 20), lg)
    d = ImageDraw.Draw(canvas)
    d.ellipse([70, H - 92, 88, H - 74], fill=(255, 48, 56))
    canvas.save(ROOT / "public" / "og-image.jpg", quality=86)
    (ROOT / "assets-src" / "_og-source.png").unlink()

    icon = Image.new("RGB", (180, 180), (5, 6, 7))
    di = ImageDraw.Draw(icon)
    di.ellipse([50, 50, 130, 130], fill=(255, 48, 56))
    icon.save(ROOT / "public" / "apple-touch-icon.png")


def fonts():
    from fontTools import subset
    out = ROOT / "public" / "fonts"
    out.mkdir(parents=True, exist_ok=True)
    unicodes = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2010-2027,U+2030-203A,U+2116,U+2122,U+2190-2193,U+2212,U+2215,U+2032-2033,U+25CF"
    for src, dst in [
        ("SofiaSansExtraCondensed[wght].ttf", "sofia-sans-extra-condensed-var.woff"),
        ("GolosText[wght].ttf", "golos-text-var.woff"),
    ]:
        subset.main([
            str(SRC / "fonts" / src),
            f"--unicodes={unicodes}",
            "--layout-features=*",
            "--flavor=woff",
            f"--output-file={out / dst}",
        ])


if __name__ == "__main__":
    fleet()
    scenes()
    lg = logo()
    og(lg)
    fonts()
    print("done")
