import { QdrantClient } from "@qdrant/js-client-rest";

import dotenv from "dotenv";
dotenv.config();

const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantApiKey = process.env.QDRANT_API_KEY; // Required for Qdrant Cloud

export const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  ...(qdrantApiKey ? { apiKey: qdrantApiKey } : {}),
});

export const COLLECTION_NAME = "codebase_chunks";

export async function initQdrant() {
  try {
    const collectionResponse = await qdrantClient.getCollections();

    const collectionExits = collectionResponse.collections.some(
      (col) => col.name == COLLECTION_NAME,
    );

    if (!collectionExits) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768,
          distance: "Cosine",
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log(`Collection "${COLLECTION_NAME}" created successfully.`);
    } else {
      console.log(`Collection "${COLLECTION_NAME}" is ready.`);
    }
  } catch (error) {
    console.error("Failed to initialize Qdrant client:", error);
    process.exit(1);
  }
}
