import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  AlertCircle,
  User,
  Calendar,
  Clock,
  Paperclip,
  MessageSquare,
  Edit2,
  X,
  Loader2,
  CheckCircle2,
  Tag,
  BarChart3,
} from 'lucide-react'
import {
  getIssue,
  updateIssue,
  listStatuses,
  listUsers,
  type RedmineJournal,
  type UpdateIssuePayload,
} from '../../api/redmine'
import IssueStatusBadge from '../../components/IssueStatusBadge'
import PriorityBadge from '../../components/PriorityBadge'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800 last:border-0">
      <span className="text-xs font-medium text-gray-500 w-28 flex-shrink-0 pt-0.5 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 text-sm text-gray-300">{children}</div>
    </div>
  )
}

function JournalEntry({ journal }: { journal: RedmineJournal }) {
  const hasNotes = !!journal.notes?.trim()
  const hasDetails = journal.details.length > 0

  if (!hasNotes && !hasDetails) return null

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
          <User size={12} className="text-gray-500" />
        </div>
        <div className="w-px bg-gray-800 flex-1 mt-2" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-300">{journal.user.name}</span>
          <span className="text-xs text-gray-600">
            {new Date(journal.created_on).toLocaleString()}
          </span>
        </div>

        {hasDetails && (
          <div className="space-y-1 mb-2">
            {journal.details.map((detail, idx) => (
              <p key={idx} className="text-xs text-gray-500">
                Changed <span className="text-gray-400 font-medium">{detail.name}</span>
                {detail.old_value && (
                  <>
                    {' '}from{' '}
                    <span className="text-gray-400 line-through">{detail.old_value}</span>
                  </>
                )}
                {detail.new_value && (
                  <>
                    {' '}to{' '}
                    <span className="text-gray-300">{detail.new_value}</span>
                  </>
                )}
              </p>
            ))}
          </div>
        )}

        {hasNotes && (
          <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{journal.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EditIssueModal({
  issueId,
  currentStatus,
  onClose,
}: {
  issueId: number
  currentStatus: { id: number; name: string }
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [statusId, setStatusId] = useState(String(currentStatus.id))
  const [notes, setNotes] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [doneRatio, setDoneRatio] = useState('0')

  const { data: statuses } = useQuery({ queryKey: ['redmine-statuses'], queryFn: listStatuses })
  const { data: users } = useQuery({
    queryKey: ['redmine-users'],
    queryFn: () => listUsers({ limit: 100 }),
  })

  const mutation = useMutation({
    mutationFn: (payload: UpdateIssuePayload) => updateIssue(issueId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['redmine-issue', issueId] })
      onClose()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: UpdateIssuePayload = {}
    if (statusId) payload.status_id = Number(statusId)
    if (notes.trim()) payload.notes = notes
    if (assignedToId) payload.assigned_to_id = Number(assignedToId)
    if (doneRatio) payload.done_ratio = Number(doneRatio)
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg shadow-2xl">
        <div className="card-header flex items-center justify-between">
          <h2 className="section-title">Update Issue #{issueId}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Status</label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="select"
              >
                {statuses?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Assign To</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="select"
              >
                <option value="">No change</option>
                {users?.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstname} {u.lastname}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label flex items-center justify-between">
              <span>% Done</span>
              <span className="text-blue-400 font-mono text-xs">{doneRatio}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={doneRatio}
              onChange={(e) => setDoneRatio(e.target.value)}
              className="w-full accent-blue-500"
            />
          </div>

          <div className="form-group">
            <label className="label">Notes / Comment</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a comment or describe what changed…"
              rows={3}
              className="input resize-none"
            />
          </div>

          {mutation.isError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {(mutation.error as Error)?.message ?? 'Failed to update issue'}
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
                <CheckCircle2 size={14} />
              )}
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RedmineIssueDetail() {
  const { issueId } = useParams<{ issueId: string }>()
  const [showEdit, setShowEdit] = useState(false)

  const { data: issue, isLoading, isError } = useQuery({
    queryKey: ['redmine-issue', Number(issueId)],
    queryFn: () => getIssue(issueId!),
    enabled: !!issueId,
  })

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (isError || !issue) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <p className="font-semibold">Issue not found</p>
          </div>
          <Link to="/redmine/projects" className="btn-secondary mt-4 inline-flex">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const journals = issue.journals ?? []
  const attachments = issue.attachments ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showEdit && (
        <EditIssueModal
          issueId={issue.id}
          currentStatus={issue.status}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link to="/redmine/projects" className="hover:text-gray-300 transition-colors">
          Redmine Projects
        </Link>
        <ChevronRight size={14} />
        <Link
          to={`/redmine/projects/${issue.project.id}/issues`}
          className="hover:text-gray-300 transition-colors"
        >
          {issue.project.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-400">Issue #{issue.id}</span>
      </div>

      {/* Issue header */}
      <div className="card card-body">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-sm text-gray-500">#{issue.id}</span>
              <IssueStatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
              <span className="tag">{issue.tracker.name}</span>
            </div>
            <h1 className="text-xl font-bold text-white leading-snug">{issue.subject}</h1>
          </div>
          <button onClick={() => setShowEdit(true)} className="btn-secondary flex-shrink-0">
            <Edit2 size={14} />
            Update
          </button>
        </div>

        {/* Progress bar */}
        {issue.done_ratio > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span className="flex items-center gap-1">
                <BarChart3 size={11} /> Progress
              </span>
              <span>{issue.done_ratio}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${issue.done_ratio}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left – details + description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {issue.description && (
            <div className="card">
              <div className="card-header">
                <h2 className="section-title text-base">Description</h2>
              </div>
              <div className="card-body">
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {issue.description}
                </p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="section-title text-base flex items-center gap-2">
                  <Paperclip size={15} className="text-gray-500" />
                  Attachments ({attachments.length})
                </h2>
              </div>
              <div className="card-body space-y-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors group"
                  >
                    <Paperclip size={14} className="text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-300 group-hover:text-blue-400 transition-colors truncate">
                        {att.filename}
                      </p>
                      <p className="text-xs text-gray-600">
                        {(att.filesize / 1024).toFixed(1)} KB
                        {att.description && ` · ${att.description}`}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div className="card">
            <div className="card-header">
              <h2 className="section-title text-base flex items-center gap-2">
                <MessageSquare size={15} className="text-gray-500" />
                History
                {journals.length > 0 && (
                  <span className="text-sm font-normal text-gray-500">({journals.length})</span>
                )}
              </h2>
            </div>
            <div className="card-body">
              {journals.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet.</p>
              ) : (
                <div className="space-y-0">
                  {journals.map((j) => (
                    <JournalEntry key={j.id} journal={j} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right – metadata */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h2 className="section-title text-base">Details</h2>
            </div>
            <div className="card-body py-0 divide-y divide-gray-800">
              <InfoRow label="Project">
                <Link
                  to={`/redmine/projects/${issue.project.id}/issues`}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {issue.project.name}
                </Link>
              </InfoRow>

              <InfoRow label="Tracker">
                <span className="flex items-center gap-1.5">
                  <Tag size={12} className="text-gray-500" />
                  {issue.tracker.name}
                </span>
              </InfoRow>

              <InfoRow label="Status">
                <IssueStatusBadge status={issue.status} />
              </InfoRow>

              <InfoRow label="Priority">
                <PriorityBadge priority={issue.priority} />
              </InfoRow>

              <InfoRow label="Author">
                <span className="flex items-center gap-1.5">
                  <User size={12} className="text-gray-500" />
                  {issue.author.name}
                </span>
              </InfoRow>

              <InfoRow label="Assignee">
                {issue.assigned_to ? (
                  <span className="flex items-center gap-1.5">
                    <User size={12} className="text-gray-500" />
                    {issue.assigned_to.name}
                  </span>
                ) : (
                  <span className="text-gray-600">Unassigned</span>
                )}
              </InfoRow>

              {issue.start_date && (
                <InfoRow label="Start">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-500" />
                    {new Date(issue.start_date).toLocaleDateString()}
                  </span>
                </InfoRow>
              )}

              {issue.due_date && (
                <InfoRow label="Due">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-500" />
                    {new Date(issue.due_date).toLocaleDateString()}
                  </span>
                </InfoRow>
              )}

              {issue.estimated_hours != null && (
                <InfoRow label="Est. Hours">
                  <span className="font-mono">{issue.estimated_hours}h</span>
                </InfoRow>
              )}

              <InfoRow label="Created">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-gray-500" />
                  {new Date(issue.created_on).toLocaleString()}
                </span>
              </InfoRow>

              <InfoRow label="Updated">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-gray-500" />
                  {new Date(issue.updated_on).toLocaleString()}
                </span>
              </InfoRow>

              {issue.closed_on && (
                <InfoRow label="Closed">
                  <span className="flex items-center gap-1.5 text-green-400">
                    <CheckCircle2 size={12} />
                    {new Date(issue.closed_on).toLocaleString()}
                  </span>
                </InfoRow>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
