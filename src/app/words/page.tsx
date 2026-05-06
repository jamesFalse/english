import { WordSelection } from "~/app/_components/word-selection";
import { HydrateClient } from "~/trpc/server";
import Link from "next/link";

export default async function WordsPage() {
  return (
    <HydrateClient>
      <main className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <header className="py-6 px-4 flex-shrink-0 flex items-center justify-between max-w-7xl mx-auto w-full">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl text-primary">
            AI Vocabulary <span className="text-blue-600">Learning</span>
          </h1>
          <Link href="/words/triage" className="text-xs font-bold px-3 py-1.5 bg-muted rounded-full hover:bg-muted/80 transition-colors">
            Vocabulary Triage
          </Link>
        </header>
        
        <div className="flex-1 overflow-hidden px-4 pb-6 w-full max-w-7xl mx-auto">
          <WordSelection />
        </div>
      </main>
    </HydrateClient>
  );
}
