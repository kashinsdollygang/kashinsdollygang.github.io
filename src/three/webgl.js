// Проверка WebGL без загрузки three.js. Вызывается до динамического импорта сцены.
export function detectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return { ok: false, reason: "Браузер не поддерживает WebGL или он отключён." };
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "Не удалось создать WebGL-контекст." };
  }
}

/** Грубая оценка слабого устройства: телефон/планшет или мало ядер/памяти. */
export function isLowPowerDevice() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 900;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  return coarse || narrow || cores <= 4 || mem <= 4;
}
