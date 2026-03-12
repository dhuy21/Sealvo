const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class GeminiService {
  async replaceExample(words, words_need_replace_example) {
    const items = Array.isArray(words) ? words : [words];
    for (const word of items) {
      const found = words_need_replace_example.find((w) => w.id == word.id);
      if (found) word.example = found.example;
    }
    return words;
  }

  async modifyExample(words) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const batchPrompt = `
            You are an expert language tutor. 
            Correct the example sentences for each of the input words according to the meaning, type of the word and the language of the word. 
            Note that the grammar of these words is important and correct. You must not change the meaning of the word and the sentence.
            If the example is not correct, you must correct it.
            If the example is correct, you must return the same example.
            Note Wraps any inflected form of the target word in double asterisks (**like_this**)
            Note that the target word if is a compound word, you must wrap each of its parts in double asterisks.
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

      try {
        return JSON.parse(text);
      } catch {
        const cleanText = text.replace(/```json|```/g, '').trim();
        try {
          return JSON.parse(cleanText);
        } catch {
          return [];
        }
      }
    } catch {
      return [];
    }
  }

  async generateExemple(words) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const batchPrompt = `
            You are an expert language tutor. 
            Create example sentences for each of the input words according to the meaning, type of the word and the language of the word. 
            Note that the grammar of these words is important and correct. 
            Wraps any inflected form of the target word in double asterisks (**like_this**)
            Note that the target word if is a compound word, you must wrap each of its parts in double asterisks.
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

      try {
        return JSON.parse(text);
      } catch {
        const cleanText = text.replace(/```json|```/g, '').trim();
        try {
          return JSON.parse(cleanText);
        } catch {
          return [];
        }
      }
    } catch {
      return [];
    }
  }
}

module.exports = new GeminiService();
