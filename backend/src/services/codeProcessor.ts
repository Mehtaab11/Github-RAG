import fs from 'fs/promises';
import path from 'path';
import simpleGit from 'simple-git';
import os from 'os';
import { qdrantClient, COLLECTION_NAME } from '../config/qdrant';

// Extensive skip arrays to ignore irrelevant noise
const IGNORED_DIRECTORIES = new Set([
  'node_modules', 'dist', 'build', '.git', 'coverage', '.next', 'out', 'bin', 'obj'
]);

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.mp4', '.mp3', '.pdf', '.zip', '.tar', '.gz', 
  '.lock', '-lock.json', '.yaml', '.yml'
]);

interface CodeChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
}

// Singleton variable to cache the local embedding model execution pipeline instance
let embeddingPipelineInstance: any = null;

/**
 * Lazy-loads and caches the local open-source embedding pipeline.
 * Model chosen: BAAI/bge-base-en-v1.5
 * Vector Dimension: 768
 * Reason: Top-tier retrieval performance, open-source, runs 100% locally on CPU/GPU.
 */
async function getEmbeddingPipeline() {
  if (!embeddingPipelineInstance) {
    // Dynamic import to cleanly load the ESM transformers library inside standard Node scripts
    const { pipeline } = await import('@xenova/transformers');
    
    console.log('⏳ Loading local embedding model (Xenova/bge-base-en-v1.5)...');
    embeddingPipelineInstance = await pipeline('feature-extraction', 'Xenova/bge-base-en-v1.5');
    console.log('🚀 Local embedding model loaded successfully.');
  }
  return embeddingPipelineInstance;
}

/**
 * Clones a remote GitHub repository to a local temporary folder.
 * Returns the path to the folder.
 */
export async function cloneRepository(githubUrl: string): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `git-repo-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  
  const git = simpleGit();
  console.log(`Cloning ${githubUrl} into ${tempDir}...`);
  await git.clone(githubUrl, tempDir, ['--depth', '1']);
  return tempDir;
}

/**
 * Recursively walks through files, reads source content, and extracts code blocks.
 */
export async function scanAndChunkRepository(dirPath: string, rootPath: string = dirPath): Promise<CodeChunk[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let chunks: CodeChunk[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      const subChunks = await scanAndChunkRepository(fullPath, rootPath);
      chunks = chunks.concat(subChunks);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IGNORED_EXTENSIONS.has(ext) || IGNORED_EXTENSIONS.has(entry.name)) continue;

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        if (!content.trim() || content.length > 500000) continue; 

        const fileChunks = sliceCodeIntoChunks(relativePath, content);
        chunks = chunks.concat(fileChunks);
      } catch (err) {
        console.warn(`⚠️ Skipped reading file: ${relativePath}.`);
      }
    }
  }
  return chunks;
}

/**
 * Slices a source file into semantic window-blocks based on target sizing metrics.
 */
function sliceCodeIntoChunks(filePath: string, content: string): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];
  
  const chunkSizeInLines = 60;   
  const chunkOverlapInLines = 15; 

  let i = 0;
  while (i < lines.length) {
    const startLine = i + 1;
    const endLine = Math.min(lines.length, i + chunkSizeInLines);
    
    const chunkLines = lines.slice(i, endLine);
    const chunkContent = chunkLines.join('\n');

    if (chunkContent.trim().length > 40) {
      chunks.push({
        filePath,
        content: `// File: ${filePath}\n// Lines: ${startLine}-${endLine}\n\n${chunkContent}`,
        startLine,
        endLine,
      });
    }

    if (endLine === lines.length) break;
    i += (chunkSizeInLines - chunkOverlapInLines);
  }

  return chunks;
}

/**
 * Batches text blocks out to the local BGE model and loads vectors into Qdrant.
 */
export async function generateAndStoreEmbeddings(repositoryId: string, chunks: CodeChunk[]) {
  console.log(`🧬 Processing ${chunks.length} chunks via Local BGE Embedding Engine...`);
  
  const extractor = await getEmbeddingPipeline();
  
  // Processing in batches preserves optimal memory control and limits heap inflation
  const BATCH_SIZE = 25;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(`📡 Vectorizing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(chunks.length / BATCH_SIZE)}...`);

    const qdrantPoints = [];

    for (const chunk of batch) {
      try {
        // Generate embeddings locally. Mean pooling and normalization match the BGE specification.
        const output = await extractor(chunk.content, { pooling: 'mean', normalize: true });
        
        // Extract plain array numbers out of the underlying ONNX Tensor object
        const vectorValue = Array.from(output.data) as number[];

        qdrantPoints.push({
          id: crypto.randomUUID(),
          vector: vectorValue,
          payload: {
            repositoryId,
            filePath: chunk.filePath,
            content: chunk.content,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
          },
        });
      } catch (chunkError) {
        console.error(`❌ Failed to extract embedding vector for file block: ${chunk.filePath}`, chunkError);
        throw chunkError;
      }
    }

    // Stream the structural batch points straight to Qdrant
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: qdrantPoints,
    });
  }
  
  console.log(`🎯 Successfully indexed all local vectors to Qdrant for repo: ${repositoryId}`);
}