import { useLayoutEffect, useRef } from "react";
import RIG from "../../public/images/scenes/jib-rig/rig.json";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";

/**
 * Стрела с камерой из фото: три слоя (фон с колонной, стрела, камера), подготовленные
 * scripts/build-jib-rig.py. Стрела поворачивается вокруг реальной оси на вилке колонны,
 * камера висит на конце стрелы и остаётся горизонтальной. Медленный цикл: от пола вверх и обратно.
 * Это 2D-анимация фотографии. При prefers-reduced-motion показывается исходное положение фото.
 */
const [CW, CH] = RIG.aspect;
const P = { x: RIG.pivot[0] * CW, y: RIG.pivot[1] * CH };
const M = { x: RIG.mount[0] * CW, y: RIG.mount[1] * CH };
const [DOWN, UP] = RIG.range; // градусы: отрицательный — камера у пола, положительный — вверху

function poseFor(phi) {
  const r = (phi * Math.PI) / 180;
  const vx = M.x - P.x;
  const vy = M.y - P.y;
  const mx = P.x + vx * Math.cos(r) - vy * Math.sin(r);
  const my = P.y + vx * Math.sin(r) + vy * Math.cos(r);
  return { rotation: phi, camX: ((mx - M.x) / CW) * 100, camY: ((my - M.y) / CH) * 100 };
}

const SRC = "images/scenes/jib-rig/";

export function JibRig({ alt, className = "" }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const boom = el.querySelector(".rig__boom");
    const cam = el.querySelector(".rig__cam");
    gsap.set(boom, { transformOrigin: `${RIG.pivot[0] * 100}% ${RIG.pivot[1] * 100}%` });
    const apply = (phi) => {
      const p = poseFor(phi);
      gsap.set(boom, { rotation: p.rotation });
      gsap.set(cam, { xPercent: p.camX, yPercent: p.camY });
    };

    const mm = gsap.matchMedia();
    mm.add(REDUCED_MOTION, () => apply(0));
    mm.add(`not ${REDUCED_MOTION}`, () => {
      const state = { phi: DOWN };
      apply(DOWN);
      const tween = gsap.to(state, {
        phi: UP,
        duration: 7.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        paused: true,
        onUpdate: () => apply(state.phi),
      });
      // крутим цикл только пока стрела реально видна на экране
      // (IntersectionObserver учитывает закреплённую сцену и прозрачность кадра не важна)
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tween.play() : tween.pause()), { threshold: 0.05 });
      io.observe(el);
      return () => {
        io.disconnect();
        tween.kill();
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <div className={`rig ${className}`} ref={root} role="img" aria-label={alt}>
      <div className="rig__stage" style={{ aspectRatio: `${CW} / ${CH}` }}>
        <img className="rig__layer rig__base" src={`${SRC}base.webp`} alt="" width={RIG.width} height={RIG.height} loading="lazy" decoding="async" />
        <img className="rig__layer rig__boom" src={`${SRC}boom.webp`} alt="" width={RIG.width} height={RIG.height} loading="lazy" decoding="async" />
        <img className="rig__layer rig__cam" src={`${SRC}cam.webp`} alt="" width={RIG.width} height={RIG.height} loading="lazy" decoding="async" />
      </div>
    </div>
  );
}
