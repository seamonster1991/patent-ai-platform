#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
대시보드 데이터 분석 및 관리 시스템 테스트
실제 데이터베이스를 기반으로 한 데이터 분석 및 출력 테스트

요구사항:
1. 오늘을 기준으로 과거 100일치의 데이터만 db에 저장하고 100일이 넘는 데이터는 자동삭제
2. 검색 IPC/CPC 분석에서 내 데이터는 검색추이 - 검색전환율의 총검색수에 저장된 기술 분야별 분포를 분석해서 그래프로 출력
3. 검색 IPC/CPC 분석에서 시장데이터는 검색추이에서 사용된 시장의 총 데이터의 기술 분야별 분포를 분석하여 그래프로 출력
4. 리포트 IPC/CPC 분석에서 내 데이터는 리포트추이 - 리포트전환율의 총리포트수에 저장된 기술 분야별 분포를 분석해서 그래프로 출력
5. 리포트 IPC/CPC 분석에서 시장데이터는 리포트추이에서 사용된 시장의 총 데이터의 기술 분야별 분포를 분석하여 그래프로 출력
6. 최근 검색어 : 검색추이 - 검색전환율의 총 검색수에서 가장 최근의 검색어 10개 출력
7. 최근 리포트 : 리포트추이 - 리포트전환율의 총 리포트수에서 가장 최근에 생성된 리포트 제목 10개 출력
"""

import os
import sys
import psycopg2
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from datetime import datetime, timedelta
from collections import Counter
import json
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# 한글 폰트 설정
plt.rcParams['font.family'] = ['Malgun Gothic', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

class DashboardDataAnalyzer:
    """대시보드 데이터 분석 클래스"""
    
    def __init__(self, db_config: Dict[str, str]):
        """
        데이터베이스 연결 초기화
        
        Args:
            db_config: 데이터베이스 연결 설정
        """
        self.db_config = db_config
        self.conn = None
        self.retention_days = 100  # 데이터 보존 기간
        
    def connect_database(self) -> bool:
        """데이터베이스 연결"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            print("✅ 데이터베이스 연결 성공")
            return True
        except Exception as e:
            print(f"❌ 데이터베이스 연결 실패: {e}")
            return False
    
    def close_connection(self):
        """데이터베이스 연결 종료"""
        if self.conn:
            self.conn.close()
            print("🔌 데이터베이스 연결 종료")
    
    def cleanup_old_data(self) -> Dict[str, int]:
        """
        1. 100일 이상 된 데이터 자동 삭제
        
        Returns:
            삭제된 레코드 수 정보
        """
        print("\n" + "="*60)
        print("📅 1. 데이터 자동 정리 작업 시작")
        print("="*60)
        
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)
        deleted_counts = {}
        
        try:
            cursor = self.conn.cursor()
            
            # 검색 기록 정리
            cursor.execute("""
                DELETE FROM search_history 
                WHERE created_at < %s
            """, (cutoff_date,))
            deleted_counts['search_history'] = cursor.rowcount
            
            # AI 분석 리포트 정리
            cursor.execute("""
                DELETE FROM ai_analysis_reports 
                WHERE created_at < %s
            """, (cutoff_date,))
            deleted_counts['ai_analysis_reports'] = cursor.rowcount
            
            # 사용자 활동 정리
            cursor.execute("""
                DELETE FROM user_activities 
                WHERE created_at < %s
            """, (cutoff_date,))
            deleted_counts['user_activities'] = cursor.rowcount
            
            self.conn.commit()
            
            print(f"🗑️  기준 날짜: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"📊 삭제된 검색 기록: {deleted_counts['search_history']:,}개")
            print(f"📋 삭제된 AI 리포트: {deleted_counts['ai_analysis_reports']:,}개")
            print(f"👤 삭제된 사용자 활동: {deleted_counts['user_activities']:,}개")
            print(f"🔢 총 삭제된 레코드: {sum(deleted_counts.values()):,}개")
            
            return deleted_counts
            
        except Exception as e:
            print(f"❌ 데이터 정리 실패: {e}")
            self.conn.rollback()
            return {}
    
    def analyze_user_search_technology_fields(self, user_id: str = None) -> pd.DataFrame:
        """
        2. 검색 IPC/CPC 분석 - 개인 데이터 (검색 기술 분야별 분포)
        
        Args:
            user_id: 분석할 사용자 ID (None이면 전체 사용자)
            
        Returns:
            기술 분야별 검색 분포 데이터
        """
        print("\n" + "="*60)
        print("🔍 2. 개인 검색 기술 분야 분석")
        print("="*60)
        
        try:
            cursor = self.conn.cursor()
            
            if user_id:
                query = """
                    SELECT 
                        COALESCE(technology_field, 'General') as field,
                        COUNT(*) as search_count,
                        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                    FROM search_history 
                    WHERE user_id = %s 
                        AND created_at >= NOW() - INTERVAL '%s days'
                    GROUP BY technology_field
                    ORDER BY search_count DESC
                """
                cursor.execute(query, (user_id, self.retention_days))
            else:
                # 첫 번째 사용자 ID 가져오기
                cursor.execute("SELECT id FROM users LIMIT 1")
                result = cursor.fetchone()
                if not result:
                    print("❌ 사용자 데이터가 없습니다.")
                    return pd.DataFrame()
                
                user_id = result[0]
                query = """
                    SELECT 
                        COALESCE(technology_field, 'General') as field,
                        COUNT(*) as search_count,
                        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                    FROM search_history 
                    WHERE user_id = %s 
                        AND created_at >= NOW() - INTERVAL '%s days'
                    GROUP BY technology_field
                    ORDER BY search_count DESC
                """
                cursor.execute(query, (user_id, self.retention_days))
            
            results = cursor.fetchall()
            df = pd.DataFrame(results, columns=['기술분야', '검색수', '비율(%)'])
            
            print(f"👤 분석 대상 사용자: {user_id}")
            print(f"📊 개인 검색 기술 분야 분포:")
            print("-" * 50)
            for _, row in df.iterrows():
                print(f"  {row['기술분야']:<20} {row['검색수']:>5}회 ({row['비율(%)']:>5.1f}%)")
            
            if df.empty:
                print("📝 검색 데이터가 없습니다.")
            
            return df
            
        except Exception as e:
            print(f"❌ 개인 검색 분석 실패: {e}")
            return pd.DataFrame()
    
    def analyze_market_search_technology_fields(self) -> pd.DataFrame:
        """
        3. 검색 IPC/CPC 분석 - 시장 데이터 (전체 시장의 검색 기술 분야별 분포)
        
        Returns:
            시장 전체 기술 분야별 검색 분포 데이터
        """
        print("\n" + "="*60)
        print("🌐 3. 시장 검색 기술 분야 분석")
        print("="*60)
        
        try:
            cursor = self.conn.cursor()
            
            query = """
                SELECT 
                    COALESCE(technology_field, 'General') as field,
                    COUNT(*) as search_count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                FROM search_history 
                WHERE created_at >= NOW() - INTERVAL '%s days'
                GROUP BY technology_field
                ORDER BY search_count DESC
                LIMIT 20
            """
            cursor.execute(query, (self.retention_days,))
            
            results = cursor.fetchall()
            df = pd.DataFrame(results, columns=['기술분야', '검색수', '비율(%)'])
            
            print(f"🏢 시장 전체 검색 기술 분야 분포 (상위 20개):")
            print("-" * 50)
            for _, row in df.iterrows():
                print(f"  {row['기술분야']:<20} {row['검색수']:>6}회 ({row['비율(%)']:>5.1f}%)")
            
            if df.empty:
                print("📝 시장 검색 데이터가 없습니다.")
            
            return df
            
        except Exception as e:
            print(f"❌ 시장 검색 분석 실패: {e}")
            return pd.DataFrame()
    
    def analyze_user_report_technology_fields(self, user_id: str = None) -> pd.DataFrame:
        """
        4. 리포트 IPC/CPC 분석 - 개인 데이터 (리포트 기술 분야별 분포)
        
        Args:
            user_id: 분석할 사용자 ID (None이면 전체 사용자)
            
        Returns:
            기술 분야별 리포트 분포 데이터
        """
        print("\n" + "="*60)
        print("📋 4. 개인 리포트 기술 분야 분석")
        print("="*60)
        
        try:
            cursor = self.conn.cursor()
            
            if user_id:
                query = """
                    SELECT 
                        COALESCE(technology_field, 'General') as field,
                        COUNT(*) as report_count,
                        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                    FROM ai_analysis_reports 
                    WHERE user_id = %s 
                        AND created_at >= NOW() - INTERVAL '%s days'
                    GROUP BY technology_field
                    ORDER BY report_count DESC
                """
                cursor.execute(query, (user_id, self.retention_days))
            else:
                # 첫 번째 사용자 ID 가져오기
                cursor.execute("SELECT id FROM users LIMIT 1")
                result = cursor.fetchone()
                if not result:
                    print("❌ 사용자 데이터가 없습니다.")
                    return pd.DataFrame()
                
                user_id = result[0]
                query = """
                    SELECT 
                        COALESCE(technology_field, 'General') as field,
                        COUNT(*) as report_count,
                        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                    FROM ai_analysis_reports 
                    WHERE user_id = %s 
                        AND created_at >= NOW() - INTERVAL '%s days'
                    GROUP BY technology_field
                    ORDER BY report_count DESC
                """
                cursor.execute(query, (user_id, self.retention_days))
            
            results = cursor.fetchall()
            df = pd.DataFrame(results, columns=['기술분야', '리포트수', '비율(%)'])
            
            print(f"👤 분석 대상 사용자: {user_id}")
            print(f"📊 개인 리포트 기술 분야 분포:")
            print("-" * 50)
            for _, row in df.iterrows():
                print(f"  {row['기술분야']:<20} {row['리포트수']:>5}개 ({row['비율(%)']:>5.1f}%)")
            
            if df.empty:
                print("📝 리포트 데이터가 없습니다.")
            
            return df
            
        except Exception as e:
            print(f"❌ 개인 리포트 분석 실패: {e}")
            return pd.DataFrame()
    
    def analyze_market_report_technology_fields(self) -> pd.DataFrame:
        """
        5. 리포트 IPC/CPC 분석 - 시장 데이터 (전체 시장의 리포트 기술 분야별 분포)
        
        Returns:
            시장 전체 기술 분야별 리포트 분포 데이터
        """
        print("\n" + "="*60)
        print("🌐 5. 시장 리포트 기술 분야 분석")
        print("="*60)
        
        try:
            cursor = self.conn.cursor()
            
            query = """
                SELECT 
                    COALESCE(technology_field, 'General') as field,
                    COUNT(*) as report_count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                FROM ai_analysis_reports 
                WHERE created_at >= NOW() - INTERVAL '%s days'
                GROUP BY technology_field
                ORDER BY report_count DESC
                LIMIT 20
            """
            cursor.execute(query, (self.retention_days,))
            
            results = cursor.fetchall()
            df = pd.DataFrame(results, columns=['기술분야', '리포트수', '비율(%)'])
            
            print(f"🏢 시장 전체 리포트 기술 분야 분포 (상위 20개):")
            print("-" * 50)
            for _, row in df.iterrows():
                print(f"  {row['기술분야']:<20} {row['리포트수']:>6}개 ({row['비율(%)']:>5.1f}%)")
            
            if df.empty:
                print("📝 시장 리포트 데이터가 없습니다.")
            
            return df
            
        except Exception as e:
            print(f"❌ 시장 리포트 분석 실패: {e}")
            return pd.DataFrame()
    
    def get_recent_searches(self, limit: int = 10) -> List[Dict]:
        """
        6. 최근 검색어 10개 출력
        
        Args:
            limit: 출력할 검색어 개수
            
        Returns:
            최근 검색어 목록
        """
        print("\n" + "="*60)
        print("🔍 6. 최근 검색어 목록")
        print("="*60)
        
        try:
            cursor = self.conn.cursor()
            
            query = """
                SELECT 
                    keyword,
                    technology_field,
                    created_at,
                    user_id
                FROM search_history 
                WHERE created_at >= NOW() - INTERVAL '%s days'
                ORDER BY created_at DESC 
                LIMIT %s
            """
            cursor.execute(query, (self.retention_days, limit))
            
            results = cursor.fetchall()
            searches = []
            
            print(f"📝 최근 검색어 {limit}개:")
            print("-" * 80)
            print(f"{'순번':<4} {'검색어':<25} {'기술분야':<15} {'검색시간':<20}")
            print("-" * 80)
            
            for i, (keyword, tech_field, created_at, user_id) in enumerate(results, 1):
                search_data = {
                    'rank': i,
                    'keyword': keyword,
                    'technology_field': tech_field or 'General',
                    'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'user_id': str(user_id)
                }
                searches.append(search_data)
                
                print(f"{i:<4} {keyword:<25} {tech_field or 'General':<15} {created_at.strftime('%Y-%m-%d %H:%M'):<20}")
            
            if not searches:
                print("📝 최근 검색 데이터가 없습니다.")
            
            return searches
            
        except Exception as e:
            print(f"❌ 최근 검색어 조회 실패: {e}")
            return []
    
    def get_recent_reports(self, limit: int = 10) -> List[Dict]:
        """
        7. 최근 리포트 10개 출력 (특허명_특허번호_시장분석/비즈니스인사이트_날짜)
        
        Args:
            limit: 출력할 리포트 개수
            
        Returns:
            최근 리포트 목록
        """
        print("\n" + "="*60)
        print("📋 7. 최근 리포트 목록")
        print("="*60)
        
        try:
            cursor = self.conn.cursor()
            
            query = """
                SELECT 
                    invention_title,
                    application_number,
                    analysis_type,
                    technology_field,
                    created_at,
                    user_id
                FROM ai_analysis_reports 
                WHERE created_at >= NOW() - INTERVAL '%s days'
                ORDER BY created_at DESC 
                LIMIT %s
            """
            cursor.execute(query, (self.retention_days, limit))
            
            results = cursor.fetchall()
            reports = []
            
            print(f"📄 최근 리포트 {limit}개:")
            print("-" * 100)
            print(f"{'순번':<4} {'리포트명':<50} {'기술분야':<15} {'생성시간':<20}")
            print("-" * 100)
            
            for i, (title, app_num, analysis_type, tech_field, created_at, user_id) in enumerate(results, 1):
                # 리포트명 형식: 특허명_특허번호_분석타입_날짜
                report_name = f"{title or '특허분석'}_{app_num or 'N/A'}_{analysis_type or '시장분석'}_{created_at.strftime('%Y%m%d')}"
                
                report_data = {
                    'rank': i,
                    'report_name': report_name,
                    'invention_title': title,
                    'application_number': app_num,
                    'analysis_type': analysis_type or '시장분석',
                    'technology_field': tech_field or 'General',
                    'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'user_id': str(user_id)
                }
                reports.append(report_data)
                
                # 리포트명이 너무 길면 줄임
                display_name = report_name[:47] + "..." if len(report_name) > 50 else report_name
                print(f"{i:<4} {display_name:<50} {tech_field or 'General':<15} {created_at.strftime('%Y-%m-%d %H:%M'):<20}")
            
            if not reports:
                print("📝 최근 리포트 데이터가 없습니다.")
            
            return reports
            
        except Exception as e:
            print(f"❌ 최근 리포트 조회 실패: {e}")
            return []
    
    def generate_summary_report(self):
        """전체 분석 결과 요약 리포트 생성"""
        print("\n" + "="*60)
        print("📊 전체 분석 결과 요약")
        print("="*60)
        
        try:
            cursor = self.conn.cursor()
            
            # 전체 통계 조회
            cursor.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM search_history WHERE created_at >= NOW() - INTERVAL '%s days') as total_searches,
                    (SELECT COUNT(*) FROM ai_analysis_reports WHERE created_at >= NOW() - INTERVAL '%s days') as total_reports,
                    (SELECT COUNT(DISTINCT technology_field) FROM search_history WHERE technology_field IS NOT NULL) as unique_search_fields,
                    (SELECT COUNT(DISTINCT technology_field) FROM ai_analysis_reports WHERE technology_field IS NOT NULL) as unique_report_fields
            """, (self.retention_days, self.retention_days))
            
            stats = cursor.fetchone()
            
            print(f"👥 총 사용자 수: {stats[0]:,}명")
            print(f"🔍 총 검색 수 ({self.retention_days}일): {stats[1]:,}회")
            print(f"📋 총 리포트 수 ({self.retention_days}일): {stats[2]:,}개")
            print(f"🏷️  검색 기술 분야 수: {stats[3]:,}개")
            print(f"🏷️  리포트 기술 분야 수: {stats[4]:,}개")
            
            # 데이터 품질 체크
            cursor.execute("""
                SELECT 
                    ROUND(AVG(CASE WHEN technology_field IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100, 2) as search_field_coverage,
                    ROUND(AVG(CASE WHEN technology_field IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100, 2) as report_field_coverage
                FROM search_history s
                FULL OUTER JOIN ai_analysis_reports r ON s.user_id = r.user_id
                WHERE s.created_at >= NOW() - INTERVAL '%s days' 
                   OR r.created_at >= NOW() - INTERVAL '%s days'
            """, (self.retention_days, self.retention_days))
            
            coverage = cursor.fetchone()
            
            print(f"📈 검색 기술분야 커버리지: {coverage[0] or 0:.1f}%")
            print(f"📈 리포트 기술분야 커버리지: {coverage[1] or 0:.1f}%")
            
        except Exception as e:
            print(f"❌ 요약 리포트 생성 실패: {e}")
    
    def run_full_analysis(self, user_id: str = None):
        """전체 분석 실행"""
        print("🚀 대시보드 데이터 분석 시스템 테스트 시작")
        print(f"📅 분석 기간: 최근 {self.retention_days}일")
        print(f"⏰ 실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if not self.connect_database():
            return
        
        try:
            # 1. 데이터 정리
            self.cleanup_old_data()
            
            # 2. 개인 검색 분석
            user_search_df = self.analyze_user_search_technology_fields(user_id)
            
            # 3. 시장 검색 분석
            market_search_df = self.analyze_market_search_technology_fields()
            
            # 4. 개인 리포트 분석
            user_report_df = self.analyze_user_report_technology_fields(user_id)
            
            # 5. 시장 리포트 분석
            market_report_df = self.analyze_market_report_technology_fields()
            
            # 6. 최근 검색어
            recent_searches = self.get_recent_searches()
            
            # 7. 최근 리포트
            recent_reports = self.get_recent_reports()
            
            # 8. 요약 리포트
            self.generate_summary_report()
            
            print("\n" + "="*60)
            print("✅ 모든 분석이 완료되었습니다!")
            print("="*60)
            
        except Exception as e:
            print(f"❌ 분석 실행 중 오류 발생: {e}")
        finally:
            self.close_connection()


def main():
    """메인 실행 함수"""
    # 데이터베이스 연결 설정 (환경변수에서 읽어오기)
    db_config = {
        'host': os.getenv('SUPABASE_DB_HOST', 'db.afzzubvlotobcaiflmia.supabase.co'),
        'port': os.getenv('SUPABASE_DB_PORT', '5432'),
        'database': os.getenv('SUPABASE_DB_NAME', 'postgres'),
        'user': os.getenv('SUPABASE_DB_USER', 'postgres'),
        'password': os.getenv('SUPABASE_DB_PASSWORD', ''),
    }
    
    # 환경변수가 설정되지 않은 경우 안내
    if not db_config['password']:
        print("❌ 데이터베이스 연결 정보가 설정되지 않았습니다.")
        print("다음 환경변수를 설정해주세요:")
        print("- SUPABASE_DB_HOST")
        print("- SUPABASE_DB_PORT")
        print("- SUPABASE_DB_NAME")
        print("- SUPABASE_DB_USER")
        print("- SUPABASE_DB_PASSWORD")
        return
    
    # 분석기 초기화 및 실행
    analyzer = DashboardDataAnalyzer(db_config)
    
    # 특정 사용자 ID로 분석하려면 여기에 입력
    # user_id = "276975db-635b-4c77-87a0-548f91b14231"  # 예시
    user_id = None  # 첫 번째 사용자로 자동 설정
    
    analyzer.run_full_analysis(user_id)


if __name__ == "__main__":
    main()