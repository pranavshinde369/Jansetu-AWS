import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronDown, Target, Lightbulb } from "lucide-react";

interface PotData {
  ghar: number;
  kaam: number;
  bhavishya: number;
  aapatkalin: number;
}

interface MatkaResult {
  pots: PotData;
  ai_advice: string;
  goal_tips: string;
}

type PotKey = "ghar" | "kaam" | "bhavishya" | "aapatkalin";

const SOURCES = ["Farming", "Daily Wage", "Small Business", "Government Job", "Private Job", "Others"];

const AnimatedNumber = ({ target, duration = 1500 }: { target: number; duration?: number }) => {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);

  return <span>₹{value.toLocaleString("en-IN")}</span>;
};

const Pot = ({ label, emoji, amount, colorClass }: { label: string; emoji: string; amount: number; colorClass: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className={`w-20 h-20 rounded-full ${colorClass} flex items-center justify-center shadow-lg count-animate`}>
      <span className="text-2xl">{emoji}</span>
    </div>
    <span className="text-xs font-bold text-foreground">{label}</span>
    <span className="text-sm font-bold text-foreground">
      <AnimatedNumber target={amount} />
    </span>
  </div>
);

const MatkaModule = () => {
  const [income, setIncome] = useState(10000);
  const [source, setSource] = useState("");
  const [goal, setGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MatkaResult | null>(null);
  const [activePot, setActivePot] = useState<PotKey>("ghar");
  const [savingsTarget, setSavingsTarget] = useState<number>(50000);

  const calculate = async () => {
    if (!source) return;
    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/finance/matka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_income: income,
          primary_source: source,
          family_size: 4,
          financial_goal: goal || "General savings",
        }),
      });
      const data = await res.json();

      // Backend contract:
      // {
      //   ai_advice: string,
      //   matkas: {
      //     ghar_ka_matka,
      //     kaam_ka_matka,
      //     bhavishya_ka_matka,
      //     aapatkalin_matka
      //   },
      //   goal_tips: [ ... ] | string
      // }
      let pots: PotData;

      if (data.matkas) {
        pots = {
          ghar: Math.round(data.matkas.ghar_ka_matka ?? 0),
          kaam: Math.round(data.matkas.kaam_ka_matka ?? 0),
          bhavishya: Math.round(data.matkas.bhavishya_ka_matka ?? 0),
          aapatkalin: Math.round(data.matkas.aapatkalin_matka ?? 0),
        };
      } else {
        // Fallback split if model doesn't return matkas properly
        const g = Math.round(income * 0.5);
        const k = Math.round(income * 0.2);
        const b = Math.round(income * 0.2);
        const e = income - (g + k + b);
        pots = { ghar: g, kaam: k, bhavishya: b, aapatkalin: e };
      }

      const advice =
        typeof data.ai_advice === "string" && data.ai_advice.trim().length > 0
          ? data.ai_advice
          : `₹${income.toLocaleString(
              "en-IN"
            )} की मासिक आय के साथ, अपने खर्चों को 4 मटकों में बाँटें। पहले ज़रूरी ख़र्च, फिर बचत और आपातकालीन फंड।`;

      const goalTipsText = Array.isArray(data.goal_tips)
        ? data.goal_tips.join(" ")
        : typeof data.goal_tips === "string"
        ? data.goal_tips
        : goal
        ? `"${goal}" के लिए हर महीने थोड़ा-थोड़ा अलग रखें ताकि समय पर लक्ष्य पूरा हो सके।`
        : "एक छोटा सा लक्ष्य चुनें और हर महीने उसके लिए अलग से रकम निकालें।";

      setResult({
        pots,
        ai_advice: advice,
        goal_tips: goalTipsText,
      });
    } catch {
      // Network / model fallback demo data
      const g = Math.round(income * 0.5);
      const k = Math.round(income * 0.2);
      const b = Math.round(income * 0.2);
      const e = income - (g + k + b);
      setResult({
        pots: { ghar: g, kaam: k, bhavishya: b, aapatkalin: e },
        ai_advice: `₹${income.toLocaleString(
          "en-IN"
        )} की मासिक आय के साथ, अपने खर्चों को 4 मटकों में बाँटें। सबसे पहले ज़रूरतें पूरी करें, फिर बचत और आपातकालीन फंड बनाएं।`,
        goal_tips: goal
          ? `"${goal}" के लिए हर महीने ₹${b.toLocaleString(
              "en-IN"
            )} अलग रखें। धीरे-धीरे बड़ी रकम तैयार हो जाएगी।`
          : "एक लक्ष्य तय करें ताकि बेहतर योजना बन सके।",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-card px-4 py-5">
      <div className="text-center mb-5">
        <span className="text-4xl">🏺</span>
        <h2 className="text-lg font-bold text-foreground mt-1">Matka Financial Planner</h2>
        <p className="text-xs text-muted-foreground">अपनी आय को समझदारी से बाँटें</p>
      </div>

      {/* Income slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-medium text-muted-foreground">Monthly Income</label>
          <span className="text-sm font-bold text-secondary">₹{income.toLocaleString("en-IN")}</span>
        </div>
        <input
          type="range"
          min={1000}
          max={50000}
          step={500}
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-secondary"
          style={{ accentColor: "hsl(var(--wa-teal))" }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>₹1,000</span>
          <span>₹50,000</span>
        </div>
      </div>

      {/* Source dropdown */}
      <div className="mb-4 relative">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Primary Source</label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm appearance-none outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>Select source</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-8 text-muted-foreground pointer-events-none" />
      </div>

      {/* Goal input */}
      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Financial Goal</label>
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g., बच्चों की पढ़ाई"
          className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Calculate button */}
      <button
        onClick={calculate}
        disabled={!source || isLoading}
        className="w-full bg-secondary text-secondary-foreground py-3 rounded-lg font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Target size={18} />}
        {isLoading ? "Calculating..." : "Calculate Plan"}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-5 count-animate">
          {/* Pots grid */}
          <div className="grid grid-cols-2 gap-5 place-items-center">
            <button type="button" className="focus:outline-none" onClick={() => setActivePot("ghar")}>
              <Pot
                label="घर (Home)"
                emoji="🏠"
                amount={result.pots.ghar}
                colorClass={`bg-pot-ghar ${
                  activePot === "ghar" ? "ring-2 ring-secondary ring-offset-2" : ""
                }`}
              />
            </button>
            <button type="button" className="focus:outline-none" onClick={() => setActivePot("kaam")}>
              <Pot
                label="काम (Work)"
                emoji="🔧"
                amount={result.pots.kaam}
                colorClass={`bg-pot-kaam ${
                  activePot === "kaam" ? "ring-2 ring-secondary ring-offset-2" : ""
                }`}
              />
            </button>
            <button
              type="button"
              className="focus:outline-none"
              onClick={() => setActivePot("bhavishya")}
            >
              <Pot
                label="भविष्य (Future)"
                emoji="🌱"
                amount={result.pots.bhavishya}
                colorClass={`bg-pot-bhavishya ${
                  activePot === "bhavishya" ? "ring-2 ring-secondary ring-offset-2" : ""
                }`}
              />
            </button>
            <button
              type="button"
              className="focus:outline-none"
              onClick={() => setActivePot("aapatkalin")}
            >
              <Pot
                label="आपातकालीन (Emergency)"
                emoji="🛡️"
                amount={result.pots.aapatkalin}
                colorClass={`bg-pot-emergency ${
                  activePot === "aapatkalin" ? "ring-2 ring-secondary ring-offset-2" : ""
                }`}
              />
            </button>
          </div>

          {/* Percentage breakdown bar */}
          <div className="space-y-2">
            {(() => {
              const total =
                result.pots.ghar +
                result.pots.kaam +
                result.pots.bhavishya +
                result.pots.aapatkalin || 1;
              const pct = (v: number) => Math.round((v / total) * 100);
              return (
                <>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="h-full bg-pot-ghar"
                      style={{ width: `${pct(result.pots.ghar)}%` }}
                    />
                    <div
                      className="h-full bg-pot-kaam"
                      style={{ width: `${pct(result.pots.kaam)}%` }}
                    />
                    <div
                      className="h-full bg-pot-bhavishya"
                      style={{ width: `${pct(result.pots.bhavishya)}%` }}
                    />
                    <div
                      className="h-full bg-pot-emergency"
                      style={{ width: `${pct(result.pots.aapatkalin)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>घर: {pct(result.pots.ghar)}%</span>
                    <span>काम: {pct(result.pots.kaam)}%</span>
                    <span>भविष्य: {pct(result.pots.bhavishya)}%</span>
                    <span>आपातकालीन: {pct(result.pots.aapatkalin)}%</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Goal timeline / projection */}
          {goal && result.pots.bhavishya > 0 && (
            <div className="bg-card rounded-xl p-4 border border-dashed border-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Goal Timeline</h4>
                  <p className="text-[11px] text-muted-foreground">
                    देखें कि आपका <span className="font-semibold">भविष्य मटका</span> कितने समय में लक्ष्य तक पहुँचा सकता है।
                  </p>
                </div>
                <span className="text-lg">📅</span>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Target Amount for "{goal || "goal"}"
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={savingsTarget}
                    onChange={(e) => setSavingsTarget(Math.max(1000, Number(e.target.value) || 0))}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs font-semibold text-secondary whitespace-nowrap">
                    ₹
                  </span>
                </div>
                {(() => {
                  const perMonth = result.pots.bhavishya || 1;
                  const months = Math.ceil(savingsTarget / perMonth);
                  const years = Math.floor(months / 12);
                  const remMonths = months % 12;
                  return (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      अगर आप <span className="font-semibold">भविष्य मटके</span> में हर महीने{" "}
                      <span className="font-semibold">
                        ₹{perMonth.toLocaleString("en-IN")}
                      </span>{" "}
                      रखते हैं, तो{" "}
                      <span className="font-semibold">
                        ₹{savingsTarget.toLocaleString("en-IN")}
                      </span>{" "}
                      जमा करने में लगभग{" "}
                      <span className="font-semibold">
                        {years > 0 && `${years} साल `}
                        {remMonths} महीने
                      </span>{" "}
                      लगेंगे।
                    </p>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Active pot explanation + advisor note */}
          <div className="bg-muted rounded-xl p-4 border border-border space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={16} className="text-secondary" />
                <h3 className="text-sm font-bold">
                  {activePot === "ghar" && "घर का मटका - रोज़मर्रा की ज़रूरतें"}
                  {activePot === "kaam" && "काम का मटका - रोज़गार और खेती"}
                  {activePot === "bhavishya" && "भविष्य का मटका - आपके सपने"}
                  {activePot === "aapatkalin" && "आपातकालीन मटका - मुसीबत के दिन"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activePot === "ghar" &&
                  "इस हिस्से से घर का किराया, राशन, बच्चों की बुनियादी ज़रूरतें और दवाई जैसे ज़रूरी ख़र्च पूरे करें।"}
                {activePot === "kaam" &&
                  "ये रकम आपके काम या खेती में दोबारा लगाने के लिए है—बीज, खाद, डीज़ल, मशीन की मरम्मत या छोटा व्यापार बढ़ाने के लिए।"}
                {activePot === "bhavishya" &&
                  "यहीं से आपके बड़े सपने पूरे होंगे—बच्चों की पढ़ाई, नया सामान, या कोई बड़ा लक्ष्य जिसके लिए आप प्लान बना रहे हैं।"}
                {activePot === "aapatkalin" &&
                  "ये मटका सिर्फ इमरजेंसी के लिए है—अचानक बीमारी, काम रुक जाना, या कोई और मुश्किल समय। इसे जितना हो सके, छूएं मत।"}
              </p>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={16} className="text-secondary" />
                <h4 className="text-xs font-bold">Advisor Note</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {result.ai_advice}
              </p>
              {result.goal_tips && (
                <p className="text-xs text-secondary font-medium">{result.goal_tips}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatkaModule;
