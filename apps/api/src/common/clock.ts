import { Injectable, Logger } from '@nestjs/common';
import { APP_TIME_ZONE, todayInTimeZone, type IsoDate } from '../reminders/rules/reminder-rules';

@Injectable()
export class Clock {
  private readonly logger = new Logger('Clock');
  readonly timeZone = process.env.APP_TIME_ZONE ?? APP_TIME_ZONE;
  private readonly fixedToday: IsoDate | null;

  constructor() {
    const fixed = process.env.APP_FIXED_TODAY;
    if (fixed && process.env.NODE_ENV !== 'production' && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) {
      this.fixedToday = fixed;
      this.logger.warn(`APP_FIXED_TODAY ativo: "hoje" é ${fixed}.`);
    } else {
      this.fixedToday = null;
    }
  }

  today(): IsoDate {
    return this.fixedToday ?? todayInTimeZone(new Date(), this.timeZone);
  }

  now(): Date {
    return new Date();
  }
}
