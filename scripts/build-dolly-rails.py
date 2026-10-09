#!/usr/bin/env python3
"""Кадр «Движение»: тележка GFM GF-Secondo едет по рельсам на присланном фоне (мокрый пол, лампы, дымка).

Вход:
  assets-src/dolly-rails/background.png          — присланный фон (1672×941), используется как есть;
  assets-src/dolly-rails/dolly-on-rails-white.png — присланное фото тележки на рельсах на белом (2172×724).
Выход: public/images/scenes/dolly-rails/
  bg-{1672,1000}.webp      — фон;
  shimmer.webp             — блики на мокром полу (из самого фона) для «игры» света;
  rails.webp               — рельсы и опоры (за тележкой рельсы продолжены по строкам) + их отражение в полу;
  dolly-{full,half}.webp   — тележка как на фото; на месте четырёх маленьких колёс — окна;
  wheel-{0..3}.webp        — маленькие колёса в их собственной плоскости (круг) для вращения;
  haze.webp                — лёгкая дымка поверх (бесшовная по горизонтали);
  scene.json               — геометрия в координатах фона.
Маленькие колёса стоят парой под углом (V) к трубе рельса, поэтому видны эллипсами: вращение — поворот круга,
затем сжатие по горизонтали (scaleX = a/b). Невидимая часть колеса (за большим колесом) дополнена по радиальному
профилю видимой части — у колеса гладкий обод и диск без рисунка.
Техника не перерисовывается: только цветокоррекция под тёмную сцену.
"""
import hashlib, json
from pathlib import Path
import cv2, numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_BG = ROOT / "assets-src/dolly-rails/background.png"
SRC = ROOT / "assets-src/dolly-rails/dolly-on-rails-white.png"
OUT = ROOT / "public/images/scenes/dolly-rails"

# --- геометрия фото (px исходника) ---
FAR_RAIL = (531, 573)
NEAR_RAIL = (597, 647)
FLOOR_Y = 648                     # низ ближнего рельса — линия пола
BIG = [((785, 569), 71), ((1340, 569), 71)]
SMALL = [  # центр, a (гориз. полуось), b (верт. полуось)
    ((721, 560), 28, 41), ((853, 558), 28, 42), ((1268, 561), 28, 41), ((1406, 559), 28, 41),
]
CYLINDER = [(966, 470), (1154, 470), (1154, 572), (1140, 580), (1100, 585), (1020, 585), (980, 580), (966, 572)]
DOLLY_X = (600, 1500)
# --- размещение на фоне ---
S = 0.77                          # px фона на 1 px исходника
NEAR_RAIL_ON_BG = 800             # верх ближнего рельса на фоне
DOLLY_CENTER_ON_BG = 836
TRAVEL = 60                       # ход тележки в каждую сторону, px фона


def grade(rgb):
    """Каталожный свет → тёмная тёплая сцена: ниже экспозиция, тёплый тон, чуть больше контраста."""
    f = rgb.astype(np.float32) / 255
    f = np.clip(f, 0, 1) ** 1.18
    f *= np.array([0.80, 0.70, 0.58], np.float32)
    return np.clip(f * 255, 0, 255).astype(np.uint8)


