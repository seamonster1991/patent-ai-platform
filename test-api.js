require('dotenv').config();
console.log('KIPRIS_API_KEY:', process.env.KIPRIS_API_KEY ? 'Found' : 'Not found');
const searchHandler = require('./api/search.js');

// Mock request and response objects
const mockReq = {
  method: 'POST',
  body: {
    word: 'AI',
    pageNo: 1,
    numOfRows: 5
  }
};

const mockRes = {
  setHeader: (name, value) => console.log(`Header: ${name} = ${value}`),
  status: (code) => ({
    json: (data) => {
      console.log(`Status: ${code}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      return mockRes;
    },
    end: () => {
      console.log(`Status: ${code} - End`);
      return mockRes;
    }
  }),
  json: (data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
    return mockRes;
  }
};

console.log('Testing search API...');
searchHandler(mockReq, mockRes).catch(console.error);