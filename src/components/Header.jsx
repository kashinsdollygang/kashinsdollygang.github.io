import { useEffect, useRef, useState } from "react";
import { NAV } from "../data/site.js";
import { useActiveSection } from "../lib/useActiveSection.js";
import { Logo, RecIndicator } from "./Brand.jsx";
import { Close } from "./Icons.jsx";

const IDS = NAV.map((n) => n.id);

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const progressRef = useRef(null);
  const dialogRef = useRef(null);
  const burgerRef = useRef(null);
  const active = useActiveSection(IDS);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Мобильное меню — нативный <dialog>: фокус внутри, Escape закрывает.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (menuOpen && !d.open) {
      d.showModal();
      document.documentElement.classList.add("is-locked");
    }
    if (!menuOpen && d.open) d.close();
  }, [menuOpen]);

  const onDialogClose = () => {
    setMenuOpen(false);
    document.documentElement.classList.remove("is-locked");
    burgerRef.current?.focus();
  };

  const go = (e, id) => {
    // обычная якорная ссылка; закрываем меню и даём браузеру прокрутить с учётом scroll-margin
    if (menuOpen) {
      e.preventDefault();
      dialogRef.current?.close();
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        history.replaceState(null, "", `#${id}`);
      });
    }
  };

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`} data-intro="header">
      <div className="site-header__inner">
        <a className="site-header__logo" href="#home" aria-label="KASHIN’S DOLLY GANG — на главную">
          <Logo width={132} eager />
        </a>

        <nav className="site-nav" aria-label="Основная навигация">
          <ul>
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} aria-current={active === n.id ? "true" : undefined} className={active === n.id ? "is-active" : ""}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__actions">
          <RecIndicator detail="Camera in motion" className="site-header__rec" />
          <a className="btn btn--outline btn--sm site-header__cta" href="#contacts">
            Заявка на съёмку
          </a>
          <button
            ref={burgerRef}
            type="button"
            className="burger"
            aria-label="Открыть меню"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
      <div className="site-header__progress" aria-hidden="true">
        <span ref={progressRef} />
      </div>

      <dialog ref={dialogRef} className="mobile-menu" aria-label="Меню" onClose={onDialogClose}>
        <div className="mobile-menu__top">
          <Logo width={120} />
          <button type="button" className="icon-btn" aria-label="Закрыть меню" onClick={() => dialogRef.current?.close()}>
            <Close />
          </button>
        </div>
        <nav aria-label="Меню разделов">
          <ol className="mobile-menu__list">
            {NAV.map((n, i) => (
              <li key={n.id} style={{ "--i": i }}>
                <a href={`#${n.id}`} onClick={(e) => go(e, n.id)} aria-current={active === n.id ? "true" : undefined}>
                  <span className="mobile-menu__num">{String(i + 1).padStart(2, "0")}</span>
                  {n.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mobile-menu__foot">
          <RecIndicator detail="Camera in motion" />
          <a className="btn btn--rec" href="#contacts" onClick={(e) => go(e, "contacts")}>
            Заявка на съёмку
          </a>
        </div>
      </dialog>
    </header>
  );
}
