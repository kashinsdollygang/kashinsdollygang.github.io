// Тестовая сцена Three.js для будущей анимации тележки на рельсах и подъёма крана.
// Загружается динамически (отдельный файл сборки), только когда секция открыта.
//
// В сцене НЕТ моделей оборудования. Рельсы и дуга подъёма — условная схема линиями,
// как технический чертёж. Тележка и кран — пустые слоты (пунктирные рамки), в которые
// подставляются реальные GLB-модели из src/data/three.js, когда они появятся.
//
// Рендер по требованию: кадр рисуется только при изменении прогресса прокрутки или размера,
// а не в постоянном цикле — это экономит батарею на телефонах.
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Line,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  Box3,
} from "three";
import { DOLLY_MODEL, JIB_MODEL, JIB_SLOT, RAIL } from "../data/three.js";

const C = {
  bg: 0x050607,
  line: 0x30343a,
  lineBright: 0xa5a9ae,
  text: 0xf4f4f2,
  rec: 0xff3038,
};

function segments(points, material) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(points, 3));
  return new LineSegments(g, material);
}

/** Условная схема рельсов: две нитки и шпалы, линиями. */
function buildRailSchematic() {
  const group = new Group();
  const half = RAIL.length / 2;
  const g2 = RAIL.gauge / 2;
  const rails = [-half, 0, -g2, half, 0, -g2, -half, 0, g2, half, 0, g2];
  group.add(segments(rails, new LineBasicMaterial({ color: C.lineBright, transparent: true, opacity: 0.8 })));
  const sleepers = [];
  for (let x = -half; x <= half + 1e-6; x += 0.5) sleepers.push(x, 0, -g2 - 0.12, x, 0, g2 + 0.12);
  group.add(segments(sleepers, new LineBasicMaterial({ color: C.line })));
  return group;
}

/** Сетка пола — тонкие линии, затухающие туманом. */
function buildFloorGrid(size = 30, step = 1) {
  const pts = [];
  for (let i = -size / 2; i <= size / 2; i += step) {
    pts.push(i, 0, -size / 2, i, 0, size / 2, -size / 2, 0, i, size / 2, 0, i);
  }
  const m = segments(pts, new LineBasicMaterial({ color: C.line, transparent: true, opacity: 0.35 }));
  m.position.y = -0.001;
  return m;
}

/** Пустой слот под модель: пунктирная рамка заданного размера. */
function buildSlot(w, h, d) {
  const edges = new EdgesGeometry(new BoxGeometry(w, h, d));
  const line = new LineSegments(edges, new LineDashedMaterial({ color: C.lineBright, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.7 }));
  line.computeLineDistances();
  line.position.y = h / 2;
  line.name = "slot-placeholder";
  return line;
}

/** Дуга диапазона подъёма стрелы (схема). */
function buildArc(radius, fromDeg, toDeg) {
  const pts = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const a = MathUtils.degToRad(MathUtils.lerp(fromDeg, toDeg, i / steps));
    pts.push(new Vector3(-Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  const g = new BufferGeometry().setFromPoints(pts);
  const l = new Line(g, new LineDashedMaterial({ color: C.line, dashSize: 0.1, gapSize: 0.08 }));
  l.computeLineDistances();
  return l;
}

async function loadGLB(url) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => loader.load(url, (g) => resolve(g.scene), undefined, reject));
}

