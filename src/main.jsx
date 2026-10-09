import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/header.css";
import "./styles/hero.css";
import "./styles/fleet.css";
import "./styles/motion.css";
import "./styles/services.css";
import "./styles/projects-team.css";
import "./styles/contacts.css";
import "./styles/three.css";

// Вернуться к началу при перезагрузке, если нет якоря (иначе GSAP-сцены стартуют с середины)
if ("scrollRestoration" in history && !location.hash) history.scrollRestoration = "manual";

createRoot(document.getElementById("root")).render(<App />);
