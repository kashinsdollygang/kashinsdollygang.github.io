#!/usr/bin/env python3
"""Ronin 2: разбор фото на слои для анимации «кольцо качается, камера ровная».

Слои (public/images/scenes/ronin-rig/):
  base  — вся сцена, из которой вынуто кольцо (фон под ним дорисован cv2.inpaint), камера и подставка на месте;
  ring  — внешнее кольцо с зажимами (вырезано GrabCut по направляющим линиям) с прозрачным фоном;
  front — части камеры, за которыми кольцо проходит (ручка, голова, блэнда, кабели): лежат поверх кольца.
Техника на фото не меняется — только сдвигается слой кольца. Это 2D-анимация фотографии, а не 3D-модель.
Запуск: python3 scripts/build-ronin-rig.py
"""
import hashlib, json
from pathlib import Path
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src/fleet/13-dji-ronin-2.png"
OUT = ROOT / "public/images/scenes/ronin-rig"
BOX = (24, 322, 1098, 1374)
CAPTION_RECTS = [(0, 318, 614, 354), (0, 354, 334, 434)]  # подпись постера закрашивается, как в prepare-assets.py

# направляющие линии кольца в координатах кропа (1074×1052)
LEFT = [(332,832),(292,780),(280,700),(288,600),(298,500),(308,420),(322,340),(348,262),(395,195),(455,150),(520,125),(585,110),(650,118),(700,148),(755,200),(792,262),(810,330),(816,400)]
RIGHT_LOW = [(750,672),(740,740),(714,795),(692,826)]
PIVOT = (540, 845)  # низ подставки: концы кольца почти не двигаются, верх качается

CLEAR = [  # то, что GrabCut принял за кольцо, но кольцом не является
    [(535,55),(720,55),(720,104),(535,104)],                    # стойка ручки
    [(405,185),(452,168),(547,163),(547,255),(425,255)],        # монитор
    [(374,240),(445,240),(445,300),(374,300)],                  # начало красной рамы
    [(783,406),(900,406),(900,480),(783,480)],                  # блэнда
]
OCCLUDERS = [  # кольцо проходит за этими деталями камеры
    [(236,497),(262,492),(345,503),(345,548),(236,548)],                                                    # рукоять слева
    [(548,140),(560,128),(640,126),(690,148),(698,190),(694,275),(686,306),(560,306),(548,290),(545,170)],   # голова
    [(412,200),(430,178),(545,165),(545,252),(430,250)],                                                    # монитор
    [(783,394),(1020,440),(1020,662),(792,642),(783,600)],                                                  # блэнда
    [(690,636),(802,636),(802,686),(735,694),(690,670)],                                                    # узел объектива над трубой
]
CABLE = [(626,690),(640,752),(668,774),(705,770),(730,744),(746,704),(760,690)]


def load_scene():
    im = Image.open(SRC).convert("RGB")
    m = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(m)
    for r in CAPTION_RECTS:
        d.rectangle(r, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(2))
    sample = im.crop((30, 440, 230, 470)).resize((1, 1), Image.BOX).getpixel((0, 0))
    im = Image.composite(Image.new("RGB", im.size, sample), im, m)
    return cv2.cvtColor(np.array(im.crop(BOX)), cv2.COLOR_RGB2BGR)


def main():
    im = load_scene()
    H, W = im.shape[:2]

    def stroke(pts, w):
        z = np.zeros((H, W), np.uint8)
        for a, b in zip(pts[:-1], pts[1:]):
            cv2.line(z, a, b, 255, int(w * 0.72) if (a[0] > 640 and a[1] < 420) else w, cv2.LINE_AA)
        return z

    gc = np.full((H, W), cv2.GC_BGD, np.uint8)
    gc[np.maximum(stroke(LEFT, 120), stroke(RIGHT_LOW, 100)) > 0] = cv2.GC_PR_BGD
    gc[np.maximum(stroke(LEFT, 66), stroke(RIGHT_LOW, 56)) > 0] = cv2.GC_PR_FGD
    gc[np.maximum(stroke(LEFT, 16), stroke(RIGHT_LOW, 14)) > 0] = cv2.GC_FGD
    cv2.setRNGSeed(7)
    cv2.grabCut(im, gc, None, np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_MASK)
    ring = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    ring = cv2.morphologyEx(ring, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    ring = cv2.bitwise_and(ring, np.maximum(stroke(LEFT, 60), stroke(RIGHT_LOW, 54)))
    for poly in CLEAR:
        cv2.fillPoly(ring, [np.array(poly, np.int32)], 0)
    ring = cv2.morphologyEx(ring, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    occ = np.zeros((H, W), np.uint8)
    for poly in OCCLUDERS:
        cv2.fillPoly(occ, [np.array(poly, np.int32)], 255)
    cv2.polylines(occ, [np.array(CABLE, np.int32)], False, 255, 14, cv2.LINE_AA)

    # основа: кольцо вынуто и дорисован фон; там, где кольцо закрыто камерой, оставляем как есть
    hole = cv2.dilate(ring, np.ones((9, 9), np.uint8))
    hole[occ > 0] = 0
    base = cv2.inpaint(im, hole, 7, cv2.INPAINT_TELEA)

    ring_a = cv2.GaussianBlur(cv2.dilate(ring, np.ones((3, 3), np.uint8)), (0, 0), 0.9)
    ring_a = (ring_a.astype(np.float32) * (1 - cv2.GaussianBlur(occ, (0, 0), 1.0).astype(np.float32) / 255)).astype(np.uint8)
    front_a = cv2.GaussianBlur(occ, (0, 0), 1.0)

    OUT.mkdir(parents=True, exist_ok=True)
    rgb = lambda a: cv2.cvtColor(a, cv2.COLOR_BGR2RGB)
    Image.fromarray(rgb(base)).save(OUT / "base.webp", "WEBP", quality=88, method=6)
    Image.fromarray(np.dstack([rgb(im), ring_a]), "RGBA").save(OUT / "ring.webp", "WEBP", quality=90, method=6, exact=True)
    Image.fromarray(np.dstack([rgb(im), front_a]), "RGBA").save(OUT / "front.webp", "WEBP", quality=90, method=6, exact=True)
    version = hashlib.sha1(b"".join((OUT / f"{n}.webp").read_bytes() for n in ("base", "ring", "front"))).hexdigest()[:8]
    (OUT / "rig.json").write_text(json.dumps({
        "width": W, "height": H, "pivot": [round(PIVOT[0] / W, 4), round(PIVOT[1] / H, 4)], "version": version,
    }, indent=2))
    print("ронин-слои готовы:", W, H, version)


if __name__ == "__main__":
    main()
