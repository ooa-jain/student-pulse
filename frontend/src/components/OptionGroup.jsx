export default function OptionGroup({ options, value, onPick }) {
  return (
    <div className="opts">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className={`op${value === o ? ' sel' : ''}`}
          onClick={() => onPick(o)}
        >
          <span className="dot" />
          {o}
        </button>
      ))}
    </div>
  )
}
