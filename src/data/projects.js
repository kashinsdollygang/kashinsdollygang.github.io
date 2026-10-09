// Проекты и фильмография. Добавляйте ТОЛЬКО подтверждённые работы команды.
//
// Постеры кладите в public/images/projects/, путь указывайте без начального слэша.
// type — один из PROJECT_TYPES. externalUrl — реальная ссылка (Кинопоиск, Vimeo, YouTube…) или null.
//
// Пример записи:
// {
//   id: "project-slug",
//   title: "Название проекта",
//   year: 2025,
//   type: "film",
//   poster: "images/projects/project-slug.webp",
//   posterAlt: "Постер проекта «Название проекта»",
//   description: "Коротко о проекте (необязательно)",
//   teamRole: "Операторская тележка и стрела, грип-группа",
//   externalUrl: "https://…",
// },

export const PROJECT_TYPES = [
  { id: "film", label: "Кино" },
  { id: "series", label: "Сериалы" },
  { id: "commercial", label: "Реклама" },
  { id: "music", label: "Клипы" },
  { id: "other", label: "Другое" },
];

export const PROJECTS = [];
