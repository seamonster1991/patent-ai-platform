// CSV 내보내기 유틸리티 함수들

export interface ExportData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * 데이터를 CSV 형식으로 변환하고 다운로드
 */
export function exportToCsv(data: ExportData[], filename: string = 'export.csv'): void {
  if (!data || data.length === 0) {
    console.warn('내보낼 데이터가 없습니다.');
    return;
  }

  // CSV 헤더 생성 (첫 번째 객체의 키들)
  const headers = Object.keys(data[0]);
  
  // CSV 내용 생성
  const csvContent = [
    // 헤더 행
    headers.join(','),
    // 데이터 행들
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // 값이 문자열이고 쉼표나 따옴표가 포함된 경우 따옴표로 감싸기
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // BOM 추가 (한글 깨짐 방지)
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 다운로드 링크 생성 및 클릭
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * JSON 데이터를 CSV로 내보내기
 */
export function exportJsonToCsv(jsonData: any[], filename: string = 'export.csv'): void {
  if (!Array.isArray(jsonData)) {
    console.error('JSON 데이터는 배열 형태여야 합니다.');
    return;
  }
  
  exportToCsv(jsonData, filename);
}

/**
 * 테이블 데이터를 CSV로 내보내기
 */
export function exportTableToCsv(
  headers: string[], 
  rows: (string | number | null | undefined)[][], 
  filename: string = 'table_export.csv'
): void {
  const data = rows.map(row => {
    const obj: ExportData = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  exportToCsv(data, filename);
}

/**
 * 대시보드 통계 데이터를 CSV로 내보내기
 */
export function exportDashboardStats(stats: any, filename: string = 'dashboard_stats.csv'): void {
  const exportData: ExportData[] = [];
  
  // 효율성 지표
  if (stats.efficiencyMetrics) {
    exportData.push({
      '카테고리': '효율성 지표',
      '항목': '총 로그인',
      '값': stats.efficiencyMetrics.totalLogins || 0
    });
    exportData.push({
      '카테고리': '효율성 지표',
      '항목': '총 검색',
      '값': stats.efficiencyMetrics.totalSearches || 0
    });
    exportData.push({
      '카테고리': '효율성 지표',
      '항목': '총 리포트',
      '값': stats.efficiencyMetrics.totalReports || 0
    });
    exportData.push({
      '카테고리': '효율성 지표',
      '항목': '검색-리포트 전환율',
      '값': `${stats.efficiencyMetrics.searchToReportRate || 0}%`
    });
  }
  
  // 기술 분야 데이터
  if (stats.searchFields?.user) {
    stats.searchFields.user.forEach((field: any) => {
      exportData.push({
        '카테고리': '검색 기술 분야',
        '항목': field.field,
        '값': field.search_count,
        'IPC 코드': field.ipc_code,
        '비율': `${field.percentage}%`
      });
    });
  }
  
  // 최근 활동
  if (stats.recentActivities) {
    stats.recentActivities.forEach((activity: any) => {
      exportData.push({
        '카테고리': '최근 활동',
        '항목': activity.title,
        '타입': activity.type,
        '시간': activity.timestamp,
        '설명': activity.description || ''
      });
    });
  }
  
  exportToCsv(exportData, filename);
}