# PAPEL

Atue como uma equipe sênior de desenvolvimento de software composta por:

- Principal Software Architect
- Senior Full-Stack Engineer
- Senior Product Engineer
- Senior Backend Engineer
- Database/Data Modeling Engineer
- Automation Engineer
- WhatsApp Business Platform Integration Specialist
- AI/LLM Engineer
- UX/UI Product Designer
- QA/Test Automation Engineer
- Application Security Engineer
- DevOps Engineer

Você não deve simplesmente começar a escrever código.

Este projeto deverá utilizar:

SPEC-DRIVEN DEVELOPMENT como metodologia principal;
SUBAGENTS ESPECIALIZADOS para análise e execução;
DOMAIN-DRIVEN DESIGN apenas onde trouxer clareza real;
TEST-DRIVEN DEVELOPMENT para regras de negócio críticas;
VERTICAL SLICES para implementação incremental;
HUMAN-IN-THE-LOOP para decisões sensíveis.

O objetivo não é criar uma demo bonita.
O objetivo é criar uma aplicação interna confiável, simples de operar e evolutiva.


==================================================
1. VISÃO DO PRODUTO
==================================================

Quero substituir um processo atualmente mantido em documentos Word por uma aplicação que centralize matrizes de responsabilidade.

Atualmente existem:

- uma Matriz Geral;
- matrizes específicas de projetos;
- matrizes específicas de cursos;
- matrizes específicas de produtos;
- outras matrizes que poderão ser criadas no futuro.

Cada matriz possui demandas/tarefas.

Visualmente, a principal visualização deverá continuar parecida com uma tabela contendo:

1. Número/Ordem
2. Responsável
3. Tarefa
4. Prazo
5. Pré-requisito
6. Observações

IMPORTANTE:

O número da demanda representa prioritariamente a ordem em que ela foi cadastrada dentro da matriz.

NÃO interprete automaticamente:

demanda 3 depende da demanda 2.

Uma dependência só existe quando for explicitamente cadastrada.

Em alguns projetos, contudo, as demandas realmente precisam ser cumpridas em sequência. Nesses casos, isso deverá ser representado através de dependências explícitas entre tarefas.


==================================================
2. OBJETIVO CENTRAL
==================================================

A aplicação deve reduzir minha responsabilidade operacional para basicamente:

1. criar uma matriz;
2. adicionar uma demanda;
3. indicar responsável;
4. definir prazo;
5. indicar dependências;
6. acompanhar exceções;
7. intervir apenas quando realmente necessário.

O sistema deverá fazer automaticamente boa parte do acompanhamento posterior.

A aplicação deve:

- monitorar prazos;
- identificar tarefas próximas do prazo;
- identificar atrasos;
- verificar tarefas bloqueadas por pré-requisitos;
- enviar lembretes pelo WhatsApp;
- perguntar se existe algum impedimento;
- perguntar se o responsável precisa de algo;
- perguntar se depende de outra pessoa;
- receber as respostas;
- interpretar essas respostas;
- identificar pedidos de prorrogação;
- identificar bloqueios;
- identificar necessidade de intervenção humana;
- resumir a situação para mim;
- me alertar no WhatsApp e no sistema;
- manter histórico de tudo;
- facilitar a comunicação de prorrogações aos sócios.

A automação deve retirar trabalho operacional de acompanhamento sem retirar de mim decisões importantes.


==================================================
3. PRINCÍPIO FUNDAMENTAL DE AUTOMAÇÃO
==================================================

NÃO criar um chatbot autônomo que conversa indefinidamente com os responsáveis.

O objetivo é:

AUTOMAÇÃO PARA INICIAR E ORGANIZAR O ACOMPANHAMENTO.
HUMANO PARA NEGOCIAR E TOMAR DECISÕES.

A automação pode enviar:

- lembrete inicial;
- aviso de prazo próximo;
- aviso de atraso;
- pergunta inicial sobre bloqueios;
- solicitação de atualização de andamento.

Quando o responsável responder, a IA deverá:

1. interpretar;
2. classificar;
3. extrair informações;
4. resumir;
5. sugerir uma ação;
6. avisar o administrador.

Por padrão, NÃO deverá continuar uma conversa livre automaticamente.

Nunca permitir que um LLM sozinho:

- prorrogue um prazo;
- altere responsável;
- marque tarefa como definitivamente entregue;
- exclua tarefa;
- altere dependências;
- aprove uma justificativa;
- negocie uma nova data;
- envie comunicações sensíveis aos sócios;
- execute alterações irreversíveis.

Essas ações exigem confirmação humana.


==================================================
4. CONCEITO DE MATRIZ
==================================================

Criar entidade "Matrix".

Campos mínimos:

- id
- name
- description
- type
- created_at
- updated_at
- archived_at
- active

Possíveis tipos:

GENERAL
PROJECT
COURSE
PRODUCT
EVENT
OTHER

Não tornar os tipos rígidos demais.

Deve ser fácil adicionar novos tipos futuramente.

A aplicação deve possuir:

VISÃO "MATRIZES"

Exemplo:

Matriz Geral
Ordenador de Despesas Presencial
Pós-Graduação Ordenação de Despesas
OD Academy
Curso X
Projeto Y

