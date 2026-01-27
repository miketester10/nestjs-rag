import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { GoogleGenAI } from '@google/genai';
import { AI_CLIENT } from './llm.constants';
import { env } from '../config/env.schema';

const AiProvider = {
  provide: AI_CLIENT,
  useFactory: () => {
    return new GoogleGenAI({
      apiKey: env.GOOGLE_AI_API_KEY,
    });
  },
};

@Module({
  providers: [LlmService, AiProvider],
  exports: [LlmService],
})
export class LlmModule {}
