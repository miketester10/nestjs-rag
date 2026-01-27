import { Document } from 'langchain/document';

export interface RetrievedDocument {
  doc: Document;
  score: number;
}
