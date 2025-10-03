import { create } from 'zustand'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '../lib/supabase'
import { ActivityTracker } from '../lib/activityTracker'
import { authGuard } from '../lib/authGuard'

interface AuthState {
  user: SupabaseUser | null
  profile: User | null
  loading: boolean
  isAdmin: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, metadata: { name: string; company?: string | null; phone?: string | null }) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<{ error?: string }>
}

// onAuthStateChange 리스너 중복 등록 방지를 위한 플래그
let authListenerInitialized = false;

// 사용자 세션 처리 헬퍼 함수
const handleUserSession = async (user: SupabaseUser, set: any) => {
  try {
    let profile = null;
    
    // 프로필 로드 시도
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // 프로필이 없는 경우 기본 프로필 생성 시도
      if (profileError.code === 'PGRST116') { // No rows returned
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email!.split('@')[0],
            company: null,
            phone: null,
            bio: null,
            notifications_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (!insertError) {
          const { data: newProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          profile = newProfile;
        }
      }
    } else {
      profile = profileData;
    }

    // 관리자 권한 확인
    const isAdmin = user.email === 'admin@p-ai.com' || 
                   user.user_metadata?.role === 'admin' ||
                   user.app_metadata?.role === 'admin' ||
                   profile?.role === 'admin' ||
                   profile?.role === 'super_admin';
    
    set({ user, profile, isAdmin, loading: false, initialized: true });
    
  } catch (error) {
    console.error('[AuthStore] 사용자 세션 처리 오류:', error);
    // 오류가 발생해도 사용자 정보는 설정하되, 프로필은 null로 설정
    set({ user, profile: null, isAdmin: false, loading: false, initialized: true });
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  initialized: false,

  signIn: async (email: string, password: string) => {
    // AuthGuard 확인
    if (!authGuard.canAttemptLogin()) {
      console.error('[AuthStore] AuthGuard에 의해 로그인 차단');
      return { error: '너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.' };
    }

    authGuard.startLogin();
    set({ loading: true })
    
    try {
      console.log('[AuthStore] 로그인 시도:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('[AuthStore] 로그인 오류:', error);
        authGuard.finishLogin(false);
        set({ loading: false })
        return { error: error.message }
      }

      if (data.user) {
        console.log('[AuthStore] 로그인 성공:', data.user.email);
        await handleUserSession(data.user, set)
        authGuard.finishLogin(true);
        return {}
      } else {
        authGuard.finishLogin(false);
        set({ loading: false })
        return { error: '로그인에 실패했습니다.' }
      }
    } catch (error) {
      console.error('[AuthStore] 로그인 예외:', error);
      authGuard.finishLogin(false);
      set({ loading: false })
      return { error: '로그인 중 오류가 발생했습니다.' }
    }
  },



  signUp: async (email: string, password: string, metadata: { name: string; company?: string | null; phone?: string | null }) => {
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
              phone: metadata.phone,
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
    const { user } = get()
    
    // 사용자 활동 추적 - 로그아웃
    if (user) {
      try {
        const activityTracker = ActivityTracker.getInstance()
        activityTracker.setUserId(user.id)
        await activityTracker.trackLogout({
          email: user.email,
          sessionDuration: Date.now() - (user.created_at ? new Date(user.created_at).getTime() : Date.now())
        })
      } catch (error) {
        console.error('로그아웃 활동 추적 오류:', error)
        // 활동 추적 실패는 로그아웃 기능에 영향을 주지 않음
      }
    }
    
    await supabase.auth.signOut()
    set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true })
  },

  initialize: async () => {
    const currentState = get();
    
    // 이미 초기화되었다면 중복 실행 방지
    if (currentState.initialized) {
      return;
    }
    
    set({ loading: true });
    
    try {
      // Supabase 연결 테스트 (타임아웃 증가 및 재시도 로직 추가)
      let sessionData = null;
      let sessionError = null;
      
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase connection timeout')), 20000) // 20초로 증가
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const result = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        sessionData = result.data;
        sessionError = result.error;
      } catch (timeoutError) {
        console.warn('[AuthStore] Supabase 연결 타임아웃, 오프라인 모드로 진행');
        sessionData = { session: null };
        sessionError = null;
      }
      
      // onAuthStateChange 리스너를 한 번만 등록
      if (!authListenerInitialized) {
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[AuthStore] 인증 상태 변경:', event, session?.user?.email);
          
          // 초기화가 완료된 후에만 상태 변경 처리
          const currentState = get();
          if (!currentState.initialized) {
            console.log('[AuthStore] 초기화 미완료로 인증 상태 변경 무시');
            return;
          }
          
          // INITIAL_SESSION 이벤트는 무시 (초기화 시에만 발생)
          if (event === 'INITIAL_SESSION') {
            console.log('[AuthStore] INITIAL_SESSION 이벤트 무시');
            return;
          }
          
          // 중복 처리 방지 - 현재 사용자와 동일한 경우 무시
          if (event === 'SIGNED_IN' && session?.user && currentState.user?.id === session.user.id) {
            console.log('[AuthStore] 동일한 사용자 SIGNED_IN 이벤트 무시');
            return;
          }
          
          // SIGNED_OUT 이벤트나 세션이 없는 경우에만 로딩 상태 설정
          if (event === 'SIGNED_OUT' || !session?.user) {
            console.log('[AuthStore] 로그아웃 처리');
            set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
            return;
          }
          
          // SIGNED_IN 이벤트 처리
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('[AuthStore] 로그인 이벤트 처리 시작');
            try {
              await handleUserSession(session.user, set);
              console.log('[AuthStore] 로그인 이벤트 처리 완료');
            } catch (error) {
              console.error('[AuthStore] 로그인 이벤트 처리 오류:', error);
              set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
            }
          }
        });
        authListenerInitialized = true;
      }
      
      // 현재 세션 확인
      const { session } = sessionData || { session: null };
      
      if (sessionError) {
        console.error('[AuthStore] 세션 가져오기 오류:', sessionError);
        set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
        return;
      }
      
      if (session?.user) {
        console.log('[AuthStore] 기존 세션 발견, 사용자 정보 로드:', session.user.email);
        await handleUserSession(session.user, set);
      } else {
        console.log('[AuthStore] 세션 없음, 로그아웃 상태로 초기화');
        set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
      }
      
    } catch (error) {
      console.error('[AuthStore] 초기화 실패:', error);
      // 초기화 실패해도 앱이 동작하도록 기본 상태로 설정
      set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
    }
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
      
      // 사용자 활동 추적 - 프로필 업데이트
      try {
        const activityTracker = ActivityTracker.getInstance()
        activityTracker.setUserId(user.id)
        await activityTracker.trackProfileUpdate({
          updatedFields: Object.keys(updates),
          profileData: {
            name: profile?.name,
            company: profile?.company,
            email: profile?.email
          }
        })
      } catch (error) {
        console.error('프로필 업데이트 활동 추적 오류:', error)
        // 활동 추적 실패는 프로필 업데이트 기능에 영향을 주지 않음
      }
      
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  },
}))