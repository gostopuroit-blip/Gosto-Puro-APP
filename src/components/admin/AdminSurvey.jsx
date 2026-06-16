import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, RefreshCw, MessageSquareHeart } from "lucide-react";

export default function AdminSurvey() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("survey_responses")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>;

  const total = rows.length;
  const sats = rows.filter((r) => r.satisfaction).map((r) => r.satisfaction);
  const avg = sats.length ? (sats.reduce((a, b) => a + b, 0) / sats.length).toFixed(1) : "—";
  const dist = [1, 2, 3, 4, 5].map((n) => ({ n, count: sats.filter((s) => s === n).length }));

  const tally = (field) => {
    const m = {};
    rows.forEach((r) => (r[field] || []).forEach((v) => { m[v] = (m[v] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const occasions = tally("occasions_wanted");
  const improvements = tally("improvements");
  const comments = rows.filter((r) => r.comment && r.comment.trim());

  const cooksMap = {};
  rows.forEach((r) => { if (r.cooks_for) cooksMap[r.cooks_for] = (cooksMap[r.cooks_for] || 0) + 1; });
  const cooksFor = Object.entries(cooksMap).sort((a, b) => b[1] - a[1]);
  const maxCook = cooksFor[0]?.[1] || 1;

  const maxOcc = occasions[0]?.[1] || 1;
  const maxImp = improvements[0]?.[1] || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="w-5 h-5 text-[#2D6A4F]" />
          <p className="text-sm font-bold text-gray-700">Pesquisa de feedback · {total} respostas</p>
        </div>
        <button onClick={load} className="p-1 text-gray-400 hover:text-[#2D6A4F]"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {total === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-400">Nenhuma resposta ainda. Os usuários veem a enquete no card "Aiutaci a migliorare" na Home.</p>
        </div>
      ) : (
        <>
          {/* Satisfação */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-3">Satisfação média: <span className="text-[#2D6A4F]">{avg} / 5</span></p>
            <div className="space-y-1.5">
              {dist.slice().reverse().map(({ n, count }) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="text-xs w-10 text-gray-500">{n} {"⭐".repeat(1)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-[#2D6A4F] h-2.5 rounded-full" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Para quem cozinham */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-1">Para quem cozinham</p>
            <p className="text-[11px] text-gray-400 mb-3">Perfil do público (cruze com as coleções pedidas)</p>
            {cooksFor.length === 0 ? <p className="text-xs text-gray-400">Sem dados.</p> : (
              <div className="space-y-1.5">
                {cooksFor.map(([label, count]) => (
                  <div key={label} className="flex items-center gap-2">
                    <p className="text-xs flex-1 text-gray-700 truncate">{label}</p>
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div className="bg-[#2D6A4F] h-2 rounded-full" style={{ width: `${(count / maxCook) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ocasiões/produtos desejados */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-1">Coleções / produtos mais pedidos</p>
            <p className="text-[11px] text-gray-400 mb-3">O que os usuários querem ver no app</p>
            {occasions.length === 0 ? <p className="text-xs text-gray-400">Sem dados.</p> : (
              <div className="space-y-1.5">
                {occasions.map(([label, count]) => (
                  <div key={label} className="flex items-center gap-2">
                    <p className="text-xs flex-1 text-gray-700 truncate">{label}</p>
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div className="bg-[#40916C] h-2 rounded-full" style={{ width: `${(count / maxOcc) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Melhorias */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-1">Melhorias mais pedidas</p>
            <p className="text-[11px] text-gray-400 mb-3">O que os usuários querem que melhore</p>
            {improvements.length === 0 ? <p className="text-xs text-gray-400">Sem dados.</p> : (
              <div className="space-y-1.5">
                {improvements.map(([label, count]) => (
                  <div key={label} className="flex items-center gap-2">
                    <p className="text-xs flex-1 text-gray-700 truncate">{label}</p>
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${(count / maxImp) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comentários */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-3">Comentários ({comments.length})</p>
            {comments.length === 0 ? <p className="text-xs text-gray-400">Nenhum comentário escrito ainda.</p> : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
                {comments.map((r) => (
                  <div key={r.id} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-700">"{r.comment}"</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {r.satisfaction ? `${r.satisfaction}⭐ · ` : ""}{r.user_email || "anônimo"} · {String(r.created_at).slice(0, 10)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
