import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  GitBranch,
  Image,
  Upload,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Calendar,
  Layers,
  ExternalLink,
  PenLine,
} from 'lucide-react'
import {
  getProject,
  listVersions,
  listImages,
  uploadImage,
  type RoboflowVersion,
  type RoboflowImage,
} from '../../api/roboflow'

function VersionCard({ version }: { version: RoboflowVersion }) {
  const total =
    (version.splits?.train ?? 0) +
    (version.splits?.valid ?? 0) +
    (version.splits?.test ?? 0)

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-white text-sm">Version {version.version}</h4>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">{version.id}</p>
        </div>
        <span className="tag">v{version.version}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Total', value: total },
          { label: 'Train', value: version.splits?.train ?? 0 },
          { label: 'Valid', value: version.splits?.valid ?? 0 },
          { label: 'Test', value: version.splits?.test ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800/60 rounded-lg p-2">
            <div className="text-sm font-semibold text-white">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Calendar size={11} />
        {new Date(version.created).toLocaleDateString()}
      </div>
    </div>
  )
}

function ImageCard({ image, projectId }: { image: RoboflowImage; projectId: string }) {
  const annotateUrl = `https://app.roboflow.com/${projectId}/annotate/${image.id}`

  return (
    <div className="card overflow-hidden group">
      <div className="relative">
        {image.thumb ? (
          <img
            src={image.thumb}
            alt={image.name}
            className="w-full h-32 object-cover bg-gray-800 group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-32 bg-gray-800 flex items-center justify-center">
            <Image size={24} className="text-gray-600" />
          </div>
        )}
        {!image.annotated && (
          <a
            href={annotateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Open in Roboflow annotation editor"
          >
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg">
              <PenLine size={12} /> Annotate
            </span>
          </a>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-medium text-gray-300 truncate" title={image.name}>
          {image.name}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              image.split === 'train'
                ? 'bg-blue-500/15 text-blue-400'
                : image.split === 'valid'
                ? 'bg-yellow-500/15 text-yellow-400'
                : 'bg-green-500/15 text-green-400'
            }`}
          >
            {image.split}
          </span>
          {image.annotated ? (
            <CheckCircle2 size={12} className="text-green-400" aria-label="Annotated" />
          ) : (
            <a
              href={annotateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              title="Open annotation editor"
            >
              <ExternalLink size={11} /> Annotate
            </a>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {image.width}×{image.height}
        </p>
      </div>
    </div>
  )
}

type Tab = 'versions' | 'images'

export default function RoboflowProjectDetail() {
  const { projectId: rawProjectId } = useParams<{ projectId: string }>()
  // Roboflow project IDs are "workspace/project" — URL uses "--" as separator
  const projectId = rawProjectId?.replace('--', '/') ?? ''
  const [activeTab, setActiveTab] = useState<Tab>('versions')
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imageSplit, setImageSplit] = useState<'train' | 'valid' | 'test'>('train')
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: project, isLoading: projectLoading, isError: projectError } = useQuery({
    queryKey: ['roboflow-project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  })

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['roboflow-versions', projectId],
    queryFn: () => listVersions(projectId!),
    enabled: !!projectId && activeTab === 'versions',
  })

  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ['roboflow-images', projectId],
    queryFn: () => listImages(projectId!, { perPage: 24 }),
    enabled: !!projectId && activeTab === 'images',
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImage(projectId!, file, imageSplit),
    onSuccess: () => {
      setUploadStatus('success')
      qc.invalidateQueries({ queryKey: ['roboflow-images', projectId] })
      qc.invalidateQueries({ queryKey: ['roboflow-project', projectId] })
      setTimeout(() => setUploadStatus('idle'), 3000)
    },
    onError: (err: Error) => {
      setUploadStatus('error')
      setUploadError(err.message)
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus('uploading')
    setUploadError(null)
    uploadMutation.mutate(file)
    e.target.value = ''
  }

  if (projectLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (projectError || !project) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <p className="font-semibold">Project not found</p>
          </div>
          <Link to="/roboflow/projects" className="btn-secondary mt-4 inline-flex">
            <ArrowLeft size={14} /> Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/roboflow/projects" className="hover:text-gray-300 transition-colors">
          Roboflow Projects
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-300 font-medium">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="card card-body">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <p className="text-sm font-mono text-gray-500 mt-0.5">{project.id}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="tag">{project.type}</span>
              {project.annotation && <span className="tag">{project.annotation}</span>}
              {project.license && <span className="tag">{project.license}</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:text-right">
            {[
              { label: 'Images', value: project.images?.toLocaleString() ?? 0 },
              { label: 'Classes', value: project.classes ?? 0 },
              { label: 'Versions', value: project.versions ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800/60 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg w-fit">
        {(['versions', 'images'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'versions' ? <GitBranch size={14} /> : <Image size={14} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Versions tab */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2">
              <Layers size={18} className="text-gray-500" />
              Dataset Versions
            </h2>
          </div>

          {versionsLoading && (
            <div className="loading-overlay">
              <div className="spinner w-6 h-6" />
            </div>
          )}

          {!versionsLoading &&
            (versionsData?.versions?.length === 0 ? (
              <div className="empty-state">
                <GitBranch size={40} className="empty-state-icon" />
                <p className="empty-state-title">No versions yet</p>
                <p className="empty-state-desc">
                  Generate a dataset version in Roboflow to export your annotated images.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {versionsData?.versions?.map((v) => (
                  <VersionCard key={v.id} version={v} />
                ))}
              </div>
            ))}
        </div>
      )}

      {/* Images tab */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="section-title flex items-center gap-2">
              <Image size={18} className="text-gray-500" />
              Images{' '}
              {imagesData?.total != null && (
                <span className="text-sm font-normal text-gray-500">
                  ({imagesData.total.toLocaleString()} total)
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              <select
                value={imageSplit}
                onChange={(e) => setImageSplit(e.target.value as 'train' | 'valid' | 'test')}
                className="select w-28"
              >
                <option value="train">Train</option>
                <option value="valid">Valid</option>
                <option value="test">Test</option>
              </select>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadStatus === 'uploading'}
                className="btn-primary"
              >
                {uploadStatus === 'uploading' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                {uploadStatus === 'uploading' ? 'Uploading…' : 'Upload Image'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              <CheckCircle2 size={16} />
              Image uploaded successfully!
            </div>
          )}

          {uploadStatus === 'error' && uploadError && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={16} />
              {uploadError}
            </div>
          )}

          {imagesLoading && (
            <div className="loading-overlay">
              <div className="spinner w-6 h-6" />
            </div>
          )}

          {!imagesLoading &&
            (imagesData?.images?.length === 0 ? (
              <div className="empty-state">
                <Image size={40} className="empty-state-icon" />
                <p className="empty-state-title">No images yet</p>
                <p className="empty-state-desc">Upload images to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {imagesData?.images?.map((img) => (
                  <ImageCard key={img.id} image={img} projectId={projectId!} />
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
