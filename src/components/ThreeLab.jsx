import { useEffect, useRef, useState } from "react";
import { DOLLY_MODEL, JIB_MODEL } from "../data/three.js";
import { sceneImage } from "../data/services.js";
import { ScrollTrigger, useReducedMotion } from "../lib/motion.js";
import { detectWebGL, isLowPowerDevice } from "../three/webgl.js";

/**
 * Тестовая 3D-сцена (Three.js) — подготовка к анимации тележки на рельсах и подъёма крана при прокрутке.
 * three.js загружается отдельным файлом только при монтировании этой секции.
 * Резерв: без WebGL или при ошибке — статичный кадр реальной техники и пояснение.
 * prefers-reduced-motion: сцена рисуется один раз в среднем положении, без привязки к прокрутке.
 */
const STATUS_TEXT = {
  missing: "модель не подключена — показан пустой слот",
  loading: "загружается модель…",
  loaded: "модель подключена",
  error: "не удалось загрузить модель",
};

export function ThreeLab() {
  const section = useRef(null);
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();
  const [state, setState] = useState({ phase: "init", reason: "" }); // init | ready | fallback
  const [models, setModels] = useState({ dolly: DOLLY_MODEL ? "loading" : "missing", jib: JIB_MODEL ? "loading" : "missing" });

  useEffect(() => {
    const gl = detectWebGL();
    if (!gl.ok) {
      setState({ phase: "fallback", reason: gl.reason });
      return;
    }
    let api = null;
    let cancelled = false;
    let st = null;
    let io = null;
    let ro = null;
    const canvas = canvasRef.current;

    const onLost = (e) => {
      e.preventDefault();
      setState({ phase: "fallback", reason: "WebGL-контекст потерян (нехватка видеопамяти или сбой драйвера)." });
    };
    canvas.addEventListener("webglcontextlost", onLost);

    import("../three/createRailScene.js")
      .then(({ createRailScene }) => {
        if (cancelled) return;
        api = createRailScene(canvas, { lowPower: isLowPowerDevice(), onStatus: setModels });
        setState({ phase: "ready", reason: "" });

        ro = new ResizeObserver(() => api.resize());
        ro.observe(canvas);

        if (reduced) {
          api.setProgress(0.5);
          return;
        }
        let visible = true;
        io = new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          if (visible) api.render();
        });
        io.observe(section.current);
        st = ScrollTrigger.create({
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => visible && api.setProgress(self.progress),
        });
        api.setProgress(st.progress);
      })
      .catch((e) => {
        console.warn("3D-сцена не запустилась:", e);
        if (!cancelled) setState({ phase: "fallback", reason: "Не удалось запустить 3D-сцену." });
      });

    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      st?.kill();
      io?.disconnect();
      ro?.disconnect();
      api?.dispose();
    };
  }, [reduced]);

  const fallbackImg = sceneImage("primo-on-rails");

  return (
    <section className={`three-lab ${reduced ? "three-lab--static" : ""}`} ref={section} aria-labelledby="three-lab-title">
      <div className="three-lab__sticky">
        <canvas ref={canvasRef} className="three-lab__canvas" hidden={state.phase === "fallback"} aria-hidden="true" />

        {state.phase === "fallback" ? (
          <div className="three-lab__fallback">
            <img src={fallbackImg.src} alt="GFM GF-Primo Dolly на рельсах" width={fallbackImg.width} height={fallbackImg.height} loading="lazy" decoding="async" />
          </div>
        ) : null}

        <div className="three-lab__panel container">
          <span className="three-lab__badge">
            <span className="rec__dot rec__dot--static" /> Тестовая 3D-сцена
          </span>
          <h2 className="three-lab__title" id="three-lab-title">
            Рельсы и кран: подготовка к 3D
          </h2>
          {state.phase === "fallback" ? (
            <p className="three-lab__note">{state.reason} Показан статичный кадр.</p>
          ) : state.phase === "init" ? (
            <p className="three-lab__note">Загружаем 3D-сцену…</p>
          ) : (
            <p className="three-lab__note">
              {reduced ? "Анимация отключена настройкой «уменьшить движение»." : "Прокручивайте: слот тележки едет по рельсам, затем поднимается стрела."} Рельсы и дуга — условная схема, моделей техники здесь нет.
            </p>
          )}
          <dl className="three-lab__status">
            <div>
              <dt>Тележка</dt>
              <dd>{STATUS_TEXT[models.dolly]}</dd>
            </div>
            <div>
              <dt>Кран</dt>
              <dd>{STATUS_TEXT[models.jib]}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