VISÃO "GERAL"

Além das matrizes individualmente, deverá existir uma visão agregada de todas as demandas de todas as matrizes.

Não duplicar tarefas para gerar essa visão.

A visão geral é apenas uma consulta agregada.


==================================================
5. RESPONSÁVEIS
==================================================

Um responsável é uma entidade reutilizável.

Ao cadastrar uma pessoa uma vez, os dados deverão ficar disponíveis para futuras tarefas.

Campos:

- id
- name
- role
- whatsapp_number
- whatsapp_number_e164
- email opcional
- active
- whatsapp_opt_in/status quando aplicável
- notes
- created_at
- updated_at

Exemplos de papéis:

Professor
Diretoria Executiva
Diretoria Comercial
Marketing
Administrador
Site
Fornecedor
Parceiro
Outro

IMPORTANTE:

Uma tarefa pode ter UM OU MAIS responsáveis.

Exemplo real:

Giovanni Pacelli e Francisco Netto.

Portanto:

NÃO colocar simplesmente responsible_id dentro de tasks.

Criar relacionamento many-to-many:

task_responsibles.


==================================================
6. TAREFAS
==================================================

Criar entidade Task.

Campos conceituais mínimos:

- id
- matrix_id
- sequence_number
- title
- description
- base_status
- created_at
- updated_at
- completed_at
- cancelled_at
- created_by

sequence_number:

- incremental por matriz;
- representa ordem de cadastro;
- não representa prioridade;
- não gera dependência automaticamente.

O sistema deverá permitir posteriormente edição de exibição, mas preservar histórico.


==================================================
7. STATUS
==================================================

Evitar guardar "Atrasado" diretamente como estado principal quando isso puder ser calculado.

Separar:

STATUS OPERACIONAL

- PENDING
- IN_PROGRESS
- BLOCKED
- WAITING_FOR_INPUT
- WAITING_FOR_VALIDATION
- COMPLETED
- CANCELLED

de:

STATUS DE PRAZO CALCULADO

- WAITING_FOR_TRIGGER
- ON_TIME
- DUE_SOON
- DUE_TODAY
- OVERDUE
- COMPLETED

e:

STATUS DE PRORROGAÇÃO

- NONE
- REQUESTED
- APPROVED
- REJECTED

Isso evita estados inconsistentes.

Por exemplo:

uma tarefa pode estar:

IN_PROGRESS + OVERDUE

ou:

BLOCKED + ON_TIME.


==================================================
8. DEPENDÊNCIAS
==================================================

Criar relacionamento:

task_dependencies

- task_id
- depends_on_task_id

Permitir múltiplos pré-requisitos.

Exemplo:

Tarefa 5 depende das tarefas 2 e 4.

O sistema deverá:

- impedir dependência circular;
- impedir que uma tarefa dependa dela própria;
- identificar bloqueios;
- mostrar visualmente qual tarefa está impedindo outra;
- recalcular datas quando uma dependência for concluída;
- gerar histórico.

Não inferir dependência apenas pela sequência das demandas.


==================================================
9. SISTEMA DE PRAZOS
==================================================

Esta é uma das partes mais críticas do projeto.

Não modele prazo apenas como uma coluna DATE.

Precisamos suportar diferentes modalidades.

DEADLINE TYPE:

1. FIXED_DATE

Exemplo:

28/08/2026

2. BUSINESS_DAYS_AFTER_CREATION

Exemplo:

15 dias úteis após cadastramento.

3. BUSINESS_DAYS_AFTER_DEPENDENCY

Exemplo:

"em até 15 dias úteis após a definição da data da live"

A tarefa fica aguardando sua predecessora.

Quando a predecessora for concluída/validada:

due_date =
completion_date + 15 dias úteis.

4. CALENDAR_DAYS_AFTER_TRIGGER

Deixar preparado.

5. RECURRING_BUSINESS_DAY

Exemplo:

"até o terceiro dia útil de cada mês".

6. MANUAL / UNDEFINED

Para casos em que o prazo ainda será definido.

Cada DeadlineRule deverá armazenar de maneira estruturada:

- deadline_type
- fixed_date
- amount
- unit
- trigger_type
- trigger_task_id
- recurrence_rule/config
- calculated_due_date
- timezone
- calendar_id

Não guardar apenas texto.

O texto apresentado ao usuário poderá ser gerado a partir desses dados.


==================================================
10. DIAS ÚTEIS
==================================================

Implementar um Business Calendar.

O cálculo deverá considerar:

- sábado;
- domingo;
- feriados configurados.

Criar tabela/configuração de Holidays.

Permitir:

- feriados nacionais;
- feriados específicos adicionados manualmente;
- calendários diferentes futuramente.

Não depender exclusivamente de uma API externa para cálculo histórico.

Configurar locale:

pt-BR

Timezone deve ser configurável no sistema.


==================================================
11. OBSERVAÇÕES
==================================================

A coluna "Observações" existente na matriz deve continuar existindo visualmente.

Porém NÃO guardar toda a lógica apenas dentro de um campo de texto.

O sistema deve construir uma apresentação amigável com base nos dados estruturados.

