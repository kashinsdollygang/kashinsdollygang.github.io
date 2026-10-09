#!/usr/bin/env python3
"""Сцена «Движение»: тележка GFM GF-Secondo на рельсах, мокрый пол, тёплый свет на стенах, дымка (хейзер).

Вход:  assets-src/dolly-secondo/secondo-cutout.png (присланная вырезка тележки с камерой)
Выход: public/images/scenes/dolly-secondo/
  bg.webp      — стена, мокрый пол с отражениями ламп, две ровные горизонтальные рельсы (вторая видна дальше) со шпалами;
  lamps.webp   — свет ламп на стене (мерцает слегка);
  glints.webp  — блики воды на полу (бесшовные по горизонтали, смещаются);
  haze-a/b.webp— дымка (бесшовная по горизонтали, медленно плывёт);
  dolly.webp   — тележка как на фото, ничем не дорисована;
  scene.json   — геометрия сцены для компонента.
Рельсы, пол, стена, свет и дымка нарисованы, тележка — реальное фото.
"""
import hashlib, json
from pathlib import Path
import cv2, numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src/dolly-secondo/secondo-cutout.png"
OUT = ROOT / "public/images/scenes/dolly-secondo"
CW, CH = 1600, 1504
S = 0.8                       # масштаб тележки
Y_NEAR = 1180                 # верх ближней рельсы = низ ближних колёс
RAIL_GAP = 42                 # вертикальный разнос рельс из-за перспективы (дальняя выше на экране)
Y_FAR = Y_NEAR - RAIL_GAP
HORIZON = 880                 # низ стены
WHEEL_BOTTOM = 1150           # низ ближних колёс в координатах вырезки
LAMPS = [(150, 330, 860, 22), (1500, 300, 860, 22)]  # x, верх, низ, ширина
rng = np.random.default_rng(5)
YY, XX = np.mgrid[0:CH, 0:CW].astype(np.float32)


def blur_wrap(a, sx, sy):
    """Гауссово размытие, бесшовное по горизонтали (OpenCV не умеет BORDER_WRAP, поэтому достраиваем края сами)."""
    pad = int(sx * 4) + 2
    ext = np.pad(a, ((0, 0), (pad, pad)), mode="wrap")
    out = cv2.GaussianBlur(ext, (0, 0), sigmaX=sx, sigmaY=sy, borderType=cv2.BORDER_REFLECT)
    return out[:, pad:-pad]


def noise(sx, sy, h=CH, w=CW):
    return blur_wrap(rng.normal(0, 1, (h, w)).astype(np.float32), sx, sy)


