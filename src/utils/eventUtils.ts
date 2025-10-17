// 이벤트 관련 유틸리티 함수들

export interface ReportGeneratedEventDetail {
  type: 'reportGenerated';
  reportId?: string;
  reportType: 'market' | 'business';
  reportTitle: string;
  patentTitle: string;
  patentNumber: string;
  timestamp: string;
}

export interface BookmarkAddedEventDetail {
  type: 'bookmarkAdded';
  patentId: string;
  patentTitle: string;
  timestamp: string;
}

export interface DashboardRefreshEventDetail {
  type: 'dashboardRefresh';
  source: string;
  timestamp: string;
  data?: any;
}

export interface PointBalanceUpdateEventDetail {
  type: 'pointBalanceUpdate';
  source: string;
  timestamp: string;
  newBalance?: number;
}

/**
 * reportGenerated 이벤트를 발생시킵니다.
 * @param eventDetail 이벤트 상세 정보
 */
export function dispatchReportGeneratedEvent(eventDetail: ReportGeneratedEventDetail): boolean {
  if (typeof window === 'undefined') {
    console.warn('⚠️ [eventUtils] window 객체를 사용할 수 없습니다.');
    return false;
  }

  console.log('📊 [eventUtils] reportGenerated 이벤트 발생 준비:', eventDetail);

  const customEvent = new CustomEvent('reportGenerated', {
    detail: eventDetail,
    bubbles: true,
    cancelable: true
  });

  console.log('📤 [eventUtils] reportGenerated 이벤트 디스패치 실행...');
  const dispatched = window.dispatchEvent(customEvent);

  console.log('✅ [eventUtils] reportGenerated 이벤트 디스패치 완료:', {
    dispatched,
    eventType: customEvent.type,
    timestamp: new Date().toISOString()
  });

  return dispatched;
}

/**
 * bookmarkAdded 이벤트를 발생시킵니다.
 * @param eventDetail 이벤트 상세 정보
 */
export function dispatchBookmarkAddedEvent(eventDetail: BookmarkAddedEventDetail): boolean {
  if (typeof window === 'undefined') {
    console.warn('⚠️ [eventUtils] window 객체를 사용할 수 없습니다.');
    return false;
  }

  console.log('📊 [eventUtils] bookmarkAdded 이벤트 발생 준비:', eventDetail);

  const customEvent = new CustomEvent('bookmarkAdded', {
    detail: eventDetail,
    bubbles: true,
    cancelable: true
  });

  console.log('📤 [eventUtils] bookmarkAdded 이벤트 디스패치 실행...');
  const dispatched = window.dispatchEvent(customEvent);

  console.log('✅ [eventUtils] bookmarkAdded 이벤트 디스패치 완료:', {
    dispatched,
    eventType: customEvent.type,
    timestamp: new Date().toISOString()
  });

  return dispatched;
}

/**
 * dashboardRefresh 이벤트를 발생시킵니다.
 * @param eventDetail 이벤트 상세 정보
 */
export function dispatchDashboardRefreshEvent(eventDetail: DashboardRefreshEventDetail): boolean {
  if (typeof window === 'undefined') {
    console.warn('⚠️ [eventUtils] window 객체를 사용할 수 없습니다.');
    return false;
  }

  console.log('📊 [eventUtils] dashboardRefresh 이벤트 발생 준비:', eventDetail);

  const customEvent = new CustomEvent('dashboardRefresh', {
    detail: eventDetail,
    bubbles: true,
    cancelable: true
  });

  console.log('📤 [eventUtils] dashboardRefresh 이벤트 디스패치 실행...');
  const dispatched = window.dispatchEvent(customEvent);

  console.log('✅ [eventUtils] dashboardRefresh 이벤트 디스패치 완료:', {
    dispatched,
    eventType: customEvent.type,
    timestamp: new Date().toISOString()
  });

  return dispatched;
}

/**
 * API 응답에서 이벤트 데이터를 추출하고 reportGenerated 이벤트를 발생시킵니다.
 * @param apiResponse API 응답 데이터
 * @param fallbackData 폴백 데이터 (API 응답에 이벤트 데이터가 없는 경우)
 */
export function handleReportGeneratedFromAPI(
  apiResponse: any,
  fallbackData: Partial<ReportGeneratedEventDetail>
): boolean {
  let eventDetail: ReportGeneratedEventDetail;

  // 백엔드에서 제공하는 이벤트 데이터 사용 (우선순위)
  if (apiResponse.data?.shouldDispatchEvent && apiResponse.data?.eventData) {
    eventDetail = apiResponse.data.eventData;
    console.log('📊 [eventUtils] 백엔드 제공 이벤트 데이터 사용:', eventDetail);
  } else {
    // 폴백: 기본 이벤트 데이터 생성
    eventDetail = {
      type: 'reportGenerated',
      reportId: apiResponse.data?.reportId,
      reportType: fallbackData.reportType || 'market',
      reportTitle: fallbackData.reportTitle || '분석 리포트',
      patentTitle: fallbackData.patentTitle || '특허 제목',
      patentNumber: fallbackData.patentNumber || '특허 번호',
      timestamp: new Date().toISOString()
    };
    console.log('📊 [eventUtils] 폴백 이벤트 데이터 사용:', eventDetail);
  }

  return dispatchReportGeneratedEvent(eventDetail);
}

/**
 * pointBalanceUpdate 이벤트를 발생시킵니다.
 * @param eventDetail 이벤트 상세 정보
 */
export function dispatchPointBalanceUpdateEvent(eventDetail: PointBalanceUpdateEventDetail): boolean {
  if (typeof window === 'undefined') {
    console.warn('⚠️ [eventUtils] window 객체를 사용할 수 없습니다.');
    return false;
  }

  console.log('💰 [eventUtils] pointBalanceUpdate 이벤트 발생 준비:', eventDetail);

  const customEvent = new CustomEvent('pointBalanceUpdate', {
    detail: eventDetail,
    bubbles: true,
    cancelable: true
  });

  console.log('📤 [eventUtils] pointBalanceUpdate 이벤트 디스패치 실행...');
  const dispatched = window.dispatchEvent(customEvent);

  console.log('✅ [eventUtils] pointBalanceUpdate 이벤트 디스패치 완료:', {
    dispatched,
    eventType: customEvent.type,
    timestamp: new Date().toISOString()
  });

  return dispatched;
}