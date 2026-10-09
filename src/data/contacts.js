// Контакты. Заполните реальные значения — ссылки и форма заявки включатся автоматически.
// Пустое значение (null) = канал не показывается как ссылка, рядом пометка «скоро».
//
//   telegram:  имя пользователя без @, например "kashins_dolly"
//   vk:        полный адрес, например "https://vk.com/…"
//   email:     адрес почты
//   phone:     номер в международном формате, например "+7 900 000-00-00"

export const CONTACTS = {
  telegram: null,
  vk: null,
  email: null,
  phone: null,
};

// Ссылка на политику конфиденциальности — появится в подвале, когда будет текст.
export const PRIVACY_URL = null;

export const CHANNELS = [
  { id: "telegram", label: "Telegram", href: (v) => `https://t.me/${v}`, display: (v) => `@${v}` },
  { id: "vk", label: "ВКонтакте", href: (v) => v, display: () => "vk.com" },
  { id: "email", label: "Email", href: (v) => `mailto:${v}`, display: (v) => v },
  { id: "phone", label: "Телефон", href: (v) => `tel:${v.replace(/[^+\d]/g, "")}`, display: (v) => v },
];

export const PROJECT_KINDS = ["Кино", "Сериал", "Реклама", "Музыкальный клип", "Другое"];
