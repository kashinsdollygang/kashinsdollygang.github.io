#!/usr/bin/env python3
"""Ronin 2 на подвесе крана: фон + слои для анимации.

Вход:  assets-src/ronin-jib/ronin-on-jib-clean.png (результат scripts/clean-ronin-jib.py)
Выход: public/images/scenes/ronin-jib/{bg,arm,rig}.webp + rig.json
  bg  — нарисованный фон в духе постеров: тёмная стена, тёплые вертикальные лампы, мокрый пол с отражениями;
  arm — стрела крана с адаптером (неподвижна);
  rig — подвес: вращающаяся часть Ronin 2 с камерой (поворачивается и наклоняется вокруг оси подвеса).
Техника на фото не перерисовывается, меняются только фон, положение и поворот слоёв.
"""
import hashlib, json
from pathlib import Path
import cv2, numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src/ronin-jib/ronin-on-jib-clean.png"
OUT = ROOT / "public/images/scenes/ronin-jib"
CW, CH = 1600, 1504          # холст сцены
SCALE, OX, OY = 1.2, -150, 215  # масштаб и положение вырезки на холсте
AXIS = (905, 166)            # ось вращения подвеса в координатах вырезки (центр корпуса под адаптером)
SEAM_Y = 166                 # линия разреза «адаптер / вращающийся корпус»
# разрез: всё, что ниже линии разреза и правее REVOLT, — подвес; стрела и кабель слева остаются на месте
RIG_POLY = [(640, 198), (780, 186), (822, 172), (834, SEAM_Y - 3), (1379, SEAM_Y - 3), (1379, 878), (640, 878)]
ARM_KEEP_BELOW_SEAM = 5      # стрела заходит под линию разреза на 5 px, чтобы не было щели при наклоне


def place(layer):
    h, w = layer.shape[:2]
    nw, nh = round(w * SCALE), round(h * SCALE)
    big = cv2.resize(layer, (nw, nh), interpolation=cv2.INTER_LANCZOS4)
    canvas = np.zeros((CH, CW, 4), np.uint8)
    x0, y0 = max(OX, 0), max(OY, 0)
    x1, y1 = min(OX + nw, CW), min(OY + nh, CH)
    canvas[y0:y1, x0:x1] = big[y0 - OY:y1 - OY, x0 - OX:x1 - OX]
    return canvas


