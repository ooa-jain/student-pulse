import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import Decor from '../components/Decor'
import { Icon } from '../lib/icons'
import { api, downloadCsv, setToken } from '../lib/api'
import {
  CAT,
  GRID,
  MUTED,
  PERSONA_COLOR,
  SEQ,
  axisStyle,
  tooltipStyle,
} from '../lib/chart'

const TABS = [
  ['overview', 'Overview'],
  ['analysis', 'Analysis'],
  ['responses', 'Responses'],
]

export default function AdminDashboard({ username, onLogout }) {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(true)

  const load = useCallback(() => {
    setBusy(true)
    api
      .stats()
      .then((s) => {
        setStats(s)
        setErr('')
      })
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false))
  }, [])

  useEffect(load, [load])

  const logout = () => {
    setToken(null)
    onLogout()
  }

  return (
    <div className="admin">
      <Decor />
      <div className="admin-wrap">
        <div className="abar">
          <div className="brand">
            AI <em>Pulse</em>
          </div>
          <div className="tabs">
            {TABS.map(([k, label]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="spacer" />
          <span style={{ fontSize: '.74rem', fontWeight: 700, color: MUTED }}>
            <Icon name="shield" /> {username}
          </span>
          <button className="btn ghost sm" onClick={load} disabled={busy}>
            <Icon name="refresh" /> Refresh
          </button>
          <button className="btn ghost sm" onClick={logout}>
            <Icon name="logout" /> Sign out
          </button>
        </div>

        {err && (
          <div className="panel">
            <p className="err">{err}</p>
          </div>
        )}

        {busy && !stats && (
          <div className="empty">
            <div className="spin" />
            Crunching the numbers…
          </div>
        )}

        {stats && tab === 'overview' && <Overview stats={stats} />}
        {stats && tab === 'analysis' && <Analysis stats={stats} />}
        {stats && tab === 'responses' && <Responses departments={stats.departments} />}

        <div className="foot">
          <Link to="/">← Back to the survey</Link>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function Overview({ stats }) {
  const personaData = stats.personas.map((p) => ({
    ...p,
    color: PERSONA_COLOR[p.key] || SEQ,
  }))

  const topDepts = stats.departments.slice(0, 10).map((d) => ({
    ...d,
    short: d.label.replace(/^Department of /, '').replace(/^Office of /, 'Office · '),
  }))

  if (stats.total === 0)
    return (
      <div className="empty">
        <Icon name="bot" style={{ width: 32, height: 32, marginBottom: 12 }} />
        <p>No responses yet. Share the survey link and this dashboard fills itself.</p>
      </div>
    )

  return (
    <>
      <div className="kpis">
        <Kpi icon="users" label="Total responses" value={stats.total} note={`${stats.today} today · ${stats.last7} in 7 days`} />
        <Kpi icon="spark" label="Avg readiness" value={stats.averages.readiness} note="out of 100" />
        <Kpi icon="bot" label="Avg AI usage" value={stats.averages.usage} note="mean of 5 items · out of 5" />
        <Kpi icon="search" label="Avg critical thinking" value={stats.averages.critical} note="verify + evaluate + confidence" />
        <Kpi icon="link" label="Avg dependency" value={stats.averages.dependency} note="lower is healthier" />
      </div>

      <div className="panels">
        <div className="panel">
          <h3>Persona distribution</h3>
          <p className="ph">
            Where students land on the usage × critical-thinking quadrant. Counts labelled on
            each bar.
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={personaData} layout="vertical" margin={{ left: 8, right: 44, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={124}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v, _n, p) => [`${v} students (${p.payload.pct}%)`, 'Responses']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
                {personaData.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
                <LabelList
                  dataKey="pct"
                  position="right"
                  formatter={(v) => `${v}%`}
                  style={{ fontSize: 11, fontWeight: 800, fill: MUTED }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3>Responses over time</h3>
          <p className="ph">Daily submissions, most recent 90 days.</p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={stats.timeline} margin={{ left: -18, right: 12, top: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="tl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SEQ} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SEQ} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ stroke: MUTED, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="count" stroke={SEQ} strokeWidth={2} fill="url(#tl)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel full">
          <h3>Top departments</h3>
          <p className="ph">Ten departments with the most responses, with their mean readiness.</p>
          <ResponsiveContainer width="100%" height={Math.max(240, topDepts.length * 34)}>
            <BarChart data={topDepts} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="short"
                width={220}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v, _n, p) => [
                  `${v} responses · readiness ${p.payload.readiness}`,
                  p.payload.label,
                ]}
              />
              <Bar dataKey="count" fill={SEQ} radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 800, fill: MUTED }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

function Analysis({ stats }) {
  if (stats.total === 0) return <div className="empty">Nothing to analyse yet.</div>

  const share = (rows) => rows.map((r, i) => ({ ...r, color: CAT[i % CAT.length] }))

  return (
    <>
      <div className="kpis">
        <Kpi
          icon="shield"
          label="AI-ready"
          value={stats.risk.ai_ready}
          note={`${pct(stats.risk.ai_ready, stats.total)} are Power Users`}
        />
        <Kpi
          icon="link"
          label="High dependency"
          value={stats.risk.high_dependency}
          note={`${pct(stats.risk.high_dependency, stats.total)} score ≥ 4 / 5`}
        />
        <Kpi
          icon="search"
          label="Low critical thinking"
          value={stats.risk.low_critical}
          note={`${pct(stats.risk.low_critical, stats.total)} score < 3 / 5`}
        />
        <Kpi icon="calendar" label="Mean age" value={stats.averages.age} note="years" />
      </div>

      <div className="panels">
        <div className="panel full">
          <h3>AI usage — item means</h3>
          <p className="ph">Average agreement per statement (1 = never, 5 = very often).</p>
          {stats.usage_items.map((it) => (
            <ItemBar key={it.item} item={it} />
          ))}
        </div>

        <div className="panel full">
          <h3>Dependency &amp; critical thinking — item means</h3>
          <p className="ph">
            Items 2, 5 and 6 are the critical-thinking scale; items 1, 3 and 4 are the
            dependency scale (1 = strongly disagree, 5 = strongly agree).
          </p>
          {stats.dependency_items.map((it) => (
            <ItemBar key={it.item} item={it} />
          ))}
        </div>

        <div className="panel">
          <h3>Most-used tool</h3>
          <p className="ph">Share of respondents naming each tool as their primary one.</p>
          <SimpleBar data={share(stats.tools)} suffix="%" valueKey="pct" countKey="count" />
        </div>

        <div className="panel">
          <h3>Time on AI per day</h3>
          <p className="ph">Self-reported daily time spent with generative AI.</p>
          <SimpleBar data={stats.daily_time.map((d) => ({ ...d, color: SEQ }))} valueKey="count" countKey="count" />
        </div>

        <div className="panel">
          <h3>Experience with generative AI</h3>
          <p className="ph">How long students have been using these tools.</p>
          <SimpleBar data={stats.durations.map((d) => ({ ...d, color: SEQ }))} valueKey="count" countKey="count" />
        </div>

        <div className="panel">
          <h3>Age bands</h3>
          <p className="ph">Distribution of respondent age.</p>
          <SimpleBar data={stats.age_bands.map((d) => ({ ...d, color: SEQ }))} valueKey="count" countKey="count" />
        </div>

        <div className="panel full">
          <h3>Department scorecard</h3>
          <p className="ph">
            Mean usage, critical thinking and readiness per department. Sorted by response
            count.
          </p>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Responses</th>
                  <th>Usage /5</th>
                  <th>Critical /5</th>
                  <th>Readiness /100</th>
                </tr>
              </thead>
              <tbody>
                {stats.departments.map((d) => (
                  <tr key={d.label}>
                    <td style={{ whiteSpace: 'normal', minWidth: 260 }}>{d.label}</td>
                    <td>{d.count}</td>
                    <td>{d.usage}</td>
                    <td>{d.critical}</td>
                    <td>
                      <b style={{ color: SEQ }}>{d.readiness}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function ItemBar({ item }) {
  return (
    <div className="itembar">
      <div className="txt">
        <span>{item.item}</span>
        <b>{item.mean.toFixed(2)}</b>
      </div>
      <div className="track">
        <div className="val" style={{ width: `${(item.mean / 5) * 100}%` }} />
      </div>
    </div>
  )
}

function SimpleBar({ data, valueKey = 'count', countKey = 'count', suffix = '' }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(v, _n, p) => [`${p.payload[countKey]} responses`, p.payload.label]}
        />
        <Bar dataKey={valueKey} radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((d, i) => (
            <Cell key={d.label + i} fill={d.color || SEQ} />
          ))}
          <LabelList
            dataKey={valueKey}
            position="right"
            formatter={(v) => `${v}${suffix}`}
            style={{ fontSize: 11, fontWeight: 800, fill: MUTED }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ */
/* Responses table                                                     */
/* ------------------------------------------------------------------ */

function Responses({ departments }) {
  const [q, setQ] = useState('')
  const [department, setDepartment] = useState('')
  const [persona, setPersona] = useState('')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState(-1)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [exporting, setExporting] = useState(false)

  const params = useMemo(
    () => ({ q, department, persona, sort, order, page, page_size: pageSize }),
    [q, department, persona, sort, order, page, pageSize],
  )

  useEffect(() => {
    let alive = true
    setBusy(true)
    const t = setTimeout(() => {
      api
        .responses(params)
        .then((d) => alive && setData(d))
        .catch((e) => alive && setErr(e.message))
        .finally(() => alive && setBusy(false))
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [params])

  const toggleSort = (key) => {
    if (sort === key) setOrder((o) => -o)
    else {
      setSort(key)
      setOrder(-1)
    }
    setPage(1)
  }

  const doExport = async (anon) => {
    setExporting(true)
    try {
      await downloadCsv(anon)
    } catch (e) {
      setErr(e.message)
    } finally {
      setExporting(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this response permanently?')) return
    try {
      await api.remove(id)
      setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== id), total: d.total - 1 }))
    } catch (e) {
      setErr(e.message)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1

  return (
    <div className="panel full">
      <h3>All responses</h3>
      <p className="ph">
        Every submission, newest first. Export the full sheet, or an anonymised copy where
        names are replaced with respondent codes.
      </p>

      <div className="filters">
        <input
          placeholder="Search name, programme, department or campus…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
        />
        <select
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.label} value={d.label}>
              {d.label} ({d.count})
            </option>
          ))}
        </select>
        <select
          value={persona}
          onChange={(e) => {
            setPersona(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All personas</option>
          <option value="power">AI Power User</option>
          <option value="autopilot">AI Autopilot</option>
          <option value="critic">Cautious Critic</option>
          <option value="explorer">AI Explorer</option>
        </select>
        <button className="btn ghost sm" disabled={exporting} onClick={() => doExport(false)}>
          <Icon name="download" /> CSV
        </button>
        <button className="btn ghost sm" disabled={exporting} onClick={() => doExport(true)}>
          <Icon name="shield" /> CSV (anonymised)
        </button>
      </div>

      {err && <p className="err">{err}</p>}

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <Th k="name" sort={sort} order={order} on={toggleSort}>Name</Th>
              <Th k="age" sort={sort} order={order} on={toggleSort}>Age</Th>
              <Th k="department" sort={sort} order={order} on={toggleSort}>Department</Th>
              <th>Programme</th>
              <Th k="level" sort={sort} order={order} on={toggleSort}>Level</Th>
              <Th k="semester" sort={sort} order={order} on={toggleSort}>Sem.</Th>
              <Th k="campus" sort={sort} order={order} on={toggleSort}>Campus</Th>
              <Th k="usage_score" sort={sort} order={order} on={toggleSort}>Usage</Th>
              <Th k="dependency_score" sort={sort} order={order} on={toggleSort}>Dep.</Th>
              <Th k="critical_score" sort={sort} order={order} on={toggleSort}>Critical</Th>
              <Th k="readiness" sort={sort} order={order} on={toggleSort}>Readiness</Th>
              <th>Persona</th>
              <th>Tool</th>
              <Th k="created_at" sort={sort} order={order} on={toggleSort}>Submitted</Th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.items?.length ? (
              data.items.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.age}</td>
                  <td style={{ whiteSpace: 'normal', minWidth: 200 }}>{r.department}</td>
                  <td>{r.program}</td>
                  <td>{r.level || '—'}</td>
                  <td>{r.semester || '—'}</td>
                  <td>{r.campus || '—'}</td>
                  <td>{r.usage_score}</td>
                  <td>{r.dependency_score}</td>
                  <td>{r.critical_score}</td>
                  <td>
                    <b style={{ color: SEQ }}>{r.readiness}</b>
                  </td>
                  <td>
                    <span
                      className="pill"
                      style={{ background: PERSONA_COLOR[r.persona] || MUTED }}
                    >
                      {r.persona}
                    </span>
                  </td>
                  <td>{r.tool}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <button className="iconbtn" onClick={() => remove(r.id)} title="Delete">
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={15} style={{ textAlign: 'center', padding: 40, color: MUTED }}>
                  {busy ? 'Loading…' : 'No responses match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <span>
          {data?.total ?? 0} responses · page {page} of {pages}
        </span>
        <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <button className="btn ghost sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

function Th({ k, sort, order, on, children }) {
  return (
    <th onClick={() => on(k)}>
      {children}
      {sort === k ? (order > 0 ? ' ▲' : ' ▼') : ''}
    </th>
  )
}

function Kpi({ icon, label, value, note }) {
  return (
    <div className="kpi">
      <div className="k">
        <Icon name={icon} /> {label}
      </div>
      <div className="v">{value}</div>
      <div className="n">{note}</div>
    </div>
  )
}

const pct = (n, total) => (total ? `${((n / total) * 100).toFixed(1)}%` : '0%')
