import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string) || null;
    return this.authService.register(registerDto, { ip, userAgent });
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('consultant-login')
  async consultantLogin(@Body() loginDto: LoginDto) {
    return this.authService.loginConsultant(loginDto);
  }

  @Post('forgot-password')
  async forgot(@Body() dto: ForgotPasswordDto, @Req() req: any) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      null;
    return this.authService.forgotPassword(dto.email, dto.role || 'user', { ip });
  }

  @Post('reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
