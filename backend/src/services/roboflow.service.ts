import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || '';
const ROBOFLOW_WORKSPACE = process.env.ROBOFLOW_WORKSPACE || '';
const ROBOFLOW_BASE_URL = 'https://api.roboflow.com';
const ROBOFLOW_INFER_BASE_URL = 'https://detect.roboflow.com';

const roboflowClient: AxiosInstance = axios.create({
  baseURL: ROBOFLOW_BASE_URL,
  params: {
    api_key: ROBOFLOW_API_KEY,
  },
});

// List all projects in the workspace
export async function listProjects(): Promise<AxiosResponse> {
  return roboflowClient.get(`/${ROBOFLOW_WORKSPACE}`);
}

// Get project details
export async function getProject(projectId: string): Promise<AxiosResponse> {
  return roboflowClient.get(`/${projectId}`);
}

// List versions for a project
export async function listVersions(projectId: string): Promise<AxiosResponse> {
  return roboflowClient.get(`/${projectId}`);
}

// Create a new version for a project
export async function createVersion(
  projectId: string,
  body: Record<string, unknown>
): Promise<AxiosResponse> {
  return roboflowClient.post(`/${projectId}/versions`, body);
}

// Upload an image to a project (base64 encoded)
export async function uploadImageBase64(
  projectId: string,
  imageBase64: string,
  filename: string,
  split: string = 'train'
): Promise<AxiosResponse> {
  const url = `/${projectId}/upload`;
  return roboflowClient.post(url, imageBase64, {
    params: {
      api_key: ROBOFLOW_API_KEY,
      name: filename,
      split,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

// Upload an image to a project using form-data (multipart)
export async function uploadImageFormData(
  projectId: string,
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  split: string = 'train'
): Promise<AxiosResponse> {
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename,
    contentType: mimetype,
  });

  return roboflowClient.post(
    `/${projectId}/upload`,
    form,
    {
      params: {
        api_key: ROBOFLOW_API_KEY,
        name: filename,
        split,
      },
      headers: {
        ...form.getHeaders(),
      },
    }
  );
}

// List images in a project using Roboflow's search endpoint
export async function listImages(
  projectId: string,
  split?: string,
  page: number = 0,
  perPage: number = 20
): Promise<AxiosResponse> {
  const body: Record<string, unknown> = {
    limit: perPage,
    offset: page * perPage,
  };
  if (split) body['split'] = split;

  const response = await roboflowClient.post(`/${projectId}/search`, body);

  // Normalise: attach thumb URLs using source.roboflow.com pattern
  if (response.data?.results) {
    response.data.images = response.data.results.map((img: Record<string, unknown>) => ({
      id: img.id,
      name: String(img.id),
      split: img.split,
      annotated: (img.annotations as Record<string, unknown>)?.count ?? 0,
      thumb: `https://source.roboflow.com/${img.owner}/${img.id}/thumb.jpg`,
      original: `https://source.roboflow.com/${img.owner}/${img.id}/original.jpg`,
    }));
    response.data.total = response.data.total ?? response.data.results.length;
  }

  return response;
}

// Get a specific image with annotations
export async function getImage(
  projectId: string,
  imageId: string
): Promise<AxiosResponse> {
  return roboflowClient.get(`/${projectId}/${imageId}`);
}

// Run inference on an image file (multipart)
export async function inferImageFile(
  projectId: string,
  version: string,
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  confidence?: number,
  overlap?: number
): Promise<AxiosResponse> {
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename,
    contentType: mimetype,
  });

  const params: Record<string, string | number> = {
    api_key: ROBOFLOW_API_KEY,
  };
  if (confidence !== undefined) params['confidence'] = confidence;
  if (overlap !== undefined) params['overlap'] = overlap;

  return axios.post(
    `${ROBOFLOW_INFER_BASE_URL}/${projectId}/${version}`,
    form,
    {
      params,
      headers: {
        ...form.getHeaders(),
      },
    }
  );
}

// Run inference on an image URL
export async function inferImageUrl(
  projectId: string,
  version: string,
  imageUrl: string,
  confidence?: number,
  overlap?: number
): Promise<AxiosResponse> {
  const params: Record<string, string | number> = {
    api_key: ROBOFLOW_API_KEY,
    image: imageUrl,
  };
  if (confidence !== undefined) params['confidence'] = confidence;
  if (overlap !== undefined) params['overlap'] = overlap;

  return axios.post(
    `${ROBOFLOW_INFER_BASE_URL}/${projectId}/${version}`,
    null,
    { params }
  );
}
