import * as pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import sharp from 'sharp'
import { getGeminiModel } from '@/lib/gemini/client'

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // @ts-ignore - pdf-parse has ESM export issues
    const data = await (pdfParse.default || pdfParse)(buffer)
    return data.text
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    console.error('DOCX extraction error:', error)
    throw new Error('Failed to extract text from DOCX')
  }
}

/**
 * Extract data from XLSX file
 */
export async function extractDataFromXLSX(buffer: Buffer): Promise<{
  sheets: Array<{
    name: string
    data: any[]
    rowCount: number
    colCount: number
  }>
  text: string
}> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheets = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      return {
        name: sheetName,
        data,
        rowCount: data.length,
        colCount: data.length > 0 ? (data[0] as any[]).length : 0,
      }
    })

    // Convert to searchable text
    const text = sheets
      .map((sheet) => {
        const sheetText = sheet.data
          .map((row: any) => row.join(' '))
          .join('\n')
        return `Sheet: ${sheet.name}\n${sheetText}`
      })
      .join('\n\n')

    return { sheets, text }
  } catch (error) {
    console.error('XLSX extraction error:', error)
    throw new Error('Failed to extract data from XLSX')
  }
}

/**
 * Extract text from image using Gemini Vision
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const model = getGeminiModel('gemini-2.0-flash-exp')
    
    // Convert buffer to base64
    const base64Image = buffer.toString('base64')
    const mimeType = detectImageMimeType(buffer)

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
      'Extract all text from this image. Return only the text content, no descriptions or commentary.',
    ])

    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Image OCR error:', error)
    throw new Error('Failed to extract text from image')
  }
}

/**
 * Generate thumbnail from image or PDF
 */
export async function generateThumbnail(
  buffer: Buffer,
  fileType: string
): Promise<Buffer> {
  try {
    if (fileType === 'pdf') {
      // For PDFs, we'll create a placeholder thumbnail
      // In production, you might want to use pdf-thumbnail or similar
      return await createPlaceholderThumbnail('📄', 'PDF')
    }

    if (fileType === 'docx') {
      return await createPlaceholderThumbnail('📝', 'DOCX')
    }

    if (fileType === 'xlsx') {
      return await createPlaceholderThumbnail('📊', 'XLSX')
    }

    // For images, resize to thumbnail
    if (fileType === 'image') {
      return await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer()
    }

    throw new Error(`Unsupported file type for thumbnail: ${fileType}`)
  } catch (error) {
    console.error('Thumbnail generation error:', error)
    throw new Error('Failed to generate thumbnail')
  }
}

/**
 * Create a placeholder thumbnail with icon and text
 */
async function createPlaceholderThumbnail(
  icon: string,
  label: string
): Promise<Buffer> {
  const svg = `
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="300" fill="#f1f5f9"/>
      <text
        x="150"
        y="120"
        font-family="Arial, sans-serif"
        font-size="80"
        text-anchor="middle"
      >${icon}</text>
      <text
        x="150"
        y="200"
        font-family="Arial, sans-serif"
        font-size="24"
        fill="#64748b"
        text-anchor="middle"
      >${label}</text>
    </svg>
  `

  return await sharp(Buffer.from(svg))
    .png()
    .toBuffer()
}

/**
 * Detect image MIME type from buffer
 */
function detectImageMimeType(buffer: Buffer): string {
  // Check magic numbers
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return 'image/jpeg'
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  // Default to jpeg
  return 'image/jpeg'
}

/**
 * Process document based on file type
 */
export async function processDocument(
  buffer: Buffer,
  fileType: string
): Promise<{
  text: string
  metadata: Record<string, any>
}> {
  let text = ''
  let metadata: Record<string, any> = {}

  try {
    switch (fileType) {
      case 'pdf':
        text = await extractTextFromPDF(buffer)
        metadata = {
          wordCount: text.split(/\s+/).length,
          characterCount: text.length,
        }
        break

      case 'docx':
        text = await extractTextFromDOCX(buffer)
        metadata = {
          wordCount: text.split(/\s+/).length,
          characterCount: text.length,
        }
        break

      case 'xlsx':
        const xlsxData = await extractDataFromXLSX(buffer)
        text = xlsxData.text
        metadata = {
          sheetCount: xlsxData.sheets.length,
          sheets: xlsxData.sheets.map((s) => ({
            name: s.name,
            rows: s.rowCount,
            columns: s.colCount,
          })),
        }
        break

      case 'image':
        text = await extractTextFromImage(buffer)
        metadata = {
          ocrEnabled: true,
          extractedText: text.length > 0,
        }
        break

      default:
        throw new Error(`Unsupported file type: ${fileType}`)
    }

    return { text, metadata }
  } catch (error) {
    console.error('Document processing error:', error)
    throw error
  }
}

