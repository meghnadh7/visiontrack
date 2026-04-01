import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AxiosError } from 'axios';
import * as roboflowService from '../services/roboflow.service';

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
    const data = response.data as { workspace?: { projects?: unknown[] } };
    const projects = data?.workspace?.projects ?? (response.data as { projects?: unknown[] }).projects ?? [];
    res.status(response.status).json({ projects });
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/roboflow/projects/:projectId
// Get details for a specific project
router.get('/projects/:projectId', async (req: Request, res: Response) => {
  try {
    const response = await roboflowService.getProject(req.params.projectId);
    res.status(response.status).json(response.data);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/roboflow/projects/:projectId/versions
// List all versions for a project
router.get(
  '/projects/:projectId/versions',
  async (req: Request, res: Response) => {
    try {
      const response = await roboflowService.listVersions(req.params.projectId);
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// POST /api/roboflow/projects/:projectId/versions
// Create a new dataset version
router.post(
  '/projects/:projectId/versions',
  async (req: Request, res: Response) => {
    try {
      const response = await roboflowService.createVersion(
        req.params.projectId,
        req.body
      );
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// POST /api/roboflow/projects/:projectId/images
// Upload an image to the project.
// Accepts a multipart/form-data file (field: "image") plus an optional "split" field.
// Also accepts an optional query param ?url=... to upload by URL instead of file.
router.post(
  '/projects/:projectId/images',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
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

// GET /api/roboflow/projects/:projectId/images
// List images in a project. Optional query param: ?split=train|valid|test
router.get(
  '/projects/:projectId/images',
  async (req: Request, res: Response) => {
    try {
      const split = req.query.split as string | undefined;
      const response = await roboflowService.listImages(
        req.params.projectId,
        split
      );
      res.status(response.status).json(response.data);
    } catch (err) {
      handleError(err, res);
    }
  }
);

// GET /api/roboflow/projects/:projectId/images/:imageId
// Get a specific image with its annotations
router.get(
  '/projects/:projectId/images/:imageId',
  async (req: Request, res: Response) => {
    try {
      const response = await roboflowService.getImage(
        req.params.projectId,
        req.params.imageId
      );
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
