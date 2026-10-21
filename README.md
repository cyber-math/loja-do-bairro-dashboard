# Loja do Bairro · Painel de Operações

PoC de painel operacional para uma rede de lojas de bairro: estoque, ordens de serviço, analytics e administração de plataforma em uma página estática.

**GitHub Pages ready** · **zero build no runtime** · **dados 100% no navegador**

> Artefato de avaliação da disciplina **Manutenção de Sistemas**: demonstra manutenção **de sistema** (corretiva, adaptativa, evolutiva, preventiva e perfectiva) e manutenção **de operações** (SLA, ativos, transmissão, compliance e infraestrutura).

## O que tem dentro

- KPIs de receita, lucro, margem, ticket médio, ruptura de estoque e ordens de serviço.
- Gráficos Chart.js: evolução financeira, categorias, volume x ticket, status das OS, saúde do estoque e top produtos.
- Tabela de estoque com busca, filtros, ordenação por coluna e paginação.
- Ordens de serviço com tabela, quadro kanban, drawer de detalhe e ações simuladas (concluir, reatribuir, cancelar).
- Curva ABC de faturamento, projeção por regressão linear e faixa de confiança.
- Mapa de calor de 52 semanas e donut de motivos de chamado.
- Fornecedores com prazo, qualidade, participação e rating.
- Exportação CSV dos dados filtrados.
- Busca rápida com `Ctrl+K`, tema claro/escuro e densidade configurável.
- Layout responsivo (desktop, tablet e 360 px), sem rolagem horizontal.
- PWA instalável (`manifest.webmanifest`), página 404 temática, `robots.txt`, `sitemap.xml` e `.well-known/security.txt`.

## Painel administrativo

Fica em **Configurações → Painel administrativo** e também no menu do avatar (`Painel administrativo`, `Trilha de auditoria`, `Status da plataforma`, `Simulação de transmissão`). São 8 sub-abas:

| Aba | O que demonstra |
| --- | --- |
| Visão geral | Uptime, incidentes, conformidade global, regras ativas, ativos críticos, DLQ e próximos jobs. |
| Compliance | LGPD, ISO 27001, PCI-DSS e SOC 2; controles e evidências, retenção, matriz de risco e solicitações de titulares. |
| Regras de negócio | Motor de 12 regras com condição/ação, liga/desliga, contadores de execução e simulador de decisão. |
| Backend | Feature flags, variáveis de ambiente mascaradas, endpoints, pool de banco, cache e filas. |
| Transmissão | Simulação **ao vivo** do barramento de eventos: throughput, latência p50/p95, taxa de erro, DLQ, console com payload JSON, pausar/retomar e injetar falha. |
| Ativos | 24 ativos físicos com saúde, criticidade, MTBF, MTTR, garantia, preventiva e ciclo de vida. |
| Infraestrutura | Diagrama de arquitetura em camadas, saúde dos serviços, deploys com rollback, backup/DR, SLOs e logs. |
| Auditoria | Trilha hash-chain com 30 eventos, filtros, integridade e exportação CSV. |

O indicador **API · DB · Fila · CDN** na barra lateral simula o status vivo das camadas de backend e reage a degradações.

## Cobertura de manutenção

| Tipo | Como aparece no artefato |
| --- | --- |
| Corretiva | Correção de cálculo de total, remoção por índice, validação de formulário, XSS e contraste. |
| Adaptativa | Formatação BRL, responsividade em 360 px, PWA, tema claro/escuro e fallback de CDN. |
| Evolutiva | Busca, edição, persistência, painel admin, transmissão ao vivo e curva ABC. |
| Preventiva | CI com `npm run check`, versionamento, dependabot, checklist de release e SLOs. |
| Perfectiva | Design system, acessibilidade, animações, densidade e atalhos de teclado. |

A matriz detalhada, com arquivos e testes, está em [`docs/MANUTENCAO.md`](docs/MANUTENCAO.md).

## Como rodar localmente

Opção 1 — abra `index.html` direto no navegador.

Opção 2 — servidor estático incluído (Node.js 22+):

```bash
cd loja-do-bairro-dashboard
npm start
```

`npm start` serve `dist/` quando ele existe (artefato com versão carimbada) e, na ausência, serve a raiz do projeto. A porta padrão é `8000` (`PORT=3000 npm start` para trocar).

Opção 3 — qualquer servidor HTTP:

```bash
python -m http.server 8000
```

O Chart.js é carregado de CDN (jsDelivr, com fallback para unpkg e cdnjs). Sem internet, KPIs, tabelas e o painel admin continuam funcionando; apenas os gráficos não são desenhados.

## CI/CD e versionamento

O deploy é automático: não existe branch `gh-pages` nem cópia manual de arquivos.

