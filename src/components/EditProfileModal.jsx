import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function EditProfileModal({ user, onClose, onSave }) {
  const [displayName, setDisplayName] = useState(user?.display_name || user?.full_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [photoPreview, setPhotoPreview] = useState(user?.photo_url || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const bioLimit = 150;
  const bioRemaining = bioLimit - bio.length;
  const isFormValid = displayName.trim().length > 0;

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoPreview(evt.target?.result);
      setPhotoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
      setPhotoPreview(file_url);
      setPhotoFile(null);
      toast.success("Foto caricata!");
    } catch (error) {
      toast.error("Errore nel caricamento della foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isFormValid) {
      toast.error("Nome è obbligatorio");
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: displayName.trim(),
        bio: bio.trim(),
        photo_url: photoPreview,
      });
      toast.success("Profilo aggiornato! ✅");
      onSave?.();
      onClose?.();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Errore nel salvataggio del profilo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 pb-28 overflow-y-auto">
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl w-full max-w-md shadow-xl flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Modifica Profilo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Photo */}
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Foto Profilo</label>
            <div className="mt-3 flex flex-col gap-3">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#111] flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">👤</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#2D6A4F] rounded-full flex items-center justify-center shadow-md hover:bg-[#235c43] transition"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
              {photoFile && (
                <button
                  onClick={handleUploadPhoto}
                  disabled={uploading}
                  className="text-xs font-semibold text-[#2D6A4F] bg-[#2D6A4F]/10 px-3 py-1.5 rounded-lg hover:bg-[#2D6A4F]/20 transition disabled:opacity-50"
                >
                  {uploading ? (
                    <><Loader2 className="w-3 h-3 inline mr-1 animate-spin" /> Caricamento...</>
                  ) : (
                    "Conferma foto"
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Nome Display *
            </label>
            <Input
              type="text"
              placeholder="Es. Marco Rossi"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="mt-2 h-10 text-sm rounded-lg border-gray-200 dark:bg-[#111] dark:border-[#2A2A2A] dark:text-white"
            />
            <p className="text-[10px] text-gray-400 mt-1">Visibile nel profilo pubblico</p>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Bio
            </label>
            <textarea
              placeholder="Una breve presentazione di te... (max 150 caratteri)"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, bioLimit))}
              rows={3}
              className="mt-2 w-full p-3 text-sm rounded-lg border border-gray-200 dark:bg-[#111] dark:border-[#2A2A2A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/50"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-gray-400">Presenta i tuoi interessi culinari</p>
              <span className={`text-[10px] font-semibold ${bioRemaining < 20 ? "text-red-500" : "text-gray-400"}`}>
                {bioRemaining}/{bioLimit}
              </span>
            </div>
          </div>


        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !isFormValid}
            className="flex-1 bg-[#2D6A4F] hover:bg-[#235c43] text-white rounded-lg"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvataggio...</>
            ) : (
              "Salva Profilo"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}