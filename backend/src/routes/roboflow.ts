import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AxiosError } from 'axios';
import * as roboflowService from '../services/roboflow.service';
import { normaliseProject, unwrapProjectDetail } from '../utils/normalise';

const router = Router();

// Multer: store files in memory so we can forward the buffer
const upload = multer({ storage: multer.memoryStorage() });

// Helper to forward Axios errors with their original status codes
function handleError(err: unknown, res: Response): void {
  if (err instanceof AxiosError && err.response) {
    res
      .status(err.response.status)
      .json({ error: err.response.data ?? err.message });
    return;
  }
  res.status(500).json({ error: (err as Error).message ?? 'Internal server error' });
}

// GET /api/roboflow/projects
// List all projects in the configured workspace
router.get('/projects', async (_req: Request, res: Response) => {
  try {
    const response = await roboflowService.listProjects();
    // Roboflow returns { workspace: { ..., projects: [] } } — normalise to { projects: [] }
    const data = response.data as { workspace?: { projects?: Record<string, unknown>[] } };
    const rawProjects = data?.workspace?.projects ?? (response.data as { projects?: Record<string, unknown>[] }).projects ?? [];
    const projects = rawProjects.map(normaliseProject);
    res.status(response.status).json({ projects });
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/roboflow/projects/:workspace/:project
// Get details for a specific project (project IDs are workspace/project)
router.get('/projects/:workspace/:project', async (req: Request, res: Response) => {
  try {
    const projectId = `${req.params.workspace}/${req.params.project}`;
    const response = await roboflowService.getProject(projectId);
    const project = unwrapProjectDetail(response.data as Record<string, unknown>);
    res.status(response.status).json(project);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/roboflow/projects/:workspace/:project/versions
router.get(
  '/projects/:workspace/:project/versions',
  async (req: Request, res: Response) => {
    try {
      const projectId = `${req.params.workspace}/${req.params.project}`;
      const response = await roboflowService.listVersions(projectId);
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// POST /api/roboflow/projects/:workspace/:project/versions
router.post(
  '/projects/:workspace/:project/versions',
  async (req: Request, res: Response) => {
    try {
      const projectId = `${req.params.workspace}/${req.params.project}`;
      const response = await roboflowService.createVersion(projectId, req.body);
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// POST /api/roboflow/projects/:workspace/:project/images
router.post(
  '/projects/:workspace/:project/images',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const projectId = `${req.params.workspace}/${req.params.project}`;
      const split: string = (req.body.split as string) || 'train';
      const imageUrl: string | undefined = req.query.url as string | undefined;

      if (imageUrl) {
        // Upload by public URL using base64 approach: fetch the image then forward
        // For URL-based uploads Roboflow accepts a JSON body with the image URL
        const axiosLib = await import('axios');
        const imgRes = await axiosLib.default.get(imageUrl, {
          responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(imgRes.data as ArrayBuffer);
        const filename = imageUrl.split('/').pop() || 'image.jpg';
        const mimetype =
          (imgRes.headers['content-type'] as string) || 'image/jpeg';
        const response = await roboflowService.uploadImageFormData(
          projectId,
          buffer,
          filename,
          mimetype,
          split
        );
        res.status(response.status).json(response.data);
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No image file or URL provided' });
        return;
      }

      const response = await roboflowService.uploadImageFormData(
        projectId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        split
      );
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// GET /api/roboflow/projects/:workspace/:project/images
router.get(
  '/projects/:workspace/:project/images',
  async (req: Request, res: Response) => {
    try {
      const projectId = `${req.params.workspace}/${req.params.project}`;
      const split = req.query.split as string | undefined;
      const response = await roboflowService.listImages(projectId, split);
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// GET /api/roboflow/projects/:workspace/:project/images/:imageId
router.get(
  '/projects/:workspace/:project/images/:imageId',
  async (req: Request, res: Response) => {
    try {
      const projectId = `${req.params.workspace}/${req.params.project}`;
      const response = await roboflowService.getImage(projectId, req.params.imageId);
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// POST /api/roboflow/inference
// Run inference. Accepts JSON body: { projectId, versionId, imageUrl?, imageBase64?, confidence?, overlap? }
router.post(
  '/inference',
  async (req: Request, res: Response) => {
    try {
      const { projectId, versionId, imageUrl, imageBase64, confidence, overlap } = req.body;

      if (!projectId || !versionId) {
        res.status(400).json({ error: 'projectId and versionId are required' });
        return;
      }

      const conf = confidence !== undefined ? Number(confidence) : undefined;
      const ovlp = overlap !== undefined ? Number(overlap) : undefined;

      if (imageUrl) {
        const response = await roboflowService.inferImageUrl(
          projectId,
          String(versionId),
          imageUrl,
          conf,
          ovlp
        );
        res.status(response.status).json(response.data);
        return;
      }

      if (imageBase64) {
        const buffer = Buffer.from(imageBase64, 'base64');
        const response = await roboflowService.inferImageFile(
          projectId,
          String(versionId),
          buffer,
          'image.jpg',
          'image/jpeg',
          conf,
          ovlp
        );
        res.status(response.status).json(response.data);
        return;
      }

      res.status(400).json({ error: 'imageUrl or imageBase64 is required' });
    } catch (err) {
      handleError(err, res);
    }
  }
);

// POST /api/roboflow/infer/:projectId/:version  (legacy route kept for compatibility)
router.post(
  '/infer/:projectId/:version',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { projectId, version } = req.params;
      const imageUrl: string | undefined =
        (req.query.url as string) || (req.body.url as string);
      const confidence = req.query.confidence ? Number(req.query.confidence) : undefined;
      const overlap = req.query.overlap ? Number(req.query.overlap) : undefined;

      if (imageUrl) {
        const response = await roboflowService.inferImageUrl(projectId, version, imageUrl, confidence, overlap);
        res.status(response.status).json(response.data);
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No image file or URL provided for inference' });
        return;
      }

      const response = await roboflowService.inferImageFile(
        projectId, version, req.file.buffer, req.file.originalname, req.file.mimetype, confidence, overlap
      );
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

export default router;
