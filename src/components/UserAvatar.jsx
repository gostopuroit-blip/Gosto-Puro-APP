export default function UserAvatar({ photoUrl, userName, size = "md" }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  const initials = getInitials(userName);
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}