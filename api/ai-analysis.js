import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  console.log('🔍 [AI Analysis] API 호출됨:', {
    method: req.method,
    url: req.url,
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  })

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '86400')

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // POST 메서드만 허용
  if (req.method !== 'POST') {
    console.log('❌ [AI Analysis] 허용되지 않은 메서드:', req.method)
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      allowedMethods: ['POST']
    })
  }

  try {
    // 환경변수 검증
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [AI Analysis] Supabase 환경변수 누락')
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      })
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { patentData, analysisType = 'general' } = req.body

    if (!patentData) {
      return res.status(400).json({
        success: false,
        error: 'Patent data is required'
      })
    }

    console.log('🔍 [AI Analysis] 분석 요청:', {
      patentId: patentData.id || patentData.applicationNumber,
      analysisType,
      hasTitle: !!patentData.title,
      hasAbstract: !!patentData.abstract
    })

    // AI 분석 수행 (실제 AI 분석 로직은 여기에 구현)
    const analysisResult = await performAIAnalysis(patentData, analysisType)

    // 분석 결과 저장 (선택사항)
    if (patentData.userId) {
      try {
        await supabase
          .from('ai_analysis_history')
          .insert({
            user_id: patentData.userId,
            patent_id: patentData.id || patentData.applicationNumber,
            analysis_type: analysisType,
            analysis_result: analysisResult,
            created_at: new Date().toISOString()
          })
      } catch (saveError) {
        console.warn('⚠️ [AI Analysis] 분석 결과 저장 실패:', saveError.message)
      }
    }

    console.log('✅ [AI Analysis] 분석 완료')
    return res.status(200).json({
      success: true,
      data: analysisResult
    })

  } catch (error) {
    console.error('❌ [AI Analysis] 오류:', error)
    return res.status(500).json({
      success: false,
      error: 'AI analysis failed',
      details: error.message
    })
  }
}

// AI 분석 수행 함수
async function performAIAnalysis(patentData, analysisType) {
  // 기본 분석 결과 구조
  const baseAnalysis = {
    patentId: patentData.id || patentData.applicationNumber,
    title: patentData.title,
    analysisType,
    timestamp: new Date().toISOString()
  }

  switch (analysisType) {
    case 'market':
      return {
        ...baseAnalysis,
        marketPotential: {
          score: Math.floor(Math.random() * 40) + 60, // 60-100
          factors: [
            '시장 규모가 크고 성장 가능성이 높음',
            '기술적 차별성이 뛰어남',
            '상업화 가능성이 높음'
          ]
        },
        competitiveAnalysis: {
          competitorCount: Math.floor(Math.random() * 10) + 5,
          competitiveAdvantage: '기존 기술 대비 효율성 30% 향상'
        },
        recommendations: [
          '빠른 시장 진입 권장',
          '특허 포트폴리오 강화 필요',
          '파트너십 구축 고려'
        ]
      }

    case 'technical':
      return {
        ...baseAnalysis,
        technicalComplexity: {
          score: Math.floor(Math.random() * 30) + 70, // 70-100
          level: 'High'
        },
        innovationLevel: {
          score: Math.floor(Math.random() * 25) + 75, // 75-100
          description: '기존 기술 대비 혁신적 개선'
        },
        implementationFeasibility: {
          score: Math.floor(Math.random() * 20) + 80, // 80-100
          challenges: ['제조 비용 최적화', '품질 관리 체계 구축']
        }
      }

    case 'legal':
      return {
        ...baseAnalysis,
        patentStrength: {
          score: Math.floor(Math.random() * 25) + 75, // 75-100
          factors: ['청구항 범위 적절', '선행기술 차별성 확보']
        },
        infringementRisk: {
          level: 'Low',
          description: '기존 특허와의 충돌 위험 낮음'
        },
        recommendations: [
          '추가 특허 출원 검토',
          '해외 출원 고려',
          '특허 침해 모니터링 체계 구축'
        ]
      }

    default: // general
      return {
        ...baseAnalysis,
        overallScore: Math.floor(Math.random() * 20) + 80, // 80-100
        keyStrengths: [
          '기술적 혁신성',
          '시장 적용 가능성',
          '특허 보호 범위'
        ],
        potentialChallenges: [
          '상용화 비용',
          '시장 진입 장벽',
          '경쟁사 대응'
        ],
        summary: '전반적으로 우수한 특허로 평가되며, 상업적 가치가 높을 것으로 예상됩니다.'
      }
  }
}