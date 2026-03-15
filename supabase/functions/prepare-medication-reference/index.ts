import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  callOpenRouterTextMerge,
  type MedicationPrepareResponse,
} from '../_shared/openrouter.ts'
import {
  callOcrService,
  matchIngredientService,
  type OcrServiceResponse,
} from '../_shared/ocr_service.ts'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGES = 10
const MAX_FILE_BYTES = 10 * 1024 * 1024
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function validateSupabaseUser(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabasePublishableKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY')

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase auth validation environment is not configured')
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: supabasePublishableKey,
    },
  })

  if (!response.ok) {
    return null
  }

  return await response.json()
}

function buildFallbackDraft(): MedicationPrepareResponse {
  return {
    draft: {
      medicine_name: '',
      active_ingredients: [],
      strength_form: '',
      contraindications: [],
      major_interactions: [],
      warnings: [],
      pregnancy_lactation: '',
      age_restrictions: [],
      administration_route: '',
      dose_summary: '',
      max_dose: '',
    },
    confidence: 0,
    warnings: ['Extraction service did not return usable structured output.'],
    page_summaries: [],
  }
}

function buildFallbackOcr(pageIndex = 1): PreparationPageOcrResponse {
  return {
    ocr_text: '',
    page_summary: {
      page_index: pageIndex,
      signals: [],
    },
    warnings: ['OCR service did not return usable text.'],
  }
}

async function normalizeDraftIngredients(params: {
  draft: MedicationPrepareResponse['draft']
  warnings: string[]
  serviceUrl: string
  apiKey?: string
}) {
  const normalizedIngredients: MedicationPrepareResponse['draft']['active_ingredients'] = []

  for (const ingredient of params.draft.active_ingredients ?? []) {
    const rawName = String(ingredient?.name ?? '').trim()
    const rawStrength = String(ingredient?.strength ?? '').trim()
    if (!rawName) continue

    try {
      const match = await matchIngredientService({
        serviceUrl: params.serviceUrl,
        apiKey: params.apiKey,
        name: rawName,
      })

      if (match.matched && match.ingredient?.canonical_name) {
        normalizedIngredients.push({
          name: match.ingredient.canonical_name,
          strength: rawStrength,
        })
        if ((match.confidence ?? 0) < 0.9) {
          params.warnings.push(
            `Ingredient normalized with review recommended: ${rawName} -> ${match.ingredient.canonical_name}`,
          )
        }
        continue
      }

      params.warnings.push(`Ingredient requires manual resolution: ${rawName}`)
      normalizedIngredients.push({
        name: rawName,
        strength: rawStrength,
      })
    } catch (error) {
      params.warnings.push(
        `Ingredient normalization unavailable for "${rawName}": ${error instanceof Error ? error.message : 'unknown error'}`,
      )
      normalizedIngredients.push({
        name: rawName,
        strength: rawStrength,
      })
    }
  }

  params.draft.active_ingredients = normalizedIngredients
}

type PreparationPageOcrResponse = {
  ocr_text: string
  page_summary: {
    page_index: number
    signals: string[]
  }
  warnings: string[]
}

function summarizeOcrText(ocrText: string, pageIndex: number): PreparationPageOcrResponse {
  const normalized = ocrText.trim()
  const lower = normalized.toLowerCase()
  const signals: string[] = []

  const signalMap = [
    ['composition', ['composition', 'contains', 'active ingredient', 'active ingredients']],
    ['contraindications', ['contraindication', 'do not use', 'do not take']],
    ['interactions', ['interaction', 'interactions', 'other medicines', 'co-administration']],
    ['pregnancy', ['pregnancy', 'lactation', 'breastfeeding']],
    ['dosage', ['dosage', 'directions for use', 'dose', 'administration']],
    ['warnings', ['warning', 'warnings', 'precautions', 'special precautions']],
  ] as const

  for (const [label, keywords] of signalMap) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      signals.push(label)
    }
  }

  return {
    ocr_text: normalized,
    page_summary: {
      page_index: pageIndex,
      signals,
    },
    warnings: normalized ? [] : ['OCR service did not return usable text.'],
  }
}

