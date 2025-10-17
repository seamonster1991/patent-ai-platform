// 모니터링 로그 API 엔드포인트
export default async function handler(req, res) {
  console.log('Monitoring logs API handler called:', req.method, req.url);
  
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // 쿼리 파라미터 추출
      const { level, source, search, limit = 100, page = 1 } = req.query;
      
      // 모의 로그 데이터 생성 (실제 환경에서는 데이터베이스에서 조회)
      const mockLogs = [
        {
          id: '1',
          level: 'info',
          message: 'User authentication successful',
          source: 'auth-service',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5분 전
          details: { user_id: 'user123', ip: '192.168.1.1' }
        },
        {
          id: '2',
          level: 'warning',
          message: 'High memory usage detected',
          source: 'system-monitor',
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10분 전
          details: { memory_usage: '85%', threshold: '80%' }
        },
        {
          id: '3',
          level: 'error',
          message: 'Database connection timeout',
          source: 'database',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15분 전
          details: { connection_pool: 'main', timeout: '30s' }
        },
        {
          id: '4',
          level: 'info',
          message: 'API request processed successfully',
          source: 'api-gateway',
          timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20분 전
          details: { endpoint: '/api/search', response_time: '150ms' }
        },
        {
          id: '5',
          level: 'debug',
          message: 'Cache miss for user preferences',
          source: 'cache-service',
          timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25분 전
          details: { cache_key: 'user_prefs_123', ttl: '3600s' }
        }
      ];

      // 필터링 적용
      let filteredLogs = mockLogs;
      
      if (level && level !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.level === level);
      }
      
      if (source && source !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.source.includes(source));
      }
      
      if (search) {
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(search.toLowerCase()) ||
          log.source.toLowerCase().includes(search.toLowerCase())
        );
      }

      // 페이징 적용
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

      const response = {
        success: true,
        logs: paginatedLogs,
        total: filteredLogs.length,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(filteredLogs.length / limitNum)
      };

      console.log('Monitoring logs response:', response);
      return res.status(200).json(response);

    } catch (error) {
      console.error('Monitoring logs API error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // 지원하지 않는 메서드
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}