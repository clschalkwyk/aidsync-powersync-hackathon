import { useLocation, Link } from '@tanstack/react-router'
import { MobileMenuButton } from './Sidebar'
import { ChevronRight, Home } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/overview': 'Overview',
  '/medications': 'Medication Catalog',
  '/ingredients': 'Active Ingredients',
  '/patients': 'Patient Directory',
  '/encounters': 'Clinical Encounters',
  '/interactions': 'Interaction Rules',
  '/contraindications': 'Contraindication Rules',
}

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation()
  const pathname = location.pathname
  
  // Logic to determine breadcrumbs
  const paths = pathname.split('/').filter(Boolean)
  const breadcrumbs = paths.map((path, index) => {
    const href = `/${paths.slice(0, index + 1).join('/')}`
    const title = pageTitles[href] || path.charAt(0).toUpperCase() + path.slice(1)
    const isLast = index === paths.length - 1
    return { title, href, isLast }
  })

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-clinical-200/60 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <MobileMenuButton onClick={onMenuClick} />
          
          <nav className="hidden sm:flex items-center text-sm font-bold" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <Link to="/overview" className="text-clinical-400 hover:text-clinical-600 transition-colors">
                  <Home className="h-4 w-4" />
                </Link>
              </li>
              {breadcrumbs.map((breadcrumb) => (
                <li key={breadcrumb.href} className="flex items-center space-x-2">
                  <ChevronRight className="h-3.5 w-3.5 text-clinical-300 shrink-0" />
                  {breadcrumb.isLast ? (
                    <span className="text-clinical-900 truncate max-w-[200px]">
                      {breadcrumb.title}
                    </span>
                  ) : (
                    <Link 
                      to={breadcrumb.href as any} 
                      className="text-clinical-400 hover:text-clinical-600 transition-colors truncate max-w-[150px]"
                    >
                      {breadcrumb.title}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <h1 className="sm:hidden text-base font-black text-clinical-900 truncate">
            {breadcrumbs[breadcrumbs.length - 1]?.title || 'AidSync'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-clinical-50 border border-clinical-100">
            <div className="h-1.5 w-1.5 rounded-full bg-safety-green" />
            <span className="text-[10px] font-black text-clinical-600 uppercase tracking-widest">Live Sync</span>
          </div>
        </div>
      </div>
    </header>
  )
}
