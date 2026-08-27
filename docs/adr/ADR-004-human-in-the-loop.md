# ADR-004 — Human-in-the-loop e ações proibidas à IA

Status: Aceito (FASE 0)

## Contexto

O objetivo do produto é tirar do administrador o **acompanhamento operacional**, não a **decisão** (PROMPT §2–3). Um chatbot que conversa sozinho com responsáveis tende a: prorrogar prazo por conta própria, aceitar “já entreguei” como conclusão, negociar data, e apagar rastro. Isso recria o caos do Word, agora com autoridade falsa de um modelo.

A IA é útil na triagem: interpretar resposta, classificar, extrair, resumir, sugerir, avisar. O banco é a fonte de verdade (PROMPT §37, A8, A15). Conclusão de tarefa libera dependentes e recalcula prazos relativos (A14, A29) — é fato de negócio irreversível no fluxo, não um palpite linguístico.

Há perguntas abertas (Q5: um responsável entre vários diz “entreguei”). Elas não autorizam a IA a resolver o conflito: autorizam a **inbox**.

## Decisão

1. **A IA não possui porta de escrita no domínio.** `packages/ai` devolve um DTO validado (ADR-006). O worker persiste `ai_classifications` e, se necessário, abre item de inbox e/ou registra evento (`ExtensionRequested`, `TaskDeliveryClaimed`, `BlockerDetected`). **Nenhuma** transição `COMPLETED`, mudança de `calculated_due_date`, troca de responsável ou alteração de `task_dependencies` é disparada pelo classificador.
2. **Human-in-the-loop é o caminho padrão após a resposta do responsável.** A automação envia o lembrete inicial / D-n / atraso / pergunta de bloqueio. Depois disso, não há conversa livre automática (PROMPT §3).
3. **Lista de ações proibidas à IA** (PROMPT §3) — o modelo, o worker de classificação e qualquer prompt **não podem executar** estas ações. Só humano autenticado (ADMIN, salvo leitura):

   - prorrogar um prazo;
   - alterar responsável;
   - marcar tarefa como definitivamente entregue (`COMPLETED`);
   - excluir tarefa;
   - alterar dependências;
   - aprovar uma justificativa;
   - negociar uma nova data;
   - enviar comunicações sensíveis aos sócios;
   - executar alterações irreversíveis.

4. **Mapeamento obrigatório “disse X → sistema faz Y”** (não o contrário):

   | Sinal | Sistema | Humano |
   |---|---|---|
   | Pedido de prazo | `ExtensionRequested` + inbox. Prazo **inalterado** | Aprovar / ajustar data / rejeitar |
   | “Já fiz / já enviei” | `WAITING_FOR_VALIDATION` + `TaskDeliveryClaimed` + inbox | ADMIN confirma → `COMPLETED` (A14) |
   | Bloqueio / depende de alguém | Classificação + inbox; não cobra atraso como se fosse desídia (A26) | Desbloqueia, fala com terceiros, ou registra dependência **explícita** |
   | Low confidence / UNCLEAR | `requires_human_action = true` + inbox | Interpreta |
   | IA down | Mensagem crua na inbox (ADR-006) | Lê o texto |

5. **Origem no audit:** sugestão da IA grava `AI_SUGGESTION`. Ação do admin grava `USER`. Automação de lembrete grava `AUTOMATION`. Nunca esconder que uma mudança veio de job.
6. **Quick capture e import (FASE 7)** também são human-in-the-loop: draft + preview, nunca persistir demanda só porque o modelo extraiu campos (A34).
7. **Papel ADMIN vs OPERATOR (A9):** aprovar prorrogação, validar entrega e comunicar sócios são ADMIN. A IA não é um terceiro papel com superpoderes.

## Consequências

- Central de triagem (PROMPT §20) deixa de ser “tela extra” e vira o **único** lugar onde sugestão vira mutação.
- Resumos ao admin devem dizer explicitamente quando o sistema **não** tomou a decisão (PROMPT §21).
- Há mais cliques no caso feliz de “entreguei” (admin confirma). É o preço de não desbloquear dependentes por engano.
- Q5: até confirmação, um claim de qualquer responsável abre validação da **tarefa inteira** (tarefa una, A20). A inbox mostra quem falou. Não se inventa “entrega parcial” no MVP.
- Testes críticos (TDD, §43) cobrem: IA não chama repositório de Task para `COMPLETED`; pedido de prorrogação não altera `calculated_due_date`.

## Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| Agente autônomo com tools (`update_task`, `approve_extension`) | Viola §3 e §47. Irreversível + não auditável com clareza. |
| Auto-completar se `confidence > 0.9` | Threshold erra; “já entreguei” ainda não é entrega (PROMPT §19). |
| Chat livre até o responsável “resolver” | Objetivo oposto ao produto: automação inicia, humano negocia. |
| Tratar WhatsApp como fonte de verdade do status | Status operacional é persistido por regra/`USER`, não por texto (A13). |
| OPERATOR aprovar prorrogação no MVP | A9: ações sensíveis = ADMIN. Q1 não muda a lista da IA. |
| Deixar a IA calcular atraso / dia útil | Determinístico em `packages/core` (PROMPT §47, ADR-006). |
