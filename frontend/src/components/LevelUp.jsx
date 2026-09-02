import { Icon } from '../lib/icons'

export default function LevelUp({ data }) {
  if (!data) return null
  return (
    <div className="lvlup">
      <div className="lucard">
        <div className="med">
          <Icon name={data.icon} />
        </div>
        <h2>{data.title}</h2>
        <p>{data.sub}</p>
        <div className="xg">
          <Icon name="zap" />
          <span>+{data.gain} XP</span>
        </div>
      </div>
    </div>
  )
}
