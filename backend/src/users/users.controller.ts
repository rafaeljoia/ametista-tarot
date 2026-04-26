import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post(':id/credits/add')
  @UseGuards(AuthGuard('jwt'))
  async addCredits(
    @Param('id') id: string,
    @Body() body: { amount: number; pricePerCredit: number },
  ) {
    return this.usersService.addCredits(id, body.amount, body.pricePerCredit);
  }

  @Get(':id/credits/history')
  @UseGuards(AuthGuard('jwt'))
  async getCreditHistory(@Param('id') id: string) {
    return this.usersService.getCreditHistory(id);
  }
}
