#!/usr/bin/env python3
"""Кадр «Движение»: присланный кадр GF-Secondo на рельсах → слои для анимации.

Вход:
  assets-src/dolly-scene/scene.png            — присланный кадр (1672×941): тележка на рельсах, мокрый пол, лампы, дым;
  assets-src/dolly-scene/plate-background.png — присланный фон без тележки (другой рендер; берём только фактуру).
Выход: public/images/scenes/dolly-scene/
  plate-{1672,1000}.webp — кадр без тележки и её отражения: места, которые открываются при движении, достроены
                           (свет/цвет — из соседних участков кадра, фактура — из присланного фона, рельсы — по их профилю);
  dolly-{full,half}.webp — тележка из кадра без изменений; на месте маленьких колёс — окна;
  wheel-{0..3}.webp      — маленькие колёса в их плоскости (круг) для вращения;
  shimmer.webp           — блики мокрого пола (из самого кадра);
  haze.webp              — дым (бесшовный по горизонтали);
  scene.json             — геометрия в координатах кадра.
"""
import hashlib, json
from pathlib import Path
import cv2, numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src/dolly-scene/scene.png"
PLATE = ROOT / "assets-src/dolly-scene/plate-background.png"
OUT = ROOT / "public/images/scenes/dolly-scene"
DEBUG = Path("/tmp/claude-0/ds")

FAR_RAIL = (642, 672)
NEAR_RAIL = (698, 734)
FLOOR_Y = 734                       # низ ближнего рельса
BIG = [((590, 677), 60, 56), ((1081, 679), 60, 56)]           # большие колёса (висят, не крутятся): центр, rx, ry
SMALL = [((533, 670), 24, 34), ((651, 669), 24, 35), ((1016, 672), 24, 33), ((1136, 671), 24, 33)]  # маленькие: центр, a, b
CYLINDER = [(748, 600), (924, 600), (924, 688), (900, 694), (770, 694), (748, 688)]
SEED = [(455, 360), (640, 360), (650, 300), (655, 268), (772, 268), (782, 310), (880, 320), (930, 390), (1010, 390), (1018, 248),
        (1128, 248), (1128, 282), (1068, 300), (1218, 330), (1218, 382), (1100, 372), (1066, 372), (1066, 520), (1142, 552), (1172, 644),
        (556, 644), (558, 560), (640, 520), (690, 452), (545, 452), (455, 422)]
SURE = [[(780, 400), (920, 400), (920, 520), (780, 520)], [(480, 375), (640, 375), (640, 405), (480, 405)], [(650, 560), (1100, 560), (1100, 615), (650, 615)],
        [(1030, 300), (1050, 300), (1050, 500), (1030, 500)], [(1030, 255), (1115, 255), (1115, 268), (1030, 268)], [(1110, 336), (1188, 336), (1188, 358), (1110, 358)],
        [(662, 320), (858, 320), (858, 334), (662, 334)], [(600, 512), (1090, 512), (1090, 555), (600, 555)], [(932, 395), (972, 395), (972, 540), (932, 540)],
        [(1012, 330), (1036, 330), (1036, 386), (1012, 386)], [(1056, 300), (1105, 300), (1105, 360), (1056, 360)], [(975, 506), (1022, 506), (1022, 520), (975, 520)]]
SURE_BG = [  # фон, который GrabCut путает с тёмным металлом
    [(440, 240), (1015, 240), (1015, 262), (440, 262)], [(1130, 240), (1232, 240), (1232, 304), (1130, 304)],
    [(440, 262), (640, 262), (640, 362), (440, 362)], [(780, 262), (938, 262), (938, 312), (780, 312)],
    [(455, 424), (548, 424), (548, 478), (688, 478), (688, 500), (600, 505), (575, 520), (560, 560), (455, 560)],
    [(940, 250), (1012, 250), (1012, 392), (940, 392)], [(978, 396), (1028, 396), (1028, 522), (978, 522)],
    [(1080, 384), (1232, 384), (1232, 548), (1080, 548)],
    [(702, 614), (748, 614), (748, 645), (702, 645)], [(924, 614), (958, 614), (958, 645), (924, 645)],
    [(900, 262), (940, 262), (940, 342), (900, 342)],
    [(760, 324), (866, 324), (866, 346), (760, 332)],
]
REFL_ZONE = (476, 734, 1190, 918)   # отражение тележки в полу кадра (будет своё, движущееся)
CLAMPS = [(552, 732, 628, 772), (1042, 732, 1118, 772)]  # опоры рельса под колёсами — остаются на месте
TRAVEL = 64                          # ход в каждую сторону, px кадра


