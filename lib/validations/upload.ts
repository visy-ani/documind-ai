import { z } from 'zod'

// File type validation
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
} as const

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg']

// Max file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Upload validation
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  // Check file type
  const fileType = file.type
  const fileName = file.name.toLowerCase()
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'))

  const isValidType = Object.keys(ACCEPTED_FILE_TYPES).includes(fileType)
  const isValidExtension = ACCEPTED_EXTENSIONS.includes(fileExtension)

  if (!isValidType && !isValidExtension) {
    return {
      valid: false,
      error: `File type not supported. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`,
    }
  }

  return { valid: true }
}

// Get file type from filename or mime type
export function getFileType(file: File): string {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.pdf')) return 'pdf'
  if (fileName.endsWith('.docx')) return 'docx'
  if (fileName.endsWith('.xlsx')) return 'xlsx'
  if (fileName.endsWith('.png')) return 'image'
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image'
  
  return 'unknown'
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Get file icon based on type
export function getFileIcon(fileType: string): string {
  switch (fileType) {
    case 'pdf':
      return '📄'
    case 'docx':
      return '📝'
    case 'xlsx':
      return '📊'
    case 'image':
      return '🖼️'
    default:
      return '📎'
  }
}

