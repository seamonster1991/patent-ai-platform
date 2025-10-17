import React, { useEffect } from 'react';
import AdminLayout from '../components/Admin/AdminLayout';
import { useAdminDashboardStore } from '../stores/useAdminDashboardStore';

const AdminDashboardSimple: React.FC = () => {
  const { metrics, fetchMetrics, isLoadingMetrics } = useAdminDashboardStore();

  useEffect(() => {
    console.log('[AdminDashboardSimple] 컴포넌트 마운트됨');
    console.log('[AdminDashboardSimple] 현재 metrics 상태:', metrics);
    fetchMetrics();
  }, [fetchMetrics]);

  console.log('[AdminDashboardSimple] 렌더링 중, metrics:', metrics);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드 (테스트)</h1>
          <p className="text-gray-600">API 데이터 확인</p>
        </div>
        
        {isLoadingMetrics ? (
          <div>로딩 중...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">총 사용자</h3>
              <p className="text-3xl font-bold text-blue-600">{metrics?.total_users || 0}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">활성 사용자</h3>
              <p className="text-3xl font-bold text-green-600">{metrics?.active_users || 0}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">총 분석</h3>
              <p className="text-3xl font-bold text-purple-600">{metrics?.total_analyses || 0}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">총 검색</h3>
              <p className="text-3xl font-bold text-orange-600">{metrics?.totalSearches || 0}</p>
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">API 응답 데이터</h3>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardSimple;