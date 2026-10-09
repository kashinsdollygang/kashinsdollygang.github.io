import { PRIVACY_URL } from "../data/contacts.js";
import { NAV } from "../data/site.js";
import { Logo } from "./Brand.jsx";
import { ChannelList } from "./ContactSection.jsx";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <a href="#home" aria-label="KASHIN’S DOLLY GANG — наверх">
            <Logo width={190} />
          </a>
          <p>Операторская команда. Dolly, краны, системы стабилизации.</p>
        </div>
        <nav aria-label="Разделы сайта" className="site-footer__nav">
          <ul>
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`}>{n.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-footer__contacts">
          <ChannelList compact />
        </div>
      </div>
      <div className="container site-footer__legal">
        <span>© {year} KASHIN’S DOLLY GANG</span>
        <span>Фотографии оборудования сохраняют оригинальные маркировки производителей.</span>
        {PRIVACY_URL ? <a href={PRIVACY_URL}>Политика конфиденциальности</a> : null}
      </div>
    </footer>
  );
}
