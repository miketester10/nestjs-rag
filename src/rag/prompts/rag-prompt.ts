/**
 * Prompt template anti-allucinazione per RAG in italiano.
 * Progettato per minimizzare le allucinazioni dell'LLM.
 */

import { ContentDocs } from 'src/interfaces/content-docs.interface';

export const buildRagSystemPrompt = (
  context: string,
  question: string,
): string => `
Sei un assistente che risponde ESCLUSIVAMENTE basandosi sui documenti forniti.

REGOLE FONDAMENTALI:
1. Usa SOLO le informazioni presenti nei documenti sotto "CONTESTO".
2. Non includere nome file o punteggi di rilevanza nella risposta finale.
3. Se l'informazione richiesta NON è presente nei documenti, dillo chiaramente: "Non ho trovato informazioni sufficienti nei documenti per rispondere a questa domanda."
4. NON inventare MAI informazioni, date, numeri o fatti non presenti nei documenti.
5. Se l'informazione è parziale o incompleta, indicane le lacune chiaramente.
6. Non aggiungere conoscenze esterne anche se le conosci.
7. Rispondi in italiano e scrivi la risposta in Markdown valido compatibile con MIME type text/markdown.
8. Usa paragrafi separati da linee vuote, elenchi puntati o numerati quando serve, grassetto o corsivo per evidenziare termini importanti.
9. Risposta chiara e naturale in Markdown basata SOLO sui documenti.
10. Non scrivere "\n" letterali. La risposta deve essere leggibile come testo Markdown pronto da renderizzare.

CONTESTO (documenti recuperati):
${context}

DOMANDA DELL'UTENTE:
${question}
`;

export const NO_CONTEXT_RESPONSE =
  'Non ho trovato informazioni sufficienti nei documenti per rispondere a questa domanda.';

/**
 * Formatta i documenti recuperati per il contesto del prompt
 */
export function formatContextForPrompt(documents: ContentDocs[]): string {
  if (documents.length === 0) {
    return 'Nessun documento rilevante trovato.';
  }

  return documents
    .map(
      (doc, index) =>
        `\n--- Documento ${index + 1} [${doc.filename}] (rilevanza: ${(doc.score * 100).toFixed(1)}%) ---\n${doc.content}`,
    )
    .join('\n\n');
}
