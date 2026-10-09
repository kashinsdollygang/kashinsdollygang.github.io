import { useLayoutEffect, useRef } from "react";
import SCENE from "../../public/images/scenes/dolly-scene/scene.json";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";

/**
 * Кадр «Движение»: тележка GFM GF-Secondo едет по рельсам туда и обратно (присланный кадр, разобранный на слои
 * скриптом scripts/build-dolly-scene.py).
 *
 * Всё, что связано с тележкой (корпус, маленькие колёса, тени, отражение, блик на металле), выставляется в одном
 * onUpdate от одного значения x — без задержек и проскальзывания.
 *  - маленькие колёса (стоят на рельсе парой под углом, видны эллипсами) остаются исходными пикселями фото;
 *    вращение показывает блик, бегущий по видимой части обода: угол = путь / радиус, в плоскости колеса
 *    (обёртка со scaleX = a/b, маска — видимая часть обода). Большие колёса висят над рельсом и не вращаются;
 *  - контактная тень: плотная под колёсами и опорами, мягче и прозрачнее дальше от точек касания;
 *  - направленные тени от двух ламп (силуэт тележки, «положенный» на пол): плотность следует за яркостью лампы
 *    и расстоянием до неё; при разгоне/торможении — едва заметный наклон и изменение плотности;
 *  - отражение тележки в мокром полу слегка колеблется.
 * Независимо от тележки живут: блики воды на полу, мерцание ламп, дым.
 * Анимация идёт только пока кадр на экране; при prefers-reduced-motion — неподвижный кадр.
 */
const SRC = "images/scenes/dolly-scene/";
const D = SCENE.dolly;
const W = SCENE.width;
const pc = (v) => `${(v * 100).toFixed(3)}%`;
const RAD = 180 / Math.PI;
const DURATION = 9; // секунд на проезд в одну сторону
const img = { alt: "", decoding: "async", loading: "lazy", draggable: false };