Exemplos:

"Pendente"

"Entregue em 27/08/2026"

"Atrasada há 3 dias"

"Prorrogado 1 vez. Novo prazo: 05/09/2026."

"Prorrogado 2 vezes. Última prorrogação solicitada por Matheus."

Também permitir observações manuais adicionais.

Criar task_notes para anotações livres.


==================================================
12. PRORROGAÇÕES
==================================================

Prorrogação precisa possuir histórico próprio.

Criar DeadlineExtension:

- id
- task_id
- previous_due_date
- requested_due_date
- approved_due_date
- requested_by
- reason
- request_source
- requested_at
- approved_by
- approved_at
- rejected_at
- status
- notes

Quando alguém pelo WhatsApp pedir:

"Vou precisar de mais uns 3 dias porque ainda estou esperando o material do Francisco."

A IA pode identificar:

extension_requested = true

reason =
"aguardando material do Francisco"

suggested_new_deadline =
se houver informação suficiente.

Porém:

NÃO alterar o prazo automaticamente.

Criar:

EXTENSION REQUESTED.

Avisar o administrador.

O administrador deverá poder:

APROVAR
AJUSTAR DATA
REJEITAR

Ao aprovar:

- registrar prazo anterior;
- registrar prazo novo;
- incrementar contador;
- adicionar ao histórico;
- recalcular automações;
- atualizar visualização;
- registrar audit log.


==================================================
13. AVISO DE PRORROGAÇÃO AOS SÓCIOS
==================================================

Quando uma prorrogação for APROVADA, gerar automaticamente uma comunicação estruturada contendo:

- matriz;
- número da demanda;
- tarefa;
- responsável;
- prazo anterior;
- novo prazo;
- motivo;
- quem solicitou a prorrogação;
- número de prorrogações da tarefa.

Exemplo de formato:

"Prorrogação registrada — OD Academy

Demanda #3
Responsável: Fenilli
Tarefa: Elaborar versão 1
Prazo anterior: 25/10/2026
Novo prazo: 30/10/2026
Solicitado por: Fenilli
Motivo: aguardando consolidação dos materiais
Prorrogação nº 1."

Arquitetar NotificationTargets.

Tipos:

IN_APP
WHATSAPP_INDIVIDUAL
WHATSAPP_GROUP, se tecnicamente disponível e autorizado para a conta
EMAIL, futuramente

Não tornar todo o sistema dependente da possibilidade de enviar mensagens para grupos.

Caso WhatsApp Group não esteja disponível para a conta utilizada:

- enviar para pessoas configuradas individualmente;
ou
- gerar mensagem pronta para copiar;
ou
- criar notificação in-app.

Essa integração deverá ser abstraída.


==================================================
14. WHATSAPP
==================================================

Priorizar a API OFICIAL:

Meta WhatsApp Business Platform / Cloud API.

Não usar automação baseada em WhatsApp Web, Selenium, Puppeteer ou bibliotecas não oficiais como arquitetura principal.

Implementar uma camada:

WhatsAppProvider

Interface conceitual:

sendTemplate()
sendText()
receiveWebhook()
getMessageStatus()

Assim a implementação poderá ser trocada futuramente.

Criar inicialmente:

MetaWhatsAppProvider.

Durante desenvolvimento local:

- aplicação web pode ficar em localhost;
- webhook deverá ser exposto temporariamente através de túnel HTTPS;
- configuração deverá ser documentada.

Em produção:

não depender da máquina de desenvolvimento estar ligada.

IMPORTANTE:

Respeitar as regras atuais da Meta sobre:

- opt-in;
- templates;
- janela de atendimento;
- webhooks;
- limites;
- qualidade;
- políticas de mensagens.

Não hardcodar essas regras sem verificar documentação oficial atual.


==================================================
15. TEMPLATES DE MENSAGEM
==================================================

Precisaremos inicialmente de pelo menos:

REMINDER_DUE_SOON

"Oi, {{nome}}. Passando para lembrar da demanda #{{numero}} da matriz {{matriz}}: {{tarefa}}.

O prazo é {{prazo}}.

Está tudo caminhando para conseguirmos concluir dentro do prazo?

Se tiver algum bloqueio, estiver dependendo de alguém ou precisar de alguma coisa, pode me avisar por aqui."

OVERDUE

"Oi, {{nome}}. A demanda #{{numero}} da matriz {{matriz}} está com prazo vencido e ainda consta como pendente:

{{tarefa}}

Consegue me atualizar sobre o andamento?

Se houver algum impedimento ou se for necessário rever o prazo, me informe também o motivo e a nova previsão."

BLOCKED FOLLOW-UP

Criar somente quando fizer sentido.

O tom deve ser:

- humano;
- curto;
- educado;
- profissional;
- não robótico;
- sem excesso de formalidade.

Evitar disparar diversas mensagens para a mesma pessoa no mesmo dia.


==================================================
16. REGRAS DE NOTIFICAÇÃO
==================================================

Criar NotificationRules configuráveis.

Não hardcode os valores definitivamente.

Criar defaults iniciais razoáveis, como:

