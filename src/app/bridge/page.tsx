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
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <header className="mb-12">
          <Link href="/" className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Semantic Bridge</h1>
          <p className="mt-2 text-lg font-medium text-muted-foreground">Find the perfect English expression for any concept.</p>
        </header>

        <main className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left: Inputs */}
          <section className="space-y-8">
            <Card className="border-border p-8 shadow-sm">
              <div className="space-y-6">
                {/* Context Input */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
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
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                            : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted"
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
                    className="h-12 border-input bg-input/30 px-4 focus:bg-background"
                  />
                </div>

                {/* Concept Input */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    2. Concept (What do you want to express?)
                  </label>
                  <textarea
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="e.g., 想表达那种虽然很累但是心情很好的状态"
                    className="h-40 w-full resize-none rounded-xl border border-input bg-input/30 p-4 text-lg leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                <Button
                  onClick={handleBridge}
                  disabled={bridgeMutation.isPending || !concept.trim()}
                  className="h-14 w-full rounded-xl text-lg font-bold shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
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
                  <Card className="relative overflow-hidden border-none bg-card p-10 shadow-2xl shadow-blue-950/20 ring-1 ring-border">
                    <div className="relative space-y-8">
                      <div className="space-y-2">
                        <span className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                          {result.type} Found
                        </span>
                        <h2 className="text-5xl font-black tracking-tight text-foreground lg:text-6xl">
                          {result.expression}
                        </h2>
                      </div>

                      <div className="space-y-6 border-l-4 border-blue-500 pl-6">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <Info className="h-3 w-3" /> Nuance
                          </p>
                          <p className="text-xl font-medium leading-snug text-foreground/85">
                            {result.explanation}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <Sparkles className="h-3 w-3" /> In Action
                          </p>
                          <p className="rounded-lg border border-border bg-muted/30 p-4 text-lg italic text-foreground/80">
                            &quot;{result.example}&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="flex h-full flex-col items-center justify-center border-dashed border-border bg-muted/20 p-12 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">No Bridge Found</h3>
                    <p className="mt-2 max-w-xs text-muted-foreground">
                      I couldn&apos;t find a concise expression that fits this exact concept in the given context. Try broadening your description.
                    </p>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/20 p-12 text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border">
                  <Sparkles className="h-10 w-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-muted-foreground">Awaiting your thoughts</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
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
