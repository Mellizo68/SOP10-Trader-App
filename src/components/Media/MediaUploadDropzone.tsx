import React, { useCallback, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { apiClient } from '../../api/tradeClient'
import { MediaEntry } from '../../types'

interface MediaUploadDropzoneProps {
  tradeId: string
  onMediaUploaded: (media: MediaEntry) => void
  onError?: (error: string) => void
  maxFiles?: number
}

export const MediaUploadDropzone: React.FC<MediaUploadDropzoneProps> = ({
  tradeId,
  onMediaUploaded,
  onError,
  maxFiles = 50
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)

  const handleUpload = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      const error = `Invalid file type: ${file.type}. Only JPEG, PNG, WebP, and GIF are allowed.`
      onError?.(error)
      return
    }

    // Validate file size (10MB limit)
    const maxSizeInBytes = 10 * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      const error = `File size (${sizeMB}MB) exceeds 10MB limit`
      onError?.(error)
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview({
        url: e.target?.result as string,
        name: file.name
      })
    }
    reader.readAsDataURL(file)

    setIsUploading(true)
    try {
      const media = await apiClient.uploadMedia(tradeId, file)
      onMediaUploaded(media)
      setPreview(null) // Clear preview on success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload media'
      onError?.(errorMessage)
      console.error('Media upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }, [tradeId, onMediaUploaded, onError])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleUpload(files[0])
    }
  }, [handleUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || [])
    if (files.length > 0) {
      handleUpload(files[0])
    }
  }, [handleUpload])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : isUploading
          ? 'border-gray-300 bg-gray-50'
          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
      }`}
    >
      <input
        type="file"
        id="media-upload"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      <label
        htmlFor="media-upload"
        className={`cursor-pointer flex flex-col items-center gap-2 ${
          isUploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isUploading ? (
          <>
            <div className="animate-spin">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-gray-600">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              Drag and drop your image here or click to select
            </p>
            <p className="text-xs text-gray-500">
              Supported: JPEG, PNG, WebP, GIF (max 10MB)
            </p>
          </>
        )}
      </label>

      {/* Preview */}
      {preview && !isUploading && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-start gap-4">
            <img
              src={preview.url}
              alt="Preview"
              className="w-20 h-20 object-cover rounded"
            />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-700 truncate">{preview.name}</p>
              <p className="text-xs text-gray-500">Ready to upload</p>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
