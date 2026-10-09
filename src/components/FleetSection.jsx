import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FLEET, FLEET_CATEGORIES } from "../data/fleet.js";
import { gsap, REDUCED_MOTION, ScrollTrigger } from "../lib/motion.js";
import { SectionHead } from "./Brand.jsx";
import { FleetCard } from "./FleetCard.jsx";
import { FleetModal } from "./FleetModal.jsx";

const ALL = "all";

export function FleetSection() {
  const [filter, setFilter] = useState(ALL);
  const [openIndex, setOpenIndex] = useState(null);
  const lastTrigger = useRef(null);
  const savedScroll = useRef(0);
  const goingToContacts = useRef(false);
  const grid = useRef(null);

  // Фильтры строятся из данных: показываем только категории, в которых есть позиции.
  const filters = useMemo(() => {
    const counts = Object.fromEntries(FLEET_CATEGORIES.map((c) => [c.id, 0]));
    FLEET.forEach((it) => it.category.forEach((c) => (counts[c] = (counts[c] ?? 0) + 1)));
    return [{ id: ALL, label: "Всё оборудование", count: FLEET.length }, ...FLEET_CATEGORIES.filter((c) => counts[c.id] > 0).map((c) => ({ ...c, count: counts[c.id] }))];
  }, []);

  const items = useMemo(() => (filter === ALL ? FLEET : FLEET.filter((it) => it.category.includes(filter))), [filter]);

  const open = useCallback(
    (id, trigger) => {
      lastTrigger.current = trigger;
      savedScroll.current = window.scrollY;
      goingToContacts.current = false;
      setOpenIndex(items.findIndex((it) => it.id === id));
    },
    [items],
  );

  const close = useCallback(() => {
    setOpenIndex(null);
    // вернуть фокус на карточку, с которой открывали окно
    if (goingToContacts.current) return;
    const t = lastTrigger.current;
    if (t && document.contains(t)) t.focus({ preventScroll: true });
    // браузер при закрытии <dialog> может подвинуть страницу — возвращаем позицию
    const y = savedScroll.current;
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
  }, []);

  const request = useCallback((item) => {
    goingToContacts.current = true;
    window.dispatchEvent(new CustomEvent("kdg:request", { detail: { text: `Интересует позиция ${item.number}: ${item.title} — ${item.subtitle}.` } }));
    setOpenIndex(null);
    requestAnimationFrame(() => {
      const target = document.getElementById("contacts");
      target?.scrollIntoView({ behavior: window.matchMedia(REDUCED_MOTION).matches ? "auto" : "smooth" });
      setTimeout(() => document.getElementById("lead-message")?.focus({ preventScroll: true }), 700);
    });
  }, []);

  // Появление карточек — как раскладка постеров. Один раз, без повторов при прокрутке назад.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(`not ${REDUCED_MOTION}`, () => {
      const cards = grid.current.querySelectorAll("[data-fleet-card]");
      // opacity (не visibility), чтобы карточки оставались доступными с клавиатуры до появления
      gsap.set(cards, { opacity: 0, y: 40, clipPath: "inset(12% 0% 0% 0%)" });
      ScrollTrigger.batch(cards, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 1, stagger: 0.08, ease: "power3.out", overwrite: true }),
      });
    });
    return () => mm.revert();
  }, [filter]);

  return (
    <section id="fleet" className="section fleet" aria-labelledby="fleet-title">
      <div className="container">
        <SectionHead
          index={2}
          tag="Fleet"
          title="Парк техники"
          id="fleet-title"
          aside={
            <p className="section-head__note">
              {FLEET.length} позиций. Нажмите на карточку, чтобы открыть подробности.
            </p>
          }
        />

        <div className="filters" role="group" aria-label="Фильтр по категориям">
          {filters.map((f) => (
            <button key={f.id} type="button" className={`chip ${filter === f.id ? "is-active" : ""}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <span className="chip__count">{f.count}</span>
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Показано позиций: {items.length}
        </p>

        <ul className={`fleet-grid ${filter === ALL ? "fleet-grid--all" : ""}`} ref={grid}>
          {items.map((it, i) => (
            <FleetCard key={it.id} item={it} onOpen={open} featured={filter === ALL && i === 0} />
          ))}
        </ul>
      </div>

      <FleetModal items={items} index={openIndex} onIndex={setOpenIndex} onClose={close} onRequest={request} />
    </section>
  );
}
