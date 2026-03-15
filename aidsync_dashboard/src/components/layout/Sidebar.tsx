import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { 
  LayoutDashboard, 
  Pill, 
  Users, 
  Stethoscope, 
  AlertTriangle, 
  Ban,
  Beaker,
  LogOut,
  X,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Medications', href: '/medications', icon: Pill },
  { name: 'Ingredients', href: '/ingredients', icon: Beaker },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Encounters', href: '/encounters', icon: Stethoscope },
  { name: 'Interactions', href: '/interactions', icon: AlertTriangle },
  { name: 'Contraindications', href: '/contraindications', icon: Ban },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, profile } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    onClose()
    navigate({ to: '/login' })
  }

  return (
    <>
      {/* Mobile overlay - only shows when sidebar is open on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-clinical-900/60 z-40 lg:hidden backdrop-blur-sm transition-all"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar container */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-clinical-900 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
          !isOpen && "invisible lg:visible pointer-events-none lg:pointer-events-auto"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 shrink-0 border-b border-clinical-800/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 overflow-hidden">
                <img src="/logo.png" alt="AidSync Logo" className="h-7 w-7 object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white italic">AidSync</span>
            </div>
            {/* Close button - only visible on mobile */}
            <button 
              onClick={onClose}
              className="lg:hidden text-clinical-400 hover:text-white p-1 rounded-lg hover:bg-clinical-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href)
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer',
                        isActive
                          ? 'bg-clinical-700 text-white shadow-md shadow-black/10'
                          : 'text-clinical-300 hover:bg-clinical-800 hover:text-white'
                      )}
                    >
                      <item.icon 
                        className={cn(
                          'h-5 w-5 shrink-0', 
                          isActive ? 'text-white' : 'text-clinical-400'
                        )} 
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-clinical-800 p-4 shrink-0 bg-clinical-900/50 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="h-10 w-10 rounded-xl bg-clinical-600 flex items-center justify-center shrink-0 shadow-lg shadow-clinical-600/20">
                <span className="text-sm font-bold text-white">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs font-medium text-clinical-400 capitalize">
                  {profile?.role || 'clinician'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-clinical-400 hover:bg-safety-red/10 hover:text-safety-red transition-all duration-200 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-xl text-clinical-600 hover:bg-clinical-100 -ml-2 transition-all cursor-pointer"
      aria-label="Open menu"
    >
      <Menu className="h-6 w-6" />
    </button>
  )
}
