const axios = require('axios');
const fs = require('fs');

async function testSearch() {
  try {
    console.log('Testing search API...');
    const response = await axios.post('http://localhost:3001/api/search', {
      word: 'AI',
      pageNo: 1,
      numOfRows: 3
    });
    
    console.log('Search successful!');
    console.log('Status:', response.status);
    
    // Write full response to file
    fs.writeFileSync('search-response.json', JSON.stringify(response.data, null, 2));
    console.log('Full response written to search-response.json');
    
    console.log('Success:', response.data.success);
    console.log('Total count:', response.data.totalCount);
    console.log('Results count:', response.data.results?.length || 0);
    
  } catch (error) {
    console.error('Search failed:', error.response?.data || error.message);
    if (error.response?.data) {
      fs.writeFileSync('search-error.json', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testPatentDetail() {
  try {
    console.log('Testing patent detail API...');
    const applicationNumber = '1020250136799';
    const response = await axios.get(`http://localhost:3001/api/detail?applicationNumber=${applicationNumber}`);
    
    console.log('Patent detail successful!');
    console.log('Status:', response.status);
    
    // Write full response to file
    fs.writeFileSync('patent-detail-response.json', JSON.stringify(response.data, null, 2));
    console.log('Full response written to patent-detail-response.json');
    
    console.log('Success:', response.data.success);
    console.log('Has data:', !!response.data.data);
    
  } catch (error) {
    console.error('Patent detail failed:', error.response?.data || error.message);
    if (error.response?.data) {
      fs.writeFileSync('patent-detail-error.json', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSearch();
testPatentDetail();