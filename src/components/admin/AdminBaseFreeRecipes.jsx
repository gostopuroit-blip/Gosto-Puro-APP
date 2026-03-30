import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Check, AlertCircle } from "lucide-react";

export default function AdminBaseFreeRecipes() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleUpdateIds = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await base44.functions.invoke("updateBaseFreeUnlockedIds", {});
      setStatus({ type: "success", message: "IDs aggiornati con successo!" });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Errore nell'aggiornamento" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Ricette Base Gratuite</h2>
        <p className="text-sm text-gray-500">Aggiorna gli ID delle 9 ricette libere per ogni occasione/stile_vita</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900">
          Questo aggiorna il registro AppConfig <code className="bg-blue-100 px-1 py-0.5 rounded">base_free_unlocked_ids</code> con la lista fissa di IDs per ogni occasione.
        </p>
      </div>

      {status && (
        <div className={`flex items-start gap-3 p-4 rounded-xl ${
          status.type === "success" 
            ? "bg-green-50 border border-green-200" 
            : "bg-red-50 border border-red-200"
        }`}>
          {status.type === "success" ? (
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${status.type === "success" ? "text-green-900" : "text-red-900"}`}>
            {status.message}
          </p>
        </div>
      )}

      <button
        onClick={handleUpdateIds}
        disabled={loading}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Aggiornamento..." : "Aggiorna IDs Ricette Base"}
      </button>

      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
        <p className="font-semibold text-gray-900">Occasioni speciale incluse:</p>
        <p>Instagram, Veloci, Inverno, Primavera, Estate, Autunno, Capodanno, Natale, Dal mondo, Leggera, Dolci</p>
        <p className="font-semibold text-gray-900 mt-3">Stile_vita inclusi:</p>
        <p>Low carb, Diabete, Fitness, Detox, Vegan, Vegetariano</p>
      </div>
    </div>
  );
}