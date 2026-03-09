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

    const sessionStarts = ev.filter(e => e.event_type === "session_start");
    const sessionEnds = ev.filter(e => e.event_type === "session_end" && e.session_duration_seconds > 0);
    const recipeViews = ev.filter(e => e.event_type === "recipe_view");
    const recipeSaves = ev.filter(e => e.event_type === "recipe_saved");
    const planners = ev.filter(e => e.event_type === "planner_created");
    const utmVisits = ev.filter(e => e.event_type === "utm_visit");

    const uniqueUsers = new Set(sessionStarts.filter(e => e.user_email).map(e => e.user_email));
    const freeUsers = new Set(sessionStarts.filter(e => e.user_plan === "free" && e.user_email).map(e => e.user_email));
    const premiumUsers = new Set(sessionStarts.filter(e => e.user_plan === "premium" && e.user_email).map(e => e.user_email));

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
    sessionStarts.forEach(e => { if (e.user_email) sessionsByUser[e.user_email] = (sessionsByUser[e.user_email] || 0) + 1; });
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
    const freeRate = 100 - premiumRate;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const pad = 15;
    let y = 0;

    const drawPieSlice = (cx, cy, r, startAngle, endAngle, color) => {
      doc.setFillColor(...color);
      const steps = Math.max(12, Math.round((endAngle - startAngle) * 20));
      const pts = [[cx, cy]];
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + (i / steps) * (endAngle - startAngle);
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      for (let i = 1; i < pts.length - 1; i++) {
        doc.triangle(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "F");
      }
    };

    const drawPieChart = (cx, cy, r, segments) => {
      const total = segments.reduce((s, seg) => s + seg.value, 0);
      if (!total) return;
      let angle = -Math.PI / 2;
      segments.forEach(seg => {
        const slice = (seg.value / total) * 2 * Math.PI;
        drawPieSlice(cx, cy, r, angle, angle + slice, seg.color);
        angle += slice;
      });
    };

    const drawBar = (x, barY, w, h, color) => {
      doc.setFillColor(...color);
      doc.roundedRect(x, barY, Math.max(1, w), h, 1, 1, "F");
    };

    const sectionTitle = (title, sY) => {
      doc.setFillColor(45, 106, 79);
      doc.rect(pad, sY, W - pad * 2, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(title, pad + 3, sY + 4.8);
      doc.setTextColor(30, 30, 30);
      return sY + 10;
    };

    // COVER
    doc.setFillColor(45, 106, 79);
    doc.rect(0, 0, W, 45, "F");
    doc.setFillColor(64, 145, 108);
    doc.rect(0, 38, W, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("Gosto Puro", pad, 18);
    doc.setFontSize(12);
    doc.text("Relatório de Engajamento", pad, 28);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${r.dateRange}  |  Últimos ${r.period} dias  |  Gerado: ${new Date().toLocaleString("pt-BR")}`, pad, 42);

    y = 54;
    doc.setTextColor(30, 30, 30);

    // KPI CARDS
    const kpis = [
      { label: "Sessões Abertas", value: r.totalSessions, color: [209, 236, 224] },
      { label: "Usuários Únicos", value: r.uniqueUsers, color: [219, 234, 254] },
      { label: "Taxa de Retorno", value: `${retentionRate}%`, color: [237, 233, 254] },
      { label: "Tempo Médio/Sessão", value: fmtDuration(r.avgDuration), color: [254, 243, 199] },
      { label: "Usuários Premium", value: r.premiumUsers, color: [253, 230, 138] },
      { label: "Usuários Free", value: r.freeUsers, color: [226, 232, 240] },
      { label: "Views de Receitas", value: r.recipeViews, color: [209, 236, 224] },
      { label: "Receitas Salvas", value: r.recipeSaves, color: [254, 202, 202] },
    ];
    const cardW = (W - pad * 2 - 9) / 4;
    const cardH = 20;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const kpi = kpis[row * 4 + col];
        if (!kpi) continue;
        const kx = pad + col * (cardW + 3);
        const ky = y + row * (cardH + 3);
        doc.setFillColor(...kpi.color);
        doc.roundedRect(kx, ky, cardW, cardH, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text(String(kpi.value), kx + cardW / 2, ky + 9, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(80, 80, 80);
        doc.text(kpi.label, kx + cardW / 2, ky + 15, { align: "center" });
      }
    }
    y += 2 * (cardH + 3) + 8;

    // PIE CHARTS
    y = sectionTitle("Distribuição de Usuários", y);
    const pieY = y + 22;
    const pieR = 18;

    // Pie 1: Free vs Premium
    const pie1cx = pad + 25;
    drawPieChart(pie1cx, pieY, pieR, [
      { value: r.freeUsers, color: [148, 163, 184] },
      { value: r.premiumUsers, color: [251, 191, 36] },
    ]);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 30, 30);
    doc.text("Free vs Premium", pie1cx, pieY + pieR + 5, { align: "center" });
    doc.setFillColor(148, 163, 184); doc.circle(pie1cx - 10, pieY + pieR + 9, 1.5, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text(`Free ${freeRate}%`, pie1cx - 7, pieY + pieR + 9.5);
    doc.setFillColor(251, 191, 36); doc.circle(pie1cx + 4, pieY + pieR + 9, 1.5, "F");
    doc.text(`Premium ${premiumRate}%`, pie1cx + 7, pieY + pieR + 9.5);

    // Pie 2: Retorno
    const pie2cx = pad + 90;
    drawPieChart(pie2cx, pieY, pieR, [
      { value: r.returningUsers, color: [45, 106, 79] },
      { value: Math.max(0, r.uniqueUsers - r.returningUsers), color: [209, 236, 224] },
    ]);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 30, 30);
    doc.text("Usuários que Voltaram", pie2cx, pieY + pieR + 5, { align: "center" });
    doc.setFillColor(45, 106, 79); doc.circle(pie2cx - 12, pieY + pieR + 9, 1.5, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text(`Voltaram ${retentionRate}%`, pie2cx - 9, pieY + pieR + 9.5);
    doc.setFillColor(209, 236, 224); doc.circle(pie2cx + 5, pieY + pieR + 9, 1.5, "F");
    doc.text(`1ª visita ${100 - retentionRate}%`, pie2cx + 8, pieY + pieR + 9.5);

    // Pie 3: UTM
    const pie3cx = pad + 160;
    if (r.topUtm.length > 0) {
      const pieColors = [[59,130,246],[239,68,68],[245,158,11],[16,185,129],[139,92,246]];
      const top4 = r.topUtm.slice(0, 4);
      const othersVal = r.topUtm.slice(4).reduce((s, [, v]) => s + v, 0);
      const pieSeg = top4.map(([, v], i) => ({ value: v, color: pieColors[i] }));
      if (othersVal > 0) pieSeg.push({ value: othersVal, color: [156, 163, 175] });
      drawPieChart(pie3cx, pieY, pieR, pieSeg);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 30, 30);
      doc.text("Tráfego por Fonte", pie3cx, pieY + pieR + 5, { align: "center" });
      top4.slice(0, 3).forEach(([src], i) => {
        doc.setFillColor(...pieColors[i]);
        doc.circle(pie3cx - 12, pieY + pieR + 9 + i * 4.5, 1.5, "F");
        doc.setFontSize(6); doc.setFont("helvetica", "normal");
        doc.text(src.slice(0, 12), pie3cx - 9, pieY + pieR + 9.5 + i * 4.5);
      });
    } else {
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(130, 130, 130);
      doc.text("Sem UTM no período", pie3cx, pieY, { align: "center" });
    }

    y = pieY + pieR + 22;

    // TOP RECIPES BAR
    if (r.topRecipes.length > 0) {
      y = sectionTitle("Top Receitas Mais Vistas", y);
      const maxV = r.topRecipes[0][1];
      const maxBarW = W - pad * 2 - 70;
      r.topRecipes.forEach(([title, count], i) => {
        const barY = y + i * 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
        doc.text(`${i + 1}. ${title.length > 30 ? title.slice(0, 28) + "…" : title}`, pad, barY + 4);
        drawBar(pad + 68, barY, Math.round((count / maxV) * maxBarW), 5, [45, 106, 79]);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
        doc.text(String(count), pad + 68 + Math.round((count / maxV) * maxBarW) + 2, barY + 4);
      });
      y += r.topRecipes.length * 10 + 6;
    }

    // TOP SAVED BAR
    if (r.topSaved.length > 0) {
      y = sectionTitle("Top Receitas Mais Salvas", y);
      const maxV = r.topSaved[0][1];
      const maxBarW = W - pad * 2 - 70;
      r.topSaved.forEach(([title, count], i) => {
        const barY = y + i * 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
        doc.text(`${i + 1}. ${title.length > 30 ? title.slice(0, 28) + "…" : title}`, pad, barY + 4);
        drawBar(pad + 68, barY, Math.round((count / maxV) * maxBarW), 5, [212, 113, 35]);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(30, 30, 30);
        doc.text(String(count), pad + 68 + Math.round((count / maxV) * maxBarW) + 2, barY + 4);
      });
      y += r.topSaved.length * 10 + 6;
    }

    // UTM TABLE
    if (r.topUtm.length > 0) {
      y = sectionTitle("Origem do Tráfego (UTM)", y);
      r.topUtm.forEach(([src, count], i) => {
        if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(pad, y + i * 8, W - pad * 2, 8, "F"); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
        doc.text(src, pad + 3, y + i * 8 + 5.5);
        doc.setFont("helvetica", "bold"); doc.setTextColor(45, 106, 79);
        doc.text(`${count} visita${count !== 1 ? "s" : ""}`, W - pad - 3, y + i * 8 + 5.5, { align: "right" });
      });
      y += r.topUtm.length * 8 + 6;
    }

    // INSIGHT BOX
    if (y < 262) {
      doc.setFillColor(45, 106, 79);
      doc.roundedRect(pad, y, W - pad * 2, 18, 3, 3, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
      doc.text("Resumo Executivo", pad + 4, y + 6);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      const summary = `${r.uniqueUsers} usuários ativos · ${r.premiumUsers} Premium (${premiumRate}%) · ${r.returningUsers} voltaram (${retentionRate}%) · ${r.recipeViews} views · ${fmtDuration(r.avgDuration)}/sessão`;
      doc.text(summary, pad + 4, y + 13, { maxWidth: W - pad * 2 - 8 });
    }

    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text("Gosto Puro — Relatório automático", W / 2, 290, { align: "center" });

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