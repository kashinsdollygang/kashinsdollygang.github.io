/** Оригинальный логотип KASHIN'S DOLLY GANG (белый знак, прозрачный фон). Только в интерфейсе сайта. */
export function Logo({ className = "", width = 140, eager = false }) {
  return (
    <picture>
      <source srcSet="images/brand/kdg-logo-white.webp" type="image/webp" />
      <img
        className={`logo ${className}`}
        src="images/brand/kdg-logo-white.png"
        alt="KASHIN’S DOLLY GANG"
        width={width}
        height={Math.round((width * 291) / 800)}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}

/** Декоративный индикатор REC. Не означает реальную запись. */
export function RecIndicator({ label = "REC", detail, className = "" }) {
  return (
    <span className={`rec ${className}`} aria-hidden="true">
      <span className="rec__dot" />
      <span className="rec__label">{label}</span>
      {detail ? <span className="rec__detail">{detail}</span> : null}
    </span>
  );
}

/** Заголовок секции: порядковый номер сцены, метка и крупный заголовок-титр. */
export function SectionHead({ index, total = 6, tag, title, aside, id }) {
  return (
    <header className="section-head">
      <div className="section-head__meta" aria-hidden="true">
        <span className="section-head__count">
          <b>{String(index).padStart(2, "0")}</b> / {String(total).padStart(2, "0")}
        </span>
        <span className="rec__dot rec__dot--static" />
        <span className="section-head__tag">{tag}</span>
      </div>
      <div className="section-head__row">
        <h2 className="section-head__title" id={id}>
          <span className="mask-line"><span data-reveal-line>{title}</span></span>
        </h2>
        {aside ? <div className="section-head__aside">{aside}</div> : null}
      </div>
    </header>
  );
}
