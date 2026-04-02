import { ChevronsUp, ChevronUp, ArrowUp, Minus, ChevronDown } from 'lucide-react'

interface PriorityBadgeProps {
  priority: { id: number; name: string } | string
  showIcon?: boolean
  className?: string
}

interface PriorityConfig {
  label: string
  style: string
  icon: React.ReactNode
}

function getPriorityConfig(name: string): PriorityConfig {
  const lower = name.toLowerCase()

  if (lower === 'immediate' || lower === 'blocker' || lower === 'critical') {
    return {
      label: name,
      style: 'bg-red-600/20 text-red-400 border border-red-600/40',
      icon: <ChevronsUp size={11} />,
    }
  }

  if (lower === 'urgent' || lower === 'very high') {
    return {
      label: name,
      style: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
      icon: <ChevronUp size={11} />,
    }
  }

  if (lower === 'high') {
    return {
      label: name,
      style: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
      icon: <ArrowUp size={11} />,
    }
  }

  if (lower === 'normal' || lower === 'medium') {
    return {
      label: name,
      style: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
      icon: <Minus size={11} />,
    }
  }

  if (lower === 'low' || lower === 'very low' || lower === 'minor') {
    return {
      label: name,
      style: 'bg-gray-600/30 text-gray-400 border border-gray-600/40',
      icon: <ChevronDown size={11} />,
    }
  }

  // Default fallback
  return {
    label: name,
    style: 'bg-gray-700/40 text-gray-400 border border-gray-700',
    icon: <Minus size={11} />,
  }
}

export default function PriorityBadge({
  priority,
  showIcon = true,
  className = '',
}: PriorityBadgeProps) {
  if (!priority) return null
  const name = typeof priority === 'string' ? priority : priority.name
  const config = getPriorityConfig(name)

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.style} ${className}`}
      title={`Priority: ${name}`}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  )
}
