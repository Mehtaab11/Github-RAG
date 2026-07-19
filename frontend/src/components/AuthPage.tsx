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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const endpoint = isLoginView ? '/auth/login' : '/auth/register';
    const payload = isLoginView ? { email, password } : { email, password, name };

    try {
      const response = await api.post(endpoint, payload);
      const { token, user } = response.data;

      // Save credentials into our global state store
      loginState(token, user);

      // Redirect out to your main workspace route
      window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'A authentication connection error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-emerald-400">RepoGPT</h2>
          <p className="mt-2 text-sm text-slate-400">
            {isLoginView ? 'Sign in to access your codebase index' : 'Create your secure account'}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLoginView && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Name</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
                placeholder="Developer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-emerald-500 p-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : isLoginView ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setErrorMsg('');
            }}
            className="text-xs text-slate-400 hover:text-emerald-400 underline decoration-dotted"
          >
            {isLoginView ? "Don't have an account? Register here" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}