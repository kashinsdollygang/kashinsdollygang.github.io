import { useLayoutEffect, useRef } from "react";
import RIG from "../../public/images/scenes/jib-rig/rig.json";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";

/**
 * Телескопический кран из фото. Слои подготовлены scripts/build-jib-rig.py:
 *   base — фон, колонна и тележка (неподвижны);
 *   boom-c — корневая труба с противовесом; boom-b, boom-a — два выдвижных колена;
 *   cam — голова с камерой на конце переднего колена.
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
const RETRACT = 0.75; // доля полного хода колен в цикле

const SRC = "images/scenes/jib-rig/";
const pct = (dx, dy) => ({ xPercent: (dx / CW) * 100, yPercent: (dy / CH) * 100 });

export function JibRig({ alt, className = "" }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const arm = el.querySelector(".rig__arm");
    const segA = el.querySelector(".rig__seg-a");
    const segB = el.querySelector(".rig__seg-b");
    const cam = el.querySelector(".rig__cam");
    gsap.set(arm, { transformOrigin: `${RIG.pivot[0] * 100}% ${RIG.pivot[1] * 100}%` });

    // phi — угол стрелы, ext — складывание 0 (выдвинута) … 1 (полностью сложена)
    const apply = ({ phi, ext }) => {
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
    <img className={`rig__layer ${cls}`} src={`${SRC}${name}.webp`} alt="" width={RIG.width} height={RIG.height} loading="lazy" decoding="async" />
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
        </div>
        {layer("cam", "rig__cam")}
      </div>
    </div>
  );
}
