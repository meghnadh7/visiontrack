import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Upload,
  Link,
  Play,
  Download,
  FileJson,
  X,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Loader2,
  ChevronDown,
  ImageIcon,
  Clock,
} from 'lucide-react'
import BoundingBoxCanvas from '../../components/BoundingBoxCanvas'
import PriorityBadge from '../../components/PriorityBadge'
import {
  listProjects,
  listVersions,
  runInference,
  type RoboflowPrediction,
  type RoboflowInferenceResult,
} from '../../api/roboflow'
import {
  listProjects as listRedmineProjects,
  listTrackers,
  createIssue,
  uploadAttachment,
  type RedmineProject,
  type RedmineTracker,
} from '../../api/redmine'

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

interface RedmineModalState {
  open: boolean
  title: string
  description: string
  projectId: number | null
  trackerId: number | null
  priorityId: number
  submitting: boolean
  error: string | null
  successIssueId: number | null
}

// ─── Priority helpers ─────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { id: 3, name: 'Low' },
  { id: 4, name: 'Normal' },
  { id: 5, name: 'High' },
  { id: 6, name: 'Urgent' },
  { id: 7, name: 'Immediate' },
]

function suggestPriority(avgConf: number): number {
  if (avgConf > 0.8) return 5  // High
  if (avgConf > 0.6) return 4  // Normal
  return 3                     // Low
}

function calcAvgConfidence(preds: RoboflowPrediction[]): number {
  if (preds.length === 0) return 0
  return preds.reduce((sum, p) => sum + p.confidence, 0) / preds.length
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  let color = 'bg-red-500'
  if (pct >= 80) color = 'bg-emerald-500'
  else if (pct >= 60) color = 'bg-yellow-500'
  else if (pct >= 40) color = 'bg-orange-500'

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-300 w-10 text-right">{pct}%</span>
    </div>
  )
}

// ─── Detection table row ──────────────────────────────────────────────────────

function DetectionRow({ pred, index }: { pred: RoboflowPrediction; index: number }) {
  return (
    <tr className="border-b border-gray-700/50 hover:bg-gray-800/40 transition-colors">
      <td className="px-3 py-2 text-sm text-gray-400">{index + 1}</td>
      <td className="px-3 py-2">
        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-medium">
          {pred.class}
        </span>
      </td>
      <td className="px-3 py-2 w-48">
        <ConfidenceBar value={pred.confidence} />
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-400">
        ({Math.round(pred.x)}, {Math.round(pred.y)})
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-400">
        {Math.round(pred.width)} × {Math.round(pred.height)}
      </td>
    </tr>
  )
}

// ─── Threshold slider ─────────────────────────────────────────────────────────

function ThresholdSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  )
}

// ─── Redmine Modal ────────────────────────────────────────────────────────────

interface RedmineModalProps {
  state: RedmineModalState
  onChange: (patch: Partial<RedmineModalState>) => void
  onClose: () => void
  onSubmit: () => void
  redmineProjects: RedmineProject[]
  trackers: RedmineTracker[]
  loadingProjects: boolean
  loadingTrackers: boolean
}

