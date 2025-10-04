// Debug script to test parsing with the actual AI response from our test
const fs = require('fs');

// Copy the parseAnalysisResult function from ai-analysis.js
function parseAnalysisResult(analysisText, analysisType) {
    console.log('🔄 파싱 시작:', {
        textLength: analysisText?.length || 0,
        analysisType: analysisType,
        textPreview: analysisText?.substring(0, 200) + '...'
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

        // 빈 응답 체크
        if (analysisText.includes('특허 정보가 제공되지 않았습니다') || 
            analysisText.includes('no patent information provided')) {
            console.error('❌ AI가 특허 정보 부족을 보고했습니다.');
            return {
                reportName: structured.reportName,
                sections: [],
                rawAnalysis: analysisText,
                error: {
                    type: 'NO_PATENT_INFO',
                    message: 'AI가 특허 정보 부족을 보고했습니다.',
                    timestamp: new Date().toISOString()
                }
            };
        }

        console.log('📝 텍스트 라인 분석 시작...');
        const lines = analysisText.split('\n');
        console.log(`📊 총 ${lines.length}개 라인 발견`);

        // 헤더 패턴 정의 (한국어)
        const headerPatterns = [
            /^#{1,3}\s*(.+)$/,                    // # 헤더
            /^\*\*(.+?)\*\*\s*$/,                // **볼드 헤더**
            /^(\d+)\.\s*(.+)$/,                  // 1. 번호 헤더
            /^([가-힣\s]+):\s*$/,                // 한국어 제목:
            /^【(.+?)】/,                         // 【제목】
            /^■\s*(.+)$/,                        // ■ 제목
            /^▶\s*(.+)$/,                        // ▶ 제목
            /^◆\s*(.+)$/,                        // ◆ 제목
            /^○\s*(.+)$/,                        // ○ 제목
            /^●\s*(.+)$/,                        // ● 제목
            /^-\s*(.+):\s*$/,                    // - 제목:
            /^([가-힣\s]{2,20})\s*분석/,         // XX 분석
            /^([가-힣\s]{2,20})\s*현황/,         // XX 현황
            /^([가-힣\s]{2,20})\s*전망/,         // XX 전망
            /^([가-힣\s]{2,20})\s*요약/,         // XX 요약
            /^([가-힣\s]{2,20})\s*개요/          // XX 개요
        ];

        // 비즈니스 인사이트 전용 패턴
        const businessInsightPatterns = [
            /^([가-힣\s]{2,30})\s*:\s*$/,        // 제목: (콜론으로 끝남)
            /^([가-힣\s]{2,30})\s*-\s*$/,        // 제목- (대시로 끝남)
            /^([가-힣\s]{2,30})\s*》\s*$/,       // 제목》
            /^([가-힣\s]{2,30})\s*〉\s*$/        // 제목〉
        ];

        const sections = [];
        let currentSection = null;
        let currentContent = [];
        let foundAnyHeader = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.length === 0) {
                if (currentContent.length > 0) {
                    currentContent.push(''); // 빈 줄 유지
                }
                continue;
            }

            let isHeader = false;
            let headerTitle = null;

            // 헤더 패턴 매칭
            for (const pattern of headerPatterns) {
                const match = line.match(pattern);
                if (match) {
                    headerTitle = match[1] || match[2] || match[0];
                    isHeader = true;
                    foundAnyHeader = true;
                    console.log(`📋 헤더 발견: "${headerTitle}" (패턴: ${pattern})`);
                    break;
                }
            }

            // 비즈니스 인사이트 전용 패턴 (analysisType이 business_insights인 경우)
            if (!isHeader && analysisType === 'business_insights') {
                for (const pattern of businessInsightPatterns) {
                    const match = line.match(pattern);
                    if (match) {
                        headerTitle = match[1];
                        isHeader = true;
                        foundAnyHeader = true;
                        console.log(`📋 비즈니스 헤더 발견: "${headerTitle}" (패턴: ${pattern})`);
                        break;
                    }
                }
            }

            if (isHeader && headerTitle) {
                // 이전 섹션 저장
                if (currentSection && currentContent.length > 0) {
                    const content = formatBusinessInsightContent(currentContent.join('\n').trim());
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
                        }
                        currentContent.push(line);
                    }
                }
            }
        }

        // 마지막 섹션 저장
        if (currentSection && currentContent.length > 0) {
            const content = formatBusinessInsightContent(currentContent.join('\n').trim());
            
            if (content.length > 0) {
                sections.push({
                    title: `**${currentSection}**`,
                    content: content
                });
                console.log(`📋 마지막 섹션 저장: "${currentSection}" (${content.length}자)`);
            }
        }

        // 헤더가 전혀 없는 경우 전체 텍스트를 섹션으로 분할
        if (!foundAnyHeader || sections.length === 0) {
            console.log('📄 헤더가 없어 텍스트를 자동 분할합니다.');
            
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
            }
        }

        // 빈 섹션 제거 및 품질 검증
        const validSections = sections.filter(section => {
            const hasContent = section.content && section.content.trim().length > 0;
            if (!hasContent) {
                console.warn(`⚠️ 빈 섹션 제거: "${section.title}"`);
            }
            return hasContent;
        });

        // 품질 지표 계산
        const totalContentLength = validSections.reduce((sum, section) => sum + section.content.length, 0);
        console.log(`📊 생성된 리포트 품질 지표: 총 ${validSections.length}개 섹션, 총 ${totalContentLength}자`);
        
        if (totalContentLength < 1000) {
            console.warn('⚠️ 생성된 리포트의 전체 내용이 부족합니다. 더 상세한 분석이 필요합니다.');
        }

        // 강화된 폴백 메커니즘
        if (validSections.length === 0) {
            console.warn('⚠️ 구조화된 섹션을 찾을 수 없어 강화된 폴백 메커니즘을 적용합니다.');
            
            // 1차 폴백: 문장 단위로 분할하여 섹션 생성
            const sentences = analysisText.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
            
            if (sentences.length > 3) {
                console.log('📝 문장 단위로 섹션을 생성합니다.');
                
                // 문장들을 그룹화하여 섹션 생성 (3-5문장씩)
                const sentenceGroups = [];
                for (let i = 0; i < sentences.length; i += 3) {
                    const group = sentences.slice(i, i + 3);
                    if (group.length > 0) {
                        sentenceGroups.push(group.join('. ') + '.');
                    }
                }
                
                sentenceGroups.forEach((group, index) => {
                    if (group.trim().length > 50) {
                        const title = `분석 내용 ${index + 1}`;
                        validSections.push({
                            title: `**${title}**`,
                            content: group.trim()
                        });
                        console.log(`📋 폴백 섹션 생성: "${title}" (${group.length}자)`);
                    }
                });
            }
            
            // 2차 폴백: 전체 텍스트를 단일 섹션으로 처리
            if (validSections.length === 0) {
                console.warn('⚠️ 최종 폴백: 전체 텍스트를 단일 섹션으로 처리합니다.');
                validSections.push({
                    title: `**${structured.reportName}**`,
                    content: analysisText.trim()
                });
            }
        }

        // 최소 품질 보장
        if (validSections.length > 0 && totalContentLength < 100) {
            console.warn('⚠️ 내용이 너무 짧아 추가 정보를 포함합니다.');
            validSections.push({
                title: '**분석 참고사항**',
                content: '이 분석은 제공된 특허 데이터를 바탕으로 AI가 생성한 결과입니다. 더 상세한 분석을 원하시면 다시 시도해주세요.'
            });
        }

        const result = {
            reportName: structured.reportName,
            sections: validSections,
            rawAnalysis: analysisText,
            qualityMetrics: {
                totalSections: validSections.length,
                totalContentLength: totalContentLength,
                averageContentLength: validSections.length > 0 ? Math.round(totalContentLength / validSections.length) : 0
            }
        };

        console.log('🎯 최종 파싱 결과:', {
            reportName: result.reportName,
            sectionsCount: result.sections.length,
            totalContentLength: result.qualityMetrics.totalContentLength
        });

        return result;

    } catch (error) {
        console.error('❌ 마크다운 파싱 실패:', error.message);
        console.log('📄 원본 응답 미리보기:', analysisText.substring(0, 500) + '...');
        
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

function formatBusinessInsightContent(content) {
    if (!content || typeof content !== 'string') {
        return '';
    }

    // 기본 정리
    let formatted = content.trim();
    
    // 연속된 빈 줄 제거 (최대 1개까지만 허용)
    formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 비즈니스 인사이트 특화 포맷팅
    const lines = formatted.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line.length === 0) {
            processedLines.push('');
            continue;
        }
        
        // **제목**: 설명 형태 처리
        if (line.match(/^\*\*(.+?)\*\*:\s*(.+)$/)) {
            const match = line.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
            processedLines.push(`**${match[1]}**: ${match[2]}`);
            continue;
        }
        
        // 번호 목록 처리 (1. 2. 3. ...)
        if (line.match(/^\d+\.\s*(.+)$/)) {
            processedLines.push(line);
            continue;
        }
        
        // 불릿 포인트 처리 (• - * 등)
        if (line.match(/^[•\-\*]\s*(.+)$/)) {
            const match = line.match(/^[•\-\*]\s*(.+)$/);
            processedLines.push(`• ${match[1]}`);
            continue;
        }
        
        // 일반 텍스트
        processedLines.push(line);
    }
    
    return processedLines.join('\n');
}

