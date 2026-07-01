import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { fetchStories, triggerStoryCleanup, canPostStory } from "@/api/stories";
import StoryViewer from "./StoryViewer";
import StoryComposer from "./StoryComposer";

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

  const load = () => {
    fetchStories()
      .then(({ groups, myId }) => { setGroups(groups); setMyId(myId); })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    triggerStoryCleanup(); // limpa expirados quando alguém abre o feed
  }, []);

  const myGroupIndex = groups.findIndex((g) => g.author_id === myId);
  const myGroup = myGroupIndex >= 0 ? groups[myGroupIndex] : null;
  const others = groups.filter((g) => g.author_id !== myId);

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
                onClick={() => (myGroup ? setViewerAt(myGroupIndex) : setCompose(true))}
              >
                <Avatar name={me?.display_name} photo={me?.photo_url} />
              </Ring>
              <button
                onClick={() => setCompose(true)}
                className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-[#2D6A4F] text-white border-2 border-white dark:border-[#1A1A1A] flex items-center justify-center"
                aria-label="Aggiungi storia"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate w-full text-center">Tu</span>
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
