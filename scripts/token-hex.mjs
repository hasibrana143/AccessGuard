// One-off: compute exact sRGB hex for our OKLCH tokens (for SVG assets).
function oklchToHex(l, c, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  // oklab -> linear srgb
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  const f = (x) => {
    x = Math.min(1, Math.max(0, x));
    return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
  };
  const hx = (x) => f(x).toString(16).padStart(2, '0');
  return `#${hx(r)}${hx(g)}${hx(bl)}`;
}
const tokens = {
  coral: [0.55, 0.2, 25],
  'coral-dark': [0.65, 0.2, 25],
  emerald: [0.65, 0.18, 160],
  critical: [0.55, 0.22, 25],
  serious: [0.65, 0.18, 50],
  moderate: [0.75, 0.15, 85],
  minor: [0.6, 0.12, 250],
};
for (const [k, v] of Object.entries(tokens)) console.log(k, oklchToHex(...v));
