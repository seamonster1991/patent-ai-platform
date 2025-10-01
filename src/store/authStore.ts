import { create } from 'zustand'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '../lib/supabase'

interface AuthState {
  user: SupabaseUser | null
  profile: User | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, metadata: { name: string; company?: string | null }) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<{ error?: string }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        // Check if user is admin based on email or user metadata
        const isAdmin = email === 'admin@p-ai.com' || 
                       data.user.user_metadata?.role === 'admin' ||
                       data.user.app_metadata?.role === 'admin'

        set({ user: data.user, profile, isAdmin })
      }

      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  },



  signUp: async (email: string, password: string, metadata: { name: string; company?: string | null }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user && !data.user.email_confirmed_at) {
        // User needs to confirm email
        return { error: 'Please check your email and click the confirmation link to complete registration.' }
      }

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email!,
              name: metadata.name,
              company: metadata.company,
              subscription_plan: 'free',
              usage_count: 0,
            },
          ])

        if (profileError) {
          return { error: 'Failed to create user profile' }
        }

        // Fetch the created profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        set({ user: data.user, profile })
      }

      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, isAdmin: false })
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        // Check if user is admin
        const isAdmin = session.user.email === 'admin@p-ai.com' || 
                       session.user.user_metadata?.role === 'admin' ||
                       session.user.app_metadata?.role === 'admin'

        set({ user: session.user, profile, isAdmin })
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
    } finally {
      set({ loading: false })
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        let { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        // If profile doesn't exist (e.g., Google OAuth first login), create it
        if (!profile && session.user.user_metadata) {
          const { error } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.email!.split('@')[0],
              company: null,
              phone: null,
              bio: null,
              notifications_enabled: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (!error) {
            const { data: newProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            profile = newProfile
          }
        }

        // Check if user is admin
        const isAdmin = session.user.email === 'admin@p-ai.com' || 
                       session.user.user_metadata?.role === 'admin' ||
                       session.user.app_metadata?.role === 'admin'

        set({ user: session.user, profile, isAdmin })
      } else {
        set({ user: null, profile: null, isAdmin: false })
      }
    })
  },

  updateProfile: async (updates: Partial<User>) => {
    try {
      const { user } = get()
      if (!user) return { error: 'Not authenticated' }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        return { error: error.message }
      }

      // Fetch updated profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      set({ profile })
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  },
}))