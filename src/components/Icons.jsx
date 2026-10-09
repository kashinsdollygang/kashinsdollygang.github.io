// Минималистичные пиктограммы (stroke 1.5, currentColor). Декоративные — aria-hidden.
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" };

export const ArrowRight = (p) => (
  <svg {...base} {...p}><path d="M4 12h15M13 6l6 6-6 6" /></svg>
);
export const ArrowLeft = (p) => (
  <svg {...base} {...p}><path d="M20 12H5M11 6l-6 6 6 6" /></svg>
);
export const ArrowUpRight = (p) => (
  <svg {...base} {...p}><path d="M7 17 17 7M8 7h9v9" /></svg>
);
export const Close = (p) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const Plus = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const Telegram = (p) => (
  <svg {...base} {...p}><path d="M21 4 3 11.2l6.3 2.3L19 7l-7.7 8.2V20l3.4-3.6L18.5 19z" /></svg>
);
export const Vk = (p) => (
  <svg {...base} {...p}><path d="M3 7h3.2c.4 3.6 2 5.6 3.3 6V7h3v3.6c1.4-.2 2.8-1.8 3.3-3.6H19c-.4 2-2 3.8-3.2 4.5 1.2.6 3 2.1 3.7 4.5h-3.3c-.6-1.6-2-2.8-3.7-3V16h-.4C6.4 16 3.3 12.6 3 7z" /></svg>
);
export const Instagram = (p) => (
  <svg {...base} {...p}><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.8" cy="7.2" r=".6" fill="currentColor" /></svg>
);
export const Mail = (p) => (
  <svg {...base} {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="m4 7 8 6 8-6" /></svg>
);
export const Phone = (p) => (
  <svg {...base} {...p}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></svg>
);
export const Copy = (p) => (
  <svg {...base} {...p}><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></svg>
);

export const CHANNEL_ICONS = { telegram: Telegram, vk: Vk, instagram: Instagram, email: Mail, phone: Phone };
