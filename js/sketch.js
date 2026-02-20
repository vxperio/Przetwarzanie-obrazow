// ===== UI REFS =====
const ui = {
  // header
  sectionSelect: document.getElementById("sectionSelect"),
  globalResetBtn: document.getElementById("globalResetBtn"),
  downloadResultBtn: document.getElementById("downloadResultBtn"),

  // IO
  file1: document.getElementById("file1"),
  file2: document.getElementById("file2"),
  maxW: document.getElementById("maxW"),

  // histogram
  histMode: document.getElementById("histMode"),
  histFromResult: document.getElementById("histFromResult"),

  // point ops
  opSelect: document.getElementById("opSelect"),
  A: document.getElementById("A"),
  B: document.getElementById("B"),
  applyBtn: document.getElementById("applyBtn"),
  saveBtn: document.getElementById("saveBtn"),

  // dwa obrazy
  op2Select: document.getElementById("op2Select"),
  op2UseResultAsA: document.getElementById("op2UseResultAsA"),
  apply2Btn: document.getElementById("apply2Btn"),

  // filtry
  maskSize: document.getElementById("maskSize"),
  normalizeMask: document.getElementById("normalizeMask"),
  maskGrid: document.getElementById("maskGrid"),
  presetBlur: document.getElementById("presetBlur"),
  presetSharpen: document.getElementById("presetSharpen"),
  presetEdge: document.getElementById("presetEdge"),
  presetIdentity: document.getElementById("presetIdentity"),
  applyConvBtn: document.getElementById("applyConvBtn"),

  nlSelect: document.getElementById("nlSelect"),
  nlSize: document.getElementById("nlSize"),
  applyNlBtn: document.getElementById("applyNlBtn"),

    // krawedzie
  edgeSelect: document.getElementById("edgeSelect"),
  applyEdgeBtn: document.getElementById("applyEdgeBtn"),

  // morfologia
  morphSelect: document.getElementById("morphSelect"),
  applyMorphBtn: document.getElementById("applyMorphBtn"),

  // info
  info: document.getElementById("info"),
};

// ===== data =====
let img1 = null;
let w = 0, h = 0;
let gray1 = null;
let outGray = null;
let outImg = null;

let img2 = null;
let gray2 = null;

let currentMaskSize = 3;
let currentMask = [];

// canvas layout
const PAD = 14;
const PREVIEW_W = 420;
const HIST_H = 150;

let canvasW = 980;
let canvasH = 560;

// ===== POMOCNICZE =====
function bindFileName(inputId, nameId){
  const inp = document.getElementById(inputId);
  const out = document.getElementById(nameId);
  if (!inp || !out) return;
  inp.addEventListener("change", () => out.textContent = inp.files?.[0]?.name || "Nie wybrano pliku");
}

bindFileName("file1","file1Name");
bindFileName("file2","file2Name");

// ===== sections (show/hide cards by data-section) =====
function initSectionSelect(){
  const sel = ui.sectionSelect;

  function apply(v){
    const cards = Array.from(document.querySelectorAll(".panel .card"));

    // pokaż zawsze karty bez data-section (Wczytaj A/B itp.)
    for (const c of cards){
      const sec = c.dataset.section;
      if (!sec) {
        c.style.display = "";
      } else {
        c.style.display = (sec === v) ? "" : "none";
      }
    }
  }

  sel.addEventListener("change", () => apply(sel.value));

  // jeśli value jest złe (np. literówka) to 'load'
  const allowed = new Set(["load","point","two","filters","edges","morph"]);
  if (!allowed.has(sel.value)) sel.value = "load";

  apply(sel.value);
}
initSectionSelect();


// ===== RESET  =====
ui.globalResetBtn.addEventListener("click", () => {
  if (!gray1) return;

  outGray = new Uint8ClampedArray(gray1);
  outImg = grayToP5Image(outGray, w, h);
  updateInfo();
});

// ===== IMAGE A =====
ui.file1.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  loadImage(url, (loaded) => {
    URL.revokeObjectURL(url);
    img1 = loaded;

    const maxW = Math.max(64, Math.min(2048, Number(ui.maxW.value || 420)));
    const scale = Math.min(1, maxW / img1.width);
    w = Math.max(1, Math.round(img1.width * scale));
    h = Math.max(1, Math.round(img1.height * scale));

    const scaled = createImage(w, h);
    scaled.copy(img1, 0, 0, img1.width, img1.height, 0, 0, w, h);
    img1 = scaled;

    gray1 = toGrayBuffer(img1);
    outGray = new Uint8ClampedArray(gray1);
    outImg = grayToP5Image(outGray, w, h);

    // jeśli B jest już wczytane, dopasuj
    if (img2) {
      const bScaled = createImage(w, h);
      bScaled.copy(img2, 0, 0, img2.width, img2.height, 0, 0, w, h);
      img2 = bScaled;
      gray2 = toGrayBuffer(img2);
    }

    updateInfo();
    resizeStage();
  }, () => {
    if (ui.info) ui.info.textContent = "Nie udało się wczytać obrazu.";
  });
});

