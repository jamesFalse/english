# English Learning Tools

An AI-powered English vocabulary learning application built with the T3 Stack. This project combines scientific spaced repetition (FSRS) with modern AI (Google Gemini) to provide a contextual and efficient learning experience.

## 🌟 Key Features

- **Scientific Spaced Repetition**: Powered by the [FSRS (Free Spaced Repetition Scheduler)](https://github.com/open-spaced-repetition/ts-fsrs) algorithm to optimize memory retention.
- **AI-Generated Contextual Stories**: Uses **Google Gemini 1.5 Flash** to generate engaging short stories containing your daily vocabulary, helping you understand words in context.
- **Smart Vocabulary Selection**: Dynamically selects words based on:
  - **Due Words**: Words identified by FSRS as needing review.
  - **New Words**: Selected by CEFR levels (A1-C2) based on user-defined proportions.
- **Interactive Learning Interface**:
  - **TTS (Text-to-Speech)**: Native browser support for listening to word pronunciations.
  - **Visual Cues**: CEFR-based color coding (A1/A2: Green, B1/B2: Blue, C1/C2: Purple).
  - **Batch Review**: Efficiently rate multiple words after reading the AI story.
- **Modern Tech Stack**: Full-stack type safety with Next.js, tRPC, Prisma, and Tailwind CSS.

## 🛠 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org)
- **API Layer**: [tRPC](https://trpc.io) (End-to-end type safety)
- **Database**: [Prisma](https://prisma.io) with PostgreSQL
- **AI Integration**: [Google Generative AI SDK](https://github.com/google/generative-ai-js)
- **Memory Algorithm**: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)

## 🚀 Getting Started

1. **Clone the repo**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Setup Environment Variables**:
   Create a `.env` file with the following:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   GEMINI_API_KEY="your_google_gemini_api_key"
   ```
4. **Database Setup**:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
5. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Or use the provided shortcut: `启动项目.bat`

## 📖 How it Works

1. **Selection**: Choose your desired difficulty mix (e.g., 40% Basic, 40% Independent, 20% Proficient).
2. **Generation**: The system fetches 30 words (prioritizing due reviews).
3. **Reading**: Gemini generates a story using all selected words, highlighting them with `<mark>` tags.
4. **Review**: Rate each word (Again, Hard, Good, Easy) to update its FSRS state for the next session.
