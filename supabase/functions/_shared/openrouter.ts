export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type PreparationPageOcrResponse = {
  ocr_text: string
  page_summary: {
    page_index: number
    signals: string[]
  }
  warnings: string[]
}

export type MedicationDraft = {
  medicine_name: string
  active_ingredients: Array<{
    name: string
    strength: string
  }>
  strength_form: string
  contraindications: string[]
  major_interactions: string[]
  warnings: string[]
  pregnancy_lactation: string
  age_restrictions: string[]
  administration_route: string
  dose_summary: string
  max_dose: string
}

export type MedicationPrepareResponse = {
  draft: MedicationDraft
  confidence: number
  warnings: string[]
  page_summaries: Array<{
    page_index: number
    signals: string[]
  }>
}

function extractJsonString(rawContent: string): string {
  const trimmed = rawContent.trim()

  if (trimmed.startsWith('```')) {
    const withoutFenceStart = trimmed.replace(/^```(?:json)?\s*/i, '')
    const withoutFenceEnd = withoutFenceStart.replace(/\s*```$/i, '')
    return withoutFenceEnd.trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim()
  }

  return trimmed
}

function buildPageOcrPrompt(pageIndex: number): string {
  return [
    'You are transcribing a medication leaflet page for later human-reviewed structuring.',
    'Return JSON only. No markdown. No commentary.',
    `This is page ${pageIndex}.`,
    'Extract the visible text from the page as faithfully as possible.',
    'Do not normalize, summarize, or infer missing content.',
    'If parts are unreadable, omit them rather than inventing text.',
    'Return exactly this JSON structure:',
    JSON.stringify(
      {
        ocr_text: '',
        page_summary: {
          page_index: pageIndex,
          signals: [''],
        },
        warnings: [''],
      },
      null,
      2,
    ),
    'Rules:',
    '- Keep line ordering sensible for later review.',
    '- Use page_summary.signals for short labels like "composition", "contraindications", "pregnancy", "dosage".',
    '- warnings should only include OCR ambiguity or unreadable-page concerns.',
  ].join('\n')
}

export function buildPrepareMedicationPrompt(pageCount: number): string {
  return [
    'You are preparing a medication safety reference draft from OCR text collected from leaflet pages.',
    'Return JSON only. No markdown. No commentary.',
    'This output is for human review before publishing and not for autonomous clinical decision-making.',
    'Use only evidence visible in the provided OCR text.',
    'Do not invent ingredients, strengths, contraindications, interactions, dosing, or warnings.',
    `The batch contains ${pageCount} OCR page(s).`,
    'Return exactly this JSON structure:',
    JSON.stringify(
      {
        draft: {
          medicine_name: '',
          active_ingredients: [{ name: '', strength: '' }],
          strength_form: '',
          contraindications: [''],
          major_interactions: [''],
          warnings: [''],
          pregnancy_lactation: '',
          age_restrictions: [''],
          administration_route: '',
          dose_summary: '',
          max_dose: '',
        },
        confidence: 0,
        warnings: [''],
        page_summaries: [{ page_index: 0, signals: [''] }],
      },
      null,
      2
    ),
    'Rules:',
    '- Maximum confidence is 100 and minimum is 0.',
    '- Use medicine_name for the most specific product name visible.',
    '- Keep active_ingredients limited to explicit active ingredients only.',
    '- Prefer ingredients found under headings like COMPOSITION, ACTIVE INGREDIENTS, EACH TABLET/CAPSULE/LOZENGE CONTAINS, or equivalent sections.',
    '- Exclude excipients and inactive ingredients such as sugar, flavourings, colourants, preservatives, purified water, starches, or anything listed as inactive/other ingredients.',
    '- If an ingredient strength is visible on the same line or nearby composition line, include it in the strength field for that ingredient.',
    '- If the page shows an ingredient salt or hydrate plus an equivalent active moiety, prefer the clinically useful active ingredient name and keep the visible strength text.',
    '- strength_form should capture strength and dosage form together if visible.',
    '- contraindications should include only explicit contraindications or "do not use" conditions.',
    '- major_interactions should include only important drug or substance interactions if visible.',
    '- warnings should include non-contraindication warnings and precautions.',
    '- pregnancy_lactation should capture the literal pregnancy/lactation safety guidance if present.',
    '- age_restrictions should capture pediatric or age-related restrictions if present.',
    '- administration_route should capture route only, e.g. oral/topical.',
    '- dose_summary should summarize how the medicine is taken.',
    '- max_dose should capture explicit maximum daily or per-period dose if present.',
    '- Put ambiguities into top-level warnings.',
    '- Use page_summaries to note where key information was found by page.',
  ].join('\n')
}

async function callOpenRouterRaw(params: {
  apiKey: string
  model: string
  referer?: string
  title?: string
  content: unknown[]
}) {

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      ...(params.referer ? { 'HTTP-Referer': params.referer } : {}),
      ...(params.title ? { 'X-Title': params.title } : {}),
    },
    body: JSON.stringify({
      model: params.model,
      messages: [{ role: 'user', content: params.content }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter request failed (${response.status}): ${errorText}`)
  }

  const payload = await response.json()
  const rawContent = payload?.choices?.[0]?.message?.content
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('OpenRouter returned no structured content')
  }

  const jsonString = extractJsonString(rawContent)
  return JSON.parse(jsonString) as unknown
}

export async function callOpenRouterPageOcr(params: {
  apiKey: string
  model: string
  referer?: string
  title?: string
  pageIndex: number
  image: { mimeType: string; dataBase64: string }
}): Promise<PreparationPageOcrResponse> {
  const content = [
    {
      type: 'text',
      text: buildPageOcrPrompt(params.pageIndex),
    },
    {
      type: 'image_url',
      image_url: {
        url: `data:${params.image.mimeType};base64,${params.image.dataBase64}`,
      },
    },
  ]

  return await callOpenRouterRaw({
    apiKey: params.apiKey,
    model: params.model,
    referer: params.referer,
    title: params.title,
    content,
  }) as PreparationPageOcrResponse
}

export async function callOpenRouterTextMerge(params: {
  apiKey: string
  model: string
  referer?: string
  title?: string
  pages: Array<{ page_index: number; ocr_text: string }>
}): Promise<MedicationPrepareResponse> {
  const serializedPages = params.pages
    .sort((a, b) => a.page_index - b.page_index)
    .map((page) => `PAGE ${page.page_index}\n${page.ocr_text.trim()}`)
    .join('\n\n---\n\n')

  const content = [
    {
      type: 'text',
      text: `${buildPrepareMedicationPrompt(params.pages.length)}\n\nOCR PAGES START\n${serializedPages}\nOCR PAGES END`,
    },
  ]

  return await callOpenRouterRaw({
    apiKey: params.apiKey,
    model: params.model,
    referer: params.referer,
    title: params.title,
    content,
  }) as MedicationPrepareResponse
}
