import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Search as SearchIcon, Loader2, User, FileText, Hash, ChefHat, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import FollowButton from "@/components/community/FollowButton";
import { createPageUrl } from "@/utils";

const RECIPE_CATEGORIES = ["Tutte", "Colazione", "Pranzo", "Cena", "Snack", "Dolce", "Bevanda"];
const DIETARY_TAGS = ["Senza glutine", "Senza lattosio", "Senza zucchero", "Vegano", "Vegetariano", "Low carb", "Alto contenuto proteico", "Diabetico", "Detox", "Fit", "Senza uova", "Senza frutti di mare"];
const RECIPE_PAGE_SIZE = 12;

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("posts"); // posts | users | hashtags | ricette
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [followedEmails, setFollowedEmails] = useState(new Set());

  // Recipe search state
  const [recipes, setRecipes] = useState([]);
  const [recipesTotal, setRecipesTotal] = useState(0);
  const [recipesPage, setRecipesPage] = useState(1);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipeCategory, setRecipeCategory] = useState("Tutte");
  const [recipeOccasion, setRecipeOccasion] = useState("Tutte");
  const [selectedDietaryTags, setSelectedDietaryTags] = useState([]);
  const [profileRestrictionsActive, setProfileRestrictionsActive] = useState(false);
  const [profileRestrictions, setProfileRestrictions] = useState([]);
  const recipeSearchRef = useRef(null);

  // Load current user and occasions
  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setCurrentUser(u);
      if (u) {
        const followData = await base44.entities.UserFollow.filter({ follower_email: u.email }, "-created_date", 200).catch(() => []);
        setFollowedEmails(new Set(followData.map((f) => f.following_email)));
        // Load profile dietary restrictions
        if (u.dietary_tags_profile && u.dietary_tags_profile.length > 0) {
          setProfileRestrictions(u.dietary_tags_profile);
          setProfileRestrictionsActive(true);
          setSelectedDietaryTags(u.dietary_tags_profile);
        }
      }
    };
    init();
  }, []);

  // Load trending hashtags when empty
  useEffect(() => {
    const loadTrending = async () => {
      const trending = await base44.entities.Hashtag.filter({ is_trending: true }, "-posts_count", 10).catch(() => []);
      setTrendingHashtags(trending);
    };
    if (!query.trim()) {
      loadTrending();
    }
  }, [query]);

  // Search function with debounce
  const performSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setPosts([]);
        setUsers([]);
        setHashtags([]);
        return;
      }

      setLoading(true);
      const lowerQuery = searchQuery.toLowerCase();

      try {
        // Search posts by content, title, or tags
        const allPosts = await base44.entities.CommunityPost.filter({ status: "active" }, "-created_date", 100).catch(() => []);
        const filteredPosts = allPosts.filter((p) =>
          p.content?.toLowerCase().includes(lowerQuery) ||
          p.title?.toLowerCase().includes(lowerQuery) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
        setPosts(filteredPosts);

        // Search users by display_name or email
        const allUsers = await base44.entities.User.list("-created_date", 100).catch(() => []);
        const filteredUsers = allUsers.filter((u) =>
          u.full_name?.toLowerCase().includes(lowerQuery) ||
          u.email?.toLowerCase().includes(lowerQuery)
        );
        setUsers(filteredUsers);

        // Search hashtags by name
        const allHashtags = await base44.entities.Hashtag.list("-posts_count", 100).catch(() => []);
        const filteredHashtags = allHashtags.filter((h) =>
          h.name?.toLowerCase().includes(lowerQuery)
        );
        setHashtags(filteredHashtags);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Handle search input change
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Load occasions list
  const [recipeOccasions, setRecipeOccasions] = useState(["Tutte"]);
  useEffect(() => {
    const loadOccasions = async () => {
      const homeOccasions = await base44.entities.RecipeOccasion.filter({ show_in_home: true }).catch(() => []);
      const activeProducts = await base44.entities.GostoPuroProduct.filter({ is_active: true }).catch(() => []);
      const homeLabels = homeOccasions.map(o => o.label);
      const productLabels = activeProducts.flatMap(p => p.occasioni || []);
      const allOccasions = [...new Set([...homeLabels, ...productLabels])].sort();
      setRecipeOccasions(["Tutte", ...allOccasions]);
    };
    loadOccasions();
  }, []);

  // Recipe search — runs when tab=ricette or filters change
  const searchRecipes = useCallback(async (searchQuery, category, occasion, dietaryTags, page) => {
    setRecipesLoading(true);
    const filterQuery = { status: "pubblicata" };
    if (category && category !== "Tutte") filterQuery.category = category;
    // Build all results then filter arrays client-side (SDK doesn't support array contains)
    const limit = 500;
    const allMatching = await base44.entities.Recipe.filter(filterQuery, "-created_date", limit).catch(() => []);

    let results = allMatching;

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter((r) =>
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }

    // Occasion filter
    if (occasion && occasion !== "Tutte") {
      results = results.filter((r) =>
        (r.occasions || []).includes(occasion) || (r.lifestyle || []).includes(occasion)
      );
    }

    // Dietary tags filter (must contain ALL selected tags)
    if (dietaryTags.length > 0) {
      results = results.filter((r) =>
        dietaryTags.every((tag) => (r.dietary_tags || []).includes(tag))
      );
    }

    setRecipesTotal(results.length);
    const skip = (page - 1) * RECIPE_PAGE_SIZE;
    setRecipes(results.slice(skip, skip + RECIPE_PAGE_SIZE));
    setRecipesLoading(false);
  }, []);

  // Trigger recipe search when tab is ricette or filters change
  useEffect(() => {
    if (activeTab !== "ricette") return;
    searchRecipes(query, recipeCategory, recipeOccasion, selectedDietaryTags, recipesPage);
  }, [activeTab, query, recipeCategory, recipeOccasion, selectedDietaryTags, recipesPage, searchRecipes]);

  // Reset recipe page on filter/query change
  useEffect(() => {
    setRecipesPage(1);
  }, [query, recipeCategory, recipeOccasion, selectedDietaryTags]);

  const toggleDietaryTag = (tag) => {
    setSelectedDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setProfileRestrictionsActive(false);
  };

  const toggleProfileRestrictions = () => {
    if (profileRestrictionsActive) {
      setProfileRestrictionsActive(false);
      setSelectedDietaryTags([]);
    } else {
      setProfileRestrictionsActive(true);
      setSelectedDietaryTags(profileRestrictions);
    }
  };

  const clearRecipeFilters = () => {
    setRecipeCategory("Tutte");
    setRecipeOccasion("Tutte");
    setSelectedDietaryTags([]);
    setProfileRestrictionsActive(false);
    setRecipesPage(1);
  };

  const hasActiveRecipeFilters = recipeCategory !== "Tutte" || recipeOccasion !== "Tutte" || selectedDietaryTags.length > 0;
  const recipesTotalPages = Math.max(1, Math.ceil(recipesTotal / RECIPE_PAGE_SIZE));

  const handleFollowChange = useCallback((targetEmail, isNowFollowing) => {
    setFollowedEmails((prev) => {
      const next = new Set(prev);
      if (isNowFollowing) next.add(targetEmail);
      else next.delete(targetEmail);
      return next;
    });
  }, []);

  const handleHashtagClick = (hashtag) => {
    navigate(`/Hashtag?tag=${encodeURIComponent(hashtag)}`);
  };

  const isEmpty = !query.trim();
  const hasResults = posts.length > 0 || users.length > 0 || hashtags.length > 0;

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur border-b border-gray-100 dark:border-[#2A2A2A]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca post, utenti, hashtag..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-gray-100 dark:bg-[#111] border-0 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs - always show */}
          <div className="flex gap-3 border-b border-gray-100 dark:border-[#2A2A2A] pb-3 -mx-4 px-4 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab("ricette")}
              className={`flex items-center gap-1 text-xs font-semibold pb-2 border-b-2 transition-all flex-shrink-0 ${
                activeTab === "ricette"
                  ? "border-[#2D6A4F] text-[#2D6A4F]"
                  : "border-transparent text-gray-400"
              }`}
            >
              <ChefHat className="w-3 h-3" />
              Ricette
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-1 text-xs font-semibold pb-2 border-b-2 transition-all flex-shrink-0 ${
                activeTab === "posts"
                  ? "border-[#2D6A4F] text-[#2D6A4F]"
                  : "border-transparent text-gray-400"
              }`}
            >
              <FileText className="w-3 h-3" />
              Post {hasResults && `(${posts.length})`}
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1 text-xs font-semibold pb-2 border-b-2 transition-all flex-shrink-0 ${
                activeTab === "users"
                  ? "border-[#2D6A4F] text-[#2D6A4F]"
                  : "border-transparent text-gray-400"
              }`}
            >
              <User className="w-3 h-3" />
              Utenti {hasResults && `(${users.length})`}
            </button>
            <button
              onClick={() => setActiveTab("hashtags")}
              className={`flex items-center gap-1 text-xs font-semibold pb-2 border-b-2 transition-all flex-shrink-0 ${
                activeTab === "hashtags"
                  ? "border-[#2D6A4F] text-[#2D6A4F]"
                  : "border-transparent text-gray-400"
              }`}
            >
              <Hash className="w-3 h-3" />
              Hashtag {hasResults && `(${hashtags.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
          </div>
        )}

        {isEmpty && !loading && (
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Hashtag di tendenza</p>
            <div className="flex flex-wrap gap-2">
              {trendingHashtags.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleHashtagClick(h.name)}
                  className="flex items-center gap-1 bg-gradient-to-r from-[#2D6A4F]/10 to-[#2D6A4F]/5 border border-[#2D6A4F]/20 rounded-full px-3 py-1.5 hover:border-[#2D6A4F]/40 transition"
                >
                  <Hash className="w-3 h-3 text-[#2D6A4F]" />
                  <span className="text-xs font-semibold text-[#2D6A4F]">{h.name}</span>
                  {h.posts_count > 0 && (
                    <span className="text-gray-500 text-[10px] ml-0.5">{h.posts_count}</span>
                  )}
                  {h.is_trending && <span className="text-[10px]">🔥</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && !isEmpty && !hasResults && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Nessun risultato per "{query}"
            </p>
            <p className="text-sm text-gray-400">Prova con una ricerca diversa</p>
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === "posts" && !loading && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nessun post trovato</p>
            ) : (
              posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  followedEmails={followedEmails}
                  onFollowChange={handleFollowChange}
                  onUpdate={() => {}}
                  onHashtagFilter={() => {}}
                />
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && !loading && (
          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nessun utente trovato</p>
            ) : (
              users.map((user) => (
                <Link
                  key={user.id}
                  to={`/ExpertProfile?uid=${btoa(user.email)}`}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-xl hover:bg-gray-50 dark:hover:bg-[#111] transition"
                >
                  {user.photo_url ? (
                    <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white font-bold flex-shrink-0">
                      {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user.full_name || user.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-gray-500">{user.role === "admin" ? "👑 Admin" : user.is_expert ? "✅ Expert" : user.plan === "premium" ? "⭐ Premium" : "Membro"}</p>
                  </div>
                  {currentUser && currentUser.email !== user.email && (
                    <FollowButton
                      targetEmail={user.email}
                      currentUser={currentUser}
                      onFollowChange={(following) => handleFollowChange(user.email, following)}
                    />
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {/* Ricette Tab */}
        {activeTab === "ricette" && (
          <div>
            {/* Profile restrictions banner */}
            {profileRestrictions.length > 0 && (
              <div
                onClick={toggleProfileRestrictions}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 cursor-pointer transition-all border ${
                  profileRestrictionsActive
                    ? "bg-[#2D6A4F]/10 border-[#2D6A4F]/30"
                    : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10"
                }`}
              >
                <span className="text-base">🙋</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {profileRestrictionsActive ? "Filtro per te attivo:" : "Attiva filtri del tuo profilo:"}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {profileRestrictions.map((tag) => (
                      <span key={tag} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${profileRestrictionsActive ? "bg-[#2D6A4F] text-white" : "bg-gray-200 dark:bg-white/10 text-gray-500"}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${profileRestrictionsActive ? "text-[#2D6A4F]" : "text-gray-400"}`}>
                  {profileRestrictionsActive ? "Attivo ✓" : "Attiva"}
                </span>
              </div>
            )}

            {/* Category pills */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Categoria</p>
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                {RECIPE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setRecipeCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      recipeCategory === cat
                        ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                        : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasion pills */}
             <div className="mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Occasione</p>
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                {recipeOccasions.map((occ) => (
                  <button
                    key={occ}
                    onClick={() => setRecipeOccasion(occ)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      recipeOccasion === occ
                        ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                        : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {occ}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary tags */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Restrizioni alimentari</p>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleDietaryTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      selectedDietaryTags.includes(tag)
                        ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                        : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Active filters row */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {recipesLoading ? "Ricerca in corso…" : `${recipesTotal} ricette trovate`}
              </p>
              {hasActiveRecipeFilters && (
                <button
                  onClick={clearRecipeFilters}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                >
                  <X className="w-3 h-3" /> Limpa filtri
                </button>
              )}
            </div>

            {/* Results */}
            {recipesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" />
              </div>
            ) : recipes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="text-gray-400 text-sm font-semibold">Nessuna ricetta trovata</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {recipes.map((recipe) => (
                    <Link
                      key={recipe.id}
                      to={createPageUrl(`RecipeDetail?id=${recipe.id}`)}
                      className="flex gap-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform shadow-sm"
                    >
                      <div className="w-20 h-20 flex-shrink-0">
                        <img
                          src={recipe.image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=200"}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 py-2.5 pr-3 min-w-0">
                        <p className="text-[10px] font-bold text-[#52b788] mb-0.5">{recipe.category}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-1"
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {recipe.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
                          {(recipe.calorie || recipe.calories) && <span>🔥 {recipe.calorie || recipe.calories} kcal</span>}
                          {recipe.difficulty && <span>{recipe.difficulty}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {recipesTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-5">
                    <button
                      onClick={() => setRecipesPage((p) => Math.max(1, p - 1))}
                      disabled={recipesPage === 1}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] text-sm font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {recipesPage} / {recipesTotalPages}
                    </span>
                    <button
                      onClick={() => setRecipesPage((p) => Math.min(recipesTotalPages, p + 1))}
                      disabled={recipesPage === recipesTotalPages}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] text-sm font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Hashtags Tab */}
        {activeTab === "hashtags" && !loading && (
          <div className="space-y-2">
            {hashtags.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nessun hashtag trovato</p>
            ) : (
              hashtags.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleHashtagClick(h.name)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-xl hover:bg-gray-50 dark:hover:bg-[#111] transition text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-5 h-5 text-[#2D6A4F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">#{h.name}</p>
                    <p className="text-xs text-gray-500">{h.posts_count} post{h.posts_count !== 1 ? "s" : ""}</p>
                  </div>
                  {h.is_trending && <span className="text-xl flex-shrink-0">🔥</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}