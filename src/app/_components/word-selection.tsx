"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Volume2, Loader2, BookOpen, CheckCircle2, RotateCcw, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Rating } from "ts-fsrs";

const cefrColor = (cefr: string) => {
  if (cefr.startsWith("A")) return "text-green-500";
  if (cefr.startsWith("B")) return "text-blue-500";
  if (cefr.startsWith("C")) return "text-purple-500";
  return "text-gray-500";
};

const ratingLabels: Record<number, string> = {
  [Rating.Again]: "Again",
  [Rating.Hard]: "Hard",
  [Rating.Good]: "Good",
  [Rating.Easy]: "Easy",
};

export function WordSelection() {
  const [quotas, setQuotas] = useState({ basic: 30, independent: 60, proficient: 10 });
  const [words, setWords] = useState<any[]>([]);
  const [difficulty, setDifficulty] = useState("B1");
  const [story, setStory] = useState("");
  
  // New States for Batching and Undo
  const [pendingRatings, setPendingRatings] = useState<Record<number, Rating>>({});
  const [historyStack, setHistoryStack] = useState<number[]>([]);
  const [syncedIds, setSyncedIds] = useState<Set<number>>(new Set());

  const utils = api.useUtils();
  const generateQuery = api.word.generateSelection.useQuery(
    quotas,
    { enabled: false }
  );

  const generateStoryMutation = api.word.generateStory.useMutation({
    onSuccess: (data) => {
      setStory(data);
      localStorage.setItem("currentStory", data);
    },
    onError: (error) => {
      alert(`AI Story Generation Failed: ${error.message}`);
    },
  });

  const submitBatchReviewMutation = api.word.submitBatchReview.useMutation({
    onSuccess: (_, variables) => {
      const submittedIds = variables.map(v => v.wordId);
      const newSyncedIds = new Set([...syncedIds, ...submittedIds]);
      setSyncedIds(newSyncedIds);
      localStorage.setItem("syncedIds", JSON.stringify(Array.from(newSyncedIds)));
      
      // Clear submitted from pending
      setPendingRatings(prev => {
        const next = { ...prev };
        submittedIds.forEach(id => delete next[id]);
        localStorage.setItem("pendingRatings", JSON.stringify(next));
        return next;
      });
      // Clear from history stack if they were there
      setHistoryStack(prev => prev.filter(id => !submittedIds.includes(id)));
    },
    onError: (error) => {
      alert(`Failed to sync progress: ${error.message}`);
    },
  });

  // Load from localStorage on mount
  useEffect(() => {
    const savedRatings = localStorage.getItem("pendingRatings");
    const savedWords = localStorage.getItem("currentWords");
    const savedSyncedIds = localStorage.getItem("syncedIds");
    const savedStory = localStorage.getItem("currentStory");

    if (savedRatings) {
      try { setPendingRatings(JSON.parse(savedRatings)); } catch (e) { console.error(e); }
    }
    if (savedWords) {
      try { setWords(JSON.parse(savedWords)); } catch (e) { console.error(e); }
    }
    if (savedSyncedIds) {
      try { setSyncedIds(new Set(JSON.parse(savedSyncedIds))); } catch (e) { console.error(e); }
    }
    if (savedStory) {
      setStory(savedStory);
    }
  }, []);

  // Sync states to localStorage
  useEffect(() => {
    if (Object.keys(pendingRatings).length > 0) {
      localStorage.setItem("pendingRatings", JSON.stringify(pendingRatings));
    } else {
      localStorage.removeItem("pendingRatings");
    }
  }, [pendingRatings]);

  useEffect(() => {
    if (words.length > 0) {
      localStorage.setItem("currentWords", JSON.stringify(words));
    } else {
      localStorage.removeItem("currentWords");
    }
  }, [words]);

  useEffect(() => {
    localStorage.setItem("syncedIds", JSON.stringify(Array.from(syncedIds)));
  }, [syncedIds]);

  useEffect(() => {
    if (story) {
      localStorage.setItem("currentStory", story);
    } else {
      localStorage.removeItem("currentStory");
    }
  }, [story]);

  const handleGenerate = async () => {
    const { data } = await generateQuery.refetch();
    if (data) {
      setWords(data);
      setStory("");
      setPendingRatings({});
      setHistoryStack([]);
      setSyncedIds(new Set());
      localStorage.removeItem("pendingRatings");
      localStorage.removeItem("currentWords");
      localStorage.removeItem("syncedIds");
      localStorage.removeItem("currentStory");
    }
  };

  // Helper to handle potential type mismatch between string keys and number IDs
  const wordIdToNum = (id: any): number => {
    return typeof id === "string" ? parseInt(id) : id;
  };

  const unratedWords = words.filter(w => !syncedIds.has(w.id) && pendingRatings[wordIdToNum(w.id)] === undefined);

  const handleGenerateStory = () => {
    if (unratedWords.length === 0) return;
    
    generateStoryMutation.mutate({
      words: unratedWords.map((w) => w.text),
      difficulty,
    });
  };

  const handleReview = (wordId: number, rating: Rating) => {
    if (syncedIds.has(wordId)) return;
    
    setPendingRatings((prev) => ({ ...prev, [wordId]: rating }));
    setHistoryStack((prev) => [...prev, wordId]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    
    const lastId = historyStack[historyStack.length - 1]!;
    setHistoryStack((prev) => prev.slice(0, -1));
    setPendingRatings((prev) => {
      const next = { ...prev };
      delete next[lastId];
      return next;
    });

    // Optimization: Scroll to the word that was just undone
    setTimeout(() => {
      const element = document.getElementById(`word-card-${lastId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
  };

  const handleBatchSubmit = async () => {
    const entries = Object.entries(pendingRatings).map(([id, rating]) => ({
      wordId: Number(id),
      rating,
    }));

    if (entries.length === 0) return;

    const unratedCount = words.length - syncedIds.size - entries.length;
    if (unratedCount > 0) {
      if (!confirm(`You have ${unratedCount} words unrated. Do you want to sync the current ${entries.length} ratings first?`)) {
        return;
      }
    }

    submitBatchReviewMutation.mutate(entries);
  };

  const playTTS = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const allSynced = words.length > 0 && syncedIds.size === words.length;
  const hasPending = Object.keys(pendingRatings).length > 0;

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden items-start">
      {/* Left Column: Word Selection & List */}
      <div className="h-full overflow-y-auto pr-2 space-y-8 pb-8">
        <Card className="shadow-md border-2 border-muted/50 pt-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Word Selection Quotas (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="quota-basic" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Basic (A1/A2)</label>
                <Input
                  id="quota-basic"
                  type="number"
                  value={quotas.basic}
                  onChange={(e) => setQuotas({ ...quotas, basic: Number(e.target.value) })}
                  className="h-10 font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quota-independent" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Independent (B1/B2)</label>
                <Input
                  id="quota-independent"
                  type="number"
                  value={quotas.independent}
                  onChange={(e) => setQuotas({ ...quotas, independent: Number(e.target.value) })}
                  className="h-10 font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quota-proficient" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Proficient (C1/C2)</label>
                <Input
                  id="quota-proficient"
                  type="number"
                  value={quotas.proficient}
                  onChange={(e) => setQuotas({ ...quotas, proficient: Number(e.target.value) })}
                  className="h-10 font-semibold"
                />
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              {allSynced ? (
                <Button
                  className="w-full h-11 text-base font-bold shadow-sm bg-green-600 hover:bg-green-700"
                  onClick={handleGenerate}
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Start Next Story
                </Button>
              ) : hasPending ? (
                <Button
                  className="w-full h-11 text-base font-bold shadow-sm bg-blue-600 hover:bg-blue-700"
                  onClick={handleBatchSubmit}
                  disabled={submitBatchReviewMutation.isPending}
                >
                  {submitBatchReviewMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  Sync Progress ({Object.keys(pendingRatings).length} words)
                </Button>
              ) : (
                <Button
                  className="w-full h-11 text-base font-bold shadow-sm"
                  onClick={handleGenerate}
                  disabled={generateQuery.isFetching}
                >
                  {generateQuery.isFetching ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                  )}
                  Generate 30 Practice Words
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {words.length > 0 && (
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Word List ({syncedIds.size}/{words.length} synced)
                </h3>
                {historyStack.length > 0 && (
                   <Button variant="ghost" size="sm" onClick={handleUndo} className="h-8 text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Undo Last Rating
                   </Button>
                )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {words.map((word) => {
                const isSynced = syncedIds.has(word.id);
                const pendingRating = pendingRatings[word.id];
                
                return (
                  <Card 
                    key={word.id} 
                    id={`word-card-${word.id}`}
                    className={`hover:shadow-md transition-all duration-200 border-l-4 border-r border-t border-b ${word.cefr.startsWith("A") ? "border-l-green-500" :
                      word.cefr.startsWith("B") ? "border-l-blue-500" :
                        "border-l-purple-500"
                    } ${isSynced ? "opacity-50 grayscale bg-muted/30" : pendingRating !== undefined ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card shadow-sm border-muted/50"}`}>
                    <CardContent className="p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className={`text-xl font-bold ${cefrColor(word.cefr)} tracking-tight`}>
                            {word.text}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary/50 text-secondary-foreground w-fit mt-1">
                            {word.cefr}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => playTTS(word.text)}>
                            <Volume2 className="h-5 w-5" />
                          </Button>
                          {isSynced && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                          {!isSynced && pendingRating !== undefined && (
                             <div className="text-[10px] font-black uppercase px-2 py-1 bg-primary text-primary-foreground rounded">
                               {ratingLabels[pendingRating]}
                             </div>
                          )}
                        </div>
                      </div>

                      {!isSynced && pendingRating === undefined && (
                        <div className="grid grid-cols-4 gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-8 px-1 font-bold bg-red-50 hover:bg-red-100 hover:text-red-700 border-red-200 transition-colors"
                            onClick={() => handleReview(word.id, Rating.Again)}
                          >
                            Again
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-8 px-1 font-bold bg-orange-50 hover:bg-orange-100 hover:text-orange-700 border-orange-200 transition-colors"
                            onClick={() => handleReview(word.id, Rating.Hard)}
                          >
                            Hard
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-8 px-1 font-bold bg-green-50 hover:bg-green-100 hover:text-green-700 border-green-200 transition-colors"
                            onClick={() => handleReview(word.id, Rating.Good)}
                          >
                            Good
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-8 px-1 font-bold bg-blue-50 hover:bg-blue-100 hover:text-blue-700 border-blue-200 transition-colors"
                            onClick={() => handleReview(word.id, Rating.Easy)}
                          >
                            Easy
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Story Generation */}
      <div className="h-full overflow-y-auto pr-4 pb-8">
        {words.length > 0 ? (
          <Card className="shadow-sm border-2 border-muted overflow-visible pt-0">
            <CardHeader className="bg-muted/50 border-b py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <BookOpen className="h-5 w-5 text-primary" />
                AI Story Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="flex flex-wrap items-end gap-4 bg-muted/20 p-4 rounded-lg border border-muted/50">
                <div className="space-y-1.5 flex-1 min-w-[180px]">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Story Level</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="h-9 bg-background shadow-sm border-muted-foreground/20">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                        <SelectItem key={level} value={level}>
                          {level} - {level.startsWith("A") ? "Basic" : level.startsWith("B") ? "Intermediate" : "Advanced"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerateStory}
                  disabled={generateStoryMutation.isPending || unratedWords.length === 0}
                  className="bg-primary hover:bg-primary/90 h-9 px-5 font-bold shadow-sm"
                >
                  {generateStoryMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BookOpen className="mr-2 h-4 w-4" />
                  )}
                  {unratedWords.length > 0 ? `Generate Story (${unratedWords.length} words)` : "All Reviewed"}
                </Button>
              </div>

              {story && (
                <div className="mt-4 p-6 bg-background rounded-lg border border-muted shadow-sm prose prose-slate max-w-none overflow-visible">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: story.replace(/\n/g, "<br />")
                    }}
                    className="[&>mark]:bg-yellow-100 [&>mark]:text-yellow-900 [&>mark]:px-1 [&>mark]:py-0.5 [&>mark]:rounded [&>mark]:font-bold [&>mark]:border-b-2 [&>mark]:border-yellow-400/50 text-base md:text-lg leading-relaxed text-foreground font-sans"
                  />
                </div>
              )}

              {!story && !generateStoryMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/5 rounded-lg border-2 border-dashed border-muted">
                  <BookOpen className="h-12 w-12 opacity-20 mb-4" />
                  <p className="text-base font-semibold">Your story will appear here</p>
                  <p className="text-sm opacity-70">Generate a story to practice your selected words</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full bg-muted/30 border-dashed flex flex-col items-center justify-center p-12 text-center">
            <div className="max-w-xs space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-lg font-semibold text-muted-foreground">No words loaded</p>
              <p className="text-sm text-muted-foreground/70">
                Choose your difficulty quotas on the left and generate a word list to start.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
