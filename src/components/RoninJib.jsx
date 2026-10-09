import { useLayoutEffect, useRef } from "react";
import RIG from "../../public/images/scenes/ronin-jib/rig.json";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";

/**
 * DJI Ronin 2 на подвесе телескопического крана. Слои собирает scripts/build-ronin-jib.py:
 *   bg  — нарисованный фон в духе постеров сайта;
 *   arm — стрела крана с адаптером (неподвижна);
 *   rig — подвес: корпус Ronin 2 с камерой, вращается вокруг вертикальной оси адаптера.
 * Цикл: подвес поворачивается камерой на зрителя → наклон вниз → обратно → отворачивается.
 * Это 2D-анимация фотографии с лёгкой перспективой, а не 3D-модель, поэтому углы небольшие.
 * При prefers-reduced-motion — неподвижный кадр.
 */
const SRC = "images/scenes/ronin-jib/";
const YAW = -34; // градусов: минус — правая часть (объектив) идёт к зрителю
const PITCH = 9; // наклон вниз

export function RoninJib({ alt, className = "" }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const rig = el.querySelector(".rj__rig");
    gsap.set(rig, { transformOrigin: `${RIG.axis[0] * 100}% ${RIG.axis[1] * 100}%`, transformPerspective: 1500 });
    const mm = gsap.matchMedia();
    mm.add(`not ${REDUCED_MOTION}`, () => {
      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "sine.inOut" } });
      tl.to(rig, { rotationY: YAW, duration: 4.2 }) // поворот камерой на нас
        .to(rig, { rotationX: PITCH, duration: 2.4 }, "+=0.5") // наклон вниз
        .to(rig, { rotationX: 0, duration: 2.4 }, "+=0.9") // обратно
        .to(rig, { rotationY: 0, duration: 4.2 }, "+=0.5") // отворачивается
        .to({}, { duration: 1.6 }); // пауза
      // лёгкое раскачивание подвеса на кране — не прекращается
      const sway = gsap.to(rig, { rotationZ: 0.7, duration: 3.1, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true });
      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            tl.play();
            sway.play();
          } else {
            tl.pause();
            sway.pause();
          }
        },
        { threshold: 0.05 },
      );
      io.observe(el);
      return () => {
        io.disconnect();
        tl.kill();
        sway.kill();
        gsap.set(rig, { rotationX: 0, rotationY: 0, rotationZ: 0 });
      };
    });
    return () => mm.revert();
  }, []);

  const layer = (name, cls) => (
    <img className={`rj__layer ${cls}`} src={`${SRC}${name}.webp?v=${RIG.version}`} alt="" width={RIG.width} height={RIG.height} loading="lazy" decoding="async" />
  );

  return (
    <div className={`rj ${className}`} ref={root} role="img" aria-label={alt}>
      <div className="rj__stage" style={{ aspectRatio: `${RIG.width} / ${RIG.height}` }}>
        {layer("bg", "rj__bg")}
        {layer("arm", "rj__arm")}
        {layer("rig", "rj__rig")}
      </div>
    </div>
  );
}
