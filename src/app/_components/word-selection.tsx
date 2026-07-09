"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, BookOpen, CheckCircle2, RotateCcw, Save, ChevronDown, ChevronUp, Settings2, HelpCircle, X, Sparkles, Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Rating } from "ts-fsrs";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

type CefrLevel = (typeof CEFR_LEVELS)[number];
type ReviewRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;
type StudyMode = "multiple" | "single";
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

const uniqueSelectedWords = (wordList: SelectedWord[]) => {
  const seen = new Set<number>();
  return wordList.filter((word) => {
    if (seen.has(word.id)) return false;
    seen.add(word.id);
    return true;
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

const cefrPillClass = (cefr: string) => {
  if (cefr.startsWith("A")) return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/25 dark:bg-green-500/10 dark:text-green-300";
  if (cefr.startsWith("B")) return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300";
  if (cefr.startsWith("C")) return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/25 dark:bg-purple-500/10 dark:text-purple-300";
  return "border-muted bg-muted/40 text-muted-foreground";
};

const cefrChunkClass = (cefr: string) => {
  if (cefr.startsWith("A")) return "rounded bg-green-50/70 px-1 py-0.5 decoration-green-300/50 dark:bg-green-500/10";
  if (cefr.startsWith("B")) return "rounded bg-blue-50/70 px-1 py-0.5 decoration-blue-300/50 dark:bg-blue-500/10";
  if (cefr.startsWith("C")) return "rounded bg-purple-50/70 px-1 py-0.5 decoration-purple-300/50 dark:bg-purple-500/10";
  return "rounded bg-muted/40 px-1 py-0.5";
};

const ratingPillClass = (rating: ReviewRating) => {
  if (rating === Rating.Again) return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  if (rating === Rating.Hard) return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300";
  if (rating === Rating.Good) return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300";
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
};

const ratingMarkClass = (rating: ReviewRating) => {
  if (rating === Rating.Again) return "cursor-pointer rounded border-b-2 border-red-400 bg-red-100 px-1 py-0.5 font-bold text-red-900 transition-all hover:bg-red-200 dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/30";
  if (rating === Rating.Hard) return "cursor-pointer rounded border-b-2 border-orange-400 bg-orange-100 px-1 py-0.5 font-bold text-orange-900 transition-all hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-100 dark:hover:bg-orange-500/30";
  if (rating === Rating.Good) return "cursor-pointer rounded border-b-2 border-green-400 bg-green-100 px-1 py-0.5 font-bold text-green-900 transition-all hover:bg-green-200 dark:bg-green-500/20 dark:text-green-100 dark:hover:bg-green-500/30";
  return "cursor-pointer rounded border-b-2 border-blue-400 bg-blue-100 px-1 py-0.5 font-bold text-blue-900 transition-all hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-100 dark:hover:bg-blue-500/30";
};

const cefrMarkClass = (cefr: string) => {
  if (cefr.startsWith("A")) return "cursor-pointer rounded border-b-2 border-green-300 bg-green-100/70 px-1 py-0.5 font-bold text-green-900 transition-all hover:bg-green-200/80 dark:bg-green-500/20 dark:text-green-100 dark:hover:bg-green-500/30";
  if (cefr.startsWith("B")) return "cursor-pointer rounded border-b-2 border-blue-300 bg-blue-100/70 px-1 py-0.5 font-bold text-blue-900 transition-all hover:bg-blue-200/80 dark:bg-blue-500/20 dark:text-blue-100 dark:hover:bg-blue-500/30";
  if (cefr.startsWith("C")) return "cursor-pointer rounded border-b-2 border-purple-300 bg-purple-100/70 px-1 py-0.5 font-bold text-purple-900 transition-all hover:bg-purple-200/80 dark:bg-purple-500/20 dark:text-purple-100 dark:hover:bg-purple-500/30";
  return "cursor-pointer rounded border-b-2 border-muted-foreground/30 bg-muted px-1 py-0.5 font-bold text-foreground transition-all";
};

export function WordSelection() {
  const [quotas, setQuotas] = useState<WordQuotas>({ reviewCount: 20, basicCount: 10, independentCount: 10, proficientCount: 1 });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isMobileWordsOpen, setIsMobileWordsOpen] = useState(false);
  const [isMobileStoryConfigOpen, setIsMobileStoryConfigOpen] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyMode>("multiple");
  const [words, setWords] = useState<SelectedWord[]>([]);
  const [selectionStats, setSelectionStats] = useState<SelectionStats | null>(null);
  const [difficulty, setDifficulty] = useState<CefrLevel>("B1");
  const [theme, setTheme] = useState("General");
  const [story, setStory] = useState("");
  const [activeSingleWordId, setActiveSingleWordId] = useState<number | null>(null);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  // New States for Batching and Undo
  const [pendingRatings, setPendingRatings] = useState<Record<number, ReviewRating>>({});
  const [syncedIds, setSyncedIds] = useState<Set<number>>(new Set());
  const [syncedRatings, setSyncedRatings] = useState<Record<number, ReviewRating>>({});

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
      setSyncedIds((prev) => {
        const next = new Set([...prev, ...submittedIds]);
        localStorage.setItem("syncedIds", JSON.stringify(Array.from(next)));
        return next;
      });
      setSyncedRatings((prev) => {
        const next = { ...prev };
        variables.forEach(({ wordId, rating }) => {
          next[wordId] = rating;
        });
        localStorage.setItem("syncedRatings", JSON.stringify(next));
        return next;
      });

      // Clear submitted from pending
      setPendingRatings(prev => {
        const next = { ...prev };
        variables.forEach(({ wordId, rating }) => {
          if (next[wordId] === rating) {
            delete next[wordId];
          }
        });
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
    const savedSyncedRatings = localStorage.getItem("syncedRatings");
    const savedWords = localStorage.getItem("currentWords");
    const savedSelectionStats = localStorage.getItem("currentSelectionStats");
    const savedSyncedIds = localStorage.getItem("syncedIds");
    const savedStory = localStorage.getItem("currentStory");
    const savedQuotas = localStorage.getItem("wordQuotas");
    const savedTheme = localStorage.getItem("currentTheme");
    const savedStudyMode = localStorage.getItem("wordStudyMode");
    const savedActiveSingleWordId = localStorage.getItem("activeSingleWordId");

    if (savedRatings) {
      try { setPendingRatings(parsePendingRatings(parseJson(savedRatings))); } catch (e) { console.error(e); }
    }
    if (savedSyncedRatings) {
      try { setSyncedRatings(parsePendingRatings(parseJson(savedSyncedRatings))); } catch (e) { console.error(e); }
    }
    if (savedWords) {
      try { setWords(uniqueSelectedWords(parseSelectedWords(parseJson(savedWords)))); } catch (e) { console.error(e); }
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
    if (savedStudyMode === "single" || savedStudyMode === "multiple") {
      setStudyMode(savedStudyMode);
    }
    if (savedActiveSingleWordId) {
      const numericId = Number(savedActiveSingleWordId);
      if (Number.isInteger(numericId)) setActiveSingleWordId(numericId);
    }
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    localStorage.setItem("currentTheme", theme);
  }, [hasLoadedStorage, theme]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    localStorage.setItem("wordStudyMode", studyMode);
  }, [hasLoadedStorage, studyMode]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    if (activeSingleWordId === null) {
      localStorage.removeItem("activeSingleWordId");
    } else {
      localStorage.setItem("activeSingleWordId", String(activeSingleWordId));
    }
  }, [activeSingleWordId, hasLoadedStorage]);

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
    if (Object.keys(syncedRatings).length > 0) {
      localStorage.setItem("syncedRatings", JSON.stringify(syncedRatings));
    } else {
      localStorage.removeItem("syncedRatings");
    }
  }, [hasLoadedStorage, syncedRatings]);

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
    setSyncedRatings({});
    setActiveSingleWordId(null);
    setExplanation(null);
    setExplanationWord(null);
    setFloatingMenu(null);
    setSelectionMenu(null);
    localStorage.removeItem("pendingRatings");
    localStorage.removeItem("currentWords");
    localStorage.removeItem("currentSelectionStats");
    localStorage.removeItem("syncedIds");
    localStorage.removeItem("syncedRatings");
    localStorage.removeItem("activeSingleWordId");
    localStorage.removeItem("currentStory");
  };

  const isWordRated = (word: SelectedWord) =>
    pendingRatings[word.id] !== undefined || syncedIds.has(word.id) || syncedRatings[word.id] !== undefined;

  const getUnratedWords = (wordList = words) =>
    wordList.filter(w => !isWordRated(w));

  const generateStoryForWords = (targetWords: SelectedWord[], mode: StudyMode) => {
    if (targetWords.length === 0) return;

    generateStoryMutation.mutate({
      words: targetWords.map((w) => w.text),
      difficulty,
      theme,
      mode,
    });
  };

  const pickRandomWord = (wordList: SelectedWord[]) => {
    if (wordList.length === 0) return null;
    return wordList[Math.floor(Math.random() * wordList.length)] ?? null;
  };

  const generateWords = async (clearExisting: boolean, modeOverride: StudyMode = studyMode) => {
    const totalRequested = quotas.reviewCount + quotas.basicCount + quotas.independentCount + quotas.proficientCount;
    if (totalRequested <= 0) {
      alert("Please set at least one word count to greater than 0.");
      setIsConfigOpen(true);
      return;
    }

    if (clearExisting) {
      clearGeneratedPractice();
    }

    try {
      const { data, error } = await generateQuery.refetch();
      if (error) {
        alert(`Word selection failed: ${error.message}`);
        return;
      }

      if (data) {
        const nextWords = uniqueSelectedWords(data.words);
      setWords(nextWords);
      setSelectionStats(data.stats);
      setStory("");
      setPendingRatings({});
      setSyncedIds(new Set());
      setSyncedRatings({});
      setExplanation(null);
      setExplanationWord(null);
      setActiveSingleWordId(null);
      localStorage.removeItem("pendingRatings");
      localStorage.removeItem("currentWords");
      localStorage.removeItem("currentSelectionStats");
      localStorage.removeItem("syncedIds");
      localStorage.removeItem("syncedRatings");
      localStorage.removeItem("activeSingleWordId");
      localStorage.removeItem("currentStory");
      setIsConfigOpen(false);

      if (nextWords.length === 0) {
        alert("No words were selected. Try increasing a quota or checking your word data.");
        return;
      }

      if (modeOverride === "single") {
        const nextWord = pickRandomWord(nextWords);
        if (nextWord) {
          setActiveSingleWordId(nextWord.id);
          generateStoryForWords([nextWord], "single");
        }
      } else {
        generateStoryForWords(nextWords, "multiple");
      }
      }
    } catch (error) {
      alert(`Word selection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleGenerate = () => {
    void generateWords(false);
  };

  const handleRegenerateWords = () => {
    if (studyMode === "single") {
      setStudyMode("multiple");
    }
    void generateWords(true, "multiple");
  };

  const unratedWords = getUnratedWords();
  const activeSingleWord = activeSingleWordId === null ? null : words.find((word) => word.id === activeSingleWordId) ?? null;

  const handleGenerateStory = () => {
    if (unratedWords.length === 0) return;

    if (studyMode === "single") {
      const nextWord = activeSingleWord && unratedWords.some((word) => word.id === activeSingleWord.id)
        ? activeSingleWord
        : pickRandomWord(unratedWords);

      if (!nextWord) return;
      setActiveSingleWordId(nextWord.id);
      generateStoryForWords([nextWord], "single");
      return;
    }

    generateStoryForWords(unratedWords, "multiple");
  };

  const handleModeChange = (mode: StudyMode) => {
    setStudyMode(mode);
    setStory("");
    setExplanation(null);
    setExplanationWord(null);
    setFloatingMenu(null);
    setSelectionMenu(null);

    if (mode === "single") {
      const nextWord = pickRandomWord(unratedWords);
      if (nextWord) {
        setActiveSingleWordId(nextWord.id);
        generateStoryForWords([nextWord], "single");
      }
      return;
    }

    setActiveSingleWordId(null);
    if (unratedWords.length > 0) {
      generateStoryForWords(unratedWords, "multiple");
    }
  };

  const handleRandomSingleWord = () => {
    const nextWord = pickRandomWord(unratedWords);
    if (!nextWord) return;
    setActiveSingleWordId(nextWord.id);
    generateStoryForWords([nextWord], "single");
  };

  const handleSelectSingleWord = (wordId: string | null) => {
    if (!wordId) return;
    const numericId = Number(wordId);
    const nextWord = unratedWords.find((word) => word.id === numericId);
    if (!nextWord) return;
    setActiveSingleWordId(nextWord.id);
    generateStoryForWords([nextWord], "single");
  };

  const handleReview = (wordId: number, rating: ReviewRating) => {
    if (syncedIds.has(wordId) || syncedRatings[wordId] !== undefined) return;

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
    const currentWordIds = new Set(words.map((word) => word.id));
    const entries = Object.entries(pendingRatings)
      .map(([id, rating]) => ({
        wordId: Number(id),
        rating,
      }))
      .filter(({ wordId }) => currentWordIds.has(wordId));

    if (entries.length === 0) return;

    const unratedCount = getUnratedWords().length;
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

  const ratedWordCount = words.filter(isWordRated).length;
  const pendingWordCount = words.filter((word) => pendingRatings[word.id] !== undefined).length;
  const syncedWordCount = words.filter((word) => syncedIds.has(word.id) || syncedRatings[word.id] !== undefined).length;
  const allSynced = words.length > 0 && syncedWordCount === words.length && pendingWordCount === 0;
  const hasPending = pendingWordCount > 0;
  const showExplanationPanel = explainMutation.isPending ? true : explanation !== null;
  const selectedWordGroups = CEFR_LEVELS.map((level) => ({
    level,
    words: words.filter((word) => word.cefr === level),
  })).filter((group) => group.words.length > 0);
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
      if (tagName === "u") {
        const rawWord = element.querySelector("mark[data-word]")?.getAttribute("data-word") ?? "";
        const word = allowedWords.get(rawWord.toLowerCase());
        const className = word ? cefrChunkClass(word.cefr) : "rounded bg-muted/30 px-1 py-0.5";
        return `<u class="${className}">${children}</u>`;
      }
      if (tagName === "mark") {
        const rawWord = element.getAttribute("data-word") ?? "";
        const word = allowedWords.get(rawWord.toLowerCase());
        if (!word) return children;

        const rating = pendingRatings[word.id] ?? syncedRatings[word.id];
        const isRated = syncedIds.has(word.id) || rating !== undefined;
        const ratedAttr = isRated ? ' data-rated="true"' : "";
        const ratingAttr = rating !== undefined ? ` data-rating="${rating}"` : "";
        const className = rating !== undefined ? ratingMarkClass(rating) : cefrMarkClass(word.cefr);
        return `<mark data-word="${escapeHtml(word.text)}"${ratedAttr}${ratingAttr} class="${className}">${children}</mark>`;
      }

      return children;
    };

    return Array.from(doc.body.childNodes).map(sanitizeNode).join("");
  };

  const selectionPanel = (
    <div className="space-y-3">
      <Card className="overflow-hidden border border-border shadow-sm">
        <CardHeader
          className="flex cursor-pointer flex-row items-center justify-between py-3 transition-colors hover:bg-muted/30"
          onClick={() => setIsConfigOpen(!isConfigOpen)}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-bold">Selection Config</CardTitle>
          </div>
          {isConfigOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </CardHeader>

        <div className={`transition-all duration-300 ease-in-out ${isConfigOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}>
          <CardContent className="pt-2 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="quota-review" className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Review</label>
                <Input
                  id="quota-review"
                  type="number"
                  value={quotas.reviewCount}
                  onChange={(e) => setQuotas({ ...quotas, reviewCount: Number(e.target.value) })}
                  className="h-9 border-orange-200 px-2 font-bold focus-visible:ring-orange-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="quota-basic" className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Basic</label>
                <Input
                  id="quota-basic"
                  type="number"
                  value={quotas.basicCount}
                  onChange={(e) => setQuotas({ ...quotas, basicCount: Number(e.target.value) })}
                  className="h-9 border-green-200 px-2 font-bold focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="quota-independent" className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Indep.</label>
                <Input
                  id="quota-independent"
                  type="number"
                  value={quotas.independentCount}
                  onChange={(e) => setQuotas({ ...quotas, independentCount: Number(e.target.value) })}
                  className="h-9 border-blue-200 px-2 font-bold focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="quota-proficient" className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Profic.</label>
                <Input
                  id="quota-proficient"
                  type="number"
                  value={quotas.proficientCount}
                  onChange={(e) => setQuotas({ ...quotas, proficientCount: Number(e.target.value) })}
                  className="h-9 border-purple-200 px-2 font-bold focus-visible:ring-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {!allSynced && !hasPending && (
        <Button className="h-11 w-full text-sm font-bold shadow-sm" onClick={handleGenerate} disabled={generateQuery.isFetching}>
          {generateQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
          {words.length > 0 ? "Regenerate Words" : "Generate Words"}
        </Button>
      )}

      {allSynced ? (
        <Button
          className="h-11 w-full border border-emerald-500/30 bg-emerald-500/15 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-500/25 dark:text-emerald-300"
          onClick={handleGenerate}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Everything Synced
        </Button>
      ) : hasPending && (
        <Button className="h-11 w-full bg-blue-600 text-sm font-bold shadow-sm hover:bg-blue-700" onClick={handleBatchSubmit} disabled={submitBatchReviewMutation.isPending}>
          {submitBatchReviewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Sync Progress ({pendingWordCount} words)
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
  );

  const wordListPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Selected Words ({ratedWordCount}/{words.length} rated)
        </h3>
        {words.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-2 px-3 text-xs font-bold"
            onClick={handleRegenerateWords}
            disabled={generateQuery.isFetching || generateStoryMutation.isPending}
          >
            {generateQuery.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Redraw
          </Button>
        )}
      </div>

      {selectedWordGroups.length > 0 ? (
        <div className="space-y-3">
          {selectedWordGroups.map((group) => (
            <div key={group.level} className="space-y-2">
              <div className={`w-fit rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${cefrPillClass(group.level)}`}>
                {group.level}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.words.map((word) => {
                  const rating = pendingRatings[word.id] ?? syncedRatings[word.id];
                  const isSynced = syncedIds.has(word.id);
                  return (
                    <button
                      key={word.id}
                      type="button"
                      className={`rounded border px-2.5 py-1 text-sm font-bold transition-colors ${rating !== undefined ? ratingPillClass(rating) : cefrPillClass(word.cefr)} ${isSynced ? "opacity-60" : ""}`}
                      onClick={() => {
                        if (studyMode !== "single" || rating !== undefined) return;
                        setActiveSingleWordId(word.id);
                        generateStoryForWords([word], "single");
                      }}
                    >
                      {word.text}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm font-medium text-muted-foreground">
          Generate words to start.
        </div>
      )}
    </div>
  );

  const storyControlsPanel = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={studyMode === "multiple" ? "default" : "outline"} className="h-9 text-xs font-bold sm:text-sm" onClick={() => handleModeChange("multiple")} disabled={generateStoryMutation.isPending}>
          multiply mode
        </Button>
        <Button type="button" variant={studyMode === "single" ? "default" : "outline"} className="h-9 text-xs font-bold sm:text-sm" onClick={() => handleModeChange("single")} disabled={generateStoryMutation.isPending}>
          single mode
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2">
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
        <Button onClick={handleGenerateStory} disabled={generateStoryMutation.isPending || unratedWords.length === 0} className="h-9 min-w-0 whitespace-nowrap px-4 font-bold shadow-sm">
          {generateStoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
          {studyMode === "single" ? "Regenerate Single" : `Regenerate Story (${unratedWords.length})`}
        </Button>
      </div>

      {studyMode === "single" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
          <Select value={activeSingleWord?.id ? String(activeSingleWord.id) : ""} onValueChange={handleSelectSingleWord} disabled={unratedWords.length === 0 || generateStoryMutation.isPending}>
            <SelectTrigger className="h-9 w-full border-muted-foreground/20 bg-background shadow-sm">
              <span className="flex flex-1 truncate text-left">
                {activeSingleWord?.text ?? "Choose an unrated word"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {unratedWords.map((word) => (
                <SelectItem key={word.id} value={String(word.id)}>{word.text}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" className="h-9 gap-2 px-4 text-xs font-bold" onClick={handleRandomSingleWord} disabled={unratedWords.length === 0 || generateStoryMutation.isPending}>
            <Shuffle className="h-4 w-4" />
            Random
          </Button>
        </div>
      )}
    </div>
  );

  const storyReader = (
    <div className="space-y-6">
      {generateStoryMutation.isPending ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted bg-muted/10 py-24 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold">Generating story...</p>
        </div>
      ) : story ? (
        <div
          ref={storyRef}
          className="prose prose-slate relative max-w-none cursor-text select-text overflow-visible rounded-lg border border-muted bg-background p-4 shadow-sm selection:bg-blue-200 selection:text-slate-950 dark:selection:bg-blue-400/70 dark:selection:text-white sm:p-6"
          onClick={(e) => {
            handleStoryClick(e);
          }}
          onMouseUp={handleStoryMouseUp}
        >
          <div
            dangerouslySetInnerHTML={{ __html: processedStory() }}
            className="[&_u]:cursor-help [&_u]:decoration-dashed [&_u]:underline-offset-4 font-sans text-base leading-relaxed text-foreground md:text-lg"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/5 py-24 text-muted-foreground">
          <BookOpen className="mb-4 h-12 w-12 opacity-20" />
          <p className="text-base font-semibold">Your story will appear here</p>
        </div>
      )}
    </div>
  );

  const explanationPanel = (
    <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between bg-primary/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">Contextual Explanation</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => {
          setExplanation(null);
          setExplanationWord(null);
        }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Explaining:</span>
            <span className="rounded-md border bg-background px-3 py-1 text-base font-bold text-foreground shadow-sm">
              {explanationWord}
            </span>
          </div>
          <div className="relative min-h-[96px] rounded-lg border border-primary/10 bg-background p-4 shadow-inner">
            {explainMutation.isPending ? (
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium text-muted-foreground animate-pulse">Consulting AI Linguist...</p>
              </div>
            ) : (
              <p className="text-base font-medium leading-relaxed text-foreground">
                {explanation}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative flex w-full min-h-0 flex-col gap-3 overflow-visible lg:grid lg:h-full lg:grid-cols-[320px_minmax(0,1fr)_340px] lg:items-stretch lg:gap-5 lg:overflow-hidden ${showExplanationPanel ? "pb-[48dvh] lg:pb-0" : ""}`} onClick={() => {
      setFloatingMenu(null);
      setSelectionMenu(null);
    }}>
      <div className="space-y-3 lg:hidden">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-lg border bg-card px-3 text-left text-sm font-bold shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileWordsOpen((value) => !value);
          }}
        >
          <span>Words & Selection ({ratedWordCount}/{words.length})</span>
          {isMobileWordsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {isMobileWordsOpen && (
          <div className="space-y-4 rounded-lg border bg-background p-3 shadow-sm">
            {selectionPanel}
            {wordListPanel}
          </div>
        )}

        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-lg border bg-card px-3 text-left text-sm font-bold shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileStoryConfigOpen((value) => !value);
          }}
        >
          <span>Story Config</span>
          {isMobileStoryConfigOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {isMobileStoryConfigOpen && (
          <div className="rounded-lg border bg-background p-3 shadow-sm">
            {storyControlsPanel}
          </div>
        )}
      </div>

      <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto border-r border-border/70 pr-4 lg:flex scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {selectionPanel}
        {wordListPanel}
      </aside>

      <main className="min-h-0 overflow-visible lg:overflow-y-auto lg:pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {storyReader}
      </main>

      <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto border-l border-border/70 pl-4 lg:flex scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {showExplanationPanel && explanationPanel}
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          {storyControlsPanel}
        </div>
      </aside>

      {showExplanationPanel && (
        <div className="fixed inset-x-0 bottom-0 z-[90] max-h-[52dvh] overflow-y-auto rounded-t-2xl border border-primary/20 bg-background p-3 shadow-2xl lg:hidden" onClick={(e) => e.stopPropagation()}>
          {explanationPanel}
        </div>
      )}

      <div className="contents">
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
      </div>
    </div>
  );
}
