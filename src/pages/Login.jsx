import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset' | 'update-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error'|'success', text }

  // Detecta retorno do link de recuperação de senha (hash #type=recovery vindo do Supabase)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('type=invite')) {
      setMode('update-password');
      // Limpa a hash da URL pra não ficar feio
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    // Listener pra capturar quando Supabase processa o token de recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update-password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const redirectAfterLogin = () => {
    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get('redirect') || '/';
  };

  const handleGoogle = async () => {
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || '/';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirect}` },
    });
    if (error) {
      setMessage({ type: 'error', text: 'Errore con Google. Riprova.' });
      setLoading(false);
    }
    // sucesso → redireciona pro Google automaticamente
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ type: 'error', text: 'Email o password errati.' });
    } else {
      redirectAfterLogin();
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      // Redireciona direto — confirmação de email desabilitada
      redirectAfterLogin();
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/Login`,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Email di recupero inviato. Controlla la tua casella di posta.' });
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'La password deve avere almeno 6 caratteri.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non coincidono.' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage({ type: 'error', text: 'Errore: ' + error.message });
      setLoading(false);
      return;
    }
    setMessage({ type: 'success', text: 'Password aggiornata! Reindirizzamento...' });
    setTimeout(() => { window.location.href = '/'; }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0FDF4] px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-green-700">Gosto Puro</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' && 'Accedi al tuo account'}
            {mode === 'register' && 'Crea il tuo account'}
            {mode === 'reset' && 'Recupera la password'}
            {mode === 'update-password' && 'Imposta una nuova password'}
          </p>
        </div>

        {/* Banner utenti esistenti — visibile solo su login e register */}
        {(mode === 'login' || mode === 'register') && mode !== 'update-password' && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
            <p className="font-bold text-amber-700 mb-1">👋 Già con noi su Gosto Puro?</p>
            {mode === 'login' ? (
              <p>
                Se avevi un account sul vecchio sito, <strong>crea un nuovo account</strong> con la stessa email —
                il tuo piano Premium verrà ripristinato automaticamente! 🎉
              </p>
            ) : (
              <p>
                Usa la <strong>stessa email</strong> del tuo vecchio account Gosto Puro
                e il tuo accesso Premium sarà attivato subito in automatico! 🎉
              </p>
            )}
          </div>
        )}

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message.text}
          </div>
        )}

        <form
          onSubmit={
            mode === 'login' ? handleLogin
              : mode === 'register' ? handleRegister
              : mode === 'reset' ? handleReset
              : handleUpdatePassword
          }
        >
          {mode === 'register' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Il tuo nome"
                required
              />
            </div>
          )}

          {mode !== 'update-password' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="tua@email.com"
                required
              />
            </div>
          )}

          {mode !== 'reset' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === 'update-password' ? 'Nuova password' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          {mode === 'update-password' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Conferma password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          {mode !== 'update-password' && mode !== 'reset' && <div className="mb-2" />}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Attendere...'
              : mode === 'login' ? 'Accedi'
              : mode === 'register' ? 'Crea account'
              : mode === 'reset' ? 'Invia email'
              : 'Aggiorna password'}
          </button>
        </form>

        {/* Login com Google (não aparece nos modos reset/update-password) */}
        {mode !== 'reset' && mode !== 'update-password' && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-400">oppure</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continua con Google
            </button>
          </>
        )}

        <div className="mt-6 text-center text-sm space-y-2">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('register'); setMessage(null); }} className="text-green-600 hover:underline block w-full">
                Non hai un account? Registrati
              </button>
              <button onClick={() => { setMode('reset'); setMessage(null); }} className="text-gray-400 hover:underline block w-full">
                Password dimenticata?
              </button>
            </>
          )}
          {(mode === 'register' || mode === 'reset') && (
            <button onClick={() => { setMode('login'); setMessage(null); }} className="text-green-600 hover:underline">
              Hai già un account? Accedi
            </button>
          )}
          {mode === 'update-password' && (
            <p className="text-gray-400 text-xs">
              Sarai reindirizzato automaticamente dopo l'aggiornamento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
