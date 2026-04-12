import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImageLightbox({ images, startIndex = 0, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [touchStart, setTouchStart] = useState(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const lastPinchDistance = useRef(null);

  const currentImage = images[currentIdx];
  const isMultiple = images.length > 1;

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleNext = () => {
    if (currentIdx < images.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setZoom(1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setZoom(1);
    }
  };

  // Swipe detection
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStart(null);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.2, 3));
    } else {
      setZoom((z) => Math.max(z - 0.2, 1));
    }
    e.preventDefault();
  };

  // Pinch zoom
  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDistance.current) {
        const scale = distance / lastPinchDistance.current;
        setZoom((z) => Math.max(1, Math.min(z * scale, 3)));
      }
      lastPinchDistance.current = distance;
    } else {
      lastPinchDistance.current = null;
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
        ref={containerRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Main image container */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image */}
          <motion.img
            key={currentIdx}
            src={currentImage}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            ref={imageRef}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              objectFit: "contain",
              scale: zoom,
            }}
            className="cursor-grab active:cursor-grabbing"
            draggable={false}
          />
        </motion.div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation arrows - only show if multiple images */}
        {isMultiple && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              disabled={currentIdx === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-full p-2 transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              disabled={currentIdx === images.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-full p-2 transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Position indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-medium">
              {currentIdx + 1} / {images.length}
            </div>
          </>
        )}

        {/* Zoom level indicator when zoomed */}
        {zoom > 1 && (
          <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}