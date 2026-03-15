import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileWarning,
  LoaderCircle,
  Trash2,
  Timer,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { TextArea } from '@/components/ui/TextArea'
import { Badge } from '@/components/ui/Badge'
import {
  createActiveIngredient,
  fetchActiveIngredients,
  extractPreparationSession,
  fetchPreparationSessionDetail,
  processPreparationPage,
  publishPreparationSession,
  deletePreparationSession,
  updatePreparationSession,
  uploadPreparationPage,
} from '@/data/queries'
import { queryClient } from '@/lib/queryClient'
import { getUserFriendlyErrorMessage } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/medications/prepare-session/$sessionId')({
  component: PreparationSessionWorkspace,
})

type DraftIngredient = {
  ingredient_id?: string
  name: string
  strength: string
}

type DraftJson = {
  medicine_name?: string
  active_ingredients?: DraftIngredient[]
  strength_form?: string
  contraindications?: string[]
  major_interactions?: string[]
  warnings?: string[]
  pregnancy_lactation?: string
  age_restrictions?: string[]
  administration_route?: string
  dose_summary?: string
  max_dose?: string
  confidence?: number
}

type BatchProgressState = {
  mode: 'idle' | 'single' | 'batch'
  total: number
  completed: number
  currentPageId: string | null
  startedAt: number | null
  pageStartedAt: number | null
  pageDurations: Record<string, number>
}

const MAX_PREPARATION_PAGES = 10

function isOcrComplete(status: string) {
  return status === 'extracted'
}

function getPageStatusLabel(status: string) {
  if (status === 'extracted') return 'ocr complete'
  return status.replaceAll('_', ' ')
}

function getSessionStatusLabel(status: string) {
  if (status === 'draft') return 'collecting pages'
  if (status === 'processing') return 'processing'
  if (status === 'ready_for_review') return 'draft ready'
  return status.replaceAll('_', ' ')
}

function formatDuration(ms: number | null) {
  if (!ms || ms < 0) return '0.0s'
  return `${(ms / 1000).toFixed(1)}s`
}

function parseLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function toLineBlock(values?: string[]) {
  return Array.isArray(values) ? values.join('\n') : ''
}

function normalizeDraftForComparison(draft?: DraftJson | null) {
  const nextDraft = draft ?? {}
  return {
    medicine_name: nextDraft.medicine_name?.trim() ?? '',
    active_ingredients: Array.isArray(nextDraft.active_ingredients)
      ? nextDraft.active_ingredients.map((ingredient) => ({
          ingredient_id: ingredient.ingredient_id ?? '',
          name: ingredient.name?.trim() ?? '',
          strength: ingredient.strength?.trim() ?? '',
        }))
      : [],
    strength_form: nextDraft.strength_form?.trim() ?? '',
    contraindications: Array.isArray(nextDraft.contraindications) ? nextDraft.contraindications.map((item) => item.trim()) : [],
    major_interactions: Array.isArray(nextDraft.major_interactions) ? nextDraft.major_interactions.map((item) => item.trim()) : [],
    warnings: Array.isArray(nextDraft.warnings) ? nextDraft.warnings.map((item) => item.trim()) : [],
    pregnancy_lactation: nextDraft.pregnancy_lactation?.trim() ?? '',
    age_restrictions: Array.isArray(nextDraft.age_restrictions) ? nextDraft.age_restrictions.map((item) => item.trim()) : [],
    administration_route: nextDraft.administration_route?.trim() ?? '',
    dose_summary: nextDraft.dose_summary?.trim() ?? '',
    max_dose: nextDraft.max_dose?.trim() ?? '',
    confidence: typeof nextDraft.confidence === 'number' ? nextDraft.confidence : null,
  }
}

