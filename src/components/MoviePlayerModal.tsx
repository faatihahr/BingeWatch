'use client'

import { useState, useEffect, useRef } from 'react'
import { FiX, FiMinimize2, FiMaximize2, FiVolume2, FiVolumeX } from 'react-icons/fi'

interface MoviePlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  movieTitle: string
}

export default function MoviePlayerModal({ isOpen, onClose, videoUrl, movieTitle }: MoviePlayerModalProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMinimized) {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose, isMinimized, isFullscreen])

  const handleMinimize = () => {
    setIsMinimized(true)
    setIsFullscreen(false)
  }

  const handleMaximize = () => {
    setIsMinimized(false)
    setIsFullscreen(true)
  }

  const handleRestore = () => {
    setIsMinimized(false)
    setIsFullscreen(false)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const getVideoEmbedUrl = (url: string) => {
    // Handle Google Drive links
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`
      }
    }
    
    // Handle YouTube links
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`
    }
    
    // Handle direct video links
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return url
    }
    
    return url
  }

  if (!isOpen) return null

  const embedUrl = getVideoEmbedUrl(videoUrl)

  return (
    <>
      {/* Minimized Player */}
      {isMinimized && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 rounded-lg shadow-2xl border border-gray-700">
          <div className="flex items-center p-2">
            <div className="flex-1 w-64 h-36">
              {embedUrl.includes('drive.google.com') || embedUrl.includes('youtube.com') ? (
                <iframe
                  src={embedUrl}
                  title={`${movieTitle} - Minimized`}
                  className="w-full h-full rounded"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={embedUrl}
                  className="w-full h-full rounded"
                  controls
                  autoPlay
                />
              )}
            </div>
            <div className="flex flex-col ml-2">
              <button
                onClick={handleRestore}
                className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                title="Restore"
              >
                <FiMaximize2 size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                title="Close"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Modal */}
      {!isMinimized && (
        <div className={`fixed inset-0 z-50 bg-black ${isFullscreen ? '' : 'bg-opacity-90'}`}>
          <div className={`relative w-full h-full flex flex-col ${isFullscreen ? '' : 'max-w-7xl mx-auto'}`}>
            {/* Header Controls */}
            <div className="flex justify-between items-center p-4 bg-gray-900">
              <h2 className="text-white text-lg font-semibold">{movieTitle}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
                </button>
                {!isFullscreen ? (
                  <button
                    onClick={handleMaximize}
                    className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                    title="Fullscreen"
                  >
                    <FiMaximize2 size={20} />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                    title="Exit Fullscreen"
                  >
                    <FiMinimize2 size={20} />
                  </button>
                )}
                <button
                  onClick={handleMinimize}
                  className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                  title="Minimize"
                >
                  <FiMinimize2 size={20} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                  title="Close"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Video Container */}
            <div className="flex-1 relative">
              {embedUrl.includes('drive.google.com') || embedUrl.includes('youtube.com') ? (
                <iframe
                  src={embedUrl}
                  title={movieTitle}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={embedUrl}
                  className="w-full h-full"
                  controls
                  autoPlay
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}