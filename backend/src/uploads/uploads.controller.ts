import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_ROOT = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const CHAT_DIR = join(UPLOAD_ROOT, 'chat');

try {
  mkdirSync(CHAT_DIR, { recursive: true });
} catch {
  // ignore
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

@Controller('uploads')
export class UploadsController {
  @Post('chat-image')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: CHAT_DIR,
        filename: (_req, file, cb) => {
          const ext = (extname(file.originalname) || '.bin').toLowerCase();
          cb(null, `${Date.now()}-${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          cb(new BadRequestException('Tipo de arquivo não suportado (use jpg, png ou webp)'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadChatImage(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    // URL pública servida pelo Express estaticamente em /api/uploads/...
    const url = `/api/uploads/chat/${file.filename}`;
    return {
      url,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: req.user?.id,
    };
  }
}
