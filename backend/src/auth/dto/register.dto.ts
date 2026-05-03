import { IsEmail, IsString, MinLength, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  /**
   * ID da versão dos termos aceita pelo usuário no momento do cadastro.
   * Se não enviado, o backend resolve para a versão ativa atual e registra
   * a aceitação automaticamente (compat com clientes mais antigos).
   */
  @IsOptional()
  @IsUUID()
  acceptedTermsVersionId?: string;
}
