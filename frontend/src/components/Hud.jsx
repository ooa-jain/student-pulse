import Avatar from './Avatar'
import { Icon } from '../lib/icons'

export default function Hud({ name, avatarSeed, level, xp, maxXp, streak }) {
  const pct = Math.min(100, (xp / maxXp) * 100)
  return (
    <div className="hud">
      {avatarSeed ? <Avatar seed={avatarSeed} /> : null}
      <div className="who">
        <div className="pname" title={name}>
          {name}
        </div>
        <div className="lv">Level {level} of 4</div>
      </div>
      <div className="xpbar">
        <div className="xpfill" style={{ width: `${pct}%` }} />
      </div>
      <div className="xpn">
        {xp}/{maxXp}
      </div>
      {streak >= 2 && (
        <div className="stk">
          <Icon name="flame" />
          <span>{streak}x</span>
        </div>
      )}
    </div>
  )
}
