import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { handleReportGeneratedFromAPI } from '../utils/eventUtils';

const TestReportGeneration: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 테스트용 특허 데이터
  const testPatentData = {
    biblioSummaryInfo: {
      applicationNumber: "10-2023-0123456",
      inventionTitle: "인공지능 기반 특허 분석 시스템",
      applicationDate: "2023.09.15",
      applicantName: "테스트 회사"
    },
    abstractInfo: {
      abstractTextKor: "본 발명은 인공지능 기술을 활용하여 특허 문서를 자동으로 분석하고 시장성을 평가하는 시스템에 관한 것이다. 딥러닝 알고리즘을 통해 특허의 기술적 특징을 추출하고, 시장 동향 데이터와 결합하여 상업적 가치를 예측한다."
    },
    claimInfo: {
      claimText: "청구항 1: 특허 문서를 입력받는 입력부; 인공지능 모델을 이용하여 특허 문서를 분석하는 분석부; 분석 결과를 출력하는 출력부를 포함하는 특허 분석 시스템."
    }
  };

  const generateReport = async (reportType: 'market' | 'business') => {
    console.log(`🚀 ${reportType} 리포트 생성 시작`);
    console.log('📋 특허 데이터 구조:', {
      keys: Object.keys(testPatentData || {}),
      hasTitle: !!(testPatentData?.biblioSummaryInfo?.inventionTitle),
      hasAbstract: !!(testPatentData?.abstractInfo?.abstractTextKor),
      hasClaims: !!(testPatentData?.claimInfo),
      applicationNumber: testPatentData?.biblioSummaryInfo?.applicationNumber
    });
    
    setLoading(true);
    setError(null);
    setReport(null);

    const startTime = Date.now();

    try {
      const requestData = {
        patentData: testPatentData,
        reportType,
        userId: '276975db-635b-4c77-87a0-548f91b14231' // 테스트 사용자 ID (seongwankim@gmail.com)
      };
      
      console.log('📡 API 요청 전송 중...');
      console.log('🔍 요청 URL:', 'http://localhost:3001/api/generate-report');
      console.log('📦 요청 데이터 크기:', JSON.stringify(requestData).length, 'bytes');
      console.log('🎯 요청 타입:', requestData.reportType);
      
      const response = await fetch('http://localhost:3001/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const processingTime = Date.now() - startTime;
      console.log(`⏱️ API 응답 시간: ${processingTime}ms`);
      console.log('📊 응답 상태:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API 응답 오류:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url,
          type: response.type
        });

        let errorMessage = '리포트 생성에 실패했습니다.';
        switch (response.status) {
          case 400:
            errorMessage = errorData.message || '요청 데이터가 유효하지 않습니다.';
            break;
          case 401:
            errorMessage = 'AI 서비스 인증 오류입니다. 관리자에게 문의하세요.';
            break;
          case 408:
            errorMessage = 'AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
            break;
          case 429:
            errorMessage = 'AI 서비스 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
            break;
          case 503:
            errorMessage = '네트워크 연결 오류입니다. 인터넷 연결을 확인해주세요.';
            break;
          default:
            errorMessage = errorData.message || '알 수 없는 오류가 발생했습니다.';
        }

        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      const data = await response.json();
      console.log('✅ API 응답 데이터:', {
        success: data.success,
        reportType: data.data?.reportType,
        sectionsCount: data.data?.content?.sections?.length,
        processingTime: data.data?.processingTime,
        generatedAt: data.data?.generatedAt
      });

      if (data.success && data.data?.content) {
        setReport(data.data.content);
        toast.success(`${reportType === 'market' ? '시장 분석' : '비즈니스 인사이트'} 리포트가 생성되었습니다!`);
        console.log('🎉 리포트 생성 완료:', data.data.content);
        
        // 대시보드 실시간 업데이트를 위한 이벤트 발생
        if (typeof window !== 'undefined') {
          console.log('📊 [TestReportGeneration] reportGenerated 이벤트 발생 준비');
          
          // eventUtils를 사용하여 이벤트 발생
          const eventDispatched = handleReportGeneratedFromAPI(data, {
            reportType: reportType,
            reportTitle: `${reportType === 'market' ? '시장 분석' : '비즈니스 인사이트'} 리포트`,
            patentTitle: testPatentData.biblioSummaryInfo.inventionTitle,
            patentNumber: testPatentData.biblioSummaryInfo.applicationNumber
          });
          
          console.log('✅ [TestReportGeneration] 이벤트 발생 완료:', eventDispatched);
        }
      } else {
        throw new Error(data.message || '리포트 데이터가 유효하지 않습니다.');
      }

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error('❌ 리포트 생성 오류:', {
        error: error.message,
        processingTime: `${totalTime}ms`,
        stack: error.stack
      });

      const errorMessage = error.message || '리포트 생성 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">리포트 생성 테스트</h1>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">테스트 특허 정보</h2>
        <p><strong>출원번호:</strong> {testPatentData.biblioSummaryInfo.applicationNumber}</p>
        <p><strong>발명명:</strong> {testPatentData.biblioSummaryInfo.inventionTitle}</p>
        <p><strong>출원일:</strong> {testPatentData.biblioSummaryInfo.applicationDate}</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => generateReport('market')}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '생성 중...' : '시장 분석 리포트 생성'}
        </button>
        
        <button
          onClick={() => generateReport('business')}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '생성 중...' : '비즈니스 인사이트 리포트 생성'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold">오류 발생</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {report && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">생성된 리포트</h2>
          {report.sections?.map((section: any, index: number) => (
            <div key={index} className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{section.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestReportGeneration;