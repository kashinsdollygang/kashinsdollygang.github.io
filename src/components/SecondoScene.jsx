import { useLayoutEffect, useRef } from "react";
import SCENE from "../../public/images/scenes/dolly-secondo/scene.json";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";

/**
 * Кадр «Движение»: тележка GFM GF-Secondo едет по двум ровным рельсам туда и обратно.
 * Слои собирает scripts/build-secondo-scene.py: тележка — фото без изменений, рельсы, пол, стена, свет и дымка нарисованы.
 * Живое: мерцание ламп на стене, блики воды на полу, плывущая дымка (хейзер), отражение и тень тележки.
 * Колёса на фото не вращаются: маленькие видны сбоку под углом и частично закрыты, большие — для пола.
 * При prefers-reduced-motion — неподвижный кадр.
 */
const SRC = "images/scenes/dolly-secondo/";
const D = SCENE.dolly;
const WHEEL_Y = 1150 / 1156; // линия пола в долях высоты фото тележки
const pc = (v) => `${(v * 100).toFixed(3)}%`;
const imgProps = { alt: "", decoding: "async", loading: "lazy", draggable: false };

export function SecondoScene({ alt, className = "" }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const q = (s) => gsap.utils.toArray(s, el);
    const mm = gsap.matchMedia();
    mm.add(`not ${REDUCED_MOTION}`, () => {
      const cars = q(".sd__car");
      const travel = SCENE.travel * 100;
      gsap.set(cars, { xPercent: -travel });
      const tweens = [];
      tweens.push(gsap.to(cars, { xPercent: travel, duration: 11, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }));
      q(".sd__haze").forEach((h, i) => tweens.push(gsap.to(h, { xPercent: i ? 50 : -50, duration: i ? 80 : 58, ease: "none", repeat: -1, paused: true })));
      q(".sd__haze-wrap").forEach((h, i) => tweens.push(gsap.to(h, { opacity: i ? 0.6 : 0.78, duration: 8 + i * 3, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true })));
      q(".sd__glints").forEach((g, i) => {
        tweens.push(gsap.fromTo(g, { xPercent: i ? 1.6 : -1.6 }, { xPercent: i ? -1.6 : 1.6, duration: 12 + i * 4, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }));
        tweens.push(gsap.fromTo(g, { opacity: i ? 0.35 : 0.8 }, { opacity: i ? 0.85 : 0.4, duration: 5 + i * 2.3, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }));
      });
      // лампы мерцают едва заметно и неровно
      const lamps = q(".sd__lamps");
      let flickerCall;
      const flicker = () => {
        flickerCall = gsap.to(lamps, { opacity: gsap.utils.random(0.8, 1), duration: gsap.utils.random(0.25, 1.1), ease: "sine.inOut", onComplete: flicker });
      };
      flicker();
      flickerCall.pause();

      const io = new IntersectionObserver(
        ([e]) => {
          const on = e.isIntersecting;
          tweens.forEach((t) => (on ? t.play() : t.pause()));
          on ? flickerCall.play() : flickerCall.pause();
        },
        { threshold: 0.05 },
      );
      io.observe(el);
      return () => {
        io.disconnect();
        tweens.forEach((t) => t.kill());
        flickerCall.kill();
        gsap.set([...cars, ...lamps], { clearProps: "all" });
      };
    });
    return () => mm.revert();
  }, []);

  const v = `?v=${SCENE.version}`;
  const carBox = { left: pc(D.left), top: pc(D.top), width: pc(D.w), height: pc(D.h) };
  const hazeA = SCENE.hazeBandA;
  const hazeB = SCENE.hazeBandB;
  const gl = { top: pc(SCENE.glintTop), height: pc(1 - SCENE.glintTop) };

  return (
    <div className={`sd ${className}`} ref={root} role="img" aria-label={alt}>
      <div className="sd__stage" style={{ aspectRatio: `${SCENE.width} / ${SCENE.height}` }}>
        <img className="sd__fill" src={`${SRC}bg.webp${v}`} width={SCENE.width} height={SCENE.height} {...imgProps} />
        <img className="sd__fill sd__lamps" src={`${SRC}lamps.webp${v}`} width={SCENE.width} height={SCENE.height} {...imgProps} />

        <div className="sd__haze-wrap" style={{ top: pc(hazeA[0]), height: pc(hazeA[1] / SCENE.height) }}>
          <div className="sd__haze">
            <img src={`${SRC}haze-a.webp${v}`} {...imgProps} />
            <img src={`${SRC}haze-a.webp${v}`} {...imgProps} />
          </div>
        </div>

        {["a", "b"].map((k) => (
          <img key={k} className="sd__glints" style={gl} src={`${SRC}glints-${k}.webp${v}`} {...imgProps} />
        ))}

        <div className="sd__refl-clip">
          <div className="sd__car">
            <img className="sd__refl" style={{ ...carBox, transformOrigin: `50% ${pc(WHEEL_Y)}` }} src={`${SRC}dolly.webp${v}`} {...imgProps} />
          </div>
        </div>

        <div className="sd__car">
          <span className="sd__shadow" style={{ left: pc(D.left + D.w * 0.04), width: pc(D.w * 0.92), top: pc(SCENE.floorY - 0.062) }} />
          <img className="sd__dolly" style={carBox} src={`${SRC}dolly.webp${v}`} width={Math.round(SCENE.width * D.w)} height={Math.round(SCENE.height * D.h)} {...imgProps} />
        </div>

        <div className="sd__haze-wrap sd__haze-wrap--front" style={{ top: pc(hazeB[0]), height: pc(hazeB[1] / SCENE.height) }}>
          <div className="sd__haze">
            <img src={`${SRC}haze-b.webp${v}`} {...imgProps} />
            <img src={`${SRC}haze-b.webp${v}`} {...imgProps} />
          </div>
        </div>
      </div>
    </div>
  );
}
