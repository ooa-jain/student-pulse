export default function HeroArt() {
  return (
    <div className="hero-art">
      <svg viewBox="0 0 680 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F5A623" />
            <stop offset="1" stopColor="#E85C1A" />
          </linearGradient>
        </defs>
        <path
          d="M40 150 C140 40, 250 40, 340 110 S 560 170, 640 60"
          stroke="#E7E2D6"
          strokeWidth="3"
          fill="none"
          strokeDasharray="8 10"
          strokeLinecap="round"
        />
        <circle cx="40" cy="150" r="16" fill="url(#g1)" />
        <text x="40" y="156" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="800">1</text>
        <circle cx="240" cy="62" r="16" fill="#0A2558" />
        <text x="240" y="68" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="800">2</text>
        <circle cx="430" cy="128" r="16" fill="#2E5FD0" />
        <text x="430" y="134" textAnchor="middle" fontSize="14" fill="#fff" fontWeight="800">3</text>
        <circle cx="640" cy="60" r="22" fill="none" stroke="url(#g1)" strokeWidth="3" />
        <path
          d="M632 60l6 6 11-12"
          stroke="#E85C1A"
          strokeWidth="3.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g transform="translate(560,120)">
          <rect x="-14" y="-14" width="28" height="28" rx="8" fill="#FDF1DC" />
          <path d="M-5 0h10M0 -5v10" stroke="#F5A623" strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g transform="translate(120,58)">
          <rect x="-14" y="-14" width="28" height="28" rx="8" fill="#E9EEFB" transform="rotate(12)" />
          <circle r="4.5" fill="#2E5FD0" />
        </g>
      </svg>
    </div>
  )
}
