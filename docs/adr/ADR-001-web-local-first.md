# ADR-001 — Web local-first e Docker Compose como ambiente de verdade

Status: Aceito (FASE 0)

## Contexto

A aplicação precisa ser usada no dia a dia pelo administrador (PROMPT §2, §48): abrir localmente, cadastrar matrizes, acompanhar prazos e, nas fases 3–5, receber WhatsApp. O desenvolvimento atual mistura três tentações:

1. “Roda na minha Node”, com Postgres na nuvem de alguém e ENV irreproduzível.
2. “Webhook no meu laptop com túnel 24h”, transformando a máquina do desenvolvedor em produção.
3. “Já deixa pronto pra Kubernetes”, para um sistema interno single-tenant (A1) que não tem tráfego nem equipe de plataforma.

O PROMPT (§14, §27, §47) exige: Docker Compose; `docker compose up` sobe postgres, web e worker; túnel de WhatsApp separado; em produção, **não** depender da máquina de desenvolvimento ligada. Stack travada em A4/A5.

## Decisão

1. **Ambiente canônico de desenvolvimento = Docker Compose** com três serviços sempre ligados: `postgres`, `web` (`apps/web`, Next.js App Router) e `worker` (`apps/worker`). Quem clona o repositório reproduz o mesmo runtime, não um setup pessoal.
2. **Local-first de produto:** FASE 1 (e boa parte da 2) é plenamente utilizável em `http://localhost:3000` sem Meta, sem OpenAI e sem túnel. Credenciais externas são opcionais e ligadas por flag (`WHATSAPP_ENABLED`, `AI_ENABLED`).
3. **Túnel HTTPS para webhook WhatsApp é perfil Compose separado** (`whatsapp-tunnel`), documentação em runbook, nunca o caminho default de `docker compose up`. Serve só para desenvolver FASE 3+ contra a Cloud API.
4. **Produção futura é um runtime equivalente e autônomo:** um host (VPS ou PaaS) com os mesmos três processos + Postgres, HTTPS estável e webhook cadastrado na Meta. Zero dependência do laptop. Sem Kubernetes, sem cluster, sem “staging obrigatório em nuvem” no desenho do MVP.
5. **Next.js é o único HTTP público** (UI, Server Actions, webhook). O worker não publica porta. Browser desktop-first (A36).

## Consequências

- Onboarding reduzido a copiar `.env.example` e `docker compose up`.
- Testes de integração/E2E apontam para o mesmo Compose (Vitest/Playwright, A4).
- FASE 1 não fica bloqueada por WABA (Q2) nem por túnel instável.
- Produção precisa de hostname e backup — responsabilidade DevOps, não de um processo na máquina do autor.
- Há um custo: imagens Docker e um pouco mais de fricção que `pnpm dev` puro. Aceitável. `pnpm dev` pode existir como atalho **desde que** use o Postgres do Compose, não um SQLite paralelo.
- O túnel local, se usado, é efêmero. Templates e número de produção não devem apontar para URL de ngrok/cloudflared de um desenvolvedor.

## Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| Só `pnpm dev` + Postgres instalado na máquina | Irreproduzível; quebra o critério “testado localmente” da §50 para outro operador. |
| SQLite / Postgres embedded “pra ficar simples” | Quebra ADR-002; pg-boss, concorrência e produção divergem do local. |
| Kubernetes / Helm / microservices desde o dia 1 | Explicitamente proibido (PROMPT §47). Complexidade sem operação. |
| Worker e web no mesmo processo Node | Crash da UI mata o scheduler; o contrário também. PROMPT §27 pede worker separado. |
| Webhook WhatsApp só via máquina do dev em “produção” | Viola PROMPT §14. Sistema some quando o notebook fecha. |
| Serverless-only (Vercel + job externo) no MVP | Dois provedores, cold start, e worker/outbox mais difíceis de raciocinar localmente. Pode ser destino futuro, não o ambiente de verdade agora. |
| Expo / app nativo | Produto é ferramenta operacional desktop-first (A36). |
