import React, { useState } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../utils/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const loginState = useAuthStore((state) => state.login);
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<'tos' | 'privacy' | null>(null);

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setErrorMsg('');
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          scopes: provider === 'github' ? 'repo read:user user:email' : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to initiate ${provider} sign in.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const endpoint = isLoginView ? '/auth/login' : '/auth/register';
    const payload = isLoginView ? { email, password } : { email, password, name };

    try {
      const response = await api.post(endpoint, payload);
      const { token, user } = response.data;

      loginState(token, user);
      window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'An authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest p-6 text-on-surface flex-col font-body-md">
      <div className="w-full max-w-sm space-y-6 rounded-md border border-outline-variant bg-surface p-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary">GitGPT</h2>
          <p className="mt-1 text-xs text-on-surface-variant font-code-sm">
            {isLoginView ? 'Sign in to access code repositories' : 'Create your account'}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-md bg-error-container border border-outline-variant p-3 text-xs font-code-sm text-on-error-container">
            {errorMsg}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleOAuthSignIn('github')}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container hover:bg-surface-container-high p-2.5 text-xs font-code-sm text-on-surface transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container hover:bg-surface-container-high p-2.5 text-xs font-code-sm text-on-surface transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-outline-variant" />
          <span className="bg-surface px-2 text-[10px] uppercase font-code-sm text-on-surface-variant shrink-0">
            or continue with email
          </span>
          <div className="w-full border-t border-outline-variant" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLoginView && (
            <div>
              <label className="block text-xs font-code-sm uppercase text-on-surface-variant mb-1">Name</label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-outline-variant bg-background p-2.5 text-xs font-code-sm text-on-surface outline-none focus:border-primary placeholder:text-outline-variant"
                placeholder="Developer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-code-sm uppercase text-on-surface-variant mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-md border border-outline-variant bg-background p-2.5 text-xs font-code-sm text-on-surface outline-none focus:border-primary placeholder:text-outline-variant"
              placeholder="engineer@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-code-sm uppercase text-on-surface-variant mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full rounded-md border border-outline-variant bg-background p-2.5 pr-10 text-xs font-code-sm text-on-surface outline-none focus:border-primary placeholder:text-outline-variant"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary p-2.5 text-xs font-code-sm uppercase font-medium text-background transition-colors hover:bg-primary-fixed disabled:opacity-50 cursor-pointer border-none"
          >
            {isLoading ? 'Processing...' : isLoginView ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setIsLoginView(!isLoginView);
              setErrorMsg('');
            }}
            className="text-xs font-code-sm text-on-surface-variant hover:text-primary underline bg-transparent border-none cursor-pointer"
          >
            {isLoginView ? "Don't have an account? Register" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 mt-6 text-xs font-code-sm text-on-surface-variant">
        <button
          type="button"
          onClick={() => setLegalModal('tos')}
          className="hover:text-primary bg-transparent border-none cursor-pointer text-on-surface-variant text-xs"
        >
          Terms of Service
        </button>
        <button
          type="button"
          onClick={() => setLegalModal('privacy')}
          className="hover:text-primary bg-transparent border-none cursor-pointer text-on-surface-variant text-xs"
        >
          Privacy Policy
        </button>
      </div>

      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/90 p-6">
          <div className="w-full max-w-md border border-outline-variant bg-surface p-6 rounded-md space-y-4 text-on-surface max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <h3 className="text-base font-bold text-primary">
                {legalModal === 'tos' ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="text-xs font-code-sm text-on-surface-variant hover:text-primary bg-transparent border-none cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="text-xs font-body-md space-y-2 text-on-surface-variant leading-relaxed">
              {legalModal === 'tos' ? (
                <>
                  <p>1. ACCEPTANCE OF TERMS: By accessing GitGPT CodeRAG Engine, you agree to comply with all system usage guidelines.</p>
                  <p>2. CODE PROCESSING & PRIVACY: Ingested repository contents are stored in isolated vector indexes for natural language queries.</p>
                  <p>3. LIABILITY: GitGPT delivers grounded retrieval results. Always review generated code snippets before deploying to production.</p>
                </>
              ) : (
                <>
                  <p>1. DATA COLLECTION: We store user credentials and vector embeddings strictly required for system operation.</p>
                  <p>2. NO THIRD-PARTY SALE: Your source code and vector telemetry are never sold to external advertisers.</p>
                  <p>3. SECURITY: All vector namespaces and JWT session tokens utilize standard 256-bit encryption protocols.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
