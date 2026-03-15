import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CardSkeleton } from '@/components/ui/Skeleton'
import {
  Search,
  ChevronRight,
  Calendar,
  MapPin,
  Users as UsersIcon,
  Edit,
} from 'lucide-react'
import { fetchPatients } from '@/data/queries'
import { formatDate } from '@/lib/utils'
import type { Patient } from '@/types/database'

export const Route = createFileRoute('/_authenticated/patients')({
  component: PatientsPage,
})

function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  })

  const filteredPatients = patients?.filter((patient) => {
    const query = searchQuery.toLowerCase()
    return (
      patient.full_name.toLowerCase().includes(query) ||
      patient.external_id?.toLowerCase().includes(query) ||
      patient.location_text?.toLowerCase().includes(query)
    )
  })

  if (pathname !== '/patients') {
    return <Outlet />
  }

  return (
    <div className="space-y-6 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-clinical-400">Clinical Records</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-clinical-600">Patient Directory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-clinical-900 tracking-tight leading-none">Patient Profiles</h2>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Card className="flex-1 border-clinical-200 shadow-md shadow-clinical-900/5">
          <CardContent className="p-2 px-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clinical-400" />
              <Input
                placeholder="Search by name, ID, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-none shadow-none focus:ring-0 h-10 font-medium"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredPatients?.length === 0 ? (
          <div className="py-24 text-center bg-clinical-50/50 rounded-3xl border-2 border-dashed border-clinical-200">
            <UsersIcon className="h-16 w-16 mx-auto text-clinical-200 mb-6 opacity-50" />
            <h3 className="text-xl font-black text-clinical-900 tracking-tight">No Patient Records Found</h3>
            <p className="text-clinical-500 mt-2 max-w-sm mx-auto font-medium px-6">
              Patient records will appear here once they are created on field devices and synchronized back to the dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPatients?.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PatientCard({ patient }: { patient: Patient }) {
  const initials = patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  
  return (
    <Card className="group h-full border-clinical-200/60 hover:border-clinical-400 hover:shadow-xl hover:shadow-clinical-900/5 transition-all duration-300 overflow-hidden relative">
      <CardContent className="p-0 h-full">
        <div className="flex items-stretch h-full">
          <div className="w-2 group-hover:w-3 bg-clinical-100 group-hover:bg-clinical-500 transition-all shrink-0" />
          <div className="p-6 flex-1 min-w-0">
            <div className="flex items-start gap-4">
              <Link
                to="/patients/$patientId"
                params={{ patientId: patient.id }}
                className="group block min-w-0 flex-1"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinical-50 group-hover:bg-clinical-100 text-clinical-600 font-black text-lg shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-clinical-900 text-lg leading-tight group-hover:text-clinical-600 transition-colors truncate tracking-tight">
                      {patient.full_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 font-bold text-[10px] uppercase tracking-widest text-clinical-400">
                      {patient.external_id && (
                        <span className="font-mono bg-clinical-50 px-1.5 py-0.5 rounded">ID: {patient.external_id}</span>
                      )}
                      {patient.sex && (
                        <span className="bg-clinical-50 px-1.5 py-0.5 rounded border border-clinical-100">{patient.sex}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 hover:bg-clinical-50">
                  <Link to="/patients/$patientId/edit" params={{ patientId: patient.id }}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  to="/patients/$patientId"
                  params={{ patientId: patient.id }}
                  className="h-8 w-8 rounded-full bg-clinical-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 shrink-0 shadow-sm border border-clinical-100"
                >
                  <ChevronRight className="h-4 w-4 text-clinical-600" />
                </Link>
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-clinical-50">
              <div className="flex flex-wrap gap-2">
                {patient.location_text && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-clinical-50/50 text-clinical-500 border border-clinical-50">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[10px] font-bold truncate max-w-[120px] uppercase tracking-wider">{patient.location_text}</span>
                  </div>
                )}
                {patient.pregnancy_status && (
                  <Badge variant="info" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-clinical-200">
                    {patient.pregnancy_status}
                  </Badge>
                )}
              </div>
              {patient.dob && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-clinical-400 uppercase tracking-tighter">
                  <Calendar className="h-3 w-3" />
                  {formatDate(patient.dob)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