def make_bg():
    img = np.zeros((CH, CW, 3), np.float32)
    # стена
    wall = np.array([21, 14, 10], np.float32)
    img[:] = wall
    seams = (np.sin(XX / 160 * np.pi * 2 + 0.4) > 0.987).astype(np.float32)
    img *= (1 - 0.4 * seams[..., None])
    img *= np.clip(0.5 + 0.7 * (YY / HORIZON), 0.4, 1.1)[..., None]
    img += noise(3, 3)[..., None] * np.array([4.0, 2.6, 1.6], np.float32)
    # тёплое свечение стены за тележкой
    glow = np.exp(-(((XX - 800) / 760) ** 2 + ((YY - 700) / 380) ** 2))
    img += glow[..., None] * np.array([66, 32, 11], np.float32)
    # пол
    floor_mask = (YY >= HORIZON)
    fl = np.zeros_like(img)
    fl[:] = np.array([12, 8, 6], np.float32)
    # отражения ламп вертикальными мазками с рябью
    refl = np.zeros((CH, CW), np.float32)
    ripple = noise(5, 22)
    for lx, _, _, w in LAMPS:
        col = np.exp(-(((XX - lx) / (w * 1.5)) ** 2))
        fade = np.exp(-(np.maximum(YY - HORIZON, 0) / 380))
        refl += col * fade
    refl *= np.clip(0.8 + 1.1 * ripple, 0.05, 2.2)
    fl += cv2.GaussianBlur(refl, (0, 0), 7)[..., None] * np.array([220, 112, 40], np.float32)
    # широкий отсвет стены на мокром полу
    sheen = np.exp(-(((XX - 800) / 700) ** 2 + ((YY - (HORIZON + 160)) / 190) ** 2))
    fl += sheen[..., None] * np.array([46, 22, 8], np.float32)
    t = np.clip((YY - HORIZON) / 10, 0, 1)[..., None]
    img = np.where(floor_mask[..., None], img * (1 - t) + fl * t, img)
    # горизонт: мягкая линия света у основания стены
    base = np.exp(-(((YY - HORIZON) / 26) ** 2))
    img += base[..., None] * np.array([40, 20, 8], np.float32)
    # рельсы и шпалы
    sleepers = np.zeros((CH, CW), np.float32)
    for sx in range(-60, CW + 200, 190):
        cv2.rectangle(sleepers, (sx, Y_FAR + 9), (sx + 38, Y_NEAR + 12), 1.0, -1)
    sl = cv2.GaussianBlur(sleepers, (0, 0), 0.8)
    img = img * (1 - 0.82 * sl[..., None]) + sl[..., None] * np.array([6, 5, 5], np.float32) * 0.82
    topedge = np.clip(sl - np.roll(sl, 3, axis=0), 0, 1)
    img += topedge[..., None] * np.array([42, 30, 20], np.float32)

    def rail(y_top, th):
        body = np.zeros((CH, CW), np.float32)
        cv2.rectangle(body, (0, y_top), (CW, y_top + th), 1.0, -1)
        body = cv2.GaussianBlur(body, (0, 0), 0.7)
        # цилиндр: светлая полоса сверху, тёмная снизу
        k = np.clip((YY - y_top) / th, 0, 1)
        shade = 70 + 120 * np.exp(-((k - 0.22) / 0.14) ** 2) - 45 * k
        col = np.stack([shade * 1.0, shade * 0.94, shade * 0.86], -1)
        return body, col

    for y_top, th in ((Y_FAR, 15), (Y_NEAR, 22)):
        body, col = rail(y_top, th)
        img = img * (1 - body[..., None]) + col * body[..., None]
        # тёплый блик на металле рядом с лампами
        for lx, *_ in LAMPS:
            hl = np.exp(-(((XX - lx) / 260) ** 2)) * body * np.exp(-((YY - y_top - th * 0.25) / (th * 0.3)) ** 2)
            img += hl[..., None] * np.array([120, 62, 20], np.float32)
        # отражение рельсы в мокром полу
        ref = np.exp(-(((YY - (y_top + th + 6 + (YY - y_top) * 0)) / 1) ** 2)) * 0
    # отражение ближней рельсы в полу — тонкая тусклая линия
    refl_line = np.exp(-(((YY - (Y_NEAR + 22 + 12)) / 3.5) ** 2)) * 0.35
    img += refl_line[..., None] * np.array([90, 70, 52], np.float32)
    # виньетка и зерно
    vx = (XX - CW / 2) / (CW / 2); vy = (YY - CH / 2) / (CH / 2)
    img *= np.clip(1.1 - 0.5 * (vx ** 2 * 0.7 + vy ** 2 * 0.55), 0.35, 1)[..., None]
    img += rng.normal(0, 2.0, (CH, CW, 1)).astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8)