function RedmineModal({
  state,
  onChange,
  onClose,
  onSubmit,
  redmineProjects,
  trackers,
  loadingProjects,
  loadingTrackers,
}: RedmineModalProps) {
  if (!state.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Create Redmine Issue</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {state.successIssueId !== null ? (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="text-emerald-400" size={48} />
              <p className="text-white font-medium text-lg">Issue #{state.successIssueId} created!</p>
              <p className="text-gray-400 text-sm text-center">
                The detection results have been exported as a Redmine issue with the annotated image attached.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Error banner */}
            {state.error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-400">{state.error}</p>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Title</label>
              <input
                type="text"
                value={state.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea
                value={state.description}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none font-mono"
              />
            </div>

            {/* Project dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Redmine Project</label>
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Loading projects…
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={state.projectId ?? ''}
                    onChange={(e) => onChange({ projectId: Number(e.target.value) || null })}
                    className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">Select project…</option>
                    {redmineProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Tracker + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Tracker</label>
                {loadingTrackers ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={state.trackerId ?? ''}
                      onChange={(e) => onChange({ trackerId: Number(e.target.value) || null })}
                      className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    >
                      <option value="">Any tracker</option>
                      {trackers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Priority
                  <span className="ml-1.5 text-xs text-blue-400 font-normal">(auto-suggested)</span>
                </label>
                <div className="relative">
                  <select
                    value={state.priorityId}
                    onChange={(e) => onChange({ priorityId: Number(e.target.value) })}
                    className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Priority preview badge */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Selected priority:</span>
              <PriorityBadge
                priority={PRIORITY_OPTIONS.find((p) => p.id === state.priorityId)?.name ?? 'Normal'}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={state.submitting}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={state.submitting || !state.projectId || !state.title.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {state.submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Issue'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RoboflowInference() {
  // Model source toggle
  const [modelSource, setModelSource] = useState<'workspace' | 'public'>('workspace')
  const [publicModelId, setPublicModelId] = useState<string>('new-pothole-detection')
  const [publicModelVersion, setPublicModelVersion] = useState<string>('1')

  // Input state
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [inputMode, setInputMode] = useState<'file' | 'url'>('file')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [previewSrc, setPreviewSrc] = useState<string>('')
  const [confidence, setConfidence] = useState<number>(40)
  const [overlap, setOverlap] = useState<number>(30)

  // Results state
  const [inferenceResult, setInferenceResult] = useState<RoboflowInferenceResult | null>(null)
  const [inferenceError, setInferenceError] = useState<string | null>(null)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Redmine modal state
  const [modal, setModal] = useState<RedmineModalState>({
    open: false,
    title: '',
    description: '',
    projectId: null,
    trackerId: null,
    priorityId: 4,
    submitting: false,
    error: null,
    successIssueId: null,
  })

  // ── Data queries ────────────────────────────────────────────────────────────

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['roboflow-projects'],
    queryFn: listProjects,
  })

  const { data: versionsData, isLoading: loadingVersions } = useQuery({
    queryKey: ['roboflow-versions', selectedProject],
    queryFn: () => listVersions(selectedProject),
    enabled: Boolean(selectedProject),
  })

  const { data: redmineProjectsData, isLoading: loadingRedmineProjects } = useQuery({
    queryKey: ['redmine-projects'],
    queryFn: () => listRedmineProjects({ limit: 100 }),
  })

  const { data: trackersData, isLoading: loadingTrackers } = useQuery({
    queryKey: ['redmine-trackers'],
    queryFn: listTrackers,
  })

  // ── Inference mutation ──────────────────────────────────────────────────────

  const inferenceMutation = useMutation({
    mutationFn: runInference,
    onSuccess: (result) => {
      setInferenceResult(result)
      setInferenceError(null)
      saveToHistory(result)
    },
    onError: (err: Error) => {
      setInferenceError(err.message ?? 'Inference failed. Please try again.')
    },
  })

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreviewSrc(URL.createObjectURL(file))
    setInferenceResult(null)
    setInferenceError(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setPreviewSrc(URL.createObjectURL(file))
    setInferenceResult(null)
    setInferenceError(null)
  }, [])

  const handleUrlChange = useCallback((url: string) => {
    setImageUrl(url)
    setPreviewSrc(url.trim() ? url : '')
    setInferenceResult(null)
    setInferenceError(null)
  }, [])

  const activeProjectId = modelSource === 'public' ? publicModelId.trim() : selectedProject
  const activeVersion = modelSource === 'public' ? publicModelVersion.trim() : selectedVersion

  const handleSubmit = useCallback(async () => {
    if (!activeProjectId || !activeVersion) return

    let imageBase64: string | undefined
    let urlToSend: string | undefined

    if (inputMode === 'file' && imageFile) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })
      imageBase64 = base64
    } else if (inputMode === 'url' && imageUrl.trim()) {
      urlToSend = imageUrl.trim()
    } else {
      return
    }

    inferenceMutation.mutate({
      projectId: activeProjectId,
      versionId: activeVersion,
      imageBase64,
      imageUrl: urlToSend,
      confidence: confidence / 100,
      overlap: overlap / 100,
    })
  }, [activeProjectId, activeVersion, inputMode, imageFile, imageUrl, confidence, overlap, inferenceMutation])

  const saveToHistory = useCallback(
    (result: RoboflowInferenceResult) => {
      const entry: InferenceHistoryEntry = {
        id: crypto.randomUUID(),
        projectId: selectedProject,
        version: selectedVersion,
        detectedClasses: [...new Set(result.predictions.map((p) => p.class))],
        confidence: calcAvgConfidence(result.predictions),
        timestamp: new Date().toISOString(),
      }
      try {
        const stored = localStorage.getItem('inferenceHistory')
        const history: InferenceHistoryEntry[] = stored ? JSON.parse(stored) : []
        history.unshift(entry)
        localStorage.setItem('inferenceHistory', JSON.stringify(history.slice(0, 100)))
      } catch {
        // ignore localStorage errors
      }
    },
    [selectedProject, selectedVersion],
  )

  const handleExportJson = useCallback(() => {
    if (!inferenceResult) return
    const blob = new Blob([JSON.stringify(inferenceResult, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inference-${selectedProject}-v${selectedVersion}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [inferenceResult, selectedProject, selectedVersion])

  const handleSaveImage = useCallback(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `detection-${Date.now()}.png`
    a.click()
  }, [])

  // ── Open Redmine modal ──────────────────────────────────────────────────────

  const handleOpenModal = useCallback(() => {
    if (!inferenceResult) return
    const classes = [...new Set(inferenceResult.predictions.map((p) => p.class))]
    const avg = calcAvgConfidence(inferenceResult.predictions)
    const priorityId = suggestPriority(avg)
    const projectName =
      projectsData?.projects.find((p) => p.id === selectedProject)?.name ?? selectedProject

    const descLines = [
      `## Roboflow Detection Report`,
      ``,
      `**Model:** ${projectName} (v${selectedVersion})`,
      `**Detection Count:** ${inferenceResult.predictions.length}`,
      `**Average Confidence:** ${(avg * 100).toFixed(1)}%`,
      `**Image Size:** ${inferenceResult.image.width} × ${inferenceResult.image.height}`,
      ...(inferenceResult.time
        ? [`**Inference Time:** ${inferenceResult.time.toFixed(3)}s`]
        : []),
      ``,
      `### Detections`,
      ...inferenceResult.predictions.map(
        (p, i) =>
          `${i + 1}. **${p.class}** — confidence: ${(p.confidence * 100).toFixed(1)}%, ` +
          `bbox: (${Math.round(p.x)}, ${Math.round(p.y)}) ${Math.round(p.width)}×${Math.round(p.height)}`,
      ),
    ]

    setModal({
      open: true,
      title: `[Detection] ${classes.join(', ')}`,
      description: descLines.join('\n'),
      projectId: null,
      trackerId: null,
      priorityId,
      submitting: false,
      error: null,
      successIssueId: null,
    })
  }, [inferenceResult, selectedProject, selectedVersion, projectsData])

  // ── Submit Redmine issue ────────────────────────────────────────────────────

  const handleModalSubmit = useCallback(async () => {
    if (!modal.projectId || !modal.title.trim() || !inferenceResult) return

    setModal((prev) => ({ ...prev, submitting: true, error: null }))

    try {
      // Attempt to export the annotated canvas and upload it as attachment
      let attachmentToken: string | null = null
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
      if (canvas) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/png')
          })
          if (blob) {
            const file = new File([blob], `detection-${Date.now()}.png`, { type: 'image/png' })
            const uploadResult = await uploadAttachment(file)
            attachmentToken = uploadResult.token
          }
        } catch {
          // Canvas may be tainted (CORS) — proceed without attachment
        }
      }

      const issue = await createIssue({
        project_id: modal.projectId,
        subject: modal.title.trim(),
        description: modal.description,
        priority_id: modal.priorityId,
        ...(modal.trackerId ? { tracker_id: modal.trackerId } : {}),
        ...(attachmentToken
          ? {
              uploads: [
                {
                  token: attachmentToken,
                  filename: `detection-${Date.now()}.png`,
                  content_type: 'image/png',
                  description: 'Annotated inference result',
                },
              ],
            }
          : {}),
      })

      // Persist issue id back to inference history
      try {
        const stored = localStorage.getItem('inferenceHistory')
        if (stored) {
          const history: InferenceHistoryEntry[] = JSON.parse(stored)
          const idx = history.findIndex(
            (h) => h.projectId === selectedProject && h.version === selectedVersion,
          )
          if (idx !== -1) {
            history[idx].redmineIssueId = issue.id
            localStorage.setItem('inferenceHistory', JSON.stringify(history))
          }
        }
      } catch {
        // ignore
      }

      setModal((prev) => ({ ...prev, submitting: false, successIssueId: issue.id }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create issue. Please try again.'
      setModal((prev) => ({ ...prev, submitting: false, error: message }))
    }
  }, [modal, inferenceResult, selectedProject, selectedVersion])

  // ── Derived values ──────────────────────────────────────────────────────────

  const projects = projectsData?.projects ?? []
  const versions = versionsData?.versions ?? []
  const redmineProjects = redmineProjectsData?.data ?? []
  const trackers = trackersData ?? []

  const canSubmit =
    activeProjectId &&
    activeVersion &&
    ((inputMode === 'file' && imageFile !== null) ||
      (inputMode === 'url' && imageUrl.trim() !== ''))

  const predictions = inferenceResult?.predictions ?? []
  const detectionClasses = [...new Set(predictions.map((p) => p.class))]
  const avgConf = calcAvgConfidence(predictions)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Run Inference</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Select a Roboflow model, provide an image, and run object detection.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left panel: Configuration ────────────────────────────────── */}
        <div className="xl:col-span-1 space-y-5">
          {/* Model selection */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Model Selection
            </h2>

            {/* Source toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => setModelSource('workspace')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  modelSource === 'workspace'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                My Workspace
              </button>
              <button
                onClick={() => setModelSource('public')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  modelSource === 'public'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Public Model
              </button>
            </div>

            {modelSource === 'workspace' ? (
              <>
                {/* Project dropdown */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Project</label>
                  {loadingProjects ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <Loader2 size={14} className="animate-spin" />
                      Loading projects…
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedProject}
                        onChange={(e) => {
                          setSelectedProject(e.target.value)
                          setSelectedVersion('')
                          setInferenceResult(null)
                        }}
                        className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                      >
                        <option value="">Select project…</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  )}
                </div>

                {/* Version dropdown */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Version</label>
                  {loadingVersions ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <Loader2 size={14} className="animate-spin" />
                      Loading versions…
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedVersion}
                        onChange={(e) => {
                          setSelectedVersion(e.target.value)
                          setInferenceResult(null)
                        }}
                        disabled={!selectedProject}
                        className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {!selectedProject ? 'Select a project first' : 'Select version…'}
                        </option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.version}>
                            v{v.version} — {v.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Public model ID */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Model ID</label>
                  <input
                    type="text"
                    value={publicModelId}
                    onChange={(e) => { setPublicModelId(e.target.value); setInferenceResult(null) }}
                    placeholder="e.g. rock-paper-scissors-sxsw"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                {/* Public model version */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Version</label>
                  <input
                    type="text"
                    value={publicModelVersion}
                    onChange={(e) => { setPublicModelVersion(e.target.value); setInferenceResult(null) }}
                    placeholder="e.g. 14"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Default is <span className="text-blue-400">new-pothole-detection v1</span> — a
                  public Smartathon model that detects potholes at ~91% confidence.
                </p>
              </>
            )}
          </div>

          {/* Image input */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Image Input
            </h2>

            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => {
                  setInputMode('file')
                  setInferenceResult(null)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                  inputMode === 'file'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Upload size={13} />
                Upload File
              </button>
              <button
                onClick={() => {
                  setInputMode('url')
                  setInferenceResult(null)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                  inputMode === 'url'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Link size={13} />
                Image URL
              </button>
            </div>

            {inputMode === 'file' ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-6 text-center transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {imageFile ? (
                  <div className="space-y-2">
                    <ImageIcon size={28} className="mx-auto text-blue-400" />
                    <p className="text-sm font-medium text-blue-400">{imageFile.name}</p>
                    <p className="text-xs text-gray-500">{(imageFile.size / 1024).toFixed(1)} KB</p>
                    <p className="text-xs text-gray-500">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload
                      size={28}
                      className="mx-auto text-gray-500 group-hover:text-blue-400 transition-colors"
                    />
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                      Drop an image or click to browse
                    </p>
                    <p className="text-xs text-gray-600">PNG, JPG, WEBP, GIF</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500">Enter a publicly accessible image URL</p>
              </div>
            )}
          </div>

          {/* Thresholds */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Detection Thresholds
            </h2>
            <ThresholdSlider
              label="Confidence Threshold"
              value={confidence}
              onChange={setConfidence}
            />
            <ThresholdSlider
              label="Overlap Threshold (IoU)"
              value={overlap}
              onChange={setOverlap}
            />
          </div>

          {/* Run button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || inferenceMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-900/30"
          >
            {inferenceMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Running Inference…
              </>
            ) : (
              <>
                <Play size={18} />
                Run Inference
              </>
            )}
          </button>

          {inferenceError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{inferenceError}</p>
            </div>
          )}
        </div>

        {/* ── Right panel: Results ──────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">
          {/* Canvas / preview */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                {inferenceResult ? 'Detection Results' : 'Image Preview'}
              </h2>
              {inferenceResult && (
                <div className="flex items-center gap-2 flex-wrap">
                  {inferenceResult.time && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} />
                      {(inferenceResult.time * 1000).toFixed(0)} ms
                    </span>
                  )}
                  <span className="text-sm text-gray-400">
                    {predictions.length} detection{predictions.length !== 1 ? 's' : ''}
                  </span>
                  {detectionClasses.map((cls) => (
                    <span
                      key={cls}
                      className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-medium"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4">
              {previewSrc ? (
                inferenceResult ? (
                  <BoundingBoxCanvas
                    imageUrl={previewSrc}
                    predictions={predictions}
                    naturalWidth={inferenceResult.image.width}
                    naturalHeight={inferenceResult.image.height}
                  />
                ) : (
                  <img
                    src={previewSrc}
                    alt="Preview"
                    className="w-full h-auto rounded-lg object-contain max-h-[480px]"
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                  <ImageIcon size={48} className="mb-3 opacity-40" />
                  <p className="text-sm">No image selected yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats + actions only after inference */}
          {inferenceResult && (
            <>
              {/* Detection count summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{predictions.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Detections</p>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{detectionClasses.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Classes</p>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {(avgConf * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Avg Confidence</p>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    {inferenceResult.time ? `${inferenceResult.time.toFixed(2)}s` : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Inference Time</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleOpenModal}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-900/30"
                >
                  <ExternalLink size={16} />
                  Create Redmine Issue
                </button>
                <button
                  onClick={handleExportJson}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <FileJson size={16} />
                  Export JSON
                </button>
                <button
                  onClick={handleSaveImage}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <Download size={16} />
                  Save Image
                </button>
              </div>

              {/* Detections table */}
              {predictions.length > 0 ? (
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                      Detection Details
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 bg-gray-800/50">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            #
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Class
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Confidence
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Center (x, y)
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Size (w × h)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.map((pred, i) => (
                          <DetectionRow key={pred.detection_id ?? i} pred={pred} index={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
                  <AlertCircle size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-400 font-medium">No detections found</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Try lowering the confidence threshold or using a different image.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Redmine Modal */}
      <RedmineModal
        state={modal}
        onChange={(patch) => setModal((prev) => ({ ...prev, ...patch }))}
        onClose={() => setModal((prev) => ({ ...prev, open: false }))}
        onSubmit={handleModalSubmit}
        redmineProjects={redmineProjects}
        trackers={trackers}
        loadingProjects={loadingRedmineProjects}
        loadingTrackers={loadingTrackers}
      />
    </div>
  )
}
