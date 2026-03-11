import { Menu } from "lucide-react";

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  return (
    <header className="lg:hidden h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-md hover:bg-accent text-foreground transition-colors"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold text-foreground">NEBU</span>
      </div>
    </header>
  );
};