// ===== IMAGE B =====
ui.file2.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!img1 || !w || !h) {
    if (ui.info) ui.info.textContent = "Najpierw wczytaj obraz A.";
    return;
  }

  const url = URL.createObjectURL(file);
  loadImage(url, (loaded) => {
    URL.revokeObjectURL(url);
    img2 = loaded;

    const scaled = createImage(w, h);
    scaled.copy(img2, 0, 0, img2.width, img2.height, 0, 0, w, h);
    img2 = scaled;

    gray2 = toGrayBuffer(img2);
    updateInfo();
  }, () => {
    if (ui.info) ui.info.textContent = "Nie udało się wczytać obrazu B.";
  });
});

// ===== POINT OPS =====
ui.applyBtn.addEventListener("click", () => {
  if (!outGray || !w || !h) return;

  const op = ui.opSelect.value;
  const a = Number(String(ui.A.value || "0").replace(",", "."));
  const b = Number(String(ui.B.value || "0").replace(",", "."));

  outGray = applyPointOp(outGray, w, h, op, a, b);
  outImg = grayToP5Image(outGray, w, h);
  updateInfo();
});

if (ui.saveBtn) {
  ui.saveBtn.addEventListener("click", () => {
    if (!outGray || !w || !h) return;
    downloadGrayPNG(outGray, w, h, "wynik.png");
  });
}

ui.downloadResultBtn.addEventListener("click", () => {
  if (!outGray || !w || !h) {
    if (ui.info) ui.info.textContent = "Brak wyniku do pobrania.";
    return;
  }
  downloadGrayPNG(outGray, w, h, "wynik.png");
});

// ===== DWA OBRAZY OPS =====
ui.apply2Btn.addEventListener("click", () => {
  if (!gray1 || !gray2) {
    if (ui.info) ui.info.textContent = "Wczytaj oba obrazy (A i B).";
    return;
  }

  const op = ui.op2Select.value;
  const useResultAsA = ui.op2UseResultAsA.checked;

  const A = useResultAsA && outGray ? outGray : gray1;
  const B = gray2;

  const res = applyTwoImageOp(A, B, op);
  if (!res) {
    if (ui.info) ui.info.textContent = "Błąd: brak danych / różny rozmiar.";
    return;
  }

  outGray = res;
  outImg = grayToP5Image(outGray, w, h);
  updateInfo();
});

// ===== FILTRY =====
buildMaskGrid(3, presetMask("identity", 3));

ui.maskSize.addEventListener("change", () => {
  const s = Number(ui.maskSize.value || 3);
  buildMaskGrid(s, presetMask("identity", s));
});

ui.presetBlur.addEventListener("click", () => buildMaskGrid(currentMaskSize, presetMask("blur", currentMaskSize)));
ui.presetSharpen.addEventListener("click", () => buildMaskGrid(currentMaskSize, presetMask("sharpen", currentMaskSize)));
ui.presetEdge.addEventListener("click", () => buildMaskGrid(currentMaskSize, presetMask("edge", currentMaskSize)));
ui.presetIdentity.addEventListener("click", () => buildMaskGrid(currentMaskSize, presetMask("identity", currentMaskSize)));

ui.applyConvBtn.addEventListener("click", () => {
  if (!outGray || !w || !h) return;

  const size = Number(ui.maskSize.value || 3);
  const normalize = ui.normalizeMask.checked;
  const mask = currentMask.slice(0, size * size).map(Number);

  outGray = convolveGray(outGray, w, h, mask, size, normalize);
  outImg = grayToP5Image(outGray, w, h);
  updateInfo();
});

ui.applyNlBtn.addEventListener("click", () => {
  if (!outGray || !w || !h) return;

  const mode = ui.nlSelect.value;
  const size = Number(ui.nlSize.value || 3);

  let weights = null;
  if (mode === "wmedian") {
    if (size !== currentMaskSize) buildMaskGrid(size, presetMask("blur", size));
    weights = readMaskWeightsForWMedian(size);
  }

  outGray = nonlinearFilter(outGray, w, h, size, mode, weights);
  outImg = grayToP5Image(outGray, w, h);
  updateInfo();
});

ui.applyEdgeBtn.addEventListener("click", () => {
  if (!outGray) return;

  const type = document.getElementById("edgeSelect").value;
  outGray = edgeDetect(outGray, w, h, type);
  outImg = grayToP5Image(outGray, w, h);
  updateInfo();
});

