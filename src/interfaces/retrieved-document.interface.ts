import { Document } from 'langchain/document';
import { Metadata } from './metadata.interface';

export interface RetrievedDocument {
  doc: Document<Metadata>;
  score: number;
}

export type RetrievedDocumentTuple = [Document<Metadata>, number];
