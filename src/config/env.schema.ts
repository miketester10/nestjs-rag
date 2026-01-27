import { z } from 'zod';
import { config } from 'dotenv';
config();

const EnvSchema = z.object({
  GOOGLE_AI_API_KEY: z
    .string()
    .trim()
    .nonempty('GOOGLE_AI_API_KEY is required.'),
  LLM_MODEL: z.string().trim().nonempty('LLM_MODEL is required.'),
  OLLAMA_BASE_URL: z.string().trim().nonempty('OLLAMA_BASE_URL is required.'),
  EMBEDDING_MODEL: z.string().trim().nonempty('EMBEDDING_MODEL is required.'),

  SIMILARITY_THRESHOLD: z
    .string()
    .trim()
    .nonempty('SIMILARITY_THRESHOLD is required.')
    .refine((value) => parseFloat(value) >= 0 && parseFloat(value) <= 1, {
      message: 'SIMILARITY_THRESHOLD must be between 0 and 1',
    })
    .transform((value) => parseFloat(value)),
});

const envParsed = EnvSchema.safeParse(process.env);

if (!envParsed.success) {
  console.error(
    '❌ Config validation error:',
    envParsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment variables');
}

type EnvType = z.infer<typeof EnvSchema>;
export const env: EnvType = envParsed.data;
