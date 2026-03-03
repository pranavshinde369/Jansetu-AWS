import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ChatModule from "@/components/ChatModule";
import ShortsModule from "@/components/ShortsModule";
import MatkaModule from "@/components/MatkaModule";

type Tab = "chat" | "shorts" | "matka";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="flex justify-center min-h-screen bg-foreground/5">
      {/* Phone container */}
      <div className="w-full max-w-[480px] h-screen flex flex-col relative bg-card shadow-2xl">
        <Header
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          activeTab={activeTab}
        />

        {/* Content area */}
        <main className="flex-1 overflow-hidden pt-[52px] pb-[60px]">
          {activeTab === "chat" && <ChatModule isMuted={isMuted} />}
          {activeTab === "shorts" && <ShortsModule />}
          {activeTab === "matka" && <MatkaModule />}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default Index;
