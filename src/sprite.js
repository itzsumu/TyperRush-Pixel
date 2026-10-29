// Pixel-art sport motorbike + rider (40x24), drawn pixel by pixel.
// Two frames: wheel spokes rotate, the body settles 1px, exhaust flame flickers.
export const SPRITE_W = 40;
export const SPRITE_H = 24;

const TIRE = '#0b0d17', RIM = '#9aa5b5', HUB = '#ef7d57', DARK = '#1a1c2c';

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(h, f) { // f<0 darker, f>0 lighter
  return '#' + hexToRgb(h).map((v) => {
    const o = f < 0 ? Math.round(v * (1 + f)) : Math.round(v + (255 - v) * f);
    return Math.max(0, Math.min(255, o)).toString(16).padStart(2, '0');
  }).join('');
}

function line(put, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    put(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}
const thick = (put, x0, y0, x1, y1, c) => { line(put, x0, y0, x1, y1, c); line(put, x0, y0 + 1, x1, y1 + 1, c); };

function poly(put, pts, c) { // scanline fill
  const ys = pts.map((p) => p[1]);
  const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      const yy = y + 0.5;
      if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) put(x, y, c);
  }
}

function wheel(put, cx, cy, frame) {
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
    const d = Math.hypot(x, y);
    if (d <= 5.5) put(cx + x, cy + y, TIRE);
    if (d <= 3.8) put(cx + x, cy + y, RIM);
    if (d <= 2.7) put(cx + x, cy + y, '#262b44');
  }
  const spokes = frame === 0 ? [[0, -2], [0, 2], [-2, 0], [2, 0]] : [[-2, -2], [2, -2], [-2, 2], [2, 2]];
  spokes.forEach(([x, y]) => put(cx + x, cy + y, RIM));
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([x, y]) => put(cx + x, cy + y, HUB));
}

// r: { body, jacket, helmet, pants }
export function drawBike(g, r, frame) {
  const put = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const dy = frame === 1 ? 1 : 0; // body settles on the suspension
  const body = r.body, dark = shade(body, -0.38), light = shade(body, 0.4);

  // exhaust flame
  if (frame === 0) { put(0, 15, '#ffcd75'); put(1, 15, '#ef7d57'); }
  else { put(0, 15, '#ef7d57'); put(0, 16, '#ffcd75'); put(1, 15, '#ffcd75'); put(1, 16, '#ef7d57'); }

  wheel(put, 8, 18, frame);
  wheel(put, 33, 18, frame);

  // swingarm + engine block
  line(put, 8, 18, 16, 17, '#566c86');
  poly(put, [[15, 15], [23, 15], [23, 21], [15, 21]], '#3a3f5c');
  for (let x = 16; x < 23; x += 2) line(put, x, 17, x, 20, '#566c86');
  // exhaust pipe
  thick(put, 2, 15, 13, 17, '#c2c3c7');
  line(put, 2, 16, 13, 18, '#6c7a89');

  // fairing body
  const D = (pts) => pts.map(([x, y]) => [x, y + dy]);
  poly(put, D([[5, 12], [10, 9], [17, 9], [21, 7], [27, 8], [32, 9], [37, 13], [38, 15], [31, 16], [25, 18], [20, 19], [14, 18], [9, 16], [5, 14]]), body);
  poly(put, D([[9, 16], [14, 18], [20, 19], [25, 18], [31, 16], [38, 15], [37, 14], [30, 14], [22, 15], [14, 14], [8, 14]]), dark);
  line(put, 11, 10 + dy, 19, 8 + dy, light);
  line(put, 22, 8 + dy, 31, 9 + dy, light);
  line(put, 31, 10 + dy, 36, 13 + dy, light);
  line(put, 9, 9 + dy, 16, 9 + dy, DARK); // seat
  // windscreen
  poly(put, D([[26, 8], [30, 3], [32, 3], [32, 9]]), '#a8e8f9');
  line(put, 30, 3 + dy, 32, 3 + dy, '#e8fbff');
  // headlight + front fork
  put(37, 14 + dy, '#ffcd75'); put(38, 14 + dy, '#fff3c4');
  line(put, 31, 16, 33, 18, '#c2c3c7');
  // racing stripe number plate
  put(14, 12 + dy, '#f4f4f4'); put(15, 12 + dy, '#f4f4f4'); put(16, 12 + dy, '#f4f4f4');

  // rider: leg, torso, arm, helmet
  thick(put, 11, 9 + dy, 20, 12 + dy, r.pants);
  line(put, 20, 13 + dy, 17, 17 + dy, r.pants);
  line(put, 21, 13 + dy, 18, 17 + dy, r.pants);
  put(16, 18 + dy, DARK); put(17, 18 + dy, DARK); put(18, 18 + dy, DARK);

  const jl = shade(r.jacket, 0.3);
  thick(put, 11, 7 + dy, 20, 4 + dy, r.jacket);
  line(put, 11, 7 + dy, 20, 4 + dy, jl);
  line(put, 10, 8 + dy, 10, 10 + dy, r.jacket);
  thick(put, 19, 5 + dy, 27, 8 + dy, r.jacket);
  put(28, 8 + dy, DARK); put(28, 9 + dy, DARK);

  // helmet (circle r=3) + visor
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y) <= 3.2) put(22 + x, 3 + dy + y, r.helmet);
  [[23, 2], [24, 2], [25, 2], [24, 3], [25, 3]].forEach(([x, y]) => put(x, y + dy, DARK));
  put(24, 2 + dy, '#73eff7');
  line(put, 20, 1 + dy, 22, 0 + dy, shade(r.helmet, -0.25));
}
