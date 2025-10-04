const axios = require('axios');

async function testOtherEndpoints() {
  console.log('🔍 Testing Other API Endpoints');
  console.log('=' .repeat(50));
  
  const baseURL = 'http://localhost:3001/api';
  
  // Test 1: Health Check
  console.log('\n💚 Test 1: Health Check');
  console.log('-'.repeat(30));
  try {
    const response = await axios.get(`${baseURL}/health`);
    console.log('✅ Health endpoint working');
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', response.data);
  } catch (error) {
    console.error('❌ Health endpoint error:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
    }
  }

  // Test 2: Search Endpoint
  console.log('\n🔍 Test 2: Search Endpoint');
  console.log('-'.repeat(30));
  try {
    const searchData = {
      query: "AI 기반 엣지 컴퓨팅",
      page: 1,
      limit: 5
    };
    const response = await axios.post(`${baseURL}/search`, searchData, {
      timeout: 30000
    });
    console.log('✅ Search endpoint working');
    console.log('📊 Status:', response.status);
    console.log('📋 Results count:', response.data?.data?.length || 0);
  } catch (error) {
    console.error('❌ Search endpoint error:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
    }
  }

  // Test 3: Detail Endpoint
  console.log('\n📄 Test 3: Detail Endpoint');
  console.log('-'.repeat(30));
  try {
    const response = await axios.get(`${baseURL}/detail?applicationNumber=1020250130795`, {
      timeout: 30000
    });
    console.log('✅ Detail endpoint working');
    console.log('📊 Status:', response.status);
    console.log('📋 Has data:', !!response.data?.data);
  } catch (error) {
    console.error('❌ Detail endpoint error:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
    }
  }

  // Test 4: Documents Endpoint
  console.log('\n📁 Test 4: Documents Endpoint');
  console.log('-'.repeat(30));
  try {
    const response = await axios.get(`${baseURL}/documents?applicationNumber=1020250130795`, {
      timeout: 30000
    });
    console.log('✅ Documents endpoint working');
    console.log('📊 Status:', response.status);
    console.log('📋 Has data:', !!response.data?.data);
  } catch (error) {
    console.error('❌ Documents endpoint error:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 Other endpoints test completed');
}

testOtherEndpoints();