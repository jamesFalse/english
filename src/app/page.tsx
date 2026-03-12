import { WordSelection } from "~/app/_components/word-selection";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center bg-background text-foreground py-12 px-4">
        <div className="container flex flex-col items-center justify-center gap-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-primary">
            AI Vocabulary <span className="text-blue-600">Learning</span>
          </h1>
          
          <WordSelection />
        </div>
      </main>
    </HydrateClient>
  );
}
