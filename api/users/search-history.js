const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL과 Key가 설정되지 않았습니다.')
}

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'POST') {
      // 검색 기록 저장
      const { user_id, keyword, filters, results_count } = req.body

      if (!user_id || !keyword) {
        return res.status(400).json({
          success: false,
          error: 'user_id와 keyword는 필수입니다.'
        })
      }

      // filters에서 개별 필드 추출
      const applicant = filters?.applicant || null
      const application_date_from = filters?.applicationDateFrom || null
      const application_date_to = filters?.applicationDateTo || null

      const { data, error } = await supabase
        .from('search_history')
        .insert([
          {
            user_id,
            keyword: keyword.trim(),
            applicant,
            application_date_from,
            application_date_to,
            search_results: { results_count: results_count || 0, filters: filters || {} },
            created_at: new Date().toISOString()
          }
        ])
        .select()

      if (error) {
        console.error('검색 기록 저장 오류:', error)
        return res.status(500).json({
          success: false,
          error: '검색 기록 저장에 실패했습니다.'
        })
      }

      return res.status(200).json({
        success: true,
        data: data[0]
      })

    } else if (req.method === 'GET') {
      // 검색 기록 조회
      const { userId } = req.params

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId가 필요합니다.'
        })
      }

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50) // 최근 50개만 조회

      if (error) {
        console.error('검색 기록 조회 오류:', error)
        return res.status(500).json({
          success: false,
          error: '검색 기록 조회에 실패했습니다.'
        })
      }

      return res.status(200).json({
        success: true,
        data: {
          history: data || []
        }
      })

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      })
    }

  } catch (error) {
    console.error('API 오류:', error)
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    })
  }
}