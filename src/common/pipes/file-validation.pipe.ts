import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes = ['application/pdf'];

  async transform(
    files: Express.Multer.File[],
  ): Promise<Express.Multer.File[]> {
    if (files.length === 0) {
      throw new BadRequestException('Nessun file caricato');
    }

    for (const file of files) {
      try {
        // Rilevamento del tipo di file reale
        const detectedType = await fileTypeFromBuffer(file.buffer);
        if (!detectedType) {
          throw new BadRequestException(
            `Impossibile determinare il formato del file: ${file.originalname}`,
          );
        }

        // Validazione basata sul Magic Number reale
        if (!this.allowedMimeTypes.includes(detectedType.mime)) {
          throw new BadRequestException(
            `Formato file non supportato: ${detectedType.mime}. Attesi: ${this.allowedMimeTypes.join(', ')}`,
          );
        }

        // Verifica che il mime type dichiarato corrisponda
        if (file.mimetype !== detectedType.mime) {
          throw new BadRequestException(
            `Discrepanza nel tipo file: dichiarato ${file.mimetype}, rilevato ${detectedType.mime}`,
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          `Errore durante la validazione del file: ${(error as Error).message}`,
        );
      }
    }

    return files;
  }
}
