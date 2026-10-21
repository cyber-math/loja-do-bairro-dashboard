# Arquitetura

Documento de referência técnica do PoC **Loja do Bairro · Painel de Operações**.
Descreve a arquitetura realmente implementada no repositório, as decisões que a
sustentam e os limites conhecidos.

| Campo | Valor |
| --- | --- |
| Versão de referência | 1.0.0 |
| Última revisão | 2026-10-21 |
| Responsável | Manutenção de Sistemas |
| Status | Baseline do PoC |
| Documentos relacionados | [MANUTENCAO.md](MANUTENCAO.md) · [RUNBOOK.md](RUNBOOK.md) · [SEGURANCA.md](SEGURANCA.md) · [COMPLIANCE.md](COMPLIANCE.md) · [TESTES.md](TESTES.md) |

## 1. Visão geral

O projeto é uma SPA estática de demonstração para operação de uma loja de
bairro. Reúne estoque, ordens de serviço, analytics, fornecedores e um painel
administrativo simulado em uma única página publicada no GitHub Pages.

Objetivos do PoC:

1. Demonstrar, sem backend, um fluxo completo de leitura de indicadores,
   filtros, detalhamento e exportação.
2. Servir de artefato didático para manutenção de sistema e de operações:
   CI, versionamento, runbook, compliance e auditoria.
3. Manter custo operacional e superfície de infraestrutura próximos de zero.

Fora de escopo:

- persistência de dados ou de ações do usuário;
- autenticação e autorização reais;
- integração com ERP, PDV, SEFAZ ou qualquer API;
- processamento de dados pessoais reais;
- impressão. Não existe folha de estilo `@media print`; a impressão usa os
  estilos de tela e não é um caso de uso suportado.

## 2. Diagrama de camadas

```text
+----------------------------- BORDA ------------------------------+
| GitHub Pages (HTTPS, CDN, .nojekyll)                             |
|   index.html · 404.html · assets/ · manifest.webmanifest          |
|   Chart.js 4.4.7 (jsDelivr -> unpkg -> cdnjs)                     |
|   Google Fonts (Inter, JetBrains Mono)                            |
+-------------------------------+----------------------------------+
                                | GET estático (sem API)
+-------------------------------v----------------------------------+
| APLICAÇÃO (SPA estática, JavaScript ES5)                         |
|   data.js -> charts.js -> admin.js -> app.js                     |
|   state central · render · eventos · localStorage (tema/densidade)|
+-------------------------------+----------------------------------+
                                | window.DADOS (memória)
+-------------------------------v----------------------------------+
| DADOS (mock determinístico)                                      |
|   mulberry32(20260421) · 101 produtos base · 168 OS · 540 dias   |
+-------------------------------+----------------------------------+
                                | leitura
+-------------------------------v----------------------------------+
| OBSERVABILIDADE SIMULADA (admin.js)                              |
|   serviços, SLOs, jobs, DLQ, stream, ativos, auditoria           |
|   Nenhuma telemetria real é coletada ou enviada.                  |
+------------------------------------------------------------------+
```

A borda é composta por serviços gerenciados. O repositório não opera servidor,
banco, fila ou coletor. A aplicação só faz requisições para carregar o próprio
site, o Chart.js e as fontes; não há `fetch` para API de negócio.

## 3. Mapa de módulos

A ordem de carregamento em `index.html` é intencional: cada camada depende
apenas das anteriores.

| Ordem | Arquivo | Responsabilidade | Exporta | Depende de |
| --- | --- | --- | --- | --- |
| 1 | `assets/js/data.js` | PRNG, catálogos, simulação de 540 dias, geração de OS, agregações e filtros | `window.DADOS` | nada além do runtime do navegador |
| 2 | `assets/js/charts.js` | Formatadores `Intl`, loader multi-CDN do Chart.js, registro de instâncias, tema dos gráficos | `window.FMT`, `window.Charts` | DOM, Chart.js externo |
| 3 | `assets/js/admin.js` | Painel administrativo com 8 abas, dados estáticos simulados, regras, stream, ativos e auditoria | `window.ADMIN` | DOM, `DADOS`, `FMT`, `Charts` (opcional), `LB.toast` (opcional) |
| 4 | `assets/js/app.js` | Estado, navegação, renderização das 6 views, filtros, drawer, paleta, tema, CSV | `window.LB` (depuração) | `DADOS`, `FMT`, `Charts`, `ADMIN` (opcional) |

