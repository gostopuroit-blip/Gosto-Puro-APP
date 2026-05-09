import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// TEMPORÁRIO: injeta plan=premium para todos os usuários logados
const _originalMe = base44.auth.me.bind(base44.auth);
base44.auth.me = async (...args) => {
  const user = await _originalMe(...args);
  if (user && user.role !== 'admin') {
    user.plan = 'premium';
  }
  return user;
};