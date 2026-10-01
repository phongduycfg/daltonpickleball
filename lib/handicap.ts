/**
 * Tính chấp đôi: mỗi đội 2 người, trình độ số nguyên −3..+3.
 * Chênh 1 điểm tổng trình = 1 trái chấp (đội yếu bắt đầu trước N điểm).
 */
export interface HandicapResult {
  sumA: number;
  sumB: number;
  balls: number;
  strong: 'A' | 'B' | null;
  weak: 'A' | 'B' | null;
}

export function computeHandicap(teamA: readonly number[], teamB: readonly number[]): HandicapResult {
  const sumA = teamA.reduce((a, b) => a + b, 0);
  const sumB = teamB.reduce((a, b) => a + b, 0);
  const diff = sumA - sumB;
  if (diff === 0) return { sumA, sumB, balls: 0, strong: null, weak: null };
  return { sumA, sumB, balls: Math.abs(diff), strong: diff > 0 ? 'A' : 'B', weak: diff > 0 ? 'B' : 'A' };
}
