export default function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden animate-pulse">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#2A2A2A] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-[#2A2A2A] rounded w-1/3" />
              <div className="h-2 bg-gray-100 dark:bg-[#222] rounded w-1/4" />
            </div>
          </div>
          {/* Image placeholder */}
          {i !== 3 && (
            <div className="w-full aspect-video bg-gray-100 dark:bg-[#222]" />
          )}
          {/* Content */}
          <div className="px-4 py-3 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-[#2A2A2A] rounded w-full" />
            <div className="h-3 bg-gray-100 dark:bg-[#222] rounded w-3/4" />
          </div>
          {/* Actions */}
          <div className="flex gap-4 px-4 py-3">
            <div className="h-5 w-12 bg-gray-100 dark:bg-[#222] rounded" />
            <div className="h-5 w-12 bg-gray-100 dark:bg-[#222] rounded" />
            <div className="h-5 w-8 bg-gray-100 dark:bg-[#222] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}