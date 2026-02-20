import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import RecipeCard from "@/components/RecipeCard";
import SectionHeader from "@/components/SectionHeader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Sparkles, ChevronRight } from "lucide-react";
import InstallPWABanner from "@/components/InstallPWABanner";

// Daily occasions with image-style food icons (SVG inline or Unicode with styling)
const dailyOccasions = [
{
  label: "Colazione",
  img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=120&h=120&fit=crop&crop=center"
},
{
  label: "Pranzo",
  img: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=120&h=120&fit=crop&crop=center"
},
{
  label: "Cena",
  img: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=120&h=120&fit=crop&crop=center"
},
{
  label: "Leggera",
  img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=120&h=120&fit=crop&crop=center"
},
{
  label: "Dolci",
  img: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=120&h=120&fit=crop&crop=center"
}];


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
{ label: "Cucina internazionale", icon: "🌍" }];


const lifestyleTags = [
{ label: "Fitness", icon: "💪" },
{ label: "Dolci zero zucchero", icon: "🍫" },
{ label: "Detox", icon: "🌿" },
{ label: "Ricette per diabetici", icon: "💚" },
{ label: "Alta proteica", icon: "🥩" },
{ label: "Low carb", icon: "🥬" }];


const occIcons = { "Colazione": "☕", "Pranzo": "🍝", "Cena": "🍷" };

export default function Home() {
  const [topRecipes, setTopRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);
  const cardWidth = 176 + 12;
  const [dailyNotif, setDailyNotif] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];
    const [recipes, user, notifs] = await Promise.all([
      base44.entities.Recipe.filter({ status: "pubblicata" }, "-numero_preparate", 10),
      base44.auth.me().catch(() => null),
      base44.entities.DailyNotification.filter({ date: today }, "-created_date", 1),
    ]);
    setTopRecipes(recipes);
    if (user?.full_name) setUserName(user.full_name.split(" ")[0]);
    if (user?.photo_url) setUserPhoto(user.photo_url);
    if (notifs?.length > 0) setDailyNotif(notifs[0]);
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
      </div>);

  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 bg-gradient-to-b from-[#F0F7F4] to-[#FAFAF8]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-[#D8EDD8] flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
            {userPhoto ?
            <img src={userPhoto} alt="Foto profilo" className="w-full h-full object-cover" /> :

            <span className="text-lg">👤</span>
            }
          </div>
          <div>
            <p className="text-[#2D6A4F] text-lg font-semibold leading-tight">
              {getGreeting()}{userName ? `, ${userName}` : ""}
            </p>
            <h1 className="text-gray-900 text-sm font-bold tracking-tight leading-tight">Cosa prepariamo oggi?

            </h1>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          Ricette organizzate per decidere senza perdere tempo
        </p>
      </div>

      {/* Daily Notification Banner */}
      {dailyNotif && (
        <div className="mx-5 mb-4 mt-2 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <p className="text-xs font-bold tracking-wide text-white/90">RICETTE DI OGGI</p>
          </div>
          <div className="space-y-2">
            {(dailyNotif.recipe_ids || []).map((id, i) => (
              <Link
                key={id}
                to={createPageUrl(`RecipeDetail?id=${id}`)}
                className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2 active:bg-white/20 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{occIcons[dailyNotif.occasions?.[i]] || "🍽️"}</span>
                  <div>
                    <p className="text-[11px] text-white/70 font-medium">{dailyNotif.occasions?.[i]}</p>
                    <p className="text-xs font-semibold text-white leading-tight">{dailyNotif.recipe_titles?.[i]}</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Daily Occasions — card style like image */}
      <div className="px-5 mt-2">
        <SectionHeader title="Occasioni del giorno" />
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
          {dailyOccasions.map((occ) =>
          <Link
            key={occ.label}
            to={createPageUrl(`Recipes?occasion=${encodeURIComponent(occ.label)}`)}
            className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">

              <div className="w-[78px] h-[78px] rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100">
                <img
                src={occ.img}
                alt={occ.label}
                className="w-full h-full object-cover" />

              </div>
              <span className="text-[11px] font-semibold text-gray-700 text-center">{occ.label}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Top Prepared — carousel with dots */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Le più preparate" linkPage="Recipes" />
        </div>
        <div className="relative">
          <div
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-2 scroll-smooth"
            onScroll={(e) => {
              const idx = Math.round(e.target.scrollLeft / cardWidth);
              setCarouselIndex(idx);
            }}
          >
            {topRecipes.map((recipe) =>
              <RecipeCard key={recipe.id} recipe={recipe} variant="compact" />
            )}
          </div>
          {/* Dots */}
          {topRecipes.length > 0 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {topRecipes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    carouselRef.current?.scrollTo({ left: i * cardWidth, behavior: "smooth" });
                    setCarouselIndex(i);
                  }}
                  className={`rounded-full transition-all duration-200 ${
                    i === carouselIndex
                      ? "w-4 h-1.5 bg-[#2D6A4F]"
                      : "w-1.5 h-1.5 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Special Occasions — carousel */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Occasioni Speciali" />
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-2">
          {specialOccasions.map((occ) =>
          <Link
            key={occ.label}
            to={createPageUrl(`Recipes?occasion=${encodeURIComponent(occ.label)}`)}
            className="flex-shrink-0 flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 w-[110px] hover:border-[#2D6A4F]/20 hover:shadow-md transition-all duration-200 active:scale-[0.97]">

              <span className="text-2xl">{occ.icon}</span>
              <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{occ.label}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Lifestyle — carousel */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Stile di Vita e Salute" />
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-2">
          {lifestyleTags.map((tag) =>
          <Link
            key={tag.label}
            to={createPageUrl(`Recipes?lifestyle=${encodeURIComponent(tag.label)}`)}
            className="flex-shrink-0 flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 w-[100px] hover:border-[#2D6A4F]/20 hover:shadow-md transition-all duration-200 active:scale-[0.97]">

              <span className="text-2xl">{tag.icon}</span>
              <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{tag.label}</span>
            </Link>
          )}
        </div>
      </div>
    </div>);

}