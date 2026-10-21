import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AssigneesController } from './assignees/assignees.controller';
import { AssigneesService } from './assignees/assignees.service';
import { MakeKeyGuard } from './auth/make-key.guard';
import { SupabaseAuthGuard } from './auth/supabase-auth.guard';
import { Clock } from './common/clock';
import { ApiExceptionFilter } from './common/errors';
import { createDb, DB, type DbHandle } from './db/client';
import { HealthController } from './health.controller';
import { HolidaysController } from './holidays/holidays.controller';
import { MatricesController } from './matrices/matrices.controller';
import { MatricesService } from './matrices/matrices.service';
import { OverviewController } from './overview/overview.controller';
import { OverviewService } from './overview/overview.service';
import { RemindersController } from './reminders/reminders.controller';
import { RemindersService } from './reminders/reminders.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';

@Module({})
export class AppModule {
  /** `handle` permite que os testes injetem um banco próprio. */
  static forRoot(handle?: DbHandle): DynamicModule {
    return {
      module: AppModule,
      controllers: [
        HealthController,
        OverviewController,
        MatricesController,
        TasksController,
        AssigneesController,
        RemindersController,
        HolidaysController,
      ],
      providers: [
        { provide: DB, useFactory: async () => (handle ?? (await createDb())).db },
        Clock,
        MakeKeyGuard,
        OverviewService,
        MatricesService,
        TasksService,
        AssigneesService,
        RemindersService,
        { provide: APP_GUARD, useClass: SupabaseAuthGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    };
  }
}
