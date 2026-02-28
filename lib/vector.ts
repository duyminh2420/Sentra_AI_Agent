
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../scripts/supabase";
import { pipeline, env } from "@xenova/transformers";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ---- Xenova / Node config ----
env.allowLocalModels = true;
env.useBrowserCache = false;

// ---- Supabase client ----
export const supabase: SupabaseClient<Database> = createClient(
  process.env.SUPABASE_URL!,
  // process.env.SUPABASE_KEY!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export let embeddings: {
  embedDocuments: (texts: string[]) => Promise<number[][]>;
  embedQuery: (text: string) => Promise<number[]>;
} | null = null;

// ---- Initialize embeddings ----
export async function initEmbeddings() {
  console.log("Loading embedding model...");

  const embedPipeline = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
    {
      pooling: "mean",
      normalize: true,
    } as any // TS types are incomplete
  );

  console.log("Embedding model loaded ✅");

embeddings = {
  embedDocuments: async (texts: string[]) => {
    const vectors: number[][] = [];

    for (const text of texts) {
      const output: any = await embedPipeline(text);

      const data = Array.from(output.data) as number[];
      const dims = output.dims as number[]; // [1, tokens, 384]

      const tokenCount = dims[1];
      const hiddenSize = dims[2];

      const pooled = new Array(hiddenSize).fill(0);

      for (let t = 0; t < tokenCount; t++) {
        for (let i = 0; i < hiddenSize; i++) {
          pooled[i] += data[t * hiddenSize + i];
        }
      }

      for (let i = 0; i < hiddenSize; i++) {
        pooled[i] /= tokenCount;
      }

      vectors.push(pooled);
    }

    return vectors;
  },

  embedQuery: async (text: string) => {
    const output: any = await embedPipeline(text);

    const data = Array.from(output.data) as number[];
    const dims = output.dims as number[];

    const tokenCount = dims[1];
    const hiddenSize = dims[2];

    const pooled = new Array(hiddenSize).fill(0);

    for (let t = 0; t < tokenCount; t++) {
      for (let i = 0; i < hiddenSize; i++) {
        pooled[i] += data[t * hiddenSize + i];
      }
    }

    for (let i = 0; i < hiddenSize; i++) {
      pooled[i] /= tokenCount;
    }

    return pooled;
  },
};

}