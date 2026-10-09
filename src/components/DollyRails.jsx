import { useLayoutEffect, useRef } from "react";
import SCENE from "../../public/images/scenes/dolly-rails/scene.json";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";

/**
 * Кадр «Движение»: тележка GFM GF-Secondo медленно едет по рельсам туда и обратно на присланном фоне.
 * Слои собирает scripts/build-dolly-rails.py (фото тележки и фон — присланные, рельсы — с того же фото).
 * Маленькие колёса (V-пара на каждой оси, стоят на рельсе) вращаются по ходу движения: угол = путь / радиус.
 * Колесо видно эллипсом (плоскость под углом), поэтому круг вращается внутри обёртки со scaleX = a/b.
 * Большие колёса висят над рельсом и не крутятся.
 * Живое: блики на мокром полу, мерцание ламп, дымка. Только пока кадр на экране; при reduced motion — статично.
 */
const SRC = "images/scenes/dolly-rails/";
const D = SCENE.dolly;
const pc = (v) => `${(v * 100).toFixed(3)}%`;
const RAD = 180 / Math.PI;
const img = { alt: "", decoding: "async", loading: "lazy", draggable: false };

export function DollyRails({ alt, className = "" }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const q = (s) => gsap.utils.toArray(s, el);
    const mm = gsap.matchMedia();
    mm.add(`not ${REDUCED_MOTION}`, () => {
      const cars = q(".dr__car");
      const wheels = q(".dr__wheel img");
      const travel = SCENE.travel * 100; // % ширины сцены
      const state = { x: -travel };
      const apply = () => {
        gsap.set(cars, { xPercent: state.x });
        const px = (state.x / 100) * SCENE.width; // путь в px фона
        wheels.forEach((w, i) => gsap.set(w, { rotation: (px / SCENE.wheels[i].r) * RAD }));
      };
      apply();
      const tweens = [gsap.to(state, { x: travel, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true, onUpdate: apply })];
      q(".dr__shimmer").forEach((s) => {
        tweens.push(gsap.fromTo(s, { opacity: 0.1 }, { opacity: 0.55, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }));
        tweens.push(gsap.fromTo(s, { xPercent: -0.35 }, { xPercent: 0.35, duration: 2.3, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }));
      });
      q(".dr__haze-strip").forEach((h) => tweens.push(gsap.to(h, { xPercent: -50, duration: 70, ease: "none", repeat: -1, paused: true })));
      const lamps = q(".dr__lamp");
      let flick;
      const flicker = () => {
        flick = gsap.to(lamps, { opacity: () => gsap.utils.random(0.55, 1), duration: () => gsap.utils.random(0.3, 1.2), ease: "sine.inOut", onComplete: flicker });
        if (!visible) flick.pause();
      };
      let visible = false;
      flicker();
      const io = new IntersectionObserver(
        ([e]) => {
          visible = e.isIntersecting;
          tweens.forEach((t) => (visible ? t.play() : t.pause()));
          visible ? flick.play() : flick.pause();
        },
        { threshold: 0.05 },
      );
      io.observe(el);
      return () => {
        io.disconnect();
        tweens.forEach((t) => t.kill());
        flick.kill();
        gsap.set([...cars, ...wheels, ...lamps], { clearProps: "all" });
      };
    });
    return () => mm.revert();
  }, []);

  const v = `?v=${SCENE.version}`;
  const carBox = { left: pc(D.left), top: pc(D.top), width: pc(D.w), height: pc(D.h) };
  const dollySrc = { src: `${SRC}dolly-full.webp${v}`, srcSet: `${SRC}dolly-half.webp${v} ${D.px[0] >> 1}w, ${SRC}dolly-full.webp${v} ${D.px[0]}w`, sizes: "(min-width: 900px) 40vw, 60vw" };
  const flip = (SCENE.floorY - D.top) / D.h;

  return (
    <div className={`dr ${className}`} ref={root} role="img" aria-label={alt}>
      <div className="dr__stage" style={{ aspectRatio: `${SCENE.width} / ${SCENE.height}` }}>
        <img className="dr__fill" src={`${SRC}bg-1672.webp${v}`} srcSet={`${SRC}bg-1000.webp${v} 1000w, ${SRC}bg-1672.webp${v} 1672w`} sizes="(min-width: 900px) 100vw, 150vw" width={SCENE.width} height={SCENE.height} {...img} />
        <img className="dr__fill dr__shimmer" src={`${SRC}shimmer.webp${v}`} {...img} />

        {/* под рельсами: тень и отражение тележки в мокром полу */}
        <div className="dr__car">
          <span className="dr__shadow" style={{ left: pc(D.left + D.w * 0.08), width: pc(D.w * 0.84), top: pc(SCENE.floorY - 0.075) }} />
          <img className="dr__refl" style={{ ...carBox, transformOrigin: `50% ${(flip * 100).toFixed(2)}%` }} {...dollySrc} {...img} />
        </div>

        <img className="dr__fill" src={`${SRC}rails.webp${v}`} {...img} />

        <div className="dr__car">
          {SCENE.wheels.map((w, i) => (
            <span key={i} className="dr__wheel" style={{ left: pc(w.cx - w.d / 2), top: pc(w.cy - w.dh / 2), width: pc(w.d), height: pc(w.dh), transform: `scaleX(${w.k})` }}>
              <img src={`${SRC}wheel-${i}.webp${v}`} {...img} />
            </span>
          ))}
          <img className="dr__dolly" style={carBox} {...dollySrc} width={D.px[0]} height={D.px[1]} {...img} />
        </div>

        <div className="dr__haze" style={{ top: pc(SCENE.haze.top), height: pc(SCENE.haze.h) }}>
          <div className="dr__haze-strip">
            <img src={`${SRC}haze.webp${v}`} {...img} />
            <img src={`${SRC}haze.webp${v}`} {...img} />
          </div>
        </div>

        {SCENE.lamps.map(([x, y], i) => (
          <span key={i} className="dr__lamp" style={{ left: pc(x), top: pc(y) }} />
        ))}
      </div>
    </div>
  );
}
