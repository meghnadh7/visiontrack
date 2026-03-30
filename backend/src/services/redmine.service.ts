import axios, { AxiosInstance, AxiosResponse } from 'axios';

const REDMINE_URL = process.env.REDMINE_URL || '';
const REDMINE_API_KEY = process.env.REDMINE_API_KEY || '';

const redmineClient: AxiosInstance = axios.create({
  baseURL: REDMINE_URL,
  headers: {
    'X-Redmine-API-Key': REDMINE_API_KEY,
    'Content-Type': 'application/json',
  },
});

// ---- Projects ----

export async function listProjects(
  offset?: number,
  limit?: number
): Promise<AxiosResponse> {
  const params: Record<string, number> = {};
  if (offset !== undefined) params['offset'] = offset;
  if (limit !== undefined) params['limit'] = limit;
  return redmineClient.get('/projects.json', { params });
}

export async function createProject(
  body: Record<string, unknown>
): Promise<AxiosResponse> {
  return redmineClient.post('/projects.json', { project: body });
}

// ---- Memberships ----

export async function listMembers(projectId: string): Promise<AxiosResponse> {
  return redmineClient.get(`/projects/${projectId}/memberships.json`);
}

export async function addMember(
  projectId: string,
  body: Record<string, unknown>
): Promise<AxiosResponse> {
  return redmineClient.post(`/projects/${projectId}/memberships.json`, {
    membership: body,
  });
}

// ---- Issues ----

export interface ListIssuesParams {
  status_id?: string;
  priority_id?: number;
  assigned_to_id?: number;
  tracker_id?: number;
  category_id?: number;
  offset?: number;
  limit?: number;
  sort?: string;
}

export async function listIssues(
  projectId: string,
  params?: ListIssuesParams
): Promise<AxiosResponse> {
  return redmineClient.get(`/projects/${projectId}/issues.json`, { params });
}

export async function createIssue(
  projectId: string,
  body: Record<string, unknown>
): Promise<AxiosResponse> {
  return redmineClient.post(`/projects/${projectId}/issues.json`, {
    issue: { project_id: projectId, ...body },
  });
}

export async function getIssue(issueId: string): Promise<AxiosResponse> {
  return redmineClient.get(`/issues/${issueId}.json`, {
    params: { include: 'journals,attachments,relations,children' },
  });
}

export async function updateIssue(
  issueId: string,
  body: Record<string, unknown>
): Promise<AxiosResponse> {
  return redmineClient.put(`/issues/${issueId}.json`, { issue: body });
}

// ---- Users ----

export async function listUsers(
  offset?: number,
  limit?: number
): Promise<AxiosResponse> {
  const params: Record<string, number> = {};
  if (offset !== undefined) params['offset'] = offset;
  if (limit !== undefined) params['limit'] = limit;
  return redmineClient.get('/users.json', { params });
}

// ---- Trackers ----

export async function listTrackers(): Promise<AxiosResponse> {
  return redmineClient.get('/trackers.json');
}

// ---- Issue Statuses ----

export async function listIssueStatuses(): Promise<AxiosResponse> {
  return redmineClient.get('/issue_statuses.json');
}

// ---- Roles ----

export async function listRoles(): Promise<AxiosResponse> {
  return redmineClient.get('/roles.json');
}

// ---- Uploads / Attachments ----
// Step 1: Upload the raw file bytes and get back an upload token
export async function uploadAttachment(
  fileBuffer: Buffer,
  filename: string
): Promise<AxiosResponse> {
  return axios.post(`${REDMINE_URL}/uploads.json`, fileBuffer, {
    headers: {
      'X-Redmine-API-Key': REDMINE_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
    params: { filename },
  });
}

// ---- Issue Categories ----

export async function listIssueCategories(
  projectId: string
): Promise<AxiosResponse> {
  return redmineClient.get(`/projects/${projectId}/issue_categories.json`);
}
