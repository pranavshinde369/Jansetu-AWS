import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Send, FileDown, Loader2 } from "lucide-react";
import type { SpeechRecognitionInstance } from "@/types/speech.d";

interface Message {
  role: "user" | "assistant";
  content: string;
  pdfUrl?: string;
  audioUrl?: string;
}

interface ChatModuleProps {
  isMuted: boolean;
}

const ChatModule = ({ isMuted }: ChatModuleProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "नमस्ते! मैं आरती मित्र हूँ। मैं आपकी सरकारी योजनाओं में मदद कर सकती हूँ। बताइए, आपको किस चीज़ में मदद चाहिए?" },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const lastPlayedAudioRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speakText = useCallback((text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find((v) => v.lang === "hi-IN");
    const indianEnglish = voices.find((v) => v.lang === "en-IN");
    if (hindiVoice) utterance.voice = hindiVoice;
    else if (indianEnglish) utterance.voice = indianEnglish;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/saathi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: newHistory.map((m) => ({ role: m.role, content: m.content })),
          new_message: text.trim(),
        }),
      });
      const data = await res.json();
      const aiMsg: Message = {
        role: "assistant",
        content: data.ai_reply || "माफ़ कीजिए, कुछ गड़बड़ हो गई।",
        pdfUrl: data.ready_for_pdf && data.pdf_download_url ? data.pdf_download_url : undefined,
        audioUrl: data.audio_url,
      };
      setMessages((prev) => [...prev, aiMsg]);
      // Fallback to browser TTS only if server-side audio is not available
      if (!aiMsg.audioUrl) {
        speakText(aiMsg.content);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ सर्वर से कनेक्ट नहीं हो पा रहा। कृपया बाद में प्रयास करें।" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      // Immediately send the spoken text as a user message
      sendMessage(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // Auto-play latest AI audio message when it arrives (if browser allows)
  useEffect(() => {
    const lastWithAudio = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.audioUrl);
    if (!lastWithAudio || !lastWithAudio.audioUrl) return;

    const resolvedUrl = lastWithAudio.audioUrl.startsWith("http")
      ? lastWithAudio.audioUrl
      : `http://127.0.0.1:8000${lastWithAudio.audioUrl}`;

    if (lastPlayedAudioRef.current === resolvedUrl) return;
    lastPlayedAudioRef.current = resolvedUrl;

    try {
      const audio = new Audio(resolvedUrl);
      // Auto-play best-effort; some browsers may block without user gesture
      audio.play().catch(() => {
        // Silently fail; user can still tap play on the audio controls
      });
    } catch {
      // Ignore auto-play errors
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto chat-bg-pattern px-3 py-4 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-wa-bubble-user text-foreground rounded-br-none"
                  : "bg-wa-bubble-ai text-foreground rounded-bl-none"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.audioUrl && (
                <audio
                  controls
                  className="mt-2 w-full"
                  src={msg.audioUrl.startsWith("http") ? msg.audioUrl : `http://127.0.0.1:8000${msg.audioUrl}`}
                />
              )}
              {msg.pdfUrl && (
                <a
                  href={msg.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <FileDown size={16} />
                  📄 Download Application PDF
                </a>
              )}
              <span className="text-[10px] text-muted-foreground mt-1 block text-right">
                {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-wa-bubble-ai px-4 py-3 rounded-lg rounded-bl-none shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-card border-t border-border px-3 py-2 flex items-center gap-2">
        <button
          onClick={toggleListening}
          className={`p-3 rounded-full transition-all ${
            isListening
              ? "bg-destructive text-destructive-foreground mic-pulsing"
              : "bg-secondary text-secondary-foreground hover:opacity-90"
          }`}
          aria-label="Voice input"
        >
          <Mic size={20} />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="टाइप करें..."
          className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          className="p-3 rounded-full bg-secondary text-secondary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
          aria-label="Send message"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
};

export default ChatModule;
