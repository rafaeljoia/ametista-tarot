import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

function requireUserSelf(req: any, id: string) {
  if (req.user?.role !== 'user' || req.user?.id !== id) {
    throw new ForbiddenException();
  }
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(
    @Request() req,
    @Body() body: { name?: string; email?: string; phone?: string; birthDate?: string },
  ) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Post('me/change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    if (!body.newPassword || body.newPassword.length < 6) {
      throw new BadRequestException('Nova senha deve ter ao menos 6 caracteres');
    }
    return this.usersService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get('me/credits/history')
  @UseGuards(AuthGuard('jwt'))
  async getMyCreditHistory(@Request() req) {
    if (req.user.role !== 'user') throw new ForbiddenException();
    return this.usersService.getCreditHistory(req.user.id);
  }

  // Legacy endpoints — restricted to the authenticated user's own id
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: string, @Request() req) {
    requireUserSelf(req, id);
    return this.usersService.findById(id);
  }

  @Post(':id/credits/add')
  @UseGuards(AuthGuard('jwt'))
  async addCredits(
    @Param('id') id: string,
    @Body() body: { amount: number; pricePerCredit: number },
    @Request() req,
  ) {
    requireUserSelf(req, id);
    return this.usersService.addCredits(id, body.amount, body.pricePerCredit);
  }

  @Get(':id/credits/history')
  @UseGuards(AuthGuard('jwt'))
  async getCreditHistory(@Param('id') id: string, @Request() req) {
    requireUserSelf(req, id);
    return this.usersService.getCreditHistory(id);
  }
}
