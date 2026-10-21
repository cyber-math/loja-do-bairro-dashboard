# Plano de Testes

Estratégia de verificação do PoC **Loja do Bairro · Painel de Operações**.
Define o que é automatizado, o que é manual, os casos de teste, os critérios de
aceite e as lacunas conhecidas.

| Campo | Valor |
| --- | --- |
| Versão de referência | 1.0.0 |
| Última revisão | 2026-10-21 |
| Responsável | Manutenção de Sistemas |
| Ambiente de referência | Node.js 22+, navegador atual, GitHub Pages |
| Documentos relacionados | [MANUTENCAO.md](MANUTENCAO.md) · [RUNBOOK.md](RUNBOOK.md) · [SEGURANCA.md](SEGURANCA.md) |

## 1. Estratégia

O projeto é uma SPA estática sem backend. A estratégia combina:

1. **Verificação estática automatizada** (`npm run check`), executada em todo
   PR e antes do deploy.
2. **Verificação de build** (`npm run build`), que valida o artefato publicado.
3. **Smoke manual** das seis views, do painel administrativo e dos fluxos de
   exportação.
4. **Testes exploratórios** de responsividade, teclado, falha de CDN e XSS.
5. **Verificação pós-deploy** no domínio do GitHub Pages.

Não há testes unitários, de integração ou end-to-end automatizados. A cobertura
automática é limitada a sintaxe, referências, IDs, encoding, marcadores de
versão e `.nojekyll`.

```text
        Manual exploratório e pós-deploy
       /                                \
      /  Smoke manual das views e admin   \
     /____________________________________\
    /   Build: artefato, versão, arquivos  \
   /________________________________________\
  /   Estático: check.mjs (17 verificações)  \
 /____________________________________________\
```

## 2. Ambiente e dados

| Item | Valor |
| --- | --- |
| Sistema operacional de desenvolvimento | Windows, macOS ou Linux |
| Node.js | 22 ou superior (CI usa 22) |
| Navegadores alvo | Chrome, Firefox, Edge e Safari atuais |
| Resolução mínima alvo | 375 × 667 (celular) |
| Resoluções adicionais alvo | 768 × 1024 (tablet) e 1440 × 900 (desktop) |
| Servidor local | `npm start` em `http://localhost:8000` |
| Dados | Mock determinístico, seed `20260421` |
| Contagens de referência | 101 produtos base, 168 OS, 540 dias |
| Rede | Necessária para Chart.js e Google Fonts |

A janela de 540 dias termina no dia do carregamento. Valores agregados por
período podem variar de um dia para outro; contagens estruturais e valores por
produto permanecem estáveis.

## 3. Verificação automatizada

### 3.1 Comando

```bash
npm run check
```

Equivalente a `node scripts/check.mjs`. Falha com código 1 se qualquer
verificação obrigatória falhar.

### 3.2 O que é verificado

| Seção | Verificação | Cobertura |
| --- | --- | --- |
| 1 | Arquivos e referências locais do `index.html` | Existência do arquivo, caminho relativo, ausência de caminho absoluto e de escape do projeto |
| 2 | Sintaxe dos JavaScript em `assets/js` | `node --check` em cada `.js`, inclusive subpastas |
| 3 | IDs duplicados no HTML | Remove comentários, scripts e estilos antes de contar |
| 4 | Encoding dos arquivos de texto | Detecta U+FFFD, ignorando binários, `.git`, `node_modules` e `dist` |
| 5 | Marcadores de versão | Exige `<meta name="app-version">` ou `data-app-version` |
| 6 | GitHub Pages | Exige `.nojekyll` |

Resultado de referência em 2026-10-21: **17 verificações ok, 0 avisos**.

### 3.3 O que não é verificado

- comportamento em runtime, erros de console e exceções;
- renderização visual, layout e contraste;
- acessibilidade e navegação por teclado;
- gráficos, CDN e fallback;
- persistência em `localStorage`;
- exportação CSV;
- painel administrativo e auditoria;
- segurança de conteúdo, CSP e SRI;
- links da documentação;
- compatibilidade entre navegadores;
- desempenho.

Essas lacunas são cobertas por casos manuais ou estão registradas como dívida.

### 3.4 Build

```bash
npm run build
find dist -maxdepth 2 -type f | sort
cat dist/version.json
```

PowerShell:

```powershell
npm run build
Get-ChildItem -Recurse dist | Select-Object FullName
Get-Content dist/version.json
```

O build deve conter `index.html`, `404.html`, `manifest.webmanifest`,
`robots.txt`, `sitemap.xml`, `.nojekyll`, `README.md`, `assets/`,
`.well-known/security.txt` e `version.json`. O `index.html` deve ter as metas
`app-version`, `app-commit` e `app-channel`.

