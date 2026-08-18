import dotenv from "dotenv";
dotenv.config();

const HF_API_URL =
  process.env.HF_EMBEDDING_MODEL_URL ||
  "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5";

const EXPECTED_VECTOR_DIMENSION = 768;

/**
 * Generates 768-dimensional embedding vectors using Hugging Face Serverless Inference API (BAAI/bge-base-en-v1.5).
 * 
 * Features:
 * - 0 MB Node.js memory overhead (pure HTTP fetch)
 * - Exact 768-dim output matching Qdrant Cosine collection
 * - Handles 1D, 2D, and 3D token pooled responses seamlessly
 * - Automatic retry with exponential backoff on cold starts (503 model warming) and transient network hiccups
 */
export async function generateEmbeddings(
  inputs: string | string[],
  maxRetries = 4,
  baseDelayMs = 1500,
): Promise<number[][]> {
  const texts = Array.isArray(inputs) ? inputs : [inputs];
  if (texts.length === 0) return [];

  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  if (!apiKey || apiKey.includes("your_")) {
    throw new Error(
      "Missing HUGGINGFACE_API_KEY. Please add your free Hugging Face User Access Token (starts with hf_...) to backend/.env",
    );
  }

  // Safety truncation to avoid excessive payload limits on single giant chunks
  const safeTexts = texts.map((t) => (t.length > 8000 ? t.slice(0, 8000) : t));

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: safeTexts,
          options: {
            wait_for_model: true,
            use_cache: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Handle model loading warmup phase (HF returns 503 with estimated_time)
        if (response.status === 503) {
          console.warn(
            `⏳ Hugging Face model warming up (${errorText}). Waiting 3s before retry...`,
          );
          await new Promise((r) => setTimeout(r, 3000));
          attempt++;
          continue;
        }
        throw new Error(
          `Hugging Face API returned HTTP ${response.status}: ${errorText}`,
        );
      }

      const data: any = await response.json();

      let vectors: number[][] = [];

      if (Array.isArray(data)) {
        // Case A: 1D array returned for a single input text
        if (typeof data[0] === "number") {
          vectors = [data as number[]];
        }
        // Case B: 2D array [batch_size, 768] (Standard feature extraction format)
        else if (Array.isArray(data[0]) && typeof data[0][0] === "number") {
          vectors = data as number[][];
        }
        // Case C: 3D array [batch_size, seq_len, 768] -> Mean pool across tokens
        else if (Array.isArray(data[0]) && Array.isArray(data[0][0])) {
          vectors = data.map((tokenEmbeddings: number[][]) => {
            const seqLen = tokenEmbeddings.length;
            const dim = tokenEmbeddings[0].length;
            const pooled = new Array(dim).fill(0);
            for (let i = 0; i < seqLen; i++) {
              for (let j = 0; j < dim; j++) {
                pooled[j] += tokenEmbeddings[i][j];
              }
            }
            return pooled.map((val) => val / seqLen);
          });
        }
      }

      if (vectors.length !== safeTexts.length) {
        throw new Error(
          `Embedding count mismatch: expected ${safeTexts.length} embeddings, received ${vectors.length}`,
        );
      }

      // CRITICAL: Runtime sanity check verifying exact 768 vector dimension
      for (let i = 0; i < vectors.length; i++) {
        const vec = vectors[i];
        if (!vec || vec.length !== EXPECTED_VECTOR_DIMENSION) {
          throw new Error(
            `CRITICAL: Embedding vector dimension mismatch at index ${i}. Expected ${EXPECTED_VECTOR_DIMENSION}, got ${vec ? vec.length : 0}`,
          );
        }
      }

      return vectors;
    } catch (error: any) {
      attempt++;
      if (attempt > maxRetries) {
        console.error(
          `❌ Hugging Face Embedding API failed after ${maxRetries} retries:`,
          error?.message || error,
        );
        throw error;
      }
      const delay =
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.warn(
        `⚠️ Hugging Face API transient error (${error?.message || error}). Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error(
    "Failed to generate embeddings from Hugging Face API after maximum retries.",
  );
}

/**
 * Generates a single query embedding vector for semantic search in chatController.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const vectors = await generateEmbeddings(query);
  if (!vectors || vectors.length === 0) {
    throw new Error("Failed to generate query embedding vector.");
  }
  return vectors[0];
}
