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

// 로그인 활동 추적 헬퍼 함수 (새로운 RPC 함수 사용)
const trackLoginActivity = async (userId: string, success: boolean = true, loginMethod: string = 'email') => {
  try {
    console.log('[AuthStore] 로그인 활동 기록 시작:', { userId, success, loginMethod });
    
    // 세션 ID 생성 (더 강력한 형식)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${userId.substr(0, 8)}`;
    
    // 클라이언트 정보 수집
    const userAgent = navigator.userAgent;
    const timestamp = new Date().toISOString();
    
    // 브라우저 정보 추출
    const getBrowserInfo = () => {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Other';
    };
    
    // 디바이스 정보 추출
    const getDeviceInfo = () => {
      const ua = navigator.userAgent;
      if (/Mobile|Android|iPhone|iPad/.test(ua)) return 'mobile';
      if (/Tablet|iPad/.test(ua)) return 'tablet';
      return 'desktop';
    };
    
    // 새로운 record_user_login RPC 함수 호출
    const { data, error } = await supabase.rpc('record_user_login', {
      p_user_id: userId,
      p_ip_address: null, // 클라이언트에서는 IP 주소를 직접 얻기 어려움
      p_user_agent: userAgent,
      p_session_id: sessionId,
      p_login_method: loginMethod,
      p_login_success: success,
      p_metadata: {
        timestamp,
        client_type: 'web',
        browser: getBrowserInfo(),
        device_type: getDeviceInfo(),
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        login_source: 'auth_store'
      }
    });

    if (error) {
      console.error('[AuthStore] 로그인 기록 RPC 오류:', error);
      // RPC 오류가 발생해도 로그인 프로세스는 계속 진행
      return { success: false, error: error.message };
    }

    console.log('[AuthStore] 로그인 활동이 성공적으로 기록되었습니다:', data);
    
    // 성공한 로그인인 경우 세션 정보를 로컬 스토리지에 저장
    if (success && data?.login_record_id) {
      localStorage.setItem('session_id', sessionId);
      localStorage.setItem('login_record_id', data.login_record_id);
      localStorage.setItem('login_timestamp', timestamp);
      
      // ActivityTracker에 세션 ID 설정
      const activityTracker = ActivityTracker.getInstance();
      activityTracker.setSessionId(sessionId);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('[AuthStore] 로그인 기록 중 예상치 못한 오류:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' };
  }
};

// 단순화된 인증 상태 관리
let authSubscription: any = null;
let isInitializing = false;

// 사용자 세션 처리 헬퍼 함수
const handleUserSession = async (user: SupabaseUser, set: any) => {
  try {
    console.log('[AuthStore] 사용자 프로필 로드 시작:', user.id);
    let profile = null;
    
    // 프로필 로드 시도 (ID로 먼저 조회)
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('[AuthStore] ID로 프로필 조회 오류:', profileError);
      
      // 프로필이 없는 경우 이메일로 기존 프로필 확인
      if (profileError.code === 'PGRST116') { // No rows returned
        console.log('[AuthStore] ID로 프로필을 찾을 수 없음. 이메일로 기존 프로필 확인 중...');
        
        // 이메일로 기존 프로필 확인
        const { data: existingProfile, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email!)
          .single();
          
        if (emailError && emailError.code === 'PGRST116') {
          // 이메일로도 프로필이 없는 경우에만 새로 생성
          console.log('[AuthStore] 이메일로도 프로필이 없어 새로 생성합니다.');
          
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.full_name || user.user_metadata?.name || user.email!.split('@')[0],
              company: null,
              phone: null,
              bio: null,
              subscription_plan: 'free',
              usage_count: 0,
              role: 'user'
            })
            .select()
            .single();
            
          if (insertError) {
            console.error('[AuthStore] 프로필 생성 실패:', insertError);
          } else {
            console.log('[AuthStore] 프로필 생성 성공:', insertData);
            profile = insertData;
          }
        } else if (existingProfile) {
          // 이메일로 기존 프로필을 찾은 경우, ID를 업데이트
          console.log('[AuthStore] 이메일로 기존 프로필 발견. ID 업데이트 중...', existingProfile);
          
          const { data: updatedProfile, error: updateError } = await supabase
            .from('users')
            .update({ id: user.id })
            .eq('email', user.email!)
            .select()
            .single();
            
          if (updateError) {
            console.error('[AuthStore] 프로필 ID 업데이트 실패:', updateError);
            // 업데이트 실패해도 기존 프로필 사용
            profile = existingProfile;
          } else {
            console.log('[AuthStore] 프로필 ID 업데이트 성공:', updatedProfile);
            profile = updatedProfile;
          }
        } else {
          console.error('[AuthStore] 이메일로 프로필 조회 중 오류:', emailError);
        }
      } else {
        // 다른 종류의 오류 (권한 문제, 네트워크 오류 등)
        console.error('[AuthStore] 프로필 조회 중 예상치 못한 오류:', profileError);
      }
    } else {
      console.log('[AuthStore] 프로필 로드 성공:', profileData);
      profile = profileData;
    }

    // 관리자 권한 확인 (프로필의 role만 신뢰)
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    
    // 월간 무료 포인트 지급 시도 (비동기로 처리하여 로그인 속도에 영향 없음)
    if (profile) {
      try {
        console.log('[AuthStore] 월간 무료 포인트 지급 확인 중...');
        const response = await fetch('/api/points/monthly-free', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.granted) {
            console.log('[AuthStore] 월간 무료 포인트 지급 성공:', result.message);
            // 토스트 알림은 UI에서 처리하도록 이벤트 발생
            window.dispatchEvent(new CustomEvent('monthlyPointsGranted', { 
              detail: { points: result.points, message: result.message } 
            }));
          } else {
            console.log('[AuthStore] 월간 무료 포인트:', result.message);
          }
        } else {
          console.warn('[AuthStore] 월간 무료 포인트 API 호출 실패:', response.status);
        }
      } catch (error) {
        console.error('[AuthStore] 월간 무료 포인트 지급 중 오류:', error);
        // 오류가 발생해도 로그인 프로세스는 계속 진행
      }
    }
    
    console.log('[AuthStore] 사용자 세션 처리 완료:', { 
      userId: user.id, 
      hasProfile: !!profile, 
      isAdmin 
    });
    
    set({ user, profile, isAdmin, loading: false, initialized: true });
    
  } catch (error) {
    console.error('[AuthStore] 사용자 세션 처리 중 예상치 못한 오류:', error);
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
        
        // 실패한 로그인 시도도 기록 (사용자 ID가 없으므로 이메일로 사용자 찾기)
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
          
          if (userData?.id) {
            await trackLoginActivity(userData.id, false);
          }
        } catch (trackError) {
          console.error('[AuthStore] 실패한 로그인 추적 오류:', trackError);
        }
        
        authGuard.finishLogin(false);
        set({ loading: false })
        return { error: error.message }
      }

      if (data.user && data.session) {
        console.log('[AuthStore] 로그인 성공:', data.user.email);
        
        // JWT 토큰을 localStorage에 저장
        if (data.session.access_token) {
          localStorage.setItem('token', data.session.access_token);
          console.log('[AuthStore] JWT 토큰 저장 완료');
        }
        
        await handleUserSession(data.user, set)
        
        // 로그인 활동 추적 (두 가지 방식 모두 사용)
        await trackLoginActivity(data.user.id);
        
        // ActivityTracker를 통한 추가 추적 (대시보드 통계용)
        try {
          const activityTracker = ActivityTracker.getInstance()
          activityTracker.setUserId(data.user.id)
          await activityTracker.trackLogin({
            method: 'email',
            email: data.user.email,
            userAgent: navigator.userAgent
          })
          console.log('[AuthStore] ActivityTracker 로그인 추적 완료')
        } catch (activityError) {
          console.error('[AuthStore] ActivityTracker 로그인 추적 오류:', activityError)
          // 활동 추적 실패는 로그인 기능에 영향을 주지 않음
        }
        
        authGuard.finishLogin(true);
        return {}
      } else {
        // 로그인 실패 기록
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
          
          if (userData?.id) {
            await trackLoginActivity(userData.id, false);
          }
        } catch (trackError) {
          console.error('[AuthStore] 실패한 로그인 추적 오류:', trackError);
        }
        
        authGuard.finishLogin(false);
        set({ loading: false })
        return { error: '로그인에 실패했습니다.' }
      }
    } catch (error) {
      console.error('[AuthStore] 로그인 예외:', error);
      
      // 예외 발생 시에도 실패 기록
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();
        
        if (userData?.id) {
          await trackLoginActivity(userData.id, false);
        }
      } catch (trackError) {
        console.error('[AuthStore] 예외 상황 로그인 추적 오류:', trackError);
      }
      
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
        // Check if user profile already exists
        const { data: existingProfile, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('email', data.user.email!)
          .single();

        let profile = null;

        if (checkError && checkError.code === 'PGRST116') {
          // Profile doesn't exist, create new one
          const { data: insertData, error: profileError } = await supabase
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
                role: 'user'
              },
            ])
            .select()
            .single();

          if (profileError) {
            console.error('[AuthStore] 회원가입 프로필 생성 실패:', profileError);
            return { error: 'Failed to create user profile' }
          }
          
          profile = insertData;
          
          // 회원가입 시 5,000포인트 지급 (한달 만료)
          try {
            const response = await fetch('/api/signup-bonus', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: data.user.id,
                action: 'signup-bonus'
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.granted) {
                console.log('[AuthStore] 회원가입 축하 포인트 지급 완료:', result.points + 'P');
              } else {
                console.log('[AuthStore] 회원가입 축하 포인트:', result.message);
              }
            } else {
              console.error('[AuthStore] 회원가입 축하 포인트 지급 실패');
            }
          } catch (pointError) {
            console.error('[AuthStore] 회원가입 축하 포인트 지급 중 오류:', pointError);
          }
        } else if (existingProfile) {
          // Profile exists, update ID if needed
          if (existingProfile.id !== data.user.id) {
            const { data: updatedProfile, error: updateError } = await supabase
              .from('users')
              .update({ id: data.user.id })
              .eq('email', data.user.email!)
              .select()
              .single();
              
            if (updateError) {
              console.error('[AuthStore] 회원가입 프로필 ID 업데이트 실패:', updateError);
              profile = existingProfile;
            } else {
              profile = updatedProfile;
            }
          } else {
            profile = existingProfile;
          }
        } else {
          console.error('[AuthStore] 회원가입 프로필 확인 중 오류:', checkError);
          return { error: 'Failed to verify user profile' }
        }

        set({ user: data.user, profile })
      }

      return {}
    } catch (error) {
      console.error('[AuthStore] 회원가입 중 예상치 못한 오류:', error);
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
        localStorage.removeItem('token')
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
    
    // 중복 초기화 방지 - 더 엄격한 체크
    if (currentState.initialized || isInitializing) {
      console.log('[AuthStore] 초기화 이미 완료되었거나 진행 중:', { initialized: currentState.initialized, isInitializing });
      return;
    }
    
    console.log('[AuthStore] 초기화 시작');
    isInitializing = true;
    
    // 초기화 시작 시 loading: true, initialized: false로 명확히 설정
    set({ loading: true, initialized: false });
    
    try {
      // 현재 세션 확인
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthStore] 세션 가져오기 오류:', error);
        set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
        isInitializing = false;
        return;
      }
      
      if (session?.user) {
        console.log('[AuthStore] 세션 사용자 발견:', session.user.email);
        // JWT 토큰 저장
        if (session.access_token) {
          localStorage.setItem('token', session.access_token);
        }
        
        await handleUserSession(session.user, set);
        
        // handleUserSession 완료 후 확실히 초기화 완료 상태로 설정
        const updatedState = get();
        set({ ...updatedState, loading: false, initialized: true });
      } else {
        console.log('[AuthStore] 세션 없음 - 로그아웃 상태로 설정');
        set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
      }
      
    } catch (error) {
      console.error('[AuthStore] 초기화 실패:', error);
      set({ user: null, profile: null, isAdmin: false, loading: false, initialized: true });
    } finally {
      isInitializing = false;
      
      // 최종 안전장치: 초기화가 완료되지 않았다면 강제로 완료 처리
      const finalState = get();
      if (!finalState.initialized || finalState.loading) {
        console.log('[AuthStore] 최종 안전장치 - 초기화 완료 처리');
        set({ ...finalState, initialized: true, loading: false });
      }
      
      console.log('[AuthStore] 초기화 완료 - 최종 상태:', { 
        initialized: get().initialized, 
        loading: get().loading,
        hasUser: !!get().user 
      });
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