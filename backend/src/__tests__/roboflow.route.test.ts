import request from 'supertest';
import express from 'express';
import * as roboflowService from '../services/roboflow.service';
import roboflowRouter from '../routes/roboflow';

// Mock the entire service layer so no real HTTP calls are made
jest.mock('../services/roboflow.service');
const mockService = roboflowService as jest.Mocked<typeof roboflowService>;

const app = express();
app.use(express.json());
app.use('/api/roboflow', roboflowRouter);

// ---------------------------------------------------------------------------
// GET /api/roboflow/projects
// ---------------------------------------------------------------------------

describe('GET /api/roboflow/projects', () => {
  it('unwraps workspace envelope and normalises classes to a count', async () => {
    mockService.listProjects.mockResolvedValueOnce({
      status: 200,
      data: {
        workspace: {
          projects: [
            { id: 'ws/proj-a', name: 'Proj A', images: 100, classes: { cat: 50, dog: 50 } },
            { id: 'ws/proj-b', name: 'Proj B', images: 200, classes: 3 },
          ],
        },
      },
    } as never);

    const res = await request(app).get('/api/roboflow/projects');

    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(2);
    expect(res.body.projects[0].classes).toBe(2);   // object → key count
    expect(res.body.projects[1].classes).toBe(3);   // number → unchanged
  });

  it('returns empty projects array when workspace has no projects', async () => {
    mockService.listProjects.mockResolvedValueOnce({
      status: 200,
      data: { workspace: { projects: [] } },
    } as never);

    const res = await request(app).get('/api/roboflow/projects');
    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
  });

  it('returns 500 when the service throws', async () => {
    mockService.listProjects.mockRejectedValueOnce(new Error('Network error'));

    const res = await request(app).get('/api/roboflow/projects');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Network error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/roboflow/projects/:projectId
// ---------------------------------------------------------------------------

describe('GET /api/roboflow/projects/:projectId', () => {
  it('unwraps project nested under its identifier and normalises classes', async () => {
    mockService.getProject.mockResolvedValueOnce({
      status: 200,
      data: {
        'pothole-detection': {
          id: 'ws/pothole-detection',
          name: 'Pothole Detection',
          classes: { pothole: 638, road: 100 },
          images: 9240,
        },
      },
    } as never);

    const res = await request(app).get('/api/roboflow/projects/pothole-detection');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Pothole Detection');
    expect(res.body.classes).toBe(2);
    expect(res.body.images).toBe(9240);
  });

  it('returns 500 on service error', async () => {
    mockService.getProject.mockRejectedValueOnce(new Error('Not found'));
    const res = await request(app).get('/api/roboflow/projects/bad-id');
    expect(res.status).toBe(500);
  });
});
