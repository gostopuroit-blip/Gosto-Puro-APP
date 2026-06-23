import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChefHat, ChevronRight } from "lucide-react";

// slug do produto -> nome curto e bonito (para mostrar "hai già sbloccato …").
export const SLUG_NAMES = {
  fitness_pratiche: "275 Ricette Fitness",
  diabetici: "365 Ricette Diabete",
  dolci_senza_colpa: "99 Dolci Senza Colpa",
  piatti_settimanali_air_fryer: "Meal Prep Air Fryer",
  menu_brucia_grassi: "Menu Brucia-Grassi",
  reset_anti_gonfiore: "Reset Anti-Gonfiore",
  ricette_whey: "Ricette con Whey",
  gelati_artigianali: "Gelati Artigianali",
  insalate_barattolo: "Insalate in Barattolo",
  menopausa: "Piano Menopausa",
  "504_ricette_collezione": "Collezione Gosto Puro",
  pane_senza_glutine: "Pane Senza Glutine",
  cene_friggitrice: "Cene in Air Fryer",
  low_carb: "Low Carb",
  ricette_detox: "Detox",
  ricette_sane_35: "150 Ricette Sane",
  ricette_congelare: "Facili da Congelare",
  cucina_senza_tempo: "Cucina Senza Tempo",
  senza_zucchero: "Senza Zucchero",
};

// Primeiro nome do usuário (display_name/full_name ou derivado do e-mail).
export function firstName(user) {
  const n = (user?.display_name || user?.full_name || "").trim();
  if (n) return n.split(/\s+/)[0];
  const e = user?.email || "";
  if (e) {
    const base = e.split("@")[0].split(/[._\-+]/)[0];
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
  }
  return "";
}

// Monta a mensagem personalizada. Retorna null para premium completo (não mostra nada).
export function premiumPitch(user) {
  if (!user || user.is_full_premium) return null;
  const name = firstName(user);
  const greeting = name ? `Ciao ${name} 👋` : "Ciao 👋";
  const purchased = Array.isArray(user.purchased_products) ? user.purchased_products : [];
  if (purchased.length > 0) {
    const owned = purchased.map((s) => SLUG_NAMES[s] || s);
    return {
      variant: "partial",
      name, greeting, owned,
      line: `Hai già sbloccato ${owned.length} ${owned.length === 1 ? "collezione" : "collezioni"} — ti aspettano ancora oltre 4.000 ricette.`,
    };
  }
  return {
    variant: "free",
    name, greeting, owned: [],
    line: "Versione Free: 40 ricette sbloccate su oltre 4.000.",
  };
}

// Banner discreto e elegante, mostrado no topo de cada página (via Layout).
// Aparece para Free e para quem comprou 1+ coleções; NUNCA para premium completo.
// Fixo (sem botão de fechar).
export default function PremiumBanner({ user, className = "" }) {
  const pitch = premiumPitch(user);
  if (!pitch) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative mx-4 mt-3 mb-1 rounded-2xl overflow-hidden ${className}`}
    >
      <style>{`@keyframes gpShimmer{0%{transform:translateX(-130%)}60%,100%{transform:translateX(240%)}}`}</style>
      <div className="relative bg-gradient-to-br from-[#0c2117] via-[#10301f] to-[#15402a] px-3.5 py-3 flex items-center gap-3">
        <div className="pointer-events-none absolute -top-8 -right-6 w-24 h-24 rounded-full bg-[#D4A846]/20 blur-2xl" />
        <div className="w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center flex-shrink-0">
          <ChefHat className="w-4 h-4 text-[#F3B14A]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-[13px] font-bold leading-tight truncate">{pitch.greeting}</p>
          <p className="text-white/70 text-[11px] leading-tight mt-0.5 truncate">{pitch.line}</p>
        </div>
        <Link
          to="/Premium"
          data-track="premium_banner"
          className="relative flex-shrink-0 inline-flex items-center gap-0.5 bg-gradient-to-r from-[#F3B14A] to-[#E0683A] text-white text-[12.5px] font-bold pl-3.5 pr-2.5 py-2 rounded-xl shadow-lg shadow-[#E0683A]/30 active:scale-95 transition-transform overflow-hidden"
        >
          <span className="relative z-10">Sblocca</span>
          <ChevronRight className="w-3.5 h-3.5 relative z-10" />
          <span
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            style={{ animation: "gpShimmer 2.8s ease-in-out infinite" }}
          />
        </Link>
      </div>
    </motion.div>
  );
}
