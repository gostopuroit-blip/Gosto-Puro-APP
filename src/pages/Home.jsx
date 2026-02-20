import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import RecipeCard from "@/components/RecipeCard";
import SectionHeader from "@/components/SectionHeader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Sparkles, ChevronRight } from "lucide-react";
import InstallPWABanner from "@/components/InstallPWABanner";
import PullToRefresh from "@/components/PullToRefresh";

// Daily occasions with image-style food icons (SVG inline or Unicode with styling)
const dailyOccasions = [
{
  label: "Colazione",
  img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/187a4172e_Colazione.png"
},
{
  label: "Pranzo",
  img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/f3bc57429_Pranzo.png"
},
{
  label: "Cena",
  img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/d7674cdee_Cena.png"
},
{
  label: "Leggera",
  img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/8ea268711_Insalata.png"
},
{
  label: "Dolci",
  img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/b1d974f23_Dolci.png"
}];

const occIcons = { "Colazione": "☕", "Pranzo": "🍝", "Cena": "🍷" };

export default function Home() {
  const [topRecipes, setTopRecipes] = useState([]);
  const [specialOccasions, setSpecialOccasions] = useState([]);
  const [lifestyleTags, setLifestyleTags] = useState([]);
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
    const [recipes, user, notifs, occasions] = await Promise.all([
    base44.entities.Recipe.filter({ status: "pubblicata" }, "-numero_preparate", 10),
    base44.auth.me().catch(() => null),
    base44.entities.DailyNotification.filter({ date: today }, "-created_date", 1),
    base44.entities.RecipeOccasion.filter({ is_active: true }, "sort_order")]
    );

    setTopRecipes(recipes);
    if (user?.full_name) setUserName(user.full_name.split(" ")[0]);
    if (user?.photo_url) setUserPhoto(user.photo_url);
    if (notifs?.length > 0) setDailyNotif(notifs[0]);

    // Separate occasions by type
    const special = occasions.filter((o) => o.tipo === "speciale").map((o) => ({ label: o.label, icon: o.icon }));
    const lifestyle = occasions.filter((o) => o.tipo === "stile_vita").map((o) => ({ label: o.label, icon: o.icon }));

    setSpecialOccasions(special);
    setLifestyleTags(lifestyle);
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
    <PullToRefresh onRefresh={loadData}>
      <div className="pb-4">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-[#D8EDD8] dark:bg-[#2D4A38] flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-[#1A2B20] shadow-sm">
            {userPhoto ?
              <img src={userPhoto} alt="Foto profilo" className="w-full h-full object-cover" /> :

              <span className="text-lg">👤</span>
              }
          </div>
          <div>
            <p className="text-[#2D6A4F] dark:text-[#40916C] text-lg font-semibold leading-tight">
              {getGreeting()}{userName ? `, ${userName}` : ""}
            </p>
            <h1 className="text-gray-900 dark:text-gray-100 text-sm font-bold tracking-tight leading-tight">Cosa prepariamo oggi?

            </h1>
          </div>
        </div>
        <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
          Ricette organizzate per decidere senza perdere tempo
        </p>
      </div>

      {/* PWA Install Banner */}
      <InstallPWABanner />

      {/* Daily Notification Banner */}
      {dailyNotif &&
        <div className="mx-5 mb-4 mt-2 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <p className="text-xs font-bold tracking-wide text-white/90">RICETTE DI OGGI</p>
          </div>
          <div className="space-y-2">
            {(dailyNotif.recipe_ids || []).map((id, i) =>
            <Link
              key={id}
              to={createPageUrl(`RecipeDetail?id=${id}`)}
              className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2 active:bg-white/20 transition-all">

                <div className="flex items-center gap-2">
                  <span className="text-sm">{occIcons[dailyNotif.occasions?.[i]] || "🍽️"}</span>
                  <div>
                    <p className="text-[13px] text-white/70 font-medium">{dailyNotif.occasions?.[i]}</p>
                    <p className="text-[13px] font-semibold text-white leading-tight">{dailyNotif.recipe_titles?.[i]}</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />
              </Link>
            )}
          </div>
        </div>
        }

      {/* Daily Occasions — card style like image */}
      <div className="px-5 mt-2">
        <SectionHeader title="Occasioni del giorno" />
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
          {dailyOccasions.map((occ) =>
            <Link
              key={occ.label}
              to={createPageUrl(`Recipes?occasion=${encodeURIComponent(occ.label)}`)}
              className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">

              <div className="w-[78px] h-[78px] rounded-2xl overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38]">
                <img
                  src={occ.img}
                  alt={occ.label}
                  className="w-full h-full object-cover" />

              </div>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 text-center">{occ.label}</span>
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
              }}>

            {topRecipes.map((recipe) =>
              <RecipeCard key={recipe.id} recipe={recipe} variant="compact" />
              )}
          </div>
          {/* Dots */}
          {topRecipes.length > 0 &&
            <div className="flex justify-center gap-1.5 mt-3">
              {topRecipes.map((_, i) =>
              <button
                key={i}
                onClick={() => {
                  carouselRef.current?.scrollTo({ left: i * cardWidth, behavior: "smooth" });
                  setCarouselIndex(i);
                }}
                className={`rounded-full transition-all duration-200 ${
                i === carouselIndex ?
                "w-4 h-1.5 bg-[#2D6A4F] dark:bg-[#40916C]" :
                "w-1.5 h-1.5 bg-gray-300 dark:bg-[#2D4A38]"}`
                } />

              )}
            </div>
            }
        </div>
      </div>

      {/* Special Occasions — carousel */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Occasioni Speciali" />
        </div>
        <div className="px-10 flex gap-3 overflow-x-auto hide-scrollbar -mx-5">
          {specialOccasions.map((occ) =>
            <Link
              key={occ.label}
              to={createPageUrl(`Recipes?occasion=${encodeURIComponent(occ.label)}`)} className="px-1 flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">


              <div className="w-[78px] h-[78px] rounded-2xl overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38] flex items-center justify-center">
                <span className="text-3xl">{occ.icon}</span>
              </div>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 text-center">{occ.label}</span>
            </Link>
            )}
        </div>
      </div>

      {/* Lifestyle — carousel */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Stile di Vita e Salute" />
        </div>
        <div className="px-10 flex gap-3 overflow-x-auto hide-scrollbar -mx-5">
          {lifestyleTags.map((tag) =>
            <Link
              key={tag.label}
              to={createPageUrl(`Recipes?lifestyle=${encodeURIComponent(tag.label)}`)}
              className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">

              <div className="w-[78px] h-[78px] rounded-2xl overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38] flex items-center justify-center">
                <span className="text-3xl">{tag.icon}</span>
              </div>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 text-center">{tag.label}</span>
            </Link>
            )}
        </div>
      </div>
      </div>
    </PullToRefresh>);

}