import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
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
