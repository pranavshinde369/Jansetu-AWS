import { useEffect, useState } from "react";
import { Loader2, BookOpen, CheckCircle, XCircle } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface ShortItem {
  video_url: string;
  title: string;
  quiz: QuizQuestion[];
}

// Normalize YouTube URLs (Shorts or watch) into strict embeddable URLs.
const getEmbedUrl = (url: string): string => {
  try {
    if (!url) return "";

    // Strip query params early
    const base = url.split("?")[0];

    // Extract video ID from /shorts/ path
    const shortsMatch = base.match(/youtube\.com\/shorts\/([^/]+)/);
    if (shortsMatch && shortsMatch[1]) {
      const videoId = shortsMatch[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Extract video ID from /watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^?&/]+)/);
    if (watchMatch && watchMatch[1]) {
      const videoId = watchMatch[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Ensure https and /embed/ format if already an embed URL
    if (base.includes("/embed/")) {
      const normalized = base.startsWith("http") ? base : `https://${base.replace(/^\/\//, "")}`;
      return normalized;
    }

    // Fallback: best-effort https URL
    return url.startsWith("http") ? url : `https://${url.replace(/^\/\//, "")}`;
  } catch {
    return url;
  }
};

const ShortsModule = () => {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Auto-fetch shorts once on mount, like a Shorts feed
  useEffect(() => {
    let isCancelled = false;

    const fetchShorts = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/education/learn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ occupation: "user" }),
        });
        const data = await res.json();
        if (!isCancelled) {
          // Normalise backend payload:
          // Backend shape: { intro_message, videos: [{ title, youtube_url, ... }], quiz: [{ question, options, correct_answer, ... }] }
          let normalized: ShortItem[] = [];

          if (Array.isArray(data.shorts) && data.shorts.length) {
            // Already in the expected ShortItem shape
            normalized = data.shorts;
          } else if (Array.isArray(data.videos)) {
            const rawQuiz = Array.isArray(data.quiz) ? data.quiz : [];
            const quiz: QuizQuestion[] = rawQuiz.map((q: any) => ({
              question: q.question,
              options: q.options,
              answer: q.correct_answer,
            }));

            normalized = data.videos.map((v: any, idx: number) => ({
              video_url: v.youtube_url || v.video_url || "",
              title: v.title || `Video ${idx + 1}`,
              quiz,
            }));
          }

          // If the model didn't return usable data, fall back to a safe demo short + quiz
          if (!normalized.length) {
            normalized = [
              {
                video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                title: "Demo: Financial Literacy",
                quiz: [
                  {
                    question: "बचत क्यों ज़रूरी है?",
                    options: ["भविष्य के लिए", "दिखावे के लिए", "खर्च करने के लिए", "कोई फायदा नहीं"],
                    answer: "भविष्य के लिए",
                  },
                ],
              },
            ];
          }

          setShorts(normalized);
        }
      } catch {
        if (!isCancelled) {
          setShorts([
            {
              video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              title: "Demo: Financial Literacy",
              quiz: [
                {
                  question: "बचत क्यों ज़रूरी है?",
                  options: ["भविष्य के लिए", "दिखावे के लिए", "खर्च करने के लिए", "कोई फायदा नहीं"],
                  answer: "भविष्य के लिए",
                },
              ],
            },
          ]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchShorts();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleAnswer = (questionKey: string, option: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionKey]: option }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-card">
        <Loader2 size={32} className="animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-foreground">
      <div className="h-full w-full relative">
        {shorts.map((short, idx) => (
          <div
            key={idx}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Video */}
            <iframe
              src={getEmbedUrl(short.video_url) + "?autoplay=0&controls=1"}
              className="w-full h-full object-cover"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={short.title}
            />

            {/* Title overlay */}
            <div className="absolute bottom-20 left-4 right-4 z-10 pointer-events-none">
              <p className="text-primary-foreground text-sm font-semibold drop-shadow-lg">
                {short.title}
              </p>
            </div>

            {/* Quiz button */}
            <button
              onClick={() => setActiveQuiz(activeQuiz === idx ? null : idx)}
              className="absolute bottom-4 right-4 z-10 bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg hover:opacity-90 transition-opacity"
            >
              <BookOpen size={14} />
              Test Knowledge
            </button>

            {/* Quiz overlay */}
            {activeQuiz === idx && (
              <div className="absolute inset-0 z-20 flex items-end">
                <div
                  className="absolute inset-0 bg-foreground/60"
                  onClick={() => setActiveQuiz(null)}
                />
                <div className="relative w-full bg-card rounded-t-2xl p-5 max-h-[70%] overflow-y-auto slide-up">
                  <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
                  <h3 className="font-bold text-base mb-4">📝 Quiz Time</h3>
                  {short.quiz.map((q, qi) => {
                    const key = `${idx}-${qi}`;
                    const selected = selectedAnswers[key];
                    return (
                      <div key={qi} className="mb-5">
                        <p className="text-sm font-medium mb-2">{q.question}</p>
                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const isSelected = selected === opt;
                            const isCorrect = opt === q.answer;
                            const showResult = !!selected;
                            return (
                              <button
                                key={opt}
                                onClick={() => !selected && handleAnswer(key, opt)}
                                disabled={!!selected}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-between ${
                                  showResult && isCorrect
                                    ? "border-accent bg-accent/10 text-accent"
                                    : showResult && isSelected && !isCorrect
                                      ? "border-destructive bg-destructive/10 text-destructive"
                                      : "border-border hover:border-secondary"
                                }`}
                              >
                                {opt}
                                {showResult && isCorrect && <CheckCircle size={16} />}
                                {showResult && isSelected && !isCorrect && <XCircle size={16} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShortsModule;