def make_bg(seed=11):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:CH, 0:CW].astype(np.float32)
    horizon = 1010
    img = np.zeros((CH, CW, 3), np.float32)
    # стена: тёмно-коричневый тон, едва заметные вертикальные панели
    wall = np.array([20, 13, 9], np.float32)
    img[:] = wall
    panels = (np.sin(x / 150 * np.pi * 2 + 0.7) > 0.985).astype(np.float32)
    img *= (1 - 0.35 * panels[..., None])
    n = cv2.GaussianBlur(rng.normal(0, 1, (CH, CW)).astype(np.float32), (0, 0), 3)
    img += n[..., None] * np.array([4.0, 2.6, 1.6], np.float32)
    img *= np.clip(0.55 + 0.6 * (y / horizon), 0.45, 1.05)[..., None]  # к полу чуть светлее
    # тёплое свечение за подвесом (отделяет чёрную технику от фона)
    glow = np.exp(-(((x - 1060) / 620) ** 2 + ((y - 760) / 470) ** 2))
    img += glow[..., None] * np.array([92, 44, 15], np.float32)
    # вертикальные лампы по краям, как на постерах
    lamps = [(150, 300, 800, 22), (1500, 280, 800, 22)]
    lamp_layer = np.zeros((CH, CW), np.float32)
    for lx, y0, y1, w in lamps:
        m = np.zeros((CH, CW), np.float32)
        cv2.rectangle(m, (lx - w // 2, y0), (lx + w // 2, y1), 1.0, -1)
        lamp_layer += m * (0.9 if w > 10 else 0.25)
        glow_l = cv2.GaussianBlur(m, (0, 0), 64) * 3.0 + cv2.GaussianBlur(m, (0, 0), 20) * 1.3
        img += glow_l[..., None] * np.array([120, 62, 22], np.float32) * (1 if w > 10 else 0.25)
    img += np.clip(lamp_layer, 0, 1)[..., None] * np.array([255, 215, 160], np.float32) * 1.0
    # пол: мокрый, отражения ламп вертикальными мазками
    floor = y >= horizon
    base_floor = np.array([12, 8, 6], np.float32)
    refl = np.zeros((CH, CW), np.float32)
    for lx, _, _, w in lamps[:2]:
        col = np.exp(-(((x - lx) / (w * 1.3)) ** 2))
        fade = np.exp(-((y - horizon) / 330))
        refl += col * fade
    ripple = cv2.GaussianBlur(rng.normal(0, 1, (CH, CW)).astype(np.float32), (0, 0), (2, 18) and 6)
    refl *= np.clip(0.8 + 0.9 * ripple, 0.1, 2)
    refl_b = cv2.GaussianBlur(refl, (0, 0), 9)
    floor_img = base_floor + refl_b[..., None] * np.array([210, 108, 38], np.float32)
    floor_img += (glow[..., None] * np.array([34, 16, 6], np.float32)) * 0.5
    t = np.clip((y - horizon) / 14, 0, 1)[..., None]
    img = np.where(floor[..., None], img * (1 - t) + floor_img * t, img)
    # лёгкая дымка у горизонта
    haze = np.exp(-(((y - horizon) / 90) ** 2))
    img += haze[..., None] * np.array([26, 14, 6], np.float32)
    # виньетка и зерно
    vx = (x - CW / 2) / (CW / 2); vy = (y - CH / 2) / (CH / 2)
    img *= np.clip(1.08 - 0.5 * (vx ** 2 * 0.7 + vy ** 2 * 0.6), 0.35, 1)[..., None]
    img += rng.normal(0, 2.2, (CH, CW, 1)).astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8)


def main():
    src = np.array(Image.open(SRC).convert("RGBA"))
    h, w = src.shape[:2]
    rig_mask = np.zeros((h, w), np.uint8)
    cv2.fillPoly(rig_mask, [np.array(RIG_POLY, np.int32)], 255)
    arm_mask = 255 - rig_mask
    arm_mask[SEAM_Y - 3: SEAM_Y + ARM_KEEP_BELOW_SEAM, 834:] = 255  # перекрытие у шва
    arm_mask[:, :640] = 255

    def cut(mask):
        out = src.copy()
        out[..., 3] = (out[..., 3].astype(np.float32) * (cv2.GaussianBlur(mask, (0, 0), 0.7).astype(np.float32) / 255)).astype(np.uint8)
        return out

    OUT.mkdir(parents=True, exist_ok=True)
    save = lambda a, n, q: Image.fromarray(a, "RGBA").save(OUT / f"{n}.webp", "WEBP", quality=q, method=6, exact=True)
    save(place(cut(arm_mask)), "arm", 90)
    save(place(cut(rig_mask)), "rig", 90)
    Image.fromarray(make_bg(), "RGB").save(OUT / "bg.webp", "WEBP", quality=84, method=6)
    ax, ay = OX + AXIS[0] * SCALE, OY + AXIS[1] * SCALE
    version = hashlib.sha1(b"".join((OUT / f"{n}.webp").read_bytes() for n in ("bg", "arm", "rig"))).hexdigest()[:8]
    (OUT / "rig.json").write_text(json.dumps({"width": CW, "height": CH, "axis": [round(ax / CW, 4), round(ay / CH, 4)], "version": version}, indent=2))
    print("готово", CW, CH, [round(ax), round(ay)], version)


if __name__ == "__main__":
    main()