function suggestCanonicalIngredientName(name: string) {
  return name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeIngredientLookupName(name: string) {
  return suggestCanonicalIngredientName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreIngredientCandidate(query: string, candidate: {
  canonical_name: string
  normalized_name: string
  common_name?: string | null
  synonyms_json: string[]
}) {
  const normalizedQuery = normalizeIngredientLookupName(query)
  const candidateValues = [
    candidate.canonical_name,
    candidate.normalized_name,
    candidate.common_name ?? '',
    ...candidate.synonyms_json,
  ]
    .map((value) => normalizeIngredientLookupName(value))
    .filter(Boolean)

  if (candidateValues.includes(normalizedQuery)) return 1
  if (candidateValues.some((value) => normalizedQuery.includes(value) || value.includes(normalizedQuery))) return 0.84

  const queryTokens = new Set(normalizedQuery.split(' ').filter((token) => token.length >= 4))
  const bestTokenOverlap = candidateValues.reduce((best, value) => {
    const valueTokens = new Set(value.split(' ').filter((token) => token.length >= 4))
    if (queryTokens.size === 0 || valueTokens.size === 0) return best
    let overlap = 0
    for (const token of queryTokens) {
      if (valueTokens.has(token)) overlap += 1
    }
    return Math.max(best, overlap / Math.max(queryTokens.size, valueTokens.size))
  }, 0)

  return bestTokenOverlap >= 0.5 ? 0.65 + bestTokenOverlap * 0.2 : 0
}

function getSuggestedIngredientMatches(
  name: string,
  activeIngredients: Array<{
    id: string
    canonical_name: string
    normalized_name: string
    common_name?: string | null
    synonyms_json: string[]
    ingredient_class?: string | null
  }>
) {
  return activeIngredients
    .map((ingredient) => ({
      ingredient,
      score: scoreIngredientCandidate(name, ingredient),
    }))
    .filter((item) => item.score >= 0.8)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
}

function getPageProgressPercent(
  page: { id: string; status: string },
  batchProgress: BatchProgressState,
) {
  if (isOcrComplete(page.status)) return 100
  if (page.status === 'failed') return 100
  if (batchProgress.currentPageId === page.id) return 58
  if (page.status === 'uploaded') return 18
  return 8
}

function getPageProgressTone(
  page: { id: string; status: string },
  batchProgress: BatchProgressState,
) {
  if (isOcrComplete(page.status)) return 'bg-safety-green'
  if (page.status === 'failed') return 'bg-safety-red'
  if (batchProgress.currentPageId === page.id) return 'bg-brand-600'
  return 'bg-clinical-300'
}

function MetricTile({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string | number
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger'
}) {
  const toneClass =
    tone === 'brand'
      ? 'border-brand-100 bg-brand-50'
      : tone === 'success'
        ? 'border-safety-green/20 bg-safety-green/10'
        : tone === 'warning'
          ? 'border-safety-yellow/20 bg-safety-yellow/10'
          : tone === 'danger'
            ? 'border-safety-red/20 bg-safety-red/10'
            : 'border-clinical-100 bg-clinical-50'

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-clinical-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-clinical-900">{value}</p>
    </div>
  )
}

function PreparationSessionWorkspace() {
  const { sessionId } = Route.useParams()
  const navigate = useNavigate()
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [manualIngredientName, setManualIngredientName] = useState('')
  const [manualIngredientStrength, setManualIngredientStrength] = useState('')
  const [showUploadedPages, setShowUploadedPages] = useState(true)
  const [pendingDraft, setPendingDraft] = useState<DraftJson | null>(null)
  const [batchProgress, setBatchProgress] = useState<BatchProgressState>({
    mode: 'idle',
    total: 0,
    completed: 0,
    currentPageId: null,
    startedAt: null,
    pageStartedAt: null,
    pageDurations: {},
  })
  const [progressNow, setProgressNow] = useState(Date.now())

  const { data: session, isLoading } = useQuery({
    queryKey: ['preparation-session', sessionId],
    queryFn: () => fetchPreparationSessionDetail(sessionId),
  })

  const { data: activeIngredients = [] } = useQuery({
    queryKey: ['active-ingredients'],
    queryFn: fetchActiveIngredients,
  })

  const draft = (pendingDraft ?? (session?.draft_json as DraftJson | undefined) ?? {})
  const draftIngredients = Array.isArray(draft.active_ingredients) ? draft.active_ingredients : []
  const hasUnresolvedIngredients = draftIngredients.some((ingredient) => !ingredient.ingredient_id)
  const activeProcessing = batchProgress.mode !== 'idle'
  const persistedDraft = (session?.draft_json as DraftJson | undefined) ?? {}
  const hasUnsavedChanges =
    JSON.stringify(normalizeDraftForComparison(persistedDraft)) !==
    JSON.stringify(
      normalizeDraftForComparison({
        ...draft,
        active_ingredients: draftIngredients,
      }),
    )

  useEffect(() => {
    if (!activeProcessing) return
    const timer = window.setInterval(() => setProgressNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [activeProcessing])

  useEffect(() => {
    if (activeProcessing) {
      setShowUploadedPages(true)
    }
  }, [activeProcessing])

  const filteredIngredients = useMemo(() => {
    const query = ingredientSearch.trim().toLowerCase()
    if (!query) return activeIngredients.slice(0, 12)
    return activeIngredients.filter((ingredient) =>
      ingredient.canonical_name.toLowerCase().includes(query) ||
      ingredient.common_name?.toLowerCase().includes(query) ||
      ingredient.normalized_name.toLowerCase().includes(query)
    )
  }, [activeIngredients, ingredientSearch])

  const refreshSession = async () => {
    await queryClient.invalidateQueries({ queryKey: ['preparation-session', sessionId] })
    await queryClient.invalidateQueries({ queryKey: ['preparation-sessions'] })
    await queryClient.invalidateQueries({ queryKey: ['medications'] })
  }

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList | null) => {
      if (!files || files.length === 0 || !session) return
      const existingPages = session.pages.length
      const remainingSlots = Math.max(0, MAX_PREPARATION_PAGES - existingPages)
      const nextFiles = Array.from(files).slice(0, remainingSlots)
      await Promise.all(
        nextFiles.map((file, index) => uploadPreparationPage(session.id, file, existingPages + index + 1))
      )
    },
    onSuccess: refreshSession,
  })

  const processPageMutation = useMutation({
    mutationFn: async (pageId: string) => processPreparationPage(pageId),
    onMutate: async (pageId) => {
      setBatchProgress((current) => ({
        ...current,
        mode: 'single',
        total: 1,
        completed: 0,
        currentPageId: pageId,
        startedAt: Date.now(),
        pageStartedAt: Date.now(),
      }))
    },
    onSuccess: async () => {
      await refreshSession()
    },
    onSettled: (_data, _error, pageId) => {
      const finishedAt = Date.now()
      setBatchProgress((current) => ({
        mode: 'idle',
        total: 0,
        completed: 0,
        currentPageId: null,
        startedAt: null,
        pageStartedAt: null,
        pageDurations: pageId
          ? {
              ...current.pageDurations,
              [pageId]: current.pageStartedAt ? finishedAt - current.pageStartedAt : current.pageDurations[pageId] ?? 0,
            }
          : current.pageDurations,
      }))
    },
  })

  const extractSessionMutation = useMutation({
    mutationFn: async () => extractPreparationSession(sessionId, activeIngredients),
    onSuccess: async (updatedSession) => {
      setPendingDraft((updatedSession?.draft_json as DraftJson | undefined) ?? null)
      await refreshSession()
    },
  })

  const processAllMutation = useMutation({
    mutationFn: async () => {
      if (!session) return
      const candidates = session.pages.filter((page) => page.status === 'uploaded' || page.status === 'failed')
      if (candidates.length === 0) {
        await extractPreparationSession(sessionId, activeIngredients)
        return
      }
      const startedAt = Date.now()
      setBatchProgress((current) => ({
        ...current,
        mode: 'batch',
        total: candidates.length + 1,
        completed: 0,
        currentPageId: candidates[0]?.id ?? null,
        startedAt,
        pageStartedAt: startedAt,
      }))
      for (const page of candidates) {
        const pageStart = Date.now()
        setBatchProgress((current) => ({
          ...current,
          currentPageId: page.id,
          pageStartedAt: pageStart,
        }))
        await processPreparationPage(page.id)
        await refreshSession()
        const finishedAt = Date.now()
        setBatchProgress((current) => ({
          ...current,
          completed: current.completed + 1,
          pageDurations: {
            ...current.pageDurations,
            [page.id]: finishedAt - pageStart,
          },
        }))
      }
      setBatchProgress((current) => ({
        ...current,
        currentPageId: null,
        pageStartedAt: Date.now(),
      }))
      const updatedSession = await extractPreparationSession(sessionId, activeIngredients)
      setPendingDraft((updatedSession?.draft_json as DraftJson | undefined) ?? null)
      setBatchProgress((current) => ({
        ...current,
        completed: current.completed + 1,
      }))
    },
    onSuccess: async () => {
      await refreshSession()
    },
    onSettled: () => {
      setBatchProgress((current) => ({
        ...current,
        mode: 'idle',
        total: 0,
        completed: 0,
        currentPageId: null,
        startedAt: null,
        pageStartedAt: null,
      }))
    },
  })

  const createIngredientMutation = useMutation({
    mutationFn: async ({
      name,
      strength,
      replaceIndex,
    }: {
      name: string
      strength: string
      replaceIndex?: number
    }) => {
      const canonicalName = suggestCanonicalIngredientName(name.trim()) || name.trim()
      const normalizedName = canonicalName.toLowerCase()
      const created = await createActiveIngredient({
        canonical_name: canonicalName,
        normalized_name: normalizedName,
        common_name: null,
        ingredient_class: null,
        synonyms_json: [],
      })
      return {
        id: created.id as string,
        canonical_name: created.canonical_name as string,
        strength: strength.trim(),
        replaceIndex,
      }
    },
    onSuccess: async (created) => {
      const nextIngredients =
        typeof created.replaceIndex === 'number'
          ? draftIngredients.map((ingredient, index) =>
              index === created.replaceIndex
                ? {
                    ingredient_id: created.id,
                    name: created.canonical_name,
                    strength: created.strength || ingredient.strength,
                  }
                : ingredient
            )
          : [
              ...draftIngredients,
              {
                ingredient_id: created.id,
                name: created.canonical_name,
                strength: created.strength,
              },
            ]

      setPendingDraft({
        ...draft,
        active_ingredients: nextIngredients,
      })
      setManualIngredientName('')
      setManualIngredientStrength('')
      await queryClient.invalidateQueries({ queryKey: ['active-ingredients'] })
    },
  })

  const saveDraftMutation = useMutation({
    mutationFn: async (nextDraft: DraftJson) =>
      updatePreparationSession(sessionId, {
        brand_name: nextDraft.medicine_name?.trim() || null,
        generic_name: null,
        dosage_form: nextDraft.strength_form?.trim() || null,
        manufacturer_name: null,
        notes: nextDraft.dose_summary?.trim() || null,
        draft_json: nextDraft as any,
      }),
    onSuccess: async () => {
      setPendingDraft(null)
      await refreshSession()
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => publishPreparationSession(sessionId),
    onSuccess: async (medication) => {
      await refreshSession()
      navigate({ to: '/medications/$medicationId', params: { medicationId: medication.id } })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deletePreparationSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['preparation-sessions'] })
      navigate({ to: '/medications/prepare' })
    },
  })

  const updateDraftField = (field: keyof DraftJson, value: string) => {
    setPendingDraft({
      ...draft,
      [field]: value,
      active_ingredients: draftIngredients,
    })
  }

  const updateDraftListField = (
    field: 'contraindications' | 'major_interactions' | 'warnings' | 'age_restrictions',
    value: string,
  ) => {
    setPendingDraft({
      ...draft,
      [field]: parseLines(value),
      active_ingredients: draftIngredients,
    })
  }

  const addIngredient = (ingredientId: string, name: string) => {
    if (draftIngredients.some((item) => item.ingredient_id === ingredientId)) return
    setPendingDraft({
      ...draft,
      active_ingredients: [...draftIngredients, { ingredient_id: ingredientId, name, strength: '' }],
    })
  }

  const resolveIngredient = (index: number, ingredientId: string, name: string) => {
    setPendingDraft({
      ...draft,
      active_ingredients: draftIngredients.map((ingredient, itemIndex) =>
        itemIndex === index
          ? {
              ...ingredient,
              ingredient_id: ingredientId,
              name,
            }
          : ingredient
      ),
    })
  }

  const updateIngredientStrength = (index: number, strength: string) => {
    setPendingDraft({
      ...draft,
      active_ingredients: draftIngredients.map((item, itemIndex) =>
        itemIndex === index ? { ...item, strength } : item
      ),
    })
  }

  const removeIngredient = (index: number) => {
    setPendingDraft({
      ...draft,
      active_ingredients: draftIngredients.filter((_item, itemIndex) => itemIndex !== index),
    })
  }

  if (isLoading || !session) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-clinical-400" />
      </div>
    )
  }

  const sessionWarnings = Array.isArray(session.warnings_json) ? session.warnings_json : []
  const extractedPageCount = session.pages.filter((page) => isOcrComplete(page.status)).length
  const failedPageCount = session.pages.filter((page) => page.status === 'failed').length
  const activePageCount = session.pages.filter((page) => page.status === 'uploaded' || page.status === 'failed').length
  const overallElapsed = batchProgress.startedAt ? progressNow - batchProgress.startedAt : 0
  const pageElapsed = batchProgress.pageStartedAt ? progressNow - batchProgress.pageStartedAt : 0
  const overallPercent =
    batchProgress.total > 0
      ? Math.min(
          100,
          Math.round(((batchProgress.completed + (batchProgress.currentPageId ? 0.5 : 0)) / batchProgress.total) * 100),
        )
      : 0
  const restingPercent = session.pages.length > 0 ? Math.round((extractedPageCount / session.pages.length) * 100) : 0
  const readyForReview = extractedPageCount > 0 && activePageCount === 0
  const draftReady = Boolean(draft.medicine_name?.trim())
  const isBuildingDraft =
    extractSessionMutation.isPending ||
    (processAllMutation.isPending && batchProgress.currentPageId === null && batchProgress.total > 0)
  const displaySessionStatus =
    session.status === 'published'
      ? 'published'
      : session.status === 'failed'
        ? 'failed'
        : activeProcessing
          ? 'processing'
          : draftReady
            ? 'ready_for_review'
            : readyForReview
              ? 'ocr_complete'
              : 'draft'
  const workflowStep =
    session.pages.length === 0
      ? 1
      : activeProcessing || activePageCount > 0
        ? 2
        : !draftReady && extractedPageCount > 0
          ? 3
          : 4
  const canPublish =
    !publishMutation.isPending &&
    !saveDraftMutation.isPending &&
    !hasUnsavedChanges &&
    draftIngredients.length > 0 &&
    Boolean(draft.medicine_name?.trim()) &&
    !hasUnresolvedIngredients
  const publishHint = hasUnsavedChanges
    ? 'Save draft before publishing.'
    : !draft.medicine_name?.trim()
      ? 'Add the medicine name before publishing.'
      : draftIngredients.length === 0
        ? 'Link at least one ingredient before publishing.'
        : hasUnresolvedIngredients
          ? 'Resolve all ingredient cards before publishing.'
          : 'Saved draft is ready to publish.'

  return (
    <div className="space-y-6 animate-in-fade pb-16">
      <div className="rounded-[28px] border border-clinical-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 shrink-0">
            <Link to="/medications/prepare">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-clinical-400">Preparation Session</span>
                      <Badge variant="default">
                        {displaySessionStatus === 'ocr_complete'
                          ? 'ocr complete'
                          : getSessionStatusLabel(displaySessionStatus)}
                      </Badge>
                    </div>
            <h2 className="text-3xl font-black tracking-tight text-clinical-900">
              {session.source_name || session.brand_name || 'Untitled Session'}
            </h2>
            <p className="text-sm font-medium text-clinical-500">
              Created by {session.creator?.full_name || 'Unknown user'} · Updated {new Date(session.updated_at).toLocaleString()}
            </p>
            <p className="max-w-2xl text-sm text-clinical-600">
              Upload leaflet pages, run OCR page-by-page, then build one safety-focused draft from the combined text before publishing it to the shared medication catalog.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {session.status !== 'published' && (
            <Button
              variant="ghost"
              onClick={() => {
                const ok = confirm('Delete this draft session and all uploaded pages? This cannot be undone.')
                if (ok) deleteMutation.mutate()
              }}
              disabled={deleteMutation.isPending}
              className="text-safety-red hover:text-safety-red"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteMutation.isPending ? 'Deleting…' : 'Delete Draft'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => saveDraftMutation.mutate({ ...draft, active_ingredients: draftIngredients })}
            disabled={saveDraftMutation.isPending || !hasUnsavedChanges}
          >
            {saveDraftMutation.isPending ? 'Saving…' : hasUnsavedChanges ? 'Save Draft' : 'Draft Saved'}
          </Button>
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={!canPublish}
          >
            {publishMutation.isPending ? 'Publishing…' : 'Publish Saved Draft'}
          </Button>
        </div>
        </div>
        <div className="mt-3 flex justify-end">
          <p
            className={`text-sm font-medium ${
              canPublish ? 'text-safety-green' : 'text-clinical-500'
            }`}
          >
            {publishHint}
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MetricTile label="Pages" value={session.pages.length} />
          <MetricTile label="OCR Complete" value={extractedPageCount} tone={extractedPageCount > 0 ? 'brand' : 'default'} />
          <MetricTile label="Warnings" value={sessionWarnings.length} tone={sessionWarnings.length > 0 ? 'warning' : 'success'} />
          <MetricTile
            label="Confidence"
            value={typeof session.confidence === 'number' ? `${session.confidence}%` : '—'}
            tone={typeof session.confidence === 'number' && session.confidence >= 75 ? 'success' : 'default'}
          />
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.18fr)_420px]">
        <div className="space-y-6">
          <Card className="border-clinical-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-clinical-500">Preparation Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  {
                    step: 1,
                    title: 'Upload',
                    detail: `Add up to ${MAX_PREPARATION_PAGES} page images`,
                  },
                  {
                    step: 2,
                    title: 'OCR',
                    detail: 'Process each page and collect text',
                  },
                  {
                    step: 3,
                    title: 'Draft',
                    detail: 'Build one reviewed draft from all page text',
                  },
                  {
                    step: 4,
                    title: 'Publish',
                    detail: 'Review fields and publish the reference',
                  },
                ].map((item) => {
                  const state =
                    workflowStep === item.step
                      ? 'active'
                      : workflowStep > item.step
                        ? 'complete'
                        : 'idle'

                  return (
                    <div
                      key={item.step}
                      className={`rounded-2xl border p-4 transition-colors ${
                        state === 'active'
                          ? 'border-brand-200 bg-brand-50 shadow-sm'
                          : state === 'complete'
                            ? 'border-safety-green/20 bg-safety-green/10'
                            : 'border-clinical-100 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                            state === 'active'
                              ? 'bg-brand-600 text-white'
                              : state === 'complete'
                                ? 'bg-safety-green text-white'
                                : 'bg-white text-clinical-500 border border-clinical-200'
                          }`}
                        >
                          {state === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : item.step}
                        </div>
                        <div>
                          <p className="text-sm font-black text-clinical-900">{item.title}</p>
                          <p className="text-xs font-medium text-clinical-500">{item.detail}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-clinical-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-clinical-500">Page Intake</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
                <div className="rounded-2xl border border-dashed border-brand-100 bg-brand-50/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-brand-700" />
                    <Label htmlFor="page-upload" className="block text-[10px] font-black uppercase tracking-widest text-brand-700">
                      Upload up to {MAX_PREPARATION_PAGES} images
                    </Label>
                  </div>
                  <p className="mb-3 text-sm text-clinical-600">
                    Upload ordered leaflet pages first. OCR runs page-by-page, then the draft is built once from the collected text.
                  </p>
                  <Input
                    id="page-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadMutation.isPending || session.pages.length >= MAX_PREPARATION_PAGES || activeProcessing}
                    onChange={(event) => uploadMutation.mutate(event.target.files)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricTile label="Queued" value={activePageCount} tone={activePageCount > 0 ? 'brand' : 'default'} />
                  <MetricTile label="Failed" value={failedPageCount} tone={failedPageCount > 0 ? 'danger' : 'default'} />
                </div>
              </div>

              <div className="rounded-2xl border border-clinical-100 bg-clinical-50/60 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-clinical-500">Processing Queue</p>
                    <p className="text-base font-black text-clinical-900">
                      {activeProcessing
                        ? batchProgress.mode === 'batch'
                          ? batchProgress.currentPageId
                            ? `Running OCR for page ${Math.min(batchProgress.completed + 1, Math.max(batchProgress.total - 1, 1))} of ${Math.max(batchProgress.total - 1, 1)}`
                            : 'Building one draft from all collected page text'
                          : 'Running OCR for the selected page'
                        : activePageCount > 0
                          ? `${activePageCount} page${activePageCount === 1 ? '' : 's'} waiting for OCR`
                          : draftReady
                            ? 'OCR is complete and the draft is ready for review.'
                            : extractedPageCount > 0
                              ? 'All uploaded pages have OCR text. Build the draft when ready.'
                            : 'No pages are waiting for OCR.'}
                    </p>
                    <p className="text-xs font-medium text-clinical-600">
                      Process All runs OCR page-by-page and then builds one draft from the combined text.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs font-bold text-brand-800">
                      Overall {formatDuration(overallElapsed)}
                    </div>
                    <div className="rounded-xl border border-clinical-100 bg-white px-3 py-2 text-xs font-bold text-clinical-600">
                      {activeProcessing && batchProgress.currentPageId ? `Current page ${formatDuration(pageElapsed)}` : 'Idle'}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => processAllMutation.mutate()}
                      disabled={processAllMutation.isPending || activePageCount === 0 || activeProcessing}
                    >
                      {processAllMutation.isPending ? 'Running OCR + Draft Build…' : 'Process All'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => extractSessionMutation.mutate()}
                      disabled={extractSessionMutation.isPending || activeProcessing || extractedPageCount === 0}
                    >
                      {extractSessionMutation.isPending ? 'Building Draft…' : 'Build Draft'}
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-clinical-500">
                    <span>Overall Progress</span>
                    <span>{batchProgress.total > 0 ? `${batchProgress.completed}/${batchProgress.total} complete` : `${extractedPageCount}/${session.pages.length} OCR complete`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-clinical-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-out"
                      style={{ width: `${activeProcessing || batchProgress.total > 0 ? overallPercent : restingPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {isBuildingDraft ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <LoaderCircle className="mt-0.5 h-5 w-5 animate-spin text-brand-700" />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-brand-900">Building draft from collected OCR text</p>
                      <p className="text-sm text-clinical-700">
                        Page OCR is complete. The system is now combining all page text, extracting the medication reference structure,
                        and normalizing ingredients for review.
                      </p>
                    </div>
                  </div>
                </div>
              ) : readyForReview && !draftReady ? (
                <div className="rounded-2xl border border-brand-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-safety-green" />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-clinical-900">OCR complete. Draft build is the next step.</p>
                      <p className="text-sm text-clinical-600">
                        All uploaded pages now have OCR text. Click <span className="font-bold text-clinical-900">Build Draft</span> to combine the
                        collected text into one reviewable medication reference.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-clinical-500">Uploaded Pages</p>
                    <p className="text-xs font-medium text-clinical-500">Compact queue for page-by-page OCR before one final draft build</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUploadedPages((current) => !current)}
                    className="min-h-11 px-3"
                  >
                    {showUploadedPages ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Hide Pages
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Show Pages
                      </>
                    )}
                  </Button>
                </div>
                {session.pages.length === 0 ? (
                  <div className="rounded-2xl border border-clinical-100 bg-clinical-50 p-5 text-sm font-medium text-clinical-500">
                    No pages uploaded yet.
                  </div>
                ) : !showUploadedPages ? (
                  <div className="rounded-2xl border border-clinical-100 bg-clinical-50 px-4 py-3 text-sm text-clinical-600">
                    {session.pages.length} uploaded page{session.pages.length === 1 ? '' : 's'} · {extractedPageCount} OCR complete · {failedPageCount} failed
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-clinical-100 bg-white shadow-sm">
                    {session.pages.map((page) => (
                      <div
                        key={page.id}
                        className="border-b border-clinical-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-clinical-50/60"
                      >
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-clinical-900">Page {page.page_index}</p>
                              <Badge variant={isOcrComplete(page.status) ? 'success' : page.status === 'failed' ? 'danger' : 'default'}>
                                {getPageStatusLabel(page.status)}
                              </Badge>
                              {(batchProgress.currentPageId === page.id) && (
                                <Badge variant="info">processing</Badge>
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs font-medium text-clinical-500">{page.storage_path.split('/').pop()}</p>
                            {page.error_text && (
                              <p className="mt-2 text-xs font-bold text-safety-red">{page.error_text}</p>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 items-center gap-3 xl:max-w-[380px]">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-clinical-500">
                                <span>{batchProgress.currentPageId === page.id ? 'Running OCR' : isOcrComplete(page.status) ? 'OCR Complete' : page.status === 'failed' ? 'Failed' : 'Queued'}</span>
                                <span className="flex items-center gap-1">
                                  <Timer className="h-3.5 w-3.5" />
                                  {batchProgress.currentPageId === page.id
                                    ? formatDuration(pageElapsed)
                                    : formatDuration(batchProgress.pageDurations[page.id] ?? null)}
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-clinical-100">
                                <div
                                  className={`h-full rounded-full transition-[width] duration-300 ${getPageProgressTone(page, batchProgress)}`}
                                  style={{ width: `${getPageProgressPercent(page, batchProgress)}%` }}
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processPageMutation.mutate(page.id)}
                              disabled={processPageMutation.isPending || processAllMutation.isPending || activeProcessing}
                              className="shrink-0"
                            >
                              {page.status === 'failed' ? 'Retry OCR' : isOcrComplete(page.status) ? 'Rerun OCR' : 'Run OCR'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-clinical-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-clinical-500">Warnings & Confidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-clinical-100 bg-clinical-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-clinical-400">Confidence</p>
                  <p className="mt-2 text-2xl font-black text-clinical-900">{typeof session.confidence === 'number' ? `${session.confidence}%` : '—'}</p>
                </div>
                <div className="rounded-2xl border border-clinical-100 bg-clinical-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-clinical-400">Warnings</p>
                  <p className="mt-2 text-2xl font-black text-clinical-900">{sessionWarnings.length}</p>
                </div>
              </div>
              {sessionWarnings.length === 0 ? (
                <div className="rounded-2xl border border-safety-green/20 bg-safety-green/10 p-4 text-sm font-medium text-safety-green">
                  No merge warnings currently raised.
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionWarnings.map((warning, index) => (
                    <div key={`${warning}-${index}`} className="flex items-start gap-3 rounded-2xl border border-safety-yellow/20 bg-safety-yellow/10 p-4 text-sm text-safety-yellow">
                      <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
            <Card className="border-clinical-200 bg-white shadow-sm">
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-clinical-500">Draft Editor</CardTitle>
                  <p className="text-sm text-clinical-600">
                    Review the merged safety reference before publishing. Focus on identity, interactions, contraindications, and dose guidance.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Medicine name</Label>
                    <Input value={draft.medicine_name || ''} onChange={(e) => updateDraftField('medicine_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Strength / form</Label>
                    <Input value={draft.strength_form || ''} onChange={(e) => updateDraftField('strength_form', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Administration route</Label>
                    <Input
                      value={draft.administration_route || ''}
                      onChange={(e) => updateDraftField('administration_route', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max dose</Label>
                    <Input value={draft.max_dose || ''} onChange={(e) => updateDraftField('max_dose', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dose summary</Label>
                  <TextArea
                    value={draft.dose_summary || ''}
                    onChange={(e) => updateDraftField('dose_summary', e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pregnancy / lactation</Label>
                  <TextArea
                    value={draft.pregnancy_lactation || ''}
                    onChange={(e) => updateDraftField('pregnancy_lactation', e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="rounded-2xl border border-clinical-100 bg-clinical-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-clinical-400">Safety review checklist</p>
                  <div className="mt-3 grid gap-2 text-sm text-clinical-700">
                    <p>1. Confirm the medicine identity and strength/form.</p>
                    <p>2. Check contraindications and major interactions for obvious noise.</p>
                    <p>3. Confirm route, dose summary, and max dose before publish.</p>
                  </div>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contraindications</Label>
                    <TextArea
                      value={toLineBlock(draft.contraindications)}
                      onChange={(e) => updateDraftListField('contraindications', e.target.value)}
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Major interactions</Label>
                    <TextArea
                      value={toLineBlock(draft.major_interactions)}
                      onChange={(e) => updateDraftListField('major_interactions', e.target.value)}
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warnings</Label>
                    <TextArea
                      value={toLineBlock(draft.warnings)}
                      onChange={(e) => updateDraftListField('warnings', e.target.value)}
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age restrictions</Label>
                    <TextArea
                      value={toLineBlock(draft.age_restrictions)}
                      onChange={(e) => updateDraftListField('age_restrictions', e.target.value)}
                      rows={6}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-clinical-100 bg-clinical-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-clinical-400">Confidence</p>
                  <p className="mt-2 text-xl font-black text-clinical-900">
                    {typeof draft.confidence === 'number' ? `${draft.confidence}%` : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-clinical-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-clinical-500">Linked Ingredients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {draftIngredients.length === 0 ? (
                  <div className="rounded-2xl border border-clinical-100 bg-clinical-50 p-4 text-sm font-medium text-clinical-500">
                    No ingredients linked yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftIngredients.map((ingredient, index) => {
                      const suggestedMatches = !ingredient.ingredient_id
                        ? getSuggestedIngredientMatches(ingredient.name, activeIngredients)
                        : []

                      return (
                      <div key={ingredient.ingredient_id ?? `${ingredient.name}-${index}`} className="rounded-2xl border border-clinical-100 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-clinical-900">{ingredient.name}</p>
                              <Badge variant={ingredient.ingredient_id ? 'success' : 'warning'}>
                                {ingredient.ingredient_id ? 'resolved' : 'manual review'}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs font-medium text-clinical-500">
                              {ingredient.strength?.trim() ? ingredient.strength : 'Strength pending review'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ingredient.ingredient_id ? (
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  to="/ingredients/$ingredientId/edit"
                                  params={{ ingredientId: ingredient.ingredient_id }}
                                >
                                  Quick Edit
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={createIngredientMutation.isPending}
                                onClick={() =>
                                  createIngredientMutation.mutate({
                                    name: ingredient.name,
                                    strength: ingredient.strength,
                                    replaceIndex: index,
                                  })
                                }
                              >
                                {createIngredientMutation.isPending ? 'Creating…' : 'Create Catalog Ingredient'}
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => removeIngredient(index)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <Label>Strength</Label>
                          <Input
                            value={ingredient.strength}
                            placeholder="e.g. 20 mg"
                            onChange={(e) => updateIngredientStrength(index, e.target.value)}
                          />
                        </div>
                        {!ingredient.ingredient_id && (
                          <div className="mt-3 space-y-3">
                            <p className="text-xs font-medium text-safety-yellow">
                              No catalog ingredient is linked yet. Link an existing ingredient if one matches, or create a new catalog ingredient.
                            </p>
                            {suggestedMatches.length > 0 && (
                              <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-700">
                                  Suggested matches
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {suggestedMatches.map(({ ingredient: candidate, score }) => (
                                    <button
                                      key={candidate.id}
                                      type="button"
                                      onClick={() => resolveIngredient(index, candidate.id, candidate.canonical_name)}
                                      className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50"
                                    >
                                      Use {candidate.canonical_name} ({Math.round(score * 100)}%)
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-dashed border-clinical-200 bg-clinical-50/50 p-4">
                <Label>Find active ingredient</Label>
                <Input
                  placeholder="Search active ingredients"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                />
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {filteredIngredients.map((ingredient) => (
                    <button
                      key={ingredient.id}
                      type="button"
                      onClick={() => addIngredient(ingredient.id, ingredient.canonical_name)}
                      className="flex w-full items-center justify-between rounded-2xl border border-clinical-100 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-clinical-300"
                    >
                      <div>
                        <p className="font-bold text-clinical-900">{ingredient.canonical_name}</p>
                        <p className="text-xs font-medium text-clinical-500">{ingredient.ingredient_class || 'Unclassified'}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-clinical-300" />
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-clinical-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-clinical-400">Add missing ingredient</p>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label>Ingredient name</Label>
                      <Input
                        placeholder="e.g. Pantoprazole"
                        value={manualIngredientName}
                        onChange={(e) => setManualIngredientName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Strength</Label>
                      <Input
                        placeholder="e.g. 20 mg"
                        value={manualIngredientStrength}
                        onChange={(e) => setManualIngredientStrength(e.target.value)}
                      />
                    </div>
                    {createIngredientMutation.isError && (
                      <div className="rounded-xl border border-safety-red/20 bg-safety-red/10 px-3 py-2 text-sm text-safety-red">
                        {getUserFriendlyErrorMessage(
                          createIngredientMutation.error,
                          'Failed to add ingredient.',
                        )}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!manualIngredientName.trim() || createIngredientMutation.isPending}
                      onClick={() =>
                        createIngredientMutation.mutate({
                          name: manualIngredientName,
                          strength: manualIngredientStrength,
                        })
                      }
                    >
                      {createIngredientMutation.isPending ? 'Adding…' : 'Add Ingredient'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
