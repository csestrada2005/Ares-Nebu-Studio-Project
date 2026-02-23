import { pipeline, env } from '@xenova/transformers';
import type { FileSystemTree, DirectoryNode, FileNode, SymlinkNode } from '@webcontainer/api';

// Configure environment for browser
env.allowLocalModels = false;
env.useBrowserCache = true;

interface FileEmbedding {
  path: string;
  content: string;
  embedding: number[];
}

export class CodebaseKnowledgeService {
  private static instance: CodebaseKnowledgeService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractor: any = null;
  private embeddings: FileEmbedding[] = [];
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): CodebaseKnowledgeService {
    if (!CodebaseKnowledgeService.instance) {
      CodebaseKnowledgeService.instance = new CodebaseKnowledgeService();
    }
    return CodebaseKnowledgeService.instance;
  }

  public get hasEmbeddings(): boolean {
    return this.embeddings.length > 0;
  }

  public async initialize() {
    if (this.isInitialized) return;
    try {
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      this.isInitialized = true;
      console.log('CodebaseKnowledgeService initialized');
    } catch (error) {
      console.error('Failed to initialize CodebaseKnowledgeService:', error);
      throw error;
    }
  }

  private isIgnored(path: string): boolean {
    const ignoredPaths = ['node_modules', '.git', 'dist', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.wav'];

    if (ignoredPaths.some(ignored => path.includes(ignored))) return true;
    if (ignoredExtensions.some(ext => path.endsWith(ext))) return true;

    return false;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor) await this.initialize();
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  private chunkContent(content: string): string[] {
    // Simple chunking strategy: split by paragraphs or max words
    // For now, let's keep it simple: if file > 1500 words, split.
    // Otherwise return as single chunk.
    const words = content.split(/\s+/);
    if (words.length <= 1500) return [content];

    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (const word of words) {
        currentChunk.push(word);
        if (currentChunk.length >= 1000) {
            chunks.push(currentChunk.join(' '));
            currentChunk = []; // Overlap logic could be added here
        }
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }
    return chunks;
  }

  public async indexCodebase(fileTree: FileSystemTree) {
    this.embeddings = []; // Reset embeddings
    await this.traverseAndEmbed(fileTree, '');
    console.log(`Indexed ${this.embeddings.length} file chunks.`);
  }

  private async traverseAndEmbed(node: FileSystemTree | DirectoryNode | FileNode | SymlinkNode, currentPath: string) {
    if (this.isIgnored(currentPath)) return;
    if ('symlink' in node) return;

    // Handle FileSystemTree (root or directory contents)
    // FileSystemTree is a Record, doesn't have 'file' or 'directory' properties directly usually,
    // but the nodes inside do.
    // However, the type union here is tricky.
    // If it's the root tree, it's a Record<string, DirectoryNode | FileNode>.
    // It does NOT have 'file' or 'directory' keys itself (unless a file is named 'file' etc).

    // We can differentiate by checking if it's a "Node" (has file/directory prop) or a Tree (is a plain object of nodes).
    // Actually, DirectoryNode has 'directory' which IS a FileSystemTree.

    if ('file' in node) {
        const fileNode = node as FileNode;
        const content = typeof fileNode.file.contents === 'string'
          ? fileNode.file.contents
          : new TextDecoder().decode(fileNode.file.contents);

        if (!content.trim()) return;

        const chunks = this.chunkContent(content);
        for (const chunk of chunks) {
            try {
                const embedding = await this.generateEmbedding(chunk);
                this.embeddings.push({
                    path: currentPath,
                    content: chunk,
                    embedding
                });
            } catch (e) {
                console.error(`Failed to embed ${currentPath}:`, e);
            }
        }
        return;
    }

    if ('directory' in node) {
        const directoryNode = node as DirectoryNode;
        for (const [name, child] of Object.entries(directoryNode.directory)) {
            await this.traverseAndEmbed(child, `${currentPath}/${name}`);
        }
        return;
    }

    // Must be FileSystemTree (Root or plain object)
    for (const [name, child] of Object.entries(node)) {
        await this.traverseAndEmbed(child, currentPath ? `${currentPath}/${name}` : name);
    }
  }

  public async updateFile(path: string, content: string) {
      if (this.isIgnored(path)) return;

      // Remove old embeddings for this path
      this.embeddings = this.embeddings.filter(e => e.path !== path);

      const chunks = this.chunkContent(content);
      for (const chunk of chunks) {
          try {
              const embedding = await this.generateEmbedding(chunk);
              this.embeddings.push({
                  path,
                  content: chunk,
                  embedding
              });
          } catch (e) {
              console.error(`Failed to update embedding for ${path}:`, e);
          }
      }
  }

  public async search(query: string, topK: number = 5): Promise<{ path: string, content: string, score: number }[]> {
      try {
          const queryEmbedding = await this.generateEmbedding(query);

          const results = this.embeddings.map(doc => {
              const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
              return { ...doc, score };
          });

          results.sort((a, b) => b.score - a.score);
          return results.slice(0, topK);
      } catch (e) {
          console.error('Search failed:', e);
          return [];
      }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
      let dotProduct = 0;
      let magA = 0;
      let magB = 0;

      for (let i = 0; i < vecA.length; i++) {
          dotProduct += vecA[i] * vecB[i];
          magA += vecA[i] * vecA[i];
          magB += vecB[i] * vecB[i];
      }

      magA = Math.sqrt(magA);
      magB = Math.sqrt(magB);

      if (magA === 0 || magB === 0) return 0;

      return dotProduct / (magA * magB);
  }
}
