"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Volume2, Loader2, BookOpen, CheckCircle2, RotateCcw, Save, ChevronDown, ChevronUp, Settings2, HelpCircle, X, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Rating } from "ts-fsrs";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

type CefrLevel = (typeof CEFR_LEVELS)[number];
type ReviewRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;
type SelectedWord = { id: number; text: string; cefr: string };
type WordQuotas = {
  reviewCount: number;
  basicCount: number;
  independentCount: number;
  proficientCount: number;
};
type SelectionStats = {
  review: number;
  basic: number;
  independent: number;
  proficient: number;
  total: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseJson = (value: string): unknown => {
  const parsed: unknown = JSON.parse(value);
  return parsed;
};

const isCefrLevel = (value: string): value is CefrLevel =>
  value === "A1" || value === "A2" || value === "B1" || value === "B2" || value === "C1" || value === "C2";

const isRating = (value: unknown): value is ReviewRating =>
  value === 1 || value === 2 || value === 3 || value === 4;

const parsePendingRatings = (value: unknown): Record<number, ReviewRating> => {
  if (!isRecord(value)) return {};

  const ratings: Record<number, ReviewRating> = {};
  for (const [id, rating] of Object.entries(value)) {
    const numericId = Number(id);
    if (Number.isInteger(numericId) && isRating(rating)) {
      ratings[numericId] = rating;
    }
  }

  return ratings;
};

const parseSelectedWords = (value: unknown): SelectedWord[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((word) => {
    if (!isRecord(word)) return [];
    if (typeof word.id !== "number" || typeof word.text !== "string" || typeof word.cefr !== "string") return [];
    return [{ id: word.id, text: word.text, cefr: word.cefr }];
  });
};

const parseSelectionStats = (value: unknown): SelectionStats | null => {
  if (!isRecord(value)) return null;

  const { review, basic, independent, proficient, total } = value;
  if (
    typeof review !== "number" ||
    typeof basic !== "number" ||
    typeof independent !== "number" ||
    typeof proficient !== "number" ||
    typeof total !== "number"
  ) {
    return null;
  }

  return { review, basic, independent, proficient, total };
};

const parseNumberArray = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];

