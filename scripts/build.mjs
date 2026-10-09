// Сборка сайта: esbuild собирает React-приложение и CSS, копирует public/ и пишет index.html.
// npm run build    — production-сборка в dist/
// npm run dev      — локальный сервер с пересборкой при изменениях (http://localhost:5173)
// npm run preview  — собрать и раздать dist/ как на GitHub Pages
import * as esbuild from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const mode = process.argv.includes("--serve") ? "serve" : process.argv.includes("--preview") ? "preview" : "build";
const isDev = mode === "serve";

const options = {
  entryPoints: { app: path.join(root, "src/main.jsx") },
  bundle: true,
  format: "esm",
  target: ["es2020", "chrome100", "safari15", "firefox100"],
  jsx: "automatic",
  // шрифты и изображения лежат в public/ и копируются как есть
  external: ["../fonts/*", "../images/*"],
  minify: !isDev,
  sourcemap: isDev ? "inline" : false,
  define: { "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production") },
  logLevel: "info",
  legalComments: "none",
  // разделение кода: тяжёлые части (three.js) грузятся отдельным файлом только по запросу
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
};

async function writeHtml(assets) {
  const tpl = await readFile(path.join(root, "src/index.html"), "utf8");
  const html = tpl
    .replace("<!--APP_CSS-->", `<link rel="stylesheet" href="${assets.css}" />`)
    .replace("<!--APP_JS-->", `<script type="module" src="${assets.js}"></script>`);
  await writeFile(path.join(dist, "index.html"), html);
}

async function copyPublic() {
  await cp(path.join(root, "public"), dist, { recursive: true });
}

async function build() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(path.join(dist, "assets"), { recursive: true });
  await copyPublic();
  const result = await esbuild.build({ ...options, outdir: path.join(dist, "assets"), entryNames: "[name]-[hash]", metafile: true });
  const assets = {};
  for (const [file, info] of Object.entries(result.metafile.outputs)) {
    // точка входа именно приложения: динамические импорты (three.js) тоже помечены как entryPoint
    if (info.entryPoint !== "src/main.jsx") continue;
    assets.js = "./" + path.relative(dist, path.join(root, file)).split(path.sep).join("/");
    if (info.cssBundle) assets.css = "./" + path.relative(dist, path.join(root, info.cssBundle)).split(path.sep).join("/");
  }
  if (!assets.js || !assets.css) throw new Error("Сборка: не найден основной JS/CSS приложения");
  await writeHtml(assets);
  // GitHub Pages: не обрабатывать сайт Jekyll'ом
  await writeFile(path.join(dist, ".nojekyll"), "");
  return assets;
}

if (mode === "build") {
  const a = await build();
  console.log("Сборка готова:", a);
} else if (mode === "preview") {
  await build();
  const ctx = await esbuild.context({ entryPoints: [], write: false });
  const { port } = await ctx.serve({ servedir: dist, port: 4173 });
  console.log(`Preview: http://localhost:${port}/`);
} else {
  await rm(dist, { recursive: true, force: true });
  await mkdir(path.join(dist, "assets"), { recursive: true });
  await copyPublic();
  await writeHtml({ js: "./assets/app.js", css: "./assets/app.css" });
  const ctx = await esbuild.context({ ...options, outdir: path.join(dist, "assets") });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: dist, port: 5173 });
  console.log(`Dev: http://localhost:${port}/`);
}
