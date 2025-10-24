import { put, del, head } from '@vercel/blob'

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadToBlob(
  path: string,
  file: File | Buffer,
  options?: {
    access?: 'public' | 'private'
    contentType?: string
  }
) {
  try {
    const blob = await put(path, file, {
      access: (options?.access || 'public') as 'public',
      addRandomSuffix: false,
      contentType: options?.contentType,
    })

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
    }
  } catch (error) {
    console.error('Blob upload error:', error)
    throw new Error('Failed to upload file to storage')
  }
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFromBlob(url: string) {
  try {
    await del(url)
    return { success: true }
  } catch (error) {
    console.error('Blob delete error:', error)
    throw new Error('Failed to delete file from storage')
  }
}

/**
 * Get file metadata from Vercel Blob storage
 */
export async function getBlobMetadata(url: string) {
  try {
    const metadata = await head(url)
    return metadata
  } catch (error) {
    console.error('Blob metadata error:', error)
    throw new Error('Failed to get file metadata')
  }
}

/**
 * Generate a unique file path
 */
export function generateBlobPath(
  workspaceId: string,
  filename: string,
  prefix: string = 'documents'
): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const fileExtension = filename.substring(filename.lastIndexOf('.'))
  const uniqueFilename = `${timestamp}-${randomString}${fileExtension}`
  
  return `${prefix}/${workspaceId}/${uniqueFilename}`
}

