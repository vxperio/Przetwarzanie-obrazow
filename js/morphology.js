// dla erozji bierzemy MIN z okna, dla dylatacji MAX.
function morphology(gray, w, h, mode) {
  const out = new Uint8ClampedArray(gray.length);
  const size = 3;
  const half = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {

      let hit = (mode === "erode") ? 255 : 0;

      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const xx = clampXY(x + dx, 0, w - 1);
          const yy = clampXY(y + dy, 0, h - 1);
          const v = gray[idx(xx, yy, w)];

          if (mode === "erode") hit = Math.min(hit, v);
          else hit = Math.max(hit, v);
        }
      }
      out[idx(x, y, w)] = hit;
    }
  }
  return out;
}