function normalizeOcrWarnings(payload: OcrServiceResponse): string[] {
  const warnings = payload.warnings ?? []
  return warnings
    .map((warning) => {
      if (typeof warning === 'string') {
        return warning.trim()
      }

      return String(warning.message ?? warning.code ?? '').trim()
    })
    .filter((warning) => warning.length > 0)
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing Authorization header' })
  }

  const user = await validateSupabaseUser(authHeader)
  if (!user) {
    return jsonResponse(401, { error: 'Invalid JWT' })
  }

  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!openRouterApiKey) {
    return jsonResponse(500, {
      error: 'OPENROUTER_API_KEY is not configured',
    })
  }

  const ocrServiceUrl = Deno.env.get('OCR_SERVICE_URL')
  const ocrServiceApiKey = Deno.env.get('OCR_SERVICE_API_KEY')
  if (!ocrServiceUrl) {
    return jsonResponse(500, {
      error: 'OCR_SERVICE_URL is not configured',
    })
  }

  const openRouterFallbackModel =
    Deno.env.get('OPENROUTER_MODEL') ?? 'openrouter/auto'
  const openRouterMergeModel =
    Deno.env.get('OPENROUTER_MERGE_MODEL') ?? openRouterFallbackModel
  const appReferer =
    Deno.env.get('OPENROUTER_HTTP_REFERER') ?? 'https://aidsync.local'
  const appTitle = Deno.env.get('OPENROUTER_X_TITLE') ?? 'AidSync Dashboard'

  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const mode = String(formData.get('mode') ?? 'ocr_page')
      const pageIndex = Number(formData.get('page_index') ?? '1')

      if (mode !== 'ocr_page') {
        return jsonResponse(400, { error: `Unsupported multipart mode: ${mode}` })
      }

      const files = formData
        .getAll('images')
        .filter((value): value is File => value instanceof File)

      if (files.length === 0) {
        return jsonResponse(400, { error: 'At least one image is required' })
      }

      if (files.length > 1) {
        return jsonResponse(400, { error: 'OCR mode accepts one page image at a time' })
      }

      const [file] = files
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return jsonResponse(400, {
          error: `Unsupported file type: ${file.type || 'unknown'}`,
        })
      }

      if (file.size > MAX_FILE_BYTES) {
        return jsonResponse(400, {
          error: `File too large: ${file.name}`,
        })
      }

      const ocrPayload = await callOcrService({
        serviceUrl: ocrServiceUrl,
        apiKey: ocrServiceApiKey,
        file,
      })

      const result = summarizeOcrText(
        ocrPayload.ocr_text ?? '',
        Number.isFinite(pageIndex) ? pageIndex : 1,
      )
      result.warnings = [...result.warnings, ...normalizeOcrWarnings(ocrPayload)]

      return jsonResponse(200, result)
    }

    const payload = await request.json()
    const mode = String(payload?.mode ?? '')

    if (mode !== 'merge_session') {
      return jsonResponse(400, { error: 'Unsupported request mode' })
    }

    const pages = Array.isArray(payload?.pages)
      ? payload.pages
          .map((page) => ({
            page_index: Number(page?.page_index ?? 0),
            ocr_text: String(page?.ocr_text ?? '').trim(),
          }))
          .filter((page) => Number.isFinite(page.page_index) && page.page_index > 0 && page.ocr_text.length > 0)
      : []

    if (pages.length === 0) {
      return jsonResponse(400, { error: 'At least one OCR page is required for merge' })
    }

    if (pages.length > MAX_IMAGES) {
      return jsonResponse(400, { error: `Provide up to ${MAX_IMAGES} OCR pages only` })
    }

    const result = await callOpenRouterTextMerge({
      apiKey: openRouterApiKey,
      model: openRouterMergeModel,
      referer: appReferer,
      title: appTitle,
      pages,
    })

    await normalizeDraftIngredients({
      draft: result.draft,
      warnings: result.warnings,
      serviceUrl: ocrServiceUrl,
      apiKey: ocrServiceApiKey,
    })

    return jsonResponse(200, result)
  } catch (error) {
    console.error('prepare-medication-reference failed', error)
    return jsonResponse(502, {
      error: error instanceof Error ? error.message : 'Extraction failed',
      fallback:
        request.headers.get('content-type')?.includes('multipart/form-data')
          ? buildFallbackOcr()
          : buildFallbackDraft(),
    })
  }
})
