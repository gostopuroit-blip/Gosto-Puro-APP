import { useMemo, useState } from "react";
import { Flame, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

function calcDayKcal(day, recipesMap) {
  let total = 0;
  ["colazione", "pranzo", "snack", "cena"].forEach(meal => {
    const id = day[`${meal}_id`];
    const servings = day[`${meal}_servings`];
    if (!id) return;
    const r = recipesMap[id];
    if (!r) return;
    const baseServings = r.servings || 1;
    const ratio = servings ? servings / baseServings : 1;
    total += (Number(r.calorie) || Number(r.calories) || 0) * ratio;
  });
  return Math.round(total);
}

export default function KcalCounter({ plan, recipes, selectedDay, dailyKcal }) {
  const [expanded, setExpanded] = useState(false);

  const { totalKcal, avgDailyKcal, dayKcals } = useMemo(() => {
    if (!plan?.plan_data) return { totalKcal: 0, avgDailyKcal: 0, dayKcals: [] };
    const dayKcals = plan.plan_data.map(day => calcDayKcal(day, recipes));
    const totalKcal = dayKcals.reduce((a, b) => a + b, 0);
    const avgDailyKcal = plan.plan_data.length > 0 ? Math.round(totalKcal / plan.plan_data.length) : 0;
    return { totalKcal, avgDailyKcal, dayKcals };
  }, [plan, recipes]);

  const currentDayKcal = dayKcals[selectedDay] || 0;
  const targetKcal = dailyKcal || 0;
  const progressPct = targetKcal > 0 ? Math.min(100, Math.round((currentDayKcal / targetKcal) * 100)) : null;

  if (totalKcal === 0) return null;

  return (
    <div className="mx-5 mb-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30 overflow-hidden">
      {/* Main row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">Oggi</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {currentDayKcal.toLocaleString()} kcal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
              <TrendingUp className="w-3 h-3" /> Totale piano
            </p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {totalKcal.toLocaleString()} kcal
            </p>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          }
        </div>
      </button>

      {/* Progress bar toward target */}
      {progressPct !== null && (
        <div className="px-4 pb-3 -mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {progressPct}% dell'obiettivo ({targetKcal.toLocaleString()} kcal)
            </span>
          </div>
          <div className="w-full h-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded: monthly summary + per-day mini bars */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-orange-100 dark:border-orange-900/20 mt-1 pt-3">
          {/* Summary pills */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-white dark:bg-[#1A1A1A] rounded-xl px-3 py-2.5 text-center border border-orange-100 dark:border-orange-900/20">
              <p className="text-base font-bold text-gray-900 dark:text-white">{avgDailyKcal.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">kcal media/giorno</p>
            </div>
            <div className="flex-1 bg-white dark:bg-[#1A1A1A] rounded-xl px-3 py-2.5 text-center border border-orange-100 dark:border-orange-900/20">
              <p className="text-base font-bold text-gray-900 dark:text-white">{totalKcal.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">kcal totali piano</p>
            </div>
          </div>

          {/* Per-day mini chart */}
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            kcal per giorno
          </p>
          <div className="flex items-end gap-1" style={{ height: 52 }}>
            {dayKcals.map((kcal, i) => {
              const max = Math.max(...dayKcals, 1);
              const barH = Math.max(4, Math.round((kcal / max) * 44));
              const isToday = i === selectedDay;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`Giorno ${i + 1}: ${kcal} kcal`}>
                  <div
                    className={`w-full rounded-t-sm transition-all ${isToday ? "bg-orange-400" : "bg-orange-200 dark:bg-orange-900/40"}`}
                    style={{ height: barH }}
                  />
                  {dayKcals.length <= 14 && (
                    <span className={`text-[9px] font-semibold ${isToday ? "text-orange-500" : "text-gray-400"}`}>
                      {i + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}