export function DollyScene({ alt, className = "" }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const q = (s) => gsap.utils.toArray(s, el);
    const one = (s) => el.querySelector(s);
    const cars = q(".ds__car");
    const wheels = q(".ds__glint");
    const sheen = one(".ds__sheen-light");
    const contact = q(".ds__contact");
    const ao = one(".ds__ao");
    const cast = q(".ds__cast");
    const lamps = q(".ds__lamp");
    const travel = SCENE.travel * 100; // % ширины сцены
    const vMax = (travel * Math.PI) / DURATION; // %/с — пик скорости при sine.inOut
    const light = [1, 1]; // яркость левой и правой ламп (0.55…1)

    // поза тележки: x (% сцены), v (−1…1 нормированная скорость)
    const pose = (x, v) => {
      gsap.set(cars, { xPercent: x });
      gsap.set(sheen, { xPercent: -x });
      const px = (x / 100) * W;
      wheels.forEach((w, i) => gsap.set(w, { rotation: (px / SCENE.wheels[i].r) * RAD }));
      const speed = Math.abs(v);
      gsap.set(contact, { scaleX: 1 + 0.04 * speed, opacity: 0.95 - 0.08 * speed });
      gsap.set(ao, { scaleX: 1 + 0.02 * speed, opacity: 0.85 - 0.05 * speed });
      const near = x / travel; // −1 — у левой лампы, +1 — у правой
      cast.forEach((c, i) => {
        const side = i === 0 ? -1 : 1; // 0 — тень от левой лампы, 1 — от правой
        const closer = 1 + 0.18 * side * near; // ближе к лампе — тень плотнее
        gsap.set(c, { opacity: 0.34 * light[i] * closer, scaleY: -0.2, skewX: (i === 0 ? -34 : 34) - v * 1.5 });
      });
    };

    const mm = gsap.matchMedia();
    mm.add(REDUCED_MOTION, () => pose(0, 0));
    mm.add(`not ${REDUCED_MOTION}`, () => {
      const state = { x: -travel };
      let prevX = state.x;
      let prevT = 0;
      pose(state.x, 0);
      const tl = gsap.to(state, {
        x: travel,
        duration: DURATION,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        paused: true,
        onUpdate() {
          const t = this.totalTime();
          const dt = t - prevT;
          const v = dt > 0 ? (state.x - prevX) / dt / vMax : 0;
          prevX = state.x;
          prevT = t;
          pose(state.x, gsap.utils.clamp(-1, 1, v));
        },
      });
      const loops = [tl];
      // вода: два слоя бликов дрожат и переливаются
      q(".ds__shimmer").forEach((s, i) => {
        loops.push(gsap.fromTo(s, { opacity: i ? 0.5 : 0.12 }, { opacity: i ? 0.12 : 0.5, duration: 3.2 + i * 1.7, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }));
        loops.push(gsap.fromTo(s, { xPercent: i ? 0.3 : -0.3, yPercent: 0 }, { xPercent: i ? -0.3 : 0.3, yPercent: i ? 0.2 : -0.2, duration: 2.1 + i * 0.9, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }));
      });
      // отражение тележки слегка колеблется
      loops.push(gsap.fromTo(q(".ds__refl"), { skewX: -0.5, scaleY: 1 }, { skewX: 0.5, scaleY: 1.025, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }));
      // дым: дрейф и изменение плотности
      q(".ds__haze-strip").forEach((h, i) => loops.push(gsap.to(h, { xPercent: -50, duration: i ? 95 : 62, ease: "none", repeat: -1, paused: true })));
      q(".ds__haze").forEach((h, i) => loops.push(gsap.fromTo(h, { opacity: i ? 0.35 : 0.75 }, { opacity: i ? 0.7 : 0.4, duration: 7 + i * 4, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true })));
      // лампы: мягкое неровное мерцание, тени следуют за яркостью
      const flick = lamps.map((lamp, i) => {
        const o = { v: 1 };
        const run = () =>
          gsap.to(o, {
            v: gsap.utils.random(0.6, 1),
            duration: gsap.utils.random(0.35, 1.3),
            ease: "sine.inOut",
            onUpdate: () => {
              light[i] = o.v;
              gsap.set(lamp, { opacity: o.v });
            },
            onComplete: () => {
              flick[i] = run();
              if (!visible) flick[i].pause();
            },
          });
        return run();
      });
      let visible = false;
      flick.forEach((f) => f.pause());
      const io = new IntersectionObserver(
        ([e]) => {
          visible = e.isIntersecting;
          [...loops, ...flick].forEach((t) => (visible ? t.play() : t.pause()));
        },
        { threshold: 0.05 },
      );
      io.observe(el);
      return () => {
        io.disconnect();
        [...loops, ...flick].forEach((t) => t.kill());
        light[0] = light[1] = 1;
        pose(0, 0);
      };
    });
    return () => mm.revert();
  }, []);

  const v = `?v=${SCENE.version}`;
  const box = { left: pc(D.left), top: pc(D.top), width: pc(D.w), height: pc(D.h) };
  const half = `${SRC}dolly-half.webp${v}`;
  const dollySrc = { src: `${SRC}dolly-full.webp${v}`, srcSet: `${half} ${D.px[0] >> 1}w, ${SRC}dolly-full.webp${v} ${D.px[0]}w`, sizes: "(min-width: 900px) 42vw, 64vw" };
  const floorInBox = (SCENE.floorY - D.top) / D.h; // линия пола в долях высоты тележки
  const silhouette = { WebkitMaskImage: `url("${half}")`, maskImage: `url("${half}")` };
  const [c0, c1] = SCENE.contacts;
  const fy = SCENE.floorY;

  return (
    <div className={`ds ${className}`} ref={root} role="img" aria-label={alt}>
      <div className="ds__stage" style={{ aspectRatio: `${SCENE.width} / ${SCENE.height}` }}>
        <img className="ds__fill" src={`${SRC}plate-1672.webp${v}`} srcSet={`${SRC}plate-1000.webp${v} 1000w, ${SRC}plate-1672.webp${v} 1672w`} sizes="(min-width: 900px) 90vw, 140vw" width={SCENE.width} height={SCENE.height} {...img} />

        {/* дым за тележкой */}
        {[0, 1].map((i) => (
          <div key={i} className="ds__haze" style={{ top: pc(SCENE.haze.top + i * 0.14), height: pc(SCENE.haze.h) }}>
            <div className="ds__haze-strip">
              <img src={`${SRC}haze.webp${v}`} {...img} />
              <img src={`${SRC}haze.webp${v}`} {...img} />
            </div>
          </div>
        ))}

        {/* на полу: тени и отражение — движутся вместе с тележкой */}
        <div className="ds__car">
          {[0, 1].map((i) => (
            <span key={i} className="ds__cast" style={{ ...box, ...silhouette, transformOrigin: `50% ${(floorInBox * 100).toFixed(2)}%` }} />
          ))}
          <span className="ds__ao" style={{ left: pc(c0 - 0.05), width: pc(c1 - c0 + 0.1), top: pc(fy - 0.085), height: pc(0.13) }} />
          {[c0, c1].map((cx, i) => (
            <span key={i} className="ds__contact" style={{ left: pc(cx - 0.055), width: pc(0.11), top: pc(fy - 0.045), height: pc(0.07) }} />
          ))}
          <div className="ds__refl-wrap" style={{ ...box, transformOrigin: `50% ${(floorInBox * 100).toFixed(2)}%` }}>
            <img className="ds__refl" {...dollySrc} {...img} />
          </div>
        </div>

        {/* вода: блики поверх теней и отражений — их не перекрывает тень */}
        <img className="ds__fill ds__shimmer" src={`${SRC}shimmer.webp${v}`} {...img} />
        <img className="ds__fill ds__shimmer" src={`${SRC}shimmer.webp${v}`} {...img} />

        <div className="ds__car">
          <img className="ds__dolly" style={box} {...dollySrc} width={D.px[0]} height={D.px[1]} {...img} />
          {/* маленькие колёса — исходные пиксели фото; вращение показывает блик, бегущий по видимой части обода */}
          {SCENE.wheels.map((w, i) => {
            const m = `url("${SRC}wheel-${i}.webp${v}")`;
            return (
              <span key={i} className="ds__wheel" style={{ left: pc(w.cx - w.d / 2), top: pc(w.cy - w.dh / 2), width: pc(w.d), height: pc(w.dh), transform: `scaleX(${w.k})`, WebkitMaskImage: m, maskImage: m }}>
                <span className="ds__glint" />
              </span>
            );
          })}
          {/* блик ламп на металле: свет стоит на месте, тележка проезжает сквозь него */}
          <div className="ds__sheen" style={{ ...box, ...silhouette }}>
            <span className="ds__sheen-light" style={{ left: pc(-D.left / D.w), width: pc(1 / D.w) }} />
          </div>
        </div>

        {SCENE.lamps.map(([x, y], i) => (
          <span key={i} className="ds__lamp" style={{ left: pc(x), top: pc(y) }} />
        ))}
      </div>
    </div>
  );
}