- D-3 dias úteis;
- D-1 dia útil;
- dia do vencimento;
- D+1;
- novo follow-up após determinado período.

Mas permitir alteração.

Adicionar regras anti-spam:

- não mandar o mesmo tipo de lembrete duas vezes;
- não mandar mensagem repetida em menos de X horas;
- não mandar lembrete se tarefa estiver concluída;
- não cobrar tarefa bloqueada como se o responsável estivesse atrasado;
- não cobrar tarefa cujo prazo ainda não começou;
- evitar uma mensagem por tarefa caso o mesmo responsável tenha muitas demandas no mesmo dia.

Preparar sistema para "digest":

"Você possui 3 demandas para acompanhar..."

em vez de 3 mensagens independentes.

A estratégia deverá ser configurável.


==================================================
17. RECEBIMENTO DAS RESPOSTAS
==================================================

Todo webhook recebido deverá ser persistido antes de qualquer processamento.

Criar:

Conversation
Message

Mensagem deve guardar:

- provider_message_id
- direction
- responsible/contact
- task quando identificável
- matrix quando identificável
- raw payload protegido
- normalized text
- timestamp
- processing_status

Implementar IDEMPOTÊNCIA.

Se a Meta reenviar o mesmo webhook:

não processar duas vezes.

Verificar assinatura/autenticidade dos webhooks conforme documentação oficial.


==================================================
18. IA PARA TRIAGEM
==================================================

Usar IA somente onde ela traga valor.

Sugestão:

OpenAI Responses API
+
Structured Outputs
+
Zod/JSON Schema.

O modelo utilizado deve ser configurável por ENV.

Não hardcodar um modelo específico se não for necessário.

O modelo deverá receber:

- mensagem recebida;
- tarefa;
- responsável;
- matriz;
- prazo atual;
- estado;
- dependências relevantes;
- mensagens recentes estritamente necessárias.

Retornar JSON ESTRUTURADO.

Schema conceitual:

{
  "classification": enum [
    "ON_TRACK",
    "BLOCKED",
    "NEEDS_INPUT",
    "NEEDS_ANOTHER_PERSON",
    "EXTENSION_REQUEST",
    "CLAIMS_DELIVERED",
    "UNCLEAR",
    "OTHER"
  ],

  "summary": string,

  "reason": string | null,

  "requested_new_deadline": date | null,

  "mentioned_people": string[],

  "dependencies_or_blockers": string[],

  "requires_human_action": boolean,

  "human_action_reason": string | null,

  "urgency": enum [
    "LOW",
    "MEDIUM",
    "HIGH"
  ],

  "confidence": number,

  "suggested_reply": string | null
}

Structured Output deve ser validado com schema.

Se confidence estiver abaixo de threshold:

requires_human_action = true.

Nunca confiar em parsing livre sem validação.


==================================================
19. REGRA PARA "JÁ ENTREGUEI"
==================================================

Se o responsável disser:

"Já fiz."
"Já enviei."
"Está pronto."

NÃO marcar automaticamente como COMPLETED.

Alterar para:

WAITING_FOR_VALIDATION

e avisar o administrador:

"Matheus informou que concluiu a demanda #1. Confirmar entrega?"

Somente após confirmação:

COMPLETED.

A conclusão de uma tarefa poderá liberar dependências posteriores.

Portanto ela é uma ação de negócio importante.


==================================================
20. CENTRAL DE TRIAGEM
==================================================

Criar uma tela:

"Caixa de Entrada"
ou
"Central de Pendências"

Mostrar situações que precisam do administrador:

- pedido de prorrogação;
- bloqueio;
- responsável precisa de alguma informação;
- responsável depende de outra pessoa;
- resposta não compreendida;
- tarefa declarada como entregue aguardando validação;
- tarefa crítica atrasada;
- falha de envio do WhatsApp.

Cada item deve permitir:

VER CONTEXTO

APROVAR AÇÃO

RESPONDER

ADIAR

MARCAR COMO RESOLVIDO


==================================================
21. RESUMOS PARA O ADMINISTRADOR
==================================================

Além do dashboard, a aplicação poderá enviar mensagens para o WhatsApp do administrador.

Exemplo:

"Atualização — Matheus

Matriz: Assinatura Suprema
Demanda: #1
Situação: bloqueio identificado

Matheus informou que está aguardando acesso ao site.

Prazo: 28/08/2026

Precisa de sua intervenção: SIM.

Motivo: precisa que alguém libere o acesso."

Outro exemplo:

"Pedido de prorrogação

Matriz: OD Academy
Demanda: #3
Responsável: Fenilli
Prazo atual: 25/10
Nova previsão solicitada: 30/10
Motivo: aguardando materiais

Nenhuma alteração foi feita ainda.

Acesse para aprovar ou rejeitar."

Sempre deixar explícito quando o sistema NÃO tomou uma decisão automaticamente.


==================================================
22. DASHBOARD
==================================================

Dashboard principal deve responder em segundos:

O que preciso olhar hoje?

Cards:

- vencem hoje;
- vencem nos próximos dias;
- atrasadas;
- bloqueadas;
- pedidos de prorrogação;
- aguardando minha resposta;
- aguardando validação;
- automações com erro.

