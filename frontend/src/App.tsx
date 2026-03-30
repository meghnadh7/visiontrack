import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

// Eagerly loaded (tiny, always needed)
import Dashboard from './pages/Dashboard'

// Lazily loaded — split per route to reduce initial bundle size
const RoboflowProjects = lazy(() => import('./pages/roboflow/Projects'))
const RoboflowProjectDetail = lazy(() => import('./pages/roboflow/ProjectDetail'))
const RoboflowInference = lazy(() => import('./pages/roboflow/Inference'))
const RedmineProjects = lazy(() => import('./pages/redmine/Projects'))
const RedmineIssues = lazy(() => import('./pages/redmine/Issues'))
const RedmineIssueDetail = lazy(() => import('./pages/redmine/IssueDetail'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Roboflow routes */}
          <Route path="/roboflow/projects" element={<RoboflowProjects />} />
          <Route path="/roboflow/projects/:projectId" element={<RoboflowProjectDetail />} />
          <Route path="/roboflow/inference" element={<RoboflowInference />} />

          {/* Redmine routes */}
          <Route path="/redmine/projects" element={<RedmineProjects />} />
          <Route path="/redmine/projects/:projectId/issues" element={<RedmineIssues />} />
          <Route path="/redmine/issues/:issueId" element={<RedmineIssueDetail />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
