import { useLayoutEffect, useRef } from "react";
import RIG from "../../public/images/scenes/ronin-rig/rig.json";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";

/**
 * DJI Ronin 2 из фото: слои подготовлены scripts/build-ronin-rig.py.
 *   base  — сцена без кольца (камера, подставка, фон на месте и неподвижны);
 *   ring  — внешнее кольцо с зажимами: слегка качается вокруг низа подставки;
 *   front — детали камеры, за которыми кольцо проходит (рукоять, голова, блэнда, кабели).
 * Камера всё время остаётся ровной — это и есть работа стабилизатора: кольцо ходит, картинка стоит.
 * Это 2D-анимация фотографии, не 3D-модель. При prefers-reduced-motion — исходное фото без движения.
 */
const SRC = "images/scenes/ronin-rig/";
const SWAY = 1.9; // градусов — амплитуда качания кольца

export function RoninRig({ alt, className = "", still }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const ring = el.querySelector(".ronin__ring");
    gsap.set(ring, { transformOrigin: `${RIG.pivot[0] * 100}% ${RIG.pivot[1] * 100}%` });
    const mm = gsap.matchMedia();
    mm.add(REDUCED_MOTION, () => {
      el.classList.add("is-still");
    });
    mm.add(`not ${REDUCED_MOTION}`, () => {
      // неровный «балансирующий» ход: разные размахи и длительности, цикл замкнут в 0
      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "sine.inOut" } });
      [
        [0.9, 2.6],
        [-0.7, 3.2],
        [1, 2.8],
        [-1, 3.4],
        [0.45, 2.4],
        [0, 2.6],
      ].forEach(([k, d]) => tl.to(ring, { rotation: k * SWAY, duration: d }));
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.05 });
      io.observe(el);
      return () => {
        io.disconnect();
        tl.kill();
        gsap.set(ring, { rotation: 0 });
      };
    });
    return () => mm.revert();
  }, []);

  const layer = (name, cls) => (
    <img className={`ronin__layer ${cls}`} src={`${SRC}${name}.webp?v=${RIG.version}`} alt="" width={RIG.width} height={RIG.height} loading="lazy" decoding="async" />
  );

  return (
    <div className={`ronin ${className}`} ref={root} role="img" aria-label={alt}>
      <div className="ronin__stage" style={{ aspectRatio: `${RIG.width} / ${RIG.height}` }}>
        {layer("base", "ronin__base")}
        {layer("ring", "ronin__ring")}
        {layer("front", "ronin__front")}
      </div>
    </div>
  );
}
