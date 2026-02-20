import { useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      e.preventDefault();
      setPullY(Math.min(delta * 0.45, THRESHOLD));
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD - 4 && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPullY(0);
    startY.current = null;
  }, [pullY, refreshing, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      style={{ overscrollBehaviorY: "none" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      <div
        style={{
          height: pullY,
          overflow: "hidden",
          transition: refreshing ? "none" : "height 0.2s ease",
        }}
        className="flex items-center justify-center"
      >
        {(pullY > 8 || refreshing) && (
          <div
            style={{ opacity: progress, transform: `scale(${0.6 + progress * 0.4}) rotate(${progress * 180}deg)` }}
            className="w-8 h-8 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center"
          >
            <Loader2
              className={`w-4 h-4 text-[#2D6A4F] ${refreshing ? "animate-spin" : ""}`}
            />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}