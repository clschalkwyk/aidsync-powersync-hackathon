export type OcrServiceResponse = {
  ocr_text: string
  warnings?: Array<
    | string
    | {
        code?: string
        message?: string
      }
  >
  metadata?: {
    source?: string
    filename?: string
    content_type?: string
    bytes_processed?: number
    width?: number
    height?: number
    language?: string
  }
}

export type MatchIngredientResponse = {
  matched: boolean
  match_type?: string | null
  confidence?: number
  ingredient?: {
    rxnorm_rxcui: string
    canonical_name: string
    normalized_name?: string | null
    common_name?: string | null
    ingredient_class?: string | null
    synonyms_json?: string[]
  } | null
  candidates?: Array<{
    rxnorm_rxcui: string
    canonical_name: string
    normalized_name?: string | null
    common_name?: string | null
    ingredient_class?: string | null
    synonyms_json?: string[]
  }>
}

export async function callOcrService(params: {
  serviceUrl: string
  apiKey?: string
  file: File
}): Promise<OcrServiceResponse> {
  const endpoint = `${params.serviceUrl.replace(/\/+$/, '')}/ocr-page`
  const formData = new FormData()
  formData.append('file', params.file, params.file.name)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...(params.apiKey ? { 'X-API-Key': params.apiKey } : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OCR service request failed (${response.status}): ${errorText}`)
  }

  return (await response.json()) as OcrServiceResponse
}

export async function matchIngredientService(params: {
  serviceUrl: string
  apiKey?: string
  name: string
}): Promise<MatchIngredientResponse> {
  const endpoint = `${params.serviceUrl.replace(/\/+$/, '')}/rxnorm/match-ingredient`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(params.apiKey ? { 'X-API-Key': params.apiKey } : {}),
    },
    body: JSON.stringify({ name: params.name }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ingredient match request failed (${response.status}): ${errorText}`)
  }

  return (await response.json()) as MatchIngredientResponse
}