ui.applyMorphBtn.addEventListener("click", () => {
  if (!outGray) return;

  const mode = document.getElementById("morphSelect").value;
  outGray = morphology(outGray, w, h, mode);
  outImg = grayToP5Image(outGray, w, h);
  updateInfo();
});


// ===== INFO =====
function updateInfo() {
  if (!ui.info) return;
  if (!img1) {
    ui.info.textContent = "Brak obrazu.";
    return;
  }
  const hist = ui.histMode ? ui.histMode.value.toUpperCase() : "GRAY";
  ui.info.innerHTML =
    `A: <b>${w}×${h}</b> (wczytany)<br/>` +
    `B: <b>${gray2 ? "wczytany" : "brak"}</b><br/>` +
    `Tryb wyniku: <b>grayscale (0..255)</b><br/>` +
    `Histogram: <b>${hist}</b>`;
}

// ===== ROZMIAR =====
function resizeStage() {
  const previewW = w ? Math.max(320, w) : PREVIEW_W;
  const previewH = h ? Math.max(220, h) : 280;

  canvasW = PAD + previewW + PAD + previewW + PAD;
  canvasH = PAD + previewH + PAD + HIST_H + PAD;

  resizeCanvas(canvasW, canvasH);
}

// ===== p5 =====
function setup() {
  const c = createCanvas(canvasW, canvasH);
  c.parent("p5mount");
  pixelDensity(1);
  noSmooth();
  textFont("ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial");
  background(10);
}

function draw() {
  background(10);

  const previewW = (canvasW - PAD * 3) / 2;
  const previewH = canvasH - PAD * 3 - HIST_H;

  drawFrame(PAD, PAD, previewW, previewH, "Oryginał");
  drawFrame(PAD + previewW + PAD, PAD, previewW, previewH, "Wynik (gray)");

  if (img1) image(img1, PAD, PAD, previewW, previewH);
  if (outImg) image(outImg, PAD + previewW + PAD, PAD, previewW, previewH);

  const hx = PAD;
  const hy = PAD + previewH + PAD;
  const hw = canvasW - PAD * 2;
  const hh = HIST_H;

  drawHistogram(hx, hy, hw, hh);
}

function drawFrame(x, y, w, h, label) {
  push();
  noFill();
  stroke(60);
  rect(x, y, w, h, 10);
  noStroke();
  fill(200);
  textSize(12);
  text(label, x + 10, y + 18);
  pop();
}

// ===== KONWERSJA =====
function toGrayBuffer(p5img) {
  const ww = p5img.width, hh = p5img.height;
  const gray = new Uint8ClampedArray(ww * hh);

  p5img.loadPixels();
  const px = p5img.pixels;
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const r = px[p], g = px[p + 1], b = px[p + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

function grayToP5Image(gray, ww, hh) {
  const im = createImage(ww, hh);
  im.loadPixels();
  const px = im.pixels;
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const v = gray[i];
    px[p] = v; px[p + 1] = v; px[p + 2] = v; px[p + 3] = 255;
  }
  im.updatePixels();
  return im;
}

// ===== HISTOGRAM =====
function drawHistogram(x, y, wBox, hBox) {
  push();
  noFill();
  stroke(60);
  rect(x, y, wBox, hBox, 10);

  noStroke();
  fill(200);
  textSize(12);
  const mode = ui.histMode ? ui.histMode.value : "gray";
  text(`Histogram: ${String(mode).toUpperCase()}`, x + 12, y + 18);

  if (!img1 && !outGray) {
    fill(160);
    textSize(12);
    text("Wczytaj obraz, aby zobaczyć histogram.", x + 16, y + 50);
    pop();
    return;
  }

  let hist;
  if (mode === "gray") {
    const fromResult = ui.histFromResult ? ui.histFromResult.checked : true;
    const src = (fromResult && outGray) ? outGray : gray1;
    hist = histogram256FromGray(src || new Uint8ClampedArray(0));
  } else {
    const ch = mode === "r" ? 0 : (mode === "g" ? 1 : 2);
    hist = histogram256FromRGB(img1, ch);
  }

  let maxV = 1;
  for (let i = 0; i < 256; i++) if (hist[i] > maxV) maxV = hist[i];

  const padIn = 12;
  const gx = x + padIn;
  const gy = y + padIn + 22;
  const gw = wBox - padIn * 2;
  const gh = hBox - padIn * 2 - 26;

  noStroke();
  fill(220);

  for (let i = 0; i < 256; i++) {
    const v = hist[i] / maxV;
    const barH = v * gh;
    const bx = gx + (i / 256) * gw;
    const bw = Math.max(1, gw / 256);
    rect(bx, gy + (gh - barH), bw, barH);
  }
  pop();
}

// ===== ZAPIS WYNIKU =====
function downloadGrayPNG(gray, ww, hh, filename) {
  const cnv = document.createElement("canvas");
  cnv.width = ww; cnv.height = hh;
  const ctx = cnv.getContext("2d");
  const imgData = ctx.createImageData(ww, hh);
  const d = imgData.data;

  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const v = gray[i];
    d[p] = v; d[p + 1] = v; d[p + 2] = v; d[p + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const a = document.createElement("a");
  a.download = filename;
  a.href = cnv.toDataURL("image/png");
  a.click();
}

// ===== MASKA =====
function buildMaskGrid(size, initialValues) {
  currentMaskSize = size;
  currentMask = (initialValues && initialValues.length === size * size)
    ? initialValues.slice()
    : presetMask("identity", size);

  ui.maskGrid.innerHTML = "";
  ui.maskGrid.classList.remove("compact", "compact7");
  if (size >= 5) ui.maskGrid.classList.add("compact");
  if (size >= 7) ui.maskGrid.classList.add("compact7");

  ui.maskGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  for (let i = 0; i < size * size; i++) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.step = "0.1";
    inp.value = String(currentMask[i] ?? 0);

    inp.addEventListener("input", () => {
      const v = Number(String(inp.value).replace(",", "."));
      currentMask[i] = Number.isFinite(v) ? v : 0;
    });

    ui.maskGrid.appendChild(inp);
  }
}

function readMaskWeightsForWMedian(size) {
  const n = size * size;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const v = Number(currentMask[i] ?? 0);
    out[i] = Math.max(0, Math.round(Number.isFinite(v) ? v : 0));
  }
  return out;
}

