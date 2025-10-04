const axios = require('axios');

// Copy the parseAnalysisResult function from the API
function parseAnalysisResult(analysisText, analysisType) {
    console.log('🔄 마크다운 텍스트 파싱 시작:', {
        textLength: analysisText?.length || 0,
        analysisType,
        hasText: !!analysisText
    });

    const structured = {
        reportName: analysisType === 'market_analysis' ? '시장 분석 리포트' : '비즈니스 인사이트 리포트',
        sections: [],
        rawAnalysis: analysisText
    };

    // 입력 검증
    if (!analysisText || typeof analysisText !== 'string') {
        console.error('❌ 유효하지 않은 분석 텍스트');
        return {
            ...structured,
            sections: [
                { 
                    title: '**분석 오류**', 
                    content: 'AI 응답이 유효하지 않습니다. 다시 시도해주세요.' 
                }
            ],
            error: {
                type: 'INVALID_INPUT',
                message: 'Invalid analysis text provided',
                timestamp: new Date().toISOString()
            }
        };
    }

    if (analysisText.trim().length === 0) {
        console.error('❌ 빈 분석 텍스트');
        return {
            ...structured,
            sections: [
                { 
                    title: '**분석 오류**', 
                    content: 'AI가 응답을 생성하지 못했습니다. 다시 시도해주세요.' 
                }
            ],
            error: {
                type: 'EMPTY_RESPONSE',
                message: 'Empty analysis text provided',
                timestamp: new Date().toISOString()
            }
        };
    }

    try {
        const sections = [];
        const lines = analysisText.split('\n');
        
        console.log('📝 텍스트 라인 수:', lines.length);

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

        let currentSection = null;
        let currentContent = [];
        let foundAnyHeader = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 빈 줄 건너뛰기
            if (line.length === 0) {
                if (currentContent.length > 0) {
                    currentContent.push(''); // 빈 줄 유지 (문단 구분용)
                }
                continue;
            }

            let isHeader = false;
            let headerTitle = null;

            // 다양한 헤더 패턴 확인
            for (const pattern of headerPatterns) {
                const match = line.match(pattern);
                if (match) {
                    headerTitle = match[1].trim();
                    isHeader = true;
                    foundAnyHeader = true;
                    console.log(`📋 헤더 발견 (라인 ${i + 1}): "${headerTitle}" (패턴: ${headerPatterns.indexOf(pattern) + 1})`);
                    break;
                }
            }

            // 헤더 발견 시 이전 섹션 저장
            if (isHeader) {
                if (currentSection && currentContent.length > 0) {
                    let content = currentContent.join('\n').trim();
                    
                    if (content.length > 0) {
                        sections.push({
                            title: `**${currentSection}**`,
                            content: content
                        });
                        console.log(`📋 섹션 저장: "${currentSection}" (${content.length}자)`);
                    }
                }
                
                currentSection = headerTitle;
                currentContent = [];
                console.log(`🆕 새 섹션 시작: "${headerTitle}"`);
            }
            // 일반 내용
            else {
                currentContent.push(line);
            }
        }

        // 마지막 섹션 처리
        if (currentSection && currentContent.length > 0) {
            let content = currentContent.join('\n').trim();
            
            if (content.length > 0) {
                sections.push({
                    title: `**${currentSection}**`,
                    content: content
                });
                console.log(`📋 마지막 섹션 저장: "${currentSection}" (${content.length}자)`);
            }
        }

        console.log(`📊 헤더 발견 여부: ${foundAnyHeader}, 생성된 섹션 수: ${sections.length}`);

        // 헤더가 전혀 없는 경우 폴백
        if (!foundAnyHeader || sections.length === 0) {
            console.log('📄 헤더가 없어 폴백 메커니즘 적용');
            sections.push({
                title: '**AI 분석 결과 (원시 데이터)**',
                content: analysisText.trim()
            });
        }

        return {
            reportName: structured.reportName,
            sections: sections,
            rawAnalysis: analysisText,
            qualityMetrics: {
                totalSections: sections.length,
                totalContentLength: sections.reduce((sum, section) => sum + section.content.length, 0),
                foundHeaders: foundAnyHeader
            }
        };

    } catch (error) {
        console.error('❌ 마크다운 파싱 실패:', error.message);
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

async function testParsingWithApiResponse() {
    console.log('🧪 API 응답으로 파싱 테스트 시작...');
    
    const testData = {
        patentData: {
            applicationNumber: `1020250130795-${Date.now()}`,
            title: '인공지능 기반 자동화 시스템',
            abstract: '본 발명은 인공지능을 활용한 자동화 시스템에 관한 것으로, 머신러닝 알고리즘을 통해 효율성을 극대화한다.',
            claims: '청구항 1: 인공지능 기반 자동화 시스템으로서, 데이터 처리부와 제어부를 포함한다.'
        },
        analysisType: 'market_analysis'
    };

    try {
        // API 호출
        const response = await axios.post('http://localhost:5173/api/ai-analysis', testData, {
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const rawAnalysis = response.data.data?.analysis?.rawAnalysis;
        if (rawAnalysis) {
            console.log('\n=== API에서 받은 Raw Analysis로 파싱 테스트 ===');
            const parsed = parseAnalysisResult(rawAnalysis, 'market_analysis');
            
            console.log('\n🎯 최종 파싱 결과:', {
                reportName: parsed.reportName,
                sectionsCount: parsed.sections.length,
                foundHeaders: parsed.qualityMetrics?.foundHeaders
            });
            
            console.log('\n=== 생성된 섹션들 ===');
            parsed.sections.forEach((section, index) => {
                console.log(`${index + 1}. **${section.title}** (${section.content.length}자)`);
            });
        }

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

testParsingWithApiResponse();