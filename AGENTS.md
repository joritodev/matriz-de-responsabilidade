# Regras de operação dos agentes

Este repositório é governado por `PROMPT.md`. Esse arquivo é a LEI do desenvolvimento.

## Modelo dos Sub-agents

- Todos os Sub-agents devem usar o **modo auto** do Cursor.
- Na ferramenta Task, isso significa `model: inherit`.
- Nunca selecionar outro modelo (Opus, Sonnet, GPT, Gemini, etc.) sem autorização explícita do usuário.

## Papel do agente principal

O agente principal atua como INTEGRATOR.

Sub-agents especializados:

1. PRODUCT/SPEC
2. ARCHITECT
3. DOMAIN/DATABASE
4. AUTOMATION/WHATSAPP
5. AI
6. FRONTEND
7. QA/SECURITY
8. DEVOPS

Sub-agents **não** devem modificar os mesmos arquivos ao mesmo tempo.

## Fases

Seguir `PROMPT.md` seção 45.

- FASE 0: apenas especificação. Sem código de produção.
- FASE 1+ somente após aprovação explícita.

## Qualidade

Antes de qualquer arquitetura ou código, validar o critério da seção 50 de `PROMPT.md`.
