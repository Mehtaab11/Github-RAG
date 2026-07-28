'use client';

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

      // Save credentials into global state store
      loginState(token, user);

      // Redirect out to main workspace
      window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'An authentication connection error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08090d] px-4 text-slate-100 font-sans">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#1e2130] bg-[#11131c] p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl shadow-lg shadow-blue-600/20 mb-2">
            G
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">GitGPT</h2>
          <p className="text-xs text-slate-400">
            {isLoginView ? 'Sign in to access your codebase intelligence workspace' : 'Create your secure account'}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-medium">
            {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLoginView && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Name</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-[#1e2130] bg-[#090a10] p-3 text-xs text-slate-100 outline-none focus:border-blue-500 font-medium transition-colors"
                placeholder="Developer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-[#1e2130] bg-[#090a10] p-3 text-xs text-slate-100 outline-none focus:border-blue-500 font-medium transition-colors"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-[#1e2130] bg-[#090a10] p-3 text-xs text-slate-100 outline-none focus:border-blue-500 font-medium transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 p-3 text-xs font-bold text-white transition-all disabled:opacity-50 shadow-md shadow-blue-600/20 active:scale-[0.99] mt-2"
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
            className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
          >
            {isLoginView ? "Don't have an account? Register here" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}