import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Lock, Crown } from "lucide-react";

const filters = [
  { key: "all", label: "Tutte" },
  { key: "salvate", label: "Più salvate" },
  { key: "preparate", label: "Più preparate" },
  { key: "veloci", label: "Veloci" },
];

export default function DailyRecipesSection({ occasion, user }) {
  const isPremium = user?.plan === "premium" || user?.plan === "basic" || user?.role === "admin" || user?.role === "premium" || user?.role === "basic" || user?.is_expert === true;
  const [recipes, setRecipes] = useState([]);
  const [freeIds, setFreeIds] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, [occasion]);

  const loadRecipes = async () => {
    const today = new Date().toISOString().split("T")[0];
    const dailyNotifs = await base44.entities.DailyNotification.filter({ date: today }, "-created_date", 1);

    if (dailyNotifs.length > 0) {
      const notif = dailyNotifs[0];
      // Find which index corresponds to this occasion (Colazione=0, Pranzo=1, Cena=2)
      const occasionIndex = notif.occasions?.indexOf(occasion);
      if (occasionIndex !== -1 && notif.recipe_ids?.[occasionIndex]) {
        const recipeId = notif.recipe_ids[occasionIndex];
        const found = await base44.entities.Recipe.filter({ id: recipeId, status: "pubblicata" });
        setRecipes(found.slice(0, 1));
        setActiveFilter("all");
        return;
      }
      // fallback: load all 3 daily recipes filtered by this category
      if (notif.recipe_ids?.length > 0) {
        const allDaily = await Promise.all(
          notif.recipe_ids.map((id) => base44.entities.Recipe.filter({ id, status: "pubblicata" }))
        );
        const flat = allDaily.flat().filter((r) => r.category === occasion);
        if (flat.length > 0) {
          setRecipes(flat.slice(0, 3));
          setActiveFilter("all");
          return;
        }
      }
    }

    // fallback: last 3 published recipes of this category
    const fallback = await base44.entities.Recipe.filter(
      { status: "pubblicata", category: occasion },
      "-created_date",
      3
    );
    setRecipes(fallback);
    setActiveFilter("all");
  };

  useEffect(() => {
    base44.entities.FreeRecipe.list("-created_date", 500).then((fr) => {
      setFreeIds(fr.map((r) => r.recipe_id));
    });
  }, []);

  const filteredRecipes = (() => {
    let result = [...recipes];
    if (activeFilter === "veloci") {
      result = result.filter((r) => r.prep_time <= 15);
    } else if (activeFilter === "salvate") {
      result.sort((a, b) => (b.numero_salvate || 0) - (a.numero_salvate || 0));
    } else if (activeFilter === "preparate") {
      result.sort((a, b) => (b.numero_preparate || 0) - (a.numero_preparate || 0));
    }
    return result;
  })();

  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 220;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 500);
    }
  };

  useEffect(() => {
    checkScroll();
    const carousel = carouselRef.current;
    if (carousel) carousel.addEventListener("scroll", checkScroll);
    return () => carousel?.removeEventListener("scroll", checkScroll);
  }, [filteredRecipes]);

  const occIcon = { Colazione: "☕", Pranzo: "🍝", Cena: "🍷" }[occasion] || "🍽️";

  return (
    <div className="px-5 mt-8">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-bold text-[#2D6A4F] dark:text-[#40916C] tracking-widest uppercase">
              Ricette del giorno
            </p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {occIcon} Ricette di {occasion.toLowerCase()}
            </h2>
          </div>
        </div>
        <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
          <span className="font-bold text-[#2D6A4F] dark:text-[#40916C]">
            {(user?.display_name || user?.full_name)?.split(" ")[0] || "Ciao"}
          </span>
          , qui le ricette suggerite per {occasion.toLowerCase()} di oggi. Buon appetito! 🍽️
        </p>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 scroll-smooth"
        >
          {filteredRecipes.map((recipe) => {
            const isLocked = !isPremium && !freeIds.includes(recipe.id);
            return (
              <div key={recipe.id} className="flex-shrink-0 w-[200px]">
                {isLocked ? (
                  <a href="https://pay.hotmart.com/L104095305F?off=swawlhuf&checkoutMode=10" target="_blank" rel="noopener noreferrer">
                    <div className="relative overflow-hidden rounded-2xl aspect-square bg-gray-100 dark:bg-[#2D3F35] mb-2">
                      <img
                        src={recipe.image_url || "https://via.placeholder.com/200"}
                        alt={recipe.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover blur-sm opacity-40"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                          <Lock className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                          <Crown className="w-3 h-3" /> Premium
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] font-bold text-gray-400 dark:text-gray-600 line-clamp-2 blur-[2px] select-none">
                      {recipe.title}
                    </p>
                  </a>
                ) : (
                  <Link to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}>
                    <div className="overflow-hidden rounded-2xl aspect-square bg-gray-100 dark:bg-[#2D3F35] mb-2 cursor-pointer hover:opacity-85 transition-opacity">
                      <img
                        src={recipe.image_url || "https://via.placeholder.com/200"}
                        alt={recipe.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-[#2D6A4F] transition-colors">
                      {recipe.title}
                    </p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                      ⏱ {recipe.prep_time}min • {recipe.difficulty || "Media"}
                    </p>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-[#2D3F35] rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow z-10"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-[#2D3F35] rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow z-10"
          >
            <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
        )}
      </div>


    </div>
  );
}