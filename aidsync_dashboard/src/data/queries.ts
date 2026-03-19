import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type {
  ActiveIngredient,
  EncounterDetail,
  InteractionCheck,
  LeafletPreparationPage,
  LeafletPreparationSession,
  LeafletPreparationSessionDetail,
  MedicationCatalog,
  MedicationContraindicationRule,
  MedicationInteractionRule,
  MedicationWithIngredients,
  Patient,
  PatientDetail,
  Profile,
} from '@/types/database'

type MedicationInsert = Database['public']['Tables']['medication_catalog']['Insert']
type MedicationUpdate = Database['public']['Tables']['medication_catalog']['Update']
type ActiveIngredientInsert = Database['public']['Tables']['active_ingredients']['Insert']
type ActiveIngredientUpdate = Database['public']['Tables']['active_ingredients']['Update']
type MedicationCatalogIngredientInsert = Database['public']['Tables']['medication_catalog_ingredients']['Insert']
type PatientUpdate = Database['public']['Tables']['patients']['Update']
type EncounterUpdate = Database['public']['Tables']['encounters']['Update']
type InteractionRuleInsert = Database['public']['Tables']['medication_interaction_rules']['Insert']
type InteractionRuleUpdate = Database['public']['Tables']['medication_interaction_rules']['Update']
type ContraindicationRuleInsert = Database['public']['Tables']['medication_contraindication_rules']['Insert']
type ContraindicationRuleUpdate = Database['public']['Tables']['medication_contraindication_rules']['Update']
type PreparationSessionInsert = Database['public']['Tables']['leaflet_preparation_sessions']['Insert']
type PreparationSessionUpdate = Database['public']['Tables']['leaflet_preparation_sessions']['Update']
type PreparationPageInsert = Database['public']['Tables']['leaflet_preparation_pages']['Insert']
type PreparationPageUpdate = Database['public']['Tables']['leaflet_preparation_pages']['Update']

// Auth queries
export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single()
  
  if (error) throw error
  return data as any
}

// Overview counts
export async function fetchOverviewCounts(): Promise<{
  patients: number
  medications: number
  encounters: number
  pendingChecks: number
}> {
  const [
    { count: patients },
    { count: medications },
    { count: encounters },
    { count: pendingChecks },
  ] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }),
    supabase.from('medication_catalog').select('*', { count: 'exact', head: true }),
    supabase.from('encounters').select('*', { count: 'exact', head: true }),
    supabase.from('interaction_checks').select('*', { count: 'exact', head: true })
      .is('reviewed_at', null)
      .or('severity.eq.red,severity.eq.yellow,clinician_action.eq.note'),
  ])

  return {
    patients: patients || 0,
    medications: medications || 0,
    encounters: encounters || 0,
    pendingChecks: pendingChecks || 0,
  }
}

export async function fetchOverviewStats() {
  const { data: recentEncounters } = await supabase
    .from('encounters')
    .select('*, patient:patients(full_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: pendingReviews } = await supabase
    .from('interaction_checks')
    .select('*, encounter:encounters(id, patient:patients(full_name))')
    .is('reviewed_at', null)
    .or('severity.eq.red,severity.eq.yellow,clinician_action.eq.note')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    recentEncounters: (recentEncounters || []) as any[],
    pendingReviews: (pendingReviews || []) as any[],
  }
}

// Medication queries
export async function fetchMedications(): Promise<MedicationCatalog[]> {
  const { data, error } = await supabase
    .from('medication_catalog')
    .select('*')
    .order('brand_name')
  
  if (error) throw error
  return (data || []) as MedicationCatalog[]
}

