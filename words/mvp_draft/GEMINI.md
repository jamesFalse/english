## Role

You are an expert full-stack developer specializing in the T3 Stack (Next.js, Prisma, tRPC, TypeScript, Tailwind). You have deep knowledge of the FSRS memory algorithm and Gemini API integration.
Project Overview

Build an AI-powered English vocabulary learning app. Use tRPC for type-safe API calls, Prisma for PostgreSQL management, and ts-fsrs for spaced repetition. The core feature is generating stories via Gemini based on words selected by the FSRS scheduler.
Execution Tasks
## Task 1: T3 Stack Setup & Database Modeling

    Initialize Project: Run npx create-t3-app@latest.

        Options: App Router (Yes), Prisma (Yes), Tailwind (Yes), tRPC (Yes), NextAuth (No - unless you want login).

    Environment: Configure DATABASE_URL in .env to point to your local PostgreSQL.

    Prisma Schema: Replace the default Post model in prisma/schema.prisma with the following Word model:

### Code snippet

model Word {
  id             Int       @id @default(autoincrement())
  text           String    @unique
  cefr           String    // A1, A2, B1, B2, C1, C2
  
  // FSRS fields
  due            DateTime? 
  stability      Float     @default(0)
  difficulty     Float     @default(0)
  elapsed_days   Int       @default(0)
  scheduled_days Int       @default(0)
  reps           Int       @default(0)
  lapses         Int       @default(0)
  state          Int       @default(0) // 0:New, 1:Learning, 2:Review, 3:Relearning
  last_review    DateTime?
}

    Migration: Run npx prisma migrate dev --name init_word_model to sync with your database.

## Task 2: Data Seeding (JSON to PostgreSQL)

    Source File: Place your seed.json in a data/ folder (Format: [{"word": "able", "cefr": "A2"}, ...]).

    Seed Script: Edit prisma/seed.ts to read this file and use db.word.upsert to populate the database.

    Execution: Run npx prisma db seed to perform the migration.

## Task 3: The tRPC Router & FSRS Selection Logic

    Create Router: In src/server/api/routers/word.ts, define a generateSelection procedure.

    Input Schema: Accept basic, independent, and proficient percentage numbers via Zod.

    Selection Logic:

        Query Due Words (due <= now, state > 0).

        Calculate the gap to reach 30 words.

        Query New Words (state = 0) based on the CEFR percentage quotas.

    Return: A shuffled array of 30 Word objects.

## Task 4: UI & TTS (Frontend)

    Components: Use shadcn/ui components (Input, Select, Button, Tooltip, Card).

    Word Display: Render the 30 words with CEFR-based colors:

        text-green-500 (A1/A2), text-blue-500 (B1/B2), text-purple-500 (C1/C2).

    TTS Support: Add a "Play" icon using the browser's native Web Speech API:
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(word.text));

## Task 5: Gemini Story Generation

    Gemini Integration: In a tRPC mutation generateStory, use the Gemini API to write a story.

    Prompt Engineering: Pass the 30 words and difficulty. Require AI to wrap target words in <mark> tags.

    Streaming: (Optional) Use Vercel AI SDK to stream the story content for a better UX.

## Task 6: Progress Tracking (FSRS Review)

    Evaluation Panel: For each word, display buttons for Again, Hard, Good, Easy.

    tRPC Mutation: Create submitReview.

    Logic: Use ts-fsrs to calculate the updated stability/difficulty/due date based on the user's rating.

    Database Update: Update the Word record with the new FSRS metrics.