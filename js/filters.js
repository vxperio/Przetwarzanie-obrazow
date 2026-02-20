// ======= HELPERS =======
function idx(x, y, w) { return y * w + x; } // zamiana wspolrzednych (x,y) na indeks w buforze 1D.
function clampXY(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); } // ograniczenie wspolrzednych do zakresu obrazu (proste 'odbicie' na krawędzi/ clamp).

// ======= KONWOLUJCA =======
// dla pikseli na brzegu stosujemy clamp wspolrzednych (nie wychodzimy poza obraz).
// maska NxN
function convolveGray(grayIn, w, h, mask, kSize, normalize) {
  const out = new Uint8ClampedArray(grayIn.length);
  const half = Math.floor(kSize / 2);

  let sumW = 0;
  if (normalize) {
    for (let i = 0; i < mask.length; i++) sumW += mask[i];
    if (sumW === 0) sumW = 1; // żeby nie dzielić przez 0
  } else {
    sumW = 1;
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;

      for (let ky = -half; ky <= half; ky++) {
        const yy = clampXY(y + ky, 0, h - 1);
        for (let kx = -half; kx <= half; kx++) {
          const xx = clampXY(x + kx, 0, w - 1);
          const m = mask[(ky + half) * kSize + (kx + half)];
          acc += m * grayIn[idx(xx, yy, w)];
        }
      }

      acc = acc / sumW;
      out[idx(x, y, w)] = clamp255(Math.round(acc));
    }
  }

  return out;
}

// ======= NIELINIOWE =======
// NxN 
function nonlinearFilter(grayIn, w, h, size, mode, weightsOrNull) {
  const out = new Uint8ClampedArray(grayIn.length);
  const half = Math.floor(size / 2);

  // dla ważonej mediany: wagi muszą być >= 0
  let weights = null;
  if (mode === "wmedian") {
    weights = weightsOrNull && weightsOrNull.length === size * size ? weightsOrNull : null;
    if (!weights) throw new Error("Brak wag do ważonej mediany.");
  }

  // bufor okna (max 49 przy 7x7)
  const windowVals = new Uint8Array(size * size);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {

      // zbierz okno
      let t = 0;
      for (let dy = -half; dy <= half; dy++) {
        const yy = clampXY(y + dy, 0, h - 1);
        for (let dx = -half; dx <= half; dx++) {
          const xx = clampXY(x + dx, 0, w - 1);
          windowVals[t++] = grayIn[idx(xx, yy, w)];
        }
      }

      let v;

      if (mode === "min") {
        let m = 255;
        for (let i = 0; i < windowVals.length; i++) if (windowVals[i] < m) m = windowVals[i];
        v = m;
      }
      else if (mode === "max") {
        let m = 0;
        for (let i = 0; i < windowVals.length; i++) if (windowVals[i] > m) m = windowVals[i];
        v = m;
      }
      else if (mode === "median") {
        // sort na małym buforze
        const arr = Array.from(windowVals);
        arr.sort((a, b) => a - b);
        v = arr[Math.floor(arr.length / 2)];
      }
      else if (mode === "wmedian") {
        // histogram ważony: 0..255
        const hist = new Uint32Array(256);
        let totalW = 0;

        for (let i = 0; i < windowVals.length; i++) {
          const wgt = Math.max(0, weights[i] || 0);
          if (wgt === 0) continue;
          hist[windowVals[i]] += wgt;
          totalW += wgt;
        }

        if (totalW === 0) {
          v = grayIn[idx(x, y, w)];
        } else {
          const mid = Math.floor((totalW + 1) / 2);
          let cum = 0;
          let med = 0;
          for (let i = 0; i < 256; i++) {
            cum += hist[i];
            if (cum >= mid) { med = i; break; }
          }
          v = med;
        }
      }
      else {
        v = grayIn[idx(x, y, w)];
      }

      out[idx(x, y, w)] = v;
    }
  }

  return out;
}

// ======= PRESETY MASEK =======
// generowanie gotowych masek konwolucji (blur/sharpen/edge/identity) dla wybranego rozmiaru.
function presetMask(name, size) {
  const k = size;
  const n = k * k;
  const out = new Array(n).fill(0);

  if (name === "identity") {
    out[Math.floor(n / 2)] = 1;
    return out;
  }

  if (name === "blur") {
    for (let i = 0; i < n; i++) out[i] = 1;
    return out;
  }

  if (name === "sharpen") {
    // klasyczny 3x3; dla większych: wersja "środek +, reszta -"
    if (k === 3) {
      return [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];
    }
    // dla 5x5/7x7: center = 2n-1, reszta = -1 w krzyżu
    out[Math.floor(n / 2)] = 2 * n - 1;
    // delikatny “krzyż”
    const half = Math.floor(k / 2);
    for (let i = -half; i <= half; i++) {
      if (i === 0) continue;
      out[(half) * k + (half + i)] = -1;     // poziomo
      out[(half + i) * k + (half)] = -1;     // pionowo
    }
    return out;
  }

  if (name === "edge") {
    // 3x3 laplasjan; dla większych analogicznie: center dodatni, reszta ujemna
    if (k === 3) {
      return [
        -1, -1, -1,
        -1,  8, -1,
        -1, -1, -1
      ];
    }
    for (let i = 0; i < n; i++) out[i] = -1;
    out[Math.floor(n / 2)] = n - 1;
    return out;
  }

  return presetMask("identity", size);
}
