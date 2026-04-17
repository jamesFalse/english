# Project Gemini: English Learning Tools

## 🎯 Business Objective
The goal is to revolutionize English vocabulary acquisition by replacing rote memorization with **Contextual Immersion**. By leveraging the **FSRS (Free Spaced Repetition Scheduler)** algorithm, the app identifies exactly when a word is about to be forgotten. Instead of isolated flashcards, it uses **Google Gemini AI** to weave these specific words into a coherent, level-appropriate story, ensuring the user learns how words function in real-world scenarios.

## 🧠 Core Business Logic: The "Immersion Cycle"
1.  **Retention Analysis**: The system scans the database for "Due" words (stability-based calculation via FSRS).
2.  **Personalized Scaffolding**: Users choose their learning target (e.g., 50% familiar review, 50% new challenges from CEFR B2 level).
3.  **Contextual Synthesis**: Gemini AI generates a story using the exact 30-word set, wrapping target terms in `<mark>` tags for focus.
4.  **Multi-Modal Reinforcement**: Users listen to pronunciations (TTS), read the story, and then perform a **Batch Review** where they rate their recall difficulty.
5.  **Memory Update**: Ratings are fed back into the FSRS algorithm, shifting the next review date scientifically.

## 🏗 Architectural Overview
-   **Frontend**: Next.js 15 (App Router) for high-performance React rendering.
-   **Backend**: tRPC for type-safe communication between the client and the database.
-   **ORM**: Prisma with PostgreSQL, utilizing a scientifically-optimized `Word` model.
-   **AI**: Google Gemini Pro/Flash via the Generative AI SDK.
-   **Logic**: `ts-fsrs` for memory scheduling logic.

---

## 📅 Development Roadmap & Status

## [x] Task 1: T3 Stack Setup & Database Modeling
-   Initialized Project with Next.js, Prisma, Tailwind, tRPC.
-   Defined the `Word` model with FSRS fields (`stability`, `difficulty`, `state`, etc.).
-   Set up PostgreSQL migration.

## [x] Task 2: Data Seeding
-   Implemented a robust seed script in `prisma/seed.ts`.
-   Processed Oxford 5000 vocabulary data into the database.
-   Handled de-duplication and CEFR level mapping.

## [x] Task 3: The tRPC Router & FSRS Selection Logic
-   Created `generateSelection` procedure in `word.ts`.
-   Implemented complex selection logic: prioritizing due words + oversampling new words with first-letter diversity filtering.

## [x] Task 4: UI & TTS (Frontend)
-   Built interactive word selection and display components.
-   Added CEFR-based color coding.
-   Integrated Web Speech API for native TTS support.

## [x] Task 5: Gemini Story Generation
-   Implemented `generateStory` mutation using Gemini 1.5.
-   Engineered prompts to enforce CEFR levels, word usage, and `<mark>` tag wrapping.

## [x] Task 6: Progress Tracking (FSRS Review)
-   Implemented `submitReview` and `submitBatchReview` mutations.
-   Connected frontend ratings to the `ts-fsrs` algorithm for database updates.

## [ ] Task 7: Advanced Analytics & Dashboard
-   [ ] Visualization of learning progress (Retention rate, Stability growth).
-   [ ] Heatmap of daily study sessions.
-   [ ] CEFR level progression tracking.
