import { X, Crown, Star, Check } from "lucide-react";

export default function PremiumUpgradeModal({ onClose, reason = "pubblicare" }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 pb-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1">
          Passa a Premium per {reason} 🌟
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">
          Sblocca tutte le funzionalità della Comunità
        </p>

        {/* Benefits */}
        <div className="space-y-2.5 mb-6">
          {[
            "Pubblica post, stories e sondaggi",
            "Accedi a tutti i contenuti premium",
            "Badge ⭐ Premium visibile nel feed",
            "Ricette esclusive illimitate",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{item}</p>
            </div>
          ))}
        </div>

        <a
          href="https://pay.hotmart.com/L104095305F?off=sk18i3wx&checkoutMode=10"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-3.5 rounded-2xl text-base shadow-lg hover:opacity-90 transition"
        >
          <Star className="w-5 h-5" />
          Passa a Premium
        </a>

        <button
          onClick={onClose}
          className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2 transition"
        >
          Non ora
        </button>
      </div>
    </div>
  );
}