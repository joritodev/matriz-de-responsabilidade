# Respostas do dono (Q1–Q5)

**Status:** respondidas em 27/08/2026. Valem como lei de produto a partir desta data.  
**Fonte:** mensagem do dono na FASE 0.

| ID | Resposta | Efeito |
|----|----------|--------|
| **Q1** | Só o dono é `ADMIN`. Sem Operators no dia 1. | Seed: 1 usuário ADMIN. Papel `OPERATOR` permanece no schema, **sem UI e sem seed**. |
| **Q2** | Não há WABA. CNPJ provavelmente necessário. Pediu explicação e opções. | Cloud API **não** é pré-requisito da FASE 1–2. Ver `docs/runbooks/whatsapp-waba-brasil.md`. `WHATSAPP_ENABLED=false` até existir conta oficial. |
| **Q3** | **A** — recorrência reabre o próximo período sozinha. | Confirma **A16**. |
| **Q4** | Sócios = chefes. No **pedido**, o ADMIN cola mensagem no **grupo** onde todos estão, perguntando. Se aprovado, avisa quem pediu. Se não, avisa também e busca reduzir o atraso. | Canal primário = **texto copiável**. O sistema **não** envia ao grupo via API. Ver fluxo em `docs/01-functional-spec.md` §2.7. |
| **Q5** | **A** — um “já entreguei” valida a **tarefa inteira**. | Confirma assumption da tarefa una. |

Nenhuma resposta inicia a FASE 1 por si só. FASE 1 continua exigindo “pode implementar”.
