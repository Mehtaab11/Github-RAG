import fs from "fs/promises";
import path from "path";
import simpleGit from "simple-git";
import os from "os";
import { Job } from "bullmq";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant";
import { getIO } from "../config/socket";
import { generateEmbeddings } from "./embeddingService";

// Extensive skip arrays to ignore irrelevant noise
const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  ".next",
  "out",
  "bin",
  "obj",
]);

const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".mp4",
  ".mp3",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".lock",
  "-lock.json",
  ".yaml",
  ".yml",
]);

interface CodeChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
}

const EXPECTED_VECTOR_DIMENSION = 768;

/**
 * Clones a remote GitHub repository to a local temporary folder.
 * Returns the path to the folder.
 */
export async function cloneRepository(githubUrl: string): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `git-repo-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const git = simpleGit();
  console.log(`Cloning ${githubUrl} into ${tempDir}...`);
  await git.clone(githubUrl, tempDir, ["--depth", "1"]);
  return tempDir;
}

/**
 * Recursively walks through files, reads source content, and extracts code blocks.
 */
export async function scanAndChunkRepository(
  dirPath: string,
  rootPath: string = dirPath,
): Promise<CodeChunk[]> {
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
      if (IGNORED_EXTENSIONS.has(ext) || IGNORED_EXTENSIONS.has(entry.name))
        continue;

      try {
        const content = await fs.readFile(fullPath, "utf-8");
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
  const lines = content.split("\n");
  const chunks: CodeChunk[] = [];

  const chunkSizeInLines = 60;
  const chunkOverlapInLines = 15;

  let i = 0;
  while (i < lines.length) {
    const startLine = i + 1;
    const endLine = Math.min(lines.length, i + chunkSizeInLines);

    const chunkLines = lines.slice(i, endLine);
    const chunkContent = chunkLines.join("\n");

    if (chunkContent.trim().length > 40) {
      chunks.push({
        filePath,
        content: `// File: ${filePath}\n// Lines: ${startLine}-${endLine}\n\n${chunkContent}`,
        startLine,
        endLine,
      });
    }

    if (endLine === lines.length) break;
    i += chunkSizeInLines - chunkOverlapInLines;
  }

  return chunks;
}

/**
 * Batches text blocks, generates 768-dim vectors via Hugging Face Serverless API (BAAI/bge-base-en-v1.5),
 * and upserts points directly into Qdrant.
 */
export async function generateAndStoreEmbeddings(
  repositoryId: string,
  chunks: CodeChunk[],
  job?: Job,
) {
  console.log(
    `🧬 Processing ${chunks.length} chunks via Hugging Face Embedding Engine (BAAI/bge-base-en-v1.5, ${EXPECTED_VECTOR_DIMENSION}d)...`,
  );

  const BATCH_SIZE = 40;
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

    console.log(
      `📡 Vectorizing batch ${batchIndex} of ${totalBatches} (${batchChunks.length} chunks) via Hugging Face API...`,
    );

    // 1. Maintain exact sequential order when extracting text contents
    const batchContents = batchChunks.map((c) => c.content);

    // 2. Request batch embeddings from Hugging Face Serverless API
    const vectors = await generateEmbeddings(batchContents);

    // 3. CRITICAL Safeguard: Verify returned vectors match chunk count exactly
    if (vectors.length !== batchChunks.length) {
      throw new Error(
        `CRITICAL: Index alignment mismatch in batch ${batchIndex}. Expected ${batchChunks.length} vectors, got ${vectors.length}. Aborting to prevent metadata mispairing.`,
      );
    }

    // 4. Safely zip vectors[idx] back onto batchChunks[idx] in a single synchronously-scoped step
    const qdrantPoints = batchChunks.map((chunk, idx) => {
      const vector = vectors[idx];

      // Verify dimension integrity for each vector in the batch
      if (!vector || vector.length !== EXPECTED_VECTOR_DIMENSION) {
        throw new Error(
          `CRITICAL: Embedding vector dimension mismatch at batch index ${idx}. Expected ${EXPECTED_VECTOR_DIMENSION}, got ${vector ? vector.length : 0}`,
        );
      }

      return {
        id: crypto.randomUUID(),
        vector,
        payload: {
          repositoryId,
          filePath: chunk.filePath,
          content: chunk.content,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
        },
      };
    });

    // 5. Stream the structural batch points straight to Qdrant
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: qdrantPoints,
    });

    const processedCount = Math.min(chunks.length, i + batchChunks.length);
    const progress = Math.min(
      95,
      Math.floor(50 + (processedCount / chunks.length) * 45),
    );

    if (job) {
      await job.updateProgress(progress);
    }

    try {
      const payload = {
        repositoryId,
        status: "PROCESSING",
        progress,
        processedVectors: processedCount,
        totalVectors: chunks.length,
      };
      const ioInstance = getIO();
      if (ioInstance) {
        ioInstance.emit("ingestion-progress", payload);
        ioInstance.to(repositoryId).emit("ingestion-progress", payload);
      }
    } catch (socketErr) {
      // Ignore socket emit errors if client disconnected
    }
  }

  console.log(
    `🎯 Successfully indexed ${chunks.length} vectors to Qdrant for repo: ${repositoryId}`,
  );
}
