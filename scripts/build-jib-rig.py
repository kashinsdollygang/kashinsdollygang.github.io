#!/usr/bin/env python3
"""
Готовит слои для анимации стрелы в сцене «Масштаб» из фото assets-src/scenes/jib-rig-source.png.

Фото не перерисовывается. Скрипт разделяет его на три слоя по реальным узлам техники:
  base — фон, колонна, вилка и тележка (неподвижны); место, где была стрела, заполнено дымом фона;
  boom-c — корневая труба стрелы с противовесом (поворачивается вокруг оси на вилке колонны);
  boom-b, boom-a — два выдвижных колена телескопа (среднее и переднее с головой); при складывании
          уезжают назад по оси стрелы, одновременно, внутрь корневой трубы;
  cam  — голова с камерой (висит на конце стрелы и остаётся горизонтальной, как при выравнивании).
На сайте слои двигает GSAP (src/components/JibRig.jsx). Это 2D-анимация фотографии, а не 3D-модель.

Запуск: python3 scripts/build-jib-rig.py  (нужны numpy, opencv-python, Pillow)
"""
import json, math
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "images" / "scenes" / "jib-rig"
src = np.array(Image.open(ROOT / "assets-src" / "scenes" / "jib-rig-source.png").convert('RGB')).astype(np.float32)
H, W = src.shape[:2]
P = (1165.0, 315.0)      # ось поворота стрелы на вилке колонны
M = (428.0, 212.0)       # точка подвеса головы с камерой

BOOM = [(340,0),(600,0),(1000,215),(1150,222),(1345,222),(1350,345),(1445,352),(1492,440),(1490,470),(1465,540),(1350,540),(1300,475),(1190,420),(1190,345),(1060,345),(1005,445),(860,445),(820,340),(795,400),(585,400),(585,212),(340,212)]
CAM  = [(160,212),(585,212),(585,425),(600,450),(595,625),(160,625)]

def poly_mask(pts, dil=0):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    a = np.array(m)
    if dil: a = cv2.dilate(a, np.ones((dil, dil), np.uint8))
    return a

boom_p = poly_mask(BOOM); cam_p = poly_mask(CAM)
union = np.maximum(boom_p, cam_p)
hole = cv2.dilate(union, np.ones((15, 15), np.uint8))

