/**
 * useProjectFiles — manages Map<string, string> as the in-memory file state,
 * backed by the forge_files Supabase table.
 *
 * Schema: forge_files(project_id uuid, path text, content text)
 * Unique constraint: (project_id, path)
 */

import { useState, useRef, useCallback } from 'react';
import { SupabaseService } from '../services/SupabaseService';

export interface UseProjectFilesReturn {
  files: Map<string, string>;
  isLoading: boolean;
  loadFromSupabase: (projectId: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  updateLocalFile: (path: string, content: string) => void;
}

export function useProjectFiles(): UseProjectFilesReturn {
  const [files, setFiles] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Store the active project id so that saveFile / deleteFile can use it
  // without needing it passed as a parameter every time.
  const activeProjectId = useRef<string | null>(null);

  const supabase = SupabaseService.getInstance().client;

  /** Fetch all forge_files rows for the project and populate the local Map. */
  const loadFromSupabase = useCallback(async (projectId: string) => {
    activeProjectId.current = projectId;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('forge_files')
        .select('path, content')
        .eq('project_id', projectId);

      if (error) {
        console.error('[useProjectFiles] Failed to load files:', error);
        return;
      }

      const map = new Map<string, string>();
      if (data) {
        for (const row of data) {
          map.set(row.path, row.content ?? '');
        }
      }
      setFiles(map);
    } catch (e) {
      console.error('[useProjectFiles] Unexpected error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /** Upsert a single file to Supabase and update the local Map. */
  const saveFile = useCallback(async (path: string, content: string) => {
    const projectId = activeProjectId.current;
    if (!projectId) {
      console.warn('[useProjectFiles] saveFile called before loadFromSupabase — no projectId');
      return;
    }

    // Optimistically update local state first
    setFiles(prev => new Map(prev).set(path, content));

    const { error } = await supabase
      .from('forge_files')
      .upsert(
        { project_id: projectId, path, content },
        { onConflict: 'project_id,path' }
      );

    if (error) {
      console.error('[useProjectFiles] Failed to save file:', path, error);
    }
  }, [supabase]);

  /** Delete a file from Supabase and remove it from the local Map. */
  const deleteFile = useCallback(async (path: string) => {
    const projectId = activeProjectId.current;
    if (!projectId) return;

    setFiles(prev => {
      const next = new Map(prev);
      next.delete(path);
      return next;
    });

    const { error } = await supabase
      .from('forge_files')
      .delete()
      .eq('project_id', projectId)
      .eq('path', path);

    if (error) {
      console.error('[useProjectFiles] Failed to delete file:', path, error);
    }
  }, [supabase]);

  /**
   * Update the local Map only — does NOT hit Supabase.
   * Used for rapid AI streaming updates where we want the preview to refresh
   * immediately while a separate save is debounced/queued.
   */
  const updateLocalFile = useCallback((path: string, content: string) => {
    setFiles(prev => new Map(prev).set(path, content));
  }, []);

  return { files, isLoading, loadFromSupabase, saveFile, deleteFile, updateLocalFile };
}
