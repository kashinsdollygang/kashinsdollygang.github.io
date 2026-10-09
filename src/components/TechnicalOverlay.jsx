// Условная техническая графика на втором плане. Это декоративные схемы
// (рельсы, шкала поворота, траектория стрелы), а не чертежи конкретных моделей.

function Rails() {
  // перспективные рельсы со шпалами, сходящиеся к горизонту
  const sleepers = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const y = 640 - Math.pow(t, 1.7) * 300;
    const half = 380 - t * 300;
    sleepers.push(<line key={i} x1={600 - half} y1={y} x2={600 + half} y2={y} />);
  }
  return (
    <g className="tech__rails">
      <line x1="250" y1="640" x2="560" y2="340" />
      <line x1="950" y1="640" x2="640" y2="340" />
      {sleepers}
    </g>
  );
}

function Dial({ cx, cy, r }) {
  const ticks = [];
  for (let a = 0; a < 360; a += 5) {
    const long = a % 45 === 0;
    const rad = (a * Math.PI) / 180;
    const r1 = r - (long ? 14 : 6);
    ticks.push(<line key={a} x1={cx + Math.cos(rad) * r1} y1={cy + Math.sin(rad) * r1} x2={cx + Math.cos(rad) * r} y2={cy + Math.sin(rad) * r} />);
  }
  return (
    <g className="tech__dial">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.62} strokeDasharray="2 6" />
      {ticks}
      <line x1={cx - r - 30} y1={cy} x2={cx + r + 30} y2={cy} />
      <line x1={cx} y1={cy - r - 30} x2={cx} y2={cy + r + 30} />
    </g>
  );
}

export function TechnicalOverlay({ variant = "hero", className = "" }) {
  if (variant === "hero") {
    return (
      <svg className={`tech tech--hero ${className}`} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <Rails />
        <Dial cx={1010} cy={170} r={110} />
        <g className="tech__marks">
          <path d="M70 120h40M90 100v40" />
          <path d="M1130 600h40M1150 580v40" />
          <text x="118" y="114">X 00.00</text>
          <text x="1000" y="612">TRACK</text>
        </g>
      </svg>
    );
  }
  // arc — условная траектория стрелы для секции услуг
  return (
    <svg className={`tech tech--arc ${className}`} viewBox="0 0 800 800" aria-hidden="true" focusable="false">
      <Dial cx={400} cy={560} r={70} />
      <path className="tech__arc" d="M400 560 m-320 0 a320 320 0 0 1 640 0" />
      <path className="tech__arc" d="M400 560 m-240 0 a240 240 0 0 1 480 0" strokeDasharray="3 8" />
    </svg>
  );
}
