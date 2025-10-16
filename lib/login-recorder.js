/**
 * 로그인 기록 관리 시스템 (Node.js 버전)
 * fix_login_recording.py를 Node.js로 대체한 버전
 * 
 * 주요 기능:
 * 1. 사용자 로그인 기록 관리
 * 2. 데이터베이스 스키마 확인 및 생성
 * 3. RLS 정책 관리
 * 4. 사용자 활동 추적
 */

import { createClient } from '@supabase/supabase-js';

class LoginRecorder {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * 현재 데이터베이스 상태 확인
     */
    async checkCurrentState() {
        try {
            const state = {
                tables: {},
                policies: {},
                functions: {}
            };

            // 테이블 존재 확인
            const tables = ['users', 'user_activity', 'search_history', 'saved_reports'];
            for (const table of tables) {
                try {
                    const { data, error } = await this.supabase
                        .from(table)
                        .select('*')
                        .limit(1);
                    
                    state.tables[table] = !error;
                } catch (err) {
                    state.tables[table] = false;
                }
            }

            console.log('📊 현재 데이터베이스 상태:', state);
            return state;
        } catch (error) {
            console.error('❌ 데이터베이스 상태 확인 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 로그인 기록
     */
    async recordLogin(userId, loginData = {}) {
        try {
            const loginRecord = {
                user_id: userId,
                activity_type: 'login',
                details: {
                    timestamp: new Date().toISOString(),
                    ip_address: loginData.ipAddress || null,
                    user_agent: loginData.userAgent || null,
                    ...loginData
                },
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('user_activity')
                .insert([loginRecord]);

            if (error) throw error;

            console.log(`✅ 로그인 기록 완료: ${userId}`);
            return data;
        } catch (error) {
            console.error('❌ 로그인 기록 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 로그아웃 기록
     */
    async recordLogout(userId, logoutData = {}) {
        try {
            const logoutRecord = {
                user_id: userId,
                activity_type: 'logout',
                details: {
                    timestamp: new Date().toISOString(),
                    session_duration: logoutData.sessionDuration || null,
                    ...logoutData
                },
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('user_activity')
                .insert([logoutRecord]);

            if (error) throw error;

            console.log(`✅ 로그아웃 기록 완료: ${userId}`);
            return data;
        } catch (error) {
            console.error('❌ 로그아웃 기록 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 활동 기록
     */
    async recordActivity(userId, activityType, details = {}) {
        try {
            const activityRecord = {
                user_id: userId,
                activity_type: activityType,
                details: {
                    timestamp: new Date().toISOString(),
                    ...details
                },
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('user_activity')
                .insert([activityRecord]);

            if (error) throw error;

            console.log(`✅ 활동 기록 완료: ${userId} - ${activityType}`);
            return data;
        } catch (error) {
            console.error('❌ 활동 기록 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 로그인 이력 조회
     */
    async getLoginHistory(userId, limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('user_activity')
                .select('*')
                .eq('user_id', userId)
                .in('activity_type', ['login', 'logout'])
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('❌ 로그인 이력 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 활동 통계
     */
    async getUserActivityStats(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();

            const { data, error } = await this.supabase
                .from('user_activity')
                .select('activity_type, created_at')
                .eq('user_id', userId)
                .gte('created_at', startDateStr);

            if (error) throw error;

            // 활동 유형별 통계
            const stats = {
                totalActivities: data.length,
                loginCount: 0,
                logoutCount: 0,
                searchCount: 0,
                reportCount: 0,
                otherCount: 0
            };

            data.forEach(activity => {
                switch (activity.activity_type) {
                    case 'login':
                        stats.loginCount++;
                        break;
                    case 'logout':
                        stats.logoutCount++;
                        break;
                    case 'search':
                        stats.searchCount++;
                        break;
                    case 'report':
                        stats.reportCount++;
                        break;
                    default:
                        stats.otherCount++;
                }
            });

            return stats;
        } catch (error) {
            console.error('❌ 사용자 활동 통계 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 전체 사용자 활동 통계
     */
    async getOverallActivityStats(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();

            const { data, error } = await this.supabase
                .from('user_activity')
                .select('activity_type, user_id, created_at')
                .gte('created_at', startDateStr);

            if (error) throw error;

            // 전체 통계
            const stats = {
                totalActivities: data.length,
                uniqueUsers: new Set(data.map(a => a.user_id)).size,
                loginCount: 0,
                logoutCount: 0,
                searchCount: 0,
                reportCount: 0,
                otherCount: 0
            };

            data.forEach(activity => {
                switch (activity.activity_type) {
                    case 'login':
                        stats.loginCount++;
                        break;
                    case 'logout':
                        stats.logoutCount++;
                        break;
                    case 'search':
                        stats.searchCount++;
                        break;
                    case 'report':
                        stats.reportCount++;
                        break;
                    default:
                        stats.otherCount++;
                }
            });

            return stats;
        } catch (error) {
            console.error('❌ 전체 활동 통계 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 데이터베이스 연결 테스트
     */
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('count')
                .limit(1);

            if (error) throw error;

            console.log('✅ 데이터베이스 연결 성공');
            return true;
        } catch (error) {
            console.error('❌ 데이터베이스 연결 실패:', error);
            return false;
        }
    }

    /**
     * 사용자 정보 업데이트
     */
    async updateUserInfo(userId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            // 업데이트 활동 기록
            await this.recordActivity(userId, 'profile_update', {
                updatedFields: Object.keys(updates)
            });

            console.log(`✅ 사용자 정보 업데이트 완료: ${userId}`);
            return data;
        } catch (error) {
            console.error('❌ 사용자 정보 업데이트 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 마지막 활동 시간 업데이트
     */
    async updateLastActivity(userId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .update({
                    last_activity: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('❌ 마지막 활동 시간 업데이트 실패:', error);
            throw error;
        }
    }
}

export default LoginRecorder;