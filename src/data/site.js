// Общие настройки сайта: навигация, слоганы, фон первого экрана.

export const NAV = [
  { id: "home", label: "Главная" },
  { id: "fleet", label: "Парк техники" },
  { id: "services", label: "Услуги" },
  { id: "projects", label: "Проекты" },
  { id: "team", label: "Команда" },
  { id: "contacts", label: "Контакты" },
];

export const HERO = {
  eyebrow: "Операторская команда",
  slogan: "Мы управляем движением камеры.",
  lead: "Dolly. Краны. Системы стабилизации. Движение, которое работает на историю.",
  // Альтернативные варианты слогана (не используются, для обсуждения):
  //  - «Камера движется — история звучит.»
  //  - «Точное движение камеры на каждой площадке.»
  // Фон первого экрана. Можно заменить на другое изображение или видео (video: "images/…mp4").
  image: {
    src: "images/scenes/magnum-electric-column-1074.webp",
    srcSmall: "images/scenes/magnum-electric-column-640.webp",
    width: 1074,
    height: 1064,
    alt: "Операторская тележка MovieTech Magnum Dolly с электрической колонной",
  },
  video: null,
  footerTags: ["Camera movement", "Grip", "Dolly", "Crane"],
};

// Сцена «Механика движения» между парком и услугами.
export const MOTION_FRAMES = [
  {
    id: "track",
    word: "Проезд",
    text: "Тележка ведёт камеру по рельсам — ровно, с одинаковой скоростью в каждом дубле.",
    image: "primo-on-rails",
    caption: "GFM GF-Primo Dolly",
    move: "truck",
  },
  {
    id: "lift",
    word: "Подъём",
    text: "Стрела поднимает камеру над сценой и опускает к детали в одном непрерывном движении.",
    image: "scorpio-jib",
    caption: "Scorpio 10′ Operator Jib",
    move: "boom",
  },
  {
    id: "float",
    word: "Свобода",
    text: "Стабилизатор держит горизонт там, где рельсы не поставить, — камера идёт за героем.",
    image: "ronin-2",
    caption: "DJI Ronin 2",
    move: "push",
  },
];
