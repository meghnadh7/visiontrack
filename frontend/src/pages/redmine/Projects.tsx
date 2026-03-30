import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FolderOpen,
  Plus,
  Search,
  AlertCircle,
  ArrowRight,
  Globe,
  Lock,
  X,
  Loader2,
  Users,
  Calendar,
} from 'lucide-react'
import { listProjects, createProject, type RedmineProject } from '../../api/redmine'

interface CreateProjectFormData {
  name: string
  identifier: string
  description: string
  is_public: boolean
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreateProjectFormData>({
    name: '',
    identifier: '',
    description: '',
    is_public: true,
  })
  const [errors, setErrors] = useState<Partial<CreateProjectFormData>>({})

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['redmine-projects'] })
      onClose()
    },
  })

  function validate(): boolean {
    const e: Partial<Record<keyof CreateProjectFormData, string>> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.identifier.trim()) {
      e.identifier = 'Identifier is required'
    } else if (!/^[a-z0-9_-]+$/.test(form.identifier)) {
      e.identifier = 'Only lowercase letters, numbers, hyphens and underscores'
    }
    setErrors(e as Partial<CreateProjectFormData>)
    return Object.keys(e).length === 0
  }

  function handleNameChange(name: string) {
    const identifier = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '')
    setForm((f) => ({ ...f, name, identifier }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      name: form.name,
      identifier: form.identifier,
      description: form.description || undefined,
      is_public: form.is_public,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md shadow-2xl">
        <div className="card-header flex items-center justify-between">
          <h2 className="section-title">New Redmine Project</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="card-body space-y-4">
          <div className="form-group">
            <label className="label">Project Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Project"
              className="input"
              autoFocus
            />
            {errors.name && <p className="error-text">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="label">Identifier *</label>
            <input
              type="text"
              value={form.identifier}
              onChange={(e) =>
                setForm((f) => ({ ...f, identifier: e.target.value }))
              }
              placeholder="my-project"
              className="input font-mono"
            />
            {errors.identifier && (
              <p className="error-text">{errors.identifier}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Used in URLs. Lowercase letters, numbers, hyphens and underscores only.
            </p>
          </div>

          <div className="form-group">
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe this project…"
              rows={3}
              className="input resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-300">Public project</span>
              <p className="text-xs text-gray-500">Visible to all users</p>
            </div>
          </label>

          {mutation.isError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {(mutation.error as Error)?.message ?? 'Failed to create project'}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {mutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {mutation.isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: RedmineProject }) {
  return (
    <Link
      to={`/redmine/projects/${project.identifier}/issues`}
      className="card group hover:border-gray-700 transition-all duration-150"
    >
      <div className="card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
              {project.name}
            </h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">{project.identifier}</p>
          </div>
          <div className="flex items-center gap-2">
            {project.is_public ? (
              <Globe size={14} className="text-green-500 flex-shrink-0" />
            ) : (
              <Lock size={14} className="text-gray-500 flex-shrink-0" />
            )}
            <ArrowRight
              size={14}
              className="text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0"
            />
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-gray-500 mt-2 truncate-2">{project.description}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {new Date(project.created_on).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {project.is_public ? 'Public' : 'Private'}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function RedmineProjects() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['redmine-projects'],
    queryFn: () => listProjects({ limit: 100 }),
  })

  const projects = data?.data ?? []
  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.identifier.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Redmine Projects</h1>
          <p className="page-subtitle">
            {isLoading ? 'Loading…' : `${data?.total_count ?? 0} project${(data?.total_count ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} />
          New Project
        </button>
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
            {search ? 'Try a different search term.' : 'Create your first Redmine project.'}
          </p>
          {!search && (
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
              <Plus size={14} /> New Project
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
