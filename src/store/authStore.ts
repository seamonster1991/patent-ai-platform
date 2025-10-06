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
  updateProfile: (updates: Partial<User>) => Promise<{ error?: string; success?: boolean; profile?: User }>
}

// onAuthStateChange 리스너 중복 등록 방지를 위한 플래그
let authListenerInitialized = false;
let authSubscription: any = null;

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
    
    try {
      // 사용자 활동 추적 - 로그아웃 (비동기로 처리하여 로그아웃 속도에 영향 없음)
      if (user) {
        // ActivityTracker를 백그라운드에서 실행하여 로그아웃 속도에 영향을 주지 않음
        Promise.resolve().then(async () => {
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
        })
      }

      // Supabase 로그아웃 실행
      await supabase.auth.signOut()
      
      // localStorage 정리
      try {
        localStorage.removeItem('supabase.auth.token')
        // 기타 앱 관련 localStorage 항목들 정리
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('auth') || key.includes('user') || key.includes('supabase'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (error) {
        console.error('localStorage 정리 오류:', error)
      }
      
      // 상태 초기화
      set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true })
      
    } catch (error) {
      console.error('로그아웃 오류:', error)
      // 오류가 발생해도 상태는 초기화
      set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true })
      throw error
    }
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
          setTimeout(() => reject(new Error('Supabase connection timeout')), 5000) // 5초로 단축
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
        // 기존 구독이 있다면 해제
        if (authSubscription) {
          authSubscription.unsubscribe();
        }
        
        authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
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
          
          // 로그인 진행 중인 경우 이벤트 무시 (무한루프 방지)
          if (event === 'SIGNED_IN' && authGuard.getStatus().isLoginInProgress) {
            console.log('[AuthStore] 로그인 진행 중 SIGNED_IN 이벤트 무시');
            return;
          }
          
          // SIGNED_OUT 이벤트나 세션이 없는 경우에만 로딩 상태 설정
          if (event === 'SIGNED_OUT' || !session?.user) {
            console.log('[AuthStore] 로그아웃 처리');
            authGuard.reset(); // AuthGuard 상태 리셋
            set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
            return;
          }
          
          // SIGNED_IN 이벤트 처리
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('[AuthStore] 로그인 이벤트 처리 시작');
            try {
              // 중복 처리 방지를 위한 추가 체크
              if (currentState.user?.id === session.user.id && currentState.user?.email === session.user.email) {
                console.log('[AuthStore] 이미 동일한 사용자로 로그인됨, 이벤트 무시');
                return;
              }
              
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

  updateProfile: async (updates: Partial<User> | { name: string; phone: string; company?: string; bio?: string }) => {
    try {
      const { user } = get()
      if (!user) {
        console.error('프로필 업데이트 실패: 사용자가 인증되지 않음')
        return { error: '로그인이 필요합니다.' }
      }

      console.log('📝 [AuthStore] 프로필 업데이트 시작:', user.id);

      // 새로운 API 엔드포인트 사용 여부 확인 (name과 phone이 있으면 새 API 사용)
      if ('name' in updates && 'phone' in updates) {
        console.log('📝 [AuthStore] 새 API 엔드포인트 사용');
        
        try {
          // API를 통한 프로필 업데이트
          const { updateUserProfile } = await import('../lib/api');
          const response = await updateUserProfile(user.id, updates as { name: string; phone: string; company?: string; bio?: string });

          console.log('📝 [AuthStore] API 응답:', response);

          if (!response.success) {
            console.error('📝 [AuthStore] API 오류:', response.error);
            return { 
              error: response.error || response.message || '프로필 업데이트에 실패했습니다.',
              success: false 
            };
          }

          // 로컬 상태 업데이트
          const updatedProfile = response.data?.profile;
          if (updatedProfile) {
            set((state) => ({
              profile: {
                ...state.profile,
                ...updatedProfile
              }
            }));
            console.log('✅ [AuthStore] 프로필 업데이트 완료:', updatedProfile);
            
            // 사용자 활동 추적
            try {
              const activityTracker = ActivityTracker.getInstance()
              activityTracker.setUserId(user.id)
              await activityTracker.trackProfileUpdate({
                updatedFields: Object.keys(updates),
                profileData: {
                  name: updatedProfile.name,
                  company: updatedProfile.company,
                  email: updatedProfile.email
                }
              })
              console.log('프로필 업데이트 활동 추적 완료')
            } catch (activityError) {
              console.error('프로필 업데이트 활동 추적 오류:', activityError)
              // 활동 추적 실패는 프로필 업데이트 기능에 영향을 주지 않음
            }
          }

          return { success: true, profile: updatedProfile };
        } catch (apiError: any) {
          console.error('📝 [AuthStore] API 호출 오류:', apiError);
          return { 
            error: apiError.message || '네트워크 오류가 발생했습니다.',
            success: false 
          };
        }
      }

      // 기존 로직 (레거시 호환성)
      console.log('프로필 업데이트 시작:', { userId: user.id, updates })

      // 업데이트할 데이터에 updated_at 추가
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      // 트랜잭션 방식으로 업데이트 수행
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select('*')
        .single()

      if (updateError) {
        console.error('프로필 업데이트 DB 오류:', updateError)
        return { error: `프로필 업데이트에 실패했습니다: ${updateError.message}` }
      }

      if (!updatedProfile) {
        console.error('프로필 업데이트 후 데이터 조회 실패')
        return { error: '프로필 업데이트 후 데이터를 가져올 수 없습니다.' }
      }

      // 상태 업데이트
      set({ profile: updatedProfile })
      console.log('프로필 업데이트 성공:', updatedProfile)
      
      // 사용자 활동 추적 - 프로필 업데이트
      try {
        const activityTracker = ActivityTracker.getInstance()
        activityTracker.setUserId(user.id)
        await activityTracker.trackProfileUpdate({
          updatedFields: Object.keys(updates),
          profileData: {
            name: updatedProfile.name,
            company: updatedProfile.company,
            email: updatedProfile.email
          }
        })
        console.log('프로필 업데이트 활동 추적 완료')
      } catch (activityError) {
        console.error('프로필 업데이트 활동 추적 오류:', activityError)
        // 활동 추적 실패는 프로필 업데이트 기능에 영향을 주지 않음
      }
      
      return { success: true, profile: updatedProfile }
    } catch (error: any) {
      console.error('❌ [AuthStore] 프로필 업데이트 실패:', error)
      return { error: `예상치 못한 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}` }
    }
  },
}))