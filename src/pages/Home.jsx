import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import RecipeCard from "@/components/RecipeCard";
import OccasionChip from "@/components/OccasionChip";
import SectionHeader from "@/components/SectionHeader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";

const dailyOccasions = ["Colazione", "Pranzo", "Cena", "Leggera", "Dolce sano"];

const specialOccasions = [
  { label: "Pranzo in famiglia", icon: "👨‍👩‍👧‍👦" },
  { label: "Cena speciale per due", icon: "💑" },
  { label: "Ricette per ricevere gli amici", icon: "🎉" },
  { label: "Natale e Capodanno", icon: "🎄" },
  { label: "Ricette estive", icon: "☀️" },
  { label: "Ricette autunnali", icon: "🍂" },
  { label: "Ricette invernali", icon: "❄️" },
  { label: "Ricette di primavera", icon: "🌸" },
  { label: "Ricette per le giornate frenetiche", icon: "⚡" },
  { label: "Cucina internazionale", icon: "🌍" },
];

const lifestyleTags = [
  { label: "Fitness", icon: "💪" },
  { label: "Dolci zero zucchero", icon: "🍫" },
  { label: "Detox", icon: "🌿" },
  { label: "Ricette per diabetici", icon: "💚" },
  { label: "Alta proteica", icon: "🥩" },
  { label: "Low carb", icon: "🥬" },
];

export default function Home() {
  const [topRecipes, setTopRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [recipes, user] = await Promise.all([
      base44.entities.Recipe.list("-numero_preparate", 10),
      base44.auth.me().catch(() => null),
    ]);
    setTopRecipes(recipes);
    if (user?.full_name) {
      setUserName(user.full_name.split(" ")[0]);
    }
    if (user?.photo_url) {
      setUserPhoto(user.photo_url);
    }
    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 bg-gradient-to-b from-[#F0F7F4] to-[#FAFAF8]">
        <div className="flex items-center gap-3.5">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full overflow-hidden bg-[#D8EDD8] flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
            {userPhoto ? (
              <img src={userPhoto} alt="Foto profilo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          {/* Text */}
          <div>
            <p className="text-[13px] text-[#2D6A4F] font-semibold leading-tight">
              {getGreeting()}{userName ? `, ${userName}` : ""}
            </p>
            <h1 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">
              Cosa prepariamo oggi?
            </h1>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          Ricette organizzate per decidere senza perdere tempo
        </p>
      </div>

      {/* Daily Occasions */}
      <div className="px-5 mt-2">
        <SectionHeader title="Occasioni del giorno" />
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
          {dailyOccasions.map((occ) => (
            <OccasionChip key={occ} label={occ} isDaily />
          ))}
        </div>
      </div>

      {/* Top Prepared - between daily and special */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Le più preparate" linkPage="Recipes" />
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-2">
          {topRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} variant="compact" />
          ))}
        </div>
      </div>

      {/* Special Occasions */}
      <div className="px-5 mt-8">
        <SectionHeader title="Occasioni Speciali" />
        <div className="grid grid-cols-2 gap-2.5">
          {specialOccasions.map((occ) => (
            <Link
              key={occ.label}
              to={createPageUrl(`Recipes?occasion=${encodeURIComponent(occ.label)}`)}
              className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50 hover:border-[#2D6A4F]/20 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F0F7F4] flex items-center justify-center text-base flex-shrink-0">
                {occ.icon}
              </div>
              <span className="text-[12px] font-semibold text-gray-800 leading-tight">{occ.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Lifestyle */}
      <div className="px-5 mt-8">
        <SectionHeader title="Stile di Vita e Salute" />
        <div className="grid grid-cols-2 gap-2.5">
          {lifestyleTags.map((tag) => (
            <Link
              key={tag.label}
              to={createPageUrl(`Recipes?lifestyle=${encodeURIComponent(tag.label)}`)}
              className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50 hover:border-[#2D6A4F]/20 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F0F7F4] flex items-center justify-center text-base flex-shrink-0">
                {tag.icon}
              </div>
              <span className="text-[12px] font-semibold text-gray-800 leading-tight">{tag.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}