# чистая подложка: inpaint в уменьшенном размере (мягкий дым), затем обратно
s = 4
small = cv2.resize(src.astype(np.uint8), (W//s, H//s), interpolation=cv2.INTER_AREA)
hs = cv2.resize(hole, (W//s, H//s), interpolation=cv2.INTER_NEAREST)
inp = cv2.inpaint(small, hs, 9, cv2.INPAINT_TELEA)
inp = cv2.GaussianBlur(inp, (0, 0), 3)
inp = cv2.resize(inp, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
# лёгкое зерно, чтобы заливка не выглядела пластиковой
rng = np.random.default_rng(7)
grain = cv2.GaussianBlur(rng.normal(0, 3.0, (H, W)).astype(np.float32), (0, 0), 1.2)[..., None]
inp = np.clip(inp + grain, 0, 255)
hf = cv2.GaussianBlur(hole.astype(np.float32) / 255, (0, 0), 4)[..., None]
clean = src * (1 - hf) + inp * hf

# матте по разнице с подложкой внутри многоугольников
diff = np.abs(src - clean).max(axis=2)
def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
matte = smooth(diff, 12, 38)
matte = cv2.morphologyEx((matte * 255).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(np.float32) / 255
matte = cv2.GaussianBlur(matte, (0, 0), 0.8)

def layer(pmask):
    pm = cv2.GaussianBlur(pmask.astype(np.float32) / 255, (0, 0), 1.5)
    a = np.clip(matte * pm, 0, 1)
    rgba = np.dstack([src, a * 255]).astype(np.uint8)
    return rgba

boom_rgba = layer(boom_p); cam_rgba = layer(cam_p)

# Тело трубы стрелы тёмное на тёмном фоне — маска по разнице с фоном даёт там полупрозрачность.
# Для телескопа колена должны быть непрозрачными (одно уходит внутрь другого), поэтому
# внутри контура трубы (замер по фото: верхняя кромка y = 80 + 0.357·(x−560), толщина ~70 px)
# альфа = 1. Пиксели фото не меняются, меняется только маска.
def beam_top(x): return 80 + (x - 560) * 0.357
BEAM = [(470, beam_top(470) - 2), (1000, beam_top(1000) - 2), (1000, beam_top(1000) + 72), (470, beam_top(470) + 72)]
beam = cv2.GaussianBlur(poly_mask(BEAM).astype(np.float32) / 255, (0, 0), 1.0)
boom_rgba[..., 3] = np.maximum(boom_rgba[..., 3], (beam * (boom_p > 0) * 255).astype(np.uint8))

# Телескопическая стрела: корневая труба (C, у колонны) и два выдвижных колена.
# A — переднее колено с головой (до первой муфты), B — среднее колено (между муфтами).
# Разрез — прямые, перпендикулярные оси стрелы, по передним граням муфт.
U = np.array([0.941, 0.338])            # направление оси стрелы: от головы к колонне
S1 = np.array([770.0, 150.0])           # передняя грань муфты среднего колена
S2 = np.array([975.0, 228.0])           # передняя грань муфты корневой трубы
yy, xx = np.mgrid[0:H, 0:W]
t1 = (xx - S1[0]) * U[0] + (yy - S1[1]) * U[1]
t2 = (xx - S2[0]) * U[0] + (yy - S2[1]) * U[1]
# Петли кабелей под стрелой — отдельный слой (CABLES): при складывании они не режутся,
# а сжимаются и провисают глубже (см. JibRig.jsx). Петля 1: переднее колено → муфта среднего,
# петля 2: муфта среднего → муфта корневой трубы. Металлические кронштейны остаются в слоях колен.
def beam_bottom(x): return beam_top(x) + 70
below = yy > beam_bottom(xx) + 1
def rect(x0, y0, x1, y1): return (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
BRACKETS = rect(570, 150, 634, 188) | rect(745, 205, 816, 260) | rect(938, 285, 1065, 345)
L1 = below & (xx >= 585) & (xx < 806) & (yy < 425) & ~BRACKETS
L2 = below & (xx >= 806) & (xx < 1012) & (yy < 448) & ~BRACKETS
CABLE = L1 | L2
cables = boom_rgba.copy(); cables[..., 3] = (cables[..., 3] * CABLE).astype(np.uint8)

def part(mask):
    out = boom_rgba.copy(); out[..., 3] = (out[..., 3] * mask * ~CABLE).astype(np.uint8); return out
seg_a = part(t1 < 0)
seg_b = part((t1 >= 0) & (t2 < 0))
seg_c = part(t2 >= 0)
SEG_B_LEN = float(np.dot(S2 - S1, U))   # длина видимой части среднего колена
base = clean.astype(np.uint8)

# холст: обрезка по бокам и запас сверху (стрела уходит выше кадра)
X0, X1, PAD = 130, 1560, 110
def canvas_rgb(img):
    top = cv2.flip(img[:PAD], 0)
    top = cv2.GaussianBlur(top, (0, 0), 6)
    return np.vstack([top, img])[:, X0:X1]
def canvas_rgba(img):
    return np.vstack([np.zeros((PAD, W, 4), np.uint8), img])[:, X0:X1]

base_c = canvas_rgb(base); boom_c = canvas_rgba(boom_rgba); cam_c = canvas_rgba(cam_rgba)
seg_a_c = canvas_rgba(seg_a); seg_b_c = canvas_rgba(seg_b); seg_c_c = canvas_rgba(seg_c); cables_c = canvas_rgba(cables)
CW, CH = base_c.shape[1], base_c.shape[0]
Pc = (P[0] - X0, P[1] + PAD); Mc = (M[0] - X0, M[1] + PAD)

OUT.mkdir(parents=True, exist_ok=True)
TW = 1200  # ширина веб-версии; все слои масштабируются одинаково, чтобы совпадали
th = round(CH * TW / CW)
def save(arr, name, q):
    im = Image.fromarray(arr).resize((TW, th), Image.LANCZOS)
    im.save(OUT / name, "WEBP", quality=q, method=6)
save(base_c, "base.webp", 84)
save(seg_a_c, "boom-a.webp", 88)
save(seg_b_c, "boom-b.webp", 88)
save(seg_c_c, "boom-c.webp", 88)
# слой кабелей: обрезка по рамке петель + данные по столбцам для деформации в браузере
k = TW / CW
BX0, BY0, BX1, BY1 = 580, 150, 1016, 450              # рамка петель в координатах фото
cx0, cy0 = BX0 - X0, BY0 + PAD                        # то же в координатах холста
crop = cables_c[cy0:cy0 + (BY1 - BY0), cx0:cx0 + (BX1 - BX0)]
cw, ch = round((BX1 - BX0) * k), round((BY1 - BY0) * k)
Image.fromarray(crop).resize((cw, ch), Image.LANCZOS).save(OUT / "cables.webp", "WEBP", quality=90, method=6)
STRIP = 2                                             # ширина полоски в px веб-версии
LEGS = {1: (605, 782), 2: (836, 984)}                 # центры ног петель (x фото)
BOTTOM = {1: 386, 2: 432}                             # нижняя точка провиса (y фото)
def smooth(e0, e1, x):
    t = min(max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t)
cols = {"loop": [], "s": [], "y0": []}
for i in range(0, cw, STRIP):
    px = BX0 + (i + STRIP / 2) / k
    loop = 1 if px < 806 else 2
    xi = int(round(px)); colmask = CABLE[:, xi]
    top = int(np.argmax(colmask)) if colmask.any() else int(beam_bottom(px))
    l, r = LEGS[loop]
    cols["loop"].append(loop)
    cols["s"].append(round(min(max((px - (l + 14)) / ((r - 14) - (l + 14)), 0), 1), 4))  # линейно: середина сжимается равномерно
    cols["y0"].append(round((top - BY0) * k, 1))
cable_meta = {
    "box": [round(cx0 / CW, 5), round(cy0 / CH, 5), cw, ch],
    "strip": STRIP, "bottom": {str(n): round((v - BY0) * k, 1) for n, v in BOTTOM.items()},
    "cols": cols,
}
old = OUT / "boom.webp"
if old.exists():
    old.unlink()
save(cam_c, "cam.webp", 88)
meta = {
    "width": TW, "height": th,
    "pivot": [round(Pc[0] / CW, 5), round(Pc[1] / CH, 5)],
    "mount": [round(Mc[0] / CW, 5), round(Mc[1] / CH, 5)],
    "aspect": [CW, CH],
    "range": [-14, 8],
    # ось стрелы (единичный вектор, в пикселях холста) и ход колен при складывании, px холста:
    # среднее колено уходит в корневую трубу, переднее — в среднее, одновременно.
    "axis": [float(U[0]), float(U[1])],
    "cables": cable_meta,
    "retract": {"b": round(SEG_B_LEN * 0.78, 1), "a": round(SEG_B_LEN * 0.78, 1)},
}
# версия слоёв для сброса кэша браузера: меняется при любом изменении файлов
import hashlib
h = hashlib.sha256()
for n in ["base.webp", "boom-a.webp", "boom-b.webp", "boom-c.webp", "cables.webp", "cam.webp"]:
    h.update((OUT / n).read_bytes())
meta["version"] = h.hexdigest()[:10]
(OUT / "rig.json").write_text(json.dumps(meta, indent=2))
print("jib rig:", meta)
