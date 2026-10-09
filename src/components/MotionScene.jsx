import { useLayoutEffect, useRef } from "react";
import { MOTION_FRAMES, MOTION_INTRO } from "../data/site.js";
import { sceneImage } from "../data/services.js";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";
import { RecIndicator } from "./Brand.jsx";
import { DollyScene } from "./DollyScene.jsx";
import { JibRig } from "./JibRig.jsx";
import { Viewfinder } from "./Viewfinder.jsx";

const FPS = 24;
const toTC = (seconds) => {
  const f = Math.floor((seconds % 1) * FPS);
  const s = Math.floor(seconds) % 60;
  const m = Math.floor(seconds / 60) % 60;
  return `01:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
};

/**
 * Сцена «Механика движения»: камера «проезжает» по трём реальным кадрам из парка.
 * Фото перемещаются и масштабируются целиком (2D-анимация слоя), сама техника не меняется.
 * Desktop + обычное движение: секция закрепляется и управляется прокруткой.
 * Мобильные / reduced motion: три статичных кадра один под другим.
 */
export function MotionScene() {
  const root = useRef(null);
  const tc = useRef(null);
  const caption = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const mm = gsap.matchMedia();
    mm.add(`(min-width: 900px) and (min-height: 560px) and (not ${REDUCED_MOTION})`, () => {
      el.classList.add("is-cinematic");
      const frames = gsap.utils.toArray(".motion__frame", el);
      const imgs = frames.map((f) => f.querySelector(".motion__media"));
      const copies = gsap.utils.toArray(".motion__copy-item", el);
      const marker = el.querySelector(".motion__marker");

      gsap.set(frames.slice(1), { autoAlpha: 0 });
      gsap.set(copies.slice(1), { autoAlpha: 0, y: 40 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${window.innerHeight * 2.6}`,
          scrub: 0.6,
          pin: ".motion__stage",
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (tc.current) tc.current.textContent = toTC(self.progress * 18);
            const i = Math.min(frames.length - 1, Math.floor(self.progress * frames.length));
            if (caption.current && caption.current.dataset.i !== String(i)) {
              caption.current.dataset.i = String(i);
              caption.current.textContent = MOTION_FRAMES[i].caption;
            }
          },
        },
      });

      // кадр 1 — движение: тележка сама едет по рельсам (DollyScene), сцена лишь чуть смещается
      tl.fromTo(imgs[0], { xPercent: 1.2, scale: 1.04 }, { xPercent: -1.2, scale: 1.01, duration: 1 }, 0);
      // переход к кадру 2
      tl.to(frames[0], { autoAlpha: 0, duration: 0.18 }, 0.86)
        .to(copies[0], { autoAlpha: 0, y: -40, duration: 0.15 }, 0.82)
        .to(frames[1], { autoAlpha: 1, duration: 0.18 }, 0.86)
        .to(copies[1], { autoAlpha: 1, y: 0, duration: 0.15 }, 0.95);
      // кадр 2 — масштаб: стрела сама ходит вверх-вниз (JibRig), камера сцены лишь чуть отъезжает
      tl.fromTo(imgs[1], { scale: 1.06 }, { scale: 1, duration: 1.1 }, 0.86);
      tl.to(frames[1], { autoAlpha: 0, duration: 0.18 }, 1.82)
        .to(copies[1], { autoAlpha: 0, y: -40, duration: 0.15 }, 1.78)
        .to(frames[2], { autoAlpha: 1, duration: 0.18 }, 1.82)
        .to(copies[2], { autoAlpha: 1, y: 0, duration: 0.15 }, 1.91);
      // кадр 3 — свобода: мягкий наезд
      tl.fromTo(imgs[2], { scale: 1.16, xPercent: -2 }, { scale: 1.04, xPercent: 2, duration: 1.1 }, 1.82);
      tl.fromTo(marker, { scaleX: 0 }, { scaleX: 1, duration: tl.duration() }, 0);

      return () => el.classList.remove("is-cinematic");
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="motion" ref={root} aria-labelledby="motion-title">
      <h2 className="sr-only" id="motion-title">
        {MOTION_INTRO}: {MOTION_FRAMES.map((f) => f.word.toLowerCase()).join(", ")}
      </h2>
      <p className="motion__intro" aria-hidden="true">
        {MOTION_INTRO}
      </p>
      <div className="motion__stage">
        <div className="motion__frames">
          {MOTION_FRAMES.map((f) => {
            const img = f.rig ? null : sceneImage(f.image);
            return (
              <figure className="motion__frame" key={f.id}>
                <div className="motion__img-wrap">
                  {f.rig === "dolly-scene" ? (
                    <DollyScene className="motion__media" alt={f.alt ?? f.caption} />
                  ) : f.rig ? (
                    <JibRig className="motion__media" alt={f.alt ?? f.caption} />
                  ) : (
                    <img className="motion__media" src={img.src} srcSet={`${img.srcSmall} 640w, ${img.src} 1074w`} sizes="(min-width: 900px) 70vw, 100vw" width={img.width} height={img.height} alt={f.caption} loading="lazy" decoding="async" />
                  )}
                </div>
                <figcaption className="motion__static-copy">
                  <span className="motion__index">{f.tool}</span>
                  <span className="motion__word">{f.word}</span>
                  <span className="motion__text">{f.text}</span>
                  <span className="motion__caption">{f.caption}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <Viewfinder
          className="motion__vf"
          topLeft={<RecIndicator />}
          topRight={<span ref={tc}>01:00:00:00</span>}
          bottomLeft={<span ref={caption}>{MOTION_FRAMES[0].caption}</span>}
          bottomRight="Camera movement"
        />

        <div className="motion__copy" aria-hidden="true">
          <span className="motion__kicker">
            <span className="rec__dot rec__dot--static" />
            {MOTION_INTRO}
          </span>
          {MOTION_FRAMES.map((f, i) => (
            <div className="motion__copy-item" key={f.id}>
              <span className="motion__index">
                {String(i + 1).padStart(2, "0")} / {String(MOTION_FRAMES.length).padStart(2, "0")} <span className="motion__tool">{f.tool}</span>
              </span>
              <span className="motion__word">{f.word}</span>
              <span className="motion__text">{f.text}</span>
            </div>
          ))}
        </div>

        <div className="motion__track" aria-hidden="true">
          {MOTION_FRAMES.map((f) => (
            <span key={f.id}>{f.tool}</span>
          ))}
          <i className="motion__marker" />
        </div>
      </div>
    </section>
  );
}
