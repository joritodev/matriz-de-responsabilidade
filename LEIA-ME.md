# Pacote do Prazo para o Cursor

Tudo o que o Cursor precisa para construir o site, a API, o banco e o deploy, com o visual aprovado.

## O que tem aqui

| Arquivo | Para quê |
|---|---|
| `PROMPT.md` | O pedido completo para o Cursor: arquitetura, banco, regra de cobrança, rotas da API, telas, Make, deploy e as 6 fases com pontos de parada |
| `DESIGN.md` | Cores, fonte, componentes, estados e comportamento no celular |
| `reference/screens/` | Imagens das telas aprovadas (01 a 06) e dos quadros de automação (07 a 09) |
| `reference/html/` | As mesmas telas em HTML, para o Cursor copiar medidas exatas |
| `starter/reminders/` | A regra de cobrança já escrita e testada (27 testes) |
| `starter/supabase/` | O banco (migração validada em Postgres) e dados de exemplo |
| `.cursor/rules/` | Regras que o Cursor segue sozinho em todo pedido |

## Como usar

1. Crie um repositório vazio no GitHub (ex.: `prazo`) e clone no seu computador.
2. Extraia este pacote **na raiz** do repositório. A pasta `.cursor` começa com ponto e pode ficar oculta: confira se ela foi junto.
3. Abra a pasta no Cursor, abra o chat em modo **Agent** e escolha o modelo mais forte disponível.
4. Mande: **"Leia o PROMPT.md inteiro e execute a Fase 1. Pare no checkpoint."**
5. Teste o que ele pedir, responda "ok, pode seguir para a Fase 2" e assim por diante.
6. Na fase 3, peça prints das telas e compare com `reference/screens/`. Se algo estiver diferente, mande a imagem de referência junto com o print e diga o que mudar.

## Contas que você vai precisar

- **GitHub**: guardar o código.
- **Supabase**: banco e login (o plano gratuito serve para começar).
- **Vercel**: hospedar o site e a API (o plano gratuito serve para uso pessoal; para vender ao contratante, confira o plano Pro).
- **Make**: rodar a cobrança das 08:00.
- **Provedor de WhatsApp** (decisão sua, ver abaixo) e um **Gmail ou Microsoft 365** para os e-mails.

## Decisões que ainda são suas

- **Provedor de WhatsApp.** A API oficial da Meta só envia mensagens iniciadas por você com modelos aprovados, e isso não combina com a lista livre de demandas. Os provedores não oficiais aceitam texto livre, mas existe risco de bloqueio do número. Dá para começar só por e-mail e ligar o WhatsApp depois: a API e as telas já funcionam com os dois.
- **Nome do produto.** "Prazo" é provisório. Se mudar, peça ao Cursor para trocar o nome na marca e nos textos.
- **Feriados locais.** O banco já vem com os feriados nacionais até dez/2027. Se a instituição fecha em feriados de Fortaleza ou do Ceará, eles entram na fase 6.

## Depois do deploy

Com a API publicada, o cenário do Make pode ser montado direto na sua conta pela conexão do Make aqui no Claude. Basta mandar a URL da API e dizer qual provedor de WhatsApp escolheu.
