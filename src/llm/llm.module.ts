import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { GoogleGenAI } from '@google/genai';
import { LLM_CLIENT } from './llm.constants';
import { env } from '../config/env.schema';

const LlmProvider = {
  provide: LLM_CLIENT,
  useFactory: () => {
    return new GoogleGenAI({
      apiKey: env.LLM_API_KEY,
    });
  },
};

@Module({
  providers: [LlmService, LlmProvider],
  exports: [LlmService],
})
export class LlmModule {}
