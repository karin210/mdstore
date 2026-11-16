/**
 * The landing hero's backdrop: columns of Markdown "pages" (headings, lists, code, paragraphs) drawn as
 * monospace glyphs that scroll slowly, faster as the page scrolls, and light up under the pointer like a
 * reading cursor. One WebGL2 fragment shader over a glyph atlas, no 3D library; loaded on demand by
 * MarkdownField, which also decides whether it runs at all.
 */

/** Atlas order: the shader picks glyphs by index (0-3 markers, 4-29 letters, 30-42 code symbols). */
const GLYPHS = "#-`>abcdefghijklmnopqrstuvwxyz{}()[];=/.*_:";
const LETTERS_START = 4;
const LETTER_COUNT = 26;
const SYMBOLS_START = 30;
const SYMBOL_COUNT = 13;

/** Cell size in CSS pixels; a monospace glyph is about 0.6 times as wide as it is tall. */
const CELL_HEIGHT = 15;
const CELL_WIDTH = 9;
/** Idle drift in CSS pixels per second, and how much of the page scroll the field follows. */
const DRIFT_SPEED = 18;
const SCROLL_FOLLOW = 0.45;
/** Overall glyph opacity, kept low so the hero copy stays the first thing the eye reads. */
const BASE_OPACITY = 0.75;

const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform vec2 uCell;
uniform float uTime;
uniform float uScroll;
uniform vec3 uPointer;
uniform sampler2D uAtlas;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform float uOpacity;

out vec4 outColor;

