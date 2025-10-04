// Debug script to test parsing with live AI response
const fetch = require('node-fetch');

// Copy the parseAnalysisResult function from ai-analysis.js with debug logging
function parseAnalysisResult(analysisText, analysisType) {
    console.log('🔄 파싱 시작:', {
        textLength: analysisText?.length || 0,
        analysisType: analysisType
    });

    const structured = {
        reportName: analysisType === 'market_analysis' ? '특허 시장 분석 리포트' : '비즈니스 인사이트 리포트',
        rawAnalysis: analysisText
    };

    try {
        // 입력 검증
        if (!analysisText || typeof analysisText !== 'string' || analysisText.trim().length === 0) {
            console.error('❌ 분석 텍스트가 비어있거나 유효하지 않습니다.');
            return {
                reportName: structured.reportName,
                sections: [],
                rawAnalysis: analysisText || '',
                error: {
                    type: 'EMPTY_ANALYSIS_TEXT',
                    message: '분석 텍스트가 비어있습니다.',
                    timestamp: new Date().toISOString()
                }
            };
        }

        console.log('📝 텍스트 라인 분석 시작...');
        const lines = analysisText.split('\n');
        console.log(`📊 총 ${lines.length}개 라인 발견`);

        // Show first 10 lines for debugging
        console.log('🔍 첫 10개 라인:');
        lines.slice(0, 10).forEach((line, index) => {
            console.log(`  ${index + 1}: "${line}"`);
        });

        // 비즈니스 인사이트 리포트를 위한 강화된 헤더 패턴 정의
        const headerPatterns = [
            /^#{1,6}\s*(.+)$/,                    // # ~ ###### 헤더 (공백 선택적)
            /^#{1,6}\s*\*\*(.+?)\*\*\s*$/,       // ## **헤더**
            /^#{1,6}\s*\*\*\[(.+?)\]\*\*\s*$/,   // ### **[헤더]**
            /^(.+)\n[=\-]{3,}$/,                 // 밑줄 스타일 헤더
            /^\*\*(.+)\*\*$/,                    // **굵은 글씨** 헤더
            /^\*\*\[(.+?)\]\*\*\s*$/,            // **[헤더]**
            /^__(.+)__$/,                        // __굵은 글씨__ 헤더
            /^([가-힣\s]{2,30})\s*분석/,         // XX 분석
            /^([가-힣\s]{2,30})\s*현황/,         // XX 현황
            /^([가-힣\s]{2,30})\s*전망/,         // XX 전망
            /^([가-힣\s]{2,30})\s*요약/,         // XX 요약
            /^([가-힣\s]{2,30})\s*개요/,         // XX 개요
            /^([가-힣\s]{2,30})\s*리포트/,       // XX 리포트
            /^([가-힣\s]{2,30})\s*특징/,         // XX 특징
            /^([가-힣\s]{2,30})\s*환경/,         // XX 환경
            /^([가-힣\s]{2,30})\s*전략/,         // XX 전략
            /^([가-힣\s]{2,30})\s*방안/          // XX 방안
        ];

        // 비즈니스 인사이트 리포트 전용 패턴 (더 세밀한 구조 인식)
        const businessInsightPatterns = [
            /^(구체적인\s*신사업\s*제안)$/i,                    // "구체적인신사업제안"
            /^(최적의\s*수익\s*창출\s*경로)$/i,                 // "최적의수익창출경로"
            /^(전략적\s*기술\s*가치\s*추정)$/i,                 // "전략적기술가치추정"
            /^(최우선\s*R&D\s*후속\s*투자\s*방향)$/i,           // "최우선R&D후속투자방향"
            /^(전략적\s*파트너십\/제휴\s*대상)$/i,              // "전략적파트너십/제휴대상"
            /^(최악의\s*시나리오\s*대비\s*리스크\s*관리)$/i,     // "최악의시나리오대비리스크관리"
            /^(\d+단계:\s*.+)$/,                               // "1단계: 직접 사업화" 형태
            /^\*\*([^*]+)\*\*:\s*$/,                          // "**수익 접근법**:" 형태
            /^-\s*\*\*([^*]+)\*\*:\s*(.+)$/,                  // "- **과제명**: 설명" 형태
            /^\*\*([^*]+)\*\*:\s*(.+)$/,                      // "**대상 기업**: 설명" 형태
        ];

        const sections = [];
        let currentSection = null;
        let currentContent = [];
        let foundAnyHeader = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 빈 줄 건너뛰기
            if (line.length === 0) {
                if (currentContent.length > 0) {
                    currentContent.push(''); // 빈 줄 유지
                }
                continue;
            }

            let isHeader = false;
            let headerTitle = null;

            // 헤더 패턴 매칭 - 디버깅 추가
            for (let j = 0; j < headerPatterns.length; j++) {
                const pattern = headerPatterns[j];
                const match = line.match(pattern);
                if (match) {
                    // 매치된 그룹 중 가장 적절한 것 선택
                    headerTitle = match[1] || match[2] || match[0];
                    isHeader = true;
                    foundAnyHeader = true;
                    console.log(`📋 헤더 발견 (라인 ${i + 1}): "${headerTitle}" (패턴 ${j + 1}: ${pattern})`);
                    break;
                }
            }

            // 비즈니스 인사이트 전용 패턴 (analysisType이 business_insights인 경우)
            if (!isHeader && analysisType === 'business_insights') {
                for (let j = 0; j < businessInsightPatterns.length; j++) {
                    const pattern = businessInsightPatterns[j];
                    const match = line.match(pattern);
                    if (match) {
                        headerTitle = match[1];
                        isHeader = true;
                        foundAnyHeader = true;
                        console.log(`📋 비즈니스 헤더 발견 (라인 ${i + 1}): "${headerTitle}" (패턴 ${j + 1}: ${pattern})`);
                        break;
                    }
                }
            }

            if (isHeader && headerTitle) {
                // 이전 섹션 저장
                if (currentSection && currentContent.length > 0) {
                    const content = currentContent.join('\n').trim();
                    if (content.length > 0) {
                        sections.push({
                            title: `**${currentSection}**`,
                            content: content
                        });
                        console.log(`📋 섹션 저장: "${currentSection}" (${content.length}자)`);
                    }
                }

                // 새 섹션 시작
                currentSection = headerTitle.trim();
                currentContent = [];
                console.log(`🆕 새 섹션 시작: "${currentSection}"`);
            } else {
                // 내용 라인
                if (currentSection) {
                    currentContent.push(line);
                } else {
                    // 첫 번째 헤더 전의 내용은 무시하거나 별도 처리
                    if (line.length > 20) { // 의미있는 내용만
                        if (!currentSection) {
                            currentSection = '개요';
                            currentContent = [];
                            console.log(`🆕 기본 섹션 시작: "${currentSection}"`);
                        }
                        currentContent.push(line);
                    }
                }
            }
        }

        // 마지막 섹션 저장
        if (currentSection && currentContent.length > 0) {
            const content = currentContent.join('\n').trim();
            
            if (content.length > 0) {
                sections.push({
                    title: `**${currentSection}**`,
                    content: content
                });
                console.log(`📋 마지막 섹션 저장: "${currentSection}" (${content.length}자)`);
            }
        }

        console.log(`📊 헤더 발견 여부: ${foundAnyHeader}, 생성된 섹션 수: ${sections.length}`);

        // 헤더가 전혀 없는 경우 전체 텍스트를 섹션으로 분할
        if (!foundAnyHeader || sections.length === 0) {
            console.log('📄 헤더가 없어 폴백 메커니즘 적용');
            
            // 문단별로 분할 (빈 줄 기준)
            const paragraphs = analysisText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
            
            if (paragraphs.length > 1) {
                paragraphs.forEach((paragraph, index) => {
                    const trimmed = paragraph.trim();
                    if (trimmed.length > 50) { // 최소 길이 확인
                        // 첫 번째 문장을 제목으로 사용
                        const sentences = trimmed.split(/[.!?]\s+/);
                        const title = sentences[0].substring(0, 50) + (sentences[0].length > 50 ? '...' : '');
                        const content = trimmed;
                        
                        sections.push({
                            title: `**${title}**`,
                            content: content
                        });
                        console.log(`📋 자동 섹션 생성 ${index + 1}: "${title}" (${content.length}자)`);
                    }
                });
            } else {
                // 단일 섹션으로 처리
                sections.push({
                    title: `**${structured.reportName}**`,
                    content: analysisText.trim()
                });
                console.log(`📋 단일 섹션 생성: "${structured.reportName}" (${analysisText.length}자)`);
            }
        }

        const result = {
            reportName: structured.reportName,
            sections: sections,
            rawAnalysis: analysisText,
            debug: {
                foundAnyHeader: foundAnyHeader,
                totalLines: lines.length,
                sectionsGenerated: sections.length
            }
        };

        console.log('🎯 최종 파싱 결과:', {
            reportName: result.reportName,
            sectionsCount: result.sections.length,
            foundHeaders: foundAnyHeader
        });

        return result;

    } catch (error) {
        console.error('❌ 마크다운 파싱 실패:', error.message);
        
        // 파싱 실패 시 전체 텍스트를 단일 섹션으로 반환
        return {
            reportName: structured.reportName,
            sections: [
                { 
                    title: `**${structured.reportName}**`, 
                    content: analysisText.trim()
                }
            ],
            rawAnalysis: analysisText,
            error: {
                type: 'MARKDOWN_PARSE_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
}

async function testLiveParsing() {
    console.log('🧪 실시간 AI 응답 파싱 테스트 시작...\n');

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
        console.log('📤 API 호출 중...');
        
        const response = await fetch('http://localhost:5173/api/ai-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API 오류:', response.status, errorText);
            return;
        }

        const responseData = await response.json();
        
        if (responseData.data && responseData.data.rawAnalysis) {
            console.log('\n🔍 실제 AI 응답으로 파싱 테스트');
            console.log('원본 응답 길이:', responseData.data.rawAnalysis.length);
            
            const result = parseAnalysisResult(responseData.data.rawAnalysis, 'market_analysis');
            
            console.log('\n=== 파싱 결과 요약 ===');
            console.log('섹션 수:', result.sections.length);
            console.log('헤더 발견:', result.debug?.foundAnyHeader);
            
            if (result.sections.length > 0) {
                console.log('\n=== 생성된 섹션들 ===');
                result.sections.forEach((section, index) => {
                    console.log(`${index + 1}. ${section.title} (${section.content.length}자)`);
                });
            }
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);
    }
}

testLiveParsing();