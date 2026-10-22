-- Transições: queued -> taken|sent|failed e taken -> sent|failed.
-- Falha libera as reservas para nova tentativa; taken e sent mantêm a reserva.
-- Só sent/failed são finais e marcam finished_at.
create or replace function public.reminder_batches_status_guard() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'sent' or old.status = 'failed' then
      raise exception 'Cobrança % já finalizada como %', old.id, old.status using errcode = 'check_violation';
    end if;
    if old.status = 'taken' and new.status <> 'sent' and new.status <> 'failed' then
      raise exception 'Cobrança % já foi aceita pelo Make', old.id using errcode = 'check_violation';
    end if;
    if new.status = 'failed' then
      update public.reminder_batch_items set is_active = false where batch_id = new.id;
    end if;
    if (new.status = 'sent' or new.status = 'failed') and new.finished_at is null then
      new.finished_at := now();
    end if;
  end if;
  return new;
end $$;