`index.html` ainda contém um script inline de hidratação de versão, que lê
`<meta name="app-version">`, `app-commit` e `app-channel` e preenche os
marcadores `data-app-*`. O script não altera dados nem estado.

### Dependências e tolerância a falhas

- `app.js` verifica `global.ADMIN` antes de montar a aba administrativa. Se o
  módulo não estiver disponível, exibe um cartão de fallback em vez de quebrar
  a página.
- `charts.js` tenta jsDelivr, depois unpkg, depois cdnjs. Se as três falharem,
  `Charts.ready` rejeita, `app.js` mostra "Gráficos indisponíveis" e mantém
  KPIs, tabelas e exportação funcionando.
- `admin.js` também usa `Charts.ready`; os gráficos administrativos são
  opcionais e não bloqueiam as tabelas.
- `FMT` existe em `charts.js`, portanto `admin.js` e `app.js` dependem desse
  arquivo mesmo quando não há gráfico na tela.

## 4. Fluxo de dados

```text
SEED 20260421
  |
  v
mulberry32  --> sequência determinística
  |
  v
PRODUTOS_BASE (101 linhas: nome, categoria, preço, custo, giro/dia)
  |
  v
gerarProdutos() --> SKU, fornecedor, mínimo/máximo, estoque inicial
  |
  v
simular(540 dias) --> vendas, receita, estoque, reposições, cobertura
  |
  v
gerarOS(168) --> status, prioridade, técnico, SLA, custos, histórico
  |
  v
agregações: agregar() · serieDiaria() · serieMensal() · resumoOS()
  |
  v
state (período, categoria, filtros de OS, busca, paginação, tema)
  |
  v
renderDashboard / renderEstoque / renderOrdens / renderAnalytics /
renderFornecedores / renderConfig
  |
  v
interação: filtros, cross-filter, drawer, paleta, CSV, tema
```

### Determinismo

`data.js` usa `mulberry32` com semente fixa. O calendário é relativo a
`new Date()` no carregamento: a janela de 540 dias termina "hoje". Portanto:

- no mesmo dia, recarregar a página produz os mesmos valores;
- em outro dia, os valores por produto continuam os mesmos, mas as datas e a
  janela relativa se deslocam;
- trocar `SEED` em `assets/js/data.js` gera outro catálogo, outro histórico e
  outras OS.

### Agregações e filtros

- `DADOS.janela(dias)` devolve os índices inicial e final da série.
- `DADOS.agregar(produtos, categoria, ini, fim)` soma receita, custo, unidades
  e buckets por categoria.
- `DADOS.serieDiaria` e `DADOS.serieMensal` alimentam os gráficos.
- `DADOS.resumoOS` calcula status, custo, prazo médio, taxa de conclusão e SLA.
- `state` em `app.js` é a única fonte de verdade da UI. `sortState` é separado
  porque a ordenação de tabela não é um filtro.
- O cross-filter do doughnut de categorias grava `state.categoria` e re-renderiza
  o dashboard. O doughnut de status de OS grava `state.statusOS` e navega para
  Ordens de Serviço.

### Renderização

As views não usam framework. Cada função de render monta `innerHTML` com dados
já escapados por `esc()` e registra/atualiza gráficos pelo `Charts.upsert()`.
Gráficos existentes são atualizados no lugar; o registry evita recriar canvas.
Ao trocar o tema, `Charts.aplicarTema()` reaplica cores sem recriar instâncias.

## 5. Estado e navegação

`app.js` mantém:

```text
state = {
  view, dias, categoria,
  prioridade, statusOS, tipoOS, responsavelOS, buscaOS,
  buscaEstoque, statusEstoque, ordemEstoque,
  pageEstoque, pageOS, pageSize, osMode,
  configTab, adminTab
}
sortState = { estoque: {campo, dir}, os: {campo, dir} }
```

As views são seções `#view-dashboard`, `#view-estoque`, `#view-ordens`,
`#view-analytics`, `#view-fornecedores` e `#view-config`. A navegação troca a
classe `is-active`, atualiza título/subtítulo e chama o render da view. Os
atalhos `1` a `4` mapeiam Dashboard, Estoque, Ordens e Analytics; `Ctrl+K` abre
a paleta; `Esc` fecha paleta, drawer, sidebar e menu de perfil.

Configurações tem quatro abas: Aparência, Notificações, Segurança & acesso e
Painel administrativo. O painel administrativo tem oito sub-abas: Visão,
Compliance, Regras, Backend, Transmissão, Ativos, Infraestrutura e Auditoria.

## 6. Decisões arquiteturais (ADRs)

### ADR-001 — Sem build no runtime

**Contexto:** o site precisa ser publicado no GitHub Pages sem servidor.
**Decisão:** servir HTML, CSS e JavaScript diretamente; o único "build" é o
script Node `scripts/build.mjs`, que copia arquivos e carimba versão/commit.
**Consequência:** deploy simples e auditável, mas sem minificação, bundling,
tree-shaking ou transpilação. O código precisa funcionar em navegadores
modernos sem etapa de compilação.

### ADR-002 — Chart.js via CDN com fallback

**Contexto:** gráficos são necessários, mas adicionar dependências npm quebraria
a proposta de build sem dependências.
**Decisão:** carregar Chart.js 4.4.7 de jsDelivr, com fallback para unpkg e
cdnjs; registrar as instâncias em `Charts.registry`.
**Consequência:** o site depende de rede e de três terceiros. Não há SRI. A
degradação é controlada: sem Chart.js, tabelas e KPIs continuam. A evolução
recomendada é vendorizar o arquivo ou adotar SRI.

### ADR-003 — Estado central em `state`

**Contexto:** filtros, paginação e tema são compartilhados por várias views.
**Decisão:** um objeto `state` mutável, com funções de render que leem o estado
e re-renderizam a view atual. Sem biblioteca de estado.
**Consequência:** baixo acoplamento e fácil depuração via `window.LB.state`;
não há reatividade automática, então toda alteração precisa chamar o render
correto. O risco de esquecer uma chamada é mitigado por smoke tests.

### ADR-004 — Mock determinístico

**Contexto:** demonstração precisa ser reproduzível e não pode expor dados.
**Decisão:** gerar tudo no navegador com mulberry32 e semente 20260421.
**Consequência:** nenhum dado real, nenhuma chamada de API, nenhum custo de
backend. O dataset não é uma amostra estatística válida e não substitui dados
de produção. A janela é relativa ao dia atual.

### ADR-005 — CSS com design tokens

**Contexto:** tema claro/escuro e densidade precisam ser consistentes.
**Decisão:** variáveis CSS em `:root`, `html[data-theme="dark|light"]` e
`html[data-density="compacta|normal"]`; componentes consomem tokens.
**Consequência:** troca de tema sem duplicar folhas de estilo e sem JavaScript
de estilo por componente. Cores de séries de dados continuam em constantes JS
para os gráficos. A cobertura de contraste não é automatizada.

### ADR-006 — Separação admin/app

**Contexto:** o painel administrativo é grande e não deve bloquear o dashboard.
**Decisão:** `admin.js` é um módulo separado, com CSS próprio (`admin.css`) e
API `window.ADMIN.render/abrir/parar`. `app.js` monta o painel sob demanda.
**Consequência:** o dashboard funciona mesmo se o módulo administrativo falhar;
os dados administrativos são estáticos e simulados. A separação também deixa
claro que o painel não é uma área autenticada.