def make_lamps():
    out = np.zeros((CH, CW), np.float32)
    core = np.zeros((CH, CW), np.float32)
    for lx, y0, y1, w in LAMPS:
        m = np.zeros((CH, CW), np.float32)
        cv2.rectangle(m, (lx - w // 2, y0), (lx + w // 2, y1), 1.0, -1)
        core += m
        out += cv2.GaussianBlur(m, (0, 0), 64) * 3.0 + cv2.GaussianBlur(m, (0, 0), 20) * 1.3
    rgb = np.clip(out[..., None] * np.array([130, 66, 24], np.float32) + np.clip(core, 0, 1)[..., None] * np.array([255, 190, 125], np.float32), 0, 255)
    alpha = np.clip(out * 0.9 + core * 0.8, 0, 1)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    rgba[HORIZON:, :, 3] = 0  # на пол свет не кладём — там отражения
    return rgba


def make_glints(seed):
    r = np.random.default_rng(seed)
    h = CH - HORIZON
    a = np.zeros((h, CW), np.float32)
    for _ in range(300):
        y = int(h * (r.random() ** 0.8))
        x = int(r.random() * CW)
        L = int(40 + r.random() * 140 * (0.4 + y / h))
        th = 1 + int(r.random() * 1.6 * (0.4 + y / h))
        v = 0.25 + 0.75 * r.random()
        # более плотно вблизи отражений ламп
        near = min(abs(x - 150), abs(x - 1500))
        if near < 260 or r.random() < 0.35:
            cv2.line(a, (x, y), (x + L, y), v, th, cv2.LINE_AA)
            if x + L > CW:
                cv2.line(a, (x - CW, y), (x + L - CW, y), v, th, cv2.LINE_AA)
    a = blur_wrap(a, 5.0, 1.3)
    rgb = np.dstack([a * 255 * 1.0, a * 255 * 0.78, a * 255 * 0.5])
    return np.dstack([np.clip(rgb, 0, 255), np.clip(a * 1.5, 0, 0.8) * 255]).astype(np.uint8)


def make_haze(seed, h, scale, strength):
    global rng
    rng = np.random.default_rng(seed)
    n = np.zeros((h, CW), np.float32)
    for sx, sy, wgt in ((160 * scale, 36 * scale, 1.0), (80 * scale, 20 * scale, 0.6), (36 * scale, 9 * scale, 0.35)):
        z = blur_wrap(rng.normal(0, 1, (h, CW)).astype(np.float32), sx, sy)
        n += wgt * z / (z.std() + 1e-6)
    n = (n - n.mean()) / (n.std() + 1e-6)
    a = np.clip((n + 0.2) * 0.55, 0, 1)
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    a *= np.clip(np.sin(np.pi * ys), 0, 1) ** 1.2  # края слоя растворяются по вертикали
    a *= strength
    rgb = np.dstack([np.full((h, CW), 205, np.float32), np.full((h, CW), 168, np.float32), np.full((h, CW), 138, np.float32)])
    return np.dstack([rgb, a * 255]).astype(np.uint8)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGBA")
    nw, nh = round(src.width * S), round(src.height * S)
    src.resize((nw, nh), Image.LANCZOS).save(OUT / "dolly.webp", "WEBP", quality=90, method=6, exact=True)
    Image.fromarray(make_bg(), "RGB").save(OUT / "bg.webp", "WEBP", quality=86, method=6)
    Image.fromarray(make_lamps(), "RGBA").save(OUT / "lamps.webp", "WEBP", quality=86, method=6, exact=True)
    Image.fromarray(make_glints(3), "RGBA").save(OUT / "glints-a.webp", "WEBP", quality=84, method=6, exact=True)
    Image.fromarray(make_glints(9), "RGBA").save(OUT / "glints-b.webp", "WEBP", quality=84, method=6, exact=True)
    Image.fromarray(make_haze(21, 640, 1.0, 0.34), "RGBA").save(OUT / "haze-a.webp", "WEBP", quality=80, method=6, exact=True)
    Image.fromarray(make_haze(34, 560, 1.4, 0.22), "RGBA").save(OUT / "haze-b.webp", "WEBP", quality=80, method=6, exact=True)
    top = Y_NEAR - WHEEL_BOTTOM * S
    left = (CW - nw) / 2
    ver = hashlib.sha1(b"".join(p.read_bytes() for p in sorted(OUT.glob("*.webp")))).hexdigest()[:8]
    (OUT / "scene.json").write_text(json.dumps({
        "width": CW, "height": CH, "version": ver,
        "dolly": {"left": round(left / CW, 5), "top": round(top / CH, 5), "w": round(nw / CW, 5), "h": round(nh / CH, 5)},
        "floorY": round(Y_NEAR / CH, 5), "horizon": round(HORIZON / CH, 5),
        "travel": round(170 / CW, 5), "hazeBandA": [round(650 / CH, 4), round(640 / CH, 4)], "hazeBandB": [round(900 / CH, 4), round(560 / CH, 4)],
        "glintTop": round(HORIZON / CH, 5),
    }, indent=2))
    print("готово", ver, nw, nh, round(top))


if __name__ == "__main__":
    main()