const float GLYPH_COUNT = ${GLYPHS.length}.0;
const float PAGE_COLS = 64.0;
const float GUTTER_COLS = 8.0;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float letter(vec2 seed) {
  return ${LETTERS_START}.0 + floor(hash(seed) * ${LETTER_COUNT}.0);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  float col = floor(frag.x / uCell.x);
  float page = floor(col / (PAGE_COLS + GUTTER_COLS));
  float c = col - page * (PAGE_COLS + GUTTER_COLS);

  // Each page scrolls at its own speed, so the columns drift apart like parallax layers.
  float speed = 0.55 + 0.45 * hash(vec2(page, 1.7));
  float y = frag.y + uScroll * speed + hash(vec2(page, 9.2)) * 5000.0;
  float row = floor(y / uCell.y);
  vec2 inCell = vec2(fract(frag.x / uCell.x), fract(y / uCell.y));

  float kind = hash(vec2(row, page + 0.5));
  float lengthSeed = hash(vec2(row, page + 3.1));
  bool isSpace = hash(vec2(col, row)) < 0.16;
  float glyph = -1.0;
  float strength = 0.0;
  float accent = 0.0;

  if (c >= PAGE_COLS || kind < 0.2) {
    glyph = -1.0; // gutter between pages, or a blank line
  } else if (kind < 0.32) {
    // Heading: "#" or "##", a space, then a short title.
    float level = lengthSeed < 0.5 ? 1.0 : 2.0;
    float lineEnd = level + 1.0 + floor(mix(8.0, 30.0, lengthSeed));
    if (c < level) { glyph = 0.0; strength = 0.6; accent = 1.0; }
    else if (c > level && c < lineEnd && !isSpace) { glyph = letter(vec2(row, col * 1.3)); strength = 0.45; accent = 0.8; }
  } else if (kind < 0.58) {
    // List item: "- " then words.
    float lineEnd = 2.0 + floor(mix(14.0, 54.0, lengthSeed));
    if (c < 1.0) { glyph = 1.0; strength = 0.5; accent = 1.0; }
    else if (c > 1.0 && c < lineEnd && !isSpace) { glyph = letter(vec2(row, col)); strength = 0.26; }
  } else if (kind < 0.68) {
    // Indented code: letters mixed with symbols, tinted toward the accent.
    float indent = 2.0 + 2.0 * floor(lengthSeed * 3.0);
    float lineEnd = indent + floor(mix(10.0, 38.0, hash(vec2(row, page + 7.3))));
    if (c >= indent && c < lineEnd && !isSpace) {
      bool isSymbol = hash(vec2(col, row * 1.7)) < 0.3;
      glyph = isSymbol ? ${SYMBOLS_START}.0 + floor(hash(vec2(row, col)) * ${SYMBOL_COUNT}.0) : letter(vec2(col, row));
      strength = 0.24;
      accent = 0.45;
    }
  } else {
    // Paragraph.
    float lineEnd = floor(mix(28.0, PAGE_COLS, lengthSeed));
    if (c < lineEnd && !isSpace) { glyph = letter(vec2(col, row)); strength = 0.22; }
  }

  if (glyph < 0.0) {
    outColor = vec4(0.0);
    return;
  }

  // The reading light under the pointer, a slow shimmer, and a fade toward the bottom edge.
  float pointerDistance = distance(frag, uPointer.xy) / uResolution.y;
  float light = uPointer.z * smoothstep(0.34, 0.0, pointerDistance);
  float shimmer = 0.78 + 0.22 * sin(uTime * 1.3 + hash(vec2(col, row)) * 6.2831);
  float fade = smoothstep(0.0, 0.35, 1.0 - frag.y / uResolution.y);

  float coverage = texture(uAtlas, vec2((glyph + inCell.x) / GLYPH_COUNT, inCell.y)).a;
  float alpha = coverage * clamp((strength * shimmer + light * 0.55) * fade, 0.0, 1.0) * uOpacity;
  vec3 color = mix(uInk, uAccent, clamp(accent * 0.7 + light, 0.0, 1.0));
  outColor = vec4(color * alpha, alpha);
}`;

type Rgb = [number, number, number];

/** A `:root` colour token as linear 0-1 RGB, resolved by the browser (works for any CSS colour syntax). */
function readColorToken(host: HTMLElement, token: string): Rgb {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  host.append(probe);
  const channels = getComputedStyle(probe)
    .color.match(/[\d.]+/g)
    ?.map(Number) ?? [0, 0, 0];
  probe.remove();
  return [channels[0] / 255, channels[1] / 255, channels[2] / 255];
}

function compileProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX_SHADER],
    [gl.FRAGMENT_SHADER, FRAGMENT_SHADER],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/** Draws every glyph, centred in its own cell, into one row; the shader samples it by glyph index. */
function drawGlyphAtlas(cellWidth: number, cellHeight: number): HTMLCanvasElement {
  const atlas = document.createElement("canvas");
  atlas.width = cellWidth * GLYPHS.length;
  atlas.height = cellHeight;
  const context = atlas.getContext("2d");
  if (!context) return atlas;
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-code").trim() || "monospace";
  context.font = `500 ${Math.round(cellHeight * 0.78)}px ${fontFamily}`;
  // A coverage mask: the shader reads only its alpha and tints glyphs with the colour tokens.
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  [...GLYPHS].forEach((glyph, index) => {
    context.fillText(glyph, index * cellWidth + cellWidth / 2, cellHeight / 2);
  });
  return atlas;
}

/**
 * Starts the field on `canvas` and returns a function that stops it and frees the GPU context,
 * or null when WebGL2 isn't available (the hero then keeps its static backdrop).
 */
export async function startMarkdownField(canvas: HTMLCanvasElement): Promise<(() => void) | null> {
  const context = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!context) return null;
  const gl = context;
  const program = compileProgram(gl);
  if (!program) return null;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  const cellWidth = Math.round(CELL_WIDTH * pixelRatio);
  const cellHeight = Math.round(CELL_HEIGHT * pixelRatio);
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-code").trim();
  if (fontFamily) await document.fonts.load(`500 ${cellHeight}px ${fontFamily}`).catch(() => []);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawGlyphAtlas(cellWidth, cellHeight));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());
  const uniform = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
  const locations = {
    resolution: uniform("uResolution"),
    time: uniform("uTime"),
    scroll: uniform("uScroll"),
    pointer: uniform("uPointer"),
    ink: uniform("uInk"),
    accent: uniform("uAccent"),
  };
  gl.uniform2f(uniform("uCell"), cellWidth, cellHeight);
  gl.uniform1i(uniform("uAtlas"), 0);
  gl.uniform1f(uniform("uOpacity"), BASE_OPACITY);

  const host = canvas.parentElement ?? document.body;
  function applyColors(): void {
    gl.uniform3f(locations.ink, ...readColorToken(host, "--color-ink"));
    gl.uniform3f(locations.accent, ...readColorToken(host, "--color-primary"));
  }
  applyColors();
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  colorScheme.addEventListener("change", applyColors);

  function resize(): void {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(locations.resolution, canvas.width, canvas.height);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  // Pointer position eases toward the target, and the light fades in and out with it.
  const pointer = { x: 0, y: 0, strength: 0, targetX: 0, targetY: 0, targetStrength: 0 };
  function trackPointer(event: PointerEvent): void {
    if (event.pointerType === "touch") return;
    const bounds = canvas.getBoundingClientRect();
    pointer.targetX = (event.clientX - bounds.left) * pixelRatio;
    pointer.targetY = (event.clientY - bounds.top) * pixelRatio;
    const isInside = event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    pointer.targetStrength = isInside ? 1 : 0;
    if (pointer.strength === 0) {
      pointer.x = pointer.targetX;
      pointer.y = pointer.targetY;
    }
  }
  function dimPointer(): void {
    pointer.targetStrength = 0;
  }
  window.addEventListener("pointermove", trackPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", dimPointer);

  let frameId = 0;
  let isVisible = true;
  let drift = 0;
  let previousTime = performance.now();

  function render(now: number): void {
    frameId = 0;
    const elapsed = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    drift += elapsed * DRIFT_SPEED;
    const ease = 1 - Math.exp(-elapsed * 6);
    pointer.x += (pointer.targetX - pointer.x) * ease;
    pointer.y += (pointer.targetY - pointer.y) * ease;
    pointer.strength += (pointer.targetStrength - pointer.strength) * ease;

    gl.uniform1f(locations.time, now / 1000);
    gl.uniform1f(locations.scroll, (drift + window.scrollY * SCROLL_FOLLOW) * pixelRatio);
    gl.uniform3f(locations.pointer, pointer.x, pointer.y, pointer.strength);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.state = "running";
    scheduleFrame();
  }

  function scheduleFrame(): void {
    if (!frameId && isVisible && document.visibilityState === "visible") {
      frameId = requestAnimationFrame(render);
    }
  }

  // Only draw while the hero is on screen and the tab is visible.
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    scheduleFrame();
  });
  visibilityObserver.observe(canvas);
  document.addEventListener("visibilitychange", scheduleFrame);

  function stop(): void {
    cancelAnimationFrame(frameId);
    frameId = 0;
    isVisible = false;
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    colorScheme.removeEventListener("change", applyColors);
    window.removeEventListener("pointermove", trackPointer);
    document.documentElement.removeEventListener("pointerleave", dimPointer);
    document.removeEventListener("visibilitychange", scheduleFrame);
    delete canvas.dataset.state;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  canvas.addEventListener("webglcontextlost", stop, { once: true });

  scheduleFrame();
  return stop;
}
