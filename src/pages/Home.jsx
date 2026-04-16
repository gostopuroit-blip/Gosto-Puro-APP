import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SectionHeader from "@/components/SectionHeader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Sparkles, Lock, Crown } from "lucide-react";
import InstallPWABanner from "@/components/InstallPWABanner";
import PullToRefresh from "@/components/PullToRefresh";
import { trackEvent } from "@/components/useAnalytics";
import DietaryBanner from "@/components/DietaryBanner";

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
  const [gostoPuroProducts, setGostoPuroProducts] = useState([]);
  const [specialOccasions, setSpecialOccasions] = useState([]);
  const [lifestyleTags, setLifestyleTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const [userPlan, setUserPlan] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [dailyNotif, setDailyNotif] = useState(null);
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
       const today = new Date().toISOString().split("T")[0];
       const user = await base44.auth.me().catch(() => null);
       await new Promise(r => setTimeout(r, 100));
       
       const [notifs, occasions, recipes, products] = await Promise.all([
    base44.entities.DailyNotification.filter({ date: today }, "-created_date", 1),
    base44.entities.RecipeOccasion.filter({ show_in_home: true }, "sort_order"),
    base44.entities.Recipe.filter({ status: "pubblicata" }, "-created_date", 10),
    base44.entities.GostoPuroProduct.filter({ is_active: true }, "-created_date"),
    ]);

    setTopRecipes(recipes);
    setGostoPuroProducts(products);
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

  const isPremium = user?.role === "admin" || user?.role === "premium" || user?.role === "basic" || user?.plan === "premium" || user?.plan === "basic" || user?.is_expert === true;

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

      {/* Dietary Banner */}
      <DietaryBanner userName={userName} dietaryTags={user?.dietary_tags_profile} />

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
              to={`/OccasionRecipes?occasion=${encodeURIComponent(occ.label)}`}
              onClick={() => trackEvent("occasion_click", { occasion_label: occ.label })}
              className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">
              <div style={{ width: 100, height: 100, minWidth: 100, maxWidth: 100, borderRadius: 14 }} className="overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38]">
                <img src={occ.img} alt={occ.label} className="w-full h-full object-cover" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center", maxWidth: 100, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3 }} className="text-gray-700 dark:text-gray-300">{occ.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Prodotti Gosto Puro */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Prodotti Gosto Puro" />
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-2">
          {lifestyleTags.map((tag) => {
            const isProductAlready = gostoPuroProducts.some(p => p.occasioni && p.occasioni.includes(tag.label));
            if (isProductAlready) return null;
            return (
              <Link key={tag.label} to={`/OccasionRecipes?occasion=${encodeURIComponent(tag.label)}`}
                onClick={() => trackEvent("occasion_click", { occasion_label: tag.label })}
                className="flex-shrink-0 group active:scale-95 transition-transform duration-150 relative rounded-2xl overflow-hidden" style={{ width: "200px", height: "250px" }}>
                {tag.img ? (
                  <img src={tag.img} alt={tag.label} loading="lazy" decoding="async" style={{ width: "200px", height: "250px", objectFit: "cover", display: "block", flexShrink: 0 }} className="group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div style={{ width: "200px", height: "250px" }} className="bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center">
                    <span className="text-5xl">{tag.icon}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-3">
                  <p className="text-white font-semibold text-sm line-clamp-2">{tag.label}</p>
                </div>
              </Link>
            );
          })}
          {gostoPuroProducts.map((product) => {
            const isUnlocked = user?.role === "admin" || product.is_free || (user?.purchased_products || []).includes(product.slug);
            const hasOccasion = product.occasioni && product.occasioni.length > 0;
            const canNavigate = hasOccasion && product.image_url;
            
            return canNavigate ? (
              <Link 
                key={product.id} 
                to={`/OccasionRecipes?occasion=${encodeURIComponent(product.occasioni[0])}`}
                className="flex-shrink-0 group active:scale-95 transition-transform duration-150 relative rounded-2xl overflow-hidden" 
                style={{ width: "200px", height: "250px" }}
              >
                {product.image_url && (
                  <img src={product.image_url} alt={product.nome} loading="lazy" decoding="async" style={{ width: "200px", height: "250px", objectFit: "cover", display: "block", flexShrink: 0 }} className="group-hover:scale-105 transition-transform duration-300" />
                )}
                {!isUnlocked && (
                  <div className="absolute top-2 right-2 w-7 h-7 bg-amber-50 rounded-xl flex items-center justify-center shadow">
                    <Lock className="w-4 h-4 text-amber-500" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-3">
                  <p className="text-white font-semibold text-sm line-clamp-2">{product.nome}</p>
                </div>
              </Link>
            ) : (
              <div key={product.id} className="flex-shrink-0 group active:scale-95 transition-transform duration-150 relative rounded-2xl overflow-hidden cursor-not-allowed" style={{ width: "200px", height: "250px" }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.nome} loading="lazy" decoding="async" style={{ width: "200px", height: "250px", objectFit: "cover", display: "block", flexShrink: 0, opacity: 0.4 }} className="grayscale" />
                ) : (
                  <div style={{ width: "200px", height: "250px" }} className="bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-lg">Em breve</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-3">
                  <p className="text-white font-semibold text-sm line-clamp-2">{product.nome}</p>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Bonus */}
      <div className="px-5 mt-8">
        <SectionHeader title="Bonus" />
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2 mt-2">
          {[
            { label: "Bonus 1", img: null },
            { label: "Bonus 2", img: null },
            { label: "Bonus 3", img: null },
            { label: "Bonus 4", img: null },
          ].map((bonus) => (
            <div key={bonus.label} className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150 cursor-pointer">
              <div style={{ width: 100, height: 100, minWidth: 100, maxWidth: 100, borderRadius: 14 }} className="overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38]">
                {bonus.img ? (
                  <img src={bonus.img} alt={bonus.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center">
                    <span className="text-3xl">🎁</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center", maxWidth: 100, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3 }} className="text-gray-700 dark:text-gray-300">{bonus.label}</span>
            </div>
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
            if (!isPremium) {
              return (
                <a key={recipe.id} href="https://gostopuro.it/upgrade/" target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group relative rounded-2xl overflow-hidden" style={{ width: "200px", height: "250px" }}>
                  <img src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400"} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover blur-sm opacity-40" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Lock className="w-7 h-7 text-white drop-shadow-lg" />
                    <span className="bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl">Passa a Premium</span>
                  </div>
                </a>
              );
            }
            return (
              <Link key={recipe.id} to={createPageUrl(`RecipeDetail?id=${recipe.id}`)} className="flex-shrink-0 group active:scale-95 transition-transform duration-150 relative rounded-2xl overflow-hidden" style={{ width: "200px", height: "250px" }}>
                <img src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400"} alt={recipe.title} loading="lazy" decoding="async" style={{ width: "200px", height: "250px", objectFit: "cover", display: "block", flexShrink: 0 }} className="group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-3">
                  <p className="text-white font-semibold text-sm line-clamp-2 mb-1">{recipe.title}</p>
                  <p className="text-white/80 text-xs">⏱️ {recipe.prep_time || "–"} min {recipe.calories ? `• ${recipe.calories} kcal` : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>


      </div>
    </PullToRefresh>);

}