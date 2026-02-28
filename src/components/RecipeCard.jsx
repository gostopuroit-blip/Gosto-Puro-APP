import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Clock, Star, Heart, ChefHat, Flame } from "lucide-react";

const countryFlags = {
  "Giappone": "🇯🇵",
  "Messico": "🇲🇽",
  "India": "🇮🇳",
  "Thailandia": "🇹🇭",
  "Spagna": "🇪🇸",
  "Grecia": "🇬🇷",
  "Stati Uniti": "🇺🇸",
};

export default function RecipeCard({ recipe, variant = "default" }) {
  if (variant === "compact") {
    return (
      <Link
        to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}
        className="flex-shrink-0 w-44 group"
      >
        <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-gray-100">
          <img
            src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400"}
            alt={recipe.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {recipe.media_rating > 0 && recipe.rating_count > 0 && (
            <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-semibold">{recipe.media_rating.toFixed(1)}</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white font-semibold text-sm leading-tight">
              {recipe.paese && countryFlags[recipe.paese] ? `${countryFlags[recipe.paese]} ` : ""}{recipe.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1 text-white/80">
                <Clock className="w-3 h-3" />
                <span className="text-[10px]">{recipe.prep_time} min</span>
              </div>
              {recipe.calories && (
                <div className="flex items-center gap-1 text-white/80">
                  <Flame className="w-3 h-3" />
                  <span className="text-[10px]">{recipe.calories} kcal</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-white/80">
                <Heart className="w-3 h-3" />
                <span className="text-[10px]">{recipe.numero_salvate || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}
      className="block group"
    >
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-50">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800"}
            alt={recipe.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {recipe.media_rating > 0 && recipe.rating_count > 0 && (
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold">{recipe.media_rating.toFixed(1)}</span>
              <span className="text-[10px] text-gray-400">({recipe.rating_count})</span>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white" />
            <span className="text-xs text-white font-medium">{recipe.prep_time} min</span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-[15px] text-gray-900 leading-tight">
            {recipe.paese && countryFlags[recipe.paese] ? `${countryFlags[recipe.paese]} ` : ""}{recipe.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{recipe.category} • {recipe.prep_time} min</p>
          <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{recipe.description}</p>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 flex-wrap">
            {recipe.calories && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[11px] font-medium">{recipe.calories} kcal</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-gray-400">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px] font-medium">{recipe.numero_salvate || 0} salvate</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <ChefHat className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span className="text-[11px] font-medium">{recipe.numero_preparate || 0} preparate</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}