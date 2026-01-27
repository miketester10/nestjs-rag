import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Document } from 'langchain/document';
import { VectorStoreService } from './vector-store.service';

export interface RetrievedDocument {
  doc: Document;
  score: number;
}

@Injectable()
export class DocumentRetrievalService {
  private readonly logger = new Logger(DocumentRetrievalService.name);
  private similarityThreshold: number;

  constructor(private vectorStoreService: VectorStoreService) {}

  /**
   * Configura la soglia di similarità
   */
  setSimilarityThreshold(threshold: number): void {
    this.similarityThreshold = threshold;
    this.logger.log(`Threshold similarità: ${threshold}`);
  }

  /**
   * Recupera i documenti più rilevanti per una domanda
   */
  async retrieve(
    question: string,
    topK: number = 8,
  ): Promise<RetrievedDocument[]> {
    const vectorStore = this.vectorStoreService.getVectorStore();

    if (!vectorStore) {
      throw new BadRequestException(
        `⚠️ Nessun documento indicizzato. Carica prima dei PDF`,
      );
    }

    const embeddings = this.vectorStoreService.getEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(question);

    // Esegue una ricerca nel vector store.
    // Ritorna un array di tuple [Document, distance],
    // dove distance è una misura di dissimilarità (più è bassa, più il documento è simile alla query).
    const results = (await vectorStore.similaritySearchVectorWithScore(
      queryEmbedding,
      topK,
    )) as Array<[Document, number]>;

    // Converte la distanza in uno score di similarità compreso tra 0 e 1
    // usando una trasformazione inversa: score = 1 / (1 + distance).
    // In questo modo, una distanza più piccola produce uno score più alto (più simile).
    // Successivamente filtra i documenti con score inferiore alla soglia di rilevanza.
    const filteredResults = results
      .map(([doc, distance]) => ({
        doc,
        score: 1 / (1 + distance),
      }))
      .filter(({ score }) => score >= this.similarityThreshold);

    return filteredResults;
  }
}
