import React, { useState } from 'react'
import { Trash2, Download, X } from 'lucide-react'
import { apiClient } from '../../api/tradeClient'
import { MediaEntry } from '../../types'

interface MediaGalleryProps {
  tradeId: string
  media?: MediaEntry[]
  onMediaDeleted?: (mediaId: string) => void
  onError?: (error: string) => void
  isLoading?: boolean
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  tradeId,
  media = [],
  onMediaDeleted,
  onError,
  isLoading = false
}) => {
  const [selectedImage, setSelectedImage] = useState<MediaEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId)
    try {
      await apiClient.deleteMedia(tradeId, mediaId)
      onMediaDeleted?.(mediaId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete media'
      onError?.(errorMessage)
      console.error('Delete error:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const downloadUrl = (m: MediaEntry) => apiClient.downloadMediaUrl(tradeId, m.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full" />
        </div>
      </div>
    )
  }

  if (media.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p>No media files uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {media.map((m) => (
          <div
            key={m.id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:border-blue-400 transition-colors"
          >
            {/* Thumbnail */}
            <img
              src={downloadUrl(m)}
              alt={m.file_name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setSelectedImage(m)}
            />

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setSelectedImage(m)}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                title="View full size"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(m.id)}
                disabled={deletingId === m.id}
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                title="Delete"
              >
                {deletingId === m.id ? (
                  <div className="animate-spin">
                    <Trash2 className="w-4 h-4" />
                  </div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* File name tooltip */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {m.file_name}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[80vh] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/75 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image */}
            <img
              src={downloadUrl(selectedImage)}
              alt={selectedImage.file_name}
              className="w-full h-full object-contain"
            />

            {/* File info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white p-4 text-sm">
              <p className="font-medium">{selectedImage.file_name}</p>
              <p className="text-gray-300">
                {(selectedImage.file_size / 1024).toFixed(2)} KB • {new Date(selectedImage.created_at).toLocaleDateString()}
              </p>
              <a
                href={downloadUrl(selectedImage)}
                download={selectedImage.file_name}
                className="inline-block mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
