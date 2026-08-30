'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import api, { checkBackendHealth, HealthCheckResponse } from '../../../utils/api';
import { useAuthStore } from '../../../store/authStore';

export default function AuthCallbackPage() {
  const loginState = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [healthInfo, setHealthInfo] = useState<HealthCheckResponse | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    const health = await checkBackendHealth();
    setHealthInfo(health);
    setIsCheckingHealth(false);
  };

  useEffect(() => {
    let isSubscribed = true;
    let isHandled = false;

    async function syncUserWithBackend(session: any) {
      if (!session || !session.user || isHandled) return;
      isHandled = true;

      try {
        const user = session.user;
        const provider = user.app_metadata?.provider || 'oauth';
        const providerToken = session.provider_token;

        const response = await api.post('/auth/oauth-callback', {
          email: user.email,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.preferred_username ||
            user.email?.split('@')[0],
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
      } catch (err: any) {
        console.error('Backend OAuth sync error:', err);
        if (isSubscribed) {
          const backendErr =
            err.response?.data?.error ||
            err.message ||
            'Failed to sync OAuth user session with backend.';
          setError(`Backend Sync Error: ${backendErr}`);
          setDiagnosticInfo(
            'The frontend authenticated with Supabase, but the backend server failed to process the user session. Check if your backend is running and database is reachable.'
          );
          runHealthCheck();
        }
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
            const decoded = decodeURIComponent(oauthError.replace(/\+/g, ' '));
            setError(`Provider OAuth Error: ${decoded}`);
            setDiagnosticInfo(
              'Supabase or the OAuth provider (GitHub / Google) returned an authorization error. Ensure provider is enabled in Supabase Dashboard (Authentication > Providers) and Redirect URL http://localhost:3000/auth/callback is allowed.'
            );
          }
          return;
        }

        const code = searchParams.get('code');
        if (code) {
          console.log('[AuthCallback] Exchanging code for session...');
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeErr) {
            console.error('[AuthCallback] Exchange code error:', exchangeErr);
            if (isSubscribed) {
              setError(`Supabase Auth Code Exchange Failed: ${exchangeErr.message}`);
              setDiagnosticInfo(
                'Supabase failed to exchange the authorization code for a session token (Status 401). Please check:\n1. GitHub/Google provider is enabled in Supabase Dashboard.\n2. Redirect URL (http://localhost:3000/auth/callback) is added in Supabase Auth settings.\n3. Your NEXT_PUBLIC_SUPABASE_ANON_KEY is valid.'
              );
            }
            return;
          }

          if (data?.session && isSubscribed) {
            await syncUserWithBackend(data.session);
            return;
          }
        }

        // Try standard session retrieval
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr && isSubscribed) {
          setError(`Session Retrieval Error: ${sessionErr.message}`);
          return;
        }
        if (session && isSubscribed) {
          await syncUserWithBackend(session);
          return;
        }

        // Listen for session established via hash fragment / OAuth PKCE exchange
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('[AuthCallback] onAuthStateChange event:', event);
          if (newSession && isSubscribed && !isHandled) {
            await syncUserWithBackend(newSession);
          }
        });

        // Overall 4-second safety fallback: if no session was synced within 4 seconds, show clear error & health check
        const fallbackTimer = setTimeout(() => {
          if (isSubscribed && !isHandled && !error) {
            supabase.auth.getSession().then(({ data }) => {
              if (data?.session) {
                syncUserWithBackend(data.session);
              } else if (isSubscribed) {
                setError('Authentication process timed out. No active session token received from Supabase.');
                setDiagnosticInfo(
                  'Make sure GitHub/Google OAuth is enabled in Supabase Dashboard (Authentication > Providers) and Redirect URL is configured as http://localhost:3000/auth/callback.'
                );
                runHealthCheck();
              }
            });
          }
        }, 4000);

        return () => {
          clearTimeout(fallbackTimer);
          authListener.subscription.unsubscribe();
        };
      } catch (err: any) {
        console.error('OAuth Callback unhandled error:', err);
        if (isSubscribed) {
          setError(err.response?.data?.error || err.message || 'Failed to complete OAuth authentication.');
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
      <div className="w-full max-w-md text-center space-y-4 rounded-md border border-outline-variant bg-surface p-8 shadow-lg">
        <h2 className="text-xl font-bold tracking-tight text-primary">GitGPT</h2>
        {error ? (
          <div className="space-y-4 text-left">
            <div className="rounded-md bg-error-container border border-outline-variant p-3 text-xs font-code-sm text-on-error-container break-words">
              <span className="font-bold block mb-1">Authentication Error:</span>
              {error}
            </div>

            {diagnosticInfo && (
              <div className="rounded-md bg-surface-container border border-outline-variant p-3 text-xs font-code-sm text-on-surface-variant whitespace-pre-line">
                <span className="font-bold text-primary block mb-1">💡 Troubleshooting Steps:</span>
                {diagnosticInfo}
              </div>
            )}

            {healthInfo && (
              <div className="rounded-md border border-outline-variant bg-surface-container-high p-3 text-xs font-code-sm text-on-surface space-y-1">
                <div className="font-bold flex justify-between items-center">
                  <span>Backend Health Status:</span>
                  <span
                    className={
                      healthInfo.status === 'healthy'
                        ? 'text-green-500 font-bold'
                        : healthInfo.status === 'degraded'
                        ? 'text-yellow-500 font-bold'
                        : 'text-red-500 font-bold'
                    }
                  >
                    {healthInfo.status.toUpperCase()}
                  </span>
                </div>
                {healthInfo.services?.database && (
                  <div>
                    Database (Prisma):{' '}
                    <span className={healthInfo.services.database.status === 'ok' ? 'text-green-500' : 'text-red-500'}>
                      {healthInfo.services.database.status}
                      {healthInfo.services.database.message ? ` (${healthInfo.services.database.message})` : ''}
                    </span>
                  </div>
                )}
                {healthInfo.services?.qdrant && (
                  <div>
                    Vector DB (Qdrant):{' '}
                    <span className={healthInfo.services.qdrant.status === 'ok' ? 'text-green-500' : 'text-red-500'}>
                      {healthInfo.services.qdrant.status}
                      {healthInfo.services.qdrant.message ? ` (${healthInfo.services.qdrant.message})` : ''}
                    </span>
                  </div>
                )}
                {healthInfo.errorMessage && (
                  <div className="text-red-400 font-semibold">{healthInfo.errorMessage}</div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={runHealthCheck}
                disabled={isCheckingHealth}
                className="px-3 py-1.5 rounded-md border border-outline-variant bg-surface-container hover:bg-surface-container-high text-xs font-code-sm text-on-surface transition-colors cursor-pointer"
              >
                {isCheckingHealth ? 'Checking Health...' : 'Check Backend Health'}
              </button>
              <a
                href="/login"
                className="px-3 py-1.5 rounded-md bg-primary text-xs font-code-sm text-background font-medium transition-colors hover:bg-primary-fixed cursor-pointer no-underline inline-block"
              >
                Return to Login
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            <p className="text-xs font-code-sm text-on-surface-variant">
              Completing secure authentication...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
