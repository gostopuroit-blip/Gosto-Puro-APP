import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trash2, CheckCircle2, XCircle, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";

const REPORT_REASONS = {
  spam: "Spam",
  inappropriate: "Contenuto inappropriato",
  hate_speech: "Incitamento all'odio",
  violence: "Violenza",
  misinformation: "Disinformazione",
  other: "Altro",
};

export default function AdminModeration() {
  const [section, setSection] = useState("reports"); // reports | blocked | users
  const [reports, setReports] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    loadData();
  }, [section]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (section === "reports") {
        const data = await base44.entities.PostReport.filter({ status: "pending" }, "-created_date", 100);
        setReports(data);
      } else if (section === "blocked") {
        const data = await base44.entities.UserBlock.list("-created_date", 100);
        setBlockedUsers(data);
      } else if (section === "users") {
        const data = await base44.entities.User.list("-created_date", 100);
        setUsers(data);
      }
    } catch (err) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleHidePost = async (report) => {
    if (!confirm("Ocultar este post?")) return;
    setActioning(report.id);
    try {
      await Promise.all([
        base44.entities.CommunityPost.update(report.reported_post_id, { status: "hidden" }),
        base44.entities.PostReport.update(report.id, { status: "resolved" }),
      ]);
      setReports(reports.filter((r) => r.id !== report.id));
      toast.success("Post ocultado");
    } catch (err) {
      toast.error("Erro ao ocultar post");
    } finally {
      setActioning(null);
    }
  };

  const handleDismissReport = async (reportId) => {
    setActioning(reportId);
    try {
      await base44.entities.PostReport.update(reportId, { status: "dismissed" });
      setReports(reports.filter((r) => r.id !== reportId));
      toast.success("Denúncia dispensada");
    } catch (err) {
      toast.error("Erro ao dispensar");
    } finally {
      setActioning(null);
    }
  };

  const handleResolveReport = async (reportId) => {
    setActioning(reportId);
    try {
      await base44.entities.PostReport.update(reportId, { status: "resolved" });
      setReports(reports.filter((r) => r.id !== reportId));
      toast.success("Denúncia resolvida");
    } catch (err) {
      toast.error("Erro ao resolver");
    } finally {
      setActioning(null);
    }
  };

  const handleToggleUserStatus = async (user) => {
    setActioning(user.id);
    try {
      const newStatus = user.status === "blocked" ? "active" : "blocked";
      await base44.auth.updateMe({ status: newStatus });
      setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
      toast.success(`Usuário ${newStatus === "blocked" ? "bloqueado" : "ativado"}`);
    } catch (err) {
      toast.error("Erro ao atualizar usuário");
    } finally {
      setActioning(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBlocked = blockedUsers.filter(
    (b) =>
      b.blocked_user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.blocker_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSection("reports")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            section === "reports"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Denúncias ({reports.length})
          </span>
        </button>
        <button
          onClick={() => setSection("blocked")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            section === "blocked"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Bloqueados ({blockedUsers.length})
          </span>
        </button>
        <button
          onClick={() => setSection("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            section === "users"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4" />
            Gerenciar Usuários ({users.length})
          </span>
        </button>
      </div>

      {/* Reports Section */}
      {section === "reports" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-sm">Nenhuma denúncia pendente</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-600 mb-1">
                      {REPORT_REASONS[report.reason] || report.reason}
                    </p>
                    <p className="text-sm text-gray-700 font-medium">
                      Denunciado por: {report.reporter_email || "Anônimo"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Autor: {report.reported_user_email}
                    </p>
                    {report.details && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        {report.details}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(report.created_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleHidePost(report)}
                    disabled={actioning === report.id}
                    className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                  >
                    {actioning === report.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Ocultar Post
                  </button>
                  <button
                    onClick={() => handleDismissReport(report.id)}
                    disabled={actioning === report.id}
                    className="flex-1 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 disabled:opacity-50 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                  >
                    {actioning === report.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    Dispensar
                  </button>
                  <button
                    onClick={() => handleResolveReport(report.id)}
                    disabled={actioning === report.id}
                    className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                  >
                    {actioning === report.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    Resolver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Blocked Users Section */}
      {section === "blocked" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-sm">Nenhum usuário bloqueado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBlocked.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {record.blocked_user_email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Bloqueado por: {record.blocker_email}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(record.created_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manage Users Section */}
      {section === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-sm">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {user.role} · Criado em {new Date(user.created_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleUserStatus(user)}
                    disabled={actioning === user.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      user.status === "blocked"
                        ? "bg-green-50 text-green-600 hover:bg-green-100"
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                    } disabled:opacity-50`}
                  >
                    {actioning === user.id ? (
                      <Loader2 className="w-3 h-3 animate-spin inline" />
                    ) : user.status === "blocked" ? (
                      "Desbloquear"
                    ) : (
                      "Bloquear"
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}