# Loja do Bairro · Painel de Operações

PoC de dashboard operacional para uma loja de bairro, reunindo estoque, ordens de serviço e analytics em uma única página estática.

**GitHub Pages ready** · **sem bundler** · **versionamento semântico**

## O que tem dentro

- KPIs de receita, lucro, margem, ticket médio, ruptura e ordens de serviço.
- Gráficos com Chart.js via CDN: evolução financeira, categorias, volume, status das OS, saúde do estoque e top produtos.
- Tabela de estoque com filtros, ordenação por coluna e paginação.
- Ordens de serviço com tabela, quadro kanban e drawer de detalhe.
- Curva ABC de faturamento.
- Projeção com regressão linear.
- Mapa de calor das últimas 52 semanas.
- Fornecedores com indicadores de prazo, custo e portfólio.
- Exportação CSV dos dados filtrados.
- Busca rápida com Ctrl+K.
- Tema claro/escuro com preferência salva no navegador.
- Layout responsivo para desktop, tablet e celular.

## Como rodar localmente

Opção 1: abra o arquivo `index.html` diretamente no navegador.

Opção 2: use o servidor estático incluído (Node.js 22+):

```bash
cd loja-do-bairro-dashboard
npm start
```

`npm start` serve `dist/` quando o build existe — assim você pré-visualiza exatamente o artefato publicado, com versão e commit carimbados. Sem `dist/`, serve a raiz do projeto. A porta padrão é `8000` (use `PORT=3000 npm start` para trocar).

Opção 3: qualquer outro servidor HTTP local:

```bash
cd loja-do-bairro-dashboard
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

O Chart.js é carregado de CDN (jsDelivr, com fallback para unpkg e cdnjs), portanto os gráficos exigem conexão com a internet. Sem conexão, os KPIs, tabelas e demais dados continuam funcionando, mas os gráficos não são renderizados.

## CI/CD e versionamento

O deploy é automático: não existe branch `gh-pages` nem cópia manual de arquivos.

### Pipelines

| Workflow | Gatilho | O que faz |
| --- | --- | --- |
| `ci.yml` | pull request, push em `main`, manual | Valida referências locais, sintaxe dos scripts e marcadores de build; gera o artefato em `dist/`. |
| `pages.yml` | push em `main`, manual | Roda as verificações, carimba a versão e publica `dist/` no GitHub Pages. |
| `release.yml` | tag `v*.*.*` | Confere a tag contra o `package.json`, cria a release com notas automáticas e anexa o site em `.zip`. |

O build não tem dependências externas: `scripts/build.mjs` copia o site para `dist/` e carimba `<meta name="app-version">`, `<meta name="app-commit">` e `<meta name="app-channel">`, além de gerar `dist/version.json`. Os valores aparecem na barra lateral e em **Configurações → Sobre o PoC**.

### Primeira publicação

Pré-requisitos: Git e GitHub CLI autenticado (`gh auth login`).

```bash
cd loja-do-bairro-dashboard
git init
git add .
git commit -m "feat: painel operacional com CI/CD no GitHub Pages"
git branch -M main
gh repo create loja-do-bairro-dashboard --public --source=. --remote=origin --push
```

Depois, no repositório, abra **Settings → Pages → Build and deployment** e selecione **Source: GitHub Actions**. O push em `main` já dispara o deploy; o site fica em `https://<usuario>.github.io/loja-do-bairro-dashboard/`.

Se o repositório já existir, basta apontar o remoto:

```bash
git remote add origin https://github.com/<usuario>/loja-do-bairro-dashboard.git
git push -u origin main
```

### Como lançar uma versão

O `package.json` é a fonte da versão. Os atalhos criam commit e tag juntos:

```bash
npm run release:patch   # 1.0.0 → 1.0.1 (correções)
npm run release:minor   # 1.0.0 → 1.1.0 (novidades)
npm run release:major   # 1.0.0 → 2.0.0 (quebra de compatibilidade)
git push --follow-tags
```

O push em `main` publica o site; o push da tag publica a release, com notas geradas a partir dos commits e o site empacotado em `loja-do-bairro-dashboard-v1.0.1.zip`.

O canal exibido no painel indica a origem do build:

| Canal | Origem |
| --- | --- |
| `Release · tag` | build de uma tag `vX.Y.Z` |
| `Branch · main` | build do topo de `main` |
| `Local · sem CI` | `npm run build` na sua máquina (com sufixo `-dirty` se houver alterações não commitadas) |

Mantenha a árvore limpa antes de rodar `npm run release:*` — o `npm version` commita o `package.json` e cria a tag no commit atual.

### Comandos

| Comando | Descrição |
| --- | --- |
| `npm run check` | Executa as mesmas verificações da CI. |
| `npm run build` | Gera `dist/` com versão e commit carimbados. |
| `npm start` | Pré-visualiza `dist/` (ou a raiz) em `http://localhost:8000`. |
| `node scripts/version.mjs` | Mostra a versão que o próximo build usaria. |

Os workflows usam apenas actions oficiais (`actions/*`) e o `GITHUB_TOKEN`, sem secrets extras. O Dependabot abre um PR semanal para mantê-las atualizadas.

## Estrutura de arquivos

```text
loja-do-bairro-dashboard/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── data.js
│       ├── charts.js
│       └── app.js
├── scripts/
│   ├── build.mjs
│   ├── check.mjs
│   ├── serve.mjs
│   └── version.mjs
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── pages.yml
│   │   └── release.yml
│   └── dependabot.yml
├── package.json
├── CHANGELOG.md
├── .gitattributes
├── .nojekyll
├── .gitignore
└── README.md
```

## Sobre os dados

Os dados são inteiramente fictícios e gerados no navegador com o PRNG determinístico **mulberry32**, usando a semente **20260421**. O dataset contém aproximadamente 102 produtos, 168 ordens de serviço e 540 dias simulados (cerca de 18 meses de histórico).

Nenhum dado sai do navegador: não há chamadas de API para carregar informações nem envio de dados para servidores. Para gerar outro dataset, altere a constante `SEED` em `assets/js/data.js` e recarregue a página; produtos, histórico, ordens e indicadores serão recalculados a partir da nova semente.

## Limitações do PoC

- Todos os dados são fictícios e não representam uma operação real.
- Não há backend, banco de dados ou persistência entre sessões.
- As ações do drawer de ordens de serviço não são persistidas.
- Os gráficos dependem do Chart.js via CDN e, portanto, de conexão com a internet.
- Não há autenticação, controle de acesso ou suporte a múltiplos usuários.

## Atalhos de teclado

| Atalho | Ação |
| --- | --- |
| `1` | Ir para Dashboard |
| `2` | Ir para Estoque |
| `3` | Ir para Ordens de serviço |
| `4` | Ir para Analytics |
| `Ctrl+K` | Abrir busca rápida |
| `Esc` | Fechar busca, drawer ou menu lateral |

Os atalhos numéricos são ignorados enquanto o foco está em um campo de texto, seleção ou área de edição.
