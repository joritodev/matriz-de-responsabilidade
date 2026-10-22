-- D3: o Make pode confirmar o recebimento ("taken") antes do envio; a reserva continua ativa.
alter type public.batch_status add value if not exists 'taken';
