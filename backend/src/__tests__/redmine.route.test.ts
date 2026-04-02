import request from 'supertest';
import express from 'express';
import * as redmineService from '../services/redmine.service';
import redmineRouter from '../routes/redmine';

jest.mock('../services/redmine.service');
const mockService = redmineService as jest.Mocked<typeof redmineService>;

const app = express();
app.use(express.json());
app.use('/api/redmine', redmineRouter);

// ---------------------------------------------------------------------------
// GET /api/redmine/issues  (global issues list)
// ---------------------------------------------------------------------------

describe('GET /api/redmine/issues', () => {
  it('normalises Redmine envelope to { data, total_count, offset, limit }', async () => {
    mockService.listAllIssues.mockResolvedValueOnce({
      status: 200,
      data: {
        issues: [
          { id: 1, subject: 'Fix inference crash', status: { name: 'New' } },
          { id: 2, subject: 'Upload endpoint 404', status: { name: 'In Progress' } },
        ],
        total_count: 2,
        offset: 0,
        limit: 25,
      },
    } as never);

    const res = await request(app).get('/api/redmine/issues');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].subject).toBe('Fix inference crash');
    expect(res.body.total_count).toBe(2);
    expect(res.body.offset).toBe(0);
    expect(res.body.limit).toBe(25);
  });

  it('passes query params through to the service', async () => {
    mockService.listAllIssues.mockResolvedValueOnce({
      status: 200,
      data: { issues: [], total_count: 0, offset: 0, limit: 10 },
    } as never);

    await request(app).get('/api/redmine/issues?limit=10&status_id=open&sort=created_on:desc');

    expect(mockService.listAllIssues).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, status_id: 'open', sort: 'created_on:desc' })
    );
  });

  it('returns empty data array when Redmine returns no issues', async () => {
    mockService.listAllIssues.mockResolvedValueOnce({
      status: 200,
      data: { issues: [], total_count: 0 },
    } as never);

    const res = await request(app).get('/api/redmine/issues');
    expect(res.body.data).toEqual([]);
    expect(res.body.total_count).toBe(0);
  });

  it('returns 500 on service error', async () => {
    mockService.listAllIssues.mockRejectedValueOnce(new Error('Redmine unreachable'));
    const res = await request(app).get('/api/redmine/issues');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Redmine unreachable');
  });
});

// ---------------------------------------------------------------------------
// GET /api/redmine/projects
// ---------------------------------------------------------------------------

describe('GET /api/redmine/projects', () => {
  it('forwards Redmine projects response as-is', async () => {
    mockService.listProjects.mockResolvedValueOnce({
      status: 200,
      data: {
        projects: [{ id: 1, name: 'CV QA', identifier: 'cv-qa' }],
        total_count: 1,
        offset: 0,
        limit: 25,
      },
    } as never);

    const res = await request(app).get('/api/redmine/projects');
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.total_count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/redmine/issues/:id
// ---------------------------------------------------------------------------

describe('GET /api/redmine/issues/:id', () => {
  it('returns a single issue with journals and attachments', async () => {
    mockService.getIssue.mockResolvedValueOnce({
      status: 200,
      data: {
        issue: {
          id: 5,
          subject: 'Night-time confidence drop',
          journals: [{ id: 1, notes: 'Investigating low-light training set' }],
        },
      },
    } as never);

    const res = await request(app).get('/api/redmine/issues/5');
    expect(res.status).toBe(200);
    expect(res.body.issue.id).toBe(5);
  });

  it('returns 500 when the issue does not exist', async () => {
    mockService.getIssue.mockRejectedValueOnce(new Error('404'));
    const res = await request(app).get('/api/redmine/issues/99999');
    expect(res.status).toBe(500);
  });
});