export function createRailScene(canvas, { lowPower = false, onStatus = () => {} } = {}) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: !lowPower,
    alpha: false,
    powerPreference: lowPower ? "low-power" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(C.bg, 1);

  const scene = new Scene();
  scene.background = new Color(C.bg);
  scene.fog = new Fog(C.bg, 7, 22);

  // свет — для будущих GLB-моделей (схемы линиями от света не зависят)
  scene.add(new HemisphereLight(0x8a8f96, 0x050607, 0.6));
  const key = new DirectionalLight(0xd99a5b, 1.6);
  key.position.set(4, 6, 3);
  scene.add(key);

  scene.add(buildFloorGrid());
  scene.add(buildRailSchematic());

  // --- слот тележки: едет по рельсам ---
  const dolly = new Group();
  dolly.name = "dolly-slot";
  dolly.add(buildSlot(1.3, 1.1, 0.9));
  // точка «камеры» на тележке — только маркер положения, не модель
  const camMark = new Mesh(new SphereGeometry(0.05, 12, 12), new MeshBasicMaterial({ color: C.rec }));
  camMark.position.set(0, 1.35, 0);
  dolly.add(camMark);
  scene.add(dolly);

  // --- слот крана: ось поворота и дуга подъёма ---
  const jib = new Group();
  jib.name = "jib-slot";
  jib.position.set(...JIB_SLOT.position);
  jib.add(buildSlot(0.9, JIB_SLOT.pivotHeight, 0.9));
  const pivot = new Group();
  pivot.position.y = JIB_SLOT.pivotHeight;
  jib.add(pivot);
  const arc = buildArc(JIB_SLOT.radius, JIB_SLOT.range[0], JIB_SLOT.range[1]);
  arc.position.y = JIB_SLOT.pivotHeight;
  jib.add(arc);
  // радиус стрелы — пунктир от оси до конца (схема, не модель)
  const radiusLine = new Line(
    new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(-JIB_SLOT.radius, 0, 0)]),
    new LineDashedMaterial({ color: C.lineBright, dashSize: 0.1, gapSize: 0.06 }),
  );
  radiusLine.computeLineDistances();
  pivot.add(radiusLine);
  const tipMark = new Mesh(new SphereGeometry(0.06, 12, 12), new MeshBasicMaterial({ color: C.rec }));
  tipMark.position.set(-JIB_SLOT.radius, 0, 0);
  pivot.add(tipMark);
  scene.add(jib);

  const camera = new PerspectiveCamera(38, 1, 0.1, 60);
  const lookTarget = new Vector3();

  let progress = 0;
  let jibArm = pivot; // узел, который поворачивается; заменяется узлом из GLB, если он указан
  let disposed = false;
  let frameQueued = false;

  function applyProgress() {
    // 0 → 0.65: тележка проезжает по рельсам; 0.35 → 1: стрела поднимается
    const pd = MathUtils.smoothstep(progress, 0, 0.65);
    const pj = MathUtils.smoothstep(progress, 0.35, 1);
    dolly.position.x = MathUtils.lerp(RAIL.travel[0], RAIL.travel[1], pd);
    const a = MathUtils.degToRad(MathUtils.lerp(JIB_SLOT.range[0], JIB_SLOT.range[1], pj));
    jibArm.rotation.z = -a;

    // камера наблюдателя: сбоку от рельсов, следует за тележкой и поднимается вместе со стрелой
    const cx = MathUtils.lerp(-5.5, 3.2, progress);
    camera.position.set(cx, MathUtils.lerp(1.6, 3.4, pj), MathUtils.lerp(6.4, 7.6, progress));
    lookTarget.set(MathUtils.lerp(dolly.position.x, jib.position.x - 1, pj * 0.6), MathUtils.lerp(0.7, 1.5, pj), MathUtils.lerp(0, -1.6, pj));
    camera.lookAt(lookTarget);
  }

  function render() {
    frameQueued = false;
    if (disposed) return;
    applyProgress();
    renderer.render(scene, camera);
  }
  function requestRender() {
    if (frameQueued || disposed) return;
    frameQueued = true;
    requestAnimationFrame(render);
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  }

  async function placeModel(slot, cfg, fit) {
    const model = await loadGLB(cfg.url);
    if (disposed) return null;
    if (cfg.scale) model.scale.setScalar(cfg.scale);
    if (cfg.rotationY) model.rotation.y = MathUtils.degToRad(cfg.rotationY);
    if (cfg.offset) model.position.set(...cfg.offset);
    slot.getObjectByName("slot-placeholder")?.removeFromParent();
    slot.add(model);
    if (fit) {
      const box = new Box3().setFromObject(model);
      if (box.min.y !== 0 && !cfg.offset) model.position.y -= box.min.y; // поставить на пол
    }
    return model;
  }

  async function loadModels() {
    const status = { dolly: DOLLY_MODEL ? "loading" : "missing", jib: JIB_MODEL ? "loading" : "missing" };
    onStatus({ ...status });
    if (DOLLY_MODEL) {
      try {
        await placeModel(dolly, DOLLY_MODEL, true);
        status.dolly = "loaded";
      } catch (e) {
        status.dolly = "error";
        console.warn("Не удалось загрузить модель тележки:", e);
      }
    }
    if (JIB_MODEL) {
      try {
        const model = await placeModel(jib, JIB_MODEL, true);
        if (model) {
          const arm = JIB_MODEL.armNode ? model.getObjectByName(JIB_MODEL.armNode) : null;
          if (arm) {
            jibArm = arm;
          } else {
            // без узла стрелы поворачиваем всю модель вокруг оси слота
            model.removeFromParent();
            pivot.add(model);
          }
          radiusLine.visible = false;
          tipMark.visible = false;
          arc.visible = false;
        }
        status.jib = "loaded";
      } catch (e) {
        status.jib = "error";
        console.warn("Не удалось загрузить модель крана:", e);
      }
    }
    onStatus({ ...status });
    requestRender();
  }

  resize();
  loadModels();

  return {
    setProgress(p) {
      const next = MathUtils.clamp(p, 0, 1);
      if (next === progress) return;
      progress = next;
      requestRender();
    },
    resize,
    render: requestRender,
    dispose() {
      disposed = true;
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose?.();
      });
      renderer.dispose();
    },
  };
}
