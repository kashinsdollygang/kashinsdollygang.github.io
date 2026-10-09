import { useLayoutEffect, useRef } from "react";
import RIG from "../../public/images/scenes/jib-rig/rig.json";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";

/**
 * Телескопический кран из фото. Слои подготовлены scripts/build-jib-rig.py:
 *   base — фон, колонна и тележка (неподвижны);
 *   boom-c — корневая труба с противовесом; boom-b, boom-a — два выдвижных колена;
 *   cam — голова с камерой на конце переднего колена;
 *   cables — две петли кабелей под стрелой (деформируются при складывании, см. drawCables).
 * Вся стрела поворачивается вокруг оси на вилке колонны. Оба колена при складывании
 * одновременно уходят назад по оси стрелы: среднее — в корневую трубу, переднее — в среднее.
 * Камера висит на конце стрелы и остаётся горизонтальной.
 *
 * Цикл (медленно, по кругу): стрела поднимается → колена складываются → выдвигаются → стрела опускается.
 * Это 2D-анимация фотографии, а не 3D-модель. При prefers-reduced-motion — исходное фото без движения.
 */
const [CW, CH] = RIG.aspect;
const P = { x: RIG.pivot[0] * CW, y: RIG.pivot[1] * CH };
const M = { x: RIG.mount[0] * CW, y: RIG.mount[1] * CH };
const U = { x: RIG.axis[0], y: RIG.axis[1] };
const [DOWN, UP] = RIG.range; // градусы: отрицательный — камера у пола, положительный — вверху
const RETRACT = 0.6; // доля полного хода колен в цикле (дальше петли кабелей становятся слишком узкими)

const SRC = "images/scenes/jib-rig/";
const CAB = RIG.cables;
const K = RIG.width / CW; // px веб-слоёв на 1 px холста
const CAB_MARGIN = { x: 140, y: 170 }; // запас холста кабелей под сдвиг и провис, px веб-слоя

/**
 * Петли кабелей под стрелой. Рисуются на canvas вертикальными полосками по 2 px:
 * концы петли закреплены на своих коленах (сдвигаются вместе с ними), середина
 * равномерно сжимается по горизонтали, а провис растягивается вниз на половину
 * сближения концов (длина кабеля сохраняется). Полоски всегда смыкаются — разрывов нет.
 */
function drawCables(ctx, img, dA, dB) {
  const { cols, strip: st } = CAB;
  const [, , , ch] = CAB.box;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const n = cols.s.length;
  for (let j = 0; j < n; j++) {
    const loop = cols.loop[j];
    const s = cols.s[j];
    const y0 = cols.y0[j];
    const [dL, dR] = loop === 1 ? [dA, dB] : [dB, 0];
    const d = dL + (dR - dL) * s;
    const sNext = j + 1 < n && cols.loop[j + 1] === loop ? cols.s[j + 1] : s;
    const w = Math.max(0.6, st + (dR - dL) * (sNext - s)) + 0.6; // +0.6 — перекрытие без щелей
    const sag = 0.5 * (dL - dR);
    const sy = 1 + sag / Math.max(CAB.bottom[loop] - y0, 20);
    const y0i = Math.floor(y0);
    const h = ch - y0i;
    if (h <= 0) continue;
    ctx.drawImage(img, j * st, y0i, st, h, j * st + d * U.x, y0i + d * U.y, w, h * sy);
  }
}
const pct = (dx, dy) => ({ xPercent: (dx / CW) * 100, yPercent: (dy / CH) * 100 });

