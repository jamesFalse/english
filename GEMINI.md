# English Learning Tools Workspace

This workspace contains a collection of AI-powered tools designed to assist in English language learning, ranging from sentence structure analysis to vocabulary building and grammar correction.

## Project Overview

The workspace is organized into three main independent sub-projects:

1.  **Analyze (`/analyze`)**: An English Logic Flow Analyzer that helps users understand the "native speaker reading logic" of complex sentences.
2.  **Correction (`/correction`)**: A hybrid grammar checker (Linguist-Mix) combining local rule-based engines (LanguageTool) with deep AI analysis (Gemini).
3.  **Words (`/words/project`)**: A full-stack vocabulary learning application using the T3 Stack, featuring FSRS spaced repetition and AI-generated context stories.

---

## 1. Sentence Logic Analyzer (`/analyze`)

Focuses on deconstructing long and difficult sentences into logical "chunks" to show how a native speaker processes them linearly.

-   **Tech Stack**: Python (Flask), Gemini API (`gemini-3-flash-preview`), Tailwind CSS.
-   **Key Features**:
    -   Linear reading path visualization.
    -   Mental notes for each sentence chunk (expectations/reactions).
    -   Color-coded logic tags (Core, Context, Modifier, Transition, etc.).
-   **Running**:
    -   Navigate to `/analyze`.
    -   Run `start.bat` to create a venv, install dependencies, and start the server.
    -   Access via: `http://127.0.0.1:5001`
-   **Configuration**: Requires a Gemini API key in `app.py`.

## 2. Grammar Corrector - Linguist-Mix (`/correction`)

A lightweight, privacy-conscious grammar correction tool with two modes.

-   **Tech Stack**: Python (Flask), `language-tool-python`, Gemini API, Vanilla JS, Tailwind CSS.
-   **Key Features**:
    -   **Local Mode**: Fast, offline check using LanguageTool.
    -   **AI Mode**: Deep, intelligent correction using Gemini.
    -   Real-time highlighting of errors with suggested replacements.
-   **Running**:
    -   Navigate to `/correction`.
    -   Run `start.bat` (calls `run.py`).
    -   Access via: `http://127.0.0.1:5000`
-   **Configuration**: Requires Gemini API setup for AI mode.

## 3. Vocabulary Builder (`/words/project`)

An advanced flashcard and story generation app for mastering English vocabulary.

-   **Tech Stack**: Next.js (App Router), TypeScript, Prisma (PostgreSQL), tRPC, Tailwind CSS, `ts-fsrs`.
-   **Key Features**:
    -   **FSRS Scheduling**: Scientific spaced repetition for efficient memory.
    -   **AI Stories**: Generates immersive stories using Gemini based on selected words to provide context.
    -   **CEFR Leveling**: Words are categorized by difficulty (A1-C2).
    -   **TTS**: Integrated Text-to-Speech for pronunciation.
-   **Running**:
    -   Navigate to `/words/project`.
    -   Ensure a PostgreSQL database is running and configured in `.env`.
    -   Run `启动项目.bat` to install dependencies and start the development server.
    -   Access via: `http://localhost:3000`
-   **Database**:
    -   Seed data: `npx prisma db seed` (uses data from `data/oxford_5000_filtered.json`).

---

## Development Conventions

-   **AI Integration**: All tools utilize the Gemini API for advanced linguistic tasks. Structured JSON responses are preferred for UI rendering.
-   **Styling**: Consistent use of Tailwind CSS across all projects (via CDN for Flask projects, native for Next.js).
-   **Environment**: Most projects include `.bat` scripts for easy setup and execution on Windows environments.
-   **Language**: Interfaces and documentation are primarily in Chinese, while the core subject matter is English.

## Directory Structure

```text
.
├── analyze/          # Flask app for sentence logic analysis
├── correction/       # Flask app for grammar correction
├── words/
│   ├── mvp_draft/    # Early prototypes and scripts
│   └── project/      # Main Next.js vocabulary application
└── LICENSE
```
