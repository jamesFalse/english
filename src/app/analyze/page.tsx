"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Loader2, BookOpen, Map, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm font-medium text-blue-600 hover:underline">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Logic Flow Analyzer</h1>
            <p className="font-medium text-slate-500">Native Speaker Reading Path Debugger</p>
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
            <Card className="border-slate-200 p-6 shadow-sm">
              <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-700">
                Input Complex Text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-80 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 leading-relaxed text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500"
                placeholder="Paste long or difficult sentences here..."
              ></textarea>
              <Button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !text.trim()}
                className="mt-6 w-full rounded-xl bg-slate-900 py-6 text-lg font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-[0.98]"
              >
                {analyzeMutation.isPending ? "Analyzing..." : "Analyze Logic Flow"}
              </Button>
            </Card>
          </section>

          {/* Right: Results */}
          <section className="lg:col-span-7">
            {result ? (
              <Card className="flex h-[calc(100vh-200px)] flex-col border-slate-200 shadow-sm overflow-hidden">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-100 px-6">
                  <button
                    onClick={() => setActiveTab("flow")}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === "flow" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <BookOpen className="h-4 w-4" /> Logic Flow
                  </button>
                  <button
                    onClick={() => setActiveTab("map")}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === "map" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Map className="h-4 w-4" /> Visual Map
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto p-6">
                  {activeTab === "flow" ? (
                    <div className="space-y-12">
                      {result.sentences.map((s, sIdx) => (
                        <div key={sIdx} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                              {s.difficulty}
                            </span>
                            <h3 className="text-sm font-bold uppercase tracking-tighter text-slate-400">
                              Sentence #{sIdx + 1}
                            </h3>
                          </div>
                          <div className="rounded-xl bg-slate-900 p-4 text-sm font-medium italic text-slate-100">
                            "{s.logic_summary}"
                          </div>

                          <div className="relative ml-2 border-l-2 border-slate-100 pl-6 space-y-8">
                            {s.chunks.map((chunk, cIdx) => (
                              <div key={cIdx} className="group relative">
                                <div className="absolute -left-[31px] top-2 h-4 w-4 rounded-full border-4 border-slate-200 bg-white transition-colors group-hover:border-blue-500"></div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                    {chunk.logic_tag}
                                  </span>
                                  <p className={`text-lg font-semibold ${chunk.color_class}`}>
                                    {chunk.text}
                                  </p>
                                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                    <span className="mr-1 font-bold text-slate-300 uppercase">Expectation:</span>{" "}
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
                      {result.sentences.map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className="relative rounded-2xl border border-slate-100 bg-slate-50 p-6"
                        >
                          <div className="text-xl leading-relaxed">
                            <TooltipProvider>
                              {s.chunks.map((chunk, cIdx) => (
                                <Tooltip key={cIdx}>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={`inline px-1 rounded cursor-help transition-all hover:bg-white hover:shadow-sm ${chunk.color_class}`}
                                    >
                                      {chunk.text}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs bg-slate-900 text-white border-none p-3 shadow-xl">
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
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-100/50 p-12">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                  <Map className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-medium text-slate-400">Awaiting input for cognitive analysis...</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
