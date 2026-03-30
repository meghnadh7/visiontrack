import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Cpu,
  Bug,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Layers,
  Eye,
} from 'lucide-react'

interface NavSection {
  label: string
  icon: React.ReactNode
  items: {
    label: string
    to: string
    icon: React.ReactNode
  }[]
}

const navSections: NavSection[] = [
  {
    label: 'Roboflow',
    icon: <Eye size={16} />,
    items: [
      {
        label: 'Projects',
        to: '/roboflow/projects',
        icon: <FolderOpen size={15} />,
      },
      {
        label: 'Inference',
        to: '/roboflow/inference',
        icon: <Cpu size={15} />,
      },
    ],
  },
  {
    label: 'Redmine',
    icon: <Layers size={16} />,
    items: [
      {
        label: 'Projects',
        to: '/redmine/projects',
        icon: <FolderOpen size={15} />,
      },
      {
        label: 'Issues',
        to: '/redmine/issues',
        icon: <Bug size={15} />,
      },
    ],
  },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Roboflow: true,
    Redmine: true,
  })

  const toggle = (label: string) =>
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Logo / App title */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Eye size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">VisionTrack</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `nav-link ${isActive ? 'active' : ''}`
          }
          onClick={onClose}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>

        <div className="pt-2" />

        {/* Sections */}
        {navSections.map((section) => (
          <div key={section.label} className="space-y-0.5">
            {/* Section header */}
            <button
              onClick={() => toggle(section.label)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                {section.icon}
                {section.label}
              </div>
              {expanded[section.label] ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </button>

            {/* Section items */}
            {expanded[section.label] && (
              <div className="space-y-0.5 pl-2">
                {section.items.map((item) => {
                  // For the Redmine "Issues" link, we need to handle it specially
                  // since it's a list page without a specific project
                  const isIssuesGlobal = item.to === '/redmine/issues'
                  if (isIssuesGlobal) {
                    const isActive =
                      location.pathname.startsWith('/redmine/issues') ||
                      (location.pathname.includes('/redmine/projects/') &&
                        location.pathname.includes('/issues'))
                    return (
                      <NavLink
                        key={item.to}
                        to="/redmine/projects"
                        className={`nav-link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  }

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive: routeActive }) => {
                        // For project links, also highlight when on sub-routes
                        const isActive =
                          routeActive ||
                          (item.to === '/roboflow/projects' &&
                            location.pathname.startsWith('/roboflow/projects/')) ||
                          (item.to === '/redmine/projects' &&
                            location.pathname.startsWith('/redmine/projects/'))
                        return `nav-link ${isActive ? 'active' : ''}`
                      }}
                      onClick={onClose}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-800">
        <p className="text-xs text-gray-600">VisionTrack v1.0.0</p>
      </div>
    </div>
  )
}

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: 'var(--sidebar-width, 240px)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside
            className="absolute left-0 top-0 bottom-0 z-50 flex flex-col"
            style={{ width: '240px' }}
          >
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header (mobile only) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Eye size={12} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">VisionTrack</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
