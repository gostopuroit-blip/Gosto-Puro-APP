import { useRef, useState, useEffect } from "react";
import { X, ImagePlus, Loader2, Film, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPost } from "@/api/feed";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";

const MAX_ITEMS = 10;
const MAX_MB = 100;

// NICCHIA = definem PARA CHI il post arriva (la "bolla" del feed). Vocabolario
// canonico allineato a ciò che gli utenti dichiarano nel profilo (dietary_tags_profile)
// e alla mappa gp_canon_niche del ranking → così il post trova il pubblico giusto.
const NICHE_TAGS = ["Fit", "Proteico", "Low carb", "Senza zucchero", "Diabete",
  "Senza glutine", "Senza lattosio", "Vegetariano", "Vegano", "Detox",
  "Senza frutti di mare", "Senza uova"];

// ARGOMENTI = etichette secondarie (occasione/prodotto). Non creano bolla.
const TAG_GROUPS = [
  {
    label: "Occasioni",
    tags: ["Colazione", "Pranzo", "Cena", "Snack", "Dolci", "Aperitivo", "Leggera", "Veloci",
      "In famiglia", "Per due", "Con amici", "Feste", "Estate", "Autunno", "Inverno", "Primavera", "Natale", "Dal mondo"],
  },
  {
    label: "Prodotti / Collezioni",
    tags: ["Gelati", "Bibite Estate", "Insalate", "Friggitrice ad Aria", "Whey",
      "Facili da Congelare", "Pane Senza Glutine", "Meal Prep",
      "Menopausa", "Anti-Gonfiore", "Brucia Grassi", "Ricette Sane"],
  },
];

