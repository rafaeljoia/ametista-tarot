import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Garante que o JWT presente é de um usuário admin. Deve ser usado SEMPRE em
 * conjunto com @UseGuards(AuthGuard('jwt')) — este apenas valida o role.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user || req.user.role !== 'admin') {
      throw new ForbiddenException('Acesso restrito a administradores');
    }
    return true;
  }
}
