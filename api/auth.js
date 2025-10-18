// User Authentication API - 일반 사용자 로그인/회원가입
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'patent-ai-jwt-secret-key-2024-development';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log(`[Auth API] ${req.method} ${req.url}`);

    if (req.method === 'POST') {
      const { email, password, action } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: '이메일과 비밀번호를 입력해주세요.'
        });
      }

      // 로그인 처리
      if (!action || action === 'login') {
        try {
          console.log(`[Auth API] 로그인 시도: ${email}`);

          // Supabase Auth를 통한 로그인
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
          });

          if (error) {
            console.error('[Auth API] Supabase 로그인 오류:', error);
            return res.status(401).json({
              success: false,
              error: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
          }

          if (!data.user) {
            return res.status(401).json({
              success: false,
              error: '로그인에 실패했습니다.'
            });
          }

          // 사용자 프로필 정보 가져오기
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.warn('[Auth API] 프로필 조회 실패:', profileError);
          }

          // JWT 토큰 생성 (추가 보안을 위해)
          const jwtToken = jwt.sign(
            {
              id: data.user.id,
              email: data.user.email,
              role: 'user'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          console.log(`[Auth API] 로그인 성공: ${email}`);

          return res.status(200).json({
            success: true,
            message: '로그인 성공',
            data: {
              user: data.user,
              session: data.session,
              profile: profile || null,
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              jwt_token: jwtToken
            }
          });

        } catch (error) {
          console.error('[Auth API] 로그인 처리 오류:', error);
          return res.status(500).json({
            success: false,
            error: '서버 내부 오류가 발생했습니다.'
          });
        }
      }

      // 회원가입 처리
      if (action === 'register') {
        const { name, phone, company } = req.body;

        if (!name || !phone) {
          return res.status(400).json({
            success: false,
            error: '이름과 전화번호를 입력해주세요.'
          });
        }

        try {
          console.log(`[Auth API] 회원가입 시도: ${email}`);

          // Supabase Auth를 통한 회원가입
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
              data: {
                name: name.trim(),
                phone: phone.trim(),
                company: company?.trim() || ''
              }
            }
          });

          if (error) {
            console.error('[Auth API] Supabase 회원가입 오류:', error);
            return res.status(400).json({
              success: false,
              error: error.message || '회원가입에 실패했습니다.'
            });
          }

          if (!data.user) {
            return res.status(400).json({
              success: false,
              error: '회원가입에 실패했습니다.'
            });
          }

          // 사용자 프로필 정보 저장
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: name.trim(),
              phone: phone.trim(),
              company: company?.trim() || '',
              created_at: new Date().toISOString()
            });

          if (profileError) {
            console.error('[Auth API] 프로필 저장 오류:', profileError);
          }

          // 신규 가입자에게 5000포인트 지급
          try {
            const { error: pointError } = await supabase
              .from('user_point_balances')
              .insert({
                user_id: data.user.id,
                balance: 5000,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (!pointError) {
              // 포인트 거래 기록 추가
              await supabase
                .from('point_transactions')
                .insert({
                  user_id: data.user.id,
                  amount: 5000,
                  transaction_type: 'credit',
                  description: '신규 가입 축하 포인트',
                  created_at: new Date().toISOString()
                });

              console.log(`[Auth API] 신규 가입자 포인트 지급 완료: ${email}`);
            }
          } catch (pointError) {
            console.error('[Auth API] 포인트 지급 오류:', pointError);
          }

          console.log(`[Auth API] 회원가입 성공: ${email}`);

          return res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
            data: {
              user: data.user,
              session: data.session
            }
          });

        } catch (error) {
          console.error('[Auth API] 회원가입 처리 오류:', error);
          return res.status(500).json({
            success: false,
            error: '서버 내부 오류가 발생했습니다.'
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: '지원하지 않는 작업입니다.'
      });
    }

    // GET 요청 - 토큰 검증
    if (req.method === 'GET') {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: '인증 토큰이 필요합니다.'
        });
      }

      const token = authHeader.substring(7);

      try {
        // Supabase 토큰 검증
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
          return res.status(401).json({
            success: false,
            error: '유효하지 않은 토큰입니다.'
          });
        }

        // 사용자 프로필 정보 가져오기
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        return res.status(200).json({
          success: true,
          data: {
            user: user,
            profile: profile || null
          }
        });

      } catch (error) {
        console.error('[Auth API] 토큰 검증 오류:', error);
        return res.status(401).json({
          success: false,
          error: '토큰 검증에 실패했습니다.'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: '지원하지 않는 HTTP 메서드입니다.'
    });

  } catch (error) {
    console.error('[Auth API] 전체 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.'
    });
  }
}