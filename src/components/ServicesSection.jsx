import { useState } from "react";
import { SERVICES, sceneImage } from "../data/services.js";
import { useReducedMotion } from "../lib/motion.js";
import { SectionHead } from "./Brand.jsx";
import { ArrowRight, Plus } from "./Icons.jsx";
import { Viewfinder } from "./Viewfinder.jsx";

// Условные траектории движения камеры (декоративные схемы, не чертежи техники).
const PATHS = {
  track: { d: "M60 300 L540 300", label: "Траектория: проезд по рельсам", rail: true },
  arc: { d: "M110 330 A230 230 0 0 1 490 150", label: "Траектория: дуга стрелы" },
  free: { d: "M60 320 C160 220 220 360 310 250 S460 140 540 210", label: "Траектория: свободное движение" },
  orbit: { d: "M300 160 m-210 90 a210 90 0 1 0 420 0 a210 90 0 1 0 -420 0", label: "Траектория: облёт" },
  nodes: { d: "M110 300 L300 170 L490 300", label: "Схема: варианты конфигурации", nodes: [[110, 300], [300, 170], [490, 300]] },
};

function MovePath({ type, reduced }) {
  const p = PATHS[type] ?? PATHS.track;
  return (
    <svg className="move-path" viewBox="0 0 600 400" aria-hidden="true" focusable="false" key={type}>
      {p.rail ? (
        <g className="move-path__rail">
          <line x1="40" y1="318" x2="560" y2="318" />
          <line x1="40" y1="332" x2="560" y2="332" />
          {Array.from({ length: 14 }, (_, i) => (
            <line key={i} x1={50 + i * 38} y1="314" x2={50 + i * 38} y2="336" />
          ))}
        </g>
      ) : null}
      <path className="move-path__line" d={p.d} pathLength="1" />
      {p.nodes?.map(([x, y]) => <circle key={`${x}-${y}`} className="move-path__node" cx={x} cy={y} r="7" />)}
      {reduced ? null : (
        <circle className="move-path__cam" r="6">
          <animateMotion dur="5.5s" repeatCount="indefinite" path={p.d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
        </circle>
      )}
    </svg>
  );
}

export function ServicesSection() {
  const [active, setActive] = useState(SERVICES[0].id);
  const reduced = useReducedMotion();
  const current = SERVICES.find((s) => s.id === active) ?? SERVICES[0];
  const img = sceneImage(current.visual);
  const finePointer = typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <section id="services" className="section services" aria-labelledby="services-title">
      <div className="container">
        <SectionHead
          index={3}
          tag="Services"
          title="Услуги"
          id="services-title"
          aside={<p className="section-head__note">Мы не просто сдаём технику — мы отвечаем за то, как движется камера в кадре.</p>}
        />

        <div className="services__layout">
          <ol className="services__list">
            {SERVICES.map((s, i) => {
              const isOpen = s.id === active;
              return (
                <li key={s.id} className={`service ${isOpen ? "is-open" : ""}`}>
                  <h3 className="service__head">
                    <button
                      type="button"
                      className="service__btn"
                      aria-expanded={isOpen}
                      aria-controls={`service-${s.id}`}
                      onClick={() => setActive(s.id)}
                      onMouseEnter={finePointer ? () => setActive(s.id) : undefined}
                      onFocus={() => setActive(s.id)}
                    >
                      <span className="service__num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="service__title">{s.title}</span>
                      <span className="service__icon" aria-hidden="true">
                        <Plus />
                      </span>
                    </button>
                  </h3>
                  <div className="service__body" id={`service-${s.id}`} role="region" aria-label={s.title} hidden={!isOpen}>
                    <p>{s.task}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="services__monitor" aria-live="polite">
            <figure className="monitor">
              <div className="monitor__screen">
                <img key={current.visual} src={img.src} srcSet={`${img.srcSmall} 640w, ${img.src} 1074w`} sizes="(min-width: 900px) 42vw, 92vw" width={img.width} height={img.height} alt={current.visualCaption} loading="lazy" decoding="async" />
                <MovePath type={current.path} reduced={reduced} />
                <Viewfinder topLeft={String(SERVICES.indexOf(current) + 1).padStart(2, "0")} topRight={PATHS[current.path]?.label.split(": ")[1]} guides={false} />
              </div>
              <figcaption className="monitor__caption">
                <span>{current.title}</span>
                <span className="muted">{current.visualCaption}</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="services__cta">
          <p>Расскажите о сцене — предложим движение камеры и технику под него.</p>
          <a className="btn btn--rec" href="#contacts">
            Обсудить задачу <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
