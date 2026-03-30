import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FolderOpen,
  ArrowRight,
  Search,
  AlertCircle,
  Image,
  Tag,
  GitBranch,
} from 'lucide-react'
import { listProjects } from '../../api/roboflow'

const TYPE_LABELS: Record<string, string> = {
  'object-detection': 'Object Detection',
  'classification': 'Classification',
  'instance-segmentation': 'Instance Segmentation',
  'semantic-segmentation': 'Semantic Segmentation',
  'keypoint-detection': 'Keypoint Detection',
}

export default function RoboflowProjects() {
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['roboflow-projects'],
    queryFn: listProjects,
  })

  const projects = data?.projects ?? []
  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Roboflow Projects</h1>
          <p className="page-subtitle">
            {isLoading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Content */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner w-8 h-8" />
        </div>
      )}

      {isError && (
        <div className="card p-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <div>
              <p className="font-semibold">Failed to load projects</p>
              <p className="text-sm text-red-400/70 mt-0.5">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          </div>
          <button onClick={() => refetch()} className="btn-secondary mt-4">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="empty-state">
          <FolderOpen size={48} className="empty-state-icon" />
          <p className="empty-state-title">
            {search ? 'No matching projects' : 'No projects found'}
          </p>
          <p className="empty-state-desc">
            {search
              ? 'Try a different search term.'
              : 'Connect your Roboflow workspace to get started.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/roboflow/projects/${project.id}`}
              className="card group hover:border-gray-700 transition-all duration-150 hover:glow-blue"
            >
              <div className="card-body">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{project.id}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5"
                  />
                </div>

                <div className="mt-3">
                  <span className="tag">
                    {TYPE_LABELS[project.type] ?? project.type}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="flex flex-col items-center p-2 rounded-lg bg-gray-800/60">
                    <Image size={14} className="text-gray-500 mb-1" />
                    <span className="text-sm font-semibold text-white">
                      {project.images?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-xs text-gray-500">Images</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-gray-800/60">
                    <Tag size={14} className="text-gray-500 mb-1" />
                    <span className="text-sm font-semibold text-white">
                      {project.classes ?? 0}
                    </span>
                    <span className="text-xs text-gray-500">Classes</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-gray-800/60">
                    <GitBranch size={14} className="text-gray-500 mb-1" />
                    <span className="text-sm font-semibold text-white">
                      {project.versions ?? 0}
                    </span>
                    <span className="text-xs text-gray-500">Versions</span>
                  </div>
                </div>

                {project.annotation && (
                  <p className="text-xs text-gray-500 mt-3">
                    Annotation: <span className="text-gray-400">{project.annotation}</span>
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
