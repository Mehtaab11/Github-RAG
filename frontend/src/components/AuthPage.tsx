import React, { useState } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const loginState = useAuthStore((state) => state.login);
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<'tos' | 'privacy' | null>(null);

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
            <input
              type="password"
              required
              className="w-full rounded-md border border-outline-variant bg-background p-2.5 text-xs font-code-sm text-on-surface outline-none focus:border-primary placeholder:text-outline-variant"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
