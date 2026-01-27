import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AI_CLIENT } from './llm.constants';
import { env } from '../config/env.schema';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private modelName: string;

  constructor(@Inject(AI_CLIENT) private aiClient: GoogleGenAI) {}

  onModuleInit() {
    this.modelName = env.LLM_MODEL;
    this.logger.log(`LLM inizializzato con modello: ${this.modelName}`);
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.aiClient.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      if (response.text) {
        return response.text;
      } else {
        throw new Error('Ricevuta risposta vuota dal modello LLM');
      }
    } catch (error) {
      this.logger.error(
        `Errore nella generazione della risposta: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
