import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error'|'success', text }

  const redirectAfterLogin = () => {
    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get('redirect') || '/';
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
      setMessage({ type: 'success', text: 'Account creato! Controlla la tua email per confermare la registrazione.' });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0FDF4] px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-700">Gosto Puro</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' && 'Accedi al tuo account'}
            {mode === 'register' && 'Crea il tuo account'}
            {mode === 'reset' && 'Recupera la password'}
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset}>
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

          {mode !== 'reset' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? 'Attendere...' : mode === 'login' ? 'Accedi' : mode === 'register' ? 'Crea account' : 'Invia email'}
          </button>
        </form>

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
        </div>
      </div>
    </div>
  );
}
