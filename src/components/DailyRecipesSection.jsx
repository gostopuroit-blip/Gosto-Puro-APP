import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import RecipeCard from "@/components/RecipeCard";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const filters = [
  { key: "all", label: "Tutte" },
  { key: "salvate", label: "Più salvate" },
  { key: "preparate", label: "Più preparate" },
  { key: "veloci", label: "Veloci" },
];

export default function DailyRecipesSection({ occasion, user }) {
  const [recipes, setRecipes] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, [occasion]);

  const loadRecipes = async () => {
    const allRecipes = await base44.entities.Recipe.filter(
      { status: "pubblicata", category: occasion },
      "-created_date",
      1000
    );
    setRecipes(allRecipes);
    setActiveFilter("all");
  };

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
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="flex-shrink-0 w-[200px]">
              <Link to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}>
                <div className="overflow-hidden rounded-2xl aspect-square bg-gray-100 dark:bg-[#2D3F35] mb-2 cursor-pointer hover:opacity-85 transition-opacity">
                  <img
                    src={recipe.image_url || "https://via.placeholder.com/200"}
                    alt={recipe.title}
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
            </div>
          ))}
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