import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const PERIOD_OPTIONS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "Anual", days: 365 },
];

export default function PremiumConversionsChart() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    base44.functions.invoke('adminGetUsersV2').then((res) => {
      const raw = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      setUsers(Array.isArray(raw) ? raw : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Filter premium users whose updated_date falls within the selected period
  const premiumUsers = useMemo(() => {
    return users.filter((u) => u.plan === "premium");
  }, [users]);

  const chartData = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, selectedDays);

    // For longer periods, group by week; for 7 days, group by day
    const groupByWeek = selectedDays >= 60;

    if (groupByWeek) {
      // Group by week
      const weeks = eachWeekOfInterval({ start: startDate, end: now }, { weekStartsOn: 1 });
      return weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = premiumUsers.filter((u) => {
          const d = new Date(u.updated_date || u.created_date);
          return isWithinInterval(d, { start: weekStart, end: weekEnd }) && d >= startDate;
        }).length;
        return {
          label: format(weekStart, "dd/MM", { locale: it }),
          conversões: count,
        };
      });
    } else {
      // Group by day
      const days = eachDayOfInterval({ start: startDate, end: now });
      return days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const count = premiumUsers.filter((u) => {
          const d = new Date(u.updated_date || u.created_date);
          return format(d, "yyyy-MM-dd") === dayStr;
        }).length;
        return {
          label: format(day, selectedDays <= 7 ? "EEE dd" : "dd/MM", { locale: it }),
          conversões: count,
        };
      });
    }
  }, [premiumUsers, selectedDays]);

  const totalConversions = useMemo(() => {
    const startDate = subDays(new Date(), selectedDays);
    return premiumUsers.filter((u) => {
      const d = new Date(u.updated_date || u.created_date);
      return d >= startDate;
    }).length;
  }, [premiumUsers, selectedDays]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-[#2D6A4F] animate-spin" /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Conversões Free → Premium</p>
            <p className="text-xs text-gray-400">{totalConversions} conversões no período</p>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setSelectedDays(opt.days)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedDays === opt.days
                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              interval={selectedDays <= 7 ? 0 : selectedDays <= 30 ? 4 : "preserveStartEnd"}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #F3F4F6", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(value) => [value, "Conversões"]}
            />
            <Area
              type="monotone"
              dataKey="conversões"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="url(#premiumGradient)"
              dot={false}
              activeDot={{ r: 5, fill: "#F59E0B", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="text-center">
          <p className="text-lg font-bold text-amber-500">{premiumUsers.length}</p>
          <p className="text-[10px] text-gray-400">Total premium</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{totalConversions}</p>
          <p className="text-[10px] text-gray-400">No período</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[#2D6A4F]">
            {users.length > 0 ? Math.round((premiumUsers.length / users.length) * 100) : 0}%
          </p>
          <p className="text-[10px] text-gray-400">Taxa premium</p>
        </div>
      </div>
    </div>
  );
}