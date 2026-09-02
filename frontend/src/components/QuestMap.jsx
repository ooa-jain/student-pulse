import { Icon } from '../lib/icons'

const NODES = [
  { icon: 'users', label: 'IDENTITY' },
  { icon: 'bot', label: 'USAGE' },
  { icon: 'link', label: 'DEPENDENCY' },
  { icon: 'clock', label: 'EXPERIENCE' },
]

export default function QuestMap({ level }) {
  return (
    <div className="map">
      {NODES.map((n, i) => {
        const step = i + 1
        const cls = step < level ? 'node done' : step === level ? 'node now' : 'node'
        return (
          <div key={n.label} style={{ display: 'contents' }}>
            <div className={cls}>
              <Icon name={n.icon} />
              <span className="nl">{n.label}</span>
            </div>
            {i < NODES.length - 1 && <div className={step < level ? 'tr done' : 'tr'} />}
          </div>
        )
      })}
    </div>
  )
}
