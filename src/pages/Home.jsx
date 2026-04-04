import { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import RecipeCard from "@/components/RecipeCard";
import SectionHeader from "@/components/SectionHeader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Sparkles, Lock, Crown } from "lucide-react";
import InstallPWABanner from "@/components/InstallPWABanner";
import EnableNotificationsBanner from "@/components/EnableNotificationsBanner";
import PullToRefresh from "@/components/PullToRefresh";
import { trackEvent } from "@/components/useAnalytics";

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
  const [userPlan, setUserPlan] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);
  const cardWidth = 188;
  const [dailyNotif, setDailyNotif] = useState(null);
  const FREE_OCCASIONS = ["Colazione", "Pranzo", "Cena"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
       const today = new Date().toISOString().split("T")[0];
       const [recipes, user, notifs, occasions] = await Promise.all([
       base44.entities.Recipe.filter({ status: "pubblicata" }, "-created_date", 10),
    base44.auth.me().catch(() => null),
    base44.entities.DailyNotification.filter({ date: today }, "-created_date", 1),
    base44.entities.RecipeOccasion.filter({ is_active: true }, "sort_order")]
    );

    setTopRecipes(recipes);
    setUser(user);
    if (user?.display_name || user?.full_name) setUserName((user.display_name || user.full_name).split(" ")[0]);
    if (user?.photo_url) setUserPhoto(user.photo_url);
    setUserPlan(user?.plan || "free");
    setUserRole(user?.role || null);
    if (notifs?.length > 0) setDailyNotif(notifs[0]);

    const occasionImages = {
      "Autunno": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/6d0a7ca9d_Autunno.png",
      "Con amici": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/2e95bf4e4_Conamici.png",
      "Dal mondo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/99343c725_Dalmondo.png",
      "Detox": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/7ac46318c_Detox.png",
      "Diabete": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/63205d254_Diabete.png",
      "Estate": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/029f21cd5_Estate.png",
      "Fit": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/d632e27da_Fit.png",
      "In famiglia": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/78bec7c3b_Infamiglia.png",
      "Inverno": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/d0924a4a2_Inverno.png",
      "Low carb": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/a31291345_Lowcarb.png",
      "Natale e Capodanno": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/057feccab_NataleeCapodanno.png",
      "Per due": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/90f0dad01_Perdue.png",
      "Primavera": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/42185c523_Primavera.png",
      "Proteiche": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/9f81f5cc8_Proteiche.png",
      "Senza zucchero": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/6c462ddda_Senzazucchero.png",
      "Veloci": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/de87766a6_Veloci.png",
      "Instagram": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/7913ab823_Instagram.png",
    };

    // Separate occasions by type
    const seenLabels = new Set();
    const deduped = (arr) => arr.filter((o) => {
      if (seenLabels.has(o.label)) return false;
      seenLabels.add(o.label);
      return true;
    });

    const special = deduped(occasions.filter((o) => o.tipo === "speciale")).map((o) => ({ label: o.label, icon: o.icon, img: occasionImages[o.label] }));
    const lifestyle = deduped(occasions.filter((o) => o.tipo === "stile_vita")).map((o) => ({ label: o.label, icon: o.icon, img: occasionImages[o.label], isLifestyle: true }));

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

  const isPremium = user?.plan === "premium" || user?.role === "admin" || user?.role === "premium" || user?.subscription_level === "premium";

  const FREE_CATEGORIES = ["Colazione", "Pranzo", "Cena"];
  const FREE_LIMIT_PER_CATEGORY = 9;

  const unlockedIds = useMemo(() => {
    if (isPremium) return null;
    const countPerCategory = {};
    const ids = new Set();
    for (const r of topRecipes) {
      const cat = r.category || "";
      const isInstagram = (r.occasions || []).includes("Instagram") || (r.lifestyle || []).includes("Instagram");
      if (isInstagram) continue;
      if (!FREE_CATEGORIES.includes(cat)) continue;
      if (!countPerCategory[cat]) countPerCategory[cat] = 0;
      if (countPerCategory[cat] < FREE_LIMIT_PER_CATEGORY) {
        ids.add(r.id);
        countPerCategory[cat]++;
      }
    }
    return ids;
  }, [topRecipes, isPremium]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>);

  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="pb-4 overflow-x-hidden">
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
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-gray-900 dark:text-gray-100 text-sm font-bold tracking-tight leading-tight">Cosa prepariamo oggi?</h1>
                {userRole === "admin" ? (
                  <span className="text-[10px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded-lg">⭐ Admin</span>
                ) : userPlan === "premium" ? (
                  <span className="text-[10px] font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-lg">👑 Premium</span>
                ) : (
                  <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-lg">Base</span>
                )}
              </div>
            </div>
        </div>
        <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
          Ricette organizzate per decidere senza perdere tempo
        </p>
      </div>

      {/* Notifications banner — shown to PWA users who haven't enabled yet */}
      <EnableNotificationsBanner />

      {/* Daily Message */}
        <div className="mx-5 mb-4 mt-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#2D6A4F] flex-shrink-0" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Ogni giorno nuove ricette ti aspettano!</p>
        </div>


      {/* Daily Occasions — card style like image */}
      <div className="px-5 mt-2">
        <SectionHeader title="Occasioni del giorno" />
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
          {dailyOccasions.map((occ) => (
            <Link
              key={occ.label}
              to={createPageUrl(`Recipes?occasion=${encodeURIComponent(occ.label)}`)}
              onClick={() => trackEvent("occasion_click", { occasion_label: occ.label })}
              className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">
              <div className="w-[78px] h-[78px] rounded-2xl overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38]">
                <img src={occ.img} alt={occ.label} className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 text-center">{occ.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Prepared — carousel with large cards */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Le più preparate" linkPage="Recipes" />
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-2">
          {topRecipes.map((recipe) => {
            const isLocked = !isPremium;
            if (isLocked) {
              return (
                <a key={recipe.id} href="https://gostopuro.it/upgrade/" target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group" style={{ width: "200px", height: "250px" }}>
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#111] w-full h-full">
                    <img
                      src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400"}
                      alt={recipe.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover blur-sm opacity-40"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </a>
              );
            }
            return (
              <Link key={recipe.id} to={createPageUrl(`RecipeDetail?id=${recipe.id}`)} className="flex-shrink-0 group active:scale-95 transition-transform duration-150 relative rounded-2xl overflow-hidden" style={{ width: "200px", height: "250px" }}>
                <img
                  src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400"}
                  alt={recipe.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-3">
                  <p className="text-white font-semibold text-sm line-clamp-2 mb-1">{recipe.title}</p>
                  <p className="text-white/80 text-xs">⏱️ {recipe.prep_time || "–"} min {recipe.calories ? `• ${recipe.calories} kcal` : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Special Occasions — carousel */}
      <div className="mt-8 px-5">
        <SectionHeader title="Occasioni Speciali" />
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2 mt-3">
          {specialOccasions.map((occ) => (
            <Link key={occ.label} to={createPageUrl(`Recipes?occasion=${encodeURIComponent(occ.label)}`)}
              onClick={() => trackEvent("occasion_click", { occasion_label: occ.label })}
              className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">
              <div className="w-[78px] h-[78px] rounded-2xl overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38] flex items-center justify-center">
                {occ.img ? <img src={occ.img} alt={occ.label} className="w-full h-full object-cover" /> : <span className="text-3xl">{occ.icon}</span>}
              </div>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 text-center">{occ.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Lifestyle — carousel */}
      <div className="mt-8 px-5">
        <SectionHeader title="Stile di Vita e Salute" />
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2 mt-3">
          {lifestyleTags.map((tag) => (
            <Link key={tag.label} to={createPageUrl(`Recipes?occasion=${encodeURIComponent(tag.label)}`)}
              onClick={() => trackEvent("occasion_click", { occasion_label: tag.label })}
              className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">
              <div className="w-[78px] h-[78px] rounded-2xl overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38] flex items-center justify-center">
                {tag.img ? <img src={tag.img} alt={tag.label} className="w-full h-full object-cover" /> : <span className="text-3xl">{tag.icon}</span>}
              </div>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 text-center">{tag.label}</span>
            </Link>
          ))}
        </div>
      </div>
      </div>
    </PullToRefresh>);

}