const parseQuotas = (value: unknown): WordQuotas => {
  const fallback = { reviewCount: 20, basicCount: 10, independentCount: 10, proficientCount: 1 };
  if (!isRecord(value)) return fallback;

  return {
    reviewCount: typeof value.reviewCount === "number" ? value.reviewCount : fallback.reviewCount,
    basicCount: typeof value.basicCount === "number" ? value.basicCount : fallback.basicCount,
    independentCount: typeof value.independentCount === "number" ? value.independentCount : fallback.independentCount,
    proficientCount: typeof value.proficientCount === "number" ? value.proficientCount : fallback.proficientCount,
  };
};

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
  const [quotas, setQuotas] = useState<WordQuotas>({ reviewCount: 20, basicCount: 10, independentCount: 10, proficientCount: 1 });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [words, setWords] = useState<SelectedWord[]>([]);
  const [selectionStats, setSelectionStats] = useState<SelectionStats | null>(null);
  const [difficulty, setDifficulty] = useState<CefrLevel>("B1");
  const [theme, setTheme] = useState("General");
  const [story, setStory] = useState("");
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  // New States for Batching and Undo
  const [pendingRatings, setPendingRatings] = useState<Record<number, ReviewRating>>({});
  const [syncedIds, setSyncedIds] = useState<Set<number>>(new Set());

  // Floating UI State
  const [floatingMenu, setFloatingMenu] = useState<{ x: number, y: number, wordId: number, text: string } | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string } | null>(null);

  // Explanation State
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationWord, setExplanationWord] = useState<string | null>(null);

  const storyRef = useRef<HTMLDivElement>(null);
  const selectionMenuTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (selectionMenuTimerRef.current !== null) {
        window.clearTimeout(selectionMenuTimerRef.current);
      }
    };
  }, []);

  const generateQuery = api.word.generateSelection.useQuery(
    quotas,
    { enabled: false }
  );

  const generateStoryMutation = api.word.generateStory.useMutation({
    onSuccess: (data) => {
      setStory(data);
      localStorage.setItem("currentStory", data);
      setExplanation(null);
      setExplanationWord(null);
    },
    onError: (error) => {
      alert(`AI Story Generation Failed: ${error.message}`);
    },
  });

  const explainMutation = api.word.explainContext.useMutation({
    onSuccess: (data) => {
      setExplanation(data);
    },
    onError: (error) => {
      alert(`Explanation failed: ${error.message}`);
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
    },
    onError: (error) => {
      alert(`Failed to sync progress: ${error.message}`);
    },
  });

  // Load from localStorage on mount
  useEffect(() => {
    const savedRatings = localStorage.getItem("pendingRatings");
    const savedWords = localStorage.getItem("currentWords");
    const savedSelectionStats = localStorage.getItem("currentSelectionStats");
    const savedSyncedIds = localStorage.getItem("syncedIds");
    const savedStory = localStorage.getItem("currentStory");
    const savedQuotas = localStorage.getItem("wordQuotas");
    const savedTheme = localStorage.getItem("currentTheme");

    if (savedRatings) {
      try { setPendingRatings(parsePendingRatings(parseJson(savedRatings))); } catch (e) { console.error(e); }
    }
    if (savedWords) {
      try { setWords(parseSelectedWords(parseJson(savedWords))); } catch (e) { console.error(e); }
    }
    if (savedSelectionStats) {
      try { setSelectionStats(parseSelectionStats(parseJson(savedSelectionStats))); } catch (e) { console.error(e); }
    }
    if (savedSyncedIds) {
      try { setSyncedIds(new Set(parseNumberArray(parseJson(savedSyncedIds)))); } catch (e) { console.error(e); }
    }
    if (savedStory) {
      setStory(savedStory);
    }
    if (savedQuotas) {
      try { 
        setQuotas(parseQuotas(parseJson(savedQuotas)));
      } catch (e) { console.error(e); }
    }
    if (savedTheme) {
      setTheme(savedTheme);
    }
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    localStorage.setItem("currentTheme", theme);
  }, [hasLoadedStorage, theme]);

  // Sync states to localStorage
  useEffect(() => {
    if (!hasLoadedStorage) return;
    localStorage.setItem("wordQuotas", JSON.stringify(quotas));
  }, [hasLoadedStorage, quotas]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    if (Object.keys(pendingRatings).length > 0) {
      localStorage.setItem("pendingRatings", JSON.stringify(pendingRatings));
    } else {
      localStorage.removeItem("pendingRatings");
    }
  }, [hasLoadedStorage, pendingRatings]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    if (words.length > 0) {
      localStorage.setItem("currentWords", JSON.stringify(words));
    } else {
      localStorage.removeItem("currentWords");
    }
  }, [hasLoadedStorage, words]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    if (selectionStats) {
      localStorage.setItem("currentSelectionStats", JSON.stringify(selectionStats));
    } else {
      localStorage.removeItem("currentSelectionStats");
    }
  }, [hasLoadedStorage, selectionStats]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    localStorage.setItem("syncedIds", JSON.stringify(Array.from(syncedIds)));
  }, [hasLoadedStorage, syncedIds]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    if (story) {
      localStorage.setItem("currentStory", story);
    } else {
      localStorage.removeItem("currentStory");
    }
  }, [hasLoadedStorage, story]);

  const clearGeneratedPractice = () => {
    setWords([]);
    setSelectionStats(null);
    setStory("");
    setPendingRatings({});
    setSyncedIds(new Set());
    setExplanation(null);
    setExplanationWord(null);
    setFloatingMenu(null);
    setSelectionMenu(null);
    localStorage.removeItem("pendingRatings");
    localStorage.removeItem("currentWords");
    localStorage.removeItem("currentSelectionStats");
    localStorage.removeItem("syncedIds");
    localStorage.removeItem("currentStory");
  };

  const generateWords = async (clearExisting: boolean) => {
    const totalRequested = quotas.reviewCount + quotas.basicCount + quotas.independentCount + quotas.proficientCount;
    if (totalRequested <= 0) {
      alert("Please set at least one word count to greater than 0.");
      setIsConfigOpen(true);
      return;
    }

    if (clearExisting) {
      clearGeneratedPractice();
    }

    const { data } = await generateQuery.refetch();
    if (data) {
      setWords(data.words);
      setSelectionStats(data.stats);
      setStory("");
      setPendingRatings({});
      setSyncedIds(new Set());
      setExplanation(null);
      setExplanationWord(null);
      localStorage.removeItem("pendingRatings");
      localStorage.removeItem("currentWords");
      localStorage.removeItem("currentSelectionStats");
      localStorage.removeItem("syncedIds");
      localStorage.removeItem("currentStory");
      setIsConfigOpen(false); 
    }
  };

  const handleGenerate = () => {
    void generateWords(false);
  };

  const handleRegenerateWords = () => {
    void generateWords(true);
  };

  const unratedWords = words.filter(w => !syncedIds.has(w.id) && pendingRatings[w.id] === undefined);

  const handleGenerateStory = () => {
    if (unratedWords.length === 0) return;

    generateStoryMutation.mutate({
      words: unratedWords.map((w) => w.text),
      difficulty,
      theme,
    });
  };

  const handleReview = (wordId: number, rating: ReviewRating) => {
    if (syncedIds.has(wordId)) return;

    setPendingRatings((prev) => ({ ...prev, [wordId]: rating }));
    setFloatingMenu(null);
  };

  const handleExplain = (text: string) => {
    if (!story) return;
    setExplanation(null);
    setExplanationWord(text);
    explainMutation.mutate({ word: text, story });
    setFloatingMenu(null);
    setSelectionMenu(null);
  };

  const openWordMenu = (e: React.MouseEvent) => {
    if (window.getSelection()?.toString().trim()) {
      return false;
    }

    const target = e.target as HTMLElement;
    const mark = target.closest("mark[data-word]");
    
    if (mark && storyRef.current?.contains(mark)) {
      const baseWord = mark.getAttribute("data-word");
      if (baseWord) {
        const wordMatch = words.find(w => w.text.toLowerCase() === baseWord.toLowerCase());
        if (wordMatch) {
          e.preventDefault();
          e.stopPropagation();
          setFloatingMenu({
            x: e.clientX,
            y: e.clientY,
            wordId: wordMatch.id,
            text: wordMatch.text
          });
          setSelectionMenu(null);
          playTTS(wordMatch.text);
          return true;
        }
      }
    }
    return false;
  };

  const handleStoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const activeSelection = window.getSelection()?.toString().trim();

    if (activeSelection) {
      return;
    }

    if (openWordMenu(e)) {
      return;
    }

    setFloatingMenu(null);
    setSelectionMenu(null);
  };

  const handleStoryMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMenuTimerRef.current !== null) {
      window.clearTimeout(selectionMenuTimerRef.current);
    }
    
    selectionMenuTimerRef.current = window.setTimeout(() => {
      selectionMenuTimerRef.current = null;
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (text && text.length > 0 && text.length <= 300 && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (!rect) return;

        setSelectionMenu({
          x: rect.left + rect.width / 2,
          y: rect.top,
          text,
        });
        setFloatingMenu(null);
        return;
      }

      setSelectionMenu(null);
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

  const handleResetRating = (wordId: number) => {
    setPendingRatings((prev) => {
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
  };

  const playTTS = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const allSynced = words.length > 0 && syncedIds.size === words.length;
  const hasPending = Object.keys(pendingRatings).length > 0;
  const showExplanationPanel = explainMutation.isPending ? true : explanation !== null;
  const selectionStatItems = selectionStats
    ? [
        { label: "Review", value: selectionStats.review, requested: quotas.reviewCount, className: "text-orange-700 bg-orange-50 border-orange-100 dark:text-orange-300 dark:bg-orange-500/10 dark:border-orange-500/20" },
        { label: "Basic", value: selectionStats.basic, requested: quotas.basicCount, className: "text-green-700 bg-green-50 border-green-100 dark:text-green-300 dark:bg-green-500/10 dark:border-green-500/20" },
        { label: "Indep.", value: selectionStats.independent, requested: quotas.independentCount, className: "text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20" },
        { label: "Profic.", value: selectionStats.proficient, requested: quotas.proficientCount, className: "text-purple-700 bg-purple-50 border-purple-100 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20" },
      ]
    : [];

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const processedStory = () => {
    if (!story) return "";
    const allowedWords = new Map(words.map((word) => [word.text.toLowerCase(), word]));
    const parser = new DOMParser();
    const doc = parser.parseFromString(story.replace(/\n/g, "<br>"), "text/html");

    const sanitizeNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeHtml(node.textContent ?? "");
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const children = Array.from(element.childNodes).map(sanitizeNode).join("");

      if (tagName === "br") return "<br>";
      if (tagName === "u") return `<u>${children}</u>`;
      if (tagName === "mark") {
        const rawWord = element.getAttribute("data-word") ?? "";
        const word = allowedWords.get(rawWord.toLowerCase());
        if (!word) return children;

        const isRated = syncedIds.has(word.id) || pendingRatings[word.id] !== undefined;
        const ratedAttr = isRated ? ' data-rated="true"' : "";
        return `<mark data-word="${escapeHtml(word.text)}"${ratedAttr}>${children}</mark>`;
      }

      return children;
    };

    return Array.from(doc.body.childNodes).map(sanitizeNode).join("");
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-8 overflow-hidden items-stretch" onClick={() => {
      setFloatingMenu(null);
      setSelectionMenu(null);
    }}>
      {/* Left Column: Word Selection & List */}
      <div className="flex flex-col h-full lg:w-1/2 min-w-0">
        <div className="flex-none space-y-4 mb-4">
          <Card className="shadow-md border-2 border-muted/50 overflow-hidden">
            <CardHeader 
              className="pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors py-3"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
            >
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">Selection Config</CardTitle>
              </div>
              {isConfigOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </CardHeader>
            
            <div className={`transition-all duration-300 ease-in-out ${isConfigOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}>
              <CardContent className="pt-2 pb-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="quota-review" className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Review</label>
                    <Input
                      id="quota-review"
                      type="number"
                      value={quotas.reviewCount}
                      onChange={(e) => setQuotas({ ...quotas, reviewCount: Number(e.target.value) })}
                      className="h-9 font-bold border-orange-200 focus-visible:ring-orange-500 px-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="quota-basic" className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Basic (A1/2)</label>
                    <Input
                      id="quota-basic"
                      type="number"
                      value={quotas.basicCount}
                      onChange={(e) => setQuotas({ ...quotas, basicCount: Number(e.target.value) })}
                      className="h-9 font-bold border-green-200 focus-visible:ring-green-500 px-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="quota-independent" className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Indep. (B1/2)</label>
                    <Input
                      id="quota-independent"
                      type="number"
                      value={quotas.independentCount}
                      onChange={(e) => setQuotas({ ...quotas, independentCount: Number(e.target.value) })}
                      className="h-9 font-bold border-blue-200 focus-visible:ring-blue-500 px-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="quota-proficient" className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Profic. (C1/2)</label>
                    <Input
                      id="quota-proficient"
                      type="number"
                      value={quotas.proficientCount}
                      onChange={(e) => setQuotas({ ...quotas, proficientCount: Number(e.target.value) })}
                      className="h-9 font-bold border-purple-200 focus-visible:ring-purple-500 px-2"
                    />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            {!allSynced && !hasPending && (
              <Button
                className="w-full h-11 text-sm font-bold shadow-md"
                onClick={handleGenerate}
                disabled={generateQuery.isFetching}
              >
                {generateQuery.isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {words.length > 0 ? "Regenerate Word List" : "Generate Words to Start"}
              </Button>
            )}

            {allSynced ? (
              <Button
                className="h-11 w-full border border-emerald-500/30 bg-emerald-500/15 text-sm font-bold text-emerald-700 shadow-md shadow-emerald-950/10 hover:bg-emerald-500/25 dark:text-emerald-300"
                onClick={handleGenerate}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Everything Synced! Start Next Story
              </Button>
            ) : hasPending && (
              <Button
                className="w-full h-11 text-sm font-bold shadow-md bg-blue-600 hover:bg-blue-700"
                onClick={handleBatchSubmit}
                disabled={submitBatchReviewMutation.isPending}
              >
                {submitBatchReviewMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Sync Progress ({Object.keys(pendingRatings).length} words)
              </Button>
            )}

            {selectionStats && (
              <div className="grid grid-cols-4 gap-2">
                {selectionStatItems.map((item) => (
                  <div key={item.label} className={`rounded-md border p-2 ${item.className}`}>
                    <div className="text-[9px] font-black uppercase tracking-wider opacity-75">{item.label}</div>
                    <div className="flex items-end gap-1">
                      <span className="text-lg font-black leading-none">{item.value}</span>
                      <span className="text-[9px] font-bold opacity-60">/ {item.requested}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-8 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          {words.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Word List ({syncedIds.size}/{words.length} synced)
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-2 px-3 text-xs font-bold"
                  onClick={handleRegenerateWords}
                  disabled={generateQuery.isFetching}
                >
                  {generateQuery.isFetching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Regenerate Words
                </Button>
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
                              <div className="flex items-center gap-2">
                                <div className="text-[10px] font-black uppercase px-2 py-1 bg-primary text-primary-foreground rounded">
                                  {ratingLabels[pendingRating]}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                                  onClick={() => handleResetRating(word.id)}
                                  title="Reset Rating"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid min-h-8 grid-cols-4 gap-1.5 mt-2">
                          {!isSynced && pendingRating === undefined && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-red-200 bg-red-50 px-1 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 dark:hover:text-red-200"
                                onClick={() => handleReview(word.id, Rating.Again)}
                              >
                                Again
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-orange-200 bg-orange-50 px-1 text-[11px] font-bold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20 dark:hover:text-orange-200"
                                onClick={() => handleReview(word.id, Rating.Hard)}
                              >
                                Hard
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-green-200 bg-green-50 px-1 text-[11px] font-bold text-green-700 transition-colors hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20 dark:hover:text-green-200"
                                onClick={() => handleReview(word.id, Rating.Good)}
                              >
                                Good
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-blue-200 bg-blue-50 px-1 text-[11px] font-bold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20 dark:hover:text-blue-200"
                                onClick={() => handleReview(word.id, Rating.Easy)}
                              >
                                Easy
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="h-full bg-muted/30 border-dashed flex flex-col items-center justify-center p-12 text-center">
              <div className="max-w-xs space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-lg font-semibold text-muted-foreground">No words loaded</p>
                <p className="text-sm text-muted-foreground/70">
                  Choose your difficulty quotas above and generate a word list to start.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Right Column: AI Story & Explanation */}
      <div className="flex flex-col h-full lg:w-1/2 min-w-0 relative">
        {/* Floating Menus (fixed to screen, context-aware) */}
        {floatingMenu && (
          <div 
            className="fixed z-[100] bg-popover border shadow-2xl rounded-xl p-2 flex flex-col gap-2 animate-in fade-in zoom-in duration-200 min-w-[200px]"
            style={{ left: Math.min(window.innerWidth - 220, floatingMenu.x), top: floatingMenu.y - 120 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1 border-b">
              <span className="text-xs font-bold truncate max-w-[120px]">{floatingMenu.text}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFloatingMenu(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] font-bold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" onClick={() => handleReview(floatingMenu.wordId, Rating.Again)}>Again</Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] font-bold text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-500/10" onClick={() => handleReview(floatingMenu.wordId, Rating.Hard)}>Hard</Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] font-bold text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-500/10" onClick={() => handleReview(floatingMenu.wordId, Rating.Good)}>Good</Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10" onClick={() => handleReview(floatingMenu.wordId, Rating.Easy)}>Easy</Button>
            </div>
            <Button 
              size="sm" 
              className="w-full h-8 text-xs font-bold gap-2" 
              onClick={() => handleExplain(floatingMenu.text)}
              disabled={explainMutation.isPending}
            >
              {explainMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <HelpCircle className="h-3 w-3" />}
              Explain in Context
            </Button>
          </div>
        )}

        {selectionMenu && (
          <div 
            className="fixed z-[100] rounded-lg border bg-popover p-1 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
              left: selectionMenu.x,
              top: Math.max(12, selectionMenu.y - 44),
              transform: "translateX(-50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button 
              size="sm" 
              className="h-8 px-3 text-xs font-bold gap-2 shadow-lg" 
              onClick={() => handleExplain(selectionMenu.text)}
              disabled={explainMutation.isPending}
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              Explain Selection
            </Button>
          </div>
        )}

        {/* Story Controls - Pinned at top of column */}
        <div className="flex-none mb-4">
          <Card className="overflow-visible border border-border bg-card/80 shadow-sm">
            <CardContent className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-[1fr_1fr_auto]">
                <Select value={difficulty} onValueChange={(val) => {
                  if (typeof val === "string" && isCefrLevel(val)) setDifficulty(val);
                }}>
                  <SelectTrigger className="h-9 w-full border-muted-foreground/20 bg-background shadow-sm">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {CEFR_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={theme} onValueChange={(val) => val && setTheme(val)}>
                  <SelectTrigger className="h-9 w-full border-muted-foreground/20 bg-background shadow-sm">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {["General", "Work & Career", "Daily Life", "Travel", "Science & Tech", "Mystery & Story"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <Button
                onClick={handleGenerateStory}
                disabled={generateStoryMutation.isPending || unratedWords.length === 0}
                className="h-9 min-w-[168px] whitespace-nowrap px-4 font-bold shadow-sm"
              >
                {generateStoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                Generate Story ({unratedWords.length})
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Story Content & Explanation - Scrollable area */}
        <div className="flex-1 overflow-y-auto pr-4 pb-8 space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          {story ? (
            <div 
              ref={storyRef}
              className="relative cursor-text select-text overflow-visible rounded-lg border border-muted bg-background p-6 shadow-sm selection:bg-blue-200 selection:text-slate-950 dark:selection:bg-blue-400/70 dark:selection:text-white prose prose-slate max-w-none"
              onClick={(e) => {
                handleStoryClick(e);
              }}
              onMouseUp={handleStoryMouseUp}
            >
              <div
                dangerouslySetInnerHTML={{ __html: processedStory() }}
                className="[&>mark]:rounded [&>mark]:border-b-2 [&>mark]:border-indigo-300/40 [&>mark]:bg-indigo-100/70 [&>mark]:px-1 [&>mark]:py-0.5 [&>mark]:font-bold [&>mark]:text-indigo-900 [&>mark]:transition-all [&>mark]:duration-300 [&>mark]:cursor-pointer hover:[&>mark]:bg-indigo-200/80 dark:[&>mark]:bg-indigo-400/20 dark:[&>mark]:text-indigo-100 dark:hover:[&>mark]:bg-indigo-400/35 [&>mark[data-rated='true']]:cursor-default [&>mark[data-rated='true']]:opacity-40 [&>mark[data-rated='true']]:grayscale [&>u]:cursor-help [&>u]:decoration-blue-400/50 [&>u]:decoration-dashed [&>u]:underline-offset-4 font-sans text-base leading-relaxed text-foreground md:text-lg"
              />
            </div>
          ) : !generateStoryMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/5 rounded-lg border-2 border-dashed border-muted">
              <BookOpen className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-base font-semibold">Your story will appear here</p>
            </div>
          )}

          {showExplanationPanel && (
            <Card id="explanation-section" className="shadow-lg border-2 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
              <CardHeader className="bg-primary/10 py-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-bold text-primary">Contextual Explanation</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => {
                  setExplanation(null);
                  setExplanationWord(null);
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Explaining:</span>
                    <span className="text-lg font-bold text-foreground bg-background px-3 py-1 rounded-md border shadow-sm">
                      {explanationWord}
                    </span>
                  </div>
                  <div className="relative min-h-[60px] bg-background p-4 rounded-lg border-2 border-primary/10 shadow-inner">
                    {explainMutation.isPending ? (
                      <div className="flex flex-col items-center justify-center py-4 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs font-medium text-muted-foreground animate-pulse">Consulting AI Linguist...</p>
                      </div>
                    ) : (
                      <p className="text-base leading-relaxed text-foreground font-medium italic">
                        {explanation}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
