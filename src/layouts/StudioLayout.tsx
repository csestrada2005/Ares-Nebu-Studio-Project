import { Outlet } from 'react-router-dom';

/**
 * StudioLayout — full-screen, chrome-free shell for the AI web-builder.
 * No business navigation is rendered here so the IDE can occupy 100% of
 * the viewport without any surrounding UI chrome.
 */
export function StudioLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Outlet />
    </div>
  );
}
