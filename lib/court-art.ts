/**
 * Ảnh nền sân pickleball vẽ bằng SVG nội tuyến (không tải ảnh ngoài → nhẹ, chạy offline).
 * Trả về giá trị CSS `url("data:image/svg+xml,…")` để dùng trong background-image.
 * `tone` đổi tông trời theo sân, `withGear` vẽ thêm vợt + bóng (thẻ buổi chơi ở Home).
 */
const cache = new Map<string, string>();

export function courtBackground(tone: number, withGear = false): string {
  const key = `${tone % 2}-${withGear}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const sky = tone % 2 ? ['#0d2b33', '#123c3a'] : ['#0f2a24', '#163b2c'];
  const net = Array.from({ length: 40 }, (_, i) => `<line x1='${i * 10}' y1='70' x2='${i * 10}' y2='110'/>`).join('');
  const rows = [70, 80, 90, 100, 110].map((y) => `<line x1='0' y1='${y}' x2='400' y2='${y}'/>`).join('');
  const dots = [[-12, -14], [6, -18], [18, -4], [-18, 2], [0, 0], [12, 14], [-8, 18], [-22, -10]]
    .map(([x, y]) => `<circle cx='${x}' cy='${y}' r='3.6' fill='#5d7210' opacity='.75'/>`)
    .join('');
  const gear = withGear
    ? `<g transform='translate(372 104) rotate(-32) scale(.8)'><rect x='-26' y='-62' width='52' height='70' rx='24' fill='#111827' stroke='#d7f531' stroke-width='2'/><rect x='-6' y='6' width='12' height='38' rx='4' fill='#0f172a' stroke='#d7f531' stroke-width='1.5'/></g><g transform='translate(338 156) scale(.82)'><circle r='32' fill='url(#g)'/>${dots}</g>`
    : '';

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${sky[0]}'/><stop offset='1' stop-color='${sky[1]}'/></linearGradient><linearGradient id='f' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1f5f73'/><stop offset='1' stop-color='#123a55'/></linearGradient><filter id='b'><feGaussianBlur stdDeviation='6'/></filter><filter id='b2'><feGaussianBlur stdDeviation='1.2'/></filter><radialGradient id='g' cx='.35' cy='.35' r='.7'><stop offset='0' stop-color='#f4ff8a'/><stop offset='.55' stop-color='#d7f531'/><stop offset='1' stop-color='#86a512'/></radialGradient></defs><rect width='400' height='200' fill='url(#s)'/><g filter='url(#b)' opacity='.9'><circle cx='40' cy='40' r='38' fill='#1d4a2c'/><circle cx='110' cy='25' r='34' fill='#24573a'/><circle cx='190' cy='35' r='40' fill='#1b4229'/><circle cx='270' cy='20' r='36' fill='#2a6040'/><circle cx='350' cy='40' r='42' fill='#1d4a2c'/></g><g filter='url(#b2)' stroke='#cbd5e1' stroke-opacity='.35' stroke-width='.6'>${net}${rows}</g><rect y='68' width='400' height='3' fill='#e2e8f0' opacity='.5'/><polygon points='0,112 400,112 400,200 0,200' fill='url(#f)'/><g stroke='#e2e8f0' stroke-opacity='.75' stroke-width='1.6' fill='none'><polyline points='30,200 120,112 280,112 370,200'/><line x1='200' y1='112' x2='200' y2='200'/><line x1='75' y1='160' x2='325' y2='160'/></g>${gear}</svg>`;

  const value = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  cache.set(key, value);
  return value;
}

/** Chọn tông ổn định cho mỗi sân theo thứ tự trong danh sách */
export function venueTone(venueId: string, venues: readonly { id: string }[]): number {
  return Math.max(0, venues.findIndex((v) => v.id === venueId));
}