| Workflow | Gatilho | O que faz |
| --- | --- | --- |
| `ci.yml` | pull request, push em `main`, manual | Valida referências, sintaxe dos scripts e IDs; gera `dist/`. |
| `pages.yml` | push em `main`, manual | Roda as verificações, carimba a versão e publica `dist/` no Pages. |
| `release.yml` | tag `v*.*.*` | Confere a tag, cria a release com notas e anexa o site em `.zip`. |

O build não tem dependências externas: `scripts/build.mjs` copia o site para `dist/` e carimba `<meta name="app-version">`, `<meta name="app-commit">` e `<meta name="app-channel">`, além de gerar `dist/version.json`. Os valores aparecem na barra lateral e em **Configurações → Sobre o PoC**.

### Primeira publicação

```bash
cd loja-do-bairro-dashboard
git init
git add .
git commit -m "feat: painel operacional com painel admin e CI/CD"
git branch -M main
gh repo create loja-do-bairro-dashboard --public --source=. --remote=origin --push
```

Depois, em **Settings → Pages → Build and deployment**, selecione **Source: GitHub Actions**. O push em `main` publica em `https://<usuario>.github.io/loja-do-bairro-dashboard/`.

### Como lançar uma versão

O `package.json` é a fonte da versão:

```bash
npm run release:patch   # 1.0.0 → 1.0.1
npm run release:minor   # 1.0.0 → 1.1.0
npm run release:major   # 1.0.0 → 2.0.0
git push --follow-tags
```

Mantenha a árvore limpa antes de rodar `npm run release:*` — o `npm version` commita o `package.json` e cria a tag no commit atual.

### Comandos

| Comando | Descrição |
| --- | --- |
| `npm run check` | Executa as verificações da CI (referências, sintaxe, IDs, encoding). |
| `npm run build` | Gera `dist/` com versão e commit carimbados. |
| `npm start` | Pré-visualiza `dist/` (ou a raiz) em `http://localhost:8000`. |
| `node scripts/version.mjs` | Mostra a versão e o canal do próximo build. |

## Estrutura de arquivos

```text
loja-do-bairro-dashboard/
├── index.html
├── 404.html
├── manifest.webmanifest
├── robots.txt
├── sitemap.xml
├── .well-known/
│   └── security.txt
├── assets/
│   ├── css/
│   │   ├── styles.css
│   │   └── admin.css
│   ├── img/
│   │   ├── icon.svg
│   │   └── icon-maskable.svg
│   └── js/
│       ├── data.js
│       ├── charts.js
│       ├── admin.js
│       └── app.js
├── docs/
│   ├── ARQUITETURA.md
│   ├── MANUTENCAO.md
│   ├── RUNBOOK.md
│   ├── SEGURANCA.md
│   ├── COMPLIANCE.md
│   └── TESTES.md
├── scripts/
│   ├── build.mjs
│   ├── check.mjs
│   ├── serve.mjs
│   └── version.mjs
├── .github/
│   ├── workflows/ (ci.yml, pages.yml, release.yml)
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── pull_request_template.md
├── package.json
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── .editorconfig
├── .gitattributes
├── .nvmrc
├── .nojekyll
├── .gitignore
└── README.md
```

## Sobre os dados

Os dados são fictícios e gerados no navegador com o PRNG determinístico **mulberry32**, semente **20260421**. O dataset contém 101 produtos, 168 ordens de serviço e 540 dias simulados (cerca de 18 meses de histórico).

Nenhum dado sai do navegador: não há chamadas de API para carregar informações nem envio de dados para servidores. Para gerar outro dataset, altere a constante `SEED` em `assets/js/data.js` e recarregue a página.

## Limitações do PoC

- Todos os dados são fictícios e não representam uma operação real.
- Não há backend, banco de dados ou persistência entre sessões.
- As ações do drawer de OS e do painel admin são simuladas e não persistem.
- A autenticação, o MFA, as chaves de API e a transmissão de eventos são encenações visuais.
- Os gráficos dependem do Chart.js via CDN.
- Não há controle de acesso real nem suporte a múltiplos usuários.

## Atalhos de teclado

| Atalho | Ação |
| --- | --- |
| `1` | Dashboard |
| `2` | Estoque |
| `3` | Ordens de serviço |
| `4` | Analytics |
| `Ctrl+K` | Busca rápida |
| `Esc` | Fecha busca, drawer, perfil ou menu lateral |

## Documentação

- [Arquitetura](docs/ARQUITETURA.md)
- [Manutenção](docs/MANUTENCAO.md)
- [Runbook operacional](docs/RUNBOOK.md)
- [Segurança](docs/SEGURANCA.md)
- [Compliance](docs/COMPLIANCE.md)
- [Testes](docs/TESTES.md)
- [Contribuição](CONTRIBUTING.md)
- [Política de segurança](SECURITY.md)