// Test with the actual AI response from our latest test
const actualAIResponse = `다음은 제공된 특허 정보에 기반한 시장 분석 리포트입니다.

---

# 인공지능 기반 자동화 시스템 (출원번호: 1020250130795-1759565959560) 시장 분석 리포트

## 기술 혁신 및 경쟁 우위

### 핵심 기술 특징

본 특허는 **인공지능(AI) 기술을 활용한 자동화 시스템**을 핵심으로 합니다. 구체적으로 다음과 같은 특징을 가집니다:

*   **머신러닝(Machine Learning) 및 딥러닝(Deep Learning) 알고리즘 적용**: 생산성 극대화 및 운영 효율성 개선을 목표로 하며, 특히 딥러닝 기반의 패턴 인식과 예측 분석 기능을 제공합니다.
*   **실시간 데이터 처리 및 분석**: 센서 데이터, 운영 데이터 등을 실시간으로 수집하고 분석하여 즉각적인 의사결정을 지원합니다.
*   **적응형 자동화**: 환경 변화에 따라 시스템이 스스로 학습하고 최적화하는 기능을 제공합니다.

### 차별화 요소

*   **통합형 AI 플랫폼**: 다양한 AI 기술을 하나의 플랫폼에서 통합 관리
*   **확장 가능한 아키텍처**: 다양한 산업 분야에 적용 가능한 모듈형 구조
*   **사용자 친화적 인터페이스**: 비전문가도 쉽게 사용할 수 있는 직관적 UI/UX

## 시장 분석

### 글로벌 AI 자동화 시장 현황

**시장 규모**: 2024년 기준 글로벌 AI 기반 자동화 시장은 약 **$15.8 billion**으로 추정되며, 2025-2030년 연평균 성장률(CAGR) **22.5%**로 성장하여 2030년에는 **$47.2 billion**에 달할 것으로 예상됩니다.

**주요 성장 동력**:
*   디지털 전환(Digital Transformation) 가속화
*   코로나19 이후 비대면 자동화 수요 증가
*   인건비 상승 및 인력 부족 문제 해결 필요성
*   AI 기술의 성숙도 향상 및 비용 절감

### 주요 응용 분야

1.  **제조업 (Manufacturing)**: 스마트 팩토리, 품질 관리, 예측 정비
2.  **물류 및 유통 (Logistics)**: 창고 자동화, 배송 최적화, 재고 관리
3.  **금융 서비스 (Financial Services)**: 리스크 관리, 고객 서비스, 사기 탐지
4.  **헬스케어 (Healthcare)**: 진단 보조, 환자 모니터링, 의료 데이터 분석

### 경쟁 환경

**주요 경쟁사**:
*   **Google (Alphabet)**: TensorFlow, AutoML 등 AI 플랫폼
*   **Microsoft**: Azure AI, Power Platform
*   **IBM**: Watson AI, Red Hat 자동화 솔루션
*   **Amazon**: AWS AI 서비스, Amazon Robotics
*   **Siemens**: MindSphere, 산업용 AI 솔루션

**경쟁 우위 확보 방안**:
*   특정 산업 분야에 특화된 솔루션 개발
*   한국 시장의 특성을 반영한 맞춤형 기능 제공
*   중소기업도 접근 가능한 가격 정책 및 서비스 모델

## 시장 진입 전략 및 사업화 방안

### 타겟 시장

**1차 타겟**: 한국 내 중견 제조업체 (자동차, 전자, 화학 등)
**2차 타겟**: 물류 및 유통업체
**3차 타겟**: 해외 진출 (동남아시아, 북미)

### 수익 모델

*   **라이선스 모델**: 소프트웨어 라이선스 판매
*   **SaaS 모델**: 클라우드 기반 구독 서비스
*   **컨설팅 및 구축 서비스**: 맞춤형 솔루션 구축 및 운영 지원

### 예상 시장 점유율 및 매출

*   **3년 내 목표**: 한국 AI 자동화 시장의 **5-8%** 점유율 확보
*   **예상 매출**: 2027년까지 연간 **200-300억원** 규모

---

**결론**: 본 특허 기술은 급성장하는 AI 자동화 시장에서 충분한 경쟁력을 가지고 있으며, 적절한 시장 진입 전략과 사업화 계획을 통해 상당한 시장 점유율과 수익을 창출할 수 있을 것으로 판단됩니다.`;

