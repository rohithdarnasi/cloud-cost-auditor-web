import { useState } from 'react'
import { runMockAudit } from './lib/mockData.js'

// ─── Design tokens ────────────────────────────────────────────────────────────
const SEVERITY = {
  high:   { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444', label: 'HIGH'   },
  medium: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B', label: 'MEDIUM' },
  low:    { bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E', label: 'LOW'    },
}

const CHECK_ICONS = {
  'Unattached EBS Volume':  '🗄️',
  'Unused Elastic IP':      '🌐',
  'Idle EC2 Instance':      '💻',
  'Stale EBS Snapshot':     '📸',
}

// ─── Styles (all inline — no CSS file needed, easier to copy/deploy) ──────────
const S = {
  page: {
    minHeight: '100vh',
    background: '#F8FAFC',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#0F172A',
    margin: 0,
  },
  nav: {
    background: '#fff',
    borderBottom: '1px solid #E2E8F0',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    height: 56,
    gap: 8,
  },
  navLogo: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  navBadge: {
    fontSize: 11,
    fontWeight: 500,
    background: '#EFF6FF',
    color: '#2563EB',
    padding: '2px 8px',
    borderRadius: 99,
    letterSpacing: '0.04em',
  },
  hero: {
    background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
    padding: '64px 32px',
    textAlign: 'center',
    color: '#fff',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.12em',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  heroH1: {
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
    margin: '0 0 16px',
  },
  heroAccent: { color: '#38BDF8' },
  heroSub: {
    fontSize: 16,
    color: '#94A3B8',
    maxWidth: 520,
    margin: '0 auto 40px',
    lineHeight: 1.6,
  },
  modeRow: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  modeCard: (active) => ({
    background: active ? '#fff' : 'rgba(255,255,255,0.06)',
    border: `2px solid ${active ? '#38BDF8' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 12,
    padding: '20px 28px',
    cursor: 'pointer',
    width: 220,
    textAlign: 'left',
    transition: 'all 0.15s ease',
    color: active ? '#0F172A' : '#E2E8F0',
  }),
  modeCardTitle: (active) => ({
    fontWeight: 600,
    fontSize: 15,
    marginBottom: 4,
    color: active ? '#0F172A' : '#F1F5F9',
  }),
  modeCardDesc: (active) => ({
    fontSize: 12,
    color: active ? '#64748B' : '#94A3B8',
    lineHeight: 1.4,
  }),
  modeDot: (active) => ({
    width: 8, height: 8, borderRadius: '50%',
    background: active ? '#38BDF8' : '#475569',
    display: 'inline-block',
    marginRight: 8,
    verticalAlign: 'middle',
  }),
  main: { maxWidth: 960, margin: '0 auto', padding: '40px 24px' },
  card: {
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    padding: '28px 32px',
    marginBottom: 24,
  },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 20, color: '#0F172A' },
  securityNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 20,
    fontSize: 13,
    color: '#15803D',
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "'JetBrains Mono', monospace",
    background: '#F9FAFB',
    color: '#0F172A',
    boxSizing: 'border-box',
    outline: 'none',
    letterSpacing: '0.02em',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  select: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    background: '#F9FAFB',
    color: '#0F172A',
    boxSizing: 'border-box',
    outline: 'none',
  },
  btnPrimary: (disabled) => ({
    background: disabled ? '#94A3B8' : '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '11px 28px',
    fontSize: 14,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  }),
  btnGhost: {
    background: 'transparent',
    color: '#64748B',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 14,
    cursor: 'pointer',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: (accent) => ({
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    padding: '20px 24px',
    borderTop: `3px solid ${accent}`,
  }),
  statVal: { fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: '#64748B',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E2E8F0',
    background: '#F8FAFC',
  },
  td: { padding: '14px 16px', borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' },
  badge: (sev) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: SEVERITY[sev]?.bg || '#F1F5F9',
    color: SEVERITY[sev]?.text || '#374151',
    padding: '3px 10px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
  }),
  cost: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 13 },
  empty: { textAlign: 'center', padding: '48px 24px', color: '#64748B' },
  error: {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 8,
    padding: '14px 18px',
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 20,
  },
  progress: { textAlign: 'center', padding: '48px 24px' },
  spinner: {
    width: 40, height: 40,
    border: '3px solid #E2E8F0',
    borderTop: '3px solid #2563EB',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
  mockBanner: {
    background: '#FFF7ED',
    border: '1px solid #FED7AA',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 13,
    color: '#C2410C',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
}

const REGIONS = [
  'us-east-1','us-east-2','us-west-1','us-west-2',
  'eu-west-1','eu-west-2','eu-central-1',
  'ap-southeast-1','ap-southeast-2','ap-northeast-1',
]

// ─── Components ───────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const s = SEVERITY[severity] || SEVERITY.low
  return (
    <span style={S.badge(severity)}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function StatCard({ value, label, accent = '#2563EB' }) {
  return (
    <div style={S.statCard(accent)}>
      <div style={S.statVal}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  )
}

function ResultsDashboard({ result, onReset }) {
  const { findings, totalMonthly, totalAnnual, region, isMock } = result
  const high   = findings.filter(f => f.severity === 'high').length
  const medium = findings.filter(f => f.severity === 'medium').length

  return (
    <div>
      {isMock && (
        <div style={S.mockBanner}>
          ⚠️ <strong>Mock data</strong> — these findings are sample data, not your real AWS account.
        </div>
      )}

      <div style={S.statsRow}>
        <StatCard value={findings.length} label="Total findings" accent="#2563EB" />
        <StatCard value={`$${totalMonthly.toFixed(2)}`} label="Est. waste / month" accent="#EF4444" />
        <StatCard value={`$${totalAnnual.toFixed(2)}`} label="Est. waste / year" accent="#F59E0B" />
        <StatCard value={high} label="High severity" accent="#EF4444" />
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={S.cardTitle}>
            Findings {!isMock && <span style={{ fontSize: 12, color: '#64748B', fontWeight: 400 }}>— {region}</span>}
          </div>
          <button style={S.btnGhost} onClick={onReset}>← New Scan</button>
        </div>

        {findings.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>No waste detected</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Your account looks clean for this region.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Check</th>
                  <th style={S.th}>Resource ID</th>
                  <th style={S.th}>Detail</th>
                  <th style={S.th}>Est. $/mo</th>
                  <th style={S.th}>Severity</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={S.td}>
                      <span style={{ marginRight: 6 }}>{CHECK_ICONS[f.check] || '⚠️'}</span>
                      {f.check}
                    </td>
                    <td style={{ ...S.td, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#475569' }}>
                      {f.resourceId}
                    </td>
                    <td style={{ ...S.td, color: '#475569', maxWidth: 280 }}>{f.detail}</td>
                    <td style={{ ...S.td, ...S.cost, color: '#DC2626' }}>${f.monthlyCost.toFixed(2)}</td>
                    <td style={S.td}><SeverityBadge severity={f.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]         = useState('mock')       // 'mock' | 'real'
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const [creds, setCreds]       = useState({ accessKeyId: '', secretAccessKey: '', region: 'us-east-1' })

  const handleMockScan = async () => {
    setLoading(true)
    setError(null)
    await new Promise(r => setTimeout(r, 900)) // slight delay for UX realism
    setResult(runMockAudit())
    setLoading(false)
  }

  const handleRealScan = async () => {
    if (!creds.accessKeyId || !creds.secretAccessKey) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setResult(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const reset = () => { setResult(null); setError(null) }

  return (
    <div style={S.page}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        button:hover:not(:disabled) { filter: brightness(1.08); }`}
      </style>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.navLogo}>
          <span>☁️</span>
          <span>Cloud Cost Auditor</span>
        </div>
        <span style={S.navBadge}>FinOps</span>
      </nav>

      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroEyebrow}>AWS Waste Scanner</div>
        <h1 style={S.heroH1}>
          Find what's quietly<br />
          <span style={S.heroAccent}>costing you money</span>
        </h1>
        <p style={S.heroSub}>
          Scans your AWS account for unattached EBS volumes, unused Elastic IPs,
          idle EC2 instances, and orphaned snapshots — with estimated monthly cost.
        </p>

        {/* Mode selector */}
        <div style={S.modeRow}>
          {[
            { id: 'mock', title: 'Try with mock data', desc: 'No AWS account needed. Explore with realistic sample findings.' },
            { id: 'real', title: 'Scan your AWS account', desc: 'Enter read-only credentials. Credentials never stored.' },
          ].map(m => (
            <div key={m.id} style={S.modeCard(mode === m.id)} onClick={() => { setMode(m.id); reset() }}>
              <div style={S.modeCardTitle(mode === m.id)}>
                <span style={S.modeDot(mode === m.id)} />
                {m.title}
              </div>
              <div style={S.modeCardDesc(mode === m.id)}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main style={S.main}>

        {/* Loading */}
        {loading && (
          <div style={S.progress}>
            <div style={S.spinner} />
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Scanning{mode === 'real' ? ` ${creds.region}` : ' mock data'}…</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Checking EBS volumes, Elastic IPs, EC2 instances, snapshots</div>
          </div>
        )}

        {/* Results */}
        {!loading && result && <ResultsDashboard result={result} onReset={reset} />}

        {/* Forms */}
        {!loading && !result && (
          <>
            {error && <div style={S.error}>⚠️ {error}</div>}

            {mode === 'mock' && (
              <div style={S.card}>
                <div style={S.cardTitle}>Mock Scan</div>
                <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
                  Runs the full audit pipeline against realistic sample data — two unattached volumes,
                  two idle EC2 instances, two unused Elastic IPs, and two orphaned snapshots.
                  Use this to explore the dashboard before connecting a real account.
                </p>
                <button style={S.btnPrimary(false)} onClick={handleMockScan}>
                  Run mock scan →
                </button>
              </div>
            )}

            {mode === 'real' && (
              <div style={S.card}>
                <div style={S.cardTitle}>Connect your AWS account</div>

                <div style={S.securityNote}>
                  <span>🔒</span>
                  <span>
                    <strong>Credentials are never stored or logged.</strong> They're sent over HTTPS,
                    used for a single read-only API call, then discarded. We recommend using a
                    temporary IAM user with only the permissions listed below.
                  </span>
                </div>

                <div style={S.formGrid}>
                  <div>
                    <label style={S.label}>Access Key ID</label>
                    <input
                      style={S.input}
                      type="text"
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      value={creds.accessKeyId}
                      onChange={e => setCreds(c => ({ ...c, accessKeyId: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Secret Access Key</label>
                    <input
                      style={S.input}
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••••"
                      value={creds.secretAccessKey}
                      onChange={e => setCreds(c => ({ ...c, secretAccessKey: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Region to scan</label>
                  <select style={{ ...S.select, width: 220 }} value={creds.region} onChange={e => setCreds(c => ({ ...c, region: e.target.value }))}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 20, padding: '14px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Required IAM permissions (read-only)</div>
                  <code style={{ fontSize: 12, color: '#475569', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
                    ec2:DescribeVolumes · ec2:DescribeAddresses<br />
                    ec2:DescribeInstances · ec2:DescribeSnapshots<br />
                    cloudwatch:GetMetricStatistics
                  </code>
                </div>

                <button
                  style={S.btnPrimary(!creds.accessKeyId || !creds.secretAccessKey)}
                  disabled={!creds.accessKeyId || !creds.secretAccessKey}
                  onClick={handleRealScan}
                >
                  Scan {creds.region} →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
