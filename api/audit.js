import { EC2Client, DescribeVolumesCommand, DescribeAddressesCommand, DescribeInstancesCommand, DescribeSnapshotsCommand } from '@aws-sdk/client-ec2'
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'

// --- Pricing ---
const EBS_PRICE   = { gp2: 0.10, gp3: 0.08, io1: 0.125, io2: 0.125, st1: 0.045, sc1: 0.015, standard: 0.05 }
const EC2_HOURLY  = { t2: 0.0116, t3: 0.0104, t3a: 0.0094, m5: 0.096, m6i: 0.096, c5: 0.085, r5: 0.126 }
const EIP_HOURLY  = 0.005
const SNAP_RATE   = 0.05
const r2 = (n) => Math.round(n * 100) / 100
const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { accessKeyId, secretAccessKey, region = 'us-east-1' } = req.body ?? {}

  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'accessKeyId and secretAccessKey are required' })
  }

  // Credentials used here, in memory, for this request only.
  // They are never written to disk, logs, or any database.
  const credentials = { accessKeyId: accessKeyId.trim(), secretAccessKey: secretAccessKey.trim() }
  const ec2 = new EC2Client({ region, credentials })
  const cw  = new CloudWatchClient({ region, credentials })

  try {
    const [volumes, addresses, reservations, snapshots] = await Promise.all([
      ec2.send(new DescribeVolumesCommand({})).then(r => r.Volumes ?? []),
      ec2.send(new DescribeAddressesCommand({})).then(r => r.Addresses ?? []),
      ec2.send(new DescribeInstancesCommand({ Filters: [{ Name: 'instance-state-name', Values: ['running'] }] })).then(r => r.Reservations ?? []),
      ec2.send(new DescribeSnapshotsCommand({ OwnerIds: ['self'] })).then(r => r.Snapshots ?? []),
    ])

    const instances = reservations.flatMap(r => r.Instances ?? [])
    const liveVolIds = new Set(volumes.map(v => v.VolumeId))

    // Unattached EBS
    const volumeFindings = volumes
      .filter(v => v.State === 'available')
      .map(v => {
        const cost = r2((EBS_PRICE[v.VolumeType] ?? 0.08) * v.Size)
        return { check: 'Unattached EBS Volume', resourceId: v.VolumeId, detail: `${v.Size} GB ${(v.VolumeType||'').toUpperCase()}, idle ${daysSince(v.CreateTime)}d`, monthlyCost: cost, severity: cost > 10 ? 'high' : 'medium', region }
      })

    // Unused EIPs
    const eipCost = r2(EIP_HOURLY * 730)
    const eipFindings = addresses
      .filter(a => !a.AssociationId)
      .map(a => ({ check: 'Unused Elastic IP', resourceId: a.AllocationId || a.PublicIp, detail: `${a.PublicIp} — not attached to any instance`, monthlyCost: eipCost, severity: 'medium', region }))

    // Idle EC2 — parallel CloudWatch lookups
    const idleFindings = (await Promise.all(instances.map(async inst => {
      try {
        const end = new Date(), start = new Date(end - 14 * 86400000)
        const cwr = await cw.send(new GetMetricStatisticsCommand({
          Namespace: 'AWS/EC2', MetricName: 'CPUUtilization',
          Dimensions: [{ Name: 'InstanceId', Value: inst.InstanceId }],
          StartTime: start, EndTime: end, Period: 86400, Statistics: ['Average'],
        }))
        const pts = cwr.Datapoints ?? []
        if (!pts.length) return null
        const avg = pts.reduce((s, p) => s + p.Average, 0) / pts.length
        if (avg >= 5) return null
        const family = inst.InstanceType.split('.')[0]
        const cost = r2((EC2_HOURLY[family] ?? 0.05) * 730)
        const name = inst.Tags?.find(t => t.Key === 'Name')?.Value || '(unnamed)'
        return { check: 'Idle EC2 Instance', resourceId: inst.InstanceId, detail: `${name} · ${inst.InstanceType} · avg CPU ${avg.toFixed(1)}% over 14d`, monthlyCost: cost, severity: cost > 50 ? 'high' : 'medium', region }
      } catch { return null }
    }))).filter(Boolean)

    // Stale snapshots
    const snapFindings = snapshots
      .filter(s => !liveVolIds.has(s.VolumeId) && daysSince(s.StartTime) >= 90)
      .map(s => {
        const cost = r2(SNAP_RATE * s.VolumeSize)
        return { check: 'Stale EBS Snapshot', resourceId: s.SnapshotId, detail: `${s.VolumeSize} GB, ${daysSince(s.StartTime)}d old, source volume deleted`, monthlyCost: cost, severity: cost > 5 ? 'medium' : 'low', region }
      })

    const findings = [...volumeFindings, ...eipFindings, ...idleFindings, ...snapFindings]
      .sort((a, b) => b.monthlyCost - a.monthlyCost)

    const totalMonthly = r2(findings.reduce((s, f) => s + f.monthlyCost, 0))
    res.status(200).json({ findings, totalMonthly, totalAnnual: r2(totalMonthly * 12), region, isMock: false })

  } catch (err) {
    // Surface AWS auth errors clearly without leaking internal details
    const isAuth = err.name === 'InvalidClientTokenId' || err.name === 'AuthFailure' || err.$metadata?.httpStatusCode === 403
    res.status(isAuth ? 401 : 500).json({
      error: isAuth
        ? 'AWS credentials are invalid or do not have the required permissions.'
        : `AWS API error: ${err.message}`
    })
  }
}
