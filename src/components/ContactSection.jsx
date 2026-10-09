import { useEffect, useId, useState } from "react";
import { CHANNELS, CONTACTS, PROJECT_KINDS } from "../data/contacts.js";
import { CHANNEL_ICONS, ArrowRight, Copy } from "./Icons.jsx";
import { RecIndicator } from "./Brand.jsx";

const EMPTY = { name: "", contact: "", kind: "", date: "", message: "" };

function buildText(f) {
  return [
    "Заявка с сайта KASHIN’S DOLLY GANG",
    `Имя: ${f.name}`,
    `Контакт: ${f.contact}`,
    f.kind ? `Тип проекта: ${f.kind}` : null,
    f.date ? `Дата съёмки: ${f.date}` : null,
    f.message ? `Задача: ${f.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ChannelList({ compact = false }) {
  return (
    <ul className={`channels ${compact ? "channels--compact" : ""} ${CHANNELS.length === 1 ? "channels--single" : ""}`}>
      {CHANNELS.map((c) => {
        const value = CONTACTS[c.id];
        const Icon = CHANNEL_ICONS[c.id];
        return (
          <li key={c.id}>
            {value ? (
              <a className="channel" href={c.href(value)} {...(c.id === "email" || c.id === "phone" ? {} : { target: "_blank", rel: "noopener noreferrer" })}>
                <Icon />
                <span className="channel__label">{c.label}</span>
                {!compact ? <span className="channel__value">{c.display(value)}</span> : null}
              </a>
            ) : (
              <span className="channel channel--pending" title="Контакт скоро появится">
                <Icon />
                <span className="channel__label">{c.label}</span>
                <span className="channel__value">{CHANNELS.length === 1 ? "номер появится скоро" : "скоро"}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ContactSection() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // { tone: "info" | "warn", text, copy? }
  const uid = useId();

  useEffect(() => {
    const onRequest = (e) => setForm((f) => ({ ...f, message: f.message ? `${f.message}\n${e.detail.text}` : e.detail.text }));
    window.addEventListener("kdg:request", onRequest);
    return () => window.removeEventListener("kdg:request", onRequest);
  }, []);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.name.trim()) er.name = "Укажите, как к вам обращаться.";
    if (!form.contact.trim()) er.contact = "Оставьте Telegram, телефон или почту для ответа.";
    if (!form.message.trim()) er.message = "Опишите задачу хотя бы в паре слов.";
    setErrors(er);
    if (Object.keys(er).length) {
      document.getElementById(`${uid}-${Object.keys(er)[0]}`)?.focus();
      return;
    }
    const text = buildText(form);
    if (CONTACTS.email) {
      const href = `mailto:${CONTACTS.email}?subject=${encodeURIComponent("Заявка на съёмку")}&body=${encodeURIComponent(text)}`;
      window.location.href = href;
      setStatus({ tone: "info", text: "Открываем почтовое приложение с готовым письмом. Заявка уйдёт, когда вы отправите письмо." });
      return;
    }
    if (CONTACTS.telegram) {
      const copied = await copyText(text);
      window.open(`https://t.me/${CONTACTS.telegram}`, "_blank", "noopener");
      setStatus({
        tone: "info",
        text: copied ? "Текст заявки скопирован. Вставьте его в открывшийся чат Telegram и отправьте." : "Откройте чат Telegram и отправьте текст заявки ниже.",
        copy: copied ? null : text,
      });
      return;
    }
    setStatus({
      tone: "warn",
      text: CONTACTS.phone
        ? `Онлайн-отправка не подключена, поэтому заявка не отправлена. Позвоните нам: ${CONTACTS.phone}. Текст заявки можно скопировать.`
        : "Онлайн-отправка пока не подключена, поэтому заявка не отправлена. Скопируйте текст — он пригодится, когда появится телефон.",
      copy: text,
    });
  };

  return (
    <section id="contacts" className="section contacts" aria-labelledby="contacts-title">
      <div className="container contacts__layout">
        <div className="contacts__intro">
          <div className="section-head__meta" aria-hidden="true">
            <span className="section-head__count">
              <b>06</b> / 06
            </span>
            <span className="rec__dot rec__dot--static" />
            <span className="section-head__tag">Contact</span>
          </div>
          <h2 className="contacts__title" id="contacts-title">
            <span className="mask-line"><span data-reveal-line>Есть сцена,</span></span>
            <span className="mask-line"><span data-reveal-line>которую нужно</span></span>
            <span className="mask-line"><span data-reveal-line>снять?</span></span>
          </h2>
          <p className="contacts__lead">Обсудим задачу, подберём операторское решение и поможем организовать движение камеры на площадке.</p>
          <ChannelList />
        </div>

        <form className="lead-form" onSubmit={onSubmit} noValidate aria-describedby={`${uid}-hint`}>
          <div className="lead-form__head">
            <RecIndicator detail="Заявка на съёмку" />
          </div>
          <p className="sr-only" id={`${uid}-hint`}>
            Поля «Имя», «Контакт» и «Задача» обязательны.
          </p>

          <div className={`field ${errors.name ? "has-error" : ""}`}>
            <label htmlFor={`${uid}-name`}>Имя</label>
            <input id={`${uid}-name`} name="name" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${uid}-name-err` : undefined} required />
            {errors.name ? <span className="field__error" id={`${uid}-name-err`}>{errors.name}</span> : null}
          </div>

          <div className={`field ${errors.contact ? "has-error" : ""}`}>
            <label htmlFor={`${uid}-contact`}>Контакт для ответа</label>
            <input id={`${uid}-contact`} name="contact" placeholder="Telegram, телефон или email" value={form.contact} onChange={set("contact")} aria-invalid={!!errors.contact} aria-describedby={errors.contact ? `${uid}-contact-err` : undefined} required />
            {errors.contact ? <span className="field__error" id={`${uid}-contact-err`}>{errors.contact}</span> : null}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor={`${uid}-kind`}>Тип проекта</label>
              <select id={`${uid}-kind`} name="kind" value={form.kind} onChange={set("kind")}>
                <option value="">Не выбран</option>
                {PROJECT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-date`}>Дата съёмки, если известна</label>
              <input id={`${uid}-date`} name="date" type="date" value={form.date} onChange={set("date")} />
            </div>
          </div>

          <div className={`field ${errors.message ? "has-error" : ""}`}>
            <label htmlFor={`${uid}-message`}>Задача</label>
            <textarea id={`${uid}-message`} name="message" rows={4} placeholder="Сцена, локация, камера, какое движение нужно" value={form.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? `${uid}-message-err` : undefined} required />
            {errors.message ? <span className="field__error" id={`${uid}-message-err`}>{errors.message}</span> : null}
          </div>
          {/* якорь для перехода из карточки оборудования */}
          <span id="lead-message" tabIndex={-1} className="sr-only" onFocus={() => document.getElementById(`${uid}-message`)?.focus()} />

          <button type="submit" className="btn btn--rec btn--block">
            Отправить заявку <ArrowRight />
          </button>

          <div className="lead-form__status" role="status" aria-live="polite">
            {status ? (
              <div className={`notice notice--${status.tone}`}>
                <p>{status.text}</p>
                {status.copy ? (
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={async () => {
                      const ok = await copyText(status.copy);
                      setStatus((s) => ({ ...s, text: ok ? "Текст заявки скопирован в буфер обмена." : "Не удалось скопировать автоматически — выделите текст вручную.", copied: true }));
                    }}
                  >
                    <Copy /> Скопировать текст заявки
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
