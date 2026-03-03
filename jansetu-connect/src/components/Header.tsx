import { Volume2, VolumeX } from "lucide-react";

interface HeaderProps {
  isMuted: boolean;
  onToggleMute: () => void;
  activeTab: string;
}

const Header = ({ isMuted, onToggleMute, activeTab }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md">
      <h1 className="text-lg font-bold tracking-wide">🙏 JanSetu</h1>
      <div className="flex items-center gap-2">
        {activeTab === "chat" && (
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-full hover:bg-secondary transition-colors"
            aria-label={isMuted ? "Unmute AI voice" : "Mute AI voice"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        )}
        <span className="text-xs opacity-80">AI सहायक</span>
      </div>
    </header>
  );
};

export default Header;