// =================== STRZAŁKA ===================
function autoWrapSelects(){
  const sels = Array.from(document.querySelectorAll("select"));
  for(const s of sels){
    if (s.closest(".select-wrap")) continue;

    const wrap = document.createElement("div");
    wrap.className = "select-wrap";

    const parent = s.parentNode;
    const next = s.nextSibling;

    wrap.appendChild(s);
    if (next) parent.insertBefore(wrap, next);
    else parent.appendChild(wrap);
  }
}

// =================== STEPPERS  ===================
function parseNumLocale(v){
  if (typeof v !== "string") v = String(v ?? "");
  v = v.replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function stepNumberInput(input, dir){
  const step = parseNumLocale(input.step || "1") || 1;
  const min = input.min !== "" ? parseNumLocale(input.min) : -Infinity;
  const max = input.max !== "" ? parseNumLocale(input.max) : Infinity;

  const cur = parseNumLocale(input.value);
  const next = dir === "up" ? cur + step : cur - step;
  const clamped = Math.min(max, Math.max(min, next));

  const decimals = (String(input.step || "").split(".")[1] || "").length;
  input.value = clamped.toFixed(decimals);

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function shouldSkipAutoStepper(input){
  if (input.hasAttribute("data-no-stepper")) return true; // <-- NOWE
  if (input.closest("#maskGrid")) return true;            // maski nadal bez stepperek
  if (input.closest(".num-field")) return true;
  return false;
}


function wrapNumberInputWithStepper(input){
  if (shouldSkipAutoStepper(input)) return;

  const wrap = document.createElement("div");
  wrap.className = "num-field";

  const stepper = document.createElement("div");
  stepper.className = "num-stepper";

  const up = document.createElement("button");
  up.type = "button";
  up.className = "step-btn";
  up.setAttribute("aria-label", "Zwiększ");
  up.innerHTML = '<span class="chev"></span>';

  const down = document.createElement("button");
  down.type = "button";
  down.className = "step-btn";
  down.setAttribute("aria-label", "Zmniejsz");
  down.innerHTML = '<span class="chev down"></span>';

  up.addEventListener("click", () => stepNumberInput(input, "up"));
  down.addEventListener("click", () => stepNumberInput(input, "down"));

  stepper.appendChild(up);
  stepper.appendChild(down);

  const parent = input.parentNode;
  const next = input.nextSibling;

  wrap.appendChild(input);
  wrap.appendChild(stepper);

  if (next) parent.insertBefore(wrap, next);
  else parent.appendChild(wrap);
}

function initAutoSteppers(){
  const nums = Array.from(document.querySelectorAll('input[type="number"]'));
  nums.forEach(wrapNumberInputWithStepper);
}

// init after DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    autoWrapSelects();
    initAutoSteppers();
  });
} else {
  autoWrapSelects();
  initAutoSteppers();
}
