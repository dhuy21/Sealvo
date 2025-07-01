const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// API key - idéalement depuis .env file
const GEMINI_API_KEY = 'AIzaSyCSDLIQVVCc_LvsO7kQP6cpjlpTMBfazAc';

async function testGemini25Flash() {
  try {
    console.log('🚀 Testing Gemini 2.5 Flash...');
    
    // Initialize the model
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Test single example generation
    const prompt = `Create a simple example sentence using the word "vocabulary" (meaning: từ vựng). Return only the sentence.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Success! Gemini 2.5 Flash Response:');
    console.log('📝 Example:', text);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('API key')) {
      console.log('🔑 Check your API key');
    } else if (error.message.includes('model')) {
      console.log('🤖 Model might not be available in your region');
    }
    return false;
  }
}

async function testBatchProcessing() {
  try {
    console.log('\n🔄 Testing Batch Processing...');
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const batchPrompt = `Create simple example sentences for these words. Return in JSON format:

{
  "examples": [
    {"word": "vocabulary", "example": "sentence here"},
    {"word": "grammar", "example": "sentence here"},
    {"word": "pronunciation", "example": "sentence here"}
  ]
}

Words:
1. vocabulary (meaning: từ vựng, type: noun)
2. grammar (meaning: ngữ pháp, type: noun)  
3. pronunciation (meaning: phát âm, type: noun)`;

    const result = await model.generateContent(batchPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Batch Processing Success!');
    console.log('📦 Batch Response:', text);
    
    return true;
  } catch (error) {
    console.error('❌ Batch Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Google Gemini 2.5 Flash Testing\n');
  
  // Test 1: Single example
  const test1 = await testGemini25Flash();
  
  // Test 2: Batch processing  
  const test2 = await testBatchProcessing();
  
  if (test1 && test2) {
    console.log('\n🎉 All tests passed! Ready to integrate into your app.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

main();