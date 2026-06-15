const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 1640, H = 624;
const logoPath = path.resolve(__dirname, "..", "apps", "web", "public", "logo.jpeg");
const logoB64 = fs.readFileSync(logoPath).toString("base64");

// dots de rede (tecnológico) — determinísticos
let dots = "";
const rng = (s => () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)(7);
const pts = [];
for (let i = 0; i < 46; i++) {
  const x = Math.round(rng() * W);
  const y = Math.round(rng() * H);
  pts.push([x, y]);
  const r = 1 + rng() * 2.2;
  dots += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="#5eead4" opacity="${(0.15 + rng() * 0.35).toFixed(2)}"/>`;
}
let lines = "";
for (let i = 0; i < pts.length; i++) {
  for (let j = i + 1; j < pts.length; j++) {
    const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
    const d = Math.hypot(dx, dy);
    if (d < 150) lines += `<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[j][0]}" y2="${pts[j][1]}" stroke="#38bdf8" stroke-width="0.7" opacity="${(0.12 * (1 - d / 150)).toFixed(2)}"/>`;
  }
}

const cx = 405, cy = 235, R = 138; // logo à esquerda; todo o conteúdo no topo, livre da foto de perfil (baixo-centro)

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#070d1c"/>
      <stop offset="45%" stop-color="#0d2347"/>
      <stop offset="100%" stop-color="#06101f"/>
    </linearGradient>
    <radialGradient id="glow" cx="32%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
    <clipPath id="logoClip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.4"/></filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g filter="url(#soft)">${lines}${dots}</g>

  <!-- anel do logo -->
  <circle cx="${cx}" cy="${cy}" r="${R + 8}" fill="none" stroke="url(#accent)" stroke-width="4" opacity="0.9"/>
  <image x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" clip-path="url(#logoClip)"
         href="data:image/jpeg;base64,${logoB64}" preserveAspectRatio="xMidYMid slice"/>

  <!-- selos no TOPO (acima do título), longe da foto de perfil que fica no baixo-centro -->
  <g font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="600">
    <rect x="644" y="100" width="640" height="52" rx="26" fill="#0b1a33" stroke="#1e3a5f" stroke-width="1"/>
    <text x="674" y="134" fill="#7dd3fc">WhatsApp</text>
    <text x="838" y="134" fill="#a5b4fc">Instagram</text>
    <text x="1002" y="134" fill="#f0abfc">Funil de Vendas</text>
    <text x="1218" y="134" fill="#5eead4">IA</text>
    <circle cx="818" cy="126" r="2.5" fill="#475569"/>
    <circle cx="982" cy="126" r="2.5" fill="#475569"/>
    <circle cx="1198" cy="126" r="2.5" fill="#475569"/>
  </g>

  <!-- título + slogan -->
  <text x="640" y="234" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="86" font-weight="800" fill="#ffffff" letter-spacing="-1">Solutions CRM</text>
  <rect x="644" y="258" width="120" height="5" rx="2.5" fill="url(#accent)"/>
  <text x="644" y="300" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="33" font-weight="500" fill="#cbd5e1">Atendimento inteligente com WhatsApp, Instagram e IA</text>
</svg>`;

const out = path.resolve(require("os").homedir(), "Desktop", "capa-solutions-crm.png");
sharp(Buffer.from(svg)).png().toFile(out).then(info => {
  console.log("OK ->", out, info.width + "x" + info.height);
}).catch(e => { console.error("ERRO:", e.message); process.exit(1); });
