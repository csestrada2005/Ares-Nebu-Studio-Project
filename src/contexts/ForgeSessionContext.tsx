/**
 * ForgeSessionContext — lightweight in-memory store for the active forge session.
 *
 * Populated from URL params when StudioEngine mounts.
 * No localStorage, no sessionStorage — purely derived from URL + auth state.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ForgeSessionContextValue {
  activeProjectId: string | null;
  activeProjectName: string | null;
  isReadOnly: boolean;
  setSession: (projectId: string, projectName: string, readOnly?: boolean) => void;
  clearSession: () => void;
}

const ForgeSessionContext = createContext<ForgeSessionContextValue>({
  activeProjectId: null,
  activeProjectName: null,
  isReadOnly: false,
  setSession: () => {},
  clearSession: () => {},
});

export function ForgeSessionProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const setSession = (projectId: string, projectName: string, readOnly = false) => {
    setActiveProjectId(projectId);
    setActiveProjectName(projectName);
    setIsReadOnly(readOnly);
  };

  const clearSession = () => {
    setActiveProjectId(null);
    setActiveProjectName(null);
    setIsReadOnly(false);
  };

  return (
    <ForgeSessionContext.Provider value={{ activeProjectId, activeProjectName, isReadOnly, setSession, clearSession }}>
      {children}
    </ForgeSessionContext.Provider>
  );
}

export const useForgeSession = () => useContext(ForgeSessionContext);
