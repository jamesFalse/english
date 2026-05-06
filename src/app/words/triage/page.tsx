"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Search, CheckCircle2, ChevronLeft, Filter } from "lucide-react";
import Link from "next/link";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function TriagePage() {
  const [search, setSearch] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [syncProgress, setSyncProgress] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const utils = api.useUtils();
  const { data, isLoading } = api.word.getNewWords.useQuery({
    search,
    cefr: selectedLevels,
    page,
    pageSize,
  });

  const words = data?.items;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const triageMutation = api.word.bulkMarkAsKnown.useMutation({
    onMutate: () => {
      setSyncProgress(10);
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev === null || prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);
      return { interval };
    },
    onSuccess: (res) => {
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(null), 500);
      setSelectedIds(new Set());
      void utils.word.getNewWords.invalidate();
    },
    onError: (err) => {
      setSyncProgress(null);
      alert(`Error: ${err.message}`);
    },
  });

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
    setPage(1); // Reset to first page on filter change
  };

  const toggleWord = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (!words) return;
    if (selectedIds.size === words.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(words.map(w => w.id)));
    }
  };

  const toggleRow = (rowWords: typeof words) => {
    if (!rowWords) return;
    const rowIds = rowWords.map(w => w.id);
    const allSelected = rowIds.every(id => selectedIds.has(id));
    
    const next = new Set(selectedIds);
    if (allSelected) {
      rowIds.forEach(id => next.delete(id));
    } else {
      rowIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleBulkSubmit = () => {
    if (selectedIds.size === 0) return;
    triageMutation.mutate({ wordIds: Array.from(selectedIds) });
  };

  // Group words into rows of 5
  const rows = [];
  if (words) {
    for (let i = 0; i < words.length; i += 5) {
      rows.push(words.slice(i, i + 5));
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {syncProgress !== null && (
          <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out" 
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/words" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Back to Learning
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight">Vocabulary <span className="text-blue-600">Triage</span></h1>
            <p className="text-muted-foreground text-sm">Clear out words you already know. {totalCount > 0 && `Showing ${totalCount} words total.`}</p>
          </div>
          
          {selectedIds.size > 0 && (
            <Button 
              onClick={handleBulkSubmit} 
              disabled={triageMutation.isPending}
              className="bg-green-600 hover:bg-green-700 font-bold shadow-lg h-12 px-6 min-w-[200px]"
            >
              {triageMutation.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-5 w-5" />
              )}
              Sync {selectedIds.size} Words
            </Button>
          )}
        </header>

        <Card className="border-2 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search words..." 
                  value={search} 
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-11"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CEFR_LEVELS.map(level => (
                  <Button
                    key={level}
                    variant={selectedLevels.includes(level) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleLevel(level)}
                    className="h-11 px-4 font-bold"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Scanning dictionary...</p>
              </div>
            ) : words && words.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                      checked={words.length > 0 && selectedIds.size === words.length}
                      onChange={toggleAll}
                    />
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      Select All on Page ({words.length})
                    </span>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                </div>

                <div className="space-y-3">
                  {rows.map((row, rowIdx) => {
                    const allInRowSelected = row.every(w => selectedIds.has(w.id));
                    return (
                      <div key={rowIdx} className="flex items-center gap-4 group">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 flex-1 gap-3">
                          {row.map(word => (
                            <div 
                              key={word.id}
                              onClick={() => toggleWord(word.id)}
                              className={`
                                relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                                ${selectedIds.has(word.id) 
                                  ? "bg-blue-50 border-blue-500 shadow-sm" 
                                  : "bg-card border-muted hover:border-blue-200 hover:bg-blue-50/30"}
                              `}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className={`font-bold truncate ${selectedIds.has(word.id) ? "text-blue-700" : "text-foreground"}`}>
                                  {word.text}
                                </span>
                                <span className="text-[10px] font-black opacity-50 uppercase">{word.cefr}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0 p-2 rounded-lg bg-muted/30 border border-transparent group-hover:border-muted group-hover:bg-muted/50 transition-all">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Row</span>
                          <input 
                            type="checkbox" 
                            checked={allInRowSelected}
                            onChange={() => toggleRow(row)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-6 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === 1}
                      className="font-bold"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 mx-4">
                      {(() => {
                        const maxVisible = 5;
                        let start = Math.max(1, page - Math.floor(maxVisible / 2));
                        const end = Math.min(totalPages, start + maxVisible - 1);
                        
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }

                        const pages = [];
                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        return pages.map(pageNum => (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => {
                              setPage(pageNum);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-9 h-9 font-bold ${page === pageNum ? "" : "text-muted-foreground"}`}
                          >
                            {pageNum}
                          </Button>
                        ));
                      })()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === totalPages}
                      className="font-bold"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 border-2 border-dashed rounded-xl">
                <Filter className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-xl font-bold text-muted-foreground">No new words found</p>
                <p className="text-sm text-muted-foreground/60">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
