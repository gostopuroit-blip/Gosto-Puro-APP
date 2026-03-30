import { useState, useRef } from "react";
import { X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VideoLightbox({ videoUrl, onClose }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Video player */}
          <div className="relative w-full h-full flex items-center justify-center group">
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
            />

            {/* Play/Pause overlay */}
            <button
              onClick={handlePlayPause}
              className="absolute flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full p-4 transition opacity-0 group-hover:opacity-100"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress bar */}
              <div
                onClick={handleProgressClick}
                className="w-full h-1 bg-gray-600 rounded-full cursor-pointer hover:h-1.5 transition mb-3"
              >
                <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleMuteToggle}
                  className="text-white hover:opacity-70 transition p-2"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}