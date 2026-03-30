import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Camera, Check, Loader2, ShieldCheck, Crown, Moon, Sun, Trash2, Bell, BellOff, Download, Users, Mail, MessageCircle, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PremiumBadge } from "@/components/PremiumGate";
import { trackEvent } from "@/components/useAnalytics";
import SavedPostsTab from "@/components/community/SavedPostsTab";
import ProfileStatsCard from "@/components/community/ProfileStatsCard";
import UserPostsTab from "@/components/community/UserPostsTab";




export default function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [notifStatus, setNotifStatus] = useState("idle"); // idle | subscribed | denied | asking | unsupported
  const [installPrompt, setInstallPrompt] = useState(() => window.__pwaInstallPrompt || null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // profile | saved | posts

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsInstalled(true);
    }
    // Sync from global in case it fired before this mount
    if (window.__pwaInstallPrompt) {
      setInstallPrompt(window.__pwaInstallPrompt);
    }
  }, []);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    trackEvent("pwa_install_click", { occasion_label: "profile_install_click" });
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setInstallPrompt(null);
      window.__pwaInstallPrompt = null;
      toast.success("App installata! 🎉");
    }
  };

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotifStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setNotifStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      // Check if actually subscribed
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setNotifStatus(sub ? "subscribed" : "idle");
        });
      });
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (notifStatus === "asking") return;

    if (notifStatus === "subscribed") {
      // Unsubscribe
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        setNotifStatus("idle");
        toast.success("Notifiche disattivate");
      } catch {
        toast.error("Errore nella disattivazione");
      }
      return;
    }

    if (notifStatus === "denied") {
      toast.error("Notifiche bloccate — abilitale nelle impostazioni del browser");
      return;
    }

    // Subscribe
    setNotifStatus("asking");
    try {
      // Step 1: Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(`Permesso notifiche: ${permission}`);
        setNotifStatus("denied");
        return;
      }

      // Step 2: Get VAPID key
      const keyRes = await base44.functions.invoke("getVapidPublicKey");
      const vapidPublicKey = keyRes.data?.publicKey;
      if (!vapidPublicKey) {
        toast.error("Chiave VAPID non trovata nel server");
        setNotifStatus("idle");
        return;
      }

      // Step 3: Wait for service worker
      if (!navigator.serviceWorker.controller) {
        toast.error("Service Worker non attivo — riprova dopo aver installato la PWA");
        setNotifStatus("idle");
        return;
      }

      function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
        return outputArray;
      }

      // Step 4: Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (subErr) {
        toast.error(`Errore subscribe: ${subErr.message}`);
        setNotifStatus("idle");
        return;
      }

      // Step 5: Save to server
      const { endpoint, keys } = subscription.toJSON();
      const saveRes = await base44.functions.invoke("savePushSubscription", { endpoint, p256dh: keys.p256dh, auth: keys.auth });
      if (saveRes.data?.error) {
        toast.error(`Errore salvataggio: ${saveRes.data.error}`);
        setNotifStatus("idle");
        return;
      }

      setNotifStatus("subscribed");
      toast.success("Notifiche attivate! 🔔 Controlla il banco dati.");
    } catch (err) {
      console.error("Push subscription error:", err);
      setNotifStatus("idle");
      toast.error(`Errore: ${err.message}`);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const u = await base44.auth.me().catch(() => null);
    if (u) {
      setUser(u);
      setName(u.display_name || u.full_name || "");
      setAge(u.age != null ? String(u.age) : "");
      setPhotoUrl(u.photo_url || "");
      // Restore theme preference saved on user
      if (u.dark_mode) {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const toggleDarkMode = async () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    try {
      await base44.auth.updateMe({ dark_mode: next });
    } catch (error) {
      toast.error("Errore nel salvataggio della modalità scura");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: name,
        age: age ? parseInt(age) : null,
        photo_url: photoUrl,
        dark_mode: darkMode,
      });
      toast.success("Profilo aggiornato! ✅");
    } catch (error) {
      toast.error("Errore nel salvataggio del profilo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
      </div>
    );
  }



  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Il mio Profilo</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Personalizza la tua esperienza</p>
          </div>
          {user && <PremiumBadge user={user} />}
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
              activeTab === "profile"
                ? "bg-[#2D6A4F] text-white"
                : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 dark:text-gray-400"
            }`}
          >
            Profilo
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
              activeTab === "posts"
                ? "bg-[#2D6A4F] text-white"
                : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 dark:text-gray-400"
            }`}
          >
            📝 Post
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-2 ${
              activeTab === "saved"
                ? "bg-[#2D6A4F] text-white"
                : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 dark:text-gray-400"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Salvati
          </button>
        </div>
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && user && (
        <div className="px-5 py-6">
          <UserPostsTab userEmail={user.email} currentUser={user} />
        </div>
      )}

      {/* Saved posts tab */}
      {activeTab === "saved" && user && (
        <div className="px-5">
          <SavedPostsTab currentUser={user} />
        </div>
      )}

      {/* Profile tab */}
      {activeTab === "profile" && (
        <>
          {/* Avatar + Name */}
          <div className="px-5 mt-4">
        <div className="bg-white dark:bg-[#2D3F35] rounded-3xl p-5 shadow-sm border border-gray-50 dark:border-[#3D5246]">
          <div className="flex items-center gap-4">
            {/* Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#F0F7F4] dark:bg-[#1A2B20] flex items-center justify-center">
                {photoUrl ? (
                  <img src={photoUrl} alt="Foto profilo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
              </div>
              <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#2D6A4F] rounded-full flex items-center justify-center cursor-pointer shadow-md">
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            {/* Name + Age */}
               <div className="flex-1 space-y-2">
                 <div>
                   <label className="text-[13px] text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">Nome</label>
                   <Input
                     type="text"
                     placeholder="Es. il tuo nome"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="mt-1 h-8 text-sm rounded-xl border-gray-100 dark:bg-[#1A2B20] dark:border-[#3D5246] dark:text-white text-gray-900"
                   />
                   <p className="text-[13px] text-gray-600 dark:text-gray-400">{user?.email}</p>
                 </div>
                 <div>
                   <label className="text-[13px] text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">Età</label>
                   <Input
                     type="number"
                     placeholder="Es. 28"
                     value={age}
                     onChange={(e) => setAge(e.target.value)}
                     className="mt-1 h-8 text-sm rounded-xl border-gray-100 dark:bg-[#1A2B20] dark:border-[#3D5246] dark:text-white w-24 text-gray-900"
                   />
                 </div>
               </div>
             </div>

             {/* Stats */}
             {user && (
               <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2A2A2A]">
                 <ProfileStatsCard userEmail={user.email} />
               </div>
             )}
            </div>
            </div>

      {/* Notifications */}
      {notifStatus !== "unsupported" && (
        <div className="px-5 mt-4">
          <div className="bg-white dark:bg-[#2D3F35] rounded-3xl p-5 shadow-sm border border-gray-50 dark:border-[#3D5246] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notifStatus === "subscribed" ? "bg-green-100 dark:bg-green-900/40" : "bg-gray-100 dark:bg-[#1A2B20]"}`}>
                {notifStatus === "subscribed"
                  ? <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                  : notifStatus === "denied"
                    ? <BellOff className="w-5 h-5 text-red-400" />
                    : <Bell className="w-5 h-5 text-gray-400" />
                }
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Notifiche</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {notifStatus === "subscribed" ? "Attive — ricevi le ricette del giorno" : notifStatus === "denied" ? "Bloccate nelle impostazioni" : "Ricevi le ricette ogni giorno"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleNotifications}
              disabled={notifStatus === "asking" || notifStatus === "subscribed"}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${notifStatus === "subscribed" ? "bg-[#2D6A4F]" : "bg-gray-200"} disabled:opacity-60`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${notifStatus === "subscribed" ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      )}

      {/* Install PWA — sempre visibile */}
      <div className="px-5 mt-4">
        <div className="bg-white dark:bg-[#2D3F35] rounded-3xl p-5 shadow-sm border border-gray-50 dark:border-[#3D5246] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F0F7F4] dark:bg-[#1A2B20] flex items-center justify-center">
              <Download className="w-5 h-5 text-[#2D6A4F]" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Installa App</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Aggiungi alla schermata Home</p>
            </div>
          </div>
          {installPrompt ? (
            <button
              onClick={handleInstallPWA}
              className="bg-[#2D6A4F] text-white text-[13px] font-bold px-4 py-2 rounded-xl"
            >
              Installa
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] text-gray-400 text-right max-w-[120px]">Tocca <strong>⎋</strong> poi "Aggiungi a Home"</p>
            </div>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="px-5 mt-4">
        <div className="bg-white dark:bg-[#2D3F35] rounded-3xl p-5 shadow-sm border border-gray-50 dark:border-[#3D5246] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-[#1A2B20] flex items-center justify-center">
              {darkMode ? <Moon className="w-5 h-5 text-gray-700 dark:text-gray-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Modalità Scura</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Cambia l'aspetto dell'app</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${darkMode ? "bg-[#2D6A4F]" : "bg-gray-200"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${darkMode ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>



      {/* Support Cards */}
      <div className="px-5 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card - Supporto Account */}
        <a
          href="https://wa.me/393793246752"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-br from-green-50 dark:from-green-950/20 to-emerald-50 dark:to-emerald-950/20 rounded-2xl p-5 border border-green-100 dark:border-green-900/40 shadow-sm hover:shadow-md hover:scale-105 transition-all"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💎</span>
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Supporto Account</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 flex-1">Per domande su abbonamenti, piano Premium e gestione account</p>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold text-xs">
              <MessageCircle className="w-4 h-4" />
              Contattaci su WhatsApp
            </div>
          </div>
        </a>

        {/* Card - Supporto Tecnico */}
        <a
          href="mailto:supporto@gostopuro.it"
          className="bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-cyan-50 dark:to-cyan-950/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/40 shadow-sm hover:shadow-md hover:scale-105 transition-all"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🛠️</span>
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Supporto Tecnico</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 flex-1">Per segnalare bug, problemi tecnici o domande sull'app</p>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs">
              <Mail className="w-4 h-4" />
              Invia un'email
            </div>
          </div>
        </a>
      </div>

      {/* Save Button */}
      <div className="px-5 mt-8">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-6 rounded-2xl bg-[#2D6A4F] hover:bg-[#235c43] font-bold shadow-lg shadow-[#2D6A4F]/20"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
          Salva profilo
        </Button>
      </div>

      {/* Abbonamento */}
      <div className="px-5 mt-4">
        <div className="bg-gradient-to-r from-amber-50 dark:from-amber-950/20 to-yellow-50 dark:to-yellow-950/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/40 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800 dark:text-white">
              {user?.plan === "premium" || user?.role === "admin" ? "Piano Premium attivo ✨" : "Piano Base"}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              {user?.plan === "premium" || user?.role === "admin"
                ? "Hai accesso completo a tutte le funzionalità"
                : "Sblocca Planner, Occasioni Speciali e molto altro"}
            </p>

          </div>
          {(!user?.plan || user?.plan === "free") && user?.role !== "admin" && (
            <a
              href="https://pay.hotmart.com/L104095305F?off=y6zj0nlm&checkoutMode=10"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("premium_click", { source: "profile" })}
              className="bg-amber-500 dark:bg-amber-600 text-white text-[13px] font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
            >
              Upgrade
            </a>
          )}
        </div>
      </div>

      {/* Community Button — admin only */}
      {user?.role === "admin" && (
        <div className="px-5 mt-4">
          <Link to="/Community" className="w-full block">
            <div className="bg-gradient-to-r from-[#2D6A4F]/10 to-[#40916C]/10 dark:from-[#2D6A4F]/20 dark:to-[#40916C]/20 rounded-2xl p-4 border border-[#2D6A4F]/20 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2D6A4F] rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800 dark:text-white">Comunità 🧪</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Condividi, ispira e scopri ricette</p>
              </div>
              <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold px-2 py-1 rounded-lg">Beta</span>
            </div>
          </Link>
        </div>
      )}

      {/* Admin Button */}
      {user?.role === "admin" && (
        <div className="px-5 mt-4">
          <Link to={createPageUrl("Admin")} className="w-full block">
            <Button className="w-full rounded-2xl bg-purple-600 hover:bg-purple-700 text-white">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Pannello Admin
            </Button>
          </Link>
        </div>
      )}

      {/* Logout Button */}
      <div className="px-5 mt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full rounded-2xl border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20">
              <Trash2 className="w-4 h-4 mr-2" />
              Esci da profilo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma logout</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler uscire? Dovrai accedere nuovamente per usare l'app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  base44.auth.logout();
                }}
              >
                Esci
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
        </>
      )}
    </div>
  );
}