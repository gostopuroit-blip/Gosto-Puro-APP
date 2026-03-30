import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

export default function VideoPlayer({ src, autoplay = true, muted = true, onFullscreen, showIcon = true }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(muted);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Intersection Observer for autoplay/pause
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting && autoplay) {
          videoRef.current?.play();
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [autoplay]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percent);
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * videoRef.current.duration;
    }
  };

  return (
    <div className="relative w-full bg-black group">
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoplay}
        muted={muted}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-full object-cover"
      />

      {/* Video icon indicator */}
      {showIcon && (
        <div className="absolute top-2 right-2 bg-black/60 rounded-full p-2">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm10 3V7a1 1 0 10-2 0v2H7a1 1 0 100 2h3v2a1 1 0 102 0v-2h3a1 1 0 100-2h-3z" />
          </svg>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/30">
        <button
          onClick={handlePlayPause}
          className="bg-white/80 hover:bg-white text-black rounded-full p-3 transition"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-black/80 to-transparent p-3">
        {/* Progress bar */}
        <div
          onClick={handleProgressClick}
          className="w-full h-1 bg-gray-600 rounded-full cursor-pointer hover:h-1.5 transition group/bar mb-2"
        >
          <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleMuteToggle}
              className="text-white hover:opacity-70 transition p-1"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="text-white hover:opacity-70 transition p-1"
            >
              <Maximize className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}