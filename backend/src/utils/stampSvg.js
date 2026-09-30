/** Generate distinctive perforated-edge stamp SVG art */
export function generateStampSvg({ name, country, year, color = '#1c3d32', accent = '#c4503a' }) {
  const initials = (name || 'ST').split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  const yearText = year || '19XX';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
  <defs>
    <pattern id="perf" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="2.5" fill="#f6f3ee"/>
    </pattern>
  </defs>
  <rect x="4" y="4" width="192" height="232" rx="2" fill="${color}"/>
  <rect x="4" y="4" width="192" height="232" rx="2" fill="url(#perf)" opacity="0.35"/>
  <rect x="14" y="14" width="172" height="212" fill="#f6f3ee" stroke="${color}" stroke-width="1.5"/>
  <rect x="24" y="24" width="152" height="100" fill="${color}" opacity="0.08"/>
  <text x="100" y="78" text-anchor="middle" font-family="Georgia,serif" font-size="28" font-weight="bold" fill="${color}">${initials}</text>
  <text x="100" y="155" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="${color}">${country || 'WORLD'}</text>
  <text x="100" y="175" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="${accent}">${yearText}</text>
  <line x1="30" y1="190" x2="170" y2="190" stroke="${color}" stroke-width="0.5" opacity="0.4"/>
  <text x="100" y="210" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="${color}" opacity="0.7">STAMPS STAMP HOUSE</text>
</svg>`;
}
