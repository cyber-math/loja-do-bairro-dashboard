# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
versionamento segue o [SemVer](https://semver.org/lang/pt-BR/).

## [Não publicado]

## [1.0.0] - 2026-10-21

### Added

- Painel operacional estático com KPIs de receita, lucro, margem, ticket médio, ruptura e ordens de serviço.
- Gráficos de evolução financeira, categorias, volume, status das OS, saúde do estoque e top produtos com Chart.js via CDN.
- Tabela de estoque com filtros, ordenação por coluna, paginação e exportação CSV dos dados filtrados.
- Ordens de serviço em tabela e kanban, com drawer de detalhes.
- Curva ABC, projeção por regressão linear, mapa de calor de 52 semanas e indicadores de fornecedores.
- Busca rápida com `Ctrl+K`, tema claro/escuro persistido no navegador e layout responsivo.
- Painel administrativo integrado às Configurações, com estilos próprios em `assets/css/admin.css` e carregamento isolado em `assets/js/admin.js`.
- Pipeline de CI (`ci.yml`) validando referências locais, sintaxe, IDs duplicados, encoding e marcadores de build, com upload do artefato `site`.
- Deploy automático no GitHub Pages (`pages.yml`) a partir de `dist/`, sem branch `gh-pages`.
- Workflow de release (`release.yml`) que confere a tag contra o `package.json`, gera notas automáticas e anexa o site em `.zip`.
- Scripts locais `npm run check`, `npm run build`, `npm start` e `npm run version`, sem dependências externas.
- Versionamento semântico com carimbo de versão, commit e canal no `index.html` e em `dist/version.json`.
- Dependabot semanal para manter as GitHub Actions atualizadas.

### Changed

- O build passou a gerar um artefato completo em `dist/`, incluindo `index.html`, `assets/`, `.nojekyll`, `README.md` e `version.json`.
- A seção "Sobre o PoC" e a barra lateral exibem versão, build e canal em vez de valores fixos.
- A publicação no GitHub Pages usa o artefato versionado do build, em vez de copiar arquivos manualmente.
- A versão do projeto é lida do `package.json` em todos os canais de build.

### Fixed

- Referências locais quebradas, arquivos JavaScript com sintaxe inválida e encoding corrompido passam a bloquear a CI antes do deploy.
- IDs duplicados no HTML são detectados durante a checagem.
- O painel exibe um fallback amigável quando o módulo administrativo não está disponível.
- O servidor local trata path traversal e serve `dist/` quando o build existe.
