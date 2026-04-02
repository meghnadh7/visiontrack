interface IssueStatusBadgeProps {
  status: { id: number; name: string } | string
  className?: string
}

function getStatusStyle(name: string): string {
  const lower = name.toLowerCase()

  if (lower.includes('new') || lower === 'open') {
    return 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
  }
  if (lower.includes('in progress') || lower.includes('in-progress') || lower.includes('wip')) {
    return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
  }
  if (lower.includes('resolved') || lower.includes('fixed')) {
    return 'bg-green-500/15 text-green-400 border border-green-500/30'
  }
  if (lower.includes('closed') || lower.includes('done') || lower.includes('complete')) {
    return 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
  }
  if (lower.includes('reject') || lower.includes('cancel') || lower.includes('invalid')) {
    return 'bg-red-500/15 text-red-400 border border-red-500/30'
  }
  if (lower.includes('feedback') || lower.includes('review') || lower.includes('pending')) {
    return 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
  }
  if (lower.includes('hold') || lower.includes('blocked') || lower.includes('wait')) {
    return 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
  }

  // Default
  return 'bg-gray-700/50 text-gray-400 border border-gray-700'
}

function getStatusDot(name: string): string {
  const lower = name.toLowerCase()

  if (lower.includes('new') || lower === 'open') return 'bg-blue-400'
  if (lower.includes('in progress') || lower.includes('in-progress') || lower.includes('wip'))
    return 'bg-yellow-400 animate-pulse'
  if (lower.includes('resolved') || lower.includes('fixed')) return 'bg-green-400'
  if (lower.includes('closed') || lower.includes('done') || lower.includes('complete'))
    return 'bg-gray-500'
  if (lower.includes('reject') || lower.includes('cancel') || lower.includes('invalid'))
    return 'bg-red-400'
  if (lower.includes('feedback') || lower.includes('review') || lower.includes('pending'))
    return 'bg-purple-400'
  if (lower.includes('hold') || lower.includes('blocked') || lower.includes('wait'))
    return 'bg-orange-400'

  return 'bg-gray-500'
}

export default function IssueStatusBadge({ status, className = '' }: IssueStatusBadgeProps) {
  if (!status) return null
  const name = typeof status === 'string' ? status : status.name
  const style = getStatusStyle(name)
  const dot = getStatusDot(name)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {name}
    </span>
  )
}
