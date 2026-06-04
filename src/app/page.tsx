"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, BrainCircuit, ChevronRight, Sparkles, Lock, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

export default function Home() {
  const [isLocked, setIsLocked] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const { data: settings, isLoading } = api.grammar.getSettings.useQuery();
  
  const verifyMutation = api.grammar.verifyPasskey.useMutation({
    onSuccess: (isValid) => {
      if (isValid) {
        window.sessionStorage.setItem("english-learning-passkey", passkeyInput);
        window.location.reload(); 
      } else {
        setErrorMessage("Invalid Passkey. Please try again.");
      }
    },
    onError: (error) => {
      setErrorMessage(error.message || "Verification failed. Please try again.");
    }
  });

  useEffect(() => {
    if (settings?.runningEnv === "web") {
      const savedKey = window.sessionStorage.getItem("english-learning-passkey");
      if (!savedKey) {
        setIsLocked(true);
      }
    }
  }, [settings]);

  const handleUnlock = () => {
    const trimmedKey = passkeyInput.trim();
    if (!trimmedKey) {
      setErrorMessage("Passkey cannot be empty.");
      return;
    }
    
    setErrorMessage("");
    verifyMutation.mutate({ passkey: trimmedKey });
  };

  if (isLoading) return null;

  if (isLocked) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
        
        <Card className="relative z-10 w-full max-w-md border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600/20 text-blue-500 shadow-inner">
              <Lock className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Private Access</h1>
            <p className="mt-2 text-slate-400">Secure entry required for English Learning Tools.</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Input
                type="password"
                placeholder="Enter Passkey..."
                value={passkeyInput}
                onChange={(e) => {
                  setPasskeyInput(e.target.value);
                  setErrorMessage("");
                }}
                onKeyDown={(e) => e.key === "Enter" && !verifyMutation.isPending && handleUnlock()}
                className={`h-14 border-slate-700 bg-slate-800/50 pl-12 text-lg text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 ${errorMessage ? 'border-red-500/50 focus:border-red-500' : ''}`}
                disabled={verifyMutation.isPending}
              />
              <ShieldCheck className="absolute left-4 top-4 h-6 w-6 text-slate-500" />
            </div>

            <Button 
              onClick={handleUnlock}
              disabled={verifyMutation.isPending || !passkeyInput.trim()}
              className="group h-14 w-full bg-blue-600 text-lg font-bold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {verifyMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Verifying...
                </div>
              ) : (
                <div className="flex items-center">
                  Unlock Workspace
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>
            
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm font-medium text-red-400 border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMessage}
              </div>
            )}
          </div>
        </Card>
        
        <footer className="absolute bottom-8 text-slate-600 text-xs uppercase tracking-widest font-bold">
          English Tools Security Protocol
        </footer>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 py-20">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          English <span className="text-blue-600">Learning</span> Tools
        </h1>
        <p className="text-xl text-slate-500">
          AI-powered tools to master English vocabulary, logic, and grammar.
        </p>
      </div>

      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Vocabulary Tool */}
        <Link href="/words" className="group">
          <Card className="flex h-full flex-col p-8 transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-blue-500/50">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <BookOpen className="h-8 w-8" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Vocabulary Builder</h2>
            <p className="mb-6 flex-grow text-slate-500 leading-relaxed text-sm">
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
            <p className="mb-6 flex-grow text-slate-500 leading-relaxed text-sm">
              Deconstruct complex sentences to understand how native speakers process logic linearly.
            </p>
            <div className="flex items-center font-bold text-purple-600">
              Analyze Now <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        {/* Grammar Tool */}
        <Link href="/grammar" className="group">
          <Card className="flex h-full flex-col p-8 transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-emerald-500/50">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Grammar Corrector</h2>
            <p className="mb-6 flex-grow text-slate-500 leading-relaxed text-sm">
              Polish your writing with instant grammar, spelling, and style suggestions (Online/Offline).
            </p>
            <div className="flex items-center font-bold text-emerald-600">
              Correct Writing <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        {/* Semantic Bridge */}
        <Link href="/bridge" className="group">
          <Card className="flex h-full flex-col p-8 transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-orange-500/50">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
              <ArrowRight className="h-8 w-8" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Semantic Bridge</h2>
            <p className="mb-6 flex-grow text-slate-500 leading-relaxed text-sm">
              Bridge the gap between your thoughts and the most precise, concise English expressions.
            </p>
            <div className="flex items-center font-bold text-orange-600">
              Build Bridge <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
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
