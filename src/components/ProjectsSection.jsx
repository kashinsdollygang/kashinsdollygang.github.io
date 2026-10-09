import { useMemo, useState } from "react";
import { PROJECTS, PROJECT_TYPES } from "../data/projects.js";
import { SectionHead } from "./Brand.jsx";
import { ArrowUpRight } from "./Icons.jsx";

const typeLabel = (id) => PROJECT_TYPES.find((t) => t.id === id)?.label ?? id;

export function ProjectCard({ project, index }) {
  const [failed, setFailed] = useState(false);
  const body = (
    <>
      <span className="project-card__poster">
        {project.poster && !failed ? (
          <img src={project.poster} alt={project.posterAlt ?? `Постер: ${project.title}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
        ) : (
          <span className="img-missing">
            <span>Постер ещё не добавлен</span>
          </span>
        )}
      </span>
      <span className="project-card__meta">
        <span className="project-card__title">{project.title}</span>
        <span className="project-card__info">
          {project.year ? <span>{project.year}</span> : null}
          <span>{typeLabel(project.type)}</span>
        </span>
        {project.teamRole ? <span className="project-card__role">{project.teamRole}</span> : null}
      </span>
      {project.externalUrl ? (
        <span className="project-card__go" aria-hidden="true">
          <ArrowUpRight />
        </span>
      ) : null}
    </>
  );
  return (
    <li className={`project-card project-card--v${index % 3}`}>
      {project.externalUrl ? (
        <a className="project-card__link" href={project.externalUrl} target="_blank" rel="noopener noreferrer">
          {body}
          <span className="sr-only"> (откроется в новой вкладке)</span>
        </a>
      ) : (
        <div className="project-card__link">{body}</div>
      )}
    </li>
  );
}

export function ProjectsSection() {
  const [filter, setFilter] = useState("all");
  const types = useMemo(() => PROJECT_TYPES.filter((t) => PROJECTS.some((p) => p.type === t.id)), []);
  const list = filter === "all" ? PROJECTS : PROJECTS.filter((p) => p.type === filter);
  const hasProjects = PROJECTS.length > 0;

  return (
    <section id="projects" className="section projects" aria-labelledby="projects-title">
      <div className="container">
        <SectionHead
          index={4}
          tag="Filmography"
          title="Проекты"
          id="projects-title"
          aside={<p className="section-head__note">Кино, сериалы, реклама, клипы.</p>}
        />

        {hasProjects ? (
          <>
            {types.length > 1 ? (
              <div className="filters" role="group" aria-label="Фильтр проектов">
                <button type="button" className={`chip ${filter === "all" ? "is-active" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                  Все
                </button>
                {types.map((t) => (
                  <button key={t.id} type="button" className={`chip ${filter === t.id ? "is-active" : ""}`} aria-pressed={filter === t.id} onClick={() => setFilter(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="projects-grid">
              {list.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </ul>
          </>
        ) : (
          <div className="projects-empty">
            <ul className="projects-empty__strip" aria-hidden="true">
              {["Кино", "Сериалы", "Реклама", "Клипы", "Другое"].map((t, i) => (
                <li key={t} style={{ "--i": i }}>
                  <span className="projects-empty__frame">
                    <span className="projects-empty__type">{t}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="projects-empty__text">
              <h3>Фильмография готовится к публикации</h3>
              <p>
                Здесь появятся постеры фильмов, сериалов, рекламы и клипов, над которыми работала команда, — с годом, ролью команды и ссылкой на
                проект. Публикуем только подтверждённые работы.
              </p>
              <a className="link-arrow" href="#contacts">
                Спросить о нашем опыте под вашу задачу
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
