"""
Database connection and session management
Supabase PostgreSQL 연결 관리
"""

import asyncpg
import logging
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from app.core.config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    """데이터베이스 연결 관리자"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        
    async def init_pool(self):
        """연결 풀 초기화"""
        try:
            self.pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=5,
                max_size=20,
                command_timeout=60,
                server_settings={
                    'jit': 'off'
                }
            )
            logger.info("✅ 데이터베이스 연결 풀 생성 완료")
        except Exception as e:
            logger.error(f"❌ 데이터베이스 연결 풀 생성 실패: {e}")
            raise
    
    async def close_pool(self):
        """연결 풀 종료"""
        if self.pool:
            await self.pool.close()
            logger.info("✅ 데이터베이스 연결 풀 종료 완료")
    
    @asynccontextmanager
    async def get_connection(self):
        """데이터베이스 연결 컨텍스트 매니저"""
        if not self.pool:
            raise RuntimeError("데이터베이스 연결 풀이 초기화되지 않았습니다")
        
        async with self.pool.acquire() as connection:
            yield connection
    
    async def execute_query(self, query: str, *args) -> List[Dict[str, Any]]:
        """쿼리 실행 (SELECT)"""
        async with self.get_connection() as conn:
            try:
                rows = await conn.fetch(query, *args)
                return [dict(row) for row in rows]
            except Exception as e:
                logger.error(f"쿼리 실행 오류: {e}")
                raise
    
    async def execute_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """단일 레코드 조회"""
        async with self.get_connection() as conn:
            try:
                row = await conn.fetchrow(query, *args)
                return dict(row) if row else None
            except Exception as e:
                logger.error(f"단일 쿼리 실행 오류: {e}")
                raise
    
    async def execute_command(self, query: str, *args) -> str:
        """명령 실행 (INSERT, UPDATE, DELETE)"""
        async with self.get_connection() as conn:
            try:
                result = await conn.execute(query, *args)
                return result
            except Exception as e:
                logger.error(f"명령 실행 오류: {e}")
                raise
    
    async def execute_transaction(self, queries: List[tuple]) -> bool:
        """트랜잭션 실행"""
        async with self.get_connection() as conn:
            async with conn.transaction():
                try:
                    for query, args in queries:
                        await conn.execute(query, *args)
                    return True
                except Exception as e:
                    logger.error(f"트랜잭션 실행 오류: {e}")
                    raise
    
    async def get_table_info(self, table_name: str) -> List[Dict[str, Any]]:
        """테이블 정보 조회"""
        query = """
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
        """
        return await self.execute_query(query, table_name)
    
    async def check_table_exists(self, table_name: str) -> bool:
        """테이블 존재 여부 확인"""
        query = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
        )
        """
        result = await self.execute_one(query, table_name)
        return result['exists'] if result else False

# 전역 데이터베이스 매니저 인스턴스
db_manager = DatabaseManager()

async def init_db():
    """데이터베이스 초기화"""
    await db_manager.init_pool()
    
    # 필수 테이블 존재 여부 확인
    required_tables = [
        'admin_users', 'admin_roles', 'admin_sessions', 
        'admin_activity_logs', 'system_settings'
    ]
    
    for table in required_tables:
        exists = await db_manager.check_table_exists(table)
        if not exists:
            logger.warning(f"⚠️ 필수 테이블 '{table}'이 존재하지 않습니다")
        else:
            logger.info(f"✅ 테이블 '{table}' 확인됨")

async def close_db():
    """데이터베이스 연결 종료"""
    await db_manager.close_pool()

def get_db() -> DatabaseManager:
    """데이터베이스 매니저 의존성"""
    return db_manager