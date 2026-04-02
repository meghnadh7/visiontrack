# visiontrack

A personal project I built to connect Roboflow with Redmine. The idea is simple — run object detection on an image and push the results directly as issues into Redmine without any manual copy-pasting.

## What it does

- Browse your Roboflow workspace projects and model versions
- Upload an image and run inference against any deployed model
- See bounding boxes drawn on the image with confidence scores
- Create a Redmine issue straight from the detection results (annotated image gets attached automatically)
- Basic Redmine integration — view projects, list/filter issues, create new ones
- Dashboard with some charts showing issue stats and recent runs

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind
- **Backend**: Node.js + Express + TypeScript (acts as a proxy, keeps API keys off the client)
- **Charts**: Recharts
- **Data fetching**: React Query

## Getting started

You'll need Node 20+, a Roboflow account, and a Redmine instance running somewhere.

### 1. Clone and install

```bash
git clone https://github.com/meghnadh007/otto.git
cd otto

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```
PORT=3001
ROBOFLOW_API_KEY=...
ROBOFLOW_WORKSPACE=...
REDMINE_URL=http://your-redmine-url
REDMINE_API_KEY=...
```

Get your Roboflow API key from account settings. Redmine API key is under My Account → API access key.

### 3. Run

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Frontend runs on http://localhost:3000, backend on http://localhost:3001.

### Docker

If you prefer Docker:

```bash
docker compose up --build
```

## Notes

- Inference history is saved in localStorage so it persists across refreshes
- The backend handles all external API calls so your keys never hit the browser
- Redmine REST API must be enabled in your Redmine settings (Administration → Settings → API)
