import { Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InboxService } from './inbox.service';

@Controller()
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get('me/inbox')
  @UseGuards(AuthGuard('jwt'))
  async list(@Request() req: any) {
    const items = await this.inbox.listForUser(req.user.id);
    const unread = await this.inbox.unreadCount(req.user.id);
    return { items, unread };
  }

  @Get('me/inbox/unread-count')
  @UseGuards(AuthGuard('jwt'))
  async unread(@Request() req: any) {
    const count = await this.inbox.unreadCount(req.user.id);
    return { count };
  }

  @Patch('me/inbox/:id/read')
  @UseGuards(AuthGuard('jwt'))
  async read(@Request() req: any, @Param('id') id: string) {
    return this.inbox.markRead({ id, userId: req.user.id });
  }

  @Post('me/inbox/read-all')
  @UseGuards(AuthGuard('jwt'))
  async readAll(@Request() req: any) {
    return this.inbox.markAllRead(req.user.id);
  }
}
