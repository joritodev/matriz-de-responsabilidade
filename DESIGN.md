# DESIGN.md: Prazo

Fonte de verdade visual do app. As imagens em `reference/screens/` e o HTML em `reference/html/` mostram estes tokens aplicados; em caso de dúvida sobre um valor (padding, raio, tamanho), o HTML de referência vence a interpretação.

## Ideia

Cada matriz de responsabilidade é uma **pasta suspensa** com cor própria. A Matriz geral é o arquivo aberto: todas as pastas no topo e uma régua de prazos embaixo, onde a regra de cobrança aparece desenhada. O acabamento é de app de agenda contemporâneo: fundo cinza frio, cartões brancos bem arredondados, cores pastel por pasta, botões em pílula, avatares com iniciais.

O que este app **não** é: barra lateral escura + quatro números grandes + tabela cinza. Nada de gradiente, vidro, brilho neon, emoji, sombra em todo cartão ou fonte Inter.

## Cena de uso

Supervisor no escritório durante o dia e no celular fora da mesa. Por isso tema **claro** na v1. Os tokens são variáveis CSS para que um tema escuro possa ser adicionado depois sem refazer componentes.

## Tokens (Tailwind v4, colar em `apps/web/src/app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* Fonte: carregar Onest com next/font/google e expor como --font-onest */
  --font-sans: var(--font-onest), ui-sans-serif, system-ui, sans-serif;

  /* Neutros */
  --color-canvas: #EEF0F3;         /* fundo da página */
  --color-surface: #FFFFFF;        /* cartões */
  --color-surface-muted: #F5F6F8;  /* blocos internos, chips neutros, hover de linha */
  --color-line: #E3E6EB;           /* divisórias */
  --color-ink: #16181D;            /* texto principal, botão primário, chip "hoje" */
  --color-ink-2: #4B5160;          /* texto secundário */
  --color-ink-3: #5E6573;          /* legendas, metadados, placeholder (mínimo 4.5:1 no canvas) */
  --color-nav-hover: #E2E5EA;

  /* Situação do prazo (mesmo significado em todo o app; sempre com texto, nunca só cor) */
  --color-late-bg: #FFE2E3;   --color-late-fg: #A1141C;    /* atrasada, falhou */
  --color-today-bg: #16181D;  --color-today-fg: #FFFFFF;   /* vence hoje */
  --color-soon-bg: #FFF0B3;   --color-soon-fg: #614A00;    /* em 1 a 3 dias */
  --color-ok-bg: #F0F1F4;     --color-ok-fg: #16181D;      /* no prazo, enviada */
  --color-done-bg: #DDF3E7;   --color-done-fg: #11593A;    /* concluída */

  /* Pastas: bg = corpo da pasta, ink = texto sobre bg e sobre branco, solid = pílulas e marcadores, wash = linha selecionada e formulário */
  --color-lilac-bg: #E6E0FF; --color-lilac-ink: #3D2C99; --color-lilac-solid: #8676F0; --color-lilac-wash: #F4F1FF;
  --color-mint-bg:  #CFF0E0; --color-mint-ink:  #11593A; --color-mint-solid:  #2E9E68; --color-mint-wash:  #EEF9F3;
  --color-peach-bg: #FFE2CF; --color-peach-ink: #8A3A0B; --color-peach-solid: #EE8640; --color-peach-wash: #FFF4EC;
  --color-lemon-bg: #FFF0B3; --color-lemon-ink: #614A00; --color-lemon-solid: #E2B408; --color-lemon-wash: #FFF9DE;
  --color-sky-bg:   #D7EAFE; --color-sky-ink:   #0E4A7E; --color-sky-solid:   #3D8EDB; --color-sky-wash:   #EEF6FF;
  --color-rose-bg:  #FFDCE8; --color-rose-ink:  #891B47; --color-rose-solid:  #E2588C; --color-rose-wash:  #FFF1F6;
  --color-sand-bg:  #F1E6D2; --color-sand-ink:  #5A4220; --color-sand-solid:  #C29A5B; --color-sand-wash:  #F8F3EA;
  --color-sage-bg:  #DCE9D5; --color-sage-ink:  #2F5126; --color-sage-solid:  #79A062; --color-sage-wash:  #F0F6EC;

  /* Raios */
  --radius-card: 24px;     /* cartões de seção */
  --radius-inner: 20px;    /* cartão dentro da pasta, formulário rápido */
  --radius-row: 18px;      /* linha selecionada/expandida */
  --radius-field: 14px;    /* inputs, selects, ladrilho de data */
  --radius-folder: 22px;   /* corpo da pasta (canto superior esquerdo = 0, colado na aba) */
  --radius-tab: 14px;      /* aba da pasta (só cantos de cima) */

  --ease-out-soft: cubic-bezier(.2, .8, .2, 1);
}
```

A cor de cada matriz vem do campo `matrices.color` (`lilac`, `mint`, `peach`, `lemon`, `sky`, `rose`, `sand`, `sage`). Faça um mapa `folderTheme[color] = { bg, ink, solid, wash }` em `lib/folder-colors.ts` e aplique com variáveis CSS locais (`style={{ '--f-bg': ..., '--f-ink': ... }}`), nunca com classes montadas por string (o Tailwind não as encontraria).

Contraste verificado (WCAG AA): `ink` passa sobre `bg`, `wash` e branco em todas as pastas. Texto sobre `solid` é **sempre `--color-ink`** (branco sobre solid reprova). `solid` é usado como decoração (quadradinho da legenda, pontos do calendário) e em pílulas com texto escuro.

## Tipografia

Uma família só: **Onest** (400, 500, 600, 700, 800) via `next/font/google`. Números com `font-variant-numeric: tabular-nums` no `body`.

| Papel | Tamanho/altura | Peso | Tracking | Onde |
|---|---|---|---|---|
| Página | 40/44 (celular 30/34) | 700 | -0.035em | "Bom dia.", "Responsáveis", "Cobranças" |
| Pasta | 36/40 (celular 26/30) | 700 | -0.035em | nome da matriz aberta |
| Seção | 22/28 (celular 18/24) | 700 | -0.02em | "Próximas duas semanas", "Cobranças de hoje" |
| Nome de pasta | 20/24 | 700 | -0.02em | cartão de pasta |
| Título de item | 16/22 | 600 | 0 | nome da demanda, nome da pessoa |
| Corpo | 16/24 e 15/22 | 400 | 0 | parágrafos, inputs |
| UI | 14/20 | 500–600 | 0 | navegação, botões, metadados |
| Legenda | 13/18 | 400–600 | 0 | linha de apoio, histórico |
| Rótulo | 12/16 | 600–700 | 0 | rótulos de campo, chips, cabeçalho de colunas |
| Piso | 11px | | | nada abaixo disso |

Marca: ícone de pasta sólida (retângulo `ink` com raio 0 7 7 7 e aba de 14×7 com raio 5 5 0 0) + "Prazo" 21px, 800, -0.03em.

## Espaçamento e layout

- Base 4. Página: `padding 20px 28px 48px` no desktop, `16px` de lateral no celular. Espaço entre blocos da página: 28px. Cartão: padding 24px (celular 16–18px).
- Largura útil até 1440px; acima disso, centralizar com `max-width: 1440px`.
- Cartões ficam **planos** sobre o canvas (sem sombra). Sombra só no botão flutuante do celular: `0 8px 20px rgba(22,24,29,.25)`.
- Ícones: `@phosphor-icons/react`, peso `regular`, 18–22px. Nada de ícones desenhados à mão nem emoji.

## Componentes

| Componente | Descrição | Referência |
|---|---|---|
| `TopNav` | Logo + grupo de pílulas branco (padding 4, pílula 40px, ativa = fundo `ink` e texto branco) + busca em pílula branca + "Nova demanda" (pílula `ink`) + avatar 40px | 01 a 04 |
| `FolderCard` | Corpo `--f-bg` com raio `0 22 22 22`, aba de 46% da largura e 20px de altura saindo por cima (raio 14 14 0 0), nome 20px, chip de alerta, linha "N abertas. Próximo prazo X.", avatares sobrepostos (-8px). Hover: sobe 3px em 180ms | 01 |
| `NewFolderCard` | Mesmo formato, borda 2px tracejada `#C3C8D0`, fundo transparente | 01 |
| `FolderTabs` | Abas das pastas acima do corpo da pasta aberta; ativa mais alta (50px) e maior | 02, 06 |
| `DeadlineRuler` | Régua de 10 dias úteis: coluna de rótulo 230px + 10 colunas iguais; faixa cinza clara marca "Hoje"; grupos por pasta com quadradinho `solid`; cada demanda é uma barra em pílula `--f-bg` do dia da cobrança antecipada até o prazo, com ponto no início e pílula de data no fim | 01 |
| `ReminderDot` | 14px (12px em tabela): cheio `ink` = enviada; vazado 2px `ink` = prevista; vazado `late-fg` com fundo `late-bg` = falhou | 01, 02 |
| `ReminderTrack` | Dois pontos ligados por traço 2px `#C9CED6`: antecipada → no dia | 02, 06 |
| `StatusChip` | Pílula 24–26px, 12px 700, cores de situação | todas |
| `Avatar` | Círculo com iniciais (2 letras), fundo `--f-bg` da pasta principal da pessoa ou `#D9DDE4` | todas |
| `DateTile` | Quadrado 44–46px raio 14: dia 16–17px 700 + dia da semana 11px 600; cor pela situação | 05, 06 |
| `QuickAddForm` | Faixa `--f-wash` raio 20 dentro da pasta: Nova demanda / Responsável / Prazo / Pré-requisito / Lançar. Enter envia | 02 |
| `TaskRow` | Grade: nº (círculo 32px), título + pré-requisito, responsável, prazo (dia grande + "out, sex"), `ReminderTrack`, `StatusChip`, ação | 02 |
| `ExtendInline` | A linha selecionada vira bloco `--f-wash` raio 18 e abre embaixo: Novo prazo / Motivo / Aprovado por / Prorrogar (pílula `--f-ink`) + histórico curto. Sem modal | 02, 06 |
| `PersonCard` | Cartão 24px: avatar 52px, nome, contagem, chip do próximo prazo, WhatsApp e e-mail, seletor de canal em pílula segmentada, quadradinhos das pastas | 03 |
| `ChannelSegmented` | Pílula `surface-muted` com 3 opções; ativa `ink` | 03 |
| `ReminderLog` | Lista agrupada por dia ("Hoje, terça 20"), linha com avatar, nome, meta, quadradinho da pasta, demanda e chip; selecionada `surface-muted` | 04 |
| `MessagePreview` | Fundo `#E9EDE7` raio 20 com balão branco raio `6 18 18 18` imitando WhatsApp, texto exato que foi enviado | 04 |
| `BottomTabBar` | Celular: barra branca raio 24 em cima, 4 abas; ativa com ponto `ink` acima do rótulo | 05, 06 |
| `Fab` | Celular: círculo 56px `ink`, ícone "+", sombra única do app | 05, 06 |