def main():
    P = np.array(Image.open(SRC).convert("RGB"))
    H, W = P.shape[:2]
    mn = P.min(2).astype(np.int32)
    lum = P.mean(2)

    # 1) фон белый: заливка от краёв по почти белому; полосы рельсов — всегда объект
    cand = (mn >= 200).astype(np.uint8)
    cand[FAR_RAIL[0] + 2:FAR_RAIL[1] - 1, :] = 0
    cand[NEAR_RAIL[0] + 2:NEAR_RAIL[1] - 1, :] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(cand, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    # белые промежутки между рельсами и шпалами замкнуты — тоже фон (крупные куски в зоне рельсов)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if (area >= 300 and y >= 560) or (area >= 60 and y >= 482):
            border.add(i)
    bgreg = np.isin(lab, list(border))
    solid = ~bgreg
    # мягкие тени и края на белом → полупрозрачная тёмная тень
    shadow_a = np.clip((250 - lum) / 250 * 2.4, 0, 0.6) * bgreg

    # 2) маски: тележка и рельсы
    yy, xx = np.mgrid[0:H, 0:W]
    dolly = np.zeros((H, W), bool)
    upper = (yy < FAR_RAIL[0]) & (xx >= DOLLY_X[0]) & (xx <= DOLLY_X[1])
    dolly |= upper & solid
    for (cx, cy), r in BIG:
        dolly |= ((xx - cx) ** 2 + (yy - cy) ** 2) <= r * r
    small_any = np.zeros((H, W), bool)
    for (cx, cy), a, b in SMALL:
        small_any |= ((xx - cx) / a) ** 2 + ((yy - cy) / b) ** 2 <= 1
    dolly |= small_any
    cyl = np.zeros((H, W), np.uint8)
    cv2.fillPoly(cyl, [np.array(CYLINDER, np.int32)], 1)
    dolly |= cyl.astype(bool)
    dolly &= solid | (shadow_a > 0.3)
    big_any = np.zeros((H, W), bool)
    for (cx, cy), r in BIG:
        big_any |= ((xx - cx) ** 2 + (yy - cy) ** 2) <= r * r
    window = small_any & ~big_any & (yy > 523)  # видимая часть маленьких колёс — отдаём слоям колёс

    G = grade(P)

    # 3) слой тележки (исходное разрешение, обрезка по рамке)
    da = np.where(dolly, 255, 0).astype(np.uint8)
    da = cv2.GaussianBlur(cv2.erode(da, np.ones((2, 2), np.uint8)), (0, 0), 0.7)
    da[window] = 0
    ys, xs = np.where(da > 4)
    pad = 4
    bx0, bx1, by0, by1 = xs.min() - pad, xs.max() + pad + 1, ys.min() - pad, ys.max() + pad + 1
    dolly_rgba = np.dstack([G, da])[by0:by1, bx0:bx1]

    # 4) колёса: текстура в плоскости колеса (круг радиуса b)
    wheels = []
    for i, ((cx, cy), a, b) in enumerate(SMALL):
        R = b
        size = 2 * R + 4
        k = a / b
        uu, vv = np.mgrid[0:size, 0:size].astype(np.float32)
        u = vv - size / 2 + 0.5  # x в плоскости
        v = uu - size / 2 + 0.5  # y
        rr = np.sqrt(u ** 2 + v ** 2)
        px = cx + u * k
        py = cy + v
        mapx, mapy = px.astype(np.float32), py.astype(np.float32)
        tex = cv2.remap(G, mapx, mapy, cv2.INTER_LINEAR)
        vis = cv2.remap(window.astype(np.uint8) * 255, mapx, mapy, cv2.INTER_NEAREST) > 0
        vis &= rr <= R - 0.5
        # радиальный профиль видимой части → дополняем скрытое
        bins = np.clip(rr.astype(int), 0, R)
        prof = np.zeros((R + 1, 3), np.float32)
        have = np.zeros(R + 1, bool)
        for rb in range(R + 1):
            sel = vis & (bins == rb)
            if sel.sum() >= 3:
                prof[rb] = np.median(tex[sel], axis=0)
                have[rb] = True
        idx = np.where(have)[0]
        for rb in range(R + 1):
            if not have[rb]:
                prof[rb] = prof[idx[np.argmin(np.abs(idx - rb))]]
        fill = prof[bins]
        rng = np.random.default_rng(10 + i)
        fill = fill + rng.normal(0, 3.0, fill.shape)
        out = np.where(vis[..., None], tex.astype(np.float32), fill)
        # мягкий шов между видимым и дополненным
        vis_s = cv2.GaussianBlur(vis.astype(np.float32), (0, 0), 1.2)[..., None]
        out = tex * vis_s + fill * (1 - vis_s) if False else out * 1.0
        out = np.clip(out, 0, 255).astype(np.uint8)
        alpha = np.clip((R - rr) * 1.2 + 0.5, 0, 1) * 255
        wheels.append((np.dstack([out, alpha.astype(np.uint8)]), (cx, cy), a, b))

    # 5) рельсы: всё остальное; за тележкой рельсы продолжаем по строкам
    rails_solid = solid & ~dolly
    rails_rgb = G.copy()
    fillzone = dolly & ((yy >= FAR_RAIL[0]) & (yy < NEAR_RAIL[1]))
    rails_a = np.where(rails_solid, 1.0, shadow_a).astype(np.float32)
    # профиль рельсов по строкам: медиана по открытым участкам слева и справа от тележки
    clean_cols = np.r_[0:540, 1520:W]
    prof_rgb = np.median(G[:, clean_cols].astype(np.float32), axis=1)
    prof_a = np.median(rails_a[:, clean_cols], axis=1)
    from scipy import ndimage as ndi
    dist = ndi.distance_transform_edt(fillzone)
    wgt = np.clip(dist / 5.0, 0, 1)[..., None]  # мягкий шов 5 px
    rng = np.random.default_rng(7)
    fill_rgb = prof_rgb[:, None, :] + rng.normal(0, 1.5, G.shape)
    rails_rgb = np.where(fillzone[..., None], rails_rgb * (1 - wgt) + fill_rgb * wgt, rails_rgb).clip(0, 255).astype(np.uint8)
    rails_a = np.where(fillzone, rails_a * (1 - wgt[..., 0]) + prof_a[:, None] * wgt[..., 0], rails_a)
    # густая тень тележки на белом под ближним рельсом — не «твёрдая»: лёгкая тень (тележка едет, её тень — в CSS)
    under_rail = (yy >= NEAR_RAIL[1] - 1) & rails_solid & (mn >= 140)
    rails_a = np.where(under_rail, np.clip((250 - lum) / 250 * 1.2, 0, 0.3), rails_a)
    rails_solid = rails_solid & ~under_rail
    # тени на белом — тёмные
    sh = ~rails_solid & ~fillzone
    rails_rgb[sh] = (14, 11, 9)

    # --- перенос на фон ---
    BG = np.array(Image.open(SRC_BG).convert("RGB"))
    BH, BW = BG.shape[:2]
    oy = NEAR_RAIL_ON_BG - NEAR_RAIL[0] * S
    dolly_cx_src = (DOLLY_X[0] + DOLLY_X[1]) / 2
    ox = DOLLY_CENTER_ON_BG - dolly_cx_src * S
    # рельсы: исходник расширяем влево/вправо, чтобы перекрыть ширину фона
    rails_rgba = np.dstack([rails_rgb, (np.clip(rails_a, 0, 1) * 255).astype(np.uint8)])
    padL = int(np.ceil(max(ox, 0) / S)) + 4
    padR = int(np.ceil(max(BW - (ox + W * S), 0) / S)) + 4
    srcL = rails_rgba[:, 360:360 + padL]
    srcR = rails_rgba[:, W - 40 - padR:W - 40] if padR > 4 else rails_rgba[:, W - 8:W - 4]
    wide = np.concatenate([srcL, rails_rgba, srcR], axis=1)
    ox_w = ox - padL * S
    M = np.float32([[S, 0, ox_w], [0, S, oy]])
    rails_bg = cv2.warpAffine(wide, M, (BW, BH), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    # отражение рельсов в мокром полу
    floor_bg = int(round(oy + FLOOR_Y * S))
    band_top = int(round(oy + FAR_RAIL[0] * S)) - 2
    refl = rails_bg[band_top:floor_bg].copy()[::-1]
    refl = cv2.GaussianBlur(refl, (0, 0), 1.6)
    hgt = min(refl.shape[0], BH - floor_bg)
    fade = np.linspace(0.32, 0.0, hgt)[:, None]
    under = np.zeros_like(rails_bg)
    under[floor_bg:floor_bg + hgt] = refl[:hgt]
    under[floor_bg:floor_bg + hgt, :, 3] = (under[floor_bg:floor_bg + hgt, :, 3] * fade).astype(np.uint8)
    # склеиваем: отражение под рельсами
    ra = rails_bg[..., 3:4].astype(np.float32) / 255
    ua = under[..., 3:4].astype(np.float32) / 255
    out_a = ra + ua * (1 - ra)
    out_rgb = (rails_bg[..., :3] * ra + under[..., :3] * ua * (1 - ra)) / np.maximum(out_a, 1e-6)
    rails_final = np.dstack([np.clip(out_rgb, 0, 255), out_a * 255]).astype(np.uint8)

    # блики на мокром полу (из самого фона)
    bl = BG.astype(np.float32).mean(2)
    hl = np.clip((bl - 70) / 140, 0, 1) ** 1.6
    hl[:540] = 0
    hl = cv2.GaussianBlur(hl, (0, 0), 1.2)
    shimmer = np.dstack([np.clip(BG.astype(np.float32) * 1.25, 0, 255), hl * 255]).astype(np.uint8)

    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob("*"):
        f.unlink()
    Image.fromarray(BG).save(OUT / "bg-1672.webp", "WEBP", quality=86, method=6)
    Image.fromarray(BG).resize((1000, round(BH * 1000 / BW)), Image.LANCZOS).save(OUT / "bg-1000.webp", "WEBP", quality=84, method=6)
    Image.fromarray(shimmer, "RGBA").resize((1000, round(BH * 1000 / BW)), Image.LANCZOS).save(OUT / "shimmer.webp", "WEBP", quality=80, method=6, exact=True)
    Image.fromarray(rails_final, "RGBA").save(OUT / "rails.webp", "WEBP", quality=88, method=6, exact=True)
    dimg = Image.fromarray(dolly_rgba, "RGBA")
    dimg.save(OUT / "dolly-full.webp", "WEBP", quality=90, method=6, exact=True)
    dimg.resize((dimg.width // 2, dimg.height // 2), Image.LANCZOS).save(OUT / "dolly-half.webp", "WEBP", quality=88, method=6, exact=True)
    wheel_meta = []
    for i, (tex, (cx, cy), a, b) in enumerate(wheels):
        Image.fromarray(tex, "RGBA").save(OUT / f"wheel-{i}.webp", "WEBP", quality=92, method=6, exact=True)
        size = tex.shape[0]
        wheel_meta.append({
            "cx": round((ox + cx * S) / BW, 5), "cy": round((oy + cy * S) / BH, 5),
            "d": round(size * S / BW, 5), "dh": round(size * S / BH, 5), "k": round(a / b, 4), "r": round(b * S, 2),
        })
    # дымка
    rng = np.random.default_rng(40)
    hh, ww = 420, 1672

    def blur_wrap(z, sx, sy):
        p = int(sx * 4) + 2
        e = np.pad(z, ((0, 0), (p, p)), mode="wrap")
        return cv2.GaussianBlur(e, (0, 0), sigmaX=sx, sigmaY=sy, borderType=cv2.BORDER_REFLECT)[:, p:-p]
    nz = np.zeros((hh, ww), np.float32)
    for sx, sy, wg in ((170, 36, 1.0), (80, 18, 0.6), (36, 9, 0.3)):
        z = blur_wrap(rng.normal(0, 1, (hh, ww)).astype(np.float32), sx, sy)
        nz += wg * z / (z.std() + 1e-6)
    nz = (nz - nz.mean()) / (nz.std() + 1e-6)
    ha = np.clip((nz + 0.2) * 0.5, 0, 1) * np.clip(np.sin(np.pi * np.linspace(0, 1, hh))[:, None], 0, 1) ** 1.3 * 0.30
    haze = np.dstack([np.full((hh, ww), 200), np.full((hh, ww), 170), np.full((hh, ww), 140), ha * 255]).astype(np.uint8)
    Image.fromarray(haze, "RGBA").resize((1000, 252), Image.LANCZOS).save(OUT / "haze.webp", "WEBP", quality=78, method=6, exact=True)

    ver = hashlib.sha1(b"".join(p.read_bytes() for p in sorted(OUT.glob("*.webp")))).hexdigest()[:8]
    scene = {
        "width": BW, "height": BH, "version": ver,
        "dolly": {"left": round((ox + bx0 * S) / BW, 5), "top": round((oy + by0 * S) / BH, 5),
                  "w": round((bx1 - bx0) * S / BW, 5), "h": round((by1 - by0) * S / BH, 5),
                  "px": [int(bx1 - bx0), int(by1 - by0)]},
        "floorY": round(floor_bg / BH, 5),
        "travel": round(TRAVEL / BW, 5),
        "wheels": wheel_meta,
        "haze": {"top": round(470 / BH, 4), "h": round(420 / BH, 4)},
        "lamps": [[round(104 / BW, 4), round(445 / BH, 4)], [round(1565 / BW, 4), round(445 / BH, 4)]],
    }
    (OUT / "scene.json").write_text(json.dumps(scene, indent=2))
    print("готово", ver, "тележка", scene["dolly"], "пол", floor_bg)


if __name__ == "__main__":
    main()
