import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { AuthedRequest } from '../auth/supabase-auth.guard';
import { Clock } from '../common/clock';
import { OverviewService } from './overview.service';

@Controller()
export class OverviewController {
  constructor(
    @Inject(OverviewService) private readonly overviewService: OverviewService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Get('overview')
  overview() {
    return this.overviewService.overview();
  }

  @Get('me')
  me(@Req() req: AuthedRequest) {
    return { email: req.user!.email, role: req.user!.role, today: this.clock.today() };
  }
}
