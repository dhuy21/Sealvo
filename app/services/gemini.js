const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// API key - idéalement depuis .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class GeminiService {

    async generateExemple(words) { 
        try {
            console.log('\n🔄 Testing Batch Processing...');
            console.log('📝 Words to process:', words.length);
            
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const batchPrompt = `Create example sentences for these words according to the meaning and type of the word. Note that the grammar of these words is important and correct. Return in JSON format:

            [
                {
                    id: "id here", 
                    example: "sentence here"
                },
                {   id: "id here", 
                    example: "sentence here"
                }
            ]

            Words: 
            ${JSON.stringify(words, null, 2)}`;

            console.log('📤 Sending prompt to Gemini...');

            const result = await model.generateContent(batchPrompt);
            const response = await result.response;
            const text = response.text();
            
            console.log('📥 Raw response from Gemini:');
            console.log(text);

            // Try to parse the JSON response
            try {
                const parsedResponse = JSON.parse(text);
                console.log('✅ Successfully parsed JSON response');
                return parsedResponse;
            } catch (parseError) {
                console.error('❌ Failed to parse JSON response:', parseError.message);
                console.log('🔍 Attempting to extract JSON from response...');
                
                // Remove markdown backticks and extract JSON
                const cleanText = text.replace(/```json|```/g, '').trim();
                try {
                    const extractedJson = JSON.parse(cleanText);
                    console.log('✅ Successfully extracted and parsed JSON');
                    return extractedJson;
                } catch (extractError) {
                    console.error('❌ Failed to parse extracted JSON:', extractError.message);
                    return [];
                }
            }
            
        } catch (error) {
            console.error('❌ Batch Error:', error.message);
            return [];
        }
    }
}

module.exports = new GeminiService();