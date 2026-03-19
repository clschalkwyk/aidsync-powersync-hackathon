import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = workerSrc

export type ExtractedPdfPage = {
  pageIndex: number
  text: string
}

function normalizePdfText(text: string) {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export async function extractPdfPagesFromBuffer(buffer: ArrayBuffer) {
  const loadingTask = getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  const pages: ExtractedPdfPage[] = []

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex)
    const content = await page.getTextContent()
    const text = normalizePdfText(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
    )
    pages.push({
      pageIndex,
      text,
    })
  }

  return pages.filter((page) => page.text.length > 0)
}

export async function extractPdfPagesFromFile(file: File) {
  const buffer = await file.arrayBuffer()
  return extractPdfPagesFromBuffer(buffer)
}

export async function extractPdfPagesFromUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('pdf') && !url.toLowerCase().endsWith('.pdf')) {
    throw new Error('Remote URL did not return a PDF file.')
  }

  const buffer = await response.arrayBuffer()
  return extractPdfPagesFromBuffer(buffer)
}
