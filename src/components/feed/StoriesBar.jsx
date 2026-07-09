import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { fetchStories, triggerStoryCleanup, canPostStory } from "@/api/stories";
import StoryViewer from "./StoryViewer";
import StoryComposer from "./StoryComposer";

const HINT_KEY = "gp_story_hint_seen";

function Ring({ seen, children, onClick }) {
  // Anel gradiente (não visto) ou cinza (visto)
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
      <span
        className={`w-16 h-16 rounded-full p-[2.5px] flex items-center justify-center ${
          seen ? "bg-gray-300 dark:bg-[#444]" : "bg-gradient-to-tr from-[#D4A846] via-[#E07A3A] to-[#2D6A4F]"
        }`}
      >
        <span className="w-full h-full rounded-full bg-white dark:bg-[#1A1A1A] p-[2px] flex items-center justify-center">
          {children}
        </span>
      </span>
    </button>
  );
}

function Avatar({ name, photo }) {
  return photo ? (
    <img src={photo} alt="" className="w-full h-full rounded-full object-cover" />
  ) : (
    <div className="w-full h-full rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center font-bold">
      {(name || "U").charAt(0).toUpperCase()}
    </div>
  );
}

export default function StoriesBar({ me }) {
  const [groups, setGroups] = useState([]);
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerAt, setViewerAt] = useState(null);
  const [compose, setCompose] = useState(false);
  // Dica de 1ª vez: a maioria não sabe que PODE postar story. Mostra um convite
  // dispensável (1x por usuário) apontando pro próprio círculo.
  const [hint, setHint] = useState(false);

  const openCompose = () => { setCompose(true); dismissHint(); };
  const dismissHint = () => { setHint(false); try { localStorage.setItem(HINT_KEY, "1"); } catch { /* ignore */ } };

  const load = () => {
    fetchStories()
      .then(({ groups, myId }) => { setGroups(groups); setMyId(myId); })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    triggerStoryCleanup(); // limpa expirados quando alguém abre o feed
    if (canPostStory()) {
      try { if (!localStorage.getItem(HINT_KEY)) setHint(true); } catch { /* ignore */ }
    }
  }, []);

  const myGroupIndex = groups.findIndex((g) => g.author_id === myId);
  const myGroup = myGroupIndex >= 0 ? groups[myGroupIndex] : null;
  const others = groups.filter((g) => g.author_id !== myId);
  // Só convida quem ainda NÃO tem story ativa (senão vira ruído).
  const showHint = hint && !myGroup;

  if (loading && groups.length === 0) return null;

  return (
    <div className="border-b border-gray-100 dark:border-[#222] mb-1">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-3 py-3">
        {/* Meu story / adicionar */}
        {canPostStory() && (
          <div className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
            <div className="relative">
              <Ring
                seen={myGroup ? myGroup.allSeen : true}
                onClick={() => (myGroup ? setViewerAt(myGroupIndex) : openCompose())}
              >
                <Avatar name={me?.display_name} photo={me?.photo_url} />
              </Ring>
              {/* Pulso sutil no + enquanto a pessoa nunca postou (chama atenção) */}
              {showHint && (
                <span className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-[#2D6A4F] animate-ping opacity-60" />
              )}
              <button
                onClick={openCompose}
                className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-[#2D6A4F] text-white border-2 border-white dark:border-[#1A1A1A] flex items-center justify-center"
                aria-label="Aggiungi storia"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate w-full text-center">
              {myGroup ? "Tu" : "La tua storia"}
            </span>
          </div>
        )}

        {/* Stories de outros */}
        {others.map((g) => {
          const realIndex = groups.findIndex((x) => x.author_id === g.author_id);
          return (
            <div key={g.author_id} className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
              <Ring seen={g.allSeen} onClick={() => setViewerAt(realIndex)}>
                <Avatar name={g.author_name} photo={g.author_photo} />
              </Ring>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
                {g.author_name || "Utente"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Convite de 1ª vez: ensina que o usuário PODE postar story */}
      {showHint && (
        <button
          onClick={openCompose}
          className="w-full flex items-center gap-2 px-4 pb-2.5 -mt-1 text-left"
        >
          <span className="text-base">📸</span>
          <span className="flex-1 text-[12px] text-gray-600 dark:text-gray-300 leading-snug">
            <b className="text-[#2D6A4F] dark:text-emerald-400">Condividi la tua storia!</b> Tocca il tuo cerchio per pubblicare una foto o un video — dura 24 ore.
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); dismissHint(); }}
            className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 flex items-center justify-center flex-shrink-0"
            aria-label="Chiudi"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      {viewerAt !== null && groups[viewerAt] && (
        <StoryViewer
          groups={groups}
          startGroup={viewerAt}
          me={me}
          onClose={() => { setViewerAt(null); load(); }}
          onChanged={load}
        />
      )}

      {compose && (
        <StoryComposer
          me={me}
          onClose={() => setCompose(false)}
          onPublished={() => { setCompose(false); load(); }}
        />
      )}
    </div>
  );
}
