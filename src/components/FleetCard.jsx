import { useState } from "react";
import { categoryLabel } from "../data/fleet.js";
import { ArrowUpRight } from "./Icons.jsx";

export function PosterImage({ image, alt, sizes, eager = false, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`img-missing ${className}`} role="img" aria-label={alt}>
        <span>Фотография ещё не добавлена</span>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={image.src}
      srcSet={`${image.srcSmall} 640w, ${image.src} 1120w`}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function FleetCard({ item, onOpen, featured = false }) {
  return (
    <li className={`fleet-card ${featured ? "fleet-card--featured" : ""}`} data-fleet-card>
      <button type="button" className="fleet-card__btn" onClick={(e) => onOpen(item.id, e.currentTarget)} aria-haspopup="dialog">
        <span className="fleet-card__poster">
          <PosterImage
            image={item.image}
            alt=""
            sizes={featured ? "(min-width: 1100px) 46vw, (min-width: 700px) 60vw, 92vw" : "(min-width: 1100px) 23vw, (min-width: 700px) 31vw, 46vw"}
          />
        </span>
        <span className="fleet-card__meta">
          <span className="fleet-card__num">{item.number}</span>
          <span className="fleet-card__name">
            <span className="fleet-card__title">{item.title}</span>
            <span className="fleet-card__sub">{item.subtitle}</span>
          </span>
          <span className="fleet-card__go" aria-hidden="true">
            <ArrowUpRight />
          </span>
        </span>
        <span className="sr-only">. Категория: {item.category.map(categoryLabel).join(", ")}. Открыть подробную карточку.</span>
      </button>
    </li>
  );
}
