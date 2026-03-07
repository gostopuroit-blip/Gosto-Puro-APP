import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const data = await base44.entities.EmailTemplate.list("-created_date", 50);
    setTemplates(data);
    setLoading(false);
  };

  const handleEdit = (template) => {
    setEditing(template.id);
    setForm({ name: template.name, subject: template.subject, body: template.body, is_active: template.is_active });
  };

  const handleNew = () => {
    setEditing("new");
    setForm({ name: "", subject: "", body: "", is_active: true });
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) {
      alert("Preencha todos os campos");
      return;
    }
    
    setSaving(true);
    try {
      if (editing === "new") {
        await base44.entities.EmailTemplate.create(form);
      } else {
        await base44.entities.EmailTemplate.update(editing, form);
      }
      await loadTemplates();
      setEditing(null);
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza?")) return;
    await base44.entities.EmailTemplate.delete(id);
    await loadTemplates();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  if (editing) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="text-lg font-bold mb-4">{editing === "new" ? "Novo Template" : "Editar Template"}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do template</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="Ex: Daily Recipe Email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({...form, subject: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="🍽️ As receitas de hoje"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Body (HTML)</label>
            <p className="text-xs text-gray-500 mb-2">Use <code className="bg-gray-100 px-1 rounded">{'{'}{'{''}USER_NAME{'}'}{'}'}}</code> e <code className="bg-gray-100 px-1 rounded">{'{'}{'{''}RECIPE_LIST{'}'}{'}'}}</code> como placeholders</p>
            <textarea
              value={form.body}
              onChange={(e) => setForm({...form, body: e.target.value})}
              className="w-full h-64 px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
              placeholder="<h2>Olá {{USER_NAME}}</h2><p>{{RECIPE_LIST}}</p>"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({...form, is_active: e.target.checked})}
            />
            <span className="text-sm text-gray-700">Template ativo (será usado no envio)</span>
          </label>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
            <Button onClick={() => setEditing(null)} variant="outline">Cancelar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Email Templates</h2>
          <p className="text-sm text-gray-500">Customize o email enviado aos usuários</p>
        </div>
        <Button onClick={handleNew} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <div className="grid gap-3">
        {templates.length === 0 ? (
          <p className="text-center py-8 text-gray-400">Nenhum template criado ainda</p>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  {t.is_active && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Ativo</span>}
                </div>
                <p className="text-sm text-gray-600 truncate">Subject: {t.subject}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{String(t.body).replace(/<[^>]*>/g, '').substring(0, 100).concat('...')}</p>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <Button onClick={() => handleEdit(t)} size="sm" variant="outline">Editar</Button>
                <Button onClick={() => handleDelete(t.id)} size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}