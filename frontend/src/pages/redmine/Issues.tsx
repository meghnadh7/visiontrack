import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bug,
  Plus,
  Search,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  X,
  Loader2,
  Filter,
  Clock,
  User,
  Users,
  Shield,
} from 'lucide-react'
import {
  listIssues,
  createIssue,
  listTrackers,
  listStatuses,
  listUsers,
  getProjectMembers,
  addMember,
  listRoles,
  type RedmineIssue,
  type CreateIssuePayload,
  type RedmineMember,
} from '../../api/redmine'
import IssueStatusBadge from '../../components/IssueStatusBadge'
import PriorityBadge from '../../components/PriorityBadge'

const PRIORITY_OPTIONS = [
  { id: 1, name: 'Low' },
  { id: 2, name: 'Normal' },
  { id: 3, name: 'High' },
  { id: 4, name: 'Urgent' },
  { id: 5, name: 'Immediate' },
]

interface CreateIssueForm {
  subject: string
  description: string
  tracker_id: string
  status_id: string
  priority_id: string
  assigned_to_id: string
  start_date: string
  due_date: string
  estimated_hours: string
}

function CreateIssueModal({
  projectId,
  onClose,
}: {
  projectId: number | string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreateIssueForm>({
    subject: '',
    description: '',
    tracker_id: '',
    status_id: '',
    priority_id: '2',
    assigned_to_id: '',
    start_date: '',
    due_date: '',
    estimated_hours: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CreateIssueForm, string>>>({})

  const { data: trackers } = useQuery({ queryKey: ['redmine-trackers'], queryFn: listTrackers })
  const { data: statuses } = useQuery({ queryKey: ['redmine-statuses'], queryFn: listStatuses })
  const { data: users } = useQuery({
    queryKey: ['redmine-users'],
    queryFn: () => listUsers({ limit: 100 }),
  })

  const mutation = useMutation({
    mutationFn: (payload: CreateIssuePayload) => createIssue(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['redmine-issues', String(projectId)] })
      onClose()
    },
  })

  function validate(): boolean {
    const e: Partial<Record<keyof CreateIssueForm, string>> = {}
    if (!form.subject.trim()) e.subject = 'Subject is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    mutation.mutate({
      project_id: projectId,
      subject: form.subject,
      description: form.description || undefined,
      tracker_id: form.tracker_id ? Number(form.tracker_id) : undefined,
      status_id: form.status_id ? Number(form.status_id) : undefined,
      priority_id: form.priority_id ? Number(form.priority_id) : undefined,
      assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : undefined,
      start_date: form.start_date || undefined,
      due_date: form.due_date || undefined,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
    })
  }

  function setField(field: keyof CreateIssueForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-2xl shadow-2xl my-8">
        <div className="card-header flex items-center justify-between">
          <h2 className="section-title">New Issue</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="card-body space-y-4">
          {/* Subject */}
          <div className="form-group">
            <label className="label">Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setField('subject', e.target.value)}
              placeholder="Brief description of the issue"
              className="input"
              autoFocus
            />
            {errors.subject && <p className="error-text">{errors.subject}</p>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Detailed description…"
              rows={4}
              className="input resize-none"
            />
          </div>

          {/* Row: Tracker + Status + Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group">
              <label className="label">Tracker</label>
              <select
                value={form.tracker_id}
                onChange={(e) => setField('tracker_id', e.target.value)}
                className="select"
              >
                <option value="">Default</option>
                {trackers?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Status</label>
              <select
                value={form.status_id}
                onChange={(e) => setField('status_id', e.target.value)}
                className="select"
              >
                <option value="">Default</option>
                {statuses?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Priority</label>
              <select
                value={form.priority_id}
                onChange={(e) => setField('priority_id', e.target.value)}
                className="select"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned to */}
          <div className="form-group">
            <label className="label">Assigned To</label>
            <select
              value={form.assigned_to_id}
              onChange={(e) => setField('assigned_to_id', e.target.value)}
              className="select"
            >
              <option value="">Unassigned</option>
              {users?.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstname} {u.lastname}
                </option>
              ))}
            </select>
          </div>

          {/* Dates + hours */}
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group">
              <label className="label">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setField('due_date', e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">Est. Hours</label>
              <input
                type="number"
                value={form.estimated_hours}
                onChange={(e) => setField('estimated_hours', e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
                className="input"
              />
            </div>
          </div>

          {mutation.isError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {(mutation.error as Error)?.message ?? 'Failed to create issue'}
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
              {mutation.isPending ? 'Creating…' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function IssueRow({ issue }: { issue: RedmineIssue }) {
  return (
    <tr>
      <td>
        <span className="font-mono text-xs text-gray-500">#{issue.id}</span>
      </td>
      <td>
        <Link
          to={`/redmine/issues/${issue.id}`}
          className="font-medium text-gray-200 hover:text-blue-400 transition-colors line-clamp-1"
        >
          {issue.subject}
        </Link>
        {issue.description && (
          <p className="text-xs text-gray-600 mt-0.5 truncate max-w-xs">{issue.description}</p>
        )}
      </td>
      <td>
        <span className="tag text-xs">{issue.tracker.name}</span>
      </td>
      <td>
        <IssueStatusBadge status={issue.status} />
      </td>
      <td>
        <PriorityBadge priority={issue.priority} />
      </td>
      <td>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <User size={11} className="text-gray-600" />
          {issue.assigned_to?.name ?? <span className="text-gray-600">Unassigned</span>}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock size={11} />
          {new Date(issue.updated_on).toLocaleDateString()}
        </div>
      </td>
      <td>
        <Link
          to={`/redmine/issues/${issue.id}`}
          className="btn-ghost p-1.5 text-gray-600 hover:text-gray-400"
          aria-label="View issue"
        >
          <ArrowRight size={14} />
        </Link>
      </td>
    </tr>
  )
}

function AddMemberModal({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [userId, setUserId] = useState('')
  const [roleId, setRoleId] = useState('')

  const { data: users } = useQuery({
    queryKey: ['redmine-users'],
    queryFn: () => listUsers({ limit: 100 }),
  })
  const { data: roles } = useQuery({ queryKey: ['redmine-roles'], queryFn: listRoles })

  const mutation = useMutation({
    mutationFn: () =>
      addMember(projectId, { userId: Number(userId), roleIds: [Number(roleId)] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['redmine-members', projectId] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-sm shadow-2xl">
        <div className="card-header flex items-center justify-between">
          <h2 className="section-title">Add Member</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="card-body space-y-4">
          <div className="form-group">
            <label className="label">User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="select">
              <option value="">Select user…</option>
              {users?.data?.map((u) => (
                <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Role</label>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="select">
              <option value="">Select role…</option>
              {roles?.filter((r) => r.assignable).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          {mutation.isError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {(mutation.error as Error)?.message ?? 'Failed to add member'}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!userId || !roleId || mutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {mutation.isPending ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MemberRow({ member }: { member: RedmineMember }) {
  return (
    <tr>
      <td>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
            <User size={12} className="text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-300">{member.user.name}</span>
        </div>
      </td>
      <td>
        <div className="flex flex-wrap gap-1">
          {member.roles.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs">
              <Shield size={10} />
              {r.name}
            </span>
          ))}
        </div>
      </td>
    </tr>
  )
}

export default function RedmineIssues() {
  const { projectId } = useParams<{ projectId: string }>()
  const [tab, setTab] = useState<'issues' | 'members'>('issues')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [showModal, setShowModal] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['redmine-issues', projectId, statusFilter],
    queryFn: () =>
      listIssues({
        project_id: projectId,
        status_id: statusFilter,
        limit: 50,
        sort: 'updated_on:desc',
      }),
    enabled: !!projectId,
  })

  const { data: statuses } = useQuery({
    queryKey: ['redmine-statuses'],
    queryFn: listStatuses,
  })

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['redmine-members', projectId],
    queryFn: () => getProjectMembers(projectId!),
    enabled: !!projectId && tab === 'members',
  })

  const issues = data?.data ?? []
  const members = membersData?.data ?? []
  const filtered = issues.filter(
    (i) =>
      i.subject.toLowerCase().includes(search.toLowerCase()) ||
      String(i.id).includes(search),
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {showModal && projectId && (
        <CreateIssueModal projectId={projectId} onClose={() => setShowModal(false)} />
      )}
      {showAddMember && projectId && (
        <AddMemberModal projectId={projectId} onClose={() => setShowAddMember(false)} />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/redmine/projects" className="hover:text-gray-300 transition-colors">
          Redmine Projects
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-300 font-medium">{projectId}</span>
        <ChevronRight size={14} />
        <span className="text-gray-400">{tab === 'issues' ? 'Issues' : 'Members'}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title capitalize">{tab}</h1>
          <p className="page-subtitle">
            {tab === 'issues'
              ? isLoading ? 'Loading…' : `${data?.total_count ?? 0} issue${(data?.total_count ?? 0) !== 1 ? 's' : ''}`
              : loadingMembers ? 'Loading…' : `${membersData?.total_count ?? 0} member${(membersData?.total_count ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>
        {tab === 'issues' ? (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> New Issue
          </button>
        ) : (
          <button onClick={() => setShowAddMember(true)} className="btn-primary">
            <Plus size={16} /> Add Member
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setTab('issues')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'issues' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Bug size={14} /> Issues
        </button>
        <button
          onClick={() => setTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'members' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Users size={14} /> Members
        </button>
      </div>

      {/* Members panel */}
      {tab === 'members' && (
        <>
          {loadingMembers && <div className="loading-overlay"><div className="spinner w-8 h-8" /></div>}
          {!loadingMembers && members.length === 0 && (
            <div className="empty-state">
              <Users size={48} className="empty-state-icon" />
              <p className="empty-state-title">No members yet</p>
              <p className="empty-state-desc">Add members to this project to assign issues.</p>
              <button onClick={() => setShowAddMember(true)} className="btn-primary mt-4">
                <Plus size={14} /> Add Member
              </button>
            </div>
          )}
          {!loadingMembers && members.length > 0 && (
            <div className="card overflow-hidden">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Roles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => <MemberRow key={m.id} member={m} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Issues panel */}
      {tab === 'issues' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search issues…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            <div className="relative w-48">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select pl-8"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="*">All</option>
                {statuses?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading && <div className="loading-overlay"><div className="spinner w-8 h-8" /></div>}

          {isError && (
            <div className="card p-6">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle size={20} />
                <div>
                  <p className="font-semibold">Failed to load issues</p>
                  <p className="text-sm text-red-400/70 mt-0.5">
                    {error instanceof Error ? error.message : 'Unknown error'}
                  </p>
                </div>
              </div>
              <button onClick={() => refetch()} className="btn-secondary mt-4">Retry</button>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="empty-state">
              <Bug size={48} className="empty-state-icon" />
              <p className="empty-state-title">{search ? 'No matching issues' : 'No issues found'}</p>
              <p className="empty-state-desc">
                {search ? 'Try a different search term or filter.' : 'Create the first issue for this project.'}
              </p>
              {!search && (
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
                  <Plus size={14} /> New Issue
                </button>
              )}
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div className="card overflow-hidden">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '3rem' }}>#</th>
                      <th>Subject</th>
                      <th style={{ width: '7rem' }}>Tracker</th>
                      <th style={{ width: '8rem' }}>Status</th>
                      <th style={{ width: '7rem' }}>Priority</th>
                      <th style={{ width: '9rem' }}>Assignee</th>
                      <th style={{ width: '7rem' }}>Updated</th>
                      <th style={{ width: '2.5rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
