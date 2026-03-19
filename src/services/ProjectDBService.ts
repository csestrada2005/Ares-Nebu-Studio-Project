/**
 * ProjectDBService — service for per-project Supabase database operations.
 * Routes calls through /api/db/:projectId/* instead of the main Supabase client.
 */

import { SupabaseService } from './SupabaseService';

interface DBCredentials {
  projectUrl: string | null;
  anonKey: string | null;
}

interface ProvisionResult {
  projectUrl: string;
  anonKey: string;
  provisioned: boolean;
}

class ProjectDBService {
  private async getHeaders(): Promise<HeadersInit> {
    const { Authorization } = await SupabaseService.getInstance().getAuthHeader();
    return { 'Content-Type': 'application/json', Authorization };
  }

  /** Provision a new Supabase project for the given forge project. */
  async provision(projectId: string): Promise<ProvisionResult> {
    const headers = await this.getHeaders();
    const response = await fetch(`/api/db/provision/${projectId}`, {
      method: 'POST',
      headers,
    });
    return response.json();
  }

  /** Get the project's Supabase URL and anon key for client-side use. */
  async getCredentials(projectId: string): Promise<DBCredentials> {
    const headers = await this.getHeaders();
    const response = await fetch(`/api/db/${projectId}/credentials`, { headers });
    return response.json();
  }

  /** Execute a SQL query against the project's Supabase instance. */
  async query(projectId: string, sql: string): Promise<{ data: unknown; error: unknown }> {
    const headers = await this.getHeaders();
    const response = await fetch(`/api/db/${projectId}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql }),
    });
    return response.json();
  }

  /** Get the schema for the project's Supabase instance. */
  async getSchema(projectId: string): Promise<{ data: unknown; error: unknown }> {
    const headers = await this.getHeaders();
    const response = await fetch(`/api/db/${projectId}/schema`, { headers });
    return response.json();
  }
}

export const projectDBService = new ProjectDBService();
