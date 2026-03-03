import { MessageCircle, Play, CircleDollarSign } from "lucide-react";

type Tab = "chat" | "shorts" | "matka";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof MessageCircle; emoji: string }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle, emoji: "💬" },
  { id: "shorts", label: "Shorts", icon: Play, emoji: "📱" },
  { id: "matka", label: "Matka", icon: CircleDollarSign, emoji: "🏺" },
];

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-card border-t border-border flex">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
              isActive
                ? "text-secondary"
                : "text-muted-foreground"
            }`}
          >
            <span className="text-lg">{tab.emoji}</span>
            <span className={`text-xs font-medium ${isActive ? "font-semibold" : ""}`}>
              {tab.label}
            </span>
            {isActive && (
              <div className="absolute top-0 w-12 h-0.5 bg-secondary rounded-b-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
