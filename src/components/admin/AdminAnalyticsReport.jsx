import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Loader2, FileText, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function fmtDuration(seconds) {
  if (!seconds || seconds < 60) return `${Math.round(seconds || 0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export default function AdminAnalyticsReport() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState(3);

  useEffect(() => { generateReport(); }, [period]);

  const generateReport = async () => {
    setLoading(true);
    const cutoff = nDaysAgo(period);

    const [events, allUsers] = await Promise.all([
      base44.entities.AppAnalytics.filter({ date: { $gte: cutoff } }, "-created_date", 2000).catch(() => []),
      base44.entities.User.list("-created_date", 200).catch(() => []),
    ]);

    const adminEmails = new Set(allUsers.filter(u => u.role === "admin").map(u => u.email));
    const ev = events.filter(e => !e.user_email || !adminEmails.has(e.user_email));

    // Use session_id as fallback when user_email is not yet cached
    const uid = (e) => e.user_email || e.session_id;

    const sessionStarts = ev.filter(e => e.event_type === "session_start");
    const sessionEnds = ev.filter(e => e.event_type === "session_end" && e.session_duration_seconds > 0);
    const recipeViews = ev.filter(e => e.event_type === "recipe_view");
    const recipeSaves = ev.filter(e => e.event_type === "recipe_saved");
    const planners = ev.filter(e => e.event_type === "planner_created");
    const utmVisits = ev.filter(e => e.event_type === "utm_visit");

    const uniqueUsers = new Set(sessionStarts.filter(e => uid(e)).map(uid));
    const freeUsers = new Set(sessionStarts.filter(e => e.user_plan === "free" && uid(e)).map(uid));
    const premiumUsers = new Set(sessionStarts.filter(e => e.user_plan === "premium" && uid(e)).map(uid));

    const durations = sessionEnds.map(e => e.session_duration_seconds);
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const recipeCounts = {};
    recipeViews.forEach(e => { if (e.recipe_title) recipeCounts[e.recipe_title] = (recipeCounts[e.recipe_title] || 0) + 1; });
    const topRecipes = Object.entries(recipeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const saveCounts = {};
    recipeSaves.forEach(e => { if (e.recipe_title) saveCounts[e.recipe_title] = (saveCounts[e.recipe_title] || 0) + 1; });
    const topSaved = Object.entries(saveCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const utmBySource = {};
    utmVisits.forEach(e => {
      const src = e.occasion_label || "desconhecido";
      utmBySource[src] = (utmBySource[src] || 0) + 1;
    });
    const topUtm = Object.entries(utmBySource).sort((a, b) => b[1] - a[1]);

    const sessionsByUser = {};
    sessionStarts.forEach(e => { const k = uid(e); if (k) sessionsByUser[k] = (sessionsByUser[k] || 0) + 1; });
    const returningUsers = Object.values(sessionsByUser).filter(c => c > 1).length;

    setReport({
      period,
      dateRange: `${cutoff} até ${todayStr()}`,
      totalSessions: sessionStarts.length,
      uniqueUsers: uniqueUsers.size,
      freeUsers: freeUsers.size,
      premiumUsers: premiumUsers.size,
      returningUsers,
      recipeViews: recipeViews.length,
      recipeSaves: recipeSaves.length,
      planners: planners.length,
      avgDuration,
      topRecipes,
      topSaved,
      topUtm,
    });
    setLoading(false);
  };

  const exportCSV = () => {
    if (!report) return;
    const lines = [
      ["RELATÓRIO GOSTO PURO", `Período: ${report.dateRange} (últimos ${report.period} dias)`],
      [],
      ["MÉTRICAS GERAIS"],
      ["Métrica", "Valor"],
      ["Total de sessões abertas", report.totalSessions],
      ["Usuários únicos", report.uniqueUsers],
      ["Usuários Free", report.freeUsers],
      ["Usuários Premium", report.premiumUsers],
      ["Usuários que voltaram (+1 sessão)", report.returningUsers],
      ["Visualizações de receitas", report.recipeViews],
      ["Receitas salvas", report.recipeSaves],
      ["Planners criados", report.planners],
      ["Tempo médio por sessão (segundos)", report.avgDuration],
      [],
      ["TOP 5 RECEITAS MAIS VISTAS"],
      ["Receita", "Visualizações"],
      ...report.topRecipes.map(([title, count]) => [title, count]),
      [],
      ["TOP 5 RECEITAS MAIS SALVAS"],
      ["Receita", "Saves"],
      ...report.topSaved.map(([title, count]) => [title, count]),
      [],
      ["ORIGEM DO TRÁFEGO (UTM)"],
      ["Fonte", "Visitas"],
      ...report.topUtm.map(([src, count]) => [src, count]),
    ];

    const csv = lines.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gostopuro_relatorio_${report.dateRange.replace(/ /g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTXT = () => {
    if (!report) return;
    const r = report;
    const retentionRate = r.uniqueUsers > 0 ? Math.round((r.returningUsers / r.uniqueUsers) * 100) : 0;
    const premiumRate = r.uniqueUsers > 0 ? Math.round((r.premiumUsers / r.uniqueUsers) * 100) : 0;

    const txt = `
╔══════════════════════════════════════════════════════════════╗
║           RELATÓRIO GOSTO PURO — ANÁLISE ${r.period} DIAS            ║
╚══════════════════════════════════════════════════════════════╝

📅 Período: ${r.dateRange}
📊 Gerado em: ${new Date().toLocaleString("pt-BR")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 RESUMO EXECUTIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nos últimos ${r.period} dias, o Gosto Puro teve:

• ${r.totalSessions} sessões abertas no app
• ${r.uniqueUsers} usuários únicos ativos
• ${r.premiumUsers} assinantes Premium (${premiumRate}% da base ativa)
• ${r.freeUsers} usuários gratuitos
• ${r.returningUsers} usuários voltaram ao app (taxa de retorno: ${retentionRate}%)
• Tempo médio por sessão: ${fmtDuration(r.avgDuration)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ENGAJAMENTO COM RECEITAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• ${r.recipeViews} visualizações de receitas
• ${r.recipeSaves} receitas salvas pelos usuários
• ${r.planners} planners de refeição criados

${r.topRecipes.length > 0 ? `🏆 TOP 5 RECEITAS MAIS VISTAS:\n${r.topRecipes.map(([t, c], i) => `   ${i + 1}. ${t} (${c} views)`).join("\n")}` : ""}

${r.topSaved.length > 0 ? `❤️ TOP 5 RECEITAS MAIS SALVAS:\n${r.topSaved.map(([t, c], i) => `   ${i + 1}. ${t} (${c} saves)`).join("\n")}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 ORIGEM DO TRÁFEGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${r.topUtm.length > 0
  ? r.topUtm.map(([src, c]) => `• ${src}: ${c} visita${c !== 1 ? "s" : ""}`).join("\n")
  : "• Nenhum acesso via link UTM rastreado no período."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gosto Puro — Relatório gerado automaticamente
    `.trim();

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gostopuro_relatorio_${r.period}dias.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!report) return;
    const r = report;
    const retentionRate = r.uniqueUsers > 0 ? Math.round((r.returningUsers / r.uniqueUsers) * 100) : 0;
    const premiumRate = r.uniqueUsers > 0 ? Math.round((r.premiumUsers / r.uniqueUsers) * 100) : 0;
    const viewsPerUser = r.uniqueUsers > 0 ? (r.recipeViews / r.uniqueUsers).toFixed(1) : "0";
    const saveRate = r.recipeViews > 0 ? Math.round((r.recipeSaves / r.recipeViews) * 100) : 0;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const pad = 15;
    let y = 0;

    // helpers
    const drawBar = (x, barY, w, h, color) => {
      doc.setFillColor(...color);
      doc.roundedRect(x, barY, Math.max(2, w), h, 1, 1, "F");
    };

    const drawBgBar = (x, barY, w, h) => {
      doc.setFillColor(235, 240, 237);
      doc.roundedRect(x, barY, w, h, 1, 1, "F");
    };

    const sectionTitle = (title, sY) => {
      doc.setFillColor(45, 106, 79);
      doc.roundedRect(pad, sY, W - pad * 2, 8, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(title, pad + 4, sY + 5.4);
      doc.setTextColor(30, 30, 30);
      return sY + 12;
    };

    const PAGE_H = 297;
    const MARGIN_BOTTOM = 15;

    const checkPageBreak = (neededSpace) => {
      if (y + neededSpace > PAGE_H - MARGIN_BOTTOM) {
        doc.addPage();
        y = 15;
      }
    };

    const statRow = (label, value, note, rowY, highlight = false) => {
      if (highlight) {
        doc.setFillColor(241, 248, 245);
        doc.roundedRect(pad, rowY, W - pad * 2, 9, 1, 1, "F");
      }
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(70, 70, 70);
      doc.text(label, pad + 3, rowY + 6);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
      doc.text(String(value), W - pad - 3, rowY + 6, { align: "right" });
      if (note) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(140, 140, 140);
        doc.text(note, W - pad - 3, rowY + 9.5, { align: "right" });
      }
      return rowY + (note ? 11 : 10);
    };

    // ── HEADER ──
    doc.setFillColor(45, 106, 79);
    doc.rect(0, 0, W, 40, "F");
    doc.setFillColor(34, 85, 62);
    doc.rect(0, 33, W, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("Gosto Puro", pad, 16);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório de Engajamento", pad, 26);
    doc.setFontSize(7.5);
    doc.text(`Últimos ${r.period} dias  ·  ${r.dateRange}  ·  Gerado: ${new Date().toLocaleString("pt-BR")}`, pad, 37.5);

    y = 48;
    doc.setTextColor(30, 30, 30);

    // ── KPI CARDS 2x4 ──
    const kpis = [
      { label: "Sessões abertas", value: r.totalSessions, note: "vezes que o app foi aberto", color: [209, 236, 224], tc: [20, 80, 50] },
      { label: "Usuários únicos", value: r.uniqueUsers, note: `${r.premiumUsers} Premium · ${r.freeUsers} Free`, color: [219, 234, 254], tc: [30, 60, 130] },
      { label: "Taxa de retorno", value: `${retentionRate}%`, note: `${r.returningUsers} voltaram ao app`, color: [237, 233, 254], tc: [80, 40, 160] },
      { label: "Tempo médio/sessão", value: fmtDuration(r.avgDuration), note: "por visita", color: [254, 243, 199], tc: [120, 80, 10] },
      { label: "Usuários Premium", value: r.premiumUsers, note: `${premiumRate}% da base ativa`, color: [253, 230, 138], tc: [120, 80, 10] },
      { label: "Views de receitas", value: r.recipeViews, note: `${viewsPerUser} views/usuário`, color: [209, 250, 229], tc: [5, 100, 60] },
      { label: "Receitas salvas", value: r.recipeSaves, note: `${saveRate}% dos views viraram save`, color: [254, 202, 202], tc: [160, 30, 30] },
      { label: "Planners criados", value: r.planners, note: "planos de refeição gerados", color: [224, 231, 255], tc: [50, 50, 180] },
    ];
    const cols = 4;
    const cW = (W - pad * 2 - (cols - 1) * 3) / cols;
    const cH = 22;
    kpis.forEach((k, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const kx = pad + col * (cW + 3);
      const ky = y + row * (cH + 3);
      doc.setFillColor(...k.color);
      doc.roundedRect(kx, ky, cW, cH, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...k.tc);
      doc.text(String(k.value), kx + cW / 2, ky + 9, { align: "center" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(40, 40, 40);
      doc.text(k.label, kx + cW / 2, ky + 14.5, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(110, 110, 110);
      doc.text(k.note, kx + cW / 2, ky + 19, { align: "center", maxWidth: cW - 2 });
    });
    y += 2 * (cH + 3) + 8;

    // ── MÉTRICAS-CHAVE (tabela de indicadores) ──
    y = sectionTitle("Indicadores-Chave de Performance", y);
    const metrics = [
      ["Sessoes por usuario unico", r.uniqueUsers > 0 ? (r.totalSessions / r.uniqueUsers).toFixed(1) : "-", "media de vezes que cada usuario abriu o app"],
      ["Taxa de conversao Free para Premium", `${premiumRate}%`, `${r.premiumUsers} Premium de ${r.uniqueUsers} ativos`],
      ["Taxa de retorno (retention)", `${retentionRate}%`, `${r.returningUsers} de ${r.uniqueUsers} usuarios voltaram`],
      ["Views de receita por usuario", viewsPerUser, `total: ${r.recipeViews} views`],
      ["Taxa de save (views que viraram saves)", `${saveRate}%`, `${r.recipeSaves} saves de ${r.recipeViews} views`],
      ["Planners por usuario ativo", r.uniqueUsers > 0 ? (r.planners / r.uniqueUsers).toFixed(2) : "-", `total: ${r.planners} planners criados`],
    ];
    metrics.forEach((m, i) => {
      checkPageBreak(12);
      y = statRow(m[0], m[1], m[2], y, i % 2 === 0);
    });
    y += 4;

    // ── TOP RECEITAS MAIS VISTAS ──
    if (r.topRecipes.length > 0) {
      checkPageBreak(12 + r.topRecipes.length * 12);
      y = sectionTitle("Top Receitas Mais Vistas", y);
      const maxV = r.topRecipes[0][1];
      const labelW = 80;
      const barZone = W - pad * 2 - labelW - 14;
      r.topRecipes.forEach(([title, count], i) => {
        checkPageBreak(12);
        const bY = y;
        const pct = maxV > 0 ? count / maxV : 0;
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(40, 40, 40);
        doc.text(`${i + 1}.`, pad, bY + 5);
        const safeTitle = title.replace(/[^\x00-\x7E]/g, "").trim();
        doc.text(safeTitle.length > 38 ? safeTitle.slice(0, 36) + "..." : safeTitle, pad + 6, bY + 5);
        drawBgBar(pad + labelW, bY, barZone, 6);
        drawBar(pad + labelW, bY, Math.round(pct * barZone), 6, [45, 106, 79]);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(30, 30, 30);
        doc.text(String(count), W - pad, bY + 5, { align: "right" });
        y += 12;
      });
      y += 6;
    }

    // ── TOP RECEITAS MAIS SALVAS ──
    if (r.topSaved.length > 0) {
      checkPageBreak(12 + r.topSaved.length * 12);
      y = sectionTitle("Top Receitas Mais Salvas", y);
      const maxV2 = r.topSaved[0][1];
      const labelW2 = 80;
      const barZone2 = W - pad * 2 - labelW2 - 14;
      r.topSaved.forEach(([title, count], i) => {
        checkPageBreak(12);
        const bY = y;
        const pct = maxV2 > 0 ? count / maxV2 : 0;
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(40, 40, 40);
        doc.text(`${i + 1}.`, pad, bY + 5);
        const safeTitle = title.replace(/[^\x00-\x7E]/g, "").trim();
        doc.text(safeTitle.length > 38 ? safeTitle.slice(0, 36) + "..." : safeTitle, pad + 6, bY + 5);
        drawBgBar(pad + labelW2, bY, barZone2, 6);
        drawBar(pad + labelW2, bY, Math.round(pct * barZone2), 6, [212, 113, 35]);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(30, 30, 30);
        doc.text(String(count), W - pad, bY + 5, { align: "right" });
        y += 12;
      });
      y += 6;
    }

    // ── ORIGEM DO TRAFEGO ──
    checkPageBreak(20);
    if (r.topUtm.length > 0) {
      y = sectionTitle("Origem do Trafego (UTM)", y);
      const totalUtm = r.topUtm.reduce((s, [, v]) => s + v, 0);
      const labelW3 = 50;
      const barZone3 = W - pad * 2 - labelW3 - 20;
      r.topUtm.forEach(([src, count], i) => {
        checkPageBreak(12);
        const bY = y;
        const pct = totalUtm > 0 ? count / totalUtm : 0;
        if (i % 2 === 0) { doc.setFillColor(248, 250, 248); doc.roundedRect(pad, bY - 1, W - pad * 2, 11, 1, 1, "F"); }
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(40, 40, 40);
        doc.text(src.charAt(0).toUpperCase() + src.slice(1), pad + 3, bY + 5.5);
        drawBgBar(pad + labelW3, bY + 1, barZone3, 5);
        drawBar(pad + labelW3, bY + 1, Math.round(pct * barZone3), 5, [59, 130, 246]);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(45, 106, 79);
        doc.text(`${count} (${Math.round(pct * 100)}%)`, W - pad, bY + 5.5, { align: "right" });
        y += 12;
      });
      y += 6;
    } else {
      y = sectionTitle("Origem do Trafego (UTM)", y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(140, 140, 140);
      doc.text("Nenhum acesso via UTM no periodo. Adicione ?utm_source=instagram aos seus links.", pad + 3, y + 4);
      y += 12;
    }

    // ── RESUMO EXECUTIVO ──
    const boxH = 28;
    if (y + boxH < 285) {
      doc.setFillColor(45, 106, 79);
      doc.roundedRect(pad, y, W - pad * 2, boxH, 3, 3, "F");
      doc.setFillColor(64, 145, 108);
      doc.roundedRect(pad, y, 2, boxH, 1, 1, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
      doc.text("Resumo para Reunião", pad + 5, y + 7);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      const lines = [
        `• ${r.totalSessions} sessões abertas por ${r.uniqueUsers} usuários únicos — média de ${r.uniqueUsers > 0 ? (r.totalSessions / r.uniqueUsers).toFixed(1) : 0} acessos por pessoa.`,
        `• ${r.premiumUsers} assinantes Premium (${premiumRate}% da base ativa) — ${r.freeUsers} ainda no plano Free.`,
        `• Taxa de retorno: ${retentionRate}% — ${r.returningUsers} usuários voltaram mais de uma vez.`,
        `• ${r.recipeViews} views de receitas · ${r.recipeSaves} salvas (${saveRate}% de conversão) · ${r.planners} planners criados.`,
        `• Tempo médio por sessão: ${fmtDuration(r.avgDuration)}.`,
      ];
      lines.forEach((l, i) => {
        doc.text(l, pad + 5, y + 13 + i * 4.5, { maxWidth: W - pad * 2 - 8 });
      });
    }

    // FOOTER
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(170, 170, 170);
    doc.text(`Gosto Puro  ·  Relatório automático  ·  ${new Date().toLocaleString("pt-BR")}`, W / 2, 292, { align: "center" });

    doc.save(`gostopuro_relatorio_${r.period}dias.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">📊 Relatório para Reunião</h2>
          <p className="text-[11px] text-gray-400">Análise simplificada — pronta para apresentar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[3, 7, 14].map(d => (
              <button key={d} onClick={() => setPeriod(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${period === d ? "bg-white text-[#2D6A4F] shadow-sm" : "text-gray-500"}`}>
                {d}d
              </button>
            ))}
          </div>
          {report && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#2D6A4F] text-white rounded-xl text-xs font-semibold hover:bg-[#245a42] transition-all">
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button onClick={exportTXT}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 transition-all">
                <FileText className="w-3.5 h-3.5" />
                TXT
              </button>
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all">
                <FileDown className="w-3.5 h-3.5" />
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#2D6A4F]" /></div>
      ) : report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard emoji="📱" label="Sessões abertas" value={report.totalSessions} sub="vezes que o app foi aberto" color="green" />
            <KpiCard emoji="👤" label="Usuários ativos" value={report.uniqueUsers} sub={`${report.premiumUsers} Premium · ${report.freeUsers} Free`} color="blue" />
            <KpiCard emoji="↩️" label="Voltaram ao app" value={`${report.uniqueUsers > 0 ? Math.round((report.returningUsers / report.uniqueUsers) * 100) : 0}%`} sub={`${report.returningUsers} de ${report.uniqueUsers} usuários`} color="purple" />
            <KpiCard emoji="⏱" label="Tempo médio/sessão" value={fmtDuration(report.avgDuration)} sub="por visita ao app" color="amber" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiCard emoji="📖" label="Views de receitas" value={report.recipeViews} sub="total de visualizações" color="green" />
            <KpiCard emoji="❤️" label="Receitas salvas" value={report.recipeSaves} sub="pelo período" color="red" />
            <KpiCard emoji="📅" label="Planners criados" value={report.planners} sub="planos de refeição" color="blue" />
          </div>

          {report.topRecipes.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-3">🏆 Receitas mais vistas no período</p>
              <div className="space-y-2">
                {report.topRecipes.map(([title, count], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <p className="text-xs text-gray-700 truncate">{title}</p>
                        <span className="text-xs font-bold text-[#2D6A4F] ml-2">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-[#2D6A4F] h-1.5 rounded-full" style={{ width: `${Math.round((count / report.topRecipes[0][1]) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-700 mb-3">🔗 De onde vieram os usuários</p>
            {report.topUtm.length === 0 ? (
              <p className="text-[11px] text-gray-400">Sem tráfego via UTM no período. Use ?utm_source=instagram nos seus links.</p>
            ) : (
              <div className="space-y-2">
                {report.topUtm.map(([src, count], i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-gray-700 capitalize">{src}</p>
                    <span className="text-xs font-bold text-[#2D6A4F]">{count} visita{count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#2D6A4F] to-[#40916C] rounded-2xl p-4 text-white">
            <p className="text-xs font-bold mb-2 opacity-80 uppercase tracking-wide">💡 Resumo para a reunião</p>
            <p className="text-sm leading-relaxed">
              Nos últimos <strong>{report.period} dias</strong>, o Gosto Puro teve <strong>{report.uniqueUsers} usuários ativos</strong>, dos quais <strong>{report.premiumUsers} são assinantes Premium</strong>.
              {report.returningUsers > 0 && <> <strong>{report.returningUsers} pessoas voltaram ao app</strong> mais de uma vez.</>}
              {" "}As receitas foram visualizadas <strong>{report.recipeViews} vezes</strong> no total, e os usuários ficaram em média <strong>{fmtDuration(report.avgDuration)} por sessão</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ emoji, label, value, sub, color }) {
  const colors = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color] || colors.green}`}>
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
      <p className="text-[11px] font-semibold text-gray-600 mt-0.5">{label}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}