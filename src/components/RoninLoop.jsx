import { useEffect, useRef } from "react";
import { useReducedMotion } from "../lib/motion.js";

/**
 * DJI Ronin 2 в кадре «Плавность». Зацикленная видеопоследовательность
 * (public/video/ronin-2-loop.*, собрана из присланной записи, assets-src/scenes/ronin-2-loop-source.mov):
 * кольцо балансирует вокруг ровной камеры → поворот в профиль → обратно анфас → заново.
 * Видео проигрывается вперёд и затем назад, поэтому шва в петле нет.
 * Играет только пока кадр виден на экране. При prefers-reduced-motion — статичное фото.
 */
export function RoninLoop({ className = "", alt, still }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);

  if (reduced) {
    return <img className={className} src={still.src} srcSet={`${still.srcSmall} 640w, ${still.src} 1074w`} sizes="(min-width: 900px) 70vw, 100vw" width={still.width} height={still.height} alt={alt} loading="lazy" decoding="async" />;
  }
  return (
    <video className={`${className} ronin-loop`} ref={ref} muted loop playsInline preload="metadata" poster="images/scenes/ronin-2-poster.webp" aria-label={alt} role="img" disablePictureInPicture>
      <source src="video/ronin-2-loop.webm" type="video/webm" />
      <source src="video/ronin-2-loop.mp4" type="video/mp4" />
    </video>
  );
}
