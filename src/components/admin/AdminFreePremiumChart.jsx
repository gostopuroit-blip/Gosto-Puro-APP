import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AdminFreePremiumChart({ events, days }) {
  // Build daily free vs premium session counts
  const dateMap = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dateMap[key] = { date: key.slice(5), free: 0, premium: 0 };
  }

  events
    .filter(e => e.event_type === "session_start")
    .forEach(e => {
      if (e.date && dateMap[e.date]) {
        if (e.user_plan === "premium") dateMap[e.date].premium += 1;
        else dateMap[e.date].free += 1;
      }
    });

  const data = Object.values(dateMap);

  if (data.every(d => d.free === 0 && d.premium === 0)) {
    return <p className="text-xs text-gray-400">Sem dados no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
          formatter={(v, name) => [v, name === "free" ? "Free" : "Premium"]}
        />
        <Legend formatter={v => v === "free" ? "Free" : "Premium"} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="free" fill="#9CA3AF" radius={[3, 3, 0, 0]} />
        <Bar dataKey="premium" fill="#D4A846" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}