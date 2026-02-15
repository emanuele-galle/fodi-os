'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  Maximize,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react'
import { DynamicWatermark } from './DynamicWatermark'

interface TrainingVideoPlayerProps {
  videoUrl: string
  lessonId: string
  onProgress: (pct: number) => void
  onComplete: () => void
  watermarkText?: string
}

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2]

export function TrainingVideoPlayer({
  videoUrl,
  lessonId,
  onProgress,
  onComplete,
  watermarkText,
}: TrainingVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  // Heartbeat every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        fetch(`/api/training/lessons/${lessonId}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTime }),
        }).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [lessonId, isPlaying, currentTime])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.duration) return

    const time = video.currentTime
    const dur = video.duration
    const pct = Math.round((time / dur) * 100)

    setCurrentTime(time)
    onProgress(pct)

    // Report progress
    fetch(`/api/training/lessons/${lessonId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoProgressPct: pct }),
    }).catch(() => {})

    // Complete at 90%
    if (pct >= 90 && !completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  }, [lessonId, onProgress, onComplete])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const time = Number(e.target.value)
    video.currentTime = time
    setCurrentTime(time)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const changeSpeed = (s: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = s
    setSpeed(s)
    setShowSpeedMenu(false)
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }

  return (
    <div ref={containerRef} className="group relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration)
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      {watermarkText && (
        <DynamicWatermark
          userName={watermarkText}
          userEmail=""
        />
      )}

      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="mb-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-600 accent-blue-500"
        />

        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          {/* Time */}
          <span className="text-xs text-zinc-300">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 text-xs text-white hover:text-blue-400 transition-colors"
            >
              <Settings className="h-4 w-4" />
              {speed}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-8 right-0 rounded-lg bg-zinc-800 p-1 shadow-lg">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`block w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
                      speed === s
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-colors">
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
