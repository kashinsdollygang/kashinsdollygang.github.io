import { useLayoutEffect, useRef } from "react";
import { gsap, REDUCED_MOTION, ScrollTrigger } from "../lib/motion.js";

/**
 * RAIL CUT — фирменный переход между секциями.
 * Стык двух секций — это горизонтальные рельсы, лежащие на линии пола. Пока стык проходит по экрану,
 * по рельсам едет тележка-маркер, за ней идёт тёплая световая полоса, а координата X считается от положения
 * (позиция на рельсе, мм). Так прокрутка читается как один непрерывный проезд камеры от сцены к сцене.
 *
 * Анимируются только transform и текст координаты; без обработчиков scroll — всё через ScrollTrigger.
 * При prefers-reduced-motion — неподвижные рельсы.
 */
const RAIL_MM = 4800; // условная длина рельсового пути для координаты, мм

export function RailCut({ label }) {
  const root = useRef(null);
  const cart = useRef(null);
  const light = useRef(null);
  const coord = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    const mm = gsap.matchMedia();
    mm.add(`not ${REDUCED_MOTION}`, () => {
      const setCart = gsap.quickSetter(cart.current, "x", "px");
      const setLight = gsap.quickSetter(light.current, "x", "px");
      let span = 0;
      let lastText = "";
      const measure = () => {
        span = Math.max(0, el.clientWidth - cart.current.offsetWidth);
      };
      measure();
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onRefresh: measure,
        onUpdate: (self) => {
          const x = self.progress * span;
          setCart(x);
          setLight(x - light.current.offsetWidth * 0.55);
          const text = `X ${(self.progress * RAIL_MM).toFixed(1).padStart(6, "0")}`;
          if (text !== lastText && coord.current) {
            lastText = text;
            coord.current.textContent = text;
          }
        },
      });
      return () => st.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <div className="rail-cut" ref={root} aria-hidden="true">
      <div className="rail-cut__rails">
        <i className="rail-cut__rail" />
        <i className="rail-cut__rail" />
        <b className="rail-cut__light" ref={light} />
        <b className="rail-cut__cart" ref={cart} />
      </div>
      <div className="rail-cut__meta container">
        <span className="rail-cut__label">{label}</span>
        <span className="rail-cut__coord" ref={coord}>
          X 000.0
        </span>
      </div>
    </div>
  );
}