def ellipse_mask(shape, c, a, b):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return ((xx - c[0]) / a) ** 2 + ((yy - c[1]) / b) ** 2 <= 1


def main():
    A = cv2.imread(str(SRC))
    H, W = A.shape[:2]
    B = cv2.resize(cv2.imread(str(PLATE)), (W, H))

    # 1) маска тележки
    gc = np.full((H, W), cv2.GC_BGD, np.uint8)
    gc[240:648, 440:1232] = cv2.GC_PR_BGD
    seed = np.zeros((H, W), np.uint8)
    cv2.fillPoly(seed, [np.array(SEED, np.int32)], 1)
    gc[(seed > 0) & (np.arange(H)[:, None] < 648)] = cv2.GC_PR_FGD
    for p in SURE:
        cv2.fillPoly(gc, [np.array(p, np.int32)], cv2.GC_FGD)
    for p in SURE_BG:
        cv2.fillPoly(gc, [np.array(p, np.int32)], cv2.GC_BGD)
    cv2.setRNGSeed(5)
    cv2.grabCut(A, gc, None, np.zeros((1, 65)), np.zeros((1, 65)), 8, cv2.GC_INIT_WITH_MASK)
    dolly = (gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD)
    dolly[FAR_RAIL[0]:, :] = False                 # ниже верха дальнего рельса — только явные формы
    for c, rx, ry in BIG:
        dolly |= ellipse_mask((H, W), c, rx, ry)
    small_any = np.zeros((H, W), bool)
    for c, a, b in SMALL:
        small_any |= ellipse_mask((H, W), c, a, b)
    dolly |= small_any
    cyl = np.zeros((H, W), np.uint8)
    cv2.fillPoly(cyl, [np.array(CYLINDER, np.int32)], 1)
    dolly |= cyl > 0
    # держим одну связную область
    n, lab, st, _ = cv2.connectedComponentsWithStats(dolly.astype(np.uint8), connectivity=8)
    keep_ids = [i for i in range(1, n) if st[i, 4] >= 1500]
    dolly = np.isin(lab, keep_ids)
    sbg = np.zeros((H, W), np.uint8)
    for p in SURE_BG:
        cv2.fillPoly(sbg, [np.array(p, np.int32)], 1)
    dolly &= sbg == 0
    big_any = np.zeros((H, W), bool)
    for c, rx, ry in BIG:
        big_any |= ellipse_mask((H, W), c, rx, ry)
    window = small_any & ~big_any

    # 2) колёса — текстуры в плоскости колеса
    wheels = []
    for i, (c, a, b) in enumerate(SMALL):
        R = b
        size = 2 * R + 4
        k = a / b
        vv, uu = np.mgrid[0:size, 0:size].astype(np.float32)
        u = uu - size / 2 + 0.5
        v = vv - size / 2 + 0.5
        rr = np.sqrt(u ** 2 + v ** 2)
        mapx = (c[0] + u * k).astype(np.float32)
        mapy = (c[1] + v).astype(np.float32)
        tex = cv2.remap(A, mapx, mapy, cv2.INTER_LINEAR).astype(np.float32)
        vis = (cv2.remap(window.astype(np.uint8), mapx, mapy, cv2.INTER_NEAREST) > 0) & (rr <= R - 0.5)
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
        fill = prof[bins] + np.random.default_rng(10 + i).normal(0, 2.5, tex.shape)
        out = np.where(vis[..., None], tex, fill).clip(0, 255).astype(np.uint8)
        alpha = (np.clip((R - rr) * 1.2 + 0.5, 0, 1) * 255).astype(np.uint8)
        wheels.append((np.dstack([cv2.cvtColor(out, cv2.COLOR_BGR2RGB), alpha]), c, a, b))

    # 3) чистая подложка
    F = cv2.dilate(dolly.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))) > 0
    x0, y0, x1, y1 = REFL_ZONE
    zone = np.zeros((H, W), bool)
    zone[y0:y1, x0:x1] = True
    F |= zone
    for (a0, b0, a1, b1) in CLAMPS:
        F[b0:b1, a0:a1] = False
    F[FAR_RAIL[0]:NEAR_RAIL[1]] &= ~np.zeros(W, bool)  # (рельсы ниже заменяются профилем)
    # заливка: присланный фон, приведённый к свету кадра (локальное отношение яркостей вокруг области)
    Af = A.astype(np.float32)
    Bf = B.astype(np.float32)
    M = (~F).astype(np.float32)[..., None]
    sig = 38
    num_a = cv2.GaussianBlur(Af * M, (0, 0), sig)
    num_b = cv2.GaussianBlur(Bf * M, (0, 0), sig)
    gain = np.clip((num_a + 1) / (num_b + 1), 0.4, 2.5)
    fillimg = Bf * gain
    # рельсы и их отражение — построчная интерполяция между настоящими рельсами слева и справа
    for y in range(FAR_RAIL[0], NEAR_RAIL[1] + 34):
        if FAR_RAIL[0] <= y < FAR_RAIL[1] or NEAR_RAIL[0] <= y < NEAR_RAIL[1]:
            ww = 1.0
        elif y >= NEAR_RAIL[1]:
            ww = max(0.0, 1 - (y - NEAR_RAIL[1]) / 34) * 0.8
        else:
            continue
        xs_ = np.where(F[y])[0]
        if len(xs_) == 0:
            continue
        for run in np.split(xs_, np.where(np.diff(xs_) > 1)[0] + 1):
            l, r = run[0], run[-1]
            if l < 8 or r > W - 9:
                continue
            cl = Af[y, l - 7:l - 1].mean(0)
            cr = Af[y, r + 2:r + 8].mean(0)
            t = np.linspace(0, 1, len(run))[:, None]
            line = cl * (1 - t) + cr * t + np.random.default_rng(y).normal(0, 1.2, (len(run), 3))
            fillimg[y, run] = fillimg[y, run] * (1 - ww) + line * ww
    dist = ndi.distance_transform_edt(F)
    wgt = np.clip(dist / 14.0, 0, 1)[..., None] ** 1.5
    plate = np.where(F[..., None], A * (1 - wgt) + fillimg * wgt, A).clip(0, 255).astype(np.uint8)

    # 4) слой тележки
    da = (dolly.astype(np.uint8) * 255)
    da = cv2.GaussianBlur(cv2.erode(da, np.ones((2, 2), np.uint8)), (0, 0), 0.8)
    da[window] = 0
    ys, xs = np.where(da > 4)
    pad = 4
    bx0, bx1, by0, by1 = xs.min() - pad, xs.max() + pad + 1, ys.min() - pad, ys.max() + pad + 1
    rgba = np.dstack([cv2.cvtColor(A, cv2.COLOR_BGR2RGB), da])[by0:by1, bx0:bx1]

    # 5) блики пола и дым
    pl = plate.astype(np.float32)
    lum = pl.mean(2)
    hl = np.clip((lum - 80) / 130, 0, 1) ** 1.5
    hl[:545] = 0
    hl = cv2.GaussianBlur(hl, (0, 0), 1.2)
    shimmer = np.dstack([cv2.cvtColor(np.clip(pl * 1.25, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB), (hl * 255).astype(np.uint8)])

    rng = np.random.default_rng(40)
    hh, ww_ = 420, 1672

    def blur_wrap(z, sx, sy):
        p = int(sx * 4) + 2
        e = np.pad(z, ((0, 0), (p, p)), mode="wrap")
        return cv2.GaussianBlur(e, (0, 0), sigmaX=sx, sigmaY=sy, borderType=cv2.BORDER_REFLECT)[:, p:-p]
    nz = np.zeros((hh, ww_), np.float32)
    for sx, sy, wg in ((150, 60, 1.0), (70, 30, 0.6), (30, 12, 0.3)):
        z = blur_wrap(rng.normal(0, 1, (hh, ww_)).astype(np.float32), sx, sy)
        nz += wg * z / (z.std() + 1e-6)
    nz = (nz - nz.mean()) / (nz.std() + 1e-6)
    ha = np.clip((nz + 0.1) * 0.5, 0, 1) * np.clip(np.sin(np.pi * np.linspace(0, 1, hh))[:, None], 0, 1) ** 1.2 * 0.34
    haze = np.dstack([np.full((hh, ww_), 196), np.full((hh, ww_), 160), np.full((hh, ww_), 126), ha * 255]).astype(np.uint8)

    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob("*"):
        f.unlink()
    P = Image.fromarray(cv2.cvtColor(plate, cv2.COLOR_BGR2RGB))
    P.save(OUT / "plate-1672.webp", "WEBP", quality=86, method=6)
    P.resize((1000, round(H * 1000 / W)), Image.LANCZOS).save(OUT / "plate-1000.webp", "WEBP", quality=84, method=6)
    Di = Image.fromarray(rgba, "RGBA")
    Di.save(OUT / "dolly-full.webp", "WEBP", quality=90, method=6, exact=True)
    Di.resize((Di.width // 2, Di.height // 2), Image.LANCZOS).save(OUT / "dolly-half.webp", "WEBP", quality=88, method=6, exact=True)
    Image.fromarray(shimmer, "RGBA").resize((1000, round(H * 1000 / W)), Image.LANCZOS).save(OUT / "shimmer.webp", "WEBP", quality=80, method=6, exact=True)
    Image.fromarray(haze, "RGBA").resize((1000, 252), Image.LANCZOS).save(OUT / "haze.webp", "WEBP", quality=78, method=6, exact=True)
    meta = []
    for i, (tex, c, a, b) in enumerate(wheels):
        Image.fromarray(tex, "RGBA").save(OUT / f"wheel-{i}.webp", "WEBP", quality=92, method=6, exact=True)
        size = tex.shape[0]
        meta.append({"cx": round(c[0] / W, 5), "cy": round(c[1] / H, 5), "d": round(size / W, 5), "dh": round(size / H, 5), "k": round(a / b, 4), "r": float(b)})
    ver = hashlib.sha1(b"".join(p.read_bytes() for p in sorted(OUT.glob("*.webp")))).hexdigest()[:8]
    scene = {
        "width": W, "height": H, "version": ver,
        "dolly": {"left": round(bx0 / W, 5), "top": round(by0 / H, 5), "w": round((bx1 - bx0) / W, 5), "h": round((by1 - by0) / H, 5), "px": [int(bx1 - bx0), int(by1 - by0)]},
        "floorY": round(FLOOR_Y / H, 5), "travel": round(TRAVEL / W, 5), "wheels": meta,
        "contacts": [round(c[0] / W, 5) for c, *_ in BIG],
        "haze": {"top": round(120 / H, 4), "h": round(420 / H, 4)},
        "lamps": [[round(104 / W, 4), round(440 / H, 4)], [round(1566 / W, 4), round(440 / H, 4)]],
    }
    (OUT / "scene.json").write_text(json.dumps(scene, indent=2))
    DEBUG.mkdir(parents=True, exist_ok=True)
    ov = A.copy()
    ov[dolly] = (0.55 * ov[dolly] + 0.45 * np.array([0, 255, 0])).astype(np.uint8)
    cv2.imwrite(str(DEBUG / "mask-ov.png"), ov[230:780, 430:1240])
    cv2.imwrite(str(DEBUG / "plate.png"), plate)
    print("готово", ver, scene["dolly"])


if __name__ == "__main__":
    main()
