import { Controller, Get } from '@nestjs/common';
import { MakeRoute } from './auth/supabase-auth.guard';

@Controller('health')
export class HealthController {
  @Get()
  @MakeRoute()
  health() {
    return { ok: true };
  }
}
