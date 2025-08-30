export interface QueryResponse {
  domanda: string;
  documenti: Documento[];
}

interface Documento {
  pdf: string;
  score: number;
  content: string;
}
