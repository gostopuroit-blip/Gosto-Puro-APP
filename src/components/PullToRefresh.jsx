import { useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) return;
    e.preventDefault();
    setPullDistance(Math.min(dy * 0.5, THRESHOLD + 20));
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, refreshing, onRefresh]);

  const indicatorHeight = refreshing ? THRESHOLD : pullDistance;
  const ready = pullDistance >= THRESHOLD;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: indicatorHeight }}
      >
        {(indicatorHeight > 20) && (
          refreshing ? (
            <Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin" />
          ) : (
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${ready ? "border-[#2D6A4F] bg-[#2D6A4F]/10" : "border-gray-300"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${ready ? "bg-[#2D6A4F]" : "bg-gray-300"}`} />
            </div>
          )
        )}
      </div>
      {children}
    </div>
  );
}