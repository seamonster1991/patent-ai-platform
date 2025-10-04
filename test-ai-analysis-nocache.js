// Test AI Analysis API with unique data to bypass cache
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5173';

async function testAIAnalysisAPI() {
    console.log('🧪 AI Analysis API 캐시 우회 테스트 시작...\n');

    // Use a unique timestamp to ensure no cache hit
    const timestamp = Date.now();
    const uniquePatentNumber = `1020250130795-${timestamp}`;

    const testData = {
        patentData: {
            biblioSummaryInfo: {
                applicationNumber: uniquePatentNumber,
                inventionTitle: '인공지능 기반 자동화 시스템',
                applicantName: '테스트 회사',
                inventorName: '김개발',
                applicationDate: '2025-01-30',
                publicationNumber: 'KR1020250130795A',
                publicationDate: '2025-01-30',
                registrationNumber: '',
                registrationDate: '',
                ipcCode: 'G06N3/08',
                cpcCode: 'G06N3/08'
            },
            abstractInfo: {
                abstractTextKor: '본 발명은 인공지능 기술을 활용한 자동화 시스템에 관한 것으로, 머신러닝 알고리즘을 통해 데이터를 분석하고 최적화된 결과를 제공하는 기술이다.'
            },
            claimInfo: {
                claimTextKor: '청구항 1: 인공지능 기반 자동화 시스템으로서, 데이터 수집부, 분석부, 제어부를 포함하여 구성되는 것을 특징으로 하는 자동화 시스템.'
            },
            ipcInfo: {
                mainClassificationNumber: 'G06N3/08',
                mainClassificationTitle: '신경망을 이용한 컴퓨터 시스템'
            },
            applicantInfo: {
                applicantName: '테스트 회사',
                applicantAddress: '서울특별시 강남구'
            },
            inventorInfo: {
                inventorName: '김개발',
                inventorAddress: '서울특별시 강남구'
            }
        },
        analysisType: 'market_analysis'
    };

    try {
        console.log('📊 Market Analysis 테스트 (캐시 우회)');
        console.log('📤 요청 데이터:', {
            patentData: {
                applicationNumber: testData.patentData.biblioSummaryInfo.applicationNumber,
                title: testData.patentData.biblioSummaryInfo.inventionTitle,
                abstractLength: testData.patentData.abstractInfo.abstractTextKor.length,
                claimsLength: testData.patentData.claimInfo.claimTextKor.length
            },
            analysisType: testData.analysisType
        });

        const startTime = Date.now();
        
        const response = await fetch(`${API_BASE_URL}/api/ai-analysis`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const endTime = Date.now();
        console.log('✅ 응답 수신 완료');
        console.log(`⏱️ 응답 시간: ${endTime - startTime}ms`);
        console.log(`📊 응답 상태: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API 오류:', response.status, errorText);
            return;
        }

        const responseData = await response.json();
        
        console.log('\n📋 응답 데이터 구조 분석:');
        console.log('- success:', responseData.success);
        console.log('- cached:', responseData.cached);
        console.log('- responseKeys:', Object.keys(responseData));
        
        if (responseData.data) {
            const actualData = responseData.data;
            console.log('- actualData keys:', Object.keys(actualData));
            
            // Analysis 구조 상세 분석
            console.log('- analysis:', {
                exists: !!actualData.analysis,
                type: typeof actualData.analysis,
                isArray: Array.isArray(actualData.analysis),
                keys: actualData.analysis ? Object.keys(actualData.analysis) : 'N/A'
            });
            
            if (actualData.analysis && actualData.analysis.sections) {
                console.log('- analysis.sections:', {
                    exists: !!actualData.analysis.sections,
                    type: typeof actualData.analysis.sections,
                    isArray: Array.isArray(actualData.analysis.sections),
                    length: actualData.analysis.sections.length || 0
                });
                
                if (Array.isArray(actualData.analysis.sections) && actualData.analysis.sections.length > 0) {
                    console.log('✅ 분석 섹션이 올바르게 생성됨');
                    console.log('📋 생성된 섹션들:');
                    actualData.analysis.sections.forEach((section, index) => {
                        console.log(`  ${index + 1}. ${section.title} (${section.content?.length || 0}자)`);
                    });
                } else {
                    console.log('❌ 분석 섹션이 배열이 아니거나 존재하지 않음');
                }
            } else {
                console.log('❌ analysis.sections가 존재하지 않음');
            }
            
            // Raw analysis 확인
            console.log('- rawAnalysis:', {
                exists: !!actualData.rawAnalysis,
                type: typeof actualData.rawAnalysis,
                length: actualData.rawAnalysis?.length || 0,
                preview: actualData.rawAnalysis?.substring(0, 200) + '...'
            });
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
    }

    console.log('\n🏁 캐시 우회 테스트 완료');
}

testAIAnalysisAPI();