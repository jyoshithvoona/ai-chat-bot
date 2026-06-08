/**
 * Definition of AI tools/features, their options, system instructions, and parsers.
 */
export const TEMPLATES = {
  explainer: {
    id: 'explainer',
    name: 'Concept Explainer',
    description: 'Break down complex topics for any audience level.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    fields: [
      {
        id: 'concept',
        label: 'Concept to Explain',
        type: 'text',
        placeholder: 'e.g., Quantum Computing, Recursion, Inflation...',
        required: true
      },
      {
        id: 'level',
        label: 'Explanation Level',
        type: 'select',
        options: [
          { value: '5-year-old', label: 'Like I\'m 5 (ELI5) 🧸' },
          { value: 'student', label: 'High School Student 🎓' },
          { value: 'professional', label: 'Business Professional 💼' },
          { value: 'expert', label: 'Technical Expert 💻' }
        ],
        defaultValue: 'student'
      }
    ],
    getPrompt: (values) => `Explain the concept: "${values.concept}"`,
    getSystemInstruction: (values) => {
      const level = values.level || 'student';
      let audienceDesc = '';
      
      if (level === '5-year-old') {
        audienceDesc = 'a 5-year-old child. Use simple analogies, very basic vocabulary, short sentences, and a warm, playful tone. Avoid any jargon.';
      } else if (level === 'student') {
        audienceDesc = 'a high school student. Use relatable real-world examples, clear and simple language, and avoid excessive technical details while maintaining accuracy.';
      } else if (level === 'professional') {
        audienceDesc = 'a business professional. Focus on industry impact, practical applications, clear outcomes, and use professional, concise business language.';
      } else if (level === 'expert') {
        audienceDesc = 'a technical expert. Go deep into the underlying mechanics, use proper technical terminology, and discuss edge cases, architectural considerations, or mathematical basis if applicable.';
      }

      return `You are an expert educator. Explain the concept provided by the user.
Adapt your explanation to be understood by ${audienceDesc}

Structure your response using clean, professional Markdown with these exact sections:
## 💡 Quick Overview
A clear, 1-2 sentence definition.

## 🔮 The Analogy
A vivid, creative analogy that makes the concept instantly intuitive.

## 🛠️ How It Works (Step-by-Step)
Break down the mechanics of the concept in a simple, logical sequence.

## 🚀 Why It Matters / Real-World Use Case
Provide a practical example of where and why this is used in the real world.`;
    }
  },

  quiz: {
    id: 'quiz',
    name: 'Interactive Quiz Generator',
    description: 'Generate custom quizzes with instant interactive grading.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/><path d="M21.5 12v6"/></svg>`,
    jsonMode: true,
    fields: [
      {
        id: 'topic',
        label: 'Quiz Topic',
        type: 'text',
        placeholder: 'e.g., JavaScript Arrays, World War II, Photosynthesis...',
        required: true
      },
      {
        id: 'difficulty',
        label: 'Difficulty Level',
        type: 'select',
        options: [
          { value: 'easy', label: 'Easy' },
          { value: 'medium', label: 'Medium' },
          { value: 'hard', label: 'Hard' }
        ],
        defaultValue: 'medium'
      },
      {
        id: 'count',
        label: 'Number of Questions',
        type: 'select',
        options: [
          { value: '3', label: '3 Questions' },
          { value: '4', label: '4 Questions' },
          { value: '5', label: '5 Questions' }
        ],
        defaultValue: '3'
      }
    ],
    getPrompt: (values) => `Generate a quiz about: "${values.topic}"`,
    getSystemInstruction: (values) => {
      const count = values.count || '3';
      const difficulty = values.difficulty || 'medium';
      return `You are an educational assessment system. Generate an interactive multiple-choice quiz based on the user's topic.
Generate exactly ${count} questions at a ${difficulty} difficulty level.

You MUST respond in valid JSON matching this schema:
{
  "questions": [
    {
      "question": "The question text, clear and testing conceptual understanding",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0, // 0-based index of the correct option in the options array
      "explanation": "A concise explanation of why this answer is correct."
    }
  ]
}

Ensure there are exactly ${count} questions, and each question has exactly 4 options. The options must be distinct and plausible. 
CRITICAL RULE: The JSON must be raw, valid, and contain NO markdown block formatting (no \`\`\`json wrappers). DO NOT INCLUDE ANY CONVERSATIONAL TEXT, pre-text, or post-text. Do not provide commentary or correct yourself (e.g. do not say "oh wait" or "let me re-evaluate"). ONLY output the JSON object.`;
    }
  },

  flashcards: {
    id: 'flashcards',
    name: 'Flashcard deck Creator',
    description: 'Create interactive 3D study cards to learn anything.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layers"><path d="m12 3-10 5L12 13l10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    jsonMode: true,
    fields: [
      {
        id: 'subject',
        label: 'Study Subject',
        type: 'text',
        placeholder: 'e.g., Spanish Vocabulary, HTTP Status Codes, Chemistry Elements...',
        required: true
      },
      {
        id: 'count',
        label: 'Number of Flashcards',
        type: 'select',
        options: [
          { value: '4', label: '4 Cards' },
          { value: '6', label: '6 Cards' },
          { value: '8', label: '8 Cards' }
        ],
        defaultValue: '4'
      }
    ],
    getPrompt: (values) => `Generate flashcards for: "${values.subject}"`,
    getSystemInstruction: (values) => {
      const count = values.count || '4';
      return `You are a study aid generator. Create an active-recall flashcard deck for the user's subject.
Generate exactly ${count} flashcards.

You MUST respond in valid JSON matching this schema:
{
  "flashcards": [
    {
      "front": "The brief question, prompt, or term to display on the front of the card",
      "back": "The clear, concise answer, definition, or explanation to display on the back"
    }
  ]
}

Ensure the front is concise and asks a clear question, and the back is a succinct explanation (1-2 sentences). 
CRITICAL RULE: The JSON must be raw, valid, and contain NO markdown block formatting (no \`\`\`json wrappers). DO NOT INCLUDE ANY CONVERSATIONAL TEXT, pre-text, or post-text. ONLY output the JSON object.`;
    }
  },

  summarize: {
    id: 'summarize',
    name: 'Text Summarizer & Bullets',
    description: 'Condense long texts into summaries and key bullet points.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="A2 2 0 0 0 2 2h4v5a2 2 0 0 0 2 2h5Z"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>`,
    fields: [
      {
        id: 'text',
        label: 'Text to Summarize',
        type: 'textarea',
        placeholder: 'Paste your long text here...',
        required: true
      },
      {
        id: 'format',
        label: 'Summary Type',
        type: 'select',
        options: [
          { value: 'standard', label: 'Standard Summary & Bullets' },
          { value: 'one-sentence', label: 'Single Powerful Sentence' },
          { value: 'eli5', label: 'Super Simple Explanation (ELI5)' }
        ],
        defaultValue: 'standard'
      }
    ],
    getPrompt: (values) => values.text,
    getSystemInstruction: (values) => {
      const format = values.format || 'standard';
      if (format === 'one-sentence') {
        return `You are a world-class editor. Summarize the text provided by the user in EXACTLY one powerful, engaging sentence. It must capture the core essence of the entire text.`;
      }
      if (format === 'eli5') {
        return `You are an educator. Summarize the text provided by the user as if explaining to a 5-year-old child. Use extremely simple words, short sentences, and a friendly analogy. Keep it short.`;
      }
      return `You are a professional research analyst. Summarize the user's text.
Structure your response using clean Markdown with:
1. A brief "Executive Summary" section (2-3 sentences max).
2. A "Key Takeaways" bulleted list (3-5 highly impactful points).
Use emojis for visual interest.`;
    }
  },

  rewrite: {
    id: 'rewrite',
    name: 'Professional Rewriter',
    description: 'Transform informal notes into polished business-ready text.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-tool"><path d="m12 19-7-7 3.3-3.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4Z"/><path d="m18 13-1.5-1.5"/><path d="m19 12-7-7 3.3-3.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4Z"/><path d="m22 2-6 6"/></svg>`,
    fields: [
      {
        id: 'text',
        label: 'Draft Text',
        type: 'textarea',
        placeholder: 'e.g., tell him i cant make the meeting because of some personal stuff but ill look at the slides later...',
        required: true
      },
      {
        id: 'tone',
        label: 'Target Tone',
        type: 'select',
        options: [
          { value: 'executive', label: 'Executive & Formal' },
          { value: 'persuasive', label: 'Persuasive & Sales' },
          { value: 'friendly', label: 'Friendly but Professional' }
        ],
        defaultValue: 'executive'
      }
    ],
    getPrompt: (values) => `Rewrite this draft: "${values.text}"`,
    getSystemInstruction: (values) => {
      const tone = values.tone || 'executive';
      let toneDesc = '';
      if (tone === 'executive') {
        toneDesc = 'Executive & Formal. Make it sounding polished, confident, authoritative, and direct. Ideal for communicating with board members or senior management.';
      } else if (tone === 'persuasive') {
        toneDesc = 'Persuasive & Sales-oriented. Focus on value propositions, active verbs, benefits, and call to action.';
      } else {
        toneDesc = 'Friendly but Professional. Warm, collaborative, constructive, yet highly professional and respectful.';
      }

      return `You are a professional communications expert. Rewrite the user's draft text to fit the following tone: ${toneDesc}

Output structure:
## ✍️ Polished Draft
[The rewritten text here. Make it clean, grammatical, and highly effective.]

## 💡 Key Enhancements
* A bulleted list of 2-3 changes you made and the rationale (e.g., "Changed passive voice to active for stronger impact", "Removed informal phrasing to suit the professional context").`;
    }
  },

  translate: {
    id: 'translate',
    name: 'Multilingual Translator',
    description: 'Translate text with pronunciation and vocabulary guides.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-languages"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1h4"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/><path d="M14 14h1.5c.9 0 1.8.3 2.5 1 1.4 1.3 2.1 3.2 2 5.1h-9c-.1-1.9.6-3.8 2-5.1.7-.7 1.6-1 2.5-1z"/></svg>`,
    fields: [
      {
        id: 'text',
        label: 'Text to Translate',
        type: 'textarea',
        placeholder: 'Enter word, phrase, or paragraph...',
        required: true
      },
      {
        id: 'language',
        label: 'Target Language',
        type: 'select',
        options: [
          { value: 'Spanish', label: 'Spanish 🇪🇸' },
          { value: 'French', label: 'French 🇫🇷' },
          { value: 'German', label: 'German 🇩🇪' },
          { value: 'Japanese', label: 'Japanese 🇯🇵' },
          { value: 'Hindi', label: 'Hindi 🇮🇳' },
          { value: 'Italian', label: 'Italian 🇮🇹' }
        ],
        defaultValue: 'Spanish'
      }
    ],
    getPrompt: (values) => `Translate: "${values.text}"`,
    getSystemInstruction: (values) => {
      const lang = values.language || 'Spanish';
      return `You are a professional language tutor and translator. Translate the user's text into ${lang}.
CRITICAL RULE: Always preserve proper nouns (names of people, places, etc.) exactly or as their closest phonetic equivalent. Do NOT translate proper nouns into dictionary words (e.g. 'Jyosith' must remain a name, not be converted to 'Jyotish'/astrology).

Provide the translation and then explain key grammar tips or vocabulary notes.

Structure your response using Markdown:
## 🌐 Translation (${lang})
**[The translation in bold]**

## 🗣️ Pronunciation / Phonetics
* Provide phonetic hints or romanized reading if the language uses a non-Latin script.

## 📝 Learning Points
* Highlight 1-2 grammatical items, verbs, or cultural nuances in the translation to help the user learn.`;
    }
  }
};