**Atenção:** `scripts/build.mjs` não copia `docs/`. O `security.txt` é
publicado, mas seus links `Policy` e `Acknowledgments` apontam para
`docs/SEGURANCA.md`, que não existe no artefato e retorna 404. O teste T-30
cobre essa lacuna.

## 4. Casos de teste

Situação em 2026-10-21: os casos estáticos T-01 a T-04 foram executados; os
demais são o roteiro de aceite e permanecem **não executados** nesta baseline,
salvo indicação de verificação por inspeção, script local ou falha conhecida.

| ID | Área | Cenário | Pré-condição | Passos | Resultado esperado | Tipo | Situação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | Estático | Check completo | Dependências do Node disponíveis | Executar `npm run check` | 17 verificações ok, 0 avisos, exit 0 | Automático | Aprovado |
| T-02 | Build | Artefato completo | Check aprovado | Executar `npm run build`; listar `dist/`; abrir `version.json` | Arquivos obrigatórios presentes; versão, commit, canal e data válidos | Automático | Aprovado |
| T-03 | Dados | Determinismo e contagens | Página carregada | Inspecionar `DADOS` no console; recarregar no mesmo dia | Seed `20260421`; 101 produtos base; 168 OS; 540 dias; valores iguais no mesmo dia | Manual | Verificado por inspeção |
| T-04 | Links | Referências locais | Repositório completo | Executar `npm run check` | Nenhuma referência local ausente ou absoluta no `index.html` | Automático | Aprovado |
| T-05 | Fumaça | Carregamento inicial | Servidor local ativo | Abrir `http://localhost:8000`; observar console e rede | Página renderiza; sem erro de sintaxe; sem 404 em `assets/` | Manual | Não executado |
| T-06 | Navegação | Seis views | Página carregada | Clicar em Dashboard, Estoque, Ordens, Analytics, Fornecedores e Configurações | Cada view exibe título, subtítulo e conteúdo; apenas uma fica ativa | Manual | Não executado |
| T-07 | Dashboard | Filtro de período | Dashboard ativo | Alternar 7, 30, 90 e 540 dias | KPIs, séries e textos de período mudam de forma coerente | Manual | Não executado |
| T-08 | Dashboard | Cross-filter de categoria | Dashboard ativo | Clicar em uma fatia do doughnut de categorias | Filtro de categoria aplicado; KPIs e gráficos atualizados; opção de limpar | Manual | Não executado |
| T-09 | Estoque | Busca e status | View Estoque ativa | Digitar parte de um SKU; selecionar status; limpar | Tabela filtra sem travar; paginação volta à primeira página | Manual | Não executado |
| T-10 | Estoque | Ordenação e paginação | View Estoque ativa | Clicar em duas colunas; avançar e voltar páginas | Ordem alterna asc/desc; página e contagem coerentes | Manual | Não executado |
| T-11 | Estoque | Exportação CSV | View Estoque com linhas | Clicar em Exportar; abrir o arquivo | CSV com cabeçalho, mesmas linhas do filtro, separador `;` e acentos corretos | Manual | Não executado |
| T-12 | Ordens | Tabela e kanban | View Ordens ativa | Alternar tabela/kanban; filtrar por status e prioridade | Visão escolhida persiste na sessão; filtros afetam as duas visões | Manual | Não executado |
| T-13 | Ordens | Drawer e ações | View Ordens ativa | Abrir uma OS; executar uma ação; fechar com `Esc` | Drawer mostra detalhes; ação apenas simula e avisa; nada persiste após recarregar | Manual | Não executado |
| T-14 | Ordens | Comparação com período anterior | View Ordens ativa | Observar o indicador de variação de OS | Valor deveria refletir o período anterior | Manual | Falha conhecida: `resumoPrev` sempre vazio |
| T-15 | Analytics | ABC, projeção e mapa | View Analytics ativa | Rolar a página; alternar período | Curva ABC ordenada; projeção com regressão; mapa de 52 semanas renderizado | Manual | Não executado |
| T-16 | Fornecedores | Indicadores | View Fornecedores ativa | Inspecionar cards e tabela | Prazo, custo e portfólio coerentes com os dados mock | Manual | Não executado |
| T-17 | Configurações | Tema e densidade | Página carregada | Alternar tema e densidade; recarregar | Tema e densidade persistem em `localStorage`; gráficos acompanham o tema | Manual | Não executado |
| T-18 | Busca | Paleta de comandos | Página carregada | Pressionar `Ctrl+K`; digitar; selecionar; repetir e fechar com `Esc` | Paleta abre, filtra e navega; `Esc` fecha sem alterar a view | Manual | Não executado |
| T-19 | Teclado | Atalhos em campos | Página carregada | Focar a busca de estoque; pressionar `1`, `2`, `3`, `4` | Números são digitados no campo e não trocam de view | Manual | Não executado |
| T-20 | Admin | Oito sub-abas | Configurações → Painel administrativo | Abrir Visão, Compliance, Regras, Backend, Transmissão, Ativos, Infraestrutura e Auditoria | Todas renderizam sem erro; tabelas e gráficos aparecem | Manual | Não executado |
| T-21 | Admin | Fallback sem módulo | Página carregada | Bloquear `assets/js/admin.js` e recarregar; abrir Configurações | Cartão de fallback é exibido; restante do painel continua funcionando | Manual | Não executado |
| T-22 | Auditoria | Hash e exportação | Aba Auditoria aberta | Exportar CSV; comparar hash exibido com o modelo | Exportação contém os eventos filtrados | Manual | Falha conhecida: hash é FNV-1a 32 bits, mas interface diz SHA-256 |
| T-23 | Admin | Stream de eventos | Aba Transmissão aberta | Iniciar, pausar e reiniciar o stream | Indicadores e linhas atualizam; botão reflete o estado; parar interrompe | Manual | Não executado |
| T-24 | Admin | Máscara de ambiente | Aba Infraestrutura aberta | Alternar "revelar" e ocultar | Valores sensíveis simulados ficam mascarados por padrão | Manual | Não executado |
| T-25 | Resiliência | Fallback de CDN | Página carregada | Bloquear jsDelivr e recarregar; repetir bloqueando dois CDNs | Chart.js carrega do próximo CDN; com todos bloqueados, aparece aviso e tabelas funcionam | Manual | Não executado |
| T-26 | Resiliência | Falha de rede após carga | Página carregada | Ativar modo offline; interagir sem recarregar; depois tentar recarregar | Conteúdo já renderizado continua utilizável; recarregar falha porque não há service worker | Manual | Limitação conhecida: sem cache offline |
| T-27 | Segurança | Escape de XSS | Busca de estoque ativa | Digitar `<img src=x onerror=alert(1)>` | Texto aparece literal; nenhum diálogo ou nó de imagem é criado | Manual | Não executado |
| T-28 | Responsivo | Três larguras | DevTools aberto | Testar 375, 768 e 1440 px; abrir menu e drawer | Sem rolagem horizontal indevida; navegação e tabelas utilizáveis | Manual | Não executado |
| T-29 | Acessibilidade | Teclado e foco | Página carregada | Navegar por `Tab`; abrir drawer e paleta; observar foco | Foco visível; controles alcançáveis; `Esc` fecha; canvas tem rótulo ou alternativa | Manual | Parcial: cobertura conhecida incompleta |
| T-30 | Publicação | Arquivos publicados | Build gerado | Comparar raiz e `dist/`; conferir `security.txt` e o link `Policy` | `404.html`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `assets/` e `.well-known/` presentes; `docs/` ausente; `Policy` retorna 404 | Manual | Falha conhecida: `docs/` fora do `dist/` |
| T-31 | Impressão | Layout de impressão | Página carregada | `Ctrl+P` no Dashboard | Não há folha `@media print`; layout de tela é usado | Manual | Não suportado |
| T-32 | Segurança | Fórmula em CSV | Exportação com campo iniciado por `=` | Abrir CSV em planilha | Fórmula não deve ser executada | Manual | Falha conhecida: não há neutralização |
| T-33 | Documentação | Links relativos | Documentos criados | Percorrer links de README e `docs/` | Todos os links relativos abrem o arquivo correto | Manual | Verificado por script local: 75 links, 0 quebrados |
| T-34 | Segurança | Cabeçalhos e CSP | Site publicado | Inspecionar resposta e `<meta>` | Deve haver política de CSP e SRI no Chart.js | Manual | Falha conhecida: ambos ausentes |
| T-35 | Compatibilidade | Quatro navegadores | Site publicado | Abrir e executar smoke em Chrome, Firefox, Edge e Safari | Comportamento equivalente, sem erro bloqueante | Manual | Não executado |