Adicionar lista de:

"Prioridade de atenção"

Não confundir prioridade de atenção com sequence_number.


==================================================
23. TELA DA MATRIZ
==================================================

A visualização principal de cada matriz deverá continuar muito próxima da lógica atualmente utilizada.

Colunas:

Ordem
Responsável
Tarefa
Prazo
Pré-requisito
Observações

Permitir:

- filtro;
- pesquisa;
- ordenação;
- expansão da linha;
- abrir detalhes;
- alterar status;
- adicionar comentário;
- visualizar histórico;
- visualizar conversa;
- registrar prorrogação.

Usar TanStack Table ou equivalente maduro.

Responsáveis múltiplos devem aparecer corretamente.


==================================================
24. TELA DE DETALHE DA TAREFA
==================================================

Mostrar:

Título
Descrição
Matriz
Número
Responsáveis
Prazo original
Prazo atual
Regra de prazo
Pré-requisitos
Dependentes
Status
Situação do prazo
Número de prorrogações

E abaixo:

TIMELINE

Exemplo:

01/08
Tarefa criada

15/08
Lembrete enviado

25/08
Responsável informou bloqueio

25/08
Prorrogação solicitada

26/08
Prorrogação aprovada

26/08
Prazo alterado de 28/08 para 02/09

02/09
Entrega informada pelo responsável

02/09
Entrega validada


==================================================
25. AUDIT LOG
==================================================

Toda ação importante deve gerar histórico.

Registrar:

- quem fez;
- quando;
- dado anterior;
- dado novo;
- origem.

Origins:

USER
AUTOMATION
WHATSAPP
AI_SUGGESTION
SYSTEM

Nunca esconder alterações realizadas por automações.


==================================================
26. BANCO DE DADOS
==================================================

Banco recomendado:

PostgreSQL.

Mesmo rodando localmente.

Motivos:

- relacionamentos;
- dependências;
- histórico;
- concorrência futura;
- jobs;
- auditoria;
- possibilidade de hospedar futuramente.

ORM recomendado:

Drizzle ORM.

Usar migrations versionadas.

Entidades iniciais:

users
responsibles
matrices
tasks
task_responsibles
task_dependencies
deadline_rules
holidays
deadline_extensions
task_notes
task_status_history
conversations
messages
ai_classifications
notification_rules
notification_events
automation_jobs
audit_logs
system_settings

Revise essa lista durante o design.

Não crie tabelas redundantes sem necessidade.


==================================================
27. STACK RECOMENDADA
==================================================

FRONTEND/FULL STACK

- Next.js atual em versão estável e corrigida
- React
- TypeScript strict
- App Router
- Tailwind CSS
- shadcn/ui
- TanStack Table
- React Hook Form
- Zod

DATABASE

- PostgreSQL
- Drizzle ORM
- versioned migrations

BACKGROUND PROCESSING

Preferência inicial:

- pg-boss ou solução equivalente baseada em PostgreSQL

Objetivo:

evitar adicionar Redis ao MVP sem necessidade.

Criar worker separado da interface.

Se escala futura justificar:

BullMQ + Redis poderá substituir/adicionar infraestrutura.

AI

- OpenAI Responses API
- Structured Outputs
- Zod

WHATSAPP

- Meta WhatsApp Business Platform Cloud API
- Webhooks oficiais

TESTES

- Vitest
- Testing Library
- Playwright

INFRA

- Docker
- Docker Compose
- pnpm
- Node LTS compatível
- ENV validation

DEV LOCAL

docker compose up

Deverá iniciar ao menos:

postgres
web
worker

Adicionar tunnel como perfil/documentação separada para WhatsApp webhook.


==================================================
28. ESTRUTURA DO REPOSITÓRIO
==================================================

Preferir monorepo simples:

/apps
  /web
  /worker

/packages
  /core
  /db
  /whatsapp
  /ai
  /config
  /shared

/docs
  /specs
  /adr
  /runbooks

Não duplicar regra de negócio entre web e worker.

Regra de domínio pertence a packages/core.


==================================================
29. DOMAIN EVENTS
==================================================

Projetar eventos internos.

Exemplos:

TaskCreated
TaskUpdated
TaskCompleted
TaskDependencySatisfied
TaskDueSoon
TaskOverdue
ReminderScheduled
ReminderSent
ResponsibleResponded
BlockerDetected
ExtensionRequested
ExtensionApproved
ExtensionRejected
TaskDeliveryClaimed
TaskDeliveryValidated

Não precisa necessariamente adotar um complexo message broker.

Podemos implementar esses eventos de maneira simples dentro da aplicação inicialmente.

Mas a arquitetura deverá separar:

EVENTO
de
EFEITO COLATERAL.

Exemplo:

TaskOverdue

poderá resultar em:

ScheduleWhatsAppReminder.


==================================================
30. OUTBOX / CONFIABILIDADE
==================================================

Não chamar API externa diretamente dentro de uma transação crítica.

Para mensagens importantes, adotar transactional outbox ou mecanismo equivalente.

Fluxo:

transação salva evento/outbox
→ worker coleta
→ envia
→ registra resultado

Isso evita:

tarefa atualizada mas mensagem perdida;
mensagem enviada duas vezes;
inconsistência após crash.


==================================================
31. SEGURANÇA
==================================================

Implementar desde o início:

- secrets apenas em environment variables;
- nunca commitar tokens;
- validação das ENV;
- validação de webhook;
- proteção contra replay/duplicidade;
- sanitização de inputs;
- autorização;
- mascarar telefone nos logs quando possível;
- rate limiting;
- audit logging;
- error boundaries;
- backups;
- princípios OWASP.

Como existem:

nomes
telefones
mensagens
histórico operacional

considerar LGPD:

- minimização;
- propósito;
- retenção;
- possibilidade de exclusão;
- controle de acesso.


==================================================
32. OBSERVABILIDADE
==================================================

Adicionar logging estruturado.

Recomendação:

Pino ou equivalente.

Cada processamento deve ter correlation_id.

Exemplo:

webhook recebido
→ mensagem persistida
→ IA acionada
→ classificação criada
→ alerta criado

Tudo deve ser rastreável.

Preparar integração futura com Sentry ou equivalente.

Não exigir serviço pago para desenvolvimento local.


==================================================
33. UX
==================================================

O sistema é uma ferramenta operacional interna.

Não gastar esforço excessivo com animações.

Priorizar:

- velocidade;
- leitura;
- clareza;
- pouco clique;
- filtros;
- feedback imediato;
- estados claros;
- dashboard útil.

Design:

clean;
desktop-first;
responsivo;
profissional.

Não transformar tudo em cards.

A matriz/tabela é central ao produto.


==================================================
34. QUICK CAPTURE — FASE POSTERIOR
==================================================

Preparar arquitetura para futuramente permitir adicionar uma demanda através de linguagem natural.

Exemplo:

"Adicionar no OD Academy:
Fenilli precisa elaborar a versão 2 em até 10 dias úteis depois da entrega da tarefa 3."

IA extrai:

responsible
task
dependency
deadline rule

Porém mostra PREVIEW antes de salvar.

Nunca cadastrar automaticamente sem confirmação.

Não precisa estar no primeiro MVP.


==================================================
35. IMPORTAÇÃO — FASE POSTERIOR
==================================================

Planejar, mas não implementar cedo demais:

- CSV;
- XLSX;
- DOCX;
- eventualmente PDF.

Para documentos não estruturados:

IA pode converter em draft.

Exigir confirmação antes da gravação.

Banco de dados passa a ser a fonte oficial.

Word deixa de ser o source of truth.


==================================================
36. TEMPLATES DE MATRIZ — FASE POSTERIOR
==================================================

Permitir futuramente:

"Duplicar matriz como template".

Por exemplo:

Novo curso presencial

pode carregar automaticamente:

- definir ementa;
- validar professor;
- elaborar financeiro;
- preparar landing page;
- preparar divulgação;
etc.

Usuário poderá editar antes de ativar.


==================================================
37. REGRAS DE IA
==================================================

A IA NÃO é a fonte de verdade.

Banco de dados é a fonte de verdade.

Toda informação produzida por IA deve possuir:

- input reference;
- classification;
- confidence;
- created_at;
- model;
- schema_version.

Não armazenar raciocínio interno do modelo.

Guardar apenas resultados operacionais necessários.

Prompts devem ser versionados.


==================================================
38. VERSIONAMENTO DE PROMPTS
==================================================

Criar algo como:

AI_PROMPT_VERSION=responsibility-triage-v1

Se alterarmos o prompt:

v2.

Isso ajuda a investigar por que determinada mensagem foi classificada de determinada maneira.


==================================================
39. FALLBACK SEM IA
==================================================

Se a OpenAI estiver indisponível:

- mensagem continua armazenada;
- aparece como "pendente de classificação";
- administrador recebe alerta/in-app;
- sistema continua funcionando.

IA nunca poderá ser ponto único de falha para dados ou prazos.


==================================================
40. SUBAGENTS
==================================================

Se o ambiente possuir suporte a subagentes, crie os seguintes.

SUBAGENT 1 — PRODUCT/SPEC

Responsável por:

- requisitos;
- casos de uso;
- regras;
- ambiguidades;
- acceptance criteria.

Não escreve código de produção.

SUBAGENT 2 — ARCHITECT

Responsável por:

- arquitetura;
- módulos;
- boundaries;
- ADRs;
- decisões de stack.

SUBAGENT 3 — DOMAIN/DATABASE

Responsável por:

- modelo relacional;
- prazos;
- business calendar;
- dependências;
- state machines;
- migrations.

SUBAGENT 4 — AUTOMATION/WHATSAPP

Responsável por:

- Meta Cloud API;
- webhook;
- templates;
- idempotência;
- scheduler;
- jobs;
- outbox.

SUBAGENT 5 — AI

Responsável por:

- classificação;
- Structured Outputs;
- schemas;
- prompts;
- thresholds;
- human-in-the-loop.

SUBAGENT 6 — FRONTEND

Responsável por:

- dashboard;
- matriz;
- inbox;
- task detail;
- forms;
- usability.

SUBAGENT 7 — QA/SECURITY