export default function ComposeSheet({ me, onClose, onPublished }) {
  const fileRef = useRef(null);
  const [media, setMedia] = useState([]); // {url, type, poster?}
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState([]);
  const [notify, setNotify] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const isAdmin = me?.role === "admin";

  // Vetrina prodotto (CTA)
  const [products, setProducts] = useState([]);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaImage, setCtaImage] = useState(null);

  useEffect(() => {
    base44.entities.GostoPuroProduct.filter({ is_active: true }, "sort_order", 100)
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const pickProduct = (slug) => {
    const p = products.find((x) => x.slug === slug);
    if (!p) return;
    setCtaLabel(`Scopri: ${p.nome}`);
    setCtaImage(p.image_url || null);
    // Link interno alla pagina della raccolta: chi l'ha già comprata vede subito le
    // ricette; chi non ce l'ha trova la schermata di sblocco. Punta sempre alla collezione
    // scelta (sovrascrive un eventuale link precedente).
    const terms = Array.isArray(p.occasioni) ? p.occasioni.filter(Boolean).join("|") : "";
    setCtaUrl(`/OccasionRecipes?occasion=${encodeURIComponent(p.nome)}&terms=${encodeURIComponent(terms)}`);
  };

  const toggleTag = (t) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const pick = () => fileRef.current?.click();

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    if (media.length + files.length > MAX_ITEMS) {
      toast.error(`Massimo ${MAX_ITEMS} file per post`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith("video/");
        // Vídeo respeita o limite; imagem é comprimida no cliente antes de subir
        if (isVideo && file.size > MAX_MB * 1024 * 1024) {
          toast.error(`${file.name} supera ${MAX_MB}MB`);
          continue;
        }
        const toUpload = isVideo ? file : await compressImage(file);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: toUpload, bucket: "feed" });
        setMedia((prev) => [...prev, { url: file_url, type: isVideo ? "video" : "image" }]);
      }
    } catch (err) {
      toast.error("Errore nel caricamento");
    } finally {
      setUploading(false);
    }
  };

  const removeItem = (i) => setMedia((prev) => prev.filter((_, idx) => idx !== i));

  const move = (from, to) => {
    if (to < 0 || to >= media.length) return;
    setMedia((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const publish = async () => {
    if (media.length === 0) { toast.error("Aggiungi almeno una foto o un video"); return; }
    setPublishing(true);
    try {
      const cta = ctaLabel.trim() && ctaUrl.trim() ? { label: ctaLabel, url: ctaUrl, image: ctaImage } : null;
      const post = await createPost({ media, caption, me, tags, cta });
      toast.success("Post pubblicato!");
      // Notificação push (só admin; a edge function é admin-only no servidor).
      // Confirmação SEMPRE visível: o dono não recebe a própria push (não está
      // inscrito), então o toast é a única prova de que saiu — não pode ser
      // silencioso nem sumir rápido.
      if (notify && isAdmin) {
        const tid = toast.loading("Invio notifica in corso…");
        try {
          const body = (caption || "").trim().slice(0, 100) || "Guarda l'ultimo post nel feed!";
          // Imagem grande na notificação (foto do prato) → muito mais toques. Usa a capa
          // (1º item de imagem). Vídeo/sem foto → sem image (o ícone da marca continua).
          const cover = media.find((m) => m.type === "image")?.url || null;
          const res = await base44.functions.invoke("sendCustomNotification", {
            title: "🍽️ Novità su Gosto Puro",
            body,
            url: post?.id ? `/Feed?post=${post.id}` : "/Feed",
            image: cover || undefined,
            segment: "all",
          });
          const d = res?.data || {};
          if (d.success) {
            toast.success(
              `✅ Notifica inviata a ${d.sent} dispositivi${d.failed ? ` · ${d.failed} non raggiunti` : ""}`,
              { id: tid, duration: 7000 },
            );
          } else {
            toast.error(`Notifica NON inviata: ${d.error || d.message || "errore sconosciuto"}`, { id: tid, duration: 9000 });
          }
        } catch (e) {
          toast.error("Notifica NON inviata (rete o permesso). Riprova da Admin → Notifiche.", { id: tid, duration: 9000 });
        }
      }
      onPublished?.(post);
    } catch {
      toast.error("Errore nella pubblicazione");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-[#1A1A1A] rounded-t-3xl flex flex-col max-h-[92vh]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#333]">
          <button onClick={onClose} className="text-gray-400"><X className="w-6 h-6" /></button>
          <p className="font-bold text-gray-900 dark:text-gray-100">Nuovo post</p>
          <button
            onClick={publish}
            disabled={publishing || uploading || media.length === 0}
            className="text-[#2D6A4F] font-bold text-sm disabled:opacity-40"
          >
            {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pubblica"}
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {/* Grid de mídia */}
          <div className="grid grid-cols-3 gap-2">
            {media.map((m, i) => (
              <div key={m.url} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-[#0F0F0F]">
                {m.type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <Film className="w-7 h-7 text-white/80" />
                    <video src={m.url} className="absolute inset-0 w-full h-full object-cover opacity-70" muted />
                  </div>
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}

                {/* Número da ordem / capa */}
                {i === 0 ? (
                  <span className="absolute top-1 left-1 bg-[#2D6A4F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    Copertina
                  </span>
                ) : (
                  <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                )}

                <button
                  onClick={() => removeItem(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Reordenar */}
                {media.length > 1 && (
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                    <button
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
                      aria-label="Sposta indietro"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => move(i, i + 1)}
                      disabled={i === media.length - 1}
                      className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
                      aria-label="Sposta avanti"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {media.length < MAX_ITEMS && (
              <button
                onClick={pick}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-[#333] flex flex-col items-center justify-center gap-1 text-gray-400"
              >
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                <span className="text-[11px]">{uploading ? "Carico..." : "Aggiungi"}</span>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={onFiles}
          />

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            placeholder="Scrivi una didascalia... (ricetta, consiglio, ingredienti)"
            className="w-full bg-gray-50 dark:bg-[#0F0F0F] rounded-xl px-3.5 py-3 text-sm outline-none resize-none border border-gray-100 dark:border-[#333]"
          />

          {/* NICCHIA — definem para quem o post aparece (a bolha do feed) */}
          <div className="space-y-2 bg-[#F0F7F3] dark:bg-[#132a20] rounded-2xl p-3 border border-[#D8E8DF] dark:border-[#1f3d2e]">
            <div>
              <p className="text-xs font-bold text-[#2D6A4F] dark:text-[#7CC4A3]">
                🎯 Nicchia · a chi arriva il post{tags.filter((t) => NICHE_TAGS.includes(t)).length > 0 ? ` · ${tags.filter((t) => NICHE_TAGS.includes(t)).length} scelti` : ""}
              </p>
              <p className="text-[11px] text-[#4f7a63] dark:text-[#6ba888] mt-0.5 leading-snug">
                Chi ha questo interesse lo vede per primo. Se il post piace, esce dalla nicchia e raggiunge tutti.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NICHE_TAGS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                      on
                        ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                        : "bg-white dark:bg-[#0F0F0F] border-[#CBE0D5] dark:border-[#2a4d3a] text-[#2D6A4F] dark:text-[#7CC4A3]"
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Argomenti secundários (ocasião/produto) — não criam bolha */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">
              Argomenti (facoltativi){tags.filter((t) => !NICHE_TAGS.includes(t)).length > 0 ? ` · ${tags.filter((t) => !NICHE_TAGS.includes(t)).length} scelti` : ""}
            </p>
            {TAG_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.tags.map((t) => {
                    const on = tags.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggleTag(t)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                          on
                            ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                            : "bg-white dark:bg-[#0F0F0F] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        #{t}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Vetrina prodotto (CTA de venda) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">Vetrina prodotto (facoltativo)</p>
            {products.length > 0 && (
              <select
                value=""
                onChange={(e) => pickProduct(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#0F0F0F] rounded-xl px-3 py-2.5 text-sm outline-none border border-gray-100 dark:border-[#333]"
              >
                <option value="">Collega un prodotto…</option>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.nome}</option>
                ))}
              </select>
            )}
            <input
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Testo del pulsante (es. Scopri i Gelati)"
              className="w-full bg-gray-50 dark:bg-[#0F0F0F] rounded-xl px-3 py-2.5 text-sm outline-none border border-gray-100 dark:border-[#333]"
            />
            <input
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="Link — collega un prodotto sopra, o incolla un link"
              className="w-full bg-gray-50 dark:bg-[#0F0F0F] rounded-xl px-3 py-2.5 text-sm outline-none border border-gray-100 dark:border-[#333]"
            />
            {(ctaLabel.trim() && ctaUrl.trim()) && (
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                {ctaImage && <img src={ctaImage} alt="" className="w-8 h-8 rounded object-cover" />}
                <span>
                  {ctaUrl.trim().startsWith("/OccasionRecipes")
                    ? "Il pulsante porta direttamente alla raccolta: chi l'ha già la vede, altrimenti trova lo sblocco."
                    : ctaUrl.trim().startsWith("/")
                    ? "Il pulsante apre questa pagina nell'app."
                    : "Il pulsante mostrerà un popup di vendita con il link."}
                </span>
              </div>
            )}
          </div>

          {/* Notificar usuários (só admin) */}
          {isAdmin && (
            <button
              onClick={() => setNotify((v) => !v)}
              className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#0F0F0F] rounded-xl px-3.5 py-3 border border-gray-100 dark:border-[#333]"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Avvisa gli utenti</p>
                <p className="text-[11px] text-gray-400">Invia una notifica push a tutti quando pubblichi</p>
              </div>
              <span className={`w-11 h-6 rounded-full flex items-center px-0.5 transition ${notify ? "bg-[#2D6A4F] justify-end" : "bg-gray-300 dark:bg-[#333] justify-start"}`}>
                <span className="w-5 h-5 rounded-full bg-white shadow" />
              </span>
            </button>
          )}

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Foto, carosello o video corto (fino a {MAX_MB}MB). Il post apparirà nel feed di tutti gli utenti.
          </p>
        </div>
      </div>
    </div>
  );
}