Botões: primário pílula `ink`/branco; secundário pílula branca com borda 1.5px `line`; de pasta pílula `--f-ink`/branco. Altura 40px (34px em linha de tabela, 44px em formulário e celular). Pressionado: `scale(.98)`.

Campos: rótulo acima (12px 600 `ink-2`), campo 44px raio 14, fundo branco, borda 1.5px transparente; foco = borda `ink`. Erro: borda `late-fg` e mensagem 13px `late-fg` abaixo, dizendo o problema e como resolver.

## Estados

- **Foco de teclado**: `outline: 2px solid var(--color-ink); outline-offset: 2px` em tudo que é clicável. Nunca remover sem substituto.
- **Seleção de texto**: `::selection` com o `--f-bg` da pasta atual (fallback lilac).
- **Carregando**: esqueletos com o mesmo formato do conteúdo (pastas, linhas da régua, linhas da tabela) em `surface-muted`, sem spinner no meio da tela.
- **Vazio**:
  - sem pastas: cartão "Nova pasta" grande + "Crie a primeira matriz ou importe a do Docs.";
  - pasta sem demandas: o formulário rápido fica em destaque, com o texto "Lance a primeira demanda desta matriz.";
  - régua sem nada em 2 semanas: "Nada vence nas próximas duas semanas.";
  - sem cobranças hoje: "Nenhuma cobrança hoje. A próxima sai {dia} às 08:00.";
  - sem responsáveis: "Cadastre quem recebe as cobranças."
