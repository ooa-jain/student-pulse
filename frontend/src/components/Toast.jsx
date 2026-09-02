import { Icon } from '../lib/icons'

export default function Toast({ data }) {
  return (
    <div className={`toast${data ? ' show' : ''}`}>
      <div className="ti">
        <Icon name={data?.icon || 'zap'} />
      </div>
      <div>
        <b>{data?.title || ''}</b>
        <span>{data?.sub || ''}</span>
      </div>
    </div>
  )
}
