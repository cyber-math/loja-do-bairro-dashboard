# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
versionamento segue o [SemVer](https://semver.org/lang/pt-BR/). As releases são
publicadas automaticamente pelo workflow `release.yml` a partir das tags `vX.Y.Z`,
com notas geradas pelos commits e o site empacotado em anexo.

## [Não publicado]

## [1.0.0] - 2026-10-21

### Adicionado

- Publicação automática no GitHub Pages via GitHub Actions (`pages.yml`).
- Pipeline de CI (`ci.yml`) validando referências locais, sintaxe dos scripts e marcadores de build.
- Versionamento semântico ancorado no `package.json`, com build carimbando versão, commit e canal.
- Workflow de release (`release.yml`) que valida a tag contra o `package.json`, publica as notas e anexa o site em `.zip`.
- `dist/version.json` com os metadados do build publicado.
- Scripts locais `npm run check`, `npm run build` e `npm start`.
- Dependabot semanal para as GitHub Actions.

### Alterado

- A seção "Sobre o PoC" agora exibe versão, build e canal em vez de um texto fixo.
