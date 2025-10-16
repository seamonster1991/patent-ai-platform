# Python 로그인 기록 수정 스크립트

## 개요
Supabase 데이터베이스의 로그인 기록 시스템을 수정하고 개선하는 Python 스크립트입니다. 
RLS 정책 문제를 해결하고 로그인 활동이 정확히 기록되도록 보장합니다.

## 스크립트 파일들

### 1. 메인 로그인 기록 수정 스크립트 (fix_login_recording.py)

```python
#!/usr/bin/env python3
"""
로그인 기록 시스템 수정 스크립트
- RLS 정책 수정
- 테이블 구조 검증
- 로그인 기록 기능 테스트
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging

# Supabase 클라이언트 설정
try:
    from supabase import create_client, Client
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError as e:
    print(f"필수 패키지가 설치되지 않았습니다: {e}")
    print("다음 명령어로 설치하세요: pip install supabase psycopg2-binary")
    sys.exit(1)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('login_fix.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class LoginRecordingFixer:
    def __init__(self):
        """환경변수에서 Supabase 설정 로드"""
        self.supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.supabase_anon_key = os.getenv('SUPABASE_ANON_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_service_key:
            raise ValueError("SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다")
        
        # Supabase 클라이언트 초기화
        self.supabase: Client = create_client(self.supabase_url, self.supabase_service_key)
        logger.info("Supabase 클라이언트 초기화 완료")
    
    async def check_table_structure(self) -> Dict[str, Any]:
        """테이블 구조 확인"""
        logger.info("테이블 구조 확인 중...")
        
        tables_to_check = ['user_activities', 'user_login_logs', 'users']
        results = {}
        
        for table in tables_to_check:
            try:
                # 테이블 존재 여부 확인
                response = self.supabase.table(table).select("*").limit(1).execute()
                results[table] = {
                    'exists': True,
                    'accessible': True,
                    'sample_count': len(response.data)
                }
                logger.info(f"✅ {table} 테이블 접근 가능")
            except Exception as e:
                results[table] = {
                    'exists': False,
                    'accessible': False,
                    'error': str(e)
                }
                logger.error(f"❌ {table} 테이블 접근 실패: {e}")
        
        return results
    
    async def fix_rls_policies(self) -> bool:
        """RLS 정책 수정"""
        logger.info("RLS 정책 수정 중...")
        
        sql_commands = [
            # user_activities 테이블 RLS 정책 수정
            """
            -- user_activities 기존 정책 삭제
            DROP POLICY IF EXISTS "Users can view own activities" ON user_activities;
            DROP POLICY IF EXISTS "Users can insert own activities" ON user_activities;
            DROP POLICY IF EXISTS "select own activities" ON user_activities;
            DROP POLICY IF EXISTS "insert own activities" ON user_activities;
            
            -- 새로운 정책 생성
            CREATE POLICY "사용자는 자신의 활동만 조회 가능" ON user_activities
                FOR SELECT USING (auth.uid() = user_id);
            
            CREATE POLICY "사용자는 자신의 활동만 삽입 가능" ON user_activities
                FOR INSERT WITH CHECK (auth.uid() = user_id);
            
            CREATE POLICY "서비스 역할은 모든 활동 접근 가능" ON user_activities
                FOR ALL USING (auth.role() = 'service_role');
            """,
            
            # user_login_logs 테이블 RLS 정책 수정
            """
            -- user_login_logs 기존 정책 삭제
            DROP POLICY IF EXISTS "Users can view own login logs" ON user_login_logs;
            DROP POLICY IF EXISTS "Allow login log insertion" ON user_login_logs;
            
            -- 새로운 정책 생성
            CREATE POLICY "사용자는 자신의 로그인 기록만 조회 가능" ON user_login_logs
                FOR SELECT USING (auth.uid() = user_id);
            
            CREATE POLICY "로그인 기록 삽입 허용" ON user_login_logs
                FOR INSERT WITH CHECK (true);
            
            CREATE POLICY "서비스 역할은 모든 로그인 기록 접근 가능" ON user_login_logs
                FOR ALL USING (auth.role() = 'service_role');
            """,
            
            # 권한 재설정
            """
            -- 권한 재부여
            GRANT SELECT, INSERT ON user_activities TO authenticated;
            GRANT SELECT, INSERT ON user_login_logs TO authenticated;
            GRANT SELECT ON user_activities TO anon;
            GRANT SELECT ON user_login_logs TO anon;
            """
        ]
        
        try:
            for sql in sql_commands:
                response = self.supabase.rpc('exec_sql', {'sql': sql}).execute()
                if response.data:
                    logger.info(f"✅ SQL 실행 성공: {sql[:50]}...")
                else:
                    logger.warning(f"⚠️ SQL 실행 결과 없음: {sql[:50]}...")
            
            logger.info("✅ RLS 정책 수정 완료")
            return True
            
        except Exception as e:
            logger.error(f"❌ RLS 정책 수정 실패: {e}")
            return False
    
    async def create_login_recording_function(self) -> bool:
        """로그인 기록 함수 생성"""
        logger.info("로그인 기록 함수 생성 중...")
        
        function_sql = """
        CREATE OR REPLACE FUNCTION record_login_activity(
            p_user_id UUID,
            p_ip_address TEXT DEFAULT NULL,
            p_user_agent TEXT DEFAULT NULL,
            p_session_id TEXT DEFAULT NULL
        )
        RETURNS UUID
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            activity_id UUID;
            login_log_id UUID;
        BEGIN
            -- user_activities에 로그인 활동 기록
            INSERT INTO user_activities (user_id, activity_type, activity_data)
            VALUES (
                p_user_id,
                'login',
                jsonb_build_object(
                    'ip_address', COALESCE(p_ip_address, ''),
                    'user_agent', COALESCE(p_user_agent, ''),
                    'session_id', COALESCE(p_session_id, ''),
                    'timestamp', NOW()
                )
            )
            RETURNING id INTO activity_id;
            
            -- user_login_logs에 상세 로그인 기록
            INSERT INTO user_login_logs (user_id, login_time, ip_address, user_agent, session_id)
            VALUES (
                p_user_id,
                NOW(),
                p_ip_address::INET,
                p_user_agent,
                p_session_id
            )
            RETURNING id INTO login_log_id;
            
            -- users 테이블의 total_logins 업데이트
            UPDATE users 
            SET total_logins = COALESCE(total_logins, 0) + 1,
                updated_at = NOW()
            WHERE id = p_user_id;
            
            RETURN activity_id;
        END;
        $$;
        
        -- 함수 권한 부여
        GRANT EXECUTE ON FUNCTION record_login_activity(UUID, TEXT, TEXT, TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION record_login_activity(UUID, TEXT, TEXT, TEXT) TO anon;
        """
        
        try:
            response = self.supabase.rpc('exec_sql', {'sql': function_sql}).execute()
            logger.info("✅ 로그인 기록 함수 생성 완료")
            return True
        except Exception as e:
            logger.error(f"❌ 로그인 기록 함수 생성 실패: {e}")
            return False
    
    async def test_login_recording(self, test_user_id: str) -> bool:
        """로그인 기록 기능 테스트"""
        logger.info(f"로그인 기록 기능 테스트 중... (사용자 ID: {test_user_id})")
        
        try:
            # 테스트 로그인 기록
            test_data = {
                'p_user_id': test_user_id,
                'p_ip_address': '192.168.1.100',
                'p_user_agent': 'Mozilla/5.0 (Test Browser)',
                'p_session_id': f'test_session_{datetime.now().timestamp()}'
            }
            
            response = self.supabase.rpc('record_login_activity', test_data).execute()
            
            if response.data:
                logger.info(f"✅ 테스트 로그인 기록 성공: {response.data}")
                
                # 기록된 데이터 확인
                activities = self.supabase.table('user_activities')\
                    .select('*')\
                    .eq('user_id', test_user_id)\
                    .eq('activity_type', 'login')\
                    .order('created_at', desc=True)\
                    .limit(1)\
                    .execute()
                
                if activities.data:
                    logger.info(f"✅ user_activities 테이블에 기록 확인: {activities.data[0]['id']}")
                
                login_logs = self.supabase.table('user_login_logs')\
                    .select('*')\
                    .eq('user_id', test_user_id)\
                    .order('login_time', desc=True)\
                    .limit(1)\
                    .execute()
                
                if login_logs.data:
                    logger.info(f"✅ user_login_logs 테이블에 기록 확인: {login_logs.data[0]['id']}")
                
                return True
            else:
                logger.error("❌ 테스트 로그인 기록 실패: 응답 데이터 없음")
                return False
                
        except Exception as e:
            logger.error(f"❌ 테스트 로그인 기록 실패: {e}")
            return False
    
    async def get_test_user(self) -> Optional[str]:
        """테스트용 사용자 ID 조회"""
        try:
            users = self.supabase.table('users')\
                .select('id, email')\
                .limit(1)\
                .execute()
            
            if users.data:
                user_id = users.data[0]['id']
                logger.info(f"테스트 사용자 ID: {user_id}")
                return user_id
            else:
                logger.warning("테스트용 사용자를 찾을 수 없습니다")
                return None
        except Exception as e:
            logger.error(f"테스트 사용자 조회 실패: {e}")
            return None
    
    async def run_full_fix(self) -> Dict[str, Any]:
        """전체 수정 프로세스 실행"""
        logger.info("🚀 로그인 기록 시스템 수정 시작")
        
        results = {
            'table_check': {},
            'rls_fix': False,
            'function_creation': False,
            'test_result': False,
            'success': False
        }
        
        try:
            # 1. 테이블 구조 확인
            results['table_check'] = await self.check_table_structure()
            
            # 2. RLS 정책 수정
            results['rls_fix'] = await self.fix_rls_policies()
            
            # 3. 로그인 기록 함수 생성
            results['function_creation'] = await self.create_login_recording_function()
            
            # 4. 테스트 실행
            test_user_id = await self.get_test_user()
            if test_user_id:
                results['test_result'] = await self.test_login_recording(test_user_id)
            
            # 전체 성공 여부 판단
            results['success'] = (
                results['rls_fix'] and 
                results['function_creation'] and 
                results['test_result']
            )
            
            if results['success']:
                logger.info("🎉 로그인 기록 시스템 수정 완료!")
            else:
                logger.error("❌ 로그인 기록 시스템 수정 중 일부 실패")
            
        except Exception as e:
            logger.error(f"❌ 전체 수정 프로세스 실패: {e}")
            results['error'] = str(e)
        
        return results

async def main():
    """메인 실행 함수"""
    try:
        fixer = LoginRecordingFixer()
        results = await fixer.run_full_fix()
        
        print("\n" + "="*50)
        print("로그인 기록 시스템 수정 결과")
        print("="*50)
        print(json.dumps(results, indent=2, ensure_ascii=False))
        
        if results['success']:
            print("\n✅ 모든 수정 작업이 성공적으로 완료되었습니다!")
            return 0
        else:
            print("\n❌ 일부 수정 작업이 실패했습니다. 로그를 확인하세요.")
            return 1
            
    except Exception as e:
        logger.error(f"메인 실행 실패: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

### 2. 대시보드 통계 수집 스크립트 (collect_dashboard_stats.py)

```python
#!/usr/bin/env python3
"""
대시보드 통계 수집 및 업데이트 스크립트
- 실시간 통계 계산
- dashboard_statistics 테이블 업데이트
- 성능 최적화된 쿼리 실행
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import logging

try:
    from supabase import create_client, Client
except ImportError as e:
    print(f"필수 패키지가 설치되지 않았습니다: {e}")
    print("다음 명령어로 설치하세요: pip install supabase")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DashboardStatsCollector:
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_service_key:
            raise ValueError("SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_service_key)
        logger.info("Supabase 클라이언트 초기화 완료")
    
    async def collect_login_stats(self) -> Dict[str, int]:
        """로그인 통계 수집"""
        try:
            # 오늘 로그인 수
            today = datetime.now(timezone.utc).date()
            
            login_logs = self.supabase.table('user_login_logs')\
                .select('user_id')\
                .gte('login_time', today.isoformat())\
                .execute()
            
            # 총 로그인 수
            total_logins = len(login_logs.data) if login_logs.data else 0
            
            # 고유 사용자 로그인 수
            unique_users = len(set(log['user_id'] for log in login_logs.data)) if login_logs.data else 0
            
            logger.info(f"로그인 통계: 총 {total_logins}회, 고유 사용자 {unique_users}명")
            
            return {
                'total_logins': total_logins,
                'unique_user_logins': unique_users
            }
            
        except Exception as e:
            logger.error(f"로그인 통계 수집 실패: {e}")
            return {'total_logins': 0, 'unique_user_logins': 0}
    
    async def collect_search_stats(self) -> Dict[str, Any]:
        """검색 통계 수집"""
        try:
            today = datetime.now(timezone.utc).date()
            
            # 개인 검색 수
            searches = self.supabase.table('search_history')\
                .select('user_id')\
                .gte('created_at', today.isoformat())\
                .execute()
            
            personal_searches = len(searches.data) if searches.data else 0
            
            # 사용자별 평균 검색 수 계산
            if searches.data:
                user_search_counts = {}
                for search in searches.data:
                    user_id = search['user_id']
                    user_search_counts[user_id] = user_search_counts.get(user_id, 0) + 1
                
                market_search_average = sum(user_search_counts.values()) / len(user_search_counts)
            else:
                market_search_average = 0.0
            
            logger.info(f"검색 통계: 개인 {personal_searches}회, 평균 {market_search_average:.2f}회")
            
            return {
                'personal_searches': personal_searches,
                'market_search_average': round(market_search_average, 2)
            }
            
        except Exception as e:
            logger.error(f"검색 통계 수집 실패: {e}")
            return {'personal_searches': 0, 'market_search_average': 0.0}
    
    async def collect_report_stats(self) -> Dict[str, Any]:
        """리포트 통계 수집"""
        try:
            today = datetime.now(timezone.utc).date()
            
            # 개인 리포트 수
            reports = self.supabase.table('ai_analysis_reports')\
                .select('user_id')\
                .gte('created_at', today.isoformat())\
                .execute()
            
            personal_reports = len(reports.data) if reports.data else 0
            
            # 사용자별 평균 리포트 수 계산
            if reports.data:
                user_report_counts = {}
                for report in reports.data:
                    user_id = report['user_id']
                    user_report_counts[user_id] = user_report_counts.get(user_id, 0) + 1
                
                market_report_average = sum(user_report_counts.values()) / len(user_report_counts)
            else:
                market_report_average = 0.0
            
            logger.info(f"리포트 통계: 개인 {personal_reports}회, 평균 {market_report_average:.2f}회")
            
            return {
                'personal_reports': personal_reports,
                'market_report_average': round(market_report_average, 2)
            }
            
        except Exception as e:
            logger.error(f"리포트 통계 수집 실패: {e}")
            return {'personal_reports': 0, 'market_report_average': 0.0}
    
    async def get_total_users(self) -> int:
        """총 사용자 수 조회"""
        try:
            users = self.supabase.table('users')\
                .select('id', count='exact')\
                .execute()
            
            total_users = users.count if users.count else 0
            logger.info(f"총 사용자 수: {total_users}명")
            
            return total_users
            
        except Exception as e:
            logger.error(f"사용자 수 조회 실패: {e}")
            return 0
    
    async def update_dashboard_statistics(self, stats: Dict[str, Any]) -> bool:
        """대시보드 통계 테이블 업데이트"""
        try:
            today = datetime.now(timezone.utc).date()
            
            # 기존 데이터 확인
            existing = self.supabase.table('dashboard_statistics')\
                .select('*')\
                .eq('stat_date', today.isoformat())\
                .execute()
            
            if existing.data:
                # 업데이트
                response = self.supabase.table('dashboard_statistics')\
                    .update({
                        **stats,
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    })\
                    .eq('stat_date', today.isoformat())\
                    .execute()
                logger.info("기존 통계 데이터 업데이트 완료")
            else:
                # 새로 삽입
                response = self.supabase.table('dashboard_statistics')\
                    .insert({
                        'stat_date': today.isoformat(),
                        **stats,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    })\
                    .execute()
                logger.info("새 통계 데이터 삽입 완료")
            
            return True
            
        except Exception as e:
            logger.error(f"대시보드 통계 업데이트 실패: {e}")
            return False
    
    async def run_collection(self) -> Dict[str, Any]:
        """전체 통계 수집 실행"""
        logger.info("🚀 대시보드 통계 수집 시작")
        
        try:
            # 각 통계 수집
            login_stats = await self.collect_login_stats()
            search_stats = await self.collect_search_stats()
            report_stats = await self.collect_report_stats()
            total_users = await self.get_total_users()
            
            # 통합 통계 데이터
            all_stats = {
                **login_stats,
                **search_stats,
                **report_stats,
                'total_users': total_users
            }
            
            # 데이터베이스 업데이트
            update_success = await self.update_dashboard_statistics(all_stats)
            
            result = {
                'success': update_success,
                'stats': all_stats,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            if update_success:
                logger.info("🎉 대시보드 통계 수집 완료!")
            else:
                logger.error("❌ 대시보드 통계 업데이트 실패")
            
            return result
            
        except Exception as e:
            logger.error(f"통계 수집 실패: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

async def main():
    """메인 실행 함수"""
    try:
        collector = DashboardStatsCollector()
        result = await collector.run_collection()
        
        print("\n" + "="*50)
        print("대시보드 통계 수집 결과")
        print("="*50)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        return 0 if result['success'] else 1
        
    except Exception as e:
        logger.error(f"메인 실행 실패: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

### 3. 실행 방법

```bash
# 1. 필수 패키지 설치
pip install supabase psycopg2-binary

# 2. 환경변수 설정 (.env 파일)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# 3. 로그인 기록 시스템 수정 실행
python fix_login_recording.py

# 4. 대시보드 통계 수집 실행
python collect_dashboard_stats.py

# 5. 로그 파일 확인
cat login_fix.log
```

### 4. 예상 결과

스크립트 실행 후 다음과 같은 개선사항을 확인할 수 있습니다:

1. **로그인 기록 정상화**: 모든 로그인이 user_activities와 user_login_logs 테이블에 정확히 기록
2. **RLS 정책 수정**: 사용자별 데이터 접근 권한 정상화
3. **통계 데이터 정확성**: 대시보드에 실시간 정확한 통계 표시
4. **성능 개선**: 최적화된 쿼리로 빠른 데이터 조회

이 스크립트들을 통해 로그인 기록 문제가 완전히 해결되고, 대시보드에 정확한 통계가 표시됩니다.