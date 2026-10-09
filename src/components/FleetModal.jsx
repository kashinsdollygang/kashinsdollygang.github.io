import { useEffect, useRef } from "react";
import { categoryLabel } from "../data/fleet.js";
import { PosterImage } from "./FleetCard.jsx";
import { ArrowLeft, ArrowRight, ArrowUpRight, Close } from "./Icons.jsx";

/**
 * Большая карточка оборудования. Нативный <dialog showModal()>:
 * фокус удерживается внутри, Escape закрывает, фон блокируется.
 * Навигация: стрелки ←/→, кнопки, свайп по фото на сенсорных экранах.
 */
export function FleetModal({ items, index, onClose, onIndex, onRequest }) {
  const ref = useRef(null);
  const touch = useRef(null);
  const open = index !== null && index >= 0;
  const item = open ? items[index] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.classList.add("is-locked");
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndex((index + 1) % items.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndex((index - 1 + items.length) % items.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, items.length, onIndex]);

  // при смене позиции — прокрутка панели к началу
  useEffect(() => {
    ref.current?.querySelector(".fleet-modal__body")?.scrollTo?.(0, 0);
  }, [index]);

  const prev = () => onIndex((index - 1 + items.length) % items.length);
  const next = () => onIndex((index + 1) % items.length);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? next : prev)();
  };

  return (
    <dialog
      ref={ref}
      className="fleet-modal"
      aria-labelledby="fleet-modal-title"
      onClose={() => {
        document.documentElement.classList.remove("is-locked");
        onClose();
      }}
      onClick={(e) => {
        // клик по затемнению вокруг окна закрывает его
        if (e.target === ref.current) ref.current.close();
      }}
    >
      {item ? (
        <div className="fleet-modal__panel" key={item.id}>
          <div className="fleet-modal__media" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <PosterImage
              image={item.image}
              alt={`${item.title} — ${item.subtitle}. Постер позиции ${item.number}.`}
              sizes="(min-width: 900px) 50vw, 100vw"
              eager
              className="fleet-modal__img"
            />
          </div>

          <div className="fleet-modal__body">
            <div className="fleet-modal__bar">
              <span className="fleet-modal__count" aria-live="polite">
                <b>{item.number}</b> / {String(items.length).padStart(2, "0")}
              </span>
              <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="Закрыть карточку">
                <Close />
              </button>
            </div>

            <h3 className="fleet-modal__title" id="fleet-modal-title">
              {item.title}
            </h3>
            <p className="fleet-modal__subtitle">{item.subtitle}</p>

            <dl className="fleet-modal__facts">
              <div>
                <dt>Производитель</dt>
                <dd>{item.manufacturer ?? "Уточняется"}</dd>
              </div>
              <div>
                <dt>Категория</dt>
                <dd>{item.category.map(categoryLabel).join(" / ")}</dd>
              </div>
              <div>
                <dt>Наличие</dt>
                <dd>{item.availability ?? "Условия и наличие — по запросу"}</dd>
              </div>
            </dl>

            <p className="fleet-modal__desc">{item.description}</p>

            {item.applications?.length ? (
              <div className="fleet-modal__block">
                <h4>Где применяется</h4>
                <ul className="tag-list">
                  {item.applications.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="fleet-modal__block">
              <h4>Характеристики</h4>
              {item.specifications?.length ? (
                <dl className="spec-list">
                  {item.specifications.map((s) => (
                    <div key={s.label}>
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="muted">Опубликуем после сверки с документацией производителя. Нужные параметры подскажем по запросу.</p>
              )}
            </div>

            {item.externalLinks?.length ? (
              <ul className="fleet-modal__links">
                {item.externalLinks.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
                      {l.label} <ArrowUpRight />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="fleet-modal__actions">
              <button type="button" className="btn btn--rec" onClick={() => onRequest(item)}>
                Запросить оборудование
              </button>
              <div className="fleet-modal__nav">
                <button type="button" className="icon-btn icon-btn--ring" onClick={prev} aria-label={`Предыдущая позиция: ${items[(index - 1 + items.length) % items.length].title}`}>
                  <ArrowLeft />
                </button>
                <button type="button" className="icon-btn icon-btn--ring" onClick={next} aria-label={`Следующая позиция: ${items[(index + 1) % items.length].title}`}>
                  <ArrowRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
