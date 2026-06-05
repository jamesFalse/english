"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Loader2, BookOpen, Map } from "lucide-react";
import Link from "next/link";

interface Chunk {
  text: string;
  mental_note: string;
  logic_tag: string;
  color_class: string;
}

interface Sentence {
  original: string;
  difficulty: string;
  logic_summary: string;
  chunks: Chunk[];
}

interface AnalysisResult {
  sentences: Sentence[];
}

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [activeTab, setActiveTab] = useState<"flow" | "map">("flow");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeMutation = api.analyze.analyzeText.useMutation({
    onSuccess: (data) => {
      setResult(data as AnalysisResult);
    },
    onError: (error) => {
      alert("Analysis failed: " + error.message);
    },
  });

  const handleAnalyze = () => {
    if (!text.trim()) return;
    analyzeMutation.mutate({ text });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm font-medium text-blue-600 hover:underline">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Logic Flow Analyzer</h1>
            <p className="font-medium text-muted-foreground">Native Speaker Reading Path Debugger</p>
          </div>
          {analyzeMutation.isPending && (
            <div className="flex animate-pulse items-center gap-2 font-semibold text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing Logic...
            </div>
          )}
        </header>

        <main className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: Input */}
          <section className="space-y-4 lg:col-span-5">
            <Card className="border-border p-6 shadow-sm">
              <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Input Complex Text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-80 w-full resize-none rounded-xl border border-input bg-input/30 p-4 leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-blue-500"
                placeholder="Paste long or difficult sentences here..."
              ></textarea>
              <Button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !text.trim()}
                className="mt-6 w-full rounded-xl py-6 text-lg font-bold shadow-lg transition-all active:scale-[0.98]"
              >
                {analyzeMutation.isPending ? "Analyzing..." : "Analyze Logic Flow"}
              </Button>
            </Card>
          </section>

          {/* Right: Results */}
          <section className="lg:col-span-7">
            {result ? (
              <Card className="flex h-[calc(100vh-200px)] flex-col overflow-hidden border-border shadow-sm">
                {/* Tabs Header */}
                <div className="flex border-b border-border px-6">
                  <button
                    onClick={() => setActiveTab("flow")}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === "flow" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen className="h-4 w-4" /> Logic Flow
                  </button>
                  <button
                    onClick={() => setActiveTab("map")}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === "map" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Map className="h-4 w-4" /> Visual Map
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto p-6">
                  {activeTab === "flow" ? (
                    <div className="space-y-12">
                      {result?.sentences?.map((s, sIdx) => (
                        <div key={sIdx} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                              {s.difficulty}
                            </span>
                            <h3 className="text-sm font-bold uppercase tracking-tighter text-muted-foreground">
                              Sentence #{sIdx + 1}
                            </h3>
                          </div>
                          <div className="rounded-xl bg-background p-4 text-sm font-medium italic text-foreground">
                            &quot;{s.logic_summary}&quot;
                          </div>

                          <div className="relative ml-2 space-y-8 border-l-2 border-border pl-6">
                            {s.chunks?.map((chunk, cIdx) => (
                              <div key={cIdx} className="group relative">
                                <div className="absolute -left-[31px] top-2 h-4 w-4 rounded-full border-4 border-muted bg-background transition-colors group-hover:border-blue-500"></div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                    {chunk.logic_tag}
                                  </span>
                                  <p className={`text-lg font-semibold ${chunk.color_class}`}>
                                    {chunk.text}
                                  </p>
                                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    <span className="mr-1 font-bold text-foreground/60 uppercase">Expectation:</span>{" "}
                                    {chunk.mental_note}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {result?.sentences?.map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className="relative rounded-2xl border border-border bg-muted/30 p-6"
                        >
                          <div className="text-xl leading-relaxed">
                            <TooltipProvider>
                              {s.chunks?.map((chunk, cIdx) => (
                                <Tooltip key={cIdx}>
                                  <TooltipTrigger>
                                    <span
                                      className={`inline cursor-help rounded px-1 transition-all hover:bg-background hover:shadow-sm ${chunk.color_class}`}
                                    >
                                      {chunk.text}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs border-none bg-popover p-3 text-popover-foreground shadow-xl">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                        {chunk.logic_tag}
                                      </p>
                                      <p className="text-sm leading-relaxed">{chunk.mental_note}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Map className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">Awaiting input for cognitive analysis...</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
