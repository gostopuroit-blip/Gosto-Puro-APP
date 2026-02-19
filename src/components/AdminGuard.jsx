import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminGuard({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Accesso negato</h1>
        <p className="text-sm text-gray-400 mb-6">Non hai i permessi per accedere a questa pagina.</p>
        <Link to={createPageUrl("Home")} className="text-[#2D6A4F] font-semibold text-sm">
          ← Torna alla Home
        </Link>
      </div>
    );
  }

  return children;
}