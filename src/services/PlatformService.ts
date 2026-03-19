/**
 * PlatformService — singleton that wraps all /api/* calls, automatically
 * attaching the Supabase auth header to every request.
 */

import { SupabaseService } from './SupabaseService';

class PlatformService {
  private async getHeaders(): Promise<HeadersInit> {
    const { Authorization } = await SupabaseService.getInstance().getAuthHeader();
    return {
      'Content-Type': 'application/json',
      Authorization,
    };
  }

  /** Proxy a chat request to /api/chat (Anthropic). */
  async callChat(body: object): Promise<Response> {
    const baseHeaders = await this.getHeaders();
    return fetch('/api/chat', {
      method: 'POST',
      headers: { ...baseHeaders, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    });
  }

  /** Check which platform services are configured server-side. */
  async checkPlatformServices(): Promise<Record<string, boolean>> {
    const headers = await this.getHeaders();
    const response = await fetch('/api/platform-check', {
      method: 'POST',
      headers,
    });
    if (!response.ok) return {};
    return response.json();
  }

  /** Compile project files server-side. */
  async compileSrc(files: Record<string, string>): Promise<{ html?: string; error?: string }> {
    const headers = await this.getHeaders();
    const response = await fetch('/api/compile', {
      method: 'POST',
      headers,
      body: JSON.stringify({ files }),
    });
    return response.json();
  }

  /** Trigger a managed Vercel deployment for the given project. */
  async deployProject(projectId: string, files: Record<string, string>, projectName: string): Promise<{ url?: string; deploymentId?: string; error?: string }> {
    const headers = await this.getHeaders();
    const response = await fetch(`/api/deploy/${projectId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ files, projectName }),
    });
    return response.json();
  }

  /** Get deployment status for a project. */
  async getDeploymentStatus(projectId: string): Promise<{ url: string | null; lastDeployedAt: string | null; status: string }> {
    const headers = await this.getHeaders();
    const response = await fetch(`/api/deploy/${projectId}/status`, { headers });
    return response.json();
  }
}

export const platformService = new PlatformService();
