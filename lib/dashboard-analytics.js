/**
 * 대시보드 데이터 분석 시스템 (Node.js 버전)
 * 파이썬 스크립트들을 Node.js로 대체한 버전
 * 
 * 주요 기능:
 * 1. 100일 데이터 자동 관리
 * 2. 검색/리포트 IPC/CPC 분석
 * 3. 최근 검색어/리포트 조회
 * 4. 사용자 활동 로깅
 */

import { createClient } from '@supabase/supabase-js';

class DashboardAnalytics {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.retentionDays = 100;
    }

    /**
     * 100일 이상 된 데이터 자동 삭제
     */
    async cleanupOldData() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
        const cutoffDateStr = cutoffDate.toISOString();

        try {
            const results = {};

            // 검색 기록 정리
            const { data: searchData, error: searchError } = await this.supabase
                .from('search_history')
                .delete()
                .lt('created_at', cutoffDateStr);
            
            if (searchError) throw searchError;
            results.searchRecords = searchData?.length || 0;

            // 리포트 기록 정리
            const { data: reportData, error: reportError } = await this.supabase
                .from('saved_reports')
                .delete()
                .lt('created_at', cutoffDateStr);
            
            if (reportError) throw reportError;
            results.reportRecords = reportData?.length || 0;

            // 사용자 활동 기록 정리
            const { data: activityData, error: activityError } = await this.supabase
                .from('user_activity')
                .delete()
                .lt('created_at', cutoffDateStr);
            
            if (activityError) throw activityError;
            results.activityRecords = activityData?.length || 0;

            console.log(`✅ 데이터 정리 완료: 검색 ${results.searchRecords}건, 리포트 ${results.reportRecords}건, 활동 ${results.activityRecords}건 삭제`);
            return results;
        } catch (error) {
            console.error('❌ 데이터 정리 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 검색 기술 분야 분석
     */
    async analyzeUserSearchTechnologyFields(userId = null) {
        try {
            let query = this.supabase
                .from('search_history')
                .select('ipc_codes, cpc_codes, created_at');

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const fieldCounts = {};
            
            data.forEach(record => {
                // IPC 코드 분석
                if (record.ipc_codes) {
                    const ipcCodes = Array.isArray(record.ipc_codes) ? record.ipc_codes : [record.ipc_codes];
                    ipcCodes.forEach(code => {
                        if (code) {
                            const field = code.substring(0, 1); // 첫 글자로 기술 분야 구분
                            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        }
                    });
                }

                // CPC 코드 분석
                if (record.cpc_codes) {
                    const cpcCodes = Array.isArray(record.cpc_codes) ? record.cpc_codes : [record.cpc_codes];
                    cpcCodes.forEach(code => {
                        if (code) {
                            const field = code.substring(0, 1); // 첫 글자로 기술 분야 구분
                            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        }
                    });
                }
            });

            return Object.entries(fieldCounts)
                .map(([field, count]) => ({ field, count }))
                .sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('❌ 사용자 검색 기술 분야 분석 실패:', error);
            throw error;
        }
    }

    /**
     * 시장 검색 기술 분야 분석
     */
    async analyzeMarketSearchTechnologyFields() {
        try {
            const { data, error } = await this.supabase
                .from('search_history')
                .select('ipc_codes, cpc_codes, created_at');

            if (error) throw error;

            const fieldCounts = {};
            
            data.forEach(record => {
                // IPC 코드 분석
                if (record.ipc_codes) {
                    const ipcCodes = Array.isArray(record.ipc_codes) ? record.ipc_codes : [record.ipc_codes];
                    ipcCodes.forEach(code => {
                        if (code) {
                            const field = code.substring(0, 1);
                            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        }
                    });
                }

                // CPC 코드 분석
                if (record.cpc_codes) {
                    const cpcCodes = Array.isArray(record.cpc_codes) ? record.cpc_codes : [record.cpc_codes];
                    cpcCodes.forEach(code => {
                        if (code) {
                            const field = code.substring(0, 1);
                            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        }
                    });
                }
            });

            return Object.entries(fieldCounts)
                .map(([field, count]) => ({ field, count }))
                .sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('❌ 시장 검색 기술 분야 분석 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 리포트 기술 분야 분석
     */
    async analyzeUserReportTechnologyFields(userId = null) {
        try {
            let query = this.supabase
                .from('saved_reports')
                .select('ipc_codes, cpc_codes, created_at');

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const fieldCounts = {};
            
            data.forEach(record => {
                // IPC 코드 분석
                if (record.ipc_codes) {
                    const ipcCodes = Array.isArray(record.ipc_codes) ? record.ipc_codes : [record.ipc_codes];
                    ipcCodes.forEach(code => {
                        if (code) {
                            const field = code.substring(0, 1);
                            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        }
                    });
                }

                // CPC 코드 분석
                if (record.cpc_codes) {
                    const cpcCodes = Array.isArray(record.cpc_codes) ? record.cpc_codes : [record.cpc_codes];
                    cpcCodes.forEach(code => {
                        if (code) {
                            const field = code.substring(0, 1);
                            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        }
                    });
                }
            });

            return Object.entries(fieldCounts)
                .map(([field, count]) => ({ field, count }))
                .sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('❌ 사용자 리포트 기술 분야 분석 실패:', error);
            throw error;
        }
    }

    /**
     * 시장 리포트 기술 분야 분석
     */
    async analyzeMarketReportTechnologyFields() {
        try {
            const { data, error } = await this.supabase
                .from('saved_reports')
                .select('ipc_codes, cpc_codes, created_at');

            if (error) throw error;

            const fieldCounts = {};
            
            data.forEach(record => {
                // IPC 코드 분석
                if (record.ipc_codes) {
                    const ipcCodes = Array.isArray(record.ipc_codes) ? record.ipc_codes : [record.ipc_codes];
                    ipcCodes.forEach(code => {
                        if (code) {
                            const field = code.substring(0, 1);
                            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        }
                    });
                }

                // CPC 코드 분석
                if (record.cpc_codes) {
                    const cpcCodes = Array.isArray(record.cpc_codes) ? record.cpc_codes : [record.cpc_codes];
                    cpcCodes.forEach(code => {
                        if (code) {
                            const field = code.substring(0, 1);
                            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        }
                    });
                }
            });

            return Object.entries(fieldCounts)
                .map(([field, count]) => ({ field, count }))
                .sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('❌ 시장 리포트 기술 분야 분석 실패:', error);
            throw error;
        }
    }

    /**
     * 최근 검색어 조회
     */
    async getRecentSearches(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('search_history')
                .select('query, created_at, user_id')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data.map(record => ({
                query: record.query,
                createdAt: record.created_at,
                userId: record.user_id
            }));
        } catch (error) {
            console.error('❌ 최근 검색어 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 최근 리포트 조회
     */
    async getRecentReports(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('saved_reports')
                .select('title, created_at, user_id')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data.map(record => ({
                title: record.title,
                createdAt: record.created_at,
                userId: record.user_id
            }));
        } catch (error) {
            console.error('❌ 최근 리포트 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자 활동 로깅
     */
    async logUserActivity(userId, activityType, details = {}) {
        try {
            const { data, error } = await this.supabase
                .from('user_activity')
                .insert([{
                    user_id: userId,
                    activity_type: activityType,
                    details: details,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            console.log(`✅ 사용자 활동 로깅 완료: ${userId} - ${activityType}`);
            return data;
        } catch (error) {
            console.error('❌ 사용자 활동 로깅 실패:', error);
            throw error;
        }
    }

    /**
     * 전체 분석 실행
     */
    async runFullAnalysis(userId = null) {
        try {
            console.log('🔍 대시보드 분석 시작...');

            // 1. 오래된 데이터 정리
            await this.cleanupOldData();

            // 2. 기술 분야 분석
            const userSearchFields = await this.analyzeUserSearchTechnologyFields(userId);
            const marketSearchFields = await this.analyzeMarketSearchTechnologyFields();
            const userReportFields = await this.analyzeUserReportTechnologyFields(userId);
            const marketReportFields = await this.analyzeMarketReportTechnologyFields();

            // 3. 최근 데이터 조회
            const recentSearches = await this.getRecentSearches();
            const recentReports = await this.getRecentReports();

            const results = {
                userSearchFields,
                marketSearchFields,
                userReportFields,
                marketReportFields,
                recentSearches,
                recentReports,
                timestamp: new Date().toISOString()
            };

            console.log('✅ 대시보드 분석 완료');
            return results;
        } catch (error) {
            console.error('❌ 대시보드 분석 실패:', error);
            throw error;
        }
    }
}

export default DashboardAnalytics;