- **Erro de envio**: chip "falhou" + motivo legível ("E-mail recusado. Nova tentativa amanhã.").
- **Sem confirmação**: lote `queued` há mais de 2h aparece com chip neutro "sem confirmação".
- **Toasts**: só para confirmação passageira ("Prazo prorrogado para 30/10"), canto inferior, pílula `ink`. Erros de formulário ficam no campo.

## Movimento

150–200ms, `--ease-out-soft`. Só onde comunica estado: elevação da pasta no hover, abertura da linha de prorrogação (altura de 0 ao conteúdo), troca de aba. Sem animação de entrada de página. Respeitar `prefers-reduced-motion` (tudo vira instantâneo).

## Responsivo

| Largura | Comportamento |
|---|---|
| ≥ 1024px | Como nas imagens 01–04 |
| 768–1023px | Coluna lateral (Cobranças de hoje, mensagem) desce para baixo do conteúdo; régua rola na horizontal dentro do cartão |
| < 768px | `TopNav` vira cabeçalho simples + `BottomTabBar` + `Fab`. Matriz geral troca a régua pela lista "Vence logo" (imagem 05). Pasta vira lista de cartões com `DateTile` (imagem 06). Responsáveis em 1 coluna. Cobranças: lista; tocar abre a mensagem em tela cheia |

Nenhuma página pode rolar na horizontal em 390px.

## Texto

Português do Brasil, frases curtas, sem jargão técnico na interface ("cobrança", "prorrogar", "pasta", "responsável"). Datas `dd/mm` com dia da semana por extenso curto ("sex"). Horas `08:02`. Botões dizem a ação ("Lançar", "Prorrogar", "Concluir"). Sem travessão (—) como enfeite.
