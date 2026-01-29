import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { LLM_CLIENT } from './llm.constants';
import { env } from '../config/env.schema';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private modelName: string;

  constructor(@Inject(LLM_CLIENT) private llmClient: GoogleGenAI) {}

  onModuleInit() {
    this.modelName = env.LLM_MODEL;
    this.logger.log(`LLM inizializzato con modello: ${this.modelName}`);
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.llmClient.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0, // disabilita il "thinking" per risposte più veloci
          },
        },
      });

      if (response.text) {
        return response.text;
      } else {
        return 'Nessuna risposta generata dal modello LLM. Riprova più tardi.';
      }
    } catch (error) {
      this.logger.error(
        `Errore nella generazione della risposta: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
