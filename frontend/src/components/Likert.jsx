import { Icon } from '../lib/icons'

export const FREQ = [
  ['x', 'NEVER'],
  ['moon', 'RARELY'],
  ['minus', 'SOMETIMES'],
  ['chartUp', 'OFTEN'],
  ['flame', 'V. OFTEN'],
]

export const AGREE = [
  ['thdown', 'STR. DISAGREE'],
  ['thdown', 'DISAGREE'],
  ['shrug', 'NEUTRAL'],
  ['thup', 'AGREE'],
  ['star', 'STR. AGREE'],
]

export default function LikertBlock({
  items,
  scale,
  tag,
  qIcon,
  values,
  onPick,
  lowLabel,
  highLabel,
}) {
  return (
    <>
      {items.map((q, i) => (
        <div className={`q${values[i] ? ' answered' : ''}`} key={q}>
          <span className="qn">
            <Icon name={qIcon} /> {tag} {String(i + 1).padStart(2, '0')}
          </span>
          <div className="qt">{q}</div>
          <div className="likert">
            {scale.map(([ic, t], j) => {
              const v = j + 1
              return (
                <button
                  type="button"
                  key={t + j}
                  className={`lk${values[i] === v ? ' sel' : ''}`}
                  onClick={() => onPick(i, v)}
                  aria-label={`${q} — ${t}`}
                >
                  <span className="li">
                    <Icon name={ic} />
                  </span>
                  <span className="t">{t}</span>
                </button>
              )
            })}
          </div>
          <div className="hint">
            <span>1 · {lowLabel}</span>
            <span>5 · {highLabel}</span>
          </div>
        </div>
      ))}
    </>
  )
}
