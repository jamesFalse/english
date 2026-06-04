"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Loader2, ArrowRight, Sparkles, MessageSquare, Briefcase, GraduationCap, Mail, Info, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "~/lib/utils";

const PRESET_CONTEXTS = [
  { label: "Casual", value: "Casual Conversation", icon: MessageSquare },
  { label: "Business", value: "Business Meeting", icon: Briefcase },
  { label: "Academic", value: "Academic Writing", icon: GraduationCap },
  { label: "Email", value: "Official Email", icon: Mail },
];

export default function BridgePage() {
  const [context, setContext] = useState("");
  const [concept, setConcept] = useState("");
  const [result, setResult] = useState<{
    found: boolean;
    expression: string;
    type: "word" | "phrase" | "none";
    explanation: string;
    example: string;
  } | null>(null);

  const bridgeMutation = api.bridge.bridge.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      alert("Bridge failed: " + error.message);
    },
  });

  const handleBridge = () => {
    if (!concept.trim()) return;
    bridgeMutation.mutate({ context: context || "General", concept });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <header className="mb-12">
          <Link href="/" className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Semantic Bridge</h1>
          <p className="mt-2 text-lg font-medium text-slate-500">Find the perfect English expression for any concept.</p>
        </header>

        <main className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left: Inputs */}
          <section className="space-y-8">
            <Card className="border-slate-200 p-8 shadow-sm">
              <div className="space-y-6">
                {/* Context Input */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    1. Context (Where will you say this?)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_CONTEXTS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setContext(preset.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold transition-all",
                          context === preset.value
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <preset.icon className="h-3 w-3" />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Or type custom context (e.g., Texting a crush...)"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="h-12 border-slate-200 bg-slate-50/50 px-4 focus:bg-white"
                  />
                </div>

                {/* Concept Input */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    2. Concept (What do you want to express?)
                  </label>
                  <textarea
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="e.g., 想表达那种虽然很累但是心情很好的状态"
                    className="h-40 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-lg leading-relaxed outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                <Button
                  onClick={handleBridge}
                  disabled={bridgeMutation.isPending || !concept.trim()}
                  className="h-14 w-full rounded-xl bg-slate-900 text-lg font-bold text-white shadow-xl transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                >
                  {bridgeMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" /> Bridging...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Build Bridge <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </div>
            </Card>
          </section>

          {/* Right: Output */}
          <section className="flex flex-col">
            {result ? (
              <div className="flex-grow">
                {result.found ? (
                  <Card className="relative overflow-hidden border-none bg-white p-10 shadow-2xl ring-1 ring-slate-200">
                    {/* Decorative Background */}
                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-50 opacity-50 blur-3xl"></div>
                    <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-indigo-50 opacity-50 blur-3xl"></div>

                    <div className="relative space-y-8">
                      <div className="space-y-2">
                        <span className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                          {result.type} Found
                        </span>
                        <h2 className="text-5xl font-black tracking-tight text-slate-900 lg:text-6xl">
                          {result.expression}
                        </h2>
                      </div>

                      <div className="space-y-6 border-l-4 border-blue-500 pl-6">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <Info className="h-3 w-3" /> Nuance
                          </p>
                          <p className="text-xl font-medium leading-snug text-slate-700">
                            {result.explanation}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <Sparkles className="h-3 w-3" /> In Action
                          </p>
                          <p className="text-lg italic text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            &quot;{result.example}&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="flex h-full flex-col items-center justify-center border-dashed border-slate-200 p-12 text-center bg-slate-50/30">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                      <AlertCircle className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">No Bridge Found</h3>
                    <p className="mt-2 max-w-xs text-slate-500">
                      I couldn&apos;t find a concise expression that fits this exact concept in the given context. Try broadening your description.
                    </p>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-100/30 p-12 text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                  <Sparkles className="h-10 w-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-400">Awaiting your thoughts</h3>
                <p className="mt-2 max-w-xs text-sm text-slate-400">
                  Describe the concept on the left, and I will bridge it to the most natural English expression.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
