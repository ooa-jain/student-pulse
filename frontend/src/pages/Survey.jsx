import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../lib/api'
import { AVATAR_SEEDS } from '../lib/avatar'
import { Icon } from '../lib/icons'
import Avatar from '../components/Avatar'
import Confetti from '../components/Confetti'
import Decor from '../components/Decor'
import HeroArt from '../components/HeroArt'
import Hud from '../components/Hud'
import LevelUp from '../components/LevelUp'
import LikertBlock, { AGREE, FREQ } from '../components/Likert'
import OptionGroup from '../components/OptionGroup'
import QuestMap from '../components/QuestMap'
import Toast from '../components/Toast'

const SEEDS = AVATAR_SEEDS

export default function Survey() {
  const [meta, setMeta] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [pulse, setPulse] = useState(null)

  const [screen, setScreen] = useState(0)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [age, setAge] = useState('')
  const [department, setDepartment] = useState('')
  const [program, setProgram] = useState('')
  const [level, setLevel] = useState('')
  const [semester, setSemester] = useState('')
  const [campus, setCampus] = useState('')
  const [usage, setUsage] = useState(Array(5).fill(0))
  const [dependency, setDependency] = useState(Array(6).fill(0))
  const [exp, setExp] = useState({ duration: '', daily: '', tool: '' })

  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [answered, setAnswered] = useState(0)
  const badges = useRef({ first: false, s5: false, s10: false, half: false })

  const [toast, setToast] = useState(null)
  const [levelUp, setLevelUp] = useState(null)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const [identityErrors, setIdentityErrors] = useState({})
  const toastTimer = useRef(null)

  useEffect(() => {
    api
      .meta()
      .then(setMeta)
      .catch((e) => setLoadErr(e.message))
    api.pulse().then((p) => setPulse(p.total)).catch(() => {})
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const maxXp = meta?.max_xp ?? 190
  const totalQ = meta?.total_questions ?? 17

  const fireToast = useCallback((icon, title, sub) => {
    setToast({ icon, title, sub })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const addXp = useCallback((n) => setXp((v) => v + n), [])

  const registerAnswer = useCallback(() => {
    addXp(10)
    setStreak((s) => {
      const next = s + 1
      setBestStreak((b) => Math.max(b, next))
      if (next === 5 && !badges.current.s5) {
        badges.current.s5 = true
        fireToast('flame', 'On Fire!', '5 answers in a row · +15 XP')
        addXp(15)
      }
      if (next === 10 && !badges.current.s10) {
        badges.current.s10 = true
        fireToast('medal', 'Unstoppable!', '10-answer streak · +25 XP')
        addXp(25)
      }
      return next
    })
    setAnswered((a) => {
      const next = a + 1
      if (!badges.current.first) {
        badges.current.first = true
        fireToast('zap', 'First Step', 'Quest begun · +5 XP')
        addXp(5)
      }
      if (next >= Math.ceil(totalQ / 2) && !badges.current.half) {
        badges.current.half = true
        fireToast('target', 'Halfway Hero', '50% complete · +10 XP')
        addXp(10)
      }
      return next
    })
  }, [addXp, fireToast, totalQ])

  const goto = (n) => {
    setScreen(n)
    window.scrollTo({ top: 0 })
  }

  const advance = (next, icon, title, sub, gain) => {
    addXp(gain)
    setLevelUp({ icon, title, sub, gain })
    setTimeout(() => {
      setLevelUp(null)
      goto(next)
    }, 1500)
  }

  const pickUsage = (i, v) => {
    setUsage((arr) => {
      if (arr[i] === 0) registerAnswer()
      const next = [...arr]
      next[i] = v
      return next
    })
  }
  const pickDep = (i, v) => {
    setDependency((arr) => {
      if (arr[i] === 0) registerAnswer()
      const next = [...arr]
      next[i] = v
      return next
    })
  }
  const pickExp = (k, v) => {
    setExp((e) => {
      if (!e[k]) registerAnswer()
      return { ...e, [k]: v }
    })
  }

  const nameOk = name.trim().length >= 2
  const identityOk = Boolean(age && department && level && semester && campus)
  const usageOk = usage.every((v) => v > 0)
  const depOk = dependency.every((v) => v > 0)
  const expOk = exp.duration && exp.daily && exp.tool

  const handleStartQuest = () => {
    if (!name.trim() || name.trim().length < 2) {
      fireToast('user', 'Name Required', 'Please enter at least 2 characters for your player name')
      return
    }
    if (!avatar) {
      setAvatar('Nova')
    }
    goto(1)
  }

  const handleContinueIdentity = () => {
    const errs = {}
    let numAge = Number(age)

    if (!age || isNaN(numAge)) {
      errs.age = 'Please enter your age (e.g. 19)'
    } else if (numAge >= 1930 && numAge <= 2015) {
      // User entered birth year!
      numAge = new Date().getFullYear() - numAge
      setAge(String(numAge))
    } else if (numAge < 10 || numAge > 100) {
      errs.age = 'Please enter an age between 13 and 90'
    }

    if (!department) {
      errs.department = 'Please select your department from the dropdown'
    }

    if (!level) {
      errs.level = 'Please choose Undergraduate or Postgraduate'
    }

    if (!semester) {
      errs.semester = 'Please select your current semester'
    }

    if (!campus) {
      errs.campus = 'Please select your campus'
    }

    if (Object.keys(errs).length > 0) {
      setIdentityErrors(errs)
      fireToast('x', 'Action Required', Object.values(errs)[0])
      return
    }

    if (!program.trim()) {
      setProgram('Not specified')
    }

    setIdentityErrors({})
    advance(2, 'bot', 'Level 2 Unlocked', 'AI Usage — how often do you actually use it?', 30)
  }

  const submit = async () => {
    setSubmitErr('')
    setSubmitting(true)
    const finalXp = xp + 20
    const finalAge = Number(age) >= 13 && Number(age) <= 90 ? Number(age) : 20
    const finalProg = program.trim() || 'Not specified'
    try {
      const res = await api.submit({
        name: name.trim(),
        age: finalAge,
        department: department || 'General',
        program: finalProg,
        level,
        semester,
        campus,
        avatar: avatar || 'Nova',
        usage,
        dependency,
        duration: exp.duration,
        daily: exp.daily,
        tool: exp.tool,
        xp: finalXp,
        best_streak: bestStreak,
      })
      setXp(finalXp)
      setResult(res)
      goto(5)
    } catch (e) {
      setSubmitErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inGame = screen >= 1 && screen <= 4

  if (loadErr)
    return (
      <>
        <Decor />
        <div className="wrap">
          <div className="q" style={{ marginTop: 60 }}>
            <div className="qn">
              <Icon name="x" /> CONNECTION
            </div>
            <div className="qt">We couldn&apos;t reach the AI Pulse server.</div>
            <p className="sub">{loadErr}</p>
            <button className="btn" onClick={() => window.location.reload()}>
              <Icon name="refresh" /> Retry
            </button>
          </div>
        </div>
      </>
    )

  if (!meta)
    return (
      <>
        <Decor />
        <div className="wrap">
          <div className="empty" style={{ marginTop: 80 }}>
            <div className="spin" />
            Loading your quest…
          </div>
        </div>
      </>
    )

  return (
    <>
      <Decor />
      <Confetti run={screen === 5} color={result?.persona_detail?.color} />
      <div className={`wrap${screen === 5 ? ' wrap-result' : ''}`}>
        {inGame && (
          <>
            <Hud
              name={name.trim()}
              avatarSeed={avatar}
              level={screen}
              xp={xp}
              maxXp={maxXp}
              streak={streak}
            />
            <QuestMap level={screen} />
          </>
        )}

        {/* ---------- WELCOME ---------- */}
        {screen === 0 && (
          <section className="screen">
            <div className="eyebrow">
              <Icon name="zap" /> JAIN OoA · AI PULSE
            </div>
            <h1>
              How <em>AI-ready</em> are you, really?
            </h1>
            <p className="sub">
              A 3-minute quest across four levels. Earn XP, keep your streak alive, unlock
              achievements — and reveal your official <b>AI Persona</b>.
              {pulse ? ` ${pulse.toLocaleString()} students have already taken it.` : ''}
            </p>

            <HeroArt />

            <div className="q" style={{ marginTop: 20 }}>
              <span className="qn">
                <Icon name="user" /> PLAYER NAME
              </span>
              <div className="qt">What should we call you?</div>
              <input
                type="text"
                value={name}
                maxLength={80}
                placeholder="e.g. Ananya Sharma"
                onChange={(e) => setName(e.target.value)}
              />
              <div className="hint">
                <span>Shown on your badge and result card</span>
                <span>{name.trim().length}/80</span>
              </div>
            </div>

            <label className="fl">
              <Icon name="user" /> CHOOSE YOUR AVATAR
            </label>
            <div className="avatars">
              {SEEDS.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`av${avatar === s ? ' sel' : ''}`}
                  onClick={() => setAvatar(s)}
                  aria-label={`Avatar ${s}`}
                >
                  <Avatar seed={s} />
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn"
              onClick={handleStartQuest}
            >
              Start Quest <Icon name="arrow" />
            </button>
          </section>
        )}

        {/* ---------- LEVEL 1 ---------- */}
        {screen === 1 && (
          <section className="screen">
            <div className="eyebrow">LEVEL 1</div>
            <h1>
              Player <em>identity</em>
            </h1>
            <p className="sub">
              Good to meet you, <b>{name.trim()}</b>. A few quick stats and we&apos;re moving.
            </p>

            <div className={`q${age ? ' answered' : ''}${identityErrors.age ? ' err-box' : ''}`}>
              <span className="qn">
                <Icon name="calendar" /> STAT 01
              </span>
              <div className="qt">Your age</div>
              <input
                type="number"
                min={13}
                max={90}
                value={age}
                placeholder="e.g. 19"
                onChange={(e) => {
                  setAge(e.target.value)
                  if (identityErrors.age) setIdentityErrors((prev) => ({ ...prev, age: '' }))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleContinueIdentity()
                }}
              />
              {identityErrors.age && <p className="err">{identityErrors.age}</p>}
            </div>

            <div className={`q${department ? ' answered' : ''}${identityErrors.department ? ' err-box' : ''}`}>
              <span className="qn">
                <Icon name="building" /> STAT 02
              </span>
              <div className="qt">Department</div>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value)
                  if (identityErrors.department) setIdentityErrors((prev) => ({ ...prev, department: '' }))
                }}
              >
                <option value="">— Select your department —</option>
                {meta.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {identityErrors.department && <p className="err">{identityErrors.department}</p>}
            </div>

            <div className={`q${program.trim() ? ' answered' : ''}`}>
              <span className="qn">
                <Icon name="book" /> STAT 03
              </span>
              <div className="qt">Programme</div>
              <input
                type="text"
                value={program}
                placeholder="e.g. B.Tech CSE, BBA, M.Sc Psychology…"
                onChange={(e) => setProgram(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleContinueIdentity()
                }}
              />
            </div>

            <div className={`q${level ? ' answered' : ''}${identityErrors.level ? ' err-box' : ''}`}>
              <span className="qn">
                <Icon name="book" /> STAT 04
              </span>
              <div className="qt">Are you an undergraduate or a postgraduate student?</div>
              <OptionGroup
                options={meta.levels}
                value={level}
                onPick={(v) => {
                  setLevel(v)
                  if (identityErrors.level) setIdentityErrors((prev) => ({ ...prev, level: '' }))
                }}
              />
              {identityErrors.level && <p className="err">{identityErrors.level}</p>}
            </div>

            <div className={`q${semester ? ' answered' : ''}${identityErrors.semester ? ' err-box' : ''}`}>
              <span className="qn">
                <Icon name="calendar" /> STAT 05
              </span>
              <div className="qt">Which semester are you in?</div>
              <div className="picks">
                {meta.semesters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`pick${semester === s ? ' sel' : ''}`}
                    onClick={() => {
                      setSemester(s)
                      if (identityErrors.semester)
                        setIdentityErrors((prev) => ({ ...prev, semester: '' }))
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {identityErrors.semester && <p className="err">{identityErrors.semester}</p>}
            </div>

            <div className={`q${campus ? ' answered' : ''}${identityErrors.campus ? ' err-box' : ''}`}>
              <span className="qn">
                <Icon name="building" /> STAT 06
              </span>
              <div className="qt">Which campus do you belong to?</div>
              <OptionGroup
                options={meta.campuses}
                value={campus}
                onPick={(v) => {
                  setCampus(v)
                  if (identityErrors.campus) setIdentityErrors((prev) => ({ ...prev, campus: '' }))
                }}
              />
              {identityErrors.campus && <p className="err">{identityErrors.campus}</p>}
            </div>

            <button
              type="button"
              className="btn"
              onClick={handleContinueIdentity}
            >
              Continue <Icon name="arrow" />
            </button>
          </section>
        )}


        {/* ---------- LEVEL 2 ---------- */}
        {screen === 2 && (
          <section className="screen">
            <div className="eyebrow">LEVEL 2</div>
            <h1>
              AI <em>usage</em>
            </h1>
            <p className="sub">
              How often do these happen? <b>1 = Never · 5 = Very Often</b>
            </p>
            <LikertBlock
              items={meta.usage_items}
              scale={FREQ}
              tag="QUEST"
              qIcon="bot"
              values={usage}
              onPick={pickUsage}
              lowLabel="Never"
              highLabel="Very often"
            />
            <button
              className="btn"
              disabled={!usageOk}
              onClick={() =>
                advance(3, 'link', 'Level 3 Unlocked', 'Dependency — who is really in control?', 40)
              }
            >
              Continue <Icon name="arrow" />
            </button>
          </section>
        )}

        {/* ---------- LEVEL 3 ---------- */}
        {screen === 3 && (
          <section className="screen">
            <div className="eyebrow">LEVEL 3</div>
            <h1>
              The <em>dependency</em> check
            </h1>
            <p className="sub">
              Be brutally honest, {name.trim().split(' ')[0]}.{' '}
              <b>1 = Strongly Disagree · 5 = Strongly Agree</b>
            </p>
            <LikertBlock
              items={meta.dependency_items}
              scale={AGREE}
              tag="TRUTH"
              qIcon="link"
              values={dependency}
              onPick={pickDep}
              lowLabel="Strongly disagree"
              highLabel="Strongly agree"
            />
            <button
              className="btn"
              disabled={!depOk}
              onClick={() =>
                advance(4, 'clock', 'Final Level Unlocked', 'Experience — your AI track record', 50)
              }
            >
              Continue <Icon name="arrow" />
            </button>
          </section>
        )}

        {/* ---------- LEVEL 4 ---------- */}
        {screen === 4 && (
          <section className="screen">
            <div className="eyebrow">FINAL LEVEL</div>
            <h1>
              Your <em>track record</em>
            </h1>
            <p className="sub">Last stretch — three quick picks and your persona is ready.</p>

            {[
              { k: 'duration', icon: 'clock', label: 'How long have you been using generative AI?' },
              { k: 'daily', icon: 'hourglass', label: 'On average, how much time do you spend using AI per day?' },
              { k: 'tool', icon: 'bot', label: 'Which AI tool do you use most frequently?' },
            ].map((f, i) => (
              <div className={`q${exp[f.k] ? ' answered' : ''}`} key={f.k}>
                <span className="qn">
                  <Icon name={f.icon} /> FINAL {String(i + 1).padStart(2, '0')}
                </span>
                <div className="qt">{f.label}</div>
                <OptionGroup
                  options={meta.experience[f.k]}
                  value={exp[f.k]}
                  onPick={(v) => pickExp(f.k, v)}
                />
              </div>
            ))}

            {submitErr && <p className="err">{submitErr}</p>}
            <button className="btn" disabled={!expOk || submitting} onClick={submit}>
              <Icon name="trophy" />
              {submitting ? 'Scoring…' : 'Reveal My AI Persona'}
            </button>
          </section>
        )}

        {/* ---------- RESULT ---------- */}
        {screen === 5 && result && (
          <ResultCard
            result={result}
            xp={xp}
            bestStreak={bestStreak}
            onToast={fireToast}
          />
        )}

        <div className="foot">
          OFFICE OF ACADEMICS · JAIN (DEEMED-TO-BE UNIVERSITY) · <Link to="/admin">Admin</Link>
        </div>
      </div>

      <LevelUp data={levelUp} />
      <Toast data={toast} />
    </>
  )
}

const PERSONA_INSIGHTS = {
  power: {
    tier: 'Elite AI Strategist',
    tierClass: 'tier-elite',
    superpower: 'Seamless Fluency: You leverage AI naturally across complex academic tasks with high agency.',
    growth: 'Edge Verification: Maintain active vigilance against subtle hallucinations and mentor peers.',
    highlight: 'Top Tier AI Fluency',
  },
  autopilot: {
    tier: 'High-Velocity Operator',
    tierClass: 'tier-speed',
    superpower: 'Rapid Prototyping: You generate ideas and complete tasks fast using modern GenAI tools.',
    growth: 'Cognitive Verification: Validate facts, citations, and logic before accepting AI conclusions.',
    highlight: 'High Speed · Needs Verification',
  },
  critic: {
    tier: 'Analytical Evaluator',
    tierClass: 'tier-critic',
    superpower: 'Cognitive Fortitude: You question and critically assess machine outputs before trusting.',
    growth: 'Hands-on Practice: Experiment with iterative agentic prompting and coding assistants to gain speed.',
    highlight: 'Rare Critical Judgment',
  },
  explorer: {
    tier: 'Emerging Pioneer',
    tierClass: 'tier-explorer',
    superpower: 'Fresh Perspective: Clean slate to build high-standard AI habits and critical literacy.',
    growth: 'Structured Exploration: Integrate tools like ChatGPT, Claude, or Perplexity into daily study routines.',
    highlight: 'High Growth Potential',
  },
}

function ResultCard({ result, xp, bestStreak, onToast }) {
  const [currentAvatar, setCurrentAvatar] = useState(result.avatar || 'Nova')
  const [widths, setWidths] = useState({ u: 0, d: 0, c: 0 })
  const [copied, setCopied] = useState(false)
  const p = result.persona_detail
  const insights = PERSONA_INSIGHTS[result.persona] || PERSONA_INSIGHTS.explorer

  useEffect(() => {
    const t = setTimeout(
      () =>
        setWidths({
          u: Math.min(100, Math.max(0, (result.usage_score / 5) * 100)),
          d: Math.min(100, Math.max(0, (result.dependency_score / 5) * 100)),
          c: Math.min(100, Math.max(0, (result.critical_score / 5) * 100)),
        }),
      300,
    )
    return () => clearTimeout(t)
  }, [result])

  const copySummary = () => {
    const summary = `🎓 AI Pulse Result · JAIN (Deemed-to-be University)\nPlayer: ${result.name} (${result.department})\nPersona: ${p.name} — ${p.tag}\nAI Readiness Score: ${result.readiness}/100 [${insights.tier}]\nUsage: ${result.usage_score}/5 | Dependency: ${result.dependency_score}/5 | Critical Thinking: ${result.critical_score}/5\nEarned: ${xp} XP | Best Streak: ${bestStreak}x`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(summary).then(() => {
        setCopied(true)
        onToast?.('medal', 'Card Copied!', 'Share your verified AI persona result')
        setTimeout(() => setCopied(false), 2600)
      }).catch(() => {
        onToast?.('zap', 'Ready to Share', 'Select and copy your summary')
      })
    }
  }

  const printCard = () => {
    window.print()
  }

  // Gauge calculations (Radius = 54 -> circumference = 339.29)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const gaugeOffset = circumference - (circumference * Math.min(100, Math.max(0, result.readiness))) / 100

  return (
    <section className="screen result-screen-wrapper">
      {/* Ambient background glow matching persona color */}
      <div className="ambient-glow" style={{ background: `radial-gradient(circle, ${p.color}33 0%, transparent 70%)` }} />

      <div className="result-layout" style={{ '--pcolor': p.color }}>
        {/* ================= LEFT: HERO IDENTITY & AVATAR SHOWCASE ================= */}
        <div className="rcard rcard-identity">
          <div className="eyebrow official-pill">
            <Icon name="spark" /> OFFICIAL JAIN OoA CREDENTIAL
          </div>

          <div className="student-profile">
            <div className="student-name">{result.name}</div>
            <div className="student-dept">{result.department}</div>
          </div>

          {/* Big Majestic Hero Avatar */}
          <div className="hero-avatar-area">
            <div className="avatar-energy-ring" />
            <div className="hero-avatar-frame">
              <Avatar seed={currentAvatar} />
            </div>
            <div className="persona-crest" style={{ background: `${p.color}22`, color: p.color, borderColor: p.color }}>
              <Icon name={p.icon} />
            </div>
          </div>

          {/* Persona Header & Tag */}
          <h2 className="persona-title">{p.name}</h2>
          <div className="persona-tagline">{p.tag}</div>

          {/* Interactive Avatar Chooser */}
          <div className="avatar-chooser-shelf">
            <div className="shelf-header">
              <span><Icon name="user" /> Choose Your Avatar</span>
              <span className="current-seed-tag">{currentAvatar}</span>
            </div>
            <div className="avatar-pills-row">
              {AVATAR_SEEDS.map((seed) => (
                <button
                  key={seed}
                  type="button"
                  className={`av-pill-btn${currentAvatar === seed ? ' active' : ''}`}
                  onClick={() => {
                    setCurrentAvatar(seed)
                    onToast?.('spark', `Avatar: ${seed}`, 'Looking sharp!')
                  }}
                  title={`Switch avatar to ${seed}`}
                >
                  <Avatar seed={seed} />
                </button>
              ))}
            </div>
          </div>

          {/* Persona Narrative Card */}
          <div className="narrative-box">
            <p className="narrative-text">{p.desc}</p>
          </div>

          {/* Academic Profile Chips */}
          <div className="meta-chips-row">
            <span className="chip">
              <Icon name="book" />
              {result.program}
            </span>
            {result.semester && (
              <span className="chip">
                <Icon name="calendar" />
                {result.level ? `${result.level} · ` : ''}Semester {result.semester}
              </span>
            )}
            <span className="chip">
              <Icon name="bot" />
              {result.tool || 'Generative AI'}
            </span>
            <span className="chip">
              <Icon name="building" />
              {result.campus ? `${result.campus} campus` : 'JAIN (Deemed-to-be Univ.)'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="identity-actions">
            <button className="btn btn-share" onClick={copySummary}>
              <Icon name={copied ? 'medal' : 'target'} />
              {copied ? 'Summary Copied!' : 'Copy Summary'}
            </button>
            <button className="btn ghost sm" onClick={printCard} title="Print or save as PDF">
              <Icon name="download" /> Save / Print
            </button>
            <button className="btn ghost sm" onClick={() => window.location.reload()}>
              <Icon name="refresh" /> Retake
            </button>
          </div>
        </div>

        {/* ================= RIGHT: READINESS INTELLIGENCE & ANALYTICS ================= */}
        <div className="rcard rcard-intel">
          {/* Top Score Showcase */}
          <div className="score-spotlight-card">
            <div className="gauge-container">
              <svg className="gauge-svg" viewBox="0 0 130 130">
                <circle
                  className="gauge-track"
                  cx="65"
                  cy="65"
                  r={radius}
                />
                <circle
                  className="gauge-progress"
                  cx="65"
                  cy="65"
                  r={radius}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: gaugeOffset,
                    stroke: p.color,
                  }}
                />
              </svg>
              <div className="gauge-text">
                <span className="gauge-val">{result.readiness}</span>
                <span className="gauge-sub">/ 100</span>
              </div>
            </div>

            <div className="score-narrative">
              <div className="tier-badge" style={{ borderColor: p.color, color: p.color, background: `${p.color}15` }}>
                <Icon name="zap" /> {insights.tier}
              </div>
              <h3 className="score-headline">AI Readiness Index</h3>
              <p className="score-subtext">
                Computed from 17 empirical survey indicators balancing daily frequency, critical validation habits, and independent judgment.
              </p>
              <div className="highlight-banner">
                <Icon name="star" /> {insights.highlight}
              </div>
            </div>
          </div>

          {/* Dimensional Analytics Meters */}
          <div className="dimension-section">
            <h4 className="section-title">
              <Icon name="chartUp" /> Core Dimension Breakdown
            </h4>

            <div className="stats-list">
              <StatItem
                label="AI Usage & Frequency"
                icon="bot"
                value={result.usage_score}
                width={widths.u}
                grad="linear-gradient(90deg,#F5A623,#E85C1A)"
                caption={result.usage_score >= 3.5 ? 'Intensive Daily Adopter' : result.usage_score >= 2.5 ? 'Moderate & Pragmatic' : 'Selective / Occasional'}
              />
              <StatItem
                label="Algorithmic Dependency"
                icon="link"
                value={result.dependency_score}
                width={widths.d}
                grad="linear-gradient(90deg,#E85C1A,#B33F0F)"
                caption={result.dependency_score >= 3.5 ? 'High Reliance (Review Recommended)' : result.dependency_score >= 2.0 ? 'Balanced Reliance' : 'Strong Intellectual Independence'}
              />
              <StatItem
                label="Critical Thinking & Verification"
                icon="search"
                value={result.critical_score}
                width={widths.c}
                grad="linear-gradient(90deg,#2E5FD0,#0A2558)"
                caption={result.critical_score >= 3.5 ? 'Sharp Validation Rigor' : result.critical_score >= 2.5 ? 'Active Skepticism' : 'Developing Scrutiny Habits'}
              />
            </div>
          </div>

          {/* Superpowers & Growth Insights */}
          <div className="insights-grid">
            <div className="insight-card superpower">
              <div className="insight-header">
                <span className="insight-icon" style={{ background: '#fdeee3', color: '#e85c1a' }}>
                  <Icon name="spark" />
                </span>
                <b>Your Superpower</b>
              </div>
              <p>{insights.superpower}</p>
            </div>

            <div className="insight-card growth">
              <div className="insight-header">
                <span className="insight-icon" style={{ background: '#eef2ff', color: '#2e5fd0' }}>
                  <Icon name="target" />
                </span>
                <b>Growth Edge</b>
              </div>
              <p>{insights.growth}</p>
            </div>
          </div>

          {/* XP & Gamification Footer */}
          <div className="trow quest-achievements-row">
            <span className="tk">
              <Icon name="trophy" /> {xp} Quest XP
            </span>
            {bestStreak >= 2 && (
              <span className="tk alt">
                <Icon name="flame" /> Best Streak {bestStreak}x
              </span>
            )}
            <span className="tk certified-tk">
              <Icon name="medal" /> Level 4 Certified
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatItem({ label, icon, value, width, grad, caption }) {
  return (
    <div className="st-item">
      <div className="st-head">
        <span className="st-label">
          <Icon name={icon} />
          {label}
        </span>
        <span className="st-score">
          <b>{value.toFixed(1)}</b> / 5.0
        </span>
      </div>
      <div className="st-bar-track">
        <div className="st-bar-fill" style={{ width: `${width}%`, background: grad }} />
      </div>
      {caption && <div className="st-caption">{caption}</div>}
    </div>
  )
}

