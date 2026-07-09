import { WordSelection } from "~/app/_components/word-selection";
import { HydrateClient } from "~/trpc/server";
import Link from "next/link";

export default async function WordsPage() {
  return (
    <HydrateClient>
      <main className="flex min-h-dvh flex-col overflow-y-auto bg-background text-foreground lg:h-screen lg:overflow-hidden">
        <header className="mx-auto flex w-full max-w-7xl flex-shrink-0 items-center justify-between gap-3 px-3 py-4 sm:px-4 sm:py-6">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-center text-xl font-extrabold tracking-tight text-primary sm:text-4xl">
            AI Vocabulary <span className="text-blue-600">Learning</span>
          </h1>
          <Link href="/words/triage" className="text-xs font-bold px-3 py-1.5 bg-muted rounded-full hover:bg-muted/80 transition-colors">
            Vocabulary Triage
          </Link>
        </header>
        
        <div className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-6 sm:px-4 lg:overflow-hidden">
          <WordSelection />
        </div>
      </main>
    </HydrateClient>
  );
}