export async function fetchMedicationById(id: string): Promise<MedicationWithIngredients | null> {
  const { data, error } = await supabase
    .from('medication_catalog')
    .select(`
      *,
      ingredients:medication_catalog_ingredients(
        id,
        medication_id,
        ingredient_id,
        strength_text,
        sort_order,
        is_primary,
        ingredient:active_ingredients(*)
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as any
}

export async function fetchActiveIngredients(): Promise<ActiveIngredient[]> {
  const { data, error } = await supabase
    .from('active_ingredients')
    .select('*')
    .order('canonical_name')
  
  if (error) throw error
  return (data || []) as ActiveIngredient[]
}

export async function fetchInteractionRules(): Promise<MedicationInteractionRule[]> {
  const { data, error } = await supabase
    .from('medication_interaction_rules')
    .select(`
      *,
      ingredient:active_ingredients(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return (data || []) as MedicationInteractionRule[]
}

export async function fetchContraindicationRules(): Promise<MedicationContraindicationRule[]> {
  const { data, error } = await supabase
    .from('medication_contraindication_rules')
    .select(`
      *,
      ingredient:active_ingredients(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return (data || []) as MedicationContraindicationRule[]
}

export async function fetchRulesByIngredientIds(ingredientIds: string[]) {
  if (ingredientIds.length === 0) return { interactions: [], contraindications: [] }

  const [interactions, contraindications] = await Promise.all([
    supabase
      .from('medication_interaction_rules')
      .select('*, ingredient:active_ingredients(*)')
      .in('ingredient_id', ingredientIds),
    supabase
      .from('medication_contraindication_rules')
      .select('*, ingredient:active_ingredients(*)')
      .in('ingredient_id', ingredientIds)
  ])

  return {
    interactions: (interactions.data || []) as MedicationInteractionRule[],
    contraindications: (contraindications.data || []) as MedicationContraindicationRule[]
  }
}

type PreparationDraftIngredient = {
  ingredient_id?: string
  name: string
  strength: string
}

type PreparationDraftJson = {
  medicine_name?: string
  active_ingredients?: PreparationDraftIngredient[]
  strength_form?: string
  contraindications?: string[]
  major_interactions?: string[]
  warnings?: string[]
  pregnancy_lactation?: string
  age_restrictions?: string[]
  administration_route?: string
  dose_summary?: string
  max_dose?: string
}

export async function fetchPreparationSessions(): Promise<Array<LeafletPreparationSession & { page_count: number }>> {
  const { data, error } = await supabase
    .from('leaflet_preparation_sessions')
    .select(`
      *,
      pages:leaflet_preparation_pages(count)
    `)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data || []).map((row: any) => ({
    ...row,
    page_count: row.pages?.[0]?.count ?? 0,
  }))
}

export async function createPreparationSession(
  session: Pick<PreparationSessionInsert, 'created_by'> &
    Partial<Pick<PreparationSessionInsert, 'source_name' | 'notes'>>
): Promise<LeafletPreparationSession> {
  const payload: PreparationSessionInsert = {
    created_by: session.created_by,
    source_name: session.source_name ?? null,
    notes: session.notes ?? null,
    status: 'draft',
    warnings_json: [],
    draft_json: {},
  }

  const { data, error } = await (supabase
    .from('leaflet_preparation_sessions') as any)
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as LeafletPreparationSession
}

export async function fetchPreparationSessionDetail(id: string): Promise<LeafletPreparationSessionDetail | null> {
  const { data, error } = await supabase
    .from('leaflet_preparation_sessions')
    .select(`
      *,
      creator:profiles!leaflet_preparation_sessions_created_by_fkey(id, full_name, role),
      pages:leaflet_preparation_pages(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  const typed = data as any
  typed.pages = (typed.pages || []).sort((a: LeafletPreparationPage, b: LeafletPreparationPage) => a.page_index - b.page_index)
  return typed as LeafletPreparationSessionDetail
}

export async function updatePreparationSession(id: string, updates: PreparationSessionUpdate) {
  const { data, error } = await (supabase
    .from('leaflet_preparation_sessions') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as LeafletPreparationSession
}

export async function deletePreparationSession(id: string) {
  const session = await fetchPreparationSessionDetail(id)
  if (!session) {
    throw new Error('Preparation session not found')
  }

  const storagePaths = session.pages
    .map((page) => page.storage_path)
    .filter((path): path is string => Boolean(path) && path.startsWith('sessions/'))

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('leaflet-preparation')
      .remove(storagePaths)

    if (storageError) throw storageError
  }

  const { error } = await supabase
    .from('leaflet_preparation_sessions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function uploadPreparationPage(sessionId: string, file: File, pageIndex: number) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `sessions/${sessionId}/page-${pageIndex}.${extension}`

  const upload = await supabase.storage
    .from('leaflet-preparation')
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })

  if (upload.error) throw upload.error

  const payload: PreparationPageInsert = {
    session_id: sessionId,
    page_index: pageIndex,
    storage_path: storagePath,
    status: 'uploaded',
    extraction_json: {},
    warnings_json: [],
  }

  const { data, error } = await (supabase
    .from('leaflet_preparation_pages') as any)
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as LeafletPreparationPage
}

export async function importPreparationPdfPages(
  sessionId: string,
  pages: Array<{ pageIndex: number; text: string; sourceLabel: string }>
) {
  if (pages.length === 0) {
    throw new Error('No PDF text pages were extracted.')
  }

  const payload: PreparationPageInsert[] = pages.map((page) => ({
    session_id: sessionId,
    page_index: page.pageIndex,
    storage_path: `pdf-import/${page.sourceLabel}#page-${page.pageIndex}`,
    status: 'extracted',
    ocr_text: page.text,
    extraction_json: {
      source_mode: 'pdf_text',
      page_summary: {
        page_index: page.pageIndex,
        signals: [],
      },
    } as any,
    warnings_json: [],
    error_text: null,
  }))

  const { error } = await (supabase
    .from('leaflet_preparation_pages') as any)
    .insert(payload)

  if (error) throw error

  await updatePreparationSession(sessionId, {
    status: 'draft',
  })

  return fetchPreparationSessionDetail(sessionId)
}

export async function updatePreparationPage(id: string, updates: PreparationPageUpdate) {
  const { data, error } = await (supabase
    .from('leaflet_preparation_pages') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as LeafletPreparationPage
}

function normalizeIngredientName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:contains?|equivalent(?:\s+to)?|active\s+ingredient(?:s)?|each)\b/g, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|µg|units?|iu|%)(?:\/\w+)?\b/g, ' ')
    .replace(/[^a-z0-9\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ingredientAliasSet(name: string) {
  const normalized = normalizeIngredientName(name)
  const aliases = new Set<string>()
  if (!normalized) return aliases

  aliases.add(normalized)
  aliases.add(
    normalized
      .replace(/\b(?:sodium|hydrochloride|hydrobromide|sesquihydrate|hydrate|phosphate|citrate|maleate|tartrate|sulphate|sulfate|nitrate)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
  aliases.add(
    normalized
      .replace(/\b(?:equivalent to)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )

  return new Set([...aliases].filter(Boolean))
}

function ingredientTokens(value: string) {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
}

function ingredientMatchesCandidate(extractedName: string, candidate: ActiveIngredient) {
  const extractedAliases = ingredientAliasSet(extractedName)
  const candidateNames = [
    candidate.canonical_name,
    candidate.normalized_name,
    candidate.common_name ?? '',
    ...(Array.isArray(candidate.synonyms_json) ? candidate.synonyms_json.map((item) => String(item)) : []),
  ]

  const candidateAliases = new Set<string>()
  for (const candidateName of candidateNames) {
    for (const alias of ingredientAliasSet(candidateName)) {
      candidateAliases.add(alias)
    }
  }

  for (const extractedAlias of extractedAliases) {
    for (const candidateAlias of candidateAliases) {
      if (!extractedAlias || !candidateAlias) continue
      if (extractedAlias === candidateAlias) return true
      if (extractedAlias.includes(candidateAlias)) return true
      if (candidateAlias.includes(extractedAlias) && extractedAlias.length >= 6) return true

      const extractedTokenSet = new Set(ingredientTokens(extractedAlias))
      const candidateTokens = ingredientTokens(candidateAlias)
      if (
        candidateTokens.length > 0 &&
        candidateTokens.every((token) => extractedTokenSet.has(token))
      ) {
        return true
      }
    }
  }

  return false
}

function normalizePreparationDraft(
  draft: PreparationDraftJson,
  warnings: string[],
  activeIngredients: ActiveIngredient[]
) {
  const ingredientMap = new Map<string, PreparationDraftIngredient>()
  const extractedIngredients = Array.isArray(draft.active_ingredients) ? draft.active_ingredients : []

  for (const ingredient of extractedIngredients) {
    const name = String(ingredient?.name ?? '').trim()
    if (!name) continue

    const matched = activeIngredients.find((candidate) =>
      ingredientMatchesCandidate(name, candidate)
    )

    if (!matched) {
      warnings.push(`Ingredient requires manual resolution: ${name}`)
      const unresolvedKey = `unresolved:${normalizeIngredientName(name)}:${String(ingredient?.strength ?? '').trim()}`
      if (!ingredientMap.has(unresolvedKey)) {
        ingredientMap.set(unresolvedKey, {
          name,
          strength: String(ingredient?.strength ?? '').trim(),
        })
      }
      continue
    }

    if (ingredientMap.has(matched.id)) continue

    ingredientMap.set(matched.id, {
      ingredient_id: matched.id,
      name: matched.canonical_name,
      strength: String(ingredient?.strength ?? '').trim(),
    })
  }

  return {
    draft: {
      medicine_name: draft.medicine_name?.trim() || '',
      active_ingredients: [...ingredientMap.values()],
      strength_form: draft.strength_form?.trim() || '',
      contraindications: Array.isArray(draft.contraindications)
        ? [...new Set(draft.contraindications.map((item) => String(item).trim()).filter(Boolean))]
        : [],
      major_interactions: Array.isArray(draft.major_interactions)
        ? [...new Set(draft.major_interactions.map((item) => String(item).trim()).filter(Boolean))]
        : [],
      warnings: Array.isArray(draft.warnings)
        ? [...new Set(draft.warnings.map((item) => String(item).trim()).filter(Boolean))]
        : [],
      pregnancy_lactation: draft.pregnancy_lactation?.trim() || '',
      age_restrictions: Array.isArray(draft.age_restrictions)
        ? [...new Set(draft.age_restrictions.map((item) => String(item).trim()).filter(Boolean))]
        : [],
      administration_route: draft.administration_route?.trim() || '',
      dose_summary: draft.dose_summary?.trim() || '',
      max_dose: draft.max_dose?.trim() || '',
    } satisfies PreparationDraftJson,
    warnings: [...new Set(warnings.filter(Boolean).map((warning) => warning.trim()))],
  }
}

export async function processPreparationPage(pageId: string) {
  const page = await (async () => {
    const { data, error } = await supabase
      .from('leaflet_preparation_pages')
      .select('*')
      .eq('id', pageId)
      .single()
    if (error) throw error
    return data as LeafletPreparationPage
  })()

  await updatePreparationPage(pageId, {
    status: 'processing',
    error_text: null,
  })
  await updatePreparationSession(page.session_id, { status: 'processing' })

  const download = await supabase.storage
    .from('leaflet-preparation')
    .download(page.storage_path)

  if (download.error) {
    await updatePreparationPage(pageId, {
      status: 'failed',
      error_text: download.error.message,
    })
    await updatePreparationSession(page.session_id, { status: 'failed' })
    throw download.error
  }

  const file = new File([download.data], page.storage_path.split('/').pop() || `page-${page.page_index}.jpg`, {
    type: download.data.type || 'image/jpeg',
  })
  const formData = new FormData()
  formData.append('mode', 'ocr_page')
  formData.append('page_index', String(page.page_index))
  formData.append('images', file)

  const { data, error } = await supabase.functions.invoke<{
    ocr_text: string
    page_summary: { page_index: number; signals: string[] }
    warnings: string[]
  }>('prepare-medication-reference', {
    body: formData,
  })

  if (error || !data) {
    const message = error?.message || 'OCR failed'
    await updatePreparationPage(pageId, {
      status: 'failed',
      error_text: message,
    })
    await updatePreparationSession(page.session_id, { status: 'failed' })
    throw new Error(message)
  }

  await updatePreparationPage(pageId, {
    status: 'extracted',
    ocr_text: data.ocr_text || null,
    extraction_json: {
      page_summary: data.page_summary,
    } as any,
    warnings_json: data.warnings as any,
    error_text: null,
  })

  await updatePreparationSession(page.session_id, {
    status: 'draft',
  })

  return fetchPreparationSessionDetail(page.session_id)
}

export async function extractPreparationSession(sessionId: string, activeIngredients: ActiveIngredient[]) {
  const session = await fetchPreparationSessionDetail(sessionId)
  if (!session) throw new Error('Preparation session not found')

  const pages = session.pages
    .filter((page) => page.status === 'extracted' && page.ocr_text?.trim())
    .map((page) => ({
      page_index: page.page_index,
      ocr_text: page.ocr_text!.trim(),
    }))

  if (pages.length === 0) {
    throw new Error('No OCR text available yet')
  }

  await updatePreparationSession(sessionId, { status: 'processing' })

  const { data, error } = await supabase.functions.invoke<{
    draft: PreparationDraftJson
    confidence: number
    warnings: string[]
    page_summaries: Array<{ page_index: number; signals: string[] }>
  }>('prepare-medication-reference', {
    body: {
      mode: 'merge_session',
      pages,
    },
  })

  if (error || !data) {
    const message = error?.message || 'Draft build failed'
    await updatePreparationSession(sessionId, { status: 'failed' })
    throw new Error(message)
  }

  const normalized = normalizePreparationDraft(data.draft || {}, [...(data.warnings || [])], activeIngredients)

  await updatePreparationSession(sessionId, {
    brand_name: normalized.draft.medicine_name || null,
    generic_name: null,
    dosage_form: normalized.draft.strength_form || null,
    manufacturer_name: null,
    notes: normalized.draft.dose_summary || null,
    draft_json: normalized.draft as any,
    warnings_json: normalized.warnings as any,
    confidence: typeof data.confidence === 'number' ? data.confidence : null,
    status: 'ready_for_review',
  })

  return fetchPreparationSessionDetail(sessionId)
}

export async function publishPreparationSession(sessionId: string) {
  const session = await fetchPreparationSessionDetail(sessionId)
  if (!session) {
    throw new Error('Preparation session not found')
  }

  const draft = (session.draft_json || {}) as PreparationDraftJson
  const ingredients = Array.isArray(draft.active_ingredients) ? draft.active_ingredients : []

  if (!draft.medicine_name?.trim()) {
    throw new Error('Medicine name is required before publishing')
  }

  if (ingredients.length === 0) {
    throw new Error('At least one linked ingredient is required before publishing')
  }

  if (ingredients.some((ingredient) => !ingredient.ingredient_id)) {
    throw new Error('Resolve all ingredients before publishing')
  }

  const medication = await createMedication({
    brand_name: draft.medicine_name.trim(),
    generic_name: null,
    normalized_brand_name: draft.medicine_name.trim().toLowerCase(),
    dosage_form: draft.strength_form?.trim() || null,
    manufacturer_name: null,
    source_name: session.source_name || 'preparation_session',
    notes: [
      draft.administration_route?.trim() ? `Route: ${draft.administration_route.trim()}` : null,
      draft.dose_summary?.trim() ? `Dose summary: ${draft.dose_summary.trim()}` : null,
      draft.max_dose?.trim() ? `Max dose: ${draft.max_dose.trim()}` : null,
      draft.pregnancy_lactation?.trim() ? `Pregnancy/lactation: ${draft.pregnancy_lactation.trim()}` : null,
    ].filter(Boolean).join('\n') || null,
    is_active: true,
  })

  await Promise.all(
    ingredients.map((ingredient, index) =>
      createMedicationCatalogIngredient({
        medication_id: medication.id,
        ingredient_id: ingredient.ingredient_id!,
        strength_text: ingredient.strength || null,
        sort_order: index,
        is_primary: index === 0,
      })
    )
  )

  await updatePreparationSession(sessionId, {
    status: 'published',
    published_medication_id: medication.id,
  })

  return medication
}

// Patient queries
export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return (data || []) as Patient[]
}

export async function fetchPatientById(id: string): Promise<PatientDetail | null> {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      allergies:patient_allergies(*),
      conditions:patient_conditions(*),
      current_medications:current_medications(*),
      encounters:encounters(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as any
}

export async function updatePatient(id: string, patient: PatientUpdate) {
  const { data, error } = await (supabase
    .from('patients') as any)
    .update(patient)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Encounter queries
export async function fetchEncounters(): Promise<any[]> {
  const { data, error } = await supabase
    .from('encounters')
    .select(`
      *,
      patient:patients(*),
      interaction_checks(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function fetchEncounterById(id: string): Promise<EncounterDetail | null> {
  const { data, error } = await supabase
    .from('encounters')
    .select(`
      *,
      patient:patients(*),
      vitals:vitals(*),
      scanned_inserts:scanned_inserts(*),
      interaction_checks:interaction_checks(*),
      attachments:attachments(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as any
}

export async function updateEncounter(id: string, encounter: EncounterUpdate) {
  const { data, error } = await (supabase
    .from('encounters') as any)
    .update(encounter)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Write operations
export async function createMedication(medication: MedicationInsert) {
  const { data, error } = await (supabase
    .from('medication_catalog') as any)
    .insert(medication)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateMedication(id: string, medication: MedicationUpdate) {
  const { data, error } = await (supabase
    .from('medication_catalog') as any)
    .update(medication)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeMedication(id: string) {
  const { error } = await supabase
    .from('medication_catalog')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function createActiveIngredient(ingredient: ActiveIngredientInsert) {
  const { data, error } = await (supabase
    .from('active_ingredients') as any)
    .insert(ingredient)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateActiveIngredient(id: string, ingredient: ActiveIngredientUpdate) {
  const { data, error } = await (supabase
    .from('active_ingredients') as any)
    .update(ingredient)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeActiveIngredient(id: string) {
  const { error } = await supabase
    .from('active_ingredients')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function createMedicationCatalogIngredient(item: MedicationCatalogIngredientInsert) {
  const { data, error } = await (supabase
    .from('medication_catalog_ingredients') as any)
    .insert(item)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeMedicationCatalogIngredient(id: string) {
  const { error } = await supabase
    .from('medication_catalog_ingredients')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function createInteractionRule(rule: InteractionRuleInsert) {
  const { data, error } = await (supabase
    .from('medication_interaction_rules') as any)
    .insert(rule)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateInteractionRule(id: string, rule: InteractionRuleUpdate) {
  const { data, error } = await (supabase
    .from('medication_interaction_rules') as any)
    .update(rule)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createContraindicationRule(rule: ContraindicationRuleInsert) {
  const { data, error } = await (supabase
    .from('medication_contraindication_rules') as any)
    .insert(rule)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateContraindicationRule(id: string, rule: ContraindicationRuleUpdate) {
  const { data, error } = await (supabase
    .from('medication_contraindication_rules') as any)
    .update(rule)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeInteractionRule(id: string) {
  const { error } = await supabase
    .from('medication_interaction_rules')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function removeContraindicationRule(id: string) {
  const { error } = await supabase
    .from('medication_contraindication_rules')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updateInteractionCheck(id: string, updates: Partial<InteractionCheck>) {
  const { data, error } = await (supabase
    .from('interaction_checks') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
