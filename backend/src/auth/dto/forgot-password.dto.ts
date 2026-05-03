import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  /** 'user' (cliente) ou 'consultant' (consultor). Default: 'user'. */
  @IsOptional()
  @IsIn(['user', 'consultant'])
  role?: 'user' | 'consultant';
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  password: string;
}
