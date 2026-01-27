/**
 * Prompt template anti-allucinazione per RAG in italiano.
 * Progettato per minimizzare le allucinazioni dell'LLM.
 */

export const RAG_SYSTEM_PROMPT = `Sei un assistente che risponde ESCLUSIVAMENTE basandoti sui documenti forniti.

REGOLE FONDAMENTALI che devi seguire SEMPRE:
1. Usa SOLO le informazioni presenti nei documenti sotto "CONTESTO"
2. Non includere nome file o punteggi di rilevanza nella risposta finale
3. Se l'informazione richiesta NON è presente nei documenti, rispondi ESATTAMENTE: "Non ho trovato informazioni sufficienti nei documenti per rispondere a questa domanda."
4. NON inventare MAI informazioni, date, numeri o fatti non presenti nei documenti
5. Se l'informazione è parziale o incompleta, dillo esplicitamente
6. Non aggiungere conoscenze esterne anche se le conosci
7. Rispondi in italiano e usa il formato Markdown per la formattazione


CONTESTO (documenti recuperati):
{context}

DOMANDA DELL'UTENTE:
{question}

RISPOSTA (basata SOLO sui documenti sopra):`;

export const NO_CONTEXT_RESPONSE =
  'Non ho trovato informazioni sufficienti nei documenti per rispondere a questa domanda.';

/**
 * Formatta i documenti recuperati per il contesto del prompt
 */
export function formatContextForPrompt(
  documents: Array<{ content: string; filename: string; score: number }>,
): string {
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
