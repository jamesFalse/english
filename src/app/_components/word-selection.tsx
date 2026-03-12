"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Volume2, Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Rating } from "ts-fsrs";

const cefrColor = (cefr: string) => {
  if (cefr.startsWith("A")) return "text-green-500";
  if (cefr.startsWith("B")) return "text-blue-500";
  if (cefr.startsWith("C")) return "text-purple-500";
  return "text-gray-500";
};

export function WordSelection() {
  const [quotas, setQuotas] = useState({ basic: 30, independent: 30, proficient: 40 });
  const [words, setWords] = useState<any[]>([]);
  const [difficulty, setDifficulty] = useState("B1");
  const [story, setStory] = useState("");
  const [reviewedWords, setReviewedWords] = useState<Record<number, boolean>>({});

  const utils = api.useUtils();
  const generateQuery = api.word.generateSelection.useQuery(
    quotas,
    { enabled: false }
  );

  const generateStoryMutation = api.word.generateStory.useMutation({
    onSuccess: (data) => {
      setStory(data);
    },
  });

  const submitReviewMutation = api.word.submitReview.useMutation({
    onSuccess: (_, variables) => {
      setReviewedWords((prev) => ({ ...prev, [variables.wordId]: true }));
    },
  });

  const handleGenerate = async () => {
    const { data } = await generateQuery.refetch();
    if (data) {
      setWords(data);
      setStory("");
      setReviewedWords({});
    }
  };

  const handleGenerateStory = () => {
    if (words.length === 0) return;
    generateStoryMutation.mutate({
      words: words.map((w) => w.text),
      difficulty,
    });
  };

  const handleReview = (wordId: number, rating: Rating) => {
    submitReviewMutation.mutate({ wordId, rating });
  };

  const playTTS = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-4xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Word Selection Quotas (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Basic (A1/A2)</label>
              <Input
                type="number"
                value={quotas.basic}
                onChange={(e) => setQuotas({ ...quotas, basic: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Independent (B1/B2)</label>
              <Input
                type="number"
                value={quotas.independent}
                onChange={(e) => setQuotas({ ...quotas, independent: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Proficient (C1/C2)</label>
              <Input
                type="number"
                value={quotas.proficient}
                onChange={(e) => setQuotas({ ...quotas, proficient: Number(e.target.value) })}
              />
            </div>
          </div>
          <Button 
            className="mt-6 w-full" 
            onClick={handleGenerate}
            disabled={generateQuery.isFetching}
          >
            {generateQuery.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate 30 Words
          </Button>
        </CardContent>
      </Card>

      {words.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {words.map((word) => (
              <Card key={word.id} className={`hover:shadow-md transition-shadow relative ${reviewedWords[word.id] ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className={`text-2xl font-bold ${cefrColor(word.cefr)}`}>
                        {word.text}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary w-fit mt-1">
                        {word.cefr}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playTTS(word.text)}>
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      {reviewedWords[word.id] && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    </div>
                  </div>

                  {!reviewedWords[word.id] && (
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-[10px] px-1 bg-red-50 hover:bg-red-100 hover:text-red-700 border-red-200"
                        onClick={() => handleReview(word.id, Rating.Again)}
                      >
                        Again
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-[10px] px-1 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 border-orange-200"
                        onClick={() => handleReview(word.id, Rating.Hard)}
                      >
                        Hard
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-[10px] px-1 bg-green-50 hover:bg-green-100 hover:text-green-700 border-green-200"
                        onClick={() => handleReview(word.id, Rating.Good)}
                      >
                        Good
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-[10px] px-1 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 border-blue-200"
                        onClick={() => handleReview(word.id, Rating.Easy)}
                      >
                        Easy
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AI Story Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">Story Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGenerateStory} 
                  disabled={generateStoryMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {generateStoryMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BookOpen className="mr-2 h-4 w-4" />
                  )}
                  Generate Story
                </Button>
              </div>

              {story && (
                <div className="mt-6 p-6 bg-secondary/30 rounded-lg prose prose-blue max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: story.replace(/\n/g, "<br />")
                    }} 
                    className="[&>mark]:bg-yellow-200 [&>mark]:px-1 [&>mark]:rounded [&>mark]:font-bold text-lg leading-relaxed"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
