import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp']; // Gemini attualmente supporta solo questi mimetype

  transform(files: Express.Multer.File[]): Express.Multer.File[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nessun file caricato');
    }

    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('Solo file PDF sono accettati');
      }
    }

    return files;
  }
}
