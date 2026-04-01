import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AxiosError } from 'axios';
import * as redmineService from '../services/redmine.service';

const router = Router();

// Store files in memory so we can forward the buffer to Redmine
const upload = multer({ storage: multer.memoryStorage() });

// Helper to forward Axios errors with their original status codes
function handleError(err: unknown, res: Response): void {
  if (err instanceof AxiosError && err.response) {
    res
      .status(err.response.status)
      .json({ error: err.response.data ?? err.message });
    return;
  }
  res
    .status(500)
    .json({ error: (err as Error).message ?? 'Internal server error' });
}

// ---- Projects ----

// GET /api/redmine/projects
// List all Redmine projects. Optional query params: offset, limit
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const response = await redmineService.listProjects(offset, limit);
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/redmine/projects
// Create a new Redmine project
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const response = await redmineService.createProject(req.body);
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// ---- Memberships ----

// GET /api/redmine/projects/:id/members
// List members of a project
router.get('/projects/:id/members', async (req: Request, res: Response) => {
  try {
    const response = await redmineService.listMembers(req.params.id);
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/redmine/projects/:id/memberships
// Add a member to a project
// Body: { user_id: number, role_ids: number[] }
router.post(
  '/projects/:id/memberships',
  async (req: Request, res: Response) => {
    try {
      const response = await redmineService.addMember(req.params.id, req.body);
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// ---- Issues ----

// GET /api/redmine/issues
// List issues across all projects. Optional query params: project_id, status_id,
// priority_id, assigned_to_id, tracker_id, offset, limit, sort
router.get('/issues', async (req: Request, res: Response) => {
  try {
    const params: redmineService.ListAllIssuesParams = {};
    if (req.query.project_id) params.project_id = req.query.project_id as string;
    if (req.query.status_id) params.status_id = req.query.status_id as string;
    if (req.query.priority_id) params.priority_id = Number(req.query.priority_id);
    if (req.query.assigned_to_id) params.assigned_to_id = Number(req.query.assigned_to_id);
    if (req.query.tracker_id) params.tracker_id = Number(req.query.tracker_id);
    if (req.query.offset) params.offset = Number(req.query.offset);
    if (req.query.limit) params.limit = Number(req.query.limit);
    if (req.query.sort) params.sort = req.query.sort as string;

    const response = await redmineService.listAllIssues(params);
    // Normalise to PaginatedResponse shape the frontend expects
    const raw = response.data as { issues?: unknown[]; total_count?: number; offset?: number; limit?: number };
    res.status(response.status).json({
      data: raw.issues ?? [],
      total_count: raw.total_count ?? 0,
      offset: raw.offset ?? 0,
      limit: raw.limit ?? 25,
    });
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/redmine/projects/:id/issues
// List issues for a project.
// Optional query params: status_id, priority_id, assigned_to_id, tracker_id,
//                        category_id, offset, limit, sort
router.get('/projects/:id/issues', async (req: Request, res: Response) => {
  try {
    const params: redmineService.ListIssuesParams = {};

    if (req.query.status_id)
      params.status_id = req.query.status_id as string;
    if (req.query.priority_id)
      params.priority_id = Number(req.query.priority_id);
    if (req.query.assigned_to_id)
      params.assigned_to_id = Number(req.query.assigned_to_id);
    if (req.query.tracker_id)
      params.tracker_id = Number(req.query.tracker_id);
    if (req.query.category_id)
      params.category_id = Number(req.query.category_id);
    if (req.query.offset) params.offset = Number(req.query.offset);
    if (req.query.limit) params.limit = Number(req.query.limit);
    if (req.query.sort) params.sort = req.query.sort as string;

    const response = await redmineService.listIssues(req.params.id, params);
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/redmine/projects/:id/issues
// Create an issue in a project.
// Body fields: subject (required), description, tracker_id, priority_id,
//              assigned_to_id, status_id, due_date, uploads (array of attachment tokens)
router.post('/projects/:id/issues', async (req: Request, res: Response) => {
  try {
    const response = await redmineService.createIssue(req.params.id, req.body);
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/redmine/issues/:id
// Get details for a single issue (includes journals, attachments, relations, children)
router.get('/issues/:id', async (req: Request, res: Response) => {
  try {
    const response = await redmineService.getIssue(req.params.id);
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// PUT /api/redmine/issues/:id
// Update an issue (status, assignee, priority, notes, etc.)
// Body fields: any updatable issue fields
router.put('/issues/:id', async (req: Request, res: Response) => {
  try {
    const response = await redmineService.updateIssue(req.params.id, req.body);
    // Redmine returns 200 or 204 on success with no body
    if (response.status === 204) {
      res.status(204).send();
      return;
    }
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// ---- Users ----

// GET /api/redmine/users
// List Redmine users. Optional query params: offset, limit
router.get('/users', async (req: Request, res: Response) => {
  try {
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const response = await redmineService.listUsers(offset, limit);
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// ---- Trackers ----

// GET /api/redmine/trackers
router.get('/trackers', async (_req: Request, res: Response) => {
  try {
    const response = await redmineService.listTrackers();
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// ---- Issue Statuses ----

// GET /api/redmine/issue_statuses
router.get('/issue_statuses', async (_req: Request, res: Response) => {
  try {
    const response = await redmineService.listIssueStatuses();
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// ---- Roles ----

// GET /api/redmine/roles
router.get('/roles', async (_req: Request, res: Response) => {
  try {
    const response = await redmineService.listRoles();
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// ---- Uploads / Attachments ----

// POST /api/redmine/uploads
// Upload an attachment file to Redmine (two-step process).
// Step 1 (this endpoint): Upload the raw file and receive a token.
// Step 2: Include the token in the "uploads" array when creating/updating an issue.
//
// Accepts multipart/form-data with field "file".
// Returns: { upload: { token: "..." } }
router.post(
  '/uploads',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const filename =
        (req.body.filename as string) || req.file.originalname;

      const response = await redmineService.uploadAttachment(
        req.file.buffer,
        filename
      );
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// ---- Issue Categories ----

// GET /api/redmine/projects/:id/issue_categories
router.get(
  '/projects/:id/issue_categories',
  async (req: Request, res: Response) => {
    try {
      const response = await redmineService.listIssueCategories(req.params.id);
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

export default router;
