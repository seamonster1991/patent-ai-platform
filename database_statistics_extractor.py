#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Statistics Extractor
데이터베이스에서 모든 통계 데이터를 추출하여 텍스트로 출력하는 스크립트

추출 항목:
1. 총 로그인수
2. 총 검색수
3. 총 리포트생성수
4. 총 회원수
5. 총 유료회원수
6. 총 무료회원수
7. 총 검색어(100일간의 db저장)
8. 총 리포트 제목(100일간의 db저장)
9. 평균 로그인 수 = 총 로그인 수 / 총 회원수
10. 평균 검색 수 = 총 검색 수 / 총 회원수
11. 평균 리포트 생성 수 = 총 리포트 생성 수 / 총 회원수
12. 로그인→리포트 전환율 = 로그인 건수 대비 리포트 생성 건수
13. 검색→리포트 전환율 = 검색 건수 대비 리포트 생성 건수
14. 키워드 분석 = 전체 회원 키워드 사용 패턴
15. 리포트 분석 = 전체 회원 리포트 생성 패턴
16. 사용자 분포 = 무료회원 vs 정기구독회원
"""

import requests
import json
import os
import sys
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from dotenv import load_dotenv
import colorlog

# 로깅 설정
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(levelname)-8s%(reset)s %(blue)s%(message)s',
    datefmt=None,
    reset=True,
    log_colors={
        'DEBUG': 'cyan',
        'INFO': 'green',
        'WARNING': 'yellow',
        'ERROR': 'red',
        'CRITICAL': 'red,bg_white',
    },
    secondary_log_colors={},
    style='%'
))

logger = colorlog.getLogger()
logger.addHandler(handler)
logger.setLevel(colorlog.INFO)

class DatabaseStatisticsExtractor:
    def __init__(self):
        """초기화 및 환경변수 로드"""
        load_dotenv('.env.python')
        
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not all([self.supabase_url, self.supabase_service_key]):
            logger.error("Supabase 환경변수가 설정되지 않았습니다.")
            sys.exit(1)
        
        self.headers = {
            'apikey': self.supabase_service_key,
            'Authorization': f'Bearer {self.supabase_service_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        # 통계 데이터 저장용
        self.stats = {}
        
        logger.info("Database Statistics Extractor 초기화 완료")
    
    def check_connection(self):
        """데이터베이스 연결 확인"""
        try:
            response = requests.get(
                f"{self.supabase_url}/rest/v1/users?select=count",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                logger.info("✅ 데이터베이스 연결 성공")
                return True
            else:
                logger.error(f"❌ 데이터베이스 연결 실패: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ 연결 오류: {str(e)}")
            return False
    
    def get_table_data(self, table_name, select_fields="*", filters=None, limit=None):
        """테이블 데이터 조회"""
        try:
            url = f"{self.supabase_url}/rest/v1/{table_name}?select={select_fields}"
            
            if filters:
                for key, value in filters.items():
                    url += f"&{key}={value}"
            
            if limit:
                url += f"&limit={limit}"
            
            logger.info(f"🔍 요청 URL: {url}")
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"📊 {table_name} 테이블에서 {len(data)}건 조회")
                return data
            else:
                logger.error(f"❌ {table_name} 테이블 조회 실패: {response.status_code} - {response.text[:200]}")
                return []
        except Exception as e:
            logger.error(f"❌ {table_name} 테이블 조회 오류: {str(e)}")
            return []
    
    def extract_basic_statistics(self):
        """기본 통계 데이터 추출"""
        logger.info("🔍 기본 통계 데이터 추출 중...")
        
        # 1. 총 회원수
        users_data = self.get_table_data('users', 'id,subscription_plan,role,total_reports')
        total_users = len(users_data)
        self.stats['총_회원수'] = total_users
        
        # 2. 총 로그인수
        login_logs = self.get_table_data('user_login_logs', 'user_id,login_time')
        total_logins = len(login_logs)
        self.stats['총_로그인수'] = total_logins
        
        # 3. 총 검색수
        search_history = self.get_table_data('search_history', 'user_id,keyword,created_at')
        total_searches = len(search_history)
        self.stats['총_검색수'] = total_searches
        
        # 4. 총 리포트생성수 (users 테이블의 total_reports 사용)
        total_reports = sum(user.get('total_reports', 0) for user in users_data)
        logger.info(f"📊 리포트 계산: {[user.get('total_reports', 0) for user in users_data]} = {total_reports}")
        self.stats['총_리포트생성수'] = total_reports
        
        # 5. 유료/무료 회원수 계산
        premium_users = 0
        free_users = 0
        admin_users = 0
        
        for user in users_data:
            if user.get('role') == 'admin':
                admin_users += 1
            elif user.get('subscription_plan') == 'premium':
                premium_users += 1
            else:
                free_users += 1
        
        self.stats['총_유료회원수'] = premium_users
        self.stats['총_무료회원수'] = free_users
        self.stats['총_관리자수'] = admin_users
        
        logger.info("✅ 기본 통계 데이터 추출 완료")
    
    def extract_time_based_data(self):
        """100일간의 검색어 및 리포트 제목 추출"""
        logger.info("🔍 100일간 데이터 추출 중...")
        
        # 100일 전 날짜 계산
        hundred_days_ago = (datetime.now() - timedelta(days=100)).isoformat()
        
        # 100일간의 검색어
        search_filters = {'created_at': f'gte.{hundred_days_ago}'}
        recent_searches = self.get_table_data('search_history', 'keyword,created_at', search_filters)
        
        search_keywords = []
        for search in recent_searches:
            if search.get('keyword'):
                search_keywords.append(search['keyword'])
        
        self.stats['총_검색어_100일'] = len(search_keywords)
        self.stats['검색어_목록_100일'] = search_keywords
        
        # 100일간의 리포트 제목 (실제 리포트 테이블이 없으므로 빈 값으로 설정)
        # 향후 리포트 테이블이 생성되면 수정 필요
        self.stats['총_리포트제목_100일'] = 0
        self.stats['리포트제목_목록_100일'] = []
        
        logger.info("✅ 100일간 데이터 추출 완료")
    
    def calculate_averages(self):
        """평균값 계산"""
        logger.info("🔍 평균값 계산 중...")
        
        total_users = self.stats.get('총_회원수', 0)
        
        if total_users > 0:
            # 평균 로그인 수
            avg_logins = self.stats.get('총_로그인수', 0) / total_users
            self.stats['평균_로그인수'] = round(avg_logins, 2)
            
            # 평균 검색 수
            avg_searches = self.stats.get('총_검색수', 0) / total_users
            self.stats['평균_검색수'] = round(avg_searches, 2)
            
            # 평균 리포트 생성 수
            avg_reports = self.stats.get('총_리포트생성수', 0) / total_users
            self.stats['평균_리포트생성수'] = round(avg_reports, 2)
        else:
            self.stats['평균_로그인수'] = 0
            self.stats['평균_검색수'] = 0
            self.stats['평균_리포트생성수'] = 0
        
        logger.info("✅ 평균값 계산 완료")
    
    def calculate_conversion_rates(self):
        """전환율 계산"""
        logger.info("🔍 전환율 계산 중...")
        
        total_logins = self.stats.get('총_로그인수', 0)
        total_searches = self.stats.get('총_검색수', 0)
        total_reports = self.stats.get('총_리포트생성수', 0)
        
        # 로그인→리포트 전환율
        if total_logins > 0:
            login_to_report_rate = (total_reports / total_logins) * 100
            self.stats['로그인_리포트_전환율'] = round(login_to_report_rate, 2)
        else:
            self.stats['로그인_리포트_전환율'] = 0
        
        # 검색→리포트 전환율
        if total_searches > 0:
            search_to_report_rate = (total_reports / total_searches) * 100
            self.stats['검색_리포트_전환율'] = round(search_to_report_rate, 2)
        else:
            self.stats['검색_리포트_전환율'] = 0
        
        logger.info("✅ 전환율 계산 완료")
    
    def analyze_keyword_patterns(self):
        """키워드 사용 패턴 분석"""
        logger.info("🔍 키워드 패턴 분석 중...")
        
        search_keywords = self.stats.get('검색어_목록_100일', [])
        
        if search_keywords:
            # 키워드 빈도 분석
            keyword_counter = Counter(search_keywords)
            top_keywords = keyword_counter.most_common(10)
            
            # 고유 키워드 수
            unique_keywords = len(set(search_keywords))
            
            self.stats['키워드_분석'] = {
                '총_키워드수': len(search_keywords),
                '고유_키워드수': unique_keywords,
                '상위_키워드': top_keywords,
                '평균_키워드_길이': round(sum(len(k) for k in search_keywords) / len(search_keywords), 2) if search_keywords else 0
            }
        else:
            self.stats['키워드_분석'] = {
                '총_키워드수': 0,
                '고유_키워드수': 0,
                '상위_키워드': [],
                '평균_키워드_길이': 0
            }
        
        logger.info("✅ 키워드 패턴 분석 완료")
    
    def analyze_report_patterns(self):
        """리포트 생성 패턴 분석"""
        logger.info("🔍 리포트 패턴 분석 중...")
        
        # users 테이블에서 리포트 관련 데이터 조회
        users_data = self.get_table_data('users', 'id,total_reports,created_at')
        
        if users_data:
            # 사용자별 리포트 수 (users 테이블의 total_reports 사용)
            user_report_count = {}
            total_reports = 0
            active_users = 0
            
            for user in users_data:
                user_id = user.get('id')
                reports_count = user.get('total_reports', 0)
                if user_id and reports_count > 0:
                    user_report_count[user_id] = reports_count
                    total_reports += reports_count
                    active_users += 1
            
            self.stats['리포트_분석'] = {
                '총_리포트수': total_reports,
                '활성_사용자수': active_users,
                '평균_사용자당_리포트': round(total_reports / active_users, 2) if active_users > 0 else 0,
                '평균_제목_길이': 0,  # 실제 리포트 테이블이 없어 계산 불가
                '최다_생성_시간대': (0, 0)  # 실제 리포트 테이블이 없어 계산 불가
            }
        else:
            self.stats['리포트_분석'] = {
                '총_리포트수': 0,
                '활성_사용자수': 0,
                '평균_사용자당_리포트': 0,
                '평균_제목_길이': 0,
                '최다_생성_시간대': (0, 0)
            }
        
        logger.info("✅ 리포트 패턴 분석 완료")
    
    def analyze_user_distribution(self):
        """사용자 분포 분석"""
        logger.info("🔍 사용자 분포 분석 중...")
        
        total_users = self.stats.get('총_회원수', 0)
        premium_users = self.stats.get('총_유료회원수', 0)
        free_users = self.stats.get('총_무료회원수', 0)
        
        if total_users > 0:
            premium_percentage = round((premium_users / total_users) * 100, 2)
            free_percentage = round((free_users / total_users) * 100, 2)
        else:
            premium_percentage = 0
            free_percentage = 0
        
        self.stats['사용자_분포'] = {
            '무료회원': {'수': free_users, '비율': f"{free_percentage}%"},
            '유료회원': {'수': premium_users, '비율': f"{premium_percentage}%"},
            '총회원': total_users
        }
        
        logger.info("✅ 사용자 분포 분석 완료")
    
    def generate_text_output(self):
        """텍스트 출력 생성"""
        logger.info("📝 텍스트 출력 생성 중...")
        
        output_lines = []
        output_lines.append("=" * 80)
        output_lines.append("데이터베이스 통계 추출 결과")
        output_lines.append(f"생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        output_lines.append("=" * 80)
        output_lines.append("")
        
        # 기본 통계
        output_lines.append("📊 기본 통계")
        output_lines.append("-" * 40)
        output_lines.append(f"총 회원수: {self.stats.get('총_회원수', 0):,}명")
        output_lines.append(f"총 로그인수: {self.stats.get('총_로그인수', 0):,}건")
        output_lines.append(f"총 검색수: {self.stats.get('총_검색수', 0):,}건")
        output_lines.append(f"총 리포트생성수: {self.stats.get('총_리포트생성수', 0):,}건")
        output_lines.append(f"총 유료회원수: {self.stats.get('총_유료회원수', 0):,}명")
        output_lines.append(f"총 무료회원수: {self.stats.get('총_무료회원수', 0):,}명")
        output_lines.append("")
        
        # 100일간 데이터
        output_lines.append("📅 최근 100일간 데이터")
        output_lines.append("-" * 40)
        output_lines.append(f"총 검색어(100일): {self.stats.get('총_검색어_100일', 0):,}개")
        output_lines.append(f"총 리포트 제목(100일): {self.stats.get('총_리포트제목_100일', 0):,}개")
        output_lines.append("")
        
        # 평균값
        output_lines.append("📈 평균 통계")
        output_lines.append("-" * 40)
        output_lines.append(f"평균 로그인 수: {self.stats.get('평균_로그인수', 0):.2f}건/회원")
        output_lines.append(f"평균 검색 수: {self.stats.get('평균_검색수', 0):.2f}건/회원")
        output_lines.append(f"평균 리포트 생성 수: {self.stats.get('평균_리포트생성수', 0):.2f}건/회원")
        output_lines.append("")
        
        # 전환율
        output_lines.append("🔄 전환율 분석")
        output_lines.append("-" * 40)
        output_lines.append(f"로그인→리포트 전환율: {self.stats.get('로그인_리포트_전환율', 0):.2f}%")
        output_lines.append(f"검색→리포트 전환율: {self.stats.get('검색_리포트_전환율', 0):.2f}%")
        output_lines.append("")
        
        # 키워드 분석
        keyword_analysis = self.stats.get('키워드_분석', {})
        output_lines.append("🔍 키워드 분석")
        output_lines.append("-" * 40)
        output_lines.append(f"총 키워드수: {keyword_analysis.get('총_키워드수', 0):,}개")
        output_lines.append(f"고유 키워드수: {keyword_analysis.get('고유_키워드수', 0):,}개")
        output_lines.append(f"평균 키워드 길이: {keyword_analysis.get('평균_키워드_길이', 0):.2f}자")
        
        top_keywords = keyword_analysis.get('상위_키워드', [])
        if top_keywords:
            output_lines.append("상위 검색 키워드:")
            for i, (keyword, count) in enumerate(top_keywords[:5], 1):
                output_lines.append(f"  {i}. {keyword} ({count}회)")
        output_lines.append("")
        
        # 리포트 분석
        report_analysis = self.stats.get('리포트_분석', {})
        output_lines.append("📋 리포트 분석")
        output_lines.append("-" * 40)
        output_lines.append(f"총 리포트수: {report_analysis.get('총_리포트수', 0):,}개")
        output_lines.append(f"활성 사용자수: {report_analysis.get('활성_사용자수', 0):,}명")
        output_lines.append(f"평균 사용자당 리포트: {report_analysis.get('평균_사용자당_리포트', 0):.2f}개")
        output_lines.append(f"평균 제목 길이: {report_analysis.get('평균_제목_길이', 0):.2f}자")
        
        peak_hour = report_analysis.get('최다_생성_시간대', (0, 0))
        if peak_hour[1] > 0:
            output_lines.append(f"최다 생성 시간대: {peak_hour[0]}시 ({peak_hour[1]}건)")
        output_lines.append("")
        
        # 사용자 분포
        user_dist = self.stats.get('사용자_분포', {})
        output_lines.append("👥 사용자 분포")
        output_lines.append("-" * 40)
        free_info = user_dist.get('무료회원', {})
        premium_info = user_dist.get('유료회원', {})
        output_lines.append(f"무료회원: {free_info.get('수', 0):,}명 ({free_info.get('비율', '0%')})")
        output_lines.append(f"유료회원: {premium_info.get('수', 0):,}명 ({premium_info.get('비율', '0%')})")
        output_lines.append(f"총 회원: {user_dist.get('총회원', 0):,}명")
        output_lines.append("")
        
        output_lines.append("=" * 80)
        
        return "\n".join(output_lines)
    
    def save_to_file(self, content):
        """결과를 파일로 저장"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"database_statistics_{timestamp}.txt"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"📁 결과가 {filename} 파일로 저장되었습니다.")
            return filename
        except Exception as e:
            logger.error(f"❌ 파일 저장 오류: {str(e)}")
            return None
    
    def run_extraction(self):
        """전체 추출 프로세스 실행"""
        logger.info("🚀 데이터베이스 통계 추출 시작")
        
        # 연결 확인
        if not self.check_connection():
            logger.error("❌ 데이터베이스 연결 실패로 종료합니다.")
            return
        
        try:
            # 데이터 추출 및 분석
            self.extract_basic_statistics()
            self.extract_time_based_data()
            self.calculate_averages()
            self.calculate_conversion_rates()
            self.analyze_keyword_patterns()
            self.analyze_report_patterns()
            self.analyze_user_distribution()
            
            # 결과 출력
            output_content = self.generate_text_output()
            
            # 콘솔 출력
            print("\n" + output_content)
            
            # 파일 저장
            saved_file = self.save_to_file(output_content)
            
            logger.info("✅ 데이터베이스 통계 추출 완료")
            
            if saved_file:
                logger.info(f"📁 결과 파일: {saved_file}")
            
        except Exception as e:
            logger.error(f"❌ 추출 프로세스 오류: {str(e)}")

def main():
    """메인 함수"""
    print("=" * 80)
    print("데이터베이스 통계 추출기")
    print("Database Statistics Extractor")
    print("=" * 80)
    
    extractor = DatabaseStatisticsExtractor()
    extractor.run_extraction()

if __name__ == "__main__":
    main()