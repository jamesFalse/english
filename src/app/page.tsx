import Link from "next/link";
import { BookOpen, BrainCircuit, ChevronRight } from "lucide-react";
import { Card } from "~/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          English <span className="text-blue-600">Learning</span> Tools
        </h1>
        <p className="text-xl text-slate-500">
          AI-powered tools to master English vocabulary and logic.
        </p>
      </div>

      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-2">
        {/* Vocabulary Tool */}
        <Link href="/words" className="group">
          <Card className="flex h-full flex-col p-8 transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-blue-500/50">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <BookOpen className="h-8 w-8" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Vocabulary Builder</h2>
            <p className="mb-6 flex-grow text-slate-500 leading-relaxed">
              Master 5000+ Oxford words with scientific FSRS spaced repetition and AI-generated context stories.
            </p>
            <div className="flex items-center font-bold text-blue-600">
              Start Learning <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        {/* Analyze Tool */}
        <Link href="/analyze" className="group">
          <Card className="flex h-full flex-col p-8 transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-purple-500/50">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
              <BrainCircuit className="h-8 w-8" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Logic Flow Analyzer</h2>
            <p className="mb-6 flex-grow text-slate-500 leading-relaxed">
              Deconstruct complex sentences to understand how native speakers process logic linearly.
            </p>
            <div className="flex items-center font-bold text-purple-600">
              Analyze Now <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>
      </div>

      <footer className="mt-16 text-slate-400 text-sm">
        Built with T3 Stack & Gemini AI
      </footer>
    </main>
  );
}
