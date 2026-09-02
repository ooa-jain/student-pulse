/**
 * Chart palette for the AI Pulse admin dashboard.
 *
 * Validated with the dataviz palette validator against a white chart surface:
 *   node scripts/validate_palette.js "#E85C1A,#2E5FD0,#2F9E63,#9333EA,#C77F0A" --mode light
 *   → lightness band PASS · chroma floor PASS · CVD separation PASS
 *     (worst adjacent ΔE 26.0 deutan / 10.4 tritan) · contrast PASS
 *
 * The brand navy #0A2558 and gold #F5A623 are kept for UI chrome and the
 * student-facing result card, but they fail the chart checks (navy too dark and
 * low-chroma, gold under 3:1 on white), so charts use the steps below instead.
 */
export const CAT = ['#E85C1A', '#2E5FD0', '#2F9E63', '#9333EA', '#C77F0A']

// Single-hue sequential default for magnitude-only charts.
export const SEQ = '#E85C1A'

export const INK = '#0A2558'
export const MUTED = '#5B6B8C'
export const GRID = '#E7E2D6'

// Fixed identity → colour map. Never reassigned by rank.
export const PERSONA_COLOR = {
  power: '#E85C1A',
  critic: '#2E5FD0',
  explorer: '#2F9E63',
  autopilot: '#C77F0A',
}

export const PERSONA_LABEL = {
  power: 'AI Power User',
  autopilot: 'AI Autopilot',
  critic: 'Cautious Critic',
  explorer: 'AI Explorer',
}

export const axisStyle = { fontSize: 11, fontWeight: 700, fill: MUTED }

export const tooltipStyle = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #E7E2D6',
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(10,37,88,.12)',
    fontSize: 12,
    fontWeight: 700,
    color: INK,
  },
  labelStyle: { color: MUTED, fontWeight: 800, fontSize: 11 },
  cursor: { fill: 'rgba(10,37,88,.05)' },
}