console.log('=== 실제 AI 응답으로 파싱 테스트 ===');
console.log('입력 텍스트 길이:', actualAIResponse.length);
console.log('분석 타입: market_analysis');
console.log('');

const result = parseAnalysisResult(actualAIResponse, 'market_analysis');

console.log('');
console.log('=== 파싱 결과 ===');
console.log('리포트명:', result.reportName);
console.log('섹션 수:', result.sections?.length || 0);
console.log('에러:', result.error || 'None');

if (result.sections && result.sections.length > 0) {
    console.log('');
    console.log('=== 생성된 섹션들 ===');
    result.sections.forEach((section, index) => {
        console.log(`${index + 1}. ${section.title}`);
        console.log(`   내용 길이: ${section.content?.length || 0}자`);
        console.log(`   내용 미리보기: ${section.content?.substring(0, 100)}...`);
        console.log('');
    });
}

console.log('=== 품질 지표 ===');
if (result.qualityMetrics) {
    console.log('총 섹션 수:', result.qualityMetrics.totalSections);
    console.log('총 내용 길이:', result.qualityMetrics.totalContentLength);
    console.log('평균 섹션 길이:', result.qualityMetrics.averageContentLength);
}

console.log('');
console.log('=== 반환 객체 구조 확인 ===');
console.log('result type:', typeof result);
console.log('result keys:', Object.keys(result));
console.log('sections type:', typeof result.sections);
console.log('sections isArray:', Array.isArray(result.sections));
console.log('sections length:', result.sections?.length);