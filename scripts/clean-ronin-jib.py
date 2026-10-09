#!/usr/bin/env python3
"""Чистка вырезки Ronin на подвесе: убирает белую кайму и белые «дыры» (там был белый фон), чинит края.
Вход:  assets-src/ronin-jib/ronin-on-jib-cutout.png (присланная вырезка)
Выход: assets-src/ronin-jib/ronin-on-jib-clean.png
Серебристая вставка на стреле (светлый металл) сохраняется. Сама техника не перерисовывается."""
from pathlib import Path
import cv2, numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
a = np.array(Image.open(ROOT / "assets-src/ronin-jib/ronin-on-jib-cutout.png").convert("RGBA"))
rgb = a[..., :3]
al = a[..., 3].copy()
H, W = al.shape
keep = np.zeros((H, W), np.uint8)
cv2.fillPoly(keep, [np.array([(178, 262), (236, 244), (302, 338), (268, 372)], np.int32)], 255)  # серебристая вставка на стреле

white = (rgb.min(2) >= 232) & (al > 40)
n, lab, st, _ = cv2.connectedComponentsWithStats(white.astype(np.uint8), connectivity=8)
remove = np.zeros((H, W), bool)
for i in range(1, n):
    if st[i][4] >= 120:
        remove |= lab == i
near_edge = cv2.dilate((al < 40).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
remove |= (rgb.min(2) >= 190) & near_edge & (al > 0)
remove &= keep == 0
remove = cv2.dilate(remove.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
remove &= keep == 0
al[remove] = 0

# края: убираем шум, сглаживаем, затем «продавливаем» тёмный цвет внутрь, где остался светлый ореол
m = (al > 128).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
core = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
idx = ndi.distance_transform_edt(core == 0, return_distances=False, return_indices=True)
filled = rgb[idx[0], idx[1]]
new = np.where((core > 0)[..., None], rgb, filled)
alpha = cv2.GaussianBlur((m * 255).astype(np.uint8), (0, 0), 0.9)
Image.fromarray(np.dstack([new, alpha]), "RGBA").save(ROOT / "assets-src/ronin-jib/ronin-on-jib-clean.png")
print("ok", int(remove.sum()), "px убрано")
