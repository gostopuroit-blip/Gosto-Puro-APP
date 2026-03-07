import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminSessionsChart({ events, days }) {
  // Build daily sessions count
  const countsByDay = {};
  const sessionStarts = events.filter(e => e.event_type === "session_start");

  // Initialize all days in range
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    countsByDay[key] = { date: key, sessions: 0, users: new Set() };
  }

  sessionStarts.forEach(e => {
    if (e.date && countsByDay[e.date]) {
      countsByDay[e.date].sessions += 1;
      if (e.user_email) countsByDay[e.date].users.add(e.user_email);
    }
  });

  const data = Object.values(countsByDay).map(d => ({
    date: d.date.slice(5), // MM-DD
    sessões: d.sessions,
    usuários: d.users.size,
  }));

  if (data.every(d => d.sessões === 0)) {
    return <p className="text-xs text-gray-400 text-center py-4">Sem dados de sessões no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
          formatter={(v, n) => [v, n]}
        />
        <Bar dataKey="sessões" fill="#2D6A4F" radius={[3, 3, 0, 0]} />
        <Bar dataKey="usuários" fill="#82c9a5" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}