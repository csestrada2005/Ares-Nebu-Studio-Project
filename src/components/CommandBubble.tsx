import { useState, useRef, useEffect, useCallback } from "react";
import { Flame } from "lucide-react";

const SESSION_KEY = 'forge_bubble_pos';

interface CommandBubbleProps {
  onClick: () => void;
}

export const CommandBubble = ({ onClick }: CommandBubbleProps) => {
  const getDefaultPos = () => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }
    // Default: bottom-right on mobile, top-right on desktop
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      return { x: window.innerWidth - 64, y: window.innerHeight - 112 };
    }
    return { x: window.innerWidth - 64, y: 72 };
  };

  const [pos, setPos] = useState<{ x: number; y: number }>(getDefaultPos);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startMouseRef = useRef<{ x: number; y: number } | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const clampPos = useCallback((x: number, y: number) => ({
    x: clamp(x, 10, window.innerWidth - 54),
    y: clamp(y, 10, window.innerHeight - 54),
  }), []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: pos.x, y: pos.y };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startMouseRef.current = { x: touch.clientX, y: touch.clientY };
    startPosRef.current = { x: pos.x, y: pos.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !startMouseRef.current || !startPosRef.current) return;
      const dx = e.clientX - startMouseRef.current.x;
      const dy = e.clientY - startMouseRef.current.y;
      if (!hasDraggedRef.current && Math.hypot(dx, dy) < 5) return;
      hasDraggedRef.current = true;
      const newPos = clampPos(startPosRef.current.x + dx, startPosRef.current.y + dy);
      setPos(newPos);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      if (hasDraggedRef.current) {
        setPos(p => {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(p));
          return p;
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !startMouseRef.current || !startPosRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startMouseRef.current.x;
      const dy = touch.clientY - startMouseRef.current.y;
      if (!hasDraggedRef.current && Math.hypot(dx, dy) < 5) return;
      hasDraggedRef.current = true;
      const newPos = clampPos(startPosRef.current.x + dx, startPosRef.current.y + dy);
      setPos(newPos);
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      if (hasDraggedRef.current) {
        setPos(p => {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(p));
          return p;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [clampPos]);

  const handleClick = () => {
    if (hasDraggedRef.current) return;
    onClick();
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      style={{ position: 'fixed', left: pos.x, top: pos.y, cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
      className="z-[60] h-11 w-11 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform bg-primary border-2 border-primary/50 select-none"
    >
      <Flame size={18} color="#fff" />
    </button>
  );
};
