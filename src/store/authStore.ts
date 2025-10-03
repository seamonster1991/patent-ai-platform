import { create } from 'zustand'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '../lib/supabase'
import { ActivityTracker } from '../lib/activityTracker'

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
  console.log('[AuthStore] 사용자 세션 처리 중...', { userId: user.id, email: user.email });
  
  try {
    let profile = null;
    
    // 프로필 로드 시도
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[AuthStore] 프로필 로드 오류:', profileError);
      // 프로필이 없는 경우 기본 프로필 생성 시도
      if (profileError.code === 'PGRST116') { // No rows returned
        console.log('[AuthStore] 프로필이 없음, 기본 프로필 생성 시도...');
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
          console.log('[AuthStore] 기본 프로필 생성 완료:', newProfile);
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

    console.log('[AuthStore] 인증 상태 설정:', { 
      userId: user.id, 
      email: user.email, 
      isAdmin,
      hasProfile: !!profile 
    });
    
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
    // 브라우저에서 확인할 수 있도록 alert도 추가
    console.warn('🔥 [AuthStore] signIn 시작:', { email });
    
    try {
      // 간단한 이메일 검증
      if (!email || !password) {
        console.warn('❌ [AuthStore] 이메일 또는 비밀번호 누락');
        alert('❌ [AuthStore] 이메일 또는 비밀번호 누락');
        return { error: '이메일과 비밀번호를 입력해주세요' }
      }

      console.warn('🔥 [AuthStore] Supabase 로그인 호출 시작');
      alert('🔥 [AuthStore] Supabase 로그인 호출 시작');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.warn('🔥 [AuthStore] Supabase 로그인 호출 완료:', { 
        hasData: !!data, 
        hasUser: !!data?.user, 
        hasError: !!error,
        errorMessage: error?.message 
      });
      
      alert(`🔥 [AuthStore] Supabase 로그인 호출 완료: hasData=${!!data}, hasUser=${!!data?.user}, hasError=${!!error}`);

      if (error) {
        console.warn('❌ [AuthStore] 로그인 에러:', error.message);
        alert(`❌ [AuthStore] 로그인 에러: ${error.message}`);
        return { error: error.message }
      }

      if (data.user) {
        console.warn('✅ [AuthStore] 로그인 성공, 상태 업데이트');
        alert('✅ [AuthStore] 로그인 성공, 상태 업데이트');
        
        // 간단한 상태 업데이트 (프로필 조회 없이)
        const isAdmin = email === 'admin@p-ai.com'
        
        set({ 
          user: data.user, 
          profile: null, // 일단 null로 설정
          isAdmin, 
          loading: false, 
          initialized: true 
        })
        
        console.warn('✅ [AuthStore] 상태 업데이트 완료');
        alert('✅ [AuthStore] 상태 업데이트 완료');
        return {}
      }

      console.warn('❌ [AuthStore] 사용자 데이터 없음');
      alert('❌ [AuthStore] 사용자 데이터 없음');
      return { error: '로그인에 실패했습니다' }
      
    } catch (error) {
      console.error('💥 [AuthStore] signIn 예외 발생:', error)
      alert(`💥 [AuthStore] signIn 예외 발생: ${error}`);
      return { error: '네트워크 연결을 확인해주세요' }
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
    set({ user: null, profile: null, isAdmin: false, loading: false, initialized: false })
  },

  initialize: async () => {
    const currentState = get();
    
    // 강제 디버깅 로그
    console.warn('🚀 [AuthStore] INITIALIZE CALLED!');
    console.warn('🔍 [AuthStore] Current State:', { 
      initialized: currentState.initialized, 
      loading: currentState.loading,
      hasUser: !!currentState.user 
    });
    
    // 이미 초기화되었다면 중복 실행 방지
    if (currentState.initialized) {
      console.warn('⚠️ [AuthStore] 이미 초기화됨, 건너뛰기');
      return;
    }
    
    console.warn('🔄 [AuthStore] 인증 상태 초기화 시작');
    set({ loading: true });
    
    try {
      // Supabase 연결 테스트 (타임아웃 추가)
      console.warn('[AuthStore] DEBUG: Supabase 연결 테스트 시작');
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase connection timeout')), 10000)
      );
      
      const sessionPromise = supabase.auth.getSession();
      
      const { data: testData, error: testError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;
      
      console.warn('[AuthStore] DEBUG: Supabase 연결 테스트 결과:', { testData: !!testData, testError });
      
      // onAuthStateChange 리스너를 한 번만 등록
      if (!authListenerInitialized) {
        console.log('[AuthStore] 인증 상태 변경 리스너 등록');
        console.warn('[AuthStore] DEBUG: 리스너 등록 중');
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[AuthStore] 인증 상태 변경:', event, { 
            hasSession: !!session, 
            hasUser: !!session?.user,
            userId: session?.user?.id 
          });
          
          // 로딩 상태 설정 (상태 변경 중임을 표시)
          set({ loading: true });
          
          try {
            if (session?.user) {
              await handleUserSession(session.user, set);
            } else {
              console.log('[AuthStore] 세션 없음, 게스트 상태로 설정');
              set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
            }
          } catch (error) {
            console.error('[AuthStore] 인증 상태 변경 처리 오류:', error);
            set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
          }
        });
        authListenerInitialized = true;
      }
      
      // 현재 세션 확인
      console.log('[AuthStore] 현재 세션 확인 중...');
      const { data: { session }, error } = testError ? { data: { session: null }, error: testError } : testData;
      
      if (error) {
        console.error('[AuthStore] 세션 가져오기 오류:', error);
        set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
        return;
      }
      
      console.log('[AuthStore] 세션 상태:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email 
      });
      
      if (session?.user) {
        await handleUserSession(session.user, set);
      } else {
        console.log('[AuthStore] 세션 없음, 게스트 상태로 설정');
        set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
      }
      
    } catch (error) {
      console.error('[AuthStore] 초기화 실패:', error);
      // 초기화 실패해도 앱이 동작하도록 기본 상태로 설정
      set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
    }
    
    console.log('[AuthStore] 초기화 완료');
    console.warn('[AuthStore] DEBUG: 초기화 완료'); // 강제 출력
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