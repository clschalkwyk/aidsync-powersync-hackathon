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
  const [page, setPage] = useState(1)
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

  const pageSize = 8
  const totalPatients = filteredPatients?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalPatients / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedPatients = filteredPatients?.slice((currentPage - 1) * pageSize, currentPage * pageSize) || []

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
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="pl-10 border-none shadow-none focus:ring-0 h-10 font-medium"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {isLoading ? (
          <div className="space-y-4">
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
          <>
            <div className="rounded-[2rem] border border-clinical-200/70 bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_140px] gap-4 px-6 py-4 border-b border-clinical-100 bg-clinical-50/40 text-[10px] font-black uppercase tracking-[0.18em] text-clinical-500">
                <span>Patient</span>
                <span>Location And Context</span>
                <span>Date Of Birth</span>
              </div>
              <div className="divide-y divide-clinical-100">
                {pagedPatients.map((patient) => (
                  <PatientRow key={patient.id} patient={patient} />
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-clinical-500">
                Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalPatients)} of {totalPatients}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="h-10 px-4 text-[10px] font-black uppercase tracking-[0.14em]"
                >
                  Previous
                </Button>
                <div className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-clinical-500">
                  Page {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="h-10 px-4 text-[10px] font-black uppercase tracking-[0.14em]"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PatientRow({ patient }: { patient: Patient }) {
  const initials = patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  
  return (
    <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_140px] gap-4 px-6 py-5 hover:bg-clinical-50/50 transition-colors">
      <div className="flex items-start gap-4 min-w-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinical-50 text-clinical-600 font-black text-lg shrink-0 shadow-inner">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link
              to="/patients/$patientId"
              params={{ patientId: patient.id }}
              className="min-w-0"
            >
              <h3 className="font-black text-clinical-900 text-lg leading-tight truncate tracking-tight hover:text-clinical-600 transition-colors">
                {patient.full_name}
              </h3>
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
                className="h-8 w-8 rounded-full bg-clinical-50 flex items-center justify-center shrink-0 shadow-sm border border-clinical-100 hover:bg-clinical-100"
              >
                <ChevronRight className="h-4 w-4 text-clinical-600" />
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 font-bold text-[10px] uppercase tracking-widest text-clinical-400">
            {patient.external_id && (
              <span className="font-mono bg-clinical-50 px-1.5 py-0.5 rounded">ID: {patient.external_id}</span>
            )}
            {patient.sex && (
              <span className="bg-clinical-50 px-1.5 py-0.5 rounded border border-clinical-100">{patient.sex}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 content-start">
        {patient.location_text && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-clinical-50/50 text-clinical-500 border border-clinical-50 min-w-0">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="text-[10px] font-bold truncate max-w-[180px] uppercase tracking-wider">{patient.location_text}</span>
          </div>
        )}
        {patient.pregnancy_status && patient.pregnancy_status.toLowerCase() === 'pregnant' && (
          <Badge variant="info" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-clinical-200">
            {patient.pregnancy_status}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-clinical-400 uppercase tracking-tighter justify-start lg:justify-end">
        {patient.dob ? (
          <>
            <Calendar className="h-3 w-3" />
            {formatDate(patient.dob)}
          </>
        ) : (
          <span>Unknown</span>
        )}
      </div>
    </div>
  )
}
