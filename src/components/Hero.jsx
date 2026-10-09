import { useLayoutEffect, useRef } from "react";
import { HERO } from "../data/site.js";
import { gsap, REDUCED_MOTION } from "../lib/motion.js";
import { Logo, RecIndicator } from "./Brand.jsx";
import { ArrowRight } from "./Icons.jsx";
import { TechnicalOverlay } from "./TechnicalOverlay.jsx";
import { Viewfinder } from "./Viewfinder.jsx";

export function Hero() {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const mm = gsap.matchMedia();
    mm.add(
      { motion: `not ${REDUCED_MOTION}`, desktop: "(min-width: 900px)" },
      (ctx) => {
        const { motion, desktop } = ctx.conditions;
        if (!motion) {
          el.classList.add("is-ready");
          return;
        }
        // Титульная сцена: логотип → REC → заголовок → техника → подпись и кнопки → свет.
        const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: () => el.classList.add("is-ready") });
        tl.from(document.querySelector("[data-intro='header']"), { autoAlpha: 0, y: -12, duration: 0.6 }, 0)
          .from([".hero__eyebrow", ".hero__logo"], { autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.08 }, 0.15)
          .from(".hero__rec", { autoAlpha: 0, duration: 0.3 }, 0.55)
          .from(".hero__title [data-line]", { yPercent: 110, duration: 1.05, stagger: 0.11, ease: "power4.out" }, 0.7)
          .fromTo(".hero__photo", { autoAlpha: 0, scale: 1.08, filter: "brightness(0.35)" }, { autoAlpha: 1, scale: 1, filter: "brightness(1)", duration: 2.0, ease: "power2.out" }, 0.75)
          .from(".hero .vf__corner", { autoAlpha: 0, scale: 1.25, duration: 0.7, stagger: 0.05 }, 1.35)
          .from(".hero .vf__label, .hero .vf__center, .hero .vf__guides", { autoAlpha: 0, duration: 0.6 }, 1.6)
          .from([".hero__lead", ".hero__actions", ".hero__foot"], { autoAlpha: 0, y: 18, duration: 0.8, stagger: 0.1 }, 1.45)
          .from(".hero .tech", { autoAlpha: 0, duration: 2.4, ease: "power2.inOut" }, 1.0)
          .from(".hero .tech__rails line", { scaleX: 0, transformOrigin: "50% 50%", duration: 1.6, stagger: 0.04, ease: "power3.inOut" }, 1.0)
          .fromTo(".hero__sweep", { xPercent: -120, autoAlpha: 0 }, { xPercent: 120, autoAlpha: 1, duration: 2.2, ease: "power2.inOut" }, 2.0)
          .to(".hero__sweep", { autoAlpha: 0, duration: 0.4 }, 3.8);

        if (desktop) {
          // лёгкий уход кадра при прокрутке — как отъезд камеры
          gsap.to(".hero__media", {
            yPercent: 8,
            scale: 0.96,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
          });
          gsap.to(".hero__content", {
            yPercent: -10,
            autoAlpha: 0.2,
            ease: "none",
            scrollTrigger: { trigger: el, start: "35% top", end: "bottom top", scrub: true },
          });
        }
      },
      el,
    );
    return () => mm.revert();
  }, []);

  const img = HERO.image;
  return (
    <section id="home" className="hero" ref={root} aria-labelledby="hero-title">
      <TechnicalOverlay variant="hero" />

      <div className="hero__media">
        <div className="hero__frame">
          {HERO.video ? (
            <video className="hero__photo" src={HERO.video} autoPlay muted loop playsInline poster={img.src} />
          ) : (
            <picture>
              <source media="(max-width: 699px)" srcSet={img.srcSmall} />
              <img className="hero__photo" src={img.src} alt={img.alt} width={img.width} height={img.height} fetchPriority="high" decoding="async" />
            </picture>
          )}
          <span className="hero__glow" />
          <span className="hero__sweep" />
          <Viewfinder topLeft={<RecIndicator className="hero__rec" />} topRight="CAM A" bottomLeft="MovieTech Magnum Dolly" bottomRight="2.39 : 1" />
        </div>
      </div>

      <div className="hero__content container">
        <p className="hero__eyebrow">{HERO.eyebrow}</p>
        <Logo className="hero__logo" width={520} eager />
        <h1 className="hero__title" id="hero-title">
          <span className="sr-only">KASHIN’S DOLLY GANG. </span>
          <span className="mask-line"><span data-line>Мы управляем</span></span>
          <span className="mask-line"><span data-line>движением</span></span>
          <span className="mask-line"><span data-line>камеры.</span></span>
        </h1>
        <p className="hero__lead">{HERO.lead}</p>
        <div className="hero__actions">
          <a className="btn btn--rec" href="#fleet">
            Смотреть парк техники <ArrowRight />
          </a>
          <a className="btn btn--outline" href="#contacts">
            Обсудить проект
          </a>
        </div>
      </div>

      <div className="hero__foot container">
        <span className="hero__count">
          <b>01</b> / 06
        </span>
        <span className="hero__line" aria-hidden="true">
          <span />
        </span>
        <ul className="hero__tags" aria-label="Направления">
          {HERO.footerTags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
