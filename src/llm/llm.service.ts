import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private genAI: GoogleGenAI;
  private modelName: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenAI({ apiKey });
    this.modelName = this.configService.get<string>('LLM_MODEL')!;
    this.logger.log(`LLM inizializzato con modello: ${this.modelName}`);
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });
      return response.text || '';
    } catch (error) {
      this.logger.error(
        `Errore nella generazione: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
