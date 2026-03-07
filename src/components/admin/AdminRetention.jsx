import { useMemo } from "react";

// Calculate D1/D7/D30 retention based on session_start events + user created_date
export default function AdminRetention({ events, allUsers }) {
  const retention = useMemo(() => {
    // Map user_email -> created_date (from User entity)
    const userCreated = {};
    allUsers.forEach(u => {
      if (u.email && u.created_date) {
        userCreated[u.email] = u.created_date.slice(0, 10);
      }
    });

    // Map user_email -> Set of dates they had a session
    const sessionDates = {};
    events.forEach(e => {
      if (e.event_type === "session_start" && e.user_email && e.date) {
        if (!sessionDates[e.user_email]) sessionDates[e.user_email] = new Set();
        sessionDates[e.user_email].add(e.date);
      }
    });

    // For each user, check if they returned on D1, D7, D30
    const cohorts = { d1: { base: 0, returned: 0 }, d7: { base: 0, returned: 0 }, d30: { base: 0, returned: 0 } };

    Object.entries(userCreated).forEach(([email, createdDate]) => {
      const dates = sessionDates[email] || new Set();
      const installDay = new Date(createdDate);

      const addDays = (d, n) => {
        const r = new Date(d);
        r.setDate(r.getDate() + n);
        return r.toISOString().slice(0, 10);
      };

      // D1
      const d1Target = addDays(installDay, 1);
      if (new Date(d1Target) <= new Date()) {
        cohorts.d1.base++;
        if (dates.has(d1Target)) cohorts.d1.returned++;
      }

      // D7
      const d7Target = addDays(installDay, 7);
      if (new Date(d7Target) <= new Date()) {
        cohorts.d7.base++;
        if (dates.has(d7Target)) cohorts.d7.returned++;
      }

      // D30
      const d30Target = addDays(installDay, 30);
      if (new Date(d30Target) <= new Date()) {
        cohorts.d30.base++;
        if (dates.has(d30Target)) cohorts.d30.returned++;
      }
    });

    const pct = (c) => c.base === 0 ? "—" : `${((c.returned / c.base) * 100).toFixed(1)}%`;

    return [
      { label: "Day 1", emoji: "📅", ...cohorts.d1, pct: pct(cohorts.d1), color: "text-blue-600 bg-blue-50" },
      { label: "Day 7", emoji: "📆", ...cohorts.d7, pct: pct(cohorts.d7), color: "text-purple-600 bg-purple-50" },
      { label: "Day 30", emoji: "🗓", ...cohorts.d30, pct: pct(cohorts.d30), color: "text-green-600 bg-green-50" },
    ];
  }, [events, allUsers]);

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-gray-400">Percentagem de usuários que voltaram ao app no dia exato D1/D7/D30 após o cadastro</p>
      <div className="grid grid-cols-3 gap-3">
        {retention.map(r => (
          <div key={r.label} className={`rounded-xl p-3 text-center ${r.color.split(" ")[1]}`}>
            <p className="text-base mb-1">{r.emoji}</p>
            <p className={`text-2xl font-bold ${r.color.split(" ")[0]}`}>{r.pct}</p>
            <p className="text-[11px] font-semibold text-gray-600">{r.label}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{r.returned}/{r.base} users</p>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-gray-400">* Apenas usuários com data de cadastro registrada e cujo dia alvo já passou são contabilizados.</p>
    </div>
  );
}