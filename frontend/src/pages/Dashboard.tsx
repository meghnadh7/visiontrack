import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  FolderOpen,
  Bug,
  Activity,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Cpu,
  Loader2,
} from 'lucide-react'
import { listProjects as listRoboflowProjects } from '../api/roboflow'
import { listProjects as listRedmineProjects, listIssues, type RedmineIssue } from '../api/redmine'
import IssueStatusBadge from '../components/IssueStatusBadge'
import PriorityBadge from '../components/PriorityBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InferenceHistoryEntry {
  id: string
  projectId: string
  version: string | number
  detectedClasses: string[]
  confidence: number
  timestamp: string
  redmineIssueId?: number
}

// ─── Chart colour palette ─────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  Immediate: '#ef4444',
  Urgent: '#f97316',
  High: '#eab308',
  Normal: '#3b82f6',
  Low: '#6b7280',
}

const STATUS_COLORS = [
  '#3b82f6', // blue  – new / open
  '#eab308', // yellow – in progress
  '#10b981', // green – resolved
  '#6b7280', // gray  – closed
  '#8b5cf6', // violet – feedback / review
  '#f97316', // orange – blocked
  '#ef4444', // red   – rejected
]

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  sub,
  to,
  loading,
  color = 'blue',
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  sub?: string
  to?: string
  loading?: boolean
  color?: 'blue' | 'purple' | 'green' | 'orange'
}) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  }

  const content = (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 group hover:border-gray-700 transition-colors h-full">
      <div className="flex items-start justify-between">
        <div
          className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}
        >
          {icon}
        </div>
        {to && (
          <ArrowRight
            size={14}
            className="text-gray-600 group-hover:text-gray-400 transition-colors"
          />
        )}
      </div>
      <div className="mt-3">
        {loading ? (
          <Loader2 size={20} className="animate-spin text-gray-600" />
        ) : (
          <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
        )}
        <div className="text-sm text-gray-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
      </div>
    </div>
  )

  if (to) return <Link to={to} className="block">{content}</Link>
  return content
}

// ─── Custom tooltip for bar chart ────────────────────────────────────────────

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.fill }}>
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Custom tooltip for pie chart ────────────────────────────────────────────

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { fill: string } }[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p style={{ color: item.payload.fill }} className="font-medium">
        {item.name}
      </p>
      <p className="text-gray-300">{item.value} issues</p>
    </div>
  )
}

// ─── Inference history row ────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: InferenceHistoryEntry }) {
  const date = new Date(entry.timestamp)
  const pct = Math.round(entry.confidence * 100)
  let confColor = 'text-red-400'
  if (pct >= 80) confColor = 'text-emerald-400'
  else if (pct >= 60) confColor = 'text-yellow-400'
  else if (pct >= 40) confColor = 'text-orange-400'

  return (
    <div className="flex items-start justify-between px-5 py-3 hover:bg-gray-800/40 transition-colors border-b border-gray-800 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-mono">{entry.projectId} v{entry.version}</span>
          {entry.redmineIssueId && (
            <Link
              to={`/redmine/issues/${entry.redmineIssueId}`}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              #{entry.redmineIssueId}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {entry.detectedClasses.slice(0, 4).map((cls) => (
            <span
              key={cls}
              className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs"
            >
              {cls}
            </span>
          ))}
          {entry.detectedClasses.length > 4 && (
            <span className="text-xs text-gray-500">
              +{entry.detectedClasses.length - 4} more
            </span>
          )}
        </div>
      </div>
      <div className="text-right ml-4 flex-shrink-0 space-y-1">
        <p className={`text-sm font-bold ${confColor}`}>{pct}%</p>
        <p className="text-xs text-gray-600">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: rfProjects, isLoading: rfLoading, isError: rfError } = useQuery({
    queryKey: ['roboflow-projects'],
    queryFn: listRoboflowProjects,
  })

  const { data: rmProjects, isLoading: rmLoading, isError: rmError } = useQuery({
    queryKey: ['redmine-projects'],
    queryFn: () => listRedmineProjects({ limit: 100 }),
  })

  const { data: recentIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ['redmine-issues-recent'],
    queryFn: () => listIssues({ limit: 10, sort: 'created_on:desc' }),
  })

  const { data: openIssues } = useQuery({
    queryKey: ['redmine-issues-open'],
    queryFn: () => listIssues({ status_id: 'open', limit: 1 }),
  })

  // Fetch a larger set of issues for charts (all statuses)
  const { data: allIssuesData, isLoading: allIssuesLoading } = useQuery({
    queryKey: ['redmine-issues-all-chart'],
    queryFn: () => listIssues({ limit: 100, sort: 'created_on:desc' }),
  })

  // ── Derived chart data ─────────────────────────────────────────────────────

  const priorityChartData = useMemo(() => {
    const issues: RedmineIssue[] = allIssuesData?.data ?? []
    const counts: Record<string, number> = {}
    for (const issue of issues) {
      const name = issue.priority?.name ?? 'Unknown'
      counts[name] = (counts[name] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      fill: PRIORITY_COLORS[name] ?? '#6b7280',
    }))
  }, [allIssuesData])

  const statusChartData = useMemo(() => {
    const issues: RedmineIssue[] = allIssuesData?.data ?? []
    const counts: Record<string, number> = {}
    for (const issue of issues) {
      const name = issue.status?.name ?? 'Unknown'
      counts[name] = (counts[name] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      fill: STATUS_COLORS[i % STATUS_COLORS.length],
    }))
  }, [allIssuesData])

  // ── Inference history from localStorage ───────────────────────────────────

  const inferenceHistory = useMemo<InferenceHistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem('inferenceHistory')
      if (!stored) return []
      return (JSON.parse(stored) as InferenceHistoryEntry[]).slice(0, 10)
    } catch {
      return []
    }
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalImages = rfProjects?.projects?.reduce((sum, p) => sum + (p.images ?? 0), 0) ?? 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Overview of your Roboflow datasets and Redmine project activity.
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Roboflow Projects"
          value={rfError ? 'Error' : rfProjects?.projects?.length ?? 0}
          loading={rfLoading}
          icon={<FolderOpen size={18} />}
          sub="Vision datasets"
          to="/roboflow/projects"
          color="blue"
        />
        <StatCard
          label="Total Images"
          value={rfError ? 'Error' : totalImages.toLocaleString()}
          loading={rfLoading}
          icon={<Activity size={18} />}
          sub="Across all projects"
          color="purple"
        />
        <StatCard
          label="Redmine Projects"
          value={rmError ? 'Error' : rmProjects?.total_count ?? 0}
          loading={rmLoading}
          icon={<Layers size={18} />}
          sub="Active workspaces"
          to="/redmine/projects"
          color="green"
        />
        <StatCard
          label="Open Issues"
          value={openIssues?.total_count ?? 0}
          icon={<Bug size={18} />}
          sub="Awaiting resolution"
          to="/redmine/projects"
          color="orange"
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues by Priority bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
            Issues by Priority
          </h2>
          {allIssuesLoading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-gray-600" />
            </div>
          ) : priorityChartData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-gray-600">
              <Bug size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No issue data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={priorityChartData}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="count" name="Issues" radius={[4, 4, 0, 0]}>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Issues by Status pie chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
            Issues by Status
          </h2>
          {allIssuesLoading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-gray-600" />
            </div>
          ) : statusChartData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-gray-600">
              <CheckCircle2 size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No issue data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent activity + Inference history ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Redmine issues */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Recent Issues
            </h2>
            <Link
              to="/redmine/projects"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {issuesLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={22} className="animate-spin text-gray-600" />
            </div>
          ) : recentIssues?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600">
              <CheckCircle2 size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No issues found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {recentIssues?.data?.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/redmine/issues/${issue.id}`}
                  className="flex items-start justify-between px-5 py-3.5 hover:bg-gray-800/40 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">#{issue.id}</span>
                      <IssueStatusBadge status={issue.status} />
                      <PriorityBadge priority={issue.priority} showIcon={false} />
                    </div>
                    <p className="text-sm font-medium text-gray-200 truncate mt-1 group-hover:text-white transition-colors">
                      {issue.subject}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{issue.project.name}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock size={10} />
                        {new Date(issue.created_on).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent inference runs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Recent Inference Runs
            </h2>
            <Link
              to="/roboflow/inference"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              Run inference <ArrowRight size={12} />
            </Link>
          </div>

          {inferenceHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600 gap-2">
              <Cpu size={32} className="opacity-40" />
              <p className="text-sm">No inference runs yet</p>
              <Link
                to="/roboflow/inference"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
              >
                Run your first inference →
              </Link>
            </div>
          ) : (
            <div>
              {inferenceHistory.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Roboflow projects list ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
            Roboflow Projects
          </h2>
          <Link
            to="/roboflow/projects"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {rfLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={22} className="animate-spin text-gray-600" />
          </div>
        ) : rfError ? (
          <div className="flex items-center gap-2 px-5 py-4 text-red-400 text-sm">
            <AlertCircle size={16} />
            Failed to load Roboflow projects
          </div>
        ) : rfProjects?.projects?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-600">
            <FolderOpen size={28} className="opacity-40 mb-1" />
            <p className="text-sm">No projects yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-800">
            {rfProjects?.projects?.slice(0, 6).map((project) => (
              <Link
                key={project.id}
                to={`/roboflow/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors group border-b border-gray-800 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                    {project.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {project.type} · {project.images?.toLocaleString()} images · {project.classes} classes
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="text-gray-600 group-hover:text-gray-400 transition-colors ml-4 flex-shrink-0"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