### 4.1 Critérios dos casos críticos

**T-01 e T-02** são bloqueantes de release. Falha em qualquer um impede deploy.

**T-05, T-06, T-07 e T-12** são o smoke mínimo. Sem esses fluxos, a release não
é considerada verificada.

**T-14, T-22, T-30, T-32 e T-34** são falhas conhecidas. Elas não bloqueiam a
release atual porque estão documentadas e não afetam o discurso de demonstração,
mas devem entrar no backlog com prioridade.

## 5. Checklist de regressão

Executar antes de cada release e após mudanças em `app.js`, `admin.js`,
`data.js`, `charts.js`, `index.html` ou CSS.

- [ ] `npm run check` sem erro e sem aviso novo.
- [ ] `npm run build` concluído e `dist/version.json` válido.
- [ ] Carregamento sem erro no console.
- [ ] Seis views abrem e exibem dados.
- [ ] Filtros de período e categoria atualizam KPIs.
- [ ] Busca de estoque e de OS funcionam.
- [ ] Ordenação e paginação não quebram.
- [ ] CSV de estoque baixa com acentos corretos.
- [ ] Tabela e kanban de OS alternam.
- [ ] Drawer abre, fecha com `Esc` e não persiste ação.
- [ ] Tema e densidade persistem após recarregar.
- [ ] `Ctrl+K` abre a paleta e não conflita com campos.
- [ ] Painel administrativo abre nas 8 sub-abas.
- [ ] Stream inicia e para sem erro.
- [ ] Exportação de auditoria baixa.
- [ ] Fallback de CDN exibe mensagem clara.
- [ ] Layout utilizável em 375 px.
- [ ] Versão publicada confere com `package.json`.
- [ ] Links relativos da documentação estão válidos.
- [ ] Nenhum dado pessoal ou segredo foi adicionado.

