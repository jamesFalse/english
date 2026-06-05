"use client";

import { useState, type KeyboardEvent } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Loader2, List, Eye, CheckCircle2, AlertCircle, Sparkles, Zap, BarChart3 } from "lucide-react";
import Link from "next/link";
import { type GrammarCheckResult, type GrammarIssue } from "~/server/api/routers/grammar";

export default function GrammarPage() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"online" | "offline">("online");
  const [activeTab, setActiveTab] = useState<"list" | "preview" | "summary">("list");
  const [result, setResult] = useState<GrammarCheckResult | null>(null);

  const { data: settings } = api.grammar.getSettings.useQuery();

  const checkMutation = api.grammar.check.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setActiveTab("list");
    },
    onError: (error) => {
      alert("Check failed: " + error.message);
    },
  });

  const handleCheck = () => {
    if (!text.trim()) return;
    checkMutation.mutate({ text, mode });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleCheck();
    }
  };

  const applyFix = (issue: GrammarIssue) => {
    if (!issue.replacement || !result) return;
    
    const newText = 
      text.slice(0, issue.offset) + 
      issue.replacement + 
      text.slice(issue.offset + issue.length);
    
    setText(newText);
    
    // Update local result to remove fixed issue and update offsets
    const shift = issue.replacement.length - issue.length;
    const newIssues = result.issues
      .filter((i) => i.id !== issue.id)
      .map((i) => {
        if (i.offset > issue.offset) {
          return { ...i, offset: i.offset + shift };
        }
        return i;
      });
    
    setResult({
      ...result,
      text: newText,
      issues: newIssues,
      stats: {
        ...result.stats,
        total: result.stats.total - 1,
        [issue.type]: result.stats[issue.type] - 1,
      }
    });
  };

  const renderPreviewText = () => {
    if (!result) return null;
    
    const { text: originalText, issues } = result;
    const sortedIssues = [...issues].sort((a, b) => a.offset - b.offset);
    
    const elements = [];
    let lastIndex = 0;
    
    sortedIssues.forEach((issue) => {
      // Add text before the issue
      if (issue.offset > lastIndex) {
        elements.push(originalText.substring(lastIndex, issue.offset));
      }
      
      // Add the highlighted issue
      elements.push(
        <TooltipProvider key={issue.id}>
          <Tooltip>
            <TooltipTrigger>
              <span 
                className={`cursor-help border-b-2 transition-all hover:bg-opacity-20 ${
                  issue.type === 'spelling' ? 'border-red-400 bg-red-50 dark:bg-red-500/15' : 
                  issue.type === 'grammar' ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/15' : 
                  'border-amber-400 bg-amber-50 dark:bg-amber-500/15'
                }`}
              >
                {issue.original}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs border border-border bg-popover p-3 text-popover-foreground shadow-xl">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {issue.type}
                </p>
                <p className="text-sm font-medium leading-relaxed">{issue.message}</p>
                {issue.replacement && (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground italic">Suggestion: <span className="font-bold text-green-600 dark:text-green-400">&quot;{issue.replacement}&quot;</span></p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 border-blue-200 bg-blue-50 text-[10px] font-bold uppercase text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                      onClick={() => applyFix(issue)}
                    >
                      Apply Fix
                    </Button>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      
      lastIndex = issue.offset + issue.length;
    });
    
    // Add remaining text
    if (lastIndex < originalText.length) {
      elements.push(originalText.substring(lastIndex));
    }
    
    return <div className="whitespace-pre-wrap leading-relaxed text-lg">{elements}</div>;
  };

  const qualityNeed = result
    ? result.stats.total > 5
      ? "significant"
      : result.stats.total > 0
        ? "minor"
        : "no"
    : "no";
  const summaryTitle = result
    ? result.stats.total === 0
      ? "Perfect!"
      : `${result.stats.total} Issues Found`
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm font-medium text-blue-600 hover:underline">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Grammar Corrector</h1>
            <p className="font-medium text-muted-foreground">Intelligent Writing Assistant</p>
          </div>
          <div className="flex items-center gap-4">
            {settings?.runningEnv !== "web" && (
              <div className="flex overflow-hidden rounded-lg border border-border bg-card p-1 shadow-sm">
                <button
                  onClick={() => setMode("online")}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    mode === "online" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Sparkles className="h-3 w-3" /> Online
                </button>
                <button
                  onClick={() => setMode("offline")}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    mode === "offline" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Zap className="h-3 w-3" /> Offline
                </button>
              </div>
            )}
            {checkMutation.isPending && (
              <div className="flex animate-pulse items-center gap-2 font-semibold text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </div>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: Input */}
          <section className="space-y-4 lg:col-span-5">
            <Card className="border-border p-6 shadow-sm">
              <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Input English Text
              </label>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setResult(null);
                }}
                onKeyDown={handleKeyDown}
                className="h-80 w-full resize-none rounded-xl border border-input bg-input/30 p-4 leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-blue-500"
                placeholder="Paste your English text here. Press Shift+Enter to analyze..."
              ></textarea>
              <Button
                onClick={handleCheck}
                disabled={checkMutation.isPending || !text.trim()}
                className="mt-6 w-full rounded-xl py-6 text-lg font-bold shadow-lg transition-all active:scale-[0.98]"
              >
                {checkMutation.isPending ? "Analyzing..." : "Check Grammar"}
              </Button>
            </Card>
          </section>

          {/* Right: Results */}
          <section className="lg:col-span-7">
            {result ? (
              <Card className="flex h-[calc(100vh-250px)] flex-col overflow-hidden border-border bg-card shadow-sm">
                {/* Tabs Header */}
                <div className="flex border-b border-border px-6">
                  <button
                    onClick={() => setActiveTab("list")}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === "list" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <List className="h-4 w-4" /> Issue List
                  </button>
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === "preview" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-4 w-4" /> Live Preview
                  </button>
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                      activeTab === "summary" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" /> Summary
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto p-6">
                  {activeTab === "list" ? (
                    <div className="space-y-4">
                      {result.issues.length > 0 ? (
                        result.issues.map((issue) => (
                          <div key={issue.id} className="group relative rounded-xl border border-border bg-muted/30 p-5 transition-all hover:border-blue-500/30 hover:bg-muted/50 hover:shadow-md">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    issue.type === 'spelling' ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 
                                    issue.type === 'grammar' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 
                                    'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                  }`}>
                                    {issue.type}
                                  </span>
                                  <span className="text-xs font-medium text-muted-foreground">At index {issue.offset}</span>
                                </div>
                                <p className="text-base font-bold text-foreground">
                                  <span className="line-through opacity-40 mr-2">{issue.original}</span>
                              {issue.replacement && <span className="text-green-600 dark:text-green-400">→ {issue.replacement}</span>}
                                </p>
                                <p className="text-sm text-muted-foreground">{issue.message}</p>
                              </div>
                              {issue.replacement && (
                                <Button 
                                  onClick={() => applyFix(issue)}
                                  className="h-10 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
                                >
                                  Apply Fix
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                          <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
                          <h3 className="text-xl font-bold text-foreground">No issues found!</h3>
                          <p className="text-muted-foreground">Your writing looks excellent.</p>
                        </div>
                      )}
                    </div>
                  ) : activeTab === "preview" ? (
                    <div className="rounded-2xl border border-border bg-muted/30 p-8">
                      {renderPreviewText()}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-8 text-red-700 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                          <span className="text-5xl font-black">{result.stats.spelling}</span>
                          <span className="mt-2 text-xs font-bold uppercase tracking-widest opacity-70">Spelling Errors</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 p-8 text-blue-700 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                          <span className="text-5xl font-black">{result.stats.grammar}</span>
                          <span className="mt-2 text-xs font-bold uppercase tracking-widest opacity-70">Grammar Issues</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 p-8 text-amber-700 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                          <span className="text-5xl font-black">{result.stats.style}</span>
                          <span className="mt-2 text-xs font-bold uppercase tracking-widest opacity-70">Style Suggestions</span>
                        </div>
                      </div>
                      
                      <div className="rounded-2xl border border-border bg-background p-8 text-foreground">
                        <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Analysis Result</h4>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-3xl font-bold">{summaryTitle}</p>
                            <p className="mt-1 text-muted-foreground">Overall text quality needs {qualityNeed} improvement.</p>
                          </div>
                          <CheckCircle2 className={`h-12 w-12 ${result.stats.total === 0 ? "text-green-400" : "text-slate-600"}`} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">Awaiting input for grammar analysis...</p>
                <p className="mt-2 text-sm text-muted-foreground">Paste your text and click &quot;Check Grammar&quot; to begin.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
