import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { Clock } from '../common/clock';
import { badRequest, conflict, notFound } from '../common/errors';
import { loadSnapshot } from '../common/snapshot';
import { folderSummary } from '../common/views';
import { DB, pgConstraint, pgErrorCode, type Db } from '../db/client';
import { matrices, type FolderColor } from '../db/schema';
import { slugify } from '../reminders/rules/schedule';

@Injectable()
export class MatricesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async list(includeArchived = false) {
    const today = this.clock.today();
    const snap = await loadSnapshot(this.db, { includeArchived });
    return snap.matrices.map((m) => folderSummary(snap, m, today));
  }

  async create(input: { name: string; color: FolderColor; description?: string | null }) {
    try {
      return await this.db.transaction(async (tx) => {
        const existing = await tx.select({ slug: matrices.slug }).from(matrices);
        const taken = new Set(existing.map((r) => r.slug));
        const base = slugify(input.name);
        let slug = base;
        for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
        const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${matrices.position}), 0)` }).from(matrices);
        const [row] = await tx
          .insert(matrices)
          .values({ name: input.name, color: input.color, description: input.description ?? null, slug, position: Number(max) + 1 })
          .returning();
        return row;
      });
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async update(id: string, input: { name?: string; color?: FolderColor; description?: string | null; isArchived?: boolean }) {
    try {
      const [row] = await this.db.update(matrices).set(input).where(eq(matrices.id, id)).returning();
      if (!row) throw notFound('Pasta não encontrada.', 'matrix_not_found');
      return row;
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async reorder(ids: string[]) {
    await this.db.transaction(async (tx) => {
      const all = await tx.select({ id: matrices.id }).from(matrices);
      const known = new Set(all.map((r) => r.id));
      if (ids.some((id) => !known.has(id))) throw badRequest('A lista tem uma pasta que não existe.', 'unknown_matrix');
      for (const [i, id] of ids.entries()) await tx.update(matrices).set({ position: i + 1 }).where(eq(matrices.id, id));
    });
    return this.list();
  }

  async bySlug(slug: string) {
    const [row] = await this.db.select().from(matrices).where(eq(matrices.slug, slug)).limit(1);
    if (!row) throw notFound('Pasta não encontrada.', 'matrix_not_found');
    return row;
  }

  private mapError(err: unknown) {
    if (pgErrorCode(err) === '23505' && pgConstraint(err) === 'matrices_name_active_key') {
      return conflict('Já existe uma pasta com esse nome.', 'matrix_name_taken');
    }
    return err;
  }
}
