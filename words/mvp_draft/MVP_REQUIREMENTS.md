# MVP Requirement Document: AI-Powered English Reading Tool

## 1. Project Overview
A minimalist web-based English learning tool that generates customized short stories (500-600 words) at a B1 level. The stories are built around a weighted selection of vocabulary from the Oxford 5000 list, specifically targeting B1-C2 levels.

## 2. Core Functional Requirements

### 2.1 Vocabulary Selection Logic
*   **Source:** `oxford_5000_filtered.json`.
*   **Sample Size:** 30 words per session.
*   **Weighted Random Selection:**
    *   **Group A (B1, B2):** 60% weight (approx. 18 words).
    *   **Group B (C1, C2):** 40% weight (approx. 12 words).
*   **Objective:** Ensure the story introduces higher-level vocabulary while maintaining a readable structure.

### 2.2 AI Story Generation (Gemini API)
*   **Input:** The 30 selected words + Level Constraint (B1).
*   **Output:** A cohesive English short story.
*   **Length:** 500 to 600 words.
*   **Prompt Requirements:**
    *   Must use all 30 provided words naturally.
    *   **Highlighting:** The AI must **bold** the 30 target words within the story text.
    *   Grammar and overall sentence structure must align with CEFR B1 level.
    *   Tone: Engaging and narrative.

### 2.3 Post-Generation Verification
*   **Validation Rule:** After the story is generated, the system must cross-reference the story's vocabulary (excluding standard stop words) against the `oxford_5000` master list.
*   **Failure Condition:** If the story contains more than **3 words** that are not present in the Oxford 5000 list (excluding names and basic stop words), the tool must trigger **one** automatic regeneration.
*   **Word Form Normalization:** The validation logic must account for morphological variations (e.g., "abandoned", "abandoning", "abandons" should all be recognized as the target word "abandon").

## 3. Technical Architecture
*   **Frontend:** Single-page HTML5 with Vanilla CSS (Minimalist/Paper-style).
*   **Logic:** JavaScript (ES6+) for:
    *   JSON parsing and weighted sampling.
    *   API calls to Gemini.
    *   Text processing for vocabulary validation.
*   **External Integration:** Google Gemini Pro API.
example for calling api:
```
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

await main();
```

## 4. UI/UX Design (Minimalist)
*   **Header:** Simple title and a "Generate New Story" button.
*   **Sidebar/Top Bar:** Display the 30 "Target Words" selected for the current session (with their CEFR levels).
*   **Main Area:** A clean, wide-margin reading area for the story, where the 30 target words are visually highlighted (bolded).
*   **Feedback:** A loading indicator (e.g., "AI is composing your story...") and a status message if a regeneration was triggered.

## 5. Implementation Strategy

### Phase 1: Data Preparation
*   Load `oxford_5000_filtered.json`.
*   Implement the sampling algorithm with the 60/40 weight distribution.

### Phase 2: API & Story Logic
*   Construct the system prompt for Gemini.
*   Implement the `fetch` call to Gemini API.

### Phase 3: Validation Engine
*   Tokenize the generated story.
*   Filter out stop words and compare against the reference list.
*   Implement lemmatization (e.g., using a library like `compromise` or `natural`) to handle word forms.
*   Implement the retry logic.

### Phase 4: Frontend Delivery
*   Create the "Ready-to-use" HTML file with embedded CSS/JS.
