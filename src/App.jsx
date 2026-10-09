import { useEffect, useLayoutEffect } from "react";
import { ContactSection } from "./components/ContactSection.jsx";
import { FleetSection } from "./components/FleetSection.jsx";
import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { Hero } from "./components/Hero.jsx";
import { MotionScene } from "./components/MotionScene.jsx";
import { ProjectsSection } from "./components/ProjectsSection.jsx";
import { ServicesSection } from "./components/ServicesSection.jsx";
import { TeamSection } from "./components/TeamSection.jsx";
import { gsap, REDUCED_MOTION } from "./lib/motion.js";

export function App() {
  // Заголовки секций раскрываются через маску, как титры. Один раз на элемент.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(`not ${REDUCED_MOTION}`, () => {
      gsap.utils.toArray("main [data-reveal-line]").forEach((line) => {
        gsap.from(line, {
          yPercent: 105,
          duration: 1,
          ease: "power4.out",
          scrollTrigger: { trigger: line.closest("h2") ?? line, start: "top 88%", once: true },
          delay: Number(line.dataset.delay ?? 0),
        });
      });
    });
    return () => mm.revert();
  }, []);

  // Прямая ссылка на раздел (…/#fleet): после монтирования прокручиваем к нему.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "auto" }), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <a className="skip-link" href="#fleet">
        Перейти к содержимому
      </a>
      <Header />
      <main>
        <Hero />
        <FleetSection />
        <MotionScene />
        <ServicesSection />
        <ProjectsSection />
        <TeamSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