## 6. Execução e evidências

Modelo de relatório:

```text
Relatório de execução
Versão:
Commit:
Data e hora:
Ambiente:
  Node:
  Navegador:
  Resolução:
Casos executados:
  ID | resultado | evidência
Defeitos encontrados:
  ID | severidade | descrição | evidência | issue
Casos não executados e motivo:
Observações:
Responsável:
```

Evidências aceitas:

- log de `npm run check` e `npm run build`;
- captura de tela ou gravação curta do fluxo;
- mensagem de erro do console;
- link do run no GitHub Actions;
- `version.json` publicado;
- issue com passos de reprodução.

Não anexar dados pessoais, tokens ou conteúdo de terceiros.

## 7. Severidade de defeitos

| Severidade | Critério | Exemplo | Prazo |
| --- | --- | --- | --- |
| S1 | Bloqueia uso ou compromete segurança | Site em branco; XSS executando; conteúdo malicioso | Correção imediata |
| S2 | Função principal incorreta | Filtro não atualiza; CSV vazio; admin não abre | 2 dias úteis |
| S3 | Função secundária ou cosmética | Rótulo errado; gráfico sem legenda; layout apertado | Próxima release |
| S4 | Melhoria | Texto, espaçamento, documentação | Backlog |

Defeito S1 ou S2 em produção exige rollback conforme o
[RUNBOOK.md](RUNBOOK.md), mesmo que a correção seja simples.

## 8. Definição de Pronto (DoD)

Uma mudança está pronta quando:

- [ ] O comportamento esperado está descrito na issue ou no PR.
- [ ] O código segue o padrão do projeto e não adiciona dependência sem ADR.
- [ ] `npm run check` passa.
- [ ] `npm run build` gera artefato completo.
- [ ] O smoke mínimo foi executado e registrado.
- [ ] Casos de regressão afetados foram executados.
- [ ] Acessibilidade básica foi verificada quando há UI nova.
- [ ] Documentação e CHANGELOG foram atualizados.
- [ ] Riscos, limitações e rollback estão descritos.
- [ ] O PR foi revisado pelo CODEOWNERS.
- [ ] O deploy foi verificado no domínio publicado.

## 9. Lacunas e melhorias

| Lacuna | Efeito | Melhoria |
| --- | --- | --- |
| Sem testes de comportamento | Regressões passam pelo check | Playwright com smoke das 6 views |
| Sem teste de contrato de dados | Mudança de seed ou agregador passa despercebida | Testes em Node para `data.js` |
| Sem teste de acessibilidade | Barreiras não são detectadas | axe-core no CI |
| Sem teste visual | Layout quebra sem alerta | Screenshot diff |
| Sem baseline de desempenho | Regressão silenciosa | Orçamento de bytes e LCP |
| Sem teste de links no check | Docs apodrecem sem bloqueio de CI | Script de links no check |
| Sem teste de segurança | CSP/SRI/XSS dependem de revisão | SAST e testes de XSS |
| Sem dispositivo real | Responsividade limitada ao DevTools | Teste em celular e tablet |
| Sem teste de impressão | Impressão não suportada | `@media print` ou remoção da expectativa |

## 10. Referências

- [README.md](../README.md) — comandos e limitações.
- [ARQUITETURA.md](ARQUITETURA.md) — fluxo e decisões.
- [MANUTENCAO.md](MANUTENCAO.md) — matriz e checklist de release.
- [RUNBOOK.md](RUNBOOK.md) — verificação pós-deploy e rollback.
- [SEGURANCA.md](SEGURANCA.md) — casos de segurança e reporte.
