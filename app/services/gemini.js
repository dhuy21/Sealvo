const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// API key - idéalement depuis .env file
const GEMINI_API_KEY_1 = process.env.GEMINI_API_KEY_1;
const GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2;

class GeminiService {

    //Replace the example of the words with the new example
    async replaceExample(words, words_need_replace_example) {
        for (const word of words) {
            for (const word_need_replace_example of words_need_replace_example) {
                console.log('word.id:', word.id);
                console.log('word_need_replace_example.id:', word_need_replace_example.id);
                console.log(word.id === word_need_replace_example.id);
                if (word.id === word_need_replace_example.id) {
                    console.log('Replacing example for word:', word.example);
                    console.log('New example:', word_need_replace_example.example);
                    word.example = word_need_replace_example.example;
                    console.log('Word after replacement:', word.example);
                }
            }
        }
        return words;
    }
    //Modify the example of the words with examples in error format
    async modifyExample(words) {
        try {
            console.log('Modify examples for words with examples in error format...');
            
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY_2);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const batchPrompt = `
            You are an expert language tutor. 
            Correct the example sentences for each of the input words according to the meaning, type of the word and the language of the word. 
            Note that the grammar of these words is important and correct. You must not change the meaning of the word and the sentence.
            If the example is not correct, you must correct it.
            If the example is correct, you must return the same example.
            Note Wraps any inflected form of the target word in double asterisks (**like_this**)
            Return strictly in JSON format:

            [
                {
                    id: id numeric here, 
                    example: "sentence here with the **target_word** wrapped"
                },
                {   id: "id here", 
                    example: "sentence here with the **target_word** wrapped"
                }
            ]

            Words: 
            ${JSON.stringify(words, null, 2)}`;

            const result = await model.generateContent(batchPrompt);
            const response = await result.response;
            const text = response.text();
            
            // Try to parse the JSON response
            try {
                const parsedResponse = JSON.parse(text);
                console.log('✅ Successfully parsed JSON response');
                return parsedResponse;
            } catch (parseError) {
                
                // Remove markdown backticks and extract JSON
                const cleanText = text.replace(/```json|```/g, '').trim();
                try {
                    const extractedJson = JSON.parse(cleanText);
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

    //Generate examples for words without examples
    async generateExemple(words) { 
        try {
            console.log('Generating examples for words without examples...');
            
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY_1);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const batchPrompt = `
            You are an expert language tutor. 
            Create example sentences for each of the input words according to the meaning, type of the word and the language of the word. 
            Note that the grammar of these words is important and correct. 
            Wraps any inflected form of the target word in double asterisks (**like_this**)
            Return strictly in JSON format:

            [
                {
                    id: id numeric here, 
                    example: "sentence here with the **target_word** wrapped"
                },
                {   id: "id here", 
                    example: "sentence here with the **target_word** wrapped"
                }
            ]

            Words: 
            ${JSON.stringify(words, null, 2)}`;

            console.log('📤 Sending prompt to Gemini...');

            const result = await model.generateContent(batchPrompt);
            const response = await result.response;
            const text = response.text();
            
            // Try to parse the JSON response
            try {
                const parsedResponse = JSON.parse(text);
                console.log('✅ Successfully parsed JSON response');
                return parsedResponse;
            } catch (parseError) {
                
                // Remove markdown backticks and extract JSON
                const cleanText = text.replace(/```json|```/g, '').trim();
                try {
                    const extractedJson = JSON.parse(cleanText);
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