# Learnmate AI - Interactive Study & Writing Companion

Learnmate AI is a premium, feature-rich single-page web workspace built using Vanilla HTML, CSS, and JavaScript. Powered by the Google Gemini API, it provides specialized tools designed to streamline learning, writing, and analysis, complete with real-time interactive widgets, glassmorphic design, and local browser persistence.

---

## ✨ Features & Requirements Met

1. **Text Input & Gemini API Integration**: User input is securely sent to Google's official Gemini endpoint (`gemini-1.5-flash`) via modern ES modules.
2. **Graceful Empty State & Error Handling**: Real-time toast notifications warn of missing API keys, empty inputs, or connection errors. Form generation blocks action buttons while the model computes responses.
3. **Six Specialized AI Tools (Exceeds 3 Custom Features Requirement)**:
   - 💡 **Concept Explainer**: Explains concepts customized for different target levels (ELI5, Student, Professional, Technical Expert) complete with vivid analogies.
   - 🎓 **Interactive Quiz Generator**: Dynamically parses Gemini's structured JSON output into an interactive multiple-choice quiz. Select options, see instant green/red indicator states, view explanations, and get a confetti celebration on a strong score!
   - layers **Flashcard Deck Creator**: Builds 3D flippable study cards. Click to trigger an elegant flipping animation, and toggle cards as "Mastered" to track review progress.
   - 📄 **Text Summarizer**: Condenses long articles into key executive summaries and critical bullet points.
   - ✍️ **Professional Rewriter**: Translates informal descriptions into boardroom-ready emails and notes, detailing what grammar enhancements were applied.
   - 🌐 **Multilingual Translator**: Translates phrases into six languages with phonetic guidance and cultural lessons.
4. **General Assistant Chat (Bonus Challenge)**: A freeform conversations panel with conversational memory.
5. **Activity Log & Persistence (Bonus Challenge)**: Sidebar saves previous sessions in `localStorage`. Clicking a session loads its state instantly, and sessions can be deleted individually or wiped globally.
6. **Premium Visuals (Bonus Challenge)**: Stunning dark obsidian palette, translucent glassmorphism blur layers, custom scrollbars, animated skeletons, and responsiveness.

---

## 🛠️ How to Get Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (LTS version recommended).

### 1. Install Dependencies
Run the following command in your terminal within this directory:
```bash
npm install
```

### 2. Start the Development Server
Launch the local Vite server:
```bash
npm run dev
```
By default, the application will launch automatically at **`http://localhost:3000`**.

### 3. Set up your API Key
1. Obtain a free key from [Google AI Studio](https://aistudio.google.com/).
2. Click **API Settings** in the bottom left corner of Learnmate.
3. Paste your key and click **Save Key**. The status indicator in the bottom-left corner will turn green.
4. Choose any tool or click **New Freeform Chat** to start creating!

---

## 📹 Recording Your 2-Minute Demo Video

To record a demo video for your deliverables:
1. **Introduction (15s)**: Show the workspace dashboard, mention it is a responsive single-page application built with Vanilla JS, Vite, and CSS. Open the **API Settings** modal to show the localStorage state configuration.
2. **Concept Explainer (30s)**: Type a concept (e.g. *"Recursion"*), select *"Like I'm 5 (ELI5)"* or *"Technical Expert"*, and hit generate. Scroll through the generated sections (Analogy, Step-by-Step, Use Case).
3. **Interactive Quiz (45s)**: Choose *"Interactive Quiz Generator"*, enter a topic (e.g. *"JavaScript Arrays"*), choose 3 questions, and generate. Click through the multiple-choice questions showing the green/red correct/incorrect states, explanation boxes, and final summary confetti.
4. **Flashcards & Conclusion (30s)**: Choose *"Flashcard Deck Creator"*, create a deck for a language/subject, flip a couple cards using the 3D flip animation, mark a card as Mastered, and show the sidebar history reloading previous runs.