## 7. Performance e acessibilidade

- Sem framework e sem bundler: o custo de JavaScript é o dos quatro arquivos
  locais mais o Chart.js.
- Gráficos são atualizados por `upsert`, não recriados a cada filtro.
- `debounce` de 220 ms nas buscas de estoque e OS.
- `prefers-reduced-motion` reduz animações no CSS; `Charts.setAnimacoes(false)`
  desliga animações dos gráficos.
- Tema e densidade são lidos de `localStorage` com `try/catch`.
- Há `aria-label`, `role` e `scope` em parte das tabelas e controles. A cobertura
  é parcial: não há skip link, focus trap no drawer/paleta e vários canvas do
  dashboard não têm `role="img"`/`aria-label`. Ver [TESTES.md](TESTES.md).

## 8. Limites e trade-offs

| Limite | Efeito | Mitigação atual | Evolução |
| --- | --- | --- | --- |
| Sem backend | Nada é persistido; ações do drawer e do admin são simulações | Avisos explícitos de simulação | API real |
| Sem autenticação | Perfil, MFA e painel admin não protegem nada | UI rotula ambiente de demonstração | Provedor de identidade |
| Dependência de CDN | Sem rede, gráficos não aparecem | Fallback de três CDNs + mensagem | Vendorizar Chart.js/SRI |
| Sem build de runtime | Sem minificação/transpilação | ES5 declarado e `node --check` | Bundler opcional |
| Dados fictícios | Não serve para decisão real | Semente e avisos | Integração com ERP |
| Sem impressão | Layout de impressão não é suportado | Nenhuma | `@media print` |
| Documentação fora do artefato | `docs/` e `.well-known/` não são copiados por `build.mjs` | Leitura no GitHub | Incluir no build |
| Auditoria simulada | Hash de 32 bits, sem WORM real | Rotulado como simulação | Log imutável real |

## 9. Roadmap técnico

### Curto prazo (0 a 3 meses)

1. Service worker para cache do shell e do Chart.js, com estratégia
   stale-while-revalidate e versão de cache por build.
2. Incluir `docs/` e `.well-known/` no artefato de build ou remover a promessa
   de política publicada.
3. CSP em `<meta>` e SRI no loader do Chart.js.
4. Corrigir a comparação de OS com o período anterior e o rótulo do hash da
   auditoria.
5. Automatizar smoke tests de navegador (Playwright) no CI.

### Médio prazo (3 a 9 meses)

1. API real somente leitura para catálogo, estoque e OS, com autenticação.
2. Persistência de filtros e preferências por usuário.
3. Observabilidade real: erros de front-end e Web Vitals.
4. Substituir dados mockados do admin por integrações de leitura.

### Longo prazo (9 a 18 meses)

1. Multi-tenant com isolamento por loja/rede e RBAC.
2. Pipeline de dados para consolidar PDV, estoque e fiscal.
3. SLOs reais, alerting e resposta a incidentes 24x7.
4. Auditoria imutável com hash criptográfico e retenção formal.

## 10. Lacunas conhecidas desta baseline

- `scripts/build.mjs` copia apenas `index.html`, `.nojekyll`, `README.md` e
  `assets/`. Os documentos em `docs/` e o arquivo `.well-known/security.txt`
  não são publicados no GitHub Pages. O link `Policy` do `security.txt` aponta
  para `docs/SEGURANCA.md`, que existe no repositório, mas não no artefato.
- O painel administrativo é uma simulação. O hash da trilha de auditoria é
  FNV-1a de 32 bits (`hash8`), não SHA-256, apesar do rótulo da interface.
- `assets/js/app.js` calcula `resumoPrev` com uma expressão que sempre resulta
  em lista vazia; a comparação de OS com o período anterior não é confiável.
- Não há testes automatizados de comportamento; `npm run check` é estático.

Essas lacunas estão registradas na matriz de manutenção e no backlog do
[RUNBOOK.md](RUNBOOK.md).
