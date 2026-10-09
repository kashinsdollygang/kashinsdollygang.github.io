// Услуги. Каждая услуга отвечает на вопрос: какую задачу съёмочной группы она решает.
// visual — кадр с реальной техникой из парка (public/images/scenes), path — тип условной траектории камеры.
// Автомобильные системы, MOVMAX, автогрип пока НЕ добавлены — ждут подтверждения.

export const SERVICES = [
  {
    id: "dolly",
    title: "Операторская работа на Dolly",
    task: "Проезды, наезды и отъезды по рельсам или ровному полу. Камера идёт плавно и повторяет траекторию от дубля к дублю.",
    visual: "primo-on-rails",
    visualCaption: "GFM GF-Primo Dolly на рельсах",
    path: "track",
  },
  {
    id: "jib",
    title: "Работа с краном и операторской стрелой",
    task: "Подъём и опускание камеры, пролёт над сценой, переход с общего плана на деталь в одном кадре.",
    visual: "scorpio-jib",
    visualCaption: "Scorpio 10′ Operator Jib",
    path: "arc",
  },
  {
    id: "stabilization",
    title: "Системы стабилизации камеры",
    task: "Свободное движение там, где рельсы не поставить: за актёром, в тесном интерьере, на сложном рельефе.",
    visual: "ronin-2",
    visualCaption: "DJI Ronin 2",
    path: "free",
  },
  {
    id: "film",
    title: "Движение камеры для кино и сериалов",
    task: "Планируем движение под раскадровку и график смены, чтобы техника и люди были готовы к первому дублю.",
    visual: "magnum-electric-column",
    visualCaption: "MovieTech Magnum Dolly, электрическая колонна",
    path: "track",
  },
  {
    id: "commercials",
    title: "Рекламные ролики",
    task: "Точные повторяемые движения для продуктовых планов и плотного графика рекламной смены.",
    visual: "primo-on-rails",
    visualCaption: "GFM GF-Primo Dolly на рельсах",
    path: "track",
  },
  {
    id: "music-videos",
    title: "Музыкальные клипы",
    task: "Пластика кадра под ритм трека: длинные проезды, облёты артиста, смена высоты внутри одного движения.",
    visual: "ronin-2",
    visualCaption: "DJI Ronin 2",
    path: "orbit",
  },
  {
    id: "crew",
    title: "Работа в составе съёмочной группы",
    task: "Работаем в связке с оператором-постановщиком, фокус-пуллером и площадкой: от сборки до последнего дубля.",
    visual: "scorpio-jib",
    visualCaption: "Scorpio 10′ Operator Jib",
    path: "arc",
  },
  {
    id: "configuration",
    title: "Подбор конфигурации под задачу",
    task: "Помогаем выбрать тележку, стрелу или стабилизатор под сцену, локацию и камеру — до выезда на площадку.",
    visual: "magnum-electric-column",
    visualCaption: "MovieTech Magnum Dolly, электрическая колонна",
    path: "nodes",
  },
];

// Размеры кадров из scripts/prepare-assets.py (ширина 1074).
const SCENE_HEIGHTS = {
  "magnum-electric-column": 1064,
  "primo-on-rails": 1066,
  "scorpio-jib": 954,
  "ronin-2": 1052,
};

export const sceneImage = (key) => ({
  src: `images/scenes/${key}-1074.webp`,
  srcSmall: `images/scenes/${key}-640.webp`,
  width: 1074,
  height: SCENE_HEIGHTS[key] ?? 1064,
});
