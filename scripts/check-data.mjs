// Проверка данных каталога: 13 позиций, порядок номеров, файлы изображений на месте,
// у каждой позиции своё фото. Запуск: npm run check
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FLEET } from "../src/data/fleet.js";
import { SERVICES, sceneImage } from "../src/data/services.js";
import { MOTION_FRAMES, HERO } from "../src/data/site.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (p) => path.join(root, "public", p);
const problems = [];

if (FLEET.length !== 13) problems.push(`Ожидалось 13 позиций, найдено ${FLEET.length}`);
FLEET.forEach((it, i) => {
  const n = String(i + 1).padStart(2, "0");
  if (it.number !== n) problems.push(`Позиция ${i + 1}: номер ${it.number}, ожидался ${n}`);
  if (!it.image.src.includes(`/${n}-`)) problems.push(`${n} ${it.title}: изображение не соответствует номеру (${it.image.src})`);
  for (const f of [it.image.src, it.image.srcSmall]) if (!existsSync(pub(f))) problems.push(`${n}: нет файла ${f}`);
  for (const s of it.specifications) if (!s.label || !s.value) problems.push(`${n}: пустая характеристика`);
});
const ids = new Set(FLEET.map((i) => i.id));
if (ids.size !== FLEET.length) problems.push("Повторяющиеся id в каталоге");

for (const f of MOTION_FRAMES.filter((x) => x.rig)) {
  for (const n of ["base.webp", "boom.webp", "cam.webp", "rig.json"]) {
    const file = `images/scenes/${f.rig}/${n}`;
    if (!existsSync(pub(file))) problems.push(`Нет слоя анимации ${file}`);
  }
}
for (const k of new Set([...SERVICES.map((s) => s.visual), ...MOTION_FRAMES.filter((f) => f.image).map((f) => f.image)])) {
  const img = sceneImage(k);
  for (const f of [img.src, img.srcSmall]) if (!existsSync(pub(f))) problems.push(`Нет кадра ${f}`);
}
for (const f of [HERO.image.src, HERO.image.srcSmall, "images/brand/kdg-logo-white.png", "images/brand/kdg-logo-white.webp"])
  if (!existsSync(pub(f))) problems.push(`Нет файла ${f}`);

if (problems.length) {
  console.error("Проблемы в данных:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`Данные в порядке: ${FLEET.length} позиций, изображения на месте.`);
