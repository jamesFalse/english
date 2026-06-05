# English Learning Tools

An AI-powered English toolset built with the T3 Stack, designed to master vocabulary, grammar, and sentence logic. This project combines scientific spaced repetition (FSRS) with cutting-edge AI (Google Gemini or DeepSeek) to provide a contextual and efficient learning experience.

## 🌟 Key Features

### 1. Vocabulary Builder (FSRS)
- **Scientific Spaced Repetition**: Powered by the [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) algorithm to optimize memory retention.
- **AI-Generated Contextual Stories**: Uses **Gemini 3 Flash** to weave your daily vocabulary into engaging stories.
- **Batch Review**: Efficiently rate word recall difficulty (Again, Hard, Good, Easy) after immersion.

### 2. Logic Flow Analyzer
- **Cognitive Parsing**: Deconstructs complex sentences into "Native Speaker" mental chunks.
- **Visual Mapping**: Highlights logic hooks and expectations (Background, Core, Transition, etc.) with color coding and tooltips.

### 3. Grammar Corrector
- **Dual Engine**: 
  - **Online**: Deep analysis using Gemini for grammar, spelling, and style.
  - **Offline**: Instant, local checking via **LanguageTool** integration.
- **Interactive UI**: Split-pane editor with "Issue List", "Live Preview" (high-lighting), and "Statistical Summary".
- **Quick Fix**: One-click text replacement for identified issues.

### 4. Semantic Bridge
- **Concept Translator**: Turns a Chinese fragment, rough idea, or abstract concept into the most natural English word or phrase.
- **Context-Aware Matching**: Uses the target situation, such as casual chat, business, academic writing, or email, to choose a concise expression.
- **Nuance Guidance**: Provides a short explanation and example sentence so the expression is easy to use correctly.

### 5. Security & Privacy
- **Private Access**: Optional `PASSKEY` protection for web deployments.
- **Session Protection**: Automatic session cleanup and anti-brute-force delays.

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **API Layer**: tRPC (End-to-end type safety)
- **Database**: Prisma + PostgreSQL
- **AI**: Google Gemini (via `@google/genai`) or DeepSeek (via `openai`)
- **Offline Engine**: LanguageTool (Local HTTP Server)
- **UI**: Tailwind CSS + shadcn/ui + Radix UI

## 🚀 Getting Started

1. **Setup Environment**:
   Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://..."
   PROVIDER="gemini" # "gemini" or "deepseek"
   GEMINI_API_KEY="your_key"
   DEEPSEEK_API_KEY="your_key"
   RUNNING_ENV="local" # or 'web'
   PASSKEY="your_secure_password" # required if web
   ```

2. **Initialize Database**:
   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```

3. **Launch Tools**:
   - **Basic**: Run `startup.bat`
   - **With Offline Grammar**: Run `startup.bat --lt` (Requires Java & LanguageTool files in root)

## 📖 Deployment

- **Vercel**: Set `RUNNING_ENV="web"` and your `PASSKEY`. The UI will automatically hide offline options and enforce a secure lock screen on the homepage.