Responsável por:

- test plan;
- integration tests;
- E2E;
- threat model;
- webhook security;
- authorization;
- edge cases.

SUBAGENT 8 — DEVOPS

Responsável por:

- Docker;
- Docker Compose;
- local setup;
- production-ready configuration;
- backups;
- logging.

SUBAGENTS NÃO DEVEM:

modificar simultaneamente os mesmos arquivos.

O agente principal atua como INTEGRATOR.


==================================================
41. SKILLS ÚTEIS
==================================================

Antes de cada módulo, verificar se o ambiente possui skills/documentação especializada para:

- spec-driven development;
- Next.js;
- React;
- TypeScript;
- PostgreSQL;
- Drizzle ORM;
- database migrations;
- background jobs;
- WhatsApp Cloud API;
- webhooks;
- OpenAI Responses API;
- Structured Outputs;
- Zod;
- Docker;
- Playwright;
- Vitest;
- web security;
- accessibility;
- Git;
- CI/CD.

Se houver skill específica disponível:

LÊ-LA ANTES DE IMPLEMENTAR.

Priorizar documentação oficial e documentação correspondente à versão instalada.

Não confiar em conhecimento antigo do modelo para APIs que mudam frequentemente.


==================================================
42. METODOLOGIA DE DESENVOLVIMENTO
==================================================

O desenvolvimento deverá seguir:

SPEC
↓
DOMAIN MODEL
↓
ARCHITECTURE
↓
ADRs
↓
ACCEPTANCE CRITERIA
↓
TEST PLAN
↓
IMPLEMENTATION PLAN
↓
VERTICAL SLICE
↓
TESTS
↓
IMPLEMENTATION
↓
REVIEW
↓
NEXT SLICE

Evitar:

"vamos criar todas as telas e depois conectar".

Implementar verticalmente.

Exemplo Slice 1:

Criar matriz
+
persistir banco
+
listar matriz
+
teste

Slice 2:

Criar responsável
+
persistir
+
listar
+
teste

Slice 3:

Criar tarefa
+
prazo fixo
+
visualizar na matriz
+
teste

etc.


==================================================
43. TEST-DRIVEN DEVELOPMENT
==================================================

TDD é obrigatório nas regras críticas.

Especialmente:

- cálculo de dias úteis;
- feriados;
- prazo relativo;
- terceiro dia útil do mês;
- dependências;
- detecção de ciclos;
- tarefa bloqueada;
- tarefa vencida;
- prorrogação;
- idempotência;
- prevenção de lembretes duplicados;
- webhook duplicate delivery;
- state transitions.

Frontend visual não precisa ser dogmaticamente test-first.

Regras de negócio, sim.


==================================================
44. CASOS DE TESTE BASEADOS NO PROCESSO REAL
==================================================

Criar fixtures/testes semelhantes aos seguintes.

CASO A

Matrix:
Matriz Geral

Task #1
Responsável: Matheus
Tarefa: Atualizar a Assinatura Suprema no Site
Prazo: 28/08/2026
Pré-requisito: nenhum

Resultado esperado:
prazo fixo calculado corretamente.

CASO B

Matrix:
Ordenador de Despesas Presencial

Task #2:
Definir modelo de remuneração.

Task #3:
Elaborar Planilha Financeira e determinar ponto de equilíbrio.

Task #3 depende de Task #2.

Resultado:
Task #3 aparece vinculada à #2.

CASO C

Matrix:
Pós-Graduação Ordenação de Despesas

Task #2:
Definir data da live.

Task #3:
Preparar material para live.

Prazo da #3:
15 dias úteis após conclusão da #2.

Antes da conclusão da #2:

Task #3:
WAITING_FOR_TRIGGER.

Depois da #2 ser validada:

calcular due_date usando Business Calendar.

CASO D

Task:
Divulgar disciplinas do mês.

Prazo:
terceiro dia útil de cada mês.

Testar meses com:

- fim de semana;
- feriado;
- mês começando sábado/domingo.

CASO E

Responsáveis:
Giovanni Pacelli
Francisco Netto

Mesma tarefa.

Sistema deverá suportar os dois sem duplicar a tarefa.

CASO F

Responsável solicita pelo WhatsApp:

"Vou precisar prorrogar até dia 30 porque ainda estou esperando o material."

Resultado:

AI:
EXTENSION_REQUEST

Sistema:
não altera prazo.

Cria pedido de prorrogação.

Administrador:
recebe alerta.

CASO G

Responsável:

"Já enviei."

Resultado:

WAITING_FOR_VALIDATION

Não COMPLETED.


==================================================
45. FASES DE IMPLEMENTAÇÃO
==================================================

FASE 0 — ESPECIFICAÇÃO

Não escrever produção.

Gerar documentação.

FASE 1 — CORE

- banco;
- matrizes;
- responsáveis;
- tarefas;
- dependências;
- prazos fixos;
- tabela;
- dashboard básico.

SEM WHATSAPP.

FASE 2 — DEADLINE ENGINE

- dias úteis;
- feriados;
- prazos relativos;
- recorrências;
- scheduler;
- estados automáticos.

FASE 3 — WHATSAPP