export function JibRig({ alt, className = "" }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const arm = el.querySelector(".rig__arm");
    const segA = el.querySelector(".rig__seg-a");
    const segB = el.querySelector(".rig__seg-b");
    const cam = el.querySelector(".rig__cam");
    const canvas = el.querySelector(".rig__cables");
    const ctx = canvas.getContext("2d");
    const cableImg = new Image();
    cableImg.decoding = "async";
    cableImg.src = `${SRC}cables.webp?v=${RIG.version}`;
    let lastExt = -1;
    let lastPose = { phi: 0, ext: 0 };
    const redrawCables = (ext, force) => {
      if (!cableImg.complete || !cableImg.naturalWidth) return;
      if (!force && Math.abs(ext - lastExt) < 1e-4) return;
      lastExt = ext;
      const dB = ext * RIG.retract.b * K;
      drawCables(ctx, cableImg, dB + ext * RIG.retract.a * K, dB);
    };
    cableImg.onload = () => redrawCables(lastPose.ext, true);
    gsap.set(arm, { transformOrigin: `${RIG.pivot[0] * 100}% ${RIG.pivot[1] * 100}%` });

    // phi — угол стрелы, ext — складывание 0 (выдвинута) … 1 (полностью сложена)
    const apply = ({ phi, ext }) => {
      lastPose = { phi, ext };
      redrawCables(ext);
      const dB = ext * RIG.retract.b;
      const dA = dB + ext * RIG.retract.a;
      gsap.set(arm, { rotation: phi });
      gsap.set(segB, pct(dB * U.x, dB * U.y));
      gsap.set(segA, pct(dA * U.x, dA * U.y));
      // точка подвеса камеры: сдвиг вместе с передним коленом + поворот вокруг оси колонны
      const r = (phi * Math.PI) / 180;
      const vx = M.x + dA * U.x - P.x;
      const vy = M.y + dA * U.y - P.y;
      const mx = P.x + vx * Math.cos(r) - vy * Math.sin(r);
      const my = P.y + vx * Math.sin(r) + vy * Math.cos(r);
      gsap.set(cam, pct(mx - M.x, my - M.y));
    };

    const mm = gsap.matchMedia();
    mm.add(REDUCED_MOTION, () => apply({ phi: 0, ext: 0 }));
    mm.add(`not ${REDUCED_MOTION}`, () => {
      const state = { phi: DOWN, ext: 0 };
      apply(state);
      const update = () => apply(state);
      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "sine.inOut", onUpdate: update } });
      tl.to(state, { phi: UP, duration: 6 }) // подъём стрелы
        .to(state, { ext: RETRACT, duration: 4.5 }, "+=0.8") // оба колена уходят внутрь
        .to(state, { ext: 0, duration: 4.5 }, "+=1.2") // выдвигаются обратно
        .to(state, { phi: DOWN, duration: 6 }, "+=0.8") // опускание к полу
        .to({}, { duration: 1.2 }); // пауза внизу

      // цикл идёт только пока стрела видна на экране
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.05 });
      io.observe(el);
      return () => {
        io.disconnect();
        tl.kill();
      };
    });
    return () => mm.revert();
  }, []);

  const layer = (name, cls) => (
    <img className={`rig__layer ${cls}`} src={`${SRC}${name}.webp?v=${RIG.version}`} alt="" width={RIG.width} height={RIG.height} loading="lazy" decoding="async" />
  );

  return (
    <div className={`rig ${className}`} ref={root} role="img" aria-label={alt}>
      <div className="rig__stage" style={{ aspectRatio: `${CW} / ${CH}` }}>
        {layer("base", "rig__base")}
        {/* порядок важен: переднее колено под средним, среднее под корневой трубой */}
        <div className="rig__arm">
          {layer("boom-a", "rig__seg-a")}
          {layer("boom-b", "rig__seg-b")}
          {layer("boom-c", "rig__seg-c")}
          <canvas
            className="rig__cables"
            width={CAB.box[2] + CAB_MARGIN.x}
            height={CAB.box[3] + CAB_MARGIN.y}
            style={{
              left: `${CAB.box[0] * 100}%`,
              top: `${CAB.box[1] * 100}%`,
              width: `${((CAB.box[2] + CAB_MARGIN.x) / RIG.width) * 100}%`,
              height: `${((CAB.box[3] + CAB_MARGIN.y) / RIG.height) * 100}%`,
            }}
            aria-hidden="true"
          />
        </div>
        {layer("cam", "rig__cam")}
      </div>
    </div>
  );
}
