import client from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RedmineProject {
  id: number
  name: string
  identifier: string
  description?: string
  status: number
  is_public: boolean
  created_on: string
  updated_on: string
}

export interface RedmineMember {
  id: number
  user: { id: number; name: string }
  roles: { id: number; name: string }[]
}

export interface RedmineIssue {
  id: number
  project: { id: number; name: string }
  tracker: { id: number; name: string }
  status: { id: number; name: string }
  priority: { id: number; name: string }
  author: { id: number; name: string }
  assigned_to?: { id: number; name: string }
  subject: string
  description?: string
  start_date?: string
  due_date?: string
  done_ratio: number
  estimated_hours?: number
  created_on: string
  updated_on: string
  closed_on?: string
  attachments?: RedmineAttachment[]
  journals?: RedmineJournal[]
}

export interface RedmineAttachment {
  id: number
  filename: string
  filesize: number
  content_type: string
  description?: string
  content_url: string
  author: { id: number; name: string }
  created_on: string
}

export interface RedmineJournal {
  id: number
  user: { id: number; name: string }
  notes?: string
  created_on: string
  details: {
    property: string
    name: string
    old_value?: string
    new_value?: string
  }[]
}

export interface RedmineUser {
  id: number
  login: string
  firstname: string
  lastname: string
  mail?: string
  created_on: string
  last_login_on?: string
}

export interface RedmineTracker {
  id: number
  name: string
  default_status?: { id: number; name: string }
}

export interface RedmineStatus {
  id: number
  name: string
  is_closed: boolean
}

export interface RedmineRole {
  id: number
  name: string
  assignable: boolean
  issues_visibility: string
  time_entries_visibility: string
  permissions?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total_count: number
  offset: number
  limit: number
}

export interface UploadTokenResponse {
  token: string
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function listProjects(params?: {
  limit?: number
  offset?: number
}): Promise<PaginatedResponse<RedmineProject>> {
  const { data } = await client.get<PaginatedResponse<RedmineProject>>('/redmine/projects', {
    params,
  })
  return data
}

export interface CreateProjectPayload {
  name: string
  identifier: string
  description?: string
  is_public?: boolean
  parent_id?: number
}

export async function createProject(payload: CreateProjectPayload): Promise<RedmineProject> {
  const { data } = await client.post<RedmineProject>('/redmine/projects', payload)
  return data
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getProjectMembers(
  projectId: string | number,
): Promise<PaginatedResponse<RedmineMember>> {
  const { data } = await client.get<PaginatedResponse<RedmineMember>>(
    `/redmine/projects/${projectId}/members`,
  )
  return data
}

export interface AddMemberPayload {
  userId: number
  roleIds: number[]
}

export async function addMember(
  projectId: string | number,
  payload: AddMemberPayload,
): Promise<RedmineMember> {
  const { data } = await client.post<RedmineMember>(
    `/redmine/projects/${projectId}/members`,
    payload,
  )
  return data
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export interface ListIssuesParams {
  project_id?: string | number
  tracker_id?: number
  status_id?: string | number
  assigned_to_id?: string | number
  priority_id?: number
  limit?: number
  offset?: number
  sort?: string
}

export async function listIssues(
  params?: ListIssuesParams,
): Promise<PaginatedResponse<RedmineIssue>> {
  const { data } = await client.get<PaginatedResponse<RedmineIssue>>('/redmine/issues', {
    params,
  })
  return data
}

export interface CreateIssuePayload {
  project_id: number
  tracker_id?: number
  status_id?: number
  priority_id?: number
  assigned_to_id?: number
  subject: string
  description?: string
  start_date?: string
  due_date?: string
  estimated_hours?: number
  done_ratio?: number
  uploads?: { token: string; filename: string; content_type: string; description?: string }[]
}

export async function createIssue(payload: CreateIssuePayload): Promise<RedmineIssue> {
  const { data } = await client.post<RedmineIssue>('/redmine/issues', payload)
  return data
}

export async function getIssue(issueId: string | number): Promise<RedmineIssue> {
  const { data } = await client.get<RedmineIssue>(`/redmine/issues/${issueId}`)
  return data
}

export interface UpdateIssuePayload extends Partial<CreateIssuePayload> {
  notes?: string
}

export async function updateIssue(
  issueId: string | number,
  payload: UpdateIssuePayload,
): Promise<RedmineIssue> {
  const { data } = await client.put<RedmineIssue>(`/redmine/issues/${issueId}`, payload)
  return data
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function listUsers(params?: {
  limit?: number
  offset?: number
  status?: number
}): Promise<PaginatedResponse<RedmineUser>> {
  const { data } = await client.get<PaginatedResponse<RedmineUser>>('/redmine/users', { params })
  return data
}

// ─── Trackers ─────────────────────────────────────────────────────────────────

export async function listTrackers(): Promise<RedmineTracker[]> {
  const { data } = await client.get<RedmineTracker[]>('/redmine/trackers')
  return data
}

// ─── Statuses ─────────────────────────────────────────────────────────────────

export async function listStatuses(): Promise<RedmineStatus[]> {
  const { data } = await client.get<RedmineStatus[]>('/redmine/issue_statuses')
  return data
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<RedmineRole[]> {
  const { data } = await client.get<RedmineRole[]>('/redmine/roles')
  return data
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export async function uploadAttachment(file: File): Promise<UploadTokenResponse> {
  const { data } = await client.post<UploadTokenResponse>(
    '/redmine/uploads',
    file,
    {
      headers: { 'Content-Type': 'application/octet-stream' },
      params: { filename: file.name },
    },
  )
  return data
}