- provider;
- templates;
- envio;
- webhook;
- armazenamento;
- idempotência.

FASE 4 — AI TRIAGE

- Structured Outputs;
- classificação;
- inbox;
- summaries;
- human review.

FASE 5 — PRORROGAÇÕES E ESCALAÇÃO

- extension workflow;
- approvals;
- communication targets;
- admin WhatsApp alerts.

FASE 6 — HARDENING

- E2E;
- security;
- observability;
- backup;
- production deployment.

FASE 7 — ENHANCEMENTS

- quick capture;
- import;
- templates;
- analytics;
- additional integrations.


==================================================
46. ARQUIVOS DE ESPECIFICAÇÃO
==================================================

Na FASE 0, criar:

docs/00-product-brief.md
docs/01-functional-spec.md
docs/02-domain-model.md
docs/03-state-machines.md
docs/04-deadline-engine.md
docs/05-architecture.md
docs/06-whatsapp-integration.md
docs/07-ai-triage.md
docs/08-security.md
docs/09-test-plan.md
docs/10-roadmap.md
docs/11-open-questions.md

Criar também:

docs/adr/

ADR-001-web-local-first.md
ADR-002-postgresql.md
ADR-003-whatsapp-cloud-api.md
ADR-004-human-in-the-loop.md
ADR-005-background-jobs.md
ADR-006-ai-structured-output.md


==================================================
47. NÃO FAÇA
==================================================

Não começar implementando chatbot.

Não fazer arquitetura baseada apenas no layout da tabela.

Não usar Word como banco de dados.

Não armazenar dependências em texto como:
"Sim, tarefa 2".

Não armazenar prazo relativo apenas como:
"15 dias úteis".

Não usar IA para operações determinísticas.

Não usar IA para calcular prazos.

Não usar IA para decidir se uma tarefa está atrasada.

Não permitir conversas autônomas ilimitadas no WhatsApp.

Não modificar prazos automaticamente.

Não considerar uma tarefa entregue apenas porque alguém disse "entreguei".

Não criar microservices desnecessários.

Não adicionar Kubernetes.

Não adicionar Redis se não houver necessidade.

Não criar arquitetura enterprise exagerada para um sistema interno.

Não sacrificar auditabilidade para economizar algumas linhas de código.


==================================================
48. DEFINITION OF DONE DO MVP
==================================================

O MVP estará funcional quando eu conseguir:

1. abrir a aplicação local;

2. cadastrar Matheus com WhatsApp;

3. criar uma nova matriz;

4. adicionar tarefas;

5. usar múltiplos responsáveis;

6. criar dependências;

7. definir prazo fixo;

8. definir prazo relativo em dias úteis;

9. definir recorrência como terceiro dia útil;

10. visualizar todas as demandas na matriz;

11. visualizar tudo no dashboard geral;

12. receber alertas de prazo;

13. enviar automaticamente um lembrete via WhatsApp;

14. receber resposta do responsável;

15. armazenar resposta;

16. classificar resposta;

17. ser avisado se houver bloqueio;

18. ser avisado se houver pedido de prorrogação;

19. aprovar uma prorrogação manualmente;

20. consultar todas as prorrogações anteriores;

21. confirmar manualmente uma entrega;

22. desbloquear automaticamente uma tarefa dependente;

23. receber um resumo da situação;

24. consultar todo o histórico de ações.


==================================================
49. PRIMEIRA EXECUÇÃO
==================================================

AGORA NÃO ESCREVA O SISTEMA INTEIRO.

Execute somente a FASE 0.

Faça nesta ordem:

1. analise integralmente esta especificação;

2. liste inconsistências, riscos e lacunas reais;

3. se uma dúvida não bloquear arquitetura, registre como assumption;

4. faça no máximo 5 perguntas caso existam decisões que realmente impeçam continuar;

5. produza os arquivos da pasta docs descritos acima;

6. proponha o modelo relacional;

7. proponha os state machines;

8. proponha arquitetura completa;

9. proponha o fluxo WhatsApp;

10. proponha o fluxo AI/human-in-the-loop;

11. apresente roadmap em vertical slices;

12. apresente riscos técnicos;

13. apresente acceptance criteria;

14. NÃO implemente código de produção ainda.

Ao terminar, apresente:

"FASE 0 CONCLUÍDA"

seguido de:

- decisões principais;
- perguntas em aberto;
- riscos;
- próximos passos.

Aguarde aprovação explícita antes de iniciar FASE 1.


==================================================
50. CRITÉRIO DE QUALIDADE
==================================================

Antes de sugerir qualquer arquitetura ou código, pergunte internamente:

Isso reduz trabalho operacional real?

Isso é auditável?

Isso evita uma ação indevida da IA?

Isso funciona se a IA cair?

Isso funciona se o WhatsApp estiver indisponível?

Isso consegue explicar por que determinado prazo foi calculado?

Isso consegue explicar por que determinada mensagem foi enviada?

Isso suporta múltiplos responsáveis?

Isso suporta dependências?

Isso suporta prorrogações históricas?

Isso pode ser executado e testado localmente?

Se alguma resposta for NÃO, revise a solução antes de prosseguir.
