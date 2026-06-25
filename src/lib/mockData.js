const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

// --- Pricing helpers (same logic as CLI) ---
const EBS_PRICE = { gp2: 0.10, gp3: 0.08, io1: 0.125, io2: 0.125, st1: 0.045, sc1: 0.015, standard: 0.05 }
const EC2_HOURLY = { t2: 0.0116, t3: 0.0104, t3a: 0.0094, m5: 0.096, m6i: 0.096, c5: 0.085, r5: 0.126 }
const SNAPSHOT_RATE = 0.05
const EIP_HOURLY = 0.005
const r2 = (n) => Math.round(n * 100) / 100

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

// --- Raw mock fixtures ---
const VOLUMES = [
  { VolumeId: 'vol-0a1b2c3d4e5f60001', Size: 100, VolumeType: 'gp3', State: 'available', CreateTime: daysAgo(120), Attachments: [] },
  { VolumeId: 'vol-0a1b2c3d4e5f60002', Size: 50,  VolumeType: 'gp2', State: 'available', CreateTime: daysAgo(45),  Attachments: [] },
  { VolumeId: 'vol-0a1b2c3d4e5f60003', Size: 200, VolumeType: 'io1', State: 'in-use',   CreateTime: daysAgo(300), Attachments: [{ InstanceId: 'i-0aaaa1111bbbb2222' }] },
]
const ADDRESSES = [
  { PublicIp: '52.14.22.101', AllocationId: 'eipalloc-0001', AssociationId: null,            InstanceId: null },
  { PublicIp: '52.14.22.102', AllocationId: 'eipalloc-0002', AssociationId: 'eipassoc-0002', InstanceId: 'i-0aaaa1111bbbb2222' },
  { PublicIp: '52.14.22.103', AllocationId: 'eipalloc-0003', AssociationId: null,            InstanceId: null },
]
const INSTANCES = [
  { InstanceId: 'i-0aaaa1111bbbb2222', InstanceType: 't3.large',  Tags: [{ Key: 'Name', Value: 'staging-api-server'  }], LaunchTime: daysAgo(200) },
  { InstanceId: 'i-0ccccc333dddd4444', InstanceType: 'm5.xlarge', Tags: [{ Key: 'Name', Value: 'forgotten-batch-job' }], LaunchTime: daysAgo(95)  },
  { InstanceId: 'i-0eeeee555ffff6666', InstanceType: 'c5.large',  Tags: [{ Key: 'Name', Value: 'prod-worker-3'       }], LaunchTime: daysAgo(400) },
]
const CPU_STATS = {
  'i-0aaaa1111bbbb2222': [1.2, 0.8, 1.5],
  'i-0ccccc333dddd4444': [2.1, 0.4, 1.9],
  'i-0eeeee555ffff6666': [62.0, 71.4, 58.9],
}
const SNAPSHOTS = [
  { SnapshotId: 'snap-0011aabb', VolumeId: 'vol-deleted-0001',       VolumeSize: 80,  StartTime: daysAgo(180) },
  { SnapshotId: 'snap-0022ccdd', VolumeId: 'vol-0a1b2c3d4e5f60003',  VolumeSize: 200, StartTime: daysAgo(10)  },
  { SnapshotId: 'snap-0033eeff', VolumeId: 'vol-deleted-0002',       VolumeSize: 40,  StartTime: daysAgo(400) },
]

// --- Check functions (browser-side, no SDK) ---
function checkUnattachedVolumes() {
  return VOLUMES.filter(v => v.State === 'available').map(v => {
    const cost = r2((EBS_PRICE[v.VolumeType] ?? 0.08) * v.Size)
    return {
      check: 'Unattached EBS Volume',
      resourceId: v.VolumeId,
      detail: `${v.Size} GB ${v.VolumeType.toUpperCase()}, idle ${daysSince(v.CreateTime)}d`,
      monthlyCost: cost,
      severity: cost > 10 ? 'high' : 'medium',
      region: 'us-east-1 (mock)',
    }
  })
}

function checkUnusedElasticIPs() {
  const cost = r2(EIP_HOURLY * 730)
  return ADDRESSES.filter(a => !a.AssociationId).map(a => ({
    check: 'Unused Elastic IP',
    resourceId: a.AllocationId || a.PublicIp,
    detail: `${a.PublicIp} — not attached to any instance`,
    monthlyCost: cost,
    severity: 'medium',
    region: 'us-east-1 (mock)',
  }))
}

function checkIdleInstances(cpuThreshold = 5) {
  return INSTANCES.flatMap(inst => {
    const points = CPU_STATS[inst.InstanceId]
    if (!points) return []
    const avg = points.reduce((s, p) => s + p, 0) / points.length
    if (avg >= cpuThreshold) return []
    const family = inst.InstanceType.split('.')[0]
    const cost = r2((EC2_HOURLY[family] ?? 0.05) * 730)
    const name = inst.Tags?.find(t => t.Key === 'Name')?.Value || '(unnamed)'
    return [{
      check: 'Idle EC2 Instance',
      resourceId: inst.InstanceId,
      detail: `${name} · ${inst.InstanceType} · avg CPU ${avg.toFixed(1)}% over 14d`,
      monthlyCost: cost,
      severity: cost > 50 ? 'high' : 'medium',
      region: 'us-east-1 (mock)',
    }]
  })
}

function checkStaleSnapshots(staleDays = 90) {
  const liveVols = new Set(VOLUMES.map(v => v.VolumeId))
  return SNAPSHOTS.filter(s => !liveVols.has(s.VolumeId) && daysSince(s.StartTime) >= staleDays).map(s => {
    const cost = r2(SNAPSHOT_RATE * s.VolumeSize)
    return {
      check: 'Stale EBS Snapshot',
      resourceId: s.SnapshotId,
      detail: `${s.VolumeSize} GB, ${daysSince(s.StartTime)}d old, source volume deleted`,
      monthlyCost: cost,
      severity: cost > 5 ? 'medium' : 'low',
      region: 'us-east-1 (mock)',
    }
  })
}

export function runMockAudit() {
  const findings = [
    ...checkUnattachedVolumes(),
    ...checkUnusedElasticIPs(),
    ...checkIdleInstances(),
    ...checkStaleSnapshots(),
  ].sort((a, b) => b.monthlyCost - a.monthlyCost)

  const totalMonthly = r2(findings.reduce((s, f) => s + f.monthlyCost, 0))
  return { findings, totalMonthly, totalAnnual: r2(totalMonthly * 12), region: 'mock', isMock: true }
}
