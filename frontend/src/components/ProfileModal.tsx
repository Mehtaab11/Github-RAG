'use client';

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, login, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [repoCount, setRepoCount] = useState<number>(0);
  const [createdAt, setCreatedAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchProfile() {
      try {
        const response = await api.get('/auth/me');
        const userData = response.data.user;
        setName(userData.name || '');
        setRepoCount(userData.repoCount || 0);
        if (userData.createdAt) {
          setCreatedAt(new Date(userData.createdAt).toLocaleDateString());
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    }
    fetchProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.put('/auth/profile', { name });
      const updatedUser = response.data.user;
      if (user) {
        login(useAuthStore.getState().token || '', {
          ...user,
          name: updatedUser.name,
        });
      }
      toast.success('Profile name updated successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      await api.delete('/auth/account');
      toast.success('Account deleted permanently.');
      logout();
      window.location.href = '/login';
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/90 p-6 font-body-md select-none">
      <div className="w-full max-w-md border border-outline-variant bg-surface p-6 rounded-md space-y-6 text-on-surface shadow-md">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-outline-variant pb-3">
          <div>
            <h3 className="text-lg font-bold text-primary">User Profile</h3>
            <p className="text-xs font-code-sm text-on-surface-variant">
              Manage profile preferences and account settings
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors bg-transparent border-none cursor-pointer flex items-center justify-center"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Info Summary */}
        <div className="space-y-2 bg-background p-4 rounded-md border border-outline-variant font-code-sm text-xs">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Email:</span>
            <span className="text-primary font-medium">{user?.email}</span>
          </div>
          {createdAt && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Member Since:</span>
              <span className="text-on-surface">{createdAt}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Indexed Repositories:</span>
            <span className="text-primary font-medium">{repoCount}</span>
          </div>
        </div>

        {/* Edit Name Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-code-sm uppercase text-on-surface-variant mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              className="w-full rounded-md border border-outline-variant bg-background p-2.5 text-xs font-code-sm text-on-surface outline-none focus:border-primary placeholder:text-outline-variant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Developer Name"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary text-on-primary font-code-sm text-xs py-2 px-4 rounded-md hover:bg-primary-fixed transition-colors font-medium border-none cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Profile Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="bg-surface-container border border-outline-variant text-on-surface hover:text-error hover:border-error font-code-sm text-xs py-2 px-4 rounded-md transition-colors font-medium cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-outline-variant space-y-3">
          <div className="text-xs font-code-sm text-error font-medium">Danger Zone</div>

          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full bg-error-container text-on-error-container font-code-sm text-xs py-2 px-4 rounded-md hover:opacity-90 transition-opacity font-medium border border-outline-variant cursor-pointer"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3 p-3 bg-error-container/20 border border-outline-variant rounded-md">
              <p className="text-xs font-code-sm text-on-surface leading-relaxed">
                Are you sure? This will permanently delete your account, all indexed repositories, and vector embeddings.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-error-container text-on-error-container font-code-sm text-xs py-2 rounded-md font-medium border border-outline-variant cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 bg-surface-container border border-outline-variant text-on-surface font-code-sm text-xs py-2 rounded-md font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
