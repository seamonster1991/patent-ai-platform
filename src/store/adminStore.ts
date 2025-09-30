import { create } from 'zustand';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

interface AdminStore {
  isAdmin: boolean;
  adminUser: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setAdmin: (user: AdminUser) => void;
  clearAdmin: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  checkAdminStatus: () => Promise<boolean>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  isAdmin: false,
  adminUser: null,
  isLoading: false,
  error: null,

  setAdmin: (user: AdminUser) => {
    set({ 
      isAdmin: true, 
      adminUser: user, 
      error: null 
    });
  },

  clearAdmin: () => {
    set({ 
      isAdmin: false, 
      adminUser: null, 
      error: null 
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  checkAdminStatus: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // TODO: Implement actual admin check with Supabase
      // For now, return false - will be implemented with proper admin role check
      const response = await fetch('/api/admin/check', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.isAdmin) {
          set({ 
            isAdmin: true, 
            adminUser: data.user,
            isLoading: false 
          });
          return true;
        }
      }
      
      set({ 
        isAdmin: false, 
        adminUser: null,
        isLoading: false 
      });
      return false;
    } catch (error) {
      set({ 
        error: 'Failed to check admin status',
        isLoading: false,
        isAdmin: false,
        adminUser: null
      });
      return false;
    }
  }
}));