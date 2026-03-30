import client from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoboflowProject {
  id: string
  name: string
  type: string
  classes: number
  images: number
  versions: number
  created: string
  updated: string
  annotation: string
  license?: string
}

export interface RoboflowVersion {
  id: string
  name: string
  version: number
  images: number
  splits: {
    train: number
    valid: number
    test: number
  }
  created: string
  preprocessing?: Record<string, unknown>
  augmentation?: Record<string, unknown>
  exports?: string[]
}

export interface RoboflowImage {
  id: string
  name: string
  width: number
  height: number
  created: string
  split: string
  annotated: boolean
  thumb?: string
}

export interface RoboflowPrediction {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  class: string
  class_id?: number
  detection_id?: string
}

export interface RoboflowInferenceResult {
  predictions: RoboflowPrediction[]
  image: {
    width: number
    height: number
  }
  time?: number
}

export interface ListProjectsResponse {
  projects: RoboflowProject[]
}

export interface ListVersionsResponse {
  versions: RoboflowVersion[]
}

export interface ListImagesResponse {
  images: RoboflowImage[]
  total: number
}

export interface UploadImageResponse {
  id: string
  success: boolean
}

export interface CreateVersionResponse {
  version: RoboflowVersion
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function listProjects(): Promise<ListProjectsResponse> {
  const { data } = await client.get<ListProjectsResponse>('/roboflow/projects')
  return data
}

export async function getProject(projectId: string): Promise<RoboflowProject> {
  const { data } = await client.get<RoboflowProject>(`/roboflow/projects/${projectId}`)
  return data
}

export async function listVersions(projectId: string): Promise<ListVersionsResponse> {
  const { data } = await client.get<ListVersionsResponse>(
    `/roboflow/projects/${projectId}/versions`,
  )
  return data
}

export interface CreateVersionPayload {
  name: string
  preprocessing?: Record<string, unknown>
  augmentation?: Record<string, unknown>
}

export async function createVersion(
  projectId: string,
  payload: CreateVersionPayload,
): Promise<CreateVersionResponse> {
  const { data } = await client.post<CreateVersionResponse>(
    `/roboflow/projects/${projectId}/versions`,
    payload,
  )
  return data
}

export async function uploadImage(
  projectId: string,
  file: File,
  split: 'train' | 'valid' | 'test' = 'train',
): Promise<UploadImageResponse> {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('split', split)
  const { data } = await client.post<UploadImageResponse>(
    `/roboflow/projects/${projectId}/images`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return data
}

export async function listImages(
  projectId: string,
  params?: { split?: string; page?: number; perPage?: number },
): Promise<ListImagesResponse> {
  const { data } = await client.get<ListImagesResponse>(
    `/roboflow/projects/${projectId}/images`,
    { params },
  )
  return data
}

export async function getImage(projectId: string, imageId: string): Promise<RoboflowImage> {
  const { data } = await client.get<RoboflowImage>(
    `/roboflow/projects/${projectId}/images/${imageId}`,
  )
  return data
}

export interface RunInferencePayload {
  projectId: string
  versionId: string | number
  imageUrl?: string
  imageBase64?: string
  confidence?: number
  overlap?: number
}

export async function runInference(
  payload: RunInferencePayload,
): Promise<RoboflowInferenceResult> {
  const { data } = await client.post<RoboflowInferenceResult>('/roboflow/inference', payload)
  return data
}
