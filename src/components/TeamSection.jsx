import { ABOUT, TEAM_MEMBERS, TEAM_PLACEHOLDER_SLOTS } from "../data/team.js";
import { SectionHead } from "./Brand.jsx";

function Member({ m }) {
  return (
    <li className="member">
      <span className="member__photo">
        <img src={m.photo} alt={`${m.name}, ${m.role}`} loading="lazy" decoding="async" />
      </span>
      <span className="member__name">{m.name}</span>
      <span className="member__role">{m.role}</span>
      {m.bio ? <p className="member__bio">{m.bio}</p> : null}
    </li>
  );
}

export function TeamSection() {
  const hasMembers = TEAM_MEMBERS.length > 0;
  return (
    <section id="team" className="section team" aria-labelledby="team-title">
      <div className="container">
        <SectionHead index={5} tag="Crew" title="Команда" id="team-title" aside={<p className="section-head__note">Люди, которые двигают камеру.</p>} />

        <div className="team__about">
          <div className="team__lead">
            {ABOUT.placeholder ? <span className="draft-flag">Текст уточняется</span> : null}
            <p>{ABOUT.lead}</p>
          </div>
          <ol className="team__points">
            {ABOUT.points.map((p) => (
              <li key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {hasMembers ? (
          <ul className="team__grid">
            {TEAM_MEMBERS.map((m) => (
              <Member key={m.id} m={m} />
            ))}
          </ul>
        ) : (
          <ul className="team__grid team__grid--empty" aria-label="Состав команды будет опубликован позже">
            {Array.from({ length: TEAM_PLACEHOLDER_SLOTS }, (_, i) => (
              <li className="member member--empty" key={i}>
                <span className="member__photo" aria-hidden="true">
                  <span className="member__slot">{String(i + 1).padStart(2, "0")}</span>
                </span>
                <span className="member__name">Участник команды</span>
                <span className="member__role">Фото, имя и роль появятся после подтверждения</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
