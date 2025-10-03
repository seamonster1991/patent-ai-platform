const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key:', apiKey ? 'Present' : 'Missing');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 사용 가능한 모델 목록 확인
    const models = await genAI.listModels();
    console.log('Available models:');
    models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
      console.log(`  Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
    });
    
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

listModels();