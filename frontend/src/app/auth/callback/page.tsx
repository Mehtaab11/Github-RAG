'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import api from '../../../utils/api';
import { useAuthStore } from '../../../store/authStore';

export default function AuthCallbackPage() {
  const loginState = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function syncUserWithBackend(session: any) {
      const user = session.user;
      const provider = user.app_metadata?.provider || 'oauth';
      const providerToken = session.provider_token;

      const response = await api.post('/auth/oauth-callback', {
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username,
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        provider,
        providerId: user.id,
        githubAccessToken: providerToken,
      });

      const { token, user: backendUser } = response.data;
      if (isSubscribed) {
        loginState(token, backendUser);
        window.location.href = '/';
      }
    }

    async function handleAuthCallback() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const oauthError =
          searchParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');

        if (oauthError) {
          if (isSubscribed) {
            setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
          }
          return;
        }

        const code = searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (isSubscribed) setError(error.message);
            return;
          }
          if (data?.session && isSubscribed) {
            await syncUserWithBackend(data.session);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session && isSubscribed) {
          await syncUserWithBackend(session);
          return;
        }

        // Listen for session established via hash fragment / OAuth PKCE exchange
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (newSession && isSubscribed) {
            await syncUserWithBackend(newSession);
          }
        });

        if (!code && !searchParams.get('access_token') && !hashParams.get('access_token')) {
          if (isSubscribed) {
            setError('No authentication token received from provider. Please try signing in again.');
          }
        }

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err: any) {
        console.error('OAuth Callback error:', err);
        if (isSubscribed) {
          setError(err.response?.data?.error || err.message || 'Failed to authenticate via OAuth.');
        }
      }
    }

    handleAuthCallback();

    return () => {
      isSubscribed = false;
    };
  }, [loginState]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest p-6 text-on-surface flex-col font-body-md">
      <div className="w-full max-w-sm text-center space-y-4 rounded-md border border-outline-variant bg-surface p-8">
        <h2 className="text-xl font-bold tracking-tight text-primary">GitGPT</h2>
        {error ? (
          <div className="space-y-4">
            <div className="rounded-md bg-error-container border border-outline-variant p-3 text-xs font-code-sm text-on-error-container">
              {error}
            </div>
            <a
              href="/login"
              className="inline-block text-xs font-code-sm text-primary underline"
            >
              Return to Login
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            <p className="text-xs font-code-sm text-on-surface-variant">
              Completing secure authentication...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
