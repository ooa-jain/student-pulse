import { useEffect, useRef } from 'react'

export default function Confetti({ color = '#E85C1A', run = false }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!run) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const c = ref.current
    if (!c) return
    const x = c.getContext('2d')
    c.width = window.innerWidth
    c.height = window.innerHeight
    const cols = ['#F5A623', '#E85C1A', '#2E5FD0', '#0A2558', color]
    const P = Array.from({ length: 130 }, (_, i) => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.6,
      s: 4 + Math.random() * 6,
      v: 2 + Math.random() * 3,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      col: cols[i % cols.length],
    }))
    let t = 0
    let raf
    const loop = () => {
      t++
      x.clearRect(0, 0, c.width, c.height)
      P.forEach((p) => {
        p.y += p.v
        p.x += Math.sin(t / 20 + p.r) * 1.2
        p.r += p.vr
        if (p.y < c.height + 20) {
          x.save()
          x.translate(p.x, p.y)
          x.rotate(p.r)
          x.fillStyle = p.col
          x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
          x.restore()
        }
      })
      if (t < 420) raf = requestAnimationFrame(loop)
      else x.clearRect(0, 0, c.width, c.height)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [run, color])

  return <canvas className="cf" ref={ref} aria-hidden="true" />
}
