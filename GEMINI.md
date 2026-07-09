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

- **Frontend**: Next.js 15 (App Router) for high-performance React rendering.
- **Backend**: tRPC for type-safe communication between the client and the database.
- **ORM**: Prisma with PostgreSQL, utilizing a scientifically-optimized `Word` model.
- **AI**: Google Gemini (Default: **gemini-3.1-flash-lite**) or DeepSeek (Default: **deepseek-v4-flash**) via the central `callProvider` utility, selected by `PROVIDER`.
- **Offline Engine**: Local LanguageTool HTTP server (port 8081).
- **Security**: Tiered protection via tRPC Middleware and Global `AuthGuard`.

---

## 📅 Development Roadmap & Status

## [x] Task 1: T3 Stack Setup & Database Modeling

- Initialized Project with Next.js, Prisma, Tailwind, tRPC.
- Defined the `Word` model with FSRS fields.

## [x] Task 2: Data Seeding

- Processed Oxford 5000 vocabulary data into the database.

## [x] Task 3: The tRPC Router & FSRS Selection Logic

- Implemented complex selection logic: prioritizing due words + oversampling new words.

## [x] Task 4: UI & TTS (Frontend)

- Built interactive word selection, display components, and native TTS.

## [x] Task 5: Gemini Story Generation

- Implemented `generateStory` mutation with CEFR level enforcement.

## [x] Task 6: Progress Tracking (FSRS Review)

- Connected frontend ratings to the `ts-fsrs` algorithm.

## [x] Task 8: Grammar Correction Tool

- [x] **8.1: Unified Analysis Router (tRPC)**: Design `grammar.ts` with support for online/offline modes.
- [x] **8.2: Split-Pane UI Implementation**: Editor (Left) and Results (Right: List, Preview, Summary).
- [x] **8.3: Online Engine (Gemini 3)**: Deep contextual analysis and "Quick Fix" suggestions.
- [x] **8.4: Offline Engine (Local)**: High-performance checking via LanguageTool integration.
- [x] **8.5: Interactive Highlights**: Render clickable highlights with Tooltips and text replacement.
- [x] **8.6: Error Analytics**: Dedicated summary tab with visual metrics.

## [x] Task 9: Unified Architecture & Security Layer

- [x] **9.1: Centralized AI Utility**: Created `src/server/lib/provider.ts` using `@google/genai` and `openai` for provider switching.
- [x] **9.2: Global Auth Guard**: Implemented `AuthGuard` to protect all routes in web mode.
- [x] **9.3: PASSKEY Protocol**: Server-side tRPC middleware with "Punitive Delay" (2s) for failed attempts.
- [x] **9.4: Environment Awareness**: Automatic UI adaptation for `local` vs. `web` environments.

## [x] Task 10: AI Contextual Assistance & UX Optimization

- [x] **10.1: Contextual Explanation Engine**: Added `explainContext` tRPC procedure using Gemini 3 for in-story word/phrase analysis.
- [x] **10.2: Interactive "Explain" UI**: Integrated AI explanation buttons into word cards and floating story menus.
- [x] **10.3: Selection-Based Analysis**: Implemented phrase selection in stories to trigger on-demand AI definitions for arbitrary text.
- [x] **10.4: Desktop-Grade Layout**: Optimized UI with pinned control panels, split-pane independent scrolling, and 1600px wide-screen support.

## [ ] Task 7: Advanced Analytics & Dashboard (Planned)

- [ ] Visualization of learning progress (Retention rate, Stability growth).
- [ ] Heatmap of daily study sessions.

---
