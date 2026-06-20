import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset' | 'update-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error'|'success', text }

  // Detecta retorno do link de recuperação de senha (hash #type=recovery vindo do Supabase)
  useEffect(() => {
    const hash = window.location.hash;

    // Trata erros vindos do Supabase no hash (link expirado, inválido, etc.)
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const errorCode = params.get('error_code');
      const errorMsg = params.get('error_description')?.replace(/\+/g, ' ');
      let userMsg = 'Si è verificato un errore. Riprova.';
      if (errorCode === 'otp_expired') {
        userMsg = '⏰ Il link è scaduto o è già stato utilizzato. Richiedi un nuovo recupero password qui sotto.';
        setMode('reset');
      } else if (errorMsg) {
        userMsg = errorMsg;
      }
      setMessage({ type: 'error', text: userMsg });
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }

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
      // Erro que ENSINA: a confusão nº1 é tentar a senha da Hotmart no 1º acesso.
      // Distingue "conta não existe ainda" (primeiro acesso) de "senha errada".
      let exists = true;
      try {
        const { data, error: rpcErr } = await supabase.rpc('user_exists_by_email', { p_email: email });
        if (!rpcErr) exists = data !== false;
      } catch (_) { /* se a RPC falhar, mostra o erro genérico abaixo */ }
      if (!exists) {
        setMessage({
          type: 'error',
          text: '👋 Questa email non ha ancora un account qui. È il tuo primo accesso? L\'email è la stessa dell\'acquisto, ma la password devi crearla ora (è diversa da quella di Hotmart).',
          showRegister: true,
        });
      } else {
        setMessage({
          type: 'error',
          text: '🔐 Password errata. Ricorda: la password dell\'app NON è quella di Hotmart — è quella che hai creato qui. Se l\'hai dimenticata, usa "Password dimenticata?".',
        });
      }
    } else {
      redirectAfterLogin();
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Validações que evitam recuperações de senha desnecessárias
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'La password deve avere almeno 6 caratteri.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: '⚠️ Le password non coincidono. Controlla di averle scritte uguali in entrambi i campi.' });
      return;
    }

    setLoading(true);

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

    // Antes de pedir reset, verifica se a conta existe — evita o caso comum
    // de quem nunca criou conta (depois de comprar na Hotmart) tentar reset
    // e ficar perdido sem entender por que não chega email.
    try {
      const { data: exists, error: rpcErr } = await supabase.rpc(
        'user_exists_by_email',
        { p_email: email }
      );
      if (!rpcErr && exists === false) {
        setMessage({
          type: 'error',
          text: '⚠️ Questa email non ha ancora un account su Gosto Puro. Forse hai comprato su Hotmart ma non hai ancora creato il tuo account qui? Clicca su "Registrati" qui sotto per crearne uno con questa email — i tuoi acquisti si sbloccheranno automaticamente! 🎉',
          showRegister: true,
        });
        setLoading(false);
        return;
      }
    } catch (_) {
      // Se a RPC falhar, segue normal (não bloqueia o fluxo)
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/Login`,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: '✅ Email di recupero inviato! Controlla la tua casella di posta (e anche lo SPAM). Il link è valido per 1 ora.' });
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
            <p className="font-bold text-amber-700 mb-1.5">👋 Hai già acquistato in passato?</p>
            <p className="mb-2">
              Per accedere al tuo piano Premium, segui questi 2 passi:
            </p>
            <ol className="list-decimal list-inside space-y-1 mb-2">
              <li>
                Clicca su <strong>"Continua con Google"</strong> qui sotto
                (è il modo più veloce e sicuro)
              </li>
              <li>
                Scrivi un'email a{' '}
                <a href="mailto:supporto@gostopuro.it?subject=Sblocco%20accesso%20Premium&body=Ciao%2C%20ho%20gi%C3%A0%20acquistato%20in%20passato.%20L'email%20con%20cui%20ho%20fatto%20il%20login%20%C3%A8%3A%20"
                   className="font-bold underline text-amber-900">
                  supporto@gostopuro.it
                </a>
                {' '}indicando con quale email hai fatto il login —
                ti sblocchiamo l'accesso entro 24h ✨
              </li>
            </ol>
            <p className="text-[11px] text-amber-700 mt-1.5 italic">
              💡 Funziona anche con email/password se preferisci.
              L'importante è dirci con quale email accedi.
            </p>
          </div>
        )}

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <p className="leading-relaxed">{message.text}</p>
            {message.showRegister && (
              <button
                type="button"
                onClick={() => { setMode('register'); setMessage(null); setConfirmPassword(''); }}
                className="mt-2 inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-lg"
              >
                Sì, voglio registrarmi →
              </button>
            )}
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
                {mode === 'update-password' ? 'Nuova password' : mode === 'register' ? 'Crea la tua password' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={mode === 'register' ? 'crea una password nuova' : '••••••••'}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-gray-500 mt-1">
                  🔑 Crea una password <strong>nuova</strong> per Gosto Puro — <strong>non</strong> è quella di Hotmart. Almeno 6 caratteri.
                </p>
              )}
              {mode === 'login' && (
                <p className="text-xs text-gray-400 mt-1">
                  🔑 È la password che hai creato qui — <strong>non</strong> quella di Hotmart.
                </p>
              )}
            </div>
          )}

          {(mode === 'update-password' || mode === 'register') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Conferma password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-300 bg-red-50'
                    : confirmPassword && password === confirmPassword
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                }`}
                placeholder="Ripeti la password"
                required
                minLength={6}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">⚠️ Le password non coincidono</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 mt-1">✓ Le password coincidono</p>
              )}
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
              <button onClick={() => { setMode('register'); setMessage(null); setConfirmPassword(''); }} className="text-green-600 hover:underline block w-full">
                Non hai un account? Registrati
              </button>
              <button onClick={() => { setMode('reset'); setMessage(null); }} className="text-gray-400 hover:underline block w-full">
                Password dimenticata?
              </button>
            </>
          )}
          {(mode === 'register' || mode === 'reset') && (
            <button onClick={() => { setMode('login'); setMessage(null); setConfirmPassword(''); }} className="text-green-600 hover:underline">
              Hai già un account? Accedi
            </button>
          )}
          {mode === 'update-password' && (
            <p className="text-gray-400 text-xs">
              Sarai reindirizzato automaticamente dopo l'aggiornamento.
            </p>
          )}
        </div>

        {/* FAQ inline — resolve dúvidas comuns sem precisar abrir suporte */}
        {mode !== 'update-password' && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-2">Hai bisogno di aiuto?</p>
            <details className="text-sm">
              <summary className="cursor-pointer py-2 px-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-xs flex items-center gap-1">
                <span>❓</span>
                <span>Ho comprato su Hotmart, come accedo?</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-xs text-gray-600 leading-relaxed">
                L'acquisto su Hotmart NON crea automaticamente il tuo account qui.
                Devi <strong>registrarti</strong> sull'app usando la <strong>stessa email</strong> con cui hai comprato.
                Una volta registrato, tutti i tuoi acquisti si sbloccheranno automaticamente. ✨
              </div>
            </details>
            <details className="text-sm">
              <summary className="cursor-pointer py-2 px-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-xs flex items-center gap-1">
                <span>📧</span>
                <span>Non ricevo l'email di recupero password</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-xs text-gray-600 leading-relaxed">
                <strong>1.</strong> Controlla la cartella <strong>SPAM</strong> o "Posta indesiderata".<br/>
                <strong>2.</strong> Verifica di aver scritto l'email <strong>correttamente</strong> (errori di digitazione succedono).<br/>
                <strong>3.</strong> Se hai usato "Continua con Google", non hai una password da recuperare — accedi direttamente con Google.<br/>
                <strong>4.</strong> Se hai comprato su Hotmart ma non hai mai creato l'account qui, devi prima <strong>registrarti</strong>.
              </div>
            </details>
            <details className="text-sm">
              <summary className="cursor-pointer py-2 px-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-xs flex items-center gap-1">
                <span>🔐</span>
                <span>La password di Hotmart non funziona qui</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-xs text-gray-600 leading-relaxed">
                Hotmart e Gosto Puro sono <strong>due servizi separati</strong>. La password che usi su Hotmart NON è la stessa qui.
                Quando ti registri sull'app, scegli una password nuova — può essere uguale o diversa da quella di Hotmart.
              </div>
            </details>
            <details className="text-sm">
              <summary className="cursor-pointer py-2 px-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-xs flex items-center gap-1">
                <span>💬</span>
                <span>Ho ancora bisogno di aiuto</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-xs text-gray-600 leading-relaxed">
                Scrivici a{' '}
                <a href="mailto:supporto@gostopuro.it?subject=Aiuto%20accesso%20account"
                   className="text-[#2D6A4F] font-semibold underline">
                  supporto@gostopuro.it
                </a>
                {' '}indicando <strong>l'email con cui hai fatto il login</strong>
                (e quella con cui hai comprato su Hotmart, se diversa).
                Ti aiutiamo entro 24 ore 🙏
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
