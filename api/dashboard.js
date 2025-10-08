// 통합 대시보드 API 엔드포인트
module.exports = async (req, res) => {
  try {
    const { action } = req.query;
    
    switch (action) {
      case 'stats':
        const statsHandler = await import('./dashboard-stats.js');
        return await statsHandler.default(req, res);
        
      case 'charge-credits':
        // 크레딧 충전 기능
        return res.status(200).json({
          success: true,
          message: 'Credit charging functionality',
          data: { available_credits: 15000 }
        });
        
      case 'subscription':
        // 구독 관리 기능
        return res.status(200).json({
          success: true,
          message: 'Subscription management functionality',
          data: { 
            plan: 'basic',
            status: 'active',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
        
      case 'usage-costs':
        // 사용량 및 비용 조회 기능
        return res.status(200).json({
          success: true,
          message: 'Usage and costs functionality',
          data: { 
            monthly_usage: 150,
            monthly_cost: 25.00,
            remaining_credits: 15000
          }
        });
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action parameter. Use: stats, charge-credits, subscription, or usage-costs' 
        });
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};