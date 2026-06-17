import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SectionHeader from "@/components/SectionHeader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Sparkles } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import { trackEvent } from "@/components/useAnalytics";
import DietaryBanner from "@/components/DietaryBanner";
import Survey from "@/components/Survey";
import EnableNotificationsBanner from "@/components/EnableNotificationsBanner";


// Aliases: produto slug occasion → receitas podem ter o label antigo
const OCCASION_ALIASES = {
  "365 Ricette Deliziose per Diabetici": ["Diabete", "365 Ricette Deliziose per Diabetici"],
  "275 Ricette Fitness Pratiche ed Economiche": ["Fit", "275 Ricette Fitness Pratiche ed Economiche"],
};

function expandOccasions(occasions) {
  const expanded = [...occasions];
  occasions.forEach(occ => {
    const aliases = OCCASION_ALIASES[occ];
    if (aliases) aliases.forEach(a => { if (!expanded.includes(a)) expanded.push(a); });
  });
  return expanded;
}

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
}];

const occIcons = { "Colazione": "☕", "Pranzo": "🍝", "Cena": "🍷" };

export default function Home() {
  const [topRecipes, setTopRecipes] = useState([]);
  const [freeRecipes, setFreeRecipes] = useState([]);
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

  const OCCASIONS_LIST = [
    "Colazione", "Pranzo", "Cena", "Leggera", "Dolci",
    "In famiglia", "Per due", "Con amici", "Feste",
    "Estate", "Autunno", "Inverno", "Primavera",
    "Veloci", "Instagram", "Natale", "Capodanno", "Dal mondo",
    "275 Ricette Fitness Pratiche ed Economiche",
    "Senza zucchero", "Detox",
    "365 Ricette Deliziose per Diabetici",
    "Proteiche", "Low carb",
    "Friggitrice ad Aria",
    "Facili da Congelare",
    "Ricette Sane"
  ];

  const loadData = async () => {
       const today = new Date().toISOString().split("T")[0];
       const user = await base44.auth.me().catch(() => null);
       await new Promise(r => setTimeout(r, 100));
       
       const { supabase } = await import("@/lib/supabase");
       const [notifs, recipesRes, products] = await Promise.all([
    base44.entities.DailyNotification.filter({ date: today }, "-created_date", 1),
    // Ordina per più preparate, ma a parità (es. tutte 0) mostra le più recenti
    supabase
      .from("recipes")
      .select("id,title,image_url,prep_time,calories,paese,category,occasions,lifestyle,numero_preparate,created_at")
      .eq("status", "pubblicata")
      .order("numero_preparate", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(20),
    base44.entities.GostoPuroProduct.filter({ is_active: true }, "sort_order"),
    ]);
    const recipes = recipesRes.data || [];

    // Receitas da degustação gratuita — para mostrar no "Le più preparate" do free
    const { data: freeRows } = await supabase.from("free_recipes").select("recipe_id");
    const freeIds = (freeRows || []).map((r) => r.recipe_id);
    let freeRecipesData = [];
    if (freeIds.length > 0) {
      const { data: frData } = await supabase
        .from("recipes")
        .select("id,title,image_url,prep_time,calories,dietary_tags,numero_preparate")
        .in("id", freeIds)
        .eq("status", "pubblicata")
        .order("numero_preparate", { ascending: false, nullsFirst: false });
      freeRecipesData = frData || [];
    }

    setTopRecipes(recipes);
    setFreeRecipes(freeRecipesData);
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
      "Detox": "https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/8c0b83736_RicetteDetox.png",
      "Diabete": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/63205d254_Diabete.png",
      "Estate": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/029f21cd5_Estate.png",
      "Fit": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/d632e27da_Fit.png",
      "In famiglia": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/78bec7c3b_Infamiglia.png",
      "Inverno": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/d0924a4a2_Inverno.png",
      "Low carb": "https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/ef3e8a07d_RicetteLowCarb.png",
      "Natale e Capodanno": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/057feccab_NataleeCapodanno.png",
      "Per due": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/90f0dad01_Perdue.png",
      "Primavera": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/42185c523_Primavera.png",
      "Proteiche": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/9f81f5cc8_Proteiche.png",
      "Senza zucchero": "https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/a786d7eb2_RicetteSenzaZucchero.png",
      "Veloci": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/de87766a6_Veloci.png",
      "Instagram": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/7913ab823_Instagram.png",
    };

    // Build special occasions (everything except daily meals)
    const specialOccasionsList = OCCASIONS_LIST.filter(
      occ => !["Colazione", "Pranzo", "Cena"].includes(occ)
    );
    const special = specialOccasionsList.slice(0, 7).map((label) => ({ 
      label, 
      icon: "🍽️", 
      img: occasionImages[label] 
    }));
    
    // Lifestyle tags are a subset of OCCASIONS_LIST
    const lifestyleSubset = [
      "275 Ricette Fitness Pratiche ed Economiche",
      "Senza zucchero", "Detox",
      "365 Ricette Deliziose per Diabetici",
      "Low carb"
    ];
    const lifestyle = lifestyleSubset.map((label) => ({ 
      label, 
      icon: "🌟", 
      img: occasionImages[label],
      isLifestyle: true 
    }));

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
              {userRole === "admin" && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded-lg">⭐ Admin</span>
                </div>
              )}
            </div>
        </div>


      </div>

      {/* Dietary Banner */}
      <DietaryBanner userName={userName} dietaryTags={user?.dietary_tags_profile} />

      {/* Convite a ativar notificações (re-oferece no PWA) */}
      <EnableNotificationsBanner />

      {/* Daily Message */}
        <div className="mx-5 mb-4 mt-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#2D6A4F] flex-shrink-0" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Ogni giorno nuove ricette ti aspettano!</p>
        </div>

      {/* Progresso di sblocco — desiderio di completare la collezione (nascosto per Premium) */}
      {user && user.is_full_premium !== true && (() => {
        const total = gostoPuroProducts.length || 18;
        const owned = Array.isArray(user.purchased_products) ? user.purchased_products.length : 0;
        const pct = Math.max(4, Math.round((owned / total) * 100));
        const title = owned === 0
          ? "Hai assaggiato 40 ricette su oltre 1.700"
          : `Hai sbloccato ${owned} raccolte su ${total}`;
        const subtitle = owned === 0
          ? "Le raccolte complete ti aspettano"
          : `Ti mancano ancora ${total - owned} raccolte da scoprire`;
        return (
          <a
            href="https://gostopuro.it/upgrade/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("premium_click", { source: "home_progress" })}
            className="block mx-5 mb-4 rounded-2xl px-4 py-3.5 bg-gradient-to-br from-[#2D6A4F] to-[#40916C] shadow-sm active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-semibold text-sm">{title}</p>
              <span className="text-white/80 text-xs font-semibold">{owned}/{total}</span>
            </div>
            <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-white/85 text-xs mt-2">{subtitle} →</p>
          </a>
        );
      })()}


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

      {/* Survey — feedback rápido */}
      <Survey user={user} />

      {/* Prodotti Gosto Puro */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Prodotti Gosto Puro" />
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-2">
          {[
            ...gostoPuroProducts.filter(p => p.occasioni && p.occasioni.length > 0 && p.image_url).map(product => (
              <Link
                key={product.id}
                to={`/OccasionRecipes?occasion=${encodeURIComponent(product.nome)}&terms=${encodeURIComponent((product.occasioni || []).join('|'))}`}
                className="flex-shrink-0 group active:scale-95 transition-transform duration-150 relative rounded-2xl overflow-hidden"
                style={{ width: "200px", height: "250px" }}
              >
                <img src={product.image_url} alt={product.nome} loading="lazy" decoding="async" style={{ width: "200px", height: "250px", objectFit: "cover", display: "block", flexShrink: 0 }} className="group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-3">
                  <p className="text-white font-semibold text-sm line-clamp-2">{product.nome}</p>
                </div>
              </Link>
            )),
            ...gostoPuroProducts.filter(p => !(p.occasioni && p.occasioni.length > 0 && p.image_url)).map(product => (
              <div key={product.id} className="flex-shrink-0 relative rounded-2xl overflow-hidden cursor-not-allowed" style={{ width: "200px", height: "250px" }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.nome} loading="lazy" decoding="async" style={{ width: "200px", height: "250px", objectFit: "cover", display: "block", flexShrink: 0, opacity: 0.4 }} className="grayscale" />
                ) : (
                  <div style={{ width: "200px", height: "250px" }} className="bg-gradient-to-br from-gray-400 to-gray-500" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-lg">Prossimamente</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-3">
                  <p className="text-white font-semibold text-sm line-clamp-2">{product.nome}</p>
                </div>
              </div>
            )),
            ...lifestyleTags.filter(tag => !gostoPuroProducts.some(p => p.occasioni && p.occasioni.includes(tag.label))).map(tag => (
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
            ))
          ]}

        </div>
      </div>

      {/* Collezione Gosto Puro — sub-occasions */}
      {(() => {
        const collectionOccasions = [
          { label: "Instagram", occasion: "Instagram", img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/7913ab823_Instagram.png" },
          { label: "In famiglia", occasion: "In famiglia", img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/78bec7c3b_Infamiglia.png" },
          { label: "Per due", occasion: "Per due", img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/90f0dad01_Perdue.png" },
          { label: "Con amici", occasion: "Con amici", img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/2e95bf4e4_Conamici.png" },
          { label: "Estate", occasion: "Estate", img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/029f21cd5_Estate.png" },
          { label: "Autunno", occasion: "Autunno", img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/6d0a7ca9d_Autunno.png" },
          { label: "Inverno", occasion: "Inverno", img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/d0924a4a2_Inverno.png" },
          { label: "Primavera", occasion: "Primavera", img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/42185c523_Primavera.png" },
        ];

        return (
          <div className="px-5 mt-8">
            <SectionHeader title="Collezione Gosto-Puro" />
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
              {collectionOccasions.map(occ => (
                <Link key={occ.label} to={`/OccasionRecipes?occasion=${encodeURIComponent(occ.occasion)}`}
                  onClick={() => trackEvent("occasion_click", { occasion_label: occ.occasion })}
                  className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150">
                  <div style={{ width: 100, height: 100, minWidth: 100, maxWidth: 100, borderRadius: 14 }} className="overflow-hidden bg-white dark:bg-[#1A2B20] shadow-md border border-gray-100 dark:border-[#2D4A38]">
                    <img src={occ.img} alt={occ.label} className="w-full h-full object-cover" />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center", maxWidth: 100, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3 }} className="text-gray-700 dark:text-gray-300">{occ.label}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Top Prepared — carousel with large cards */}
      <div className="mt-8">
        <div className="px-5">
          <SectionHeader title="Le più preparate" linkPage="Recipes" />
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-2">
          {(() => {
            // Free sem acesso → mostra as receitas LIBERADAS (degustação), que abrem de verdade.
            // Quem tem acesso → as mais preparate reais.
            const hasAccess = user?.is_full_premium === true || user?.has_access === true || user?.is_premium === true;
            if (!hasAccess) {
              return freeRecipes.slice(0, 10);
            }
            const dietaryTags = user?.dietary_tags_profile || [];
            // Prefere receitas que casam com tags do perfil; se nenhuma casar, mostra todas
            let filtered = topRecipes;
            if (dietaryTags.length > 0) {
              const matching = topRecipes.filter((recipe) =>
                dietaryTags.some(tag => (recipe.dietary_tags || []).includes(tag))
              );
              filtered = matching.length > 0 ? matching : topRecipes;
            }
            filtered = filtered.slice(0, 10);
            return filtered;
          })().map((recipe) => (
            <Link key={recipe.id} to={createPageUrl(`RecipeDetail?id=${recipe.id}`)} className="flex-shrink-0 group active:scale-95 transition-transform duration-150 relative rounded-2xl overflow-hidden" style={{ width: "200px", height: "250px" }}>
              <img src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400"} alt={recipe.title} loading="lazy" decoding="async" style={{ width: "200px", height: "250px", objectFit: "cover", display: "block", flexShrink: 0 }} className="group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-3">
                <p className="text-white font-semibold text-sm line-clamp-2 mb-1">{recipe.title}</p>
                <p className="text-white/80 text-xs">⏱️ {recipe.prep_time || "–"} min {recipe.calories ? `• ${recipe.calories} kcal` : ""}</p>
              </div>
            </Link>
            ))}
        </div>
      </div>

      </div>
    </PullToRefresh>);

}