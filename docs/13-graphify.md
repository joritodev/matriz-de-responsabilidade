# Graphify neste repositório

**Skill de primeira classe.** Origem: [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify).  
**Por que existe aqui:** o projeto é spec-driven, com dezenas de documentos que se referenciam. Agentes e humanos devem **consultar o grafo antes de varrer o repo**.

Graphify **não** entra no runtime da aplicação (não é dependência de `apps/web`). É ferramenta de desenvolvimento, como o Drizzle é do banco.

Pacote PyPI atual: `graphifyy` (CLI continua `graphify`). Versão usada na FASE 0: `0.9.50`.

---

## O que já está no repo

| Artefato | Função |
|----------|--------|
| `.cursor/rules/graphify.mdc` | Sempre ativo no Cursor. Query-first. |
| `.cursor/skills/graphify/` | Skill oficial (comando `/graphify`, extract, query, update). |
| `.agents/skills/graphify/` | Mesma skill para outros agentes. |
| `graphify-out/graph.json` | Grafo da spec (nós = seções/docs). |
| `graphify-out/GRAPH_REPORT.md` | Hubs e god nodes. |
| `graphify-out/graph.html` | Visualização interativa (abrir no browser). |
| `graphify-out/graph-preview.png` | Captura estática do grafo. |
| `.graphifyignore` | Exclui `.git`, `node_modules`, o próprio output. |

---

## Como os agentes DEVEM usar

1. **Antes** de Grep/Glob/Read em exploração: `graphify query "<pergunta>"`.
2. Relação entre dois conceitos: `graphify path "DeadlineRule" "task_dependencies"`.
3. Um conceito: `graphify explain "WAITING_FOR_VALIDATION"`.
4. Visão ampla: ler `graphify-out/GRAPH_REPORT.md`.
5. Depois de mudar `docs/` ou código: `graphify update .` (AST/markdown, sem custo de API). Opcional: `graphify cluster-only . --no-label --no-viz`.
6. Todo sub-agent de exploração recebe essa regra no prompt (`inherit` / modo auto).

Isso reduz token, evita spec contraditória e mantém o INTEGRATOR alinhado aos docs oficiais.

---

## Como um humano instala no próprio máquina

```bash
pip install graphifyy   # ou: uv tool install graphifyy
export PATH="$HOME/.local/bin:$PATH"
graphify cursor install   # já versionado em .cursor/rules/graphify.mdc
graphify query "como funciona prorrogação"
```

Não commitar `graphify-out/cache/` nem `.graphify_python` (máquina local).

---

## Quando rebuildar

- Qualquer PR que altere `PROMPT.md` ou `docs/`.
- Início da FASE 1 (quando nascer código TypeScript — aí o AST passa a valer de verdade).
- Depois de fatias verticais grandes.

Wiki (`--wiki`) e labels de comunidade com LLM são opcionais (precisam de `GEMINI_API_KEY` / Claude). O grafo EXTRACTED sem LLM já é útil na FASE 0.
