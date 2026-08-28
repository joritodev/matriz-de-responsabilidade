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

## Graphify (skill de primeira classe)

Origem: https://github.com/Graphify-Labs/graphify  
Guia do projeto: `docs/13-graphify.md`  
Skill versionada: `.cursor/skills/graphify/SKILL.md`  
Regra Cursor: `.cursor/rules/graphify.mdc` (`alwaysApply`)

Antes de explorar o repositório com Grep/Glob/Read, consultar o grafo:

- `graphify query "<pergunta>"`
- `graphify path "<A>" "<B>"`
- `graphify explain "<conceito>"`
- `graphify-out/GRAPH_REPORT.md` para visão ampla

Depois de alterar `docs/` ou código: `graphify update .`

Incluir esta regra em todo prompt de sub-agent de exploração. Sub-agents continuam em `model: inherit`.

Graphify **não** é dependência de runtime da aplicação.
