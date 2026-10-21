# Como contribuir

Guia para propor mudanças no **Loja do Bairro · Painel de Operações**. O
projeto é um PoC estático mantido por uma pessoa; contribuições são bem-vindas
dentro do escopo descrito abaixo.

| Campo | Valor |
| --- | --- |
| Branch principal | `main` |
| Versão de referência | 1.0.0 |
| Licença | `UNLICENSED` (sem licença de uso público) |
| Dono do código | `@cyber-math` |
| Documentos relacionados | [README.md](README.md) · [TESTES.md](docs/TESTES.md) · [MANUTENCAO.md](docs/MANUTENCAO.md) · [SEGURANCA.md](docs/SEGURANCA.md) |

## 1. Antes de começar

Verifique se a sua ideia já existe:

- procure issues abertas e fechadas;
- leia as limitações no [README.md](README.md);
- confira se a mudança não contraria uma decisão em
  [ARQUITETURA.md](docs/ARQUITETURA.md).

Abre uma issue antes de implementar quando a mudança:

- altera comportamento visível;
- adiciona dependência, CDN ou serviço externo;
- mexe em dados, seed ou cálculos;
- altera workflow, permissões ou release;
- tem impacto de segurança ou privacidade.

Correções pequenas e claras podem ir direto para o PR.

## 2. Pré-requisitos

| Ferramenta | Versão | Observação |
| --- | --- | --- |
| Git | 2.30+ | Necessário para branches e tags |
| Node.js | 22+ | Mesma versão da CI |
| npm | Incluído no Node | Usado apenas para os scripts |
| Navegador atual | Chrome, Firefox, Edge ou Safari | Teste manual |

O projeto **não tem dependências npm** e não possui `package-lock.json`. Não
execute `npm install` nem `npm ci`; não há nada para instalar.

## 3. Preparar o ambiente

```bash
git clone https://github.com/cyber-math/loja-do-bairro-dashboard.git
cd loja-do-bairro-dashboard
node --version
npm run check
npm start
```

Abra `http://localhost:8000`. O servidor usa `dist/` quando existe e a raiz
quando não existe. Para limpar o artefato antes de testar a raiz:

```bash
rm -rf dist
npm start
```

No PowerShell:

```powershell
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm start
```

## 4. Comandos

| Comando | Efeito |
| --- | --- |
| `npm run check` | Executa as verificações estáticas da CI |
| `npm run build` | Gera `dist/` com versão e commit carimbados |
| `npm start` | Serve `dist/` ou a raiz em `http://localhost:8000` |
| `node scripts/version.mjs` | Mostra a versão do próximo build |
| `node scripts/version.mjs --verify-tag v1.0.0` | Confere tag contra `package.json` |
| `npm run release:patch` | Cria patch, commit e tag (mantenedor) |
| `npm run release:minor` | Cria minor, commit e tag (mantenedor) |
| `npm run release:major` | Cria major, commit e tag (mantenedor) |

`npm start` aceita outra porta:

```bash
PORT=3001 npm start
```

```powershell
$env:PORT=3001
npm start
```

## 5. Estrutura do projeto

```text
index.html                 aplicação e views
assets/css/styles.css      estilos principais e tokens
assets/css/admin.css       estilos do painel administrativo
assets/js/data.js          PRNG, dataset mock e agregações
assets/js/charts.js        formatadores e loader do Chart.js
assets/js/admin.js         painel administrativo simulado
assets/js/app.js           estado, render e interações
scripts/check.mjs          verificações estáticas
scripts/build.mjs          artefato dist/
scripts/serve.mjs          servidor local
scripts/version.mjs        versão, commit e canal
docs/                      documentação de engenharia
.github/                   workflows, CODEOWNERS e templates
```

A ordem de carregamento dos scripts é intencional. `data.js` não depende de
nada; `app.js` depende de todos os anteriores. Não reordene sem revisar as
dependências.

## 6. Branches e commits

### 6.1 Branches

| Tipo | Padrão | Exemplo |
| --- | --- | --- |
| Correção | `fix/<tema>` | `fix/resumo-periodo-anterior` |
| Funcionalidade | `feat/<tema>` | `feat/filtro-fornecedor` |
| Documentação | `docs/<tema>` | `docs/runbook-backup` |
| Manutenção | `chore/<tema>` | `chore/actions-node-22` |
| Segurança | `security/<tema>` | `security/csp-meta` |

Use nomes curtos, em minúsculas, com hífen. Não trabalhe direto em `main`.

### 6.2 Commits

O projeto segue Conventional Commits, em português ou inglês, com mensagem
curta no imperativo.

```text
feat: adiciona filtro por fornecedor no estoque
fix: corrige comparação de OS com período anterior
docs: detalha rollback no runbook
test: adiciona smoke de navegação
chore: atualiza actions/checkout para v4
```

Evite commits gigantes. Um commit deve ter uma intenção compreensível. Não
misture formatação, refatoração e mudança funcional no mesmo commit.

## 7. Fluxo de contribuição

```text
1. Issue (quando necessário)
2. Fork ou branch no repositório
3. Implementação + testes + documentação
4. npm run check
5. npm run build + smoke manual
6. Pull request para main
7. CI verde + review
8. Merge (squash) e deploy
```

Passos detalhados:

1. Atualize `main` antes de criar a branch.
2. Implemente a menor mudança que resolve o problema.
3. Atualize `CHANGELOG.md` na seção `Não publicado` quando o comportamento
   mudar.
4. Atualize a documentação afetada.
5. Execute `npm run check` e `npm run build`.
6. Faça o smoke manual descrito em [TESTES.md](docs/TESTES.md).
7. Abra o PR usando o template.
8. Aguarde a CI e o review.
9. Após o merge, acompanhe o deploy do Pages.

Não faça merge do próprio PR sem review, salvo correção emergencial
documentada.

## 8. Padrões de código

### 8.1 JavaScript

- Siga o estilo existente: IIFE, `'use strict'`, funções nomeadas e `var` nos
  arquivos de navegador. Não introduza framework, bundler ou transpilação.
- Não adicione dependência npm. Uma nova dependência exige ADR e aprovação do
  mantenedor.
- Escape todo valor dinâmico antes de inserir em HTML com `esc()`.
- Prefira `textContent` quando não houver markup.
- Não insira dados em `onclick`, `href` ou `style` sem validação específica.
- Não use `eval`, `new Function` ou `document.write`.
- Mantenha o dataset determinístico. Se alterar a seed, atualize a documentação
  e os testes.
- Não prometa persistência, autenticação ou auditoria real no painel. O admin
  é uma simulação e deve continuar rotulado como tal.
- Evite alterar a API `window.LB` e `window.ADMIN` sem necessidade; elas são
  usadas para depuração e integração entre módulos.

### 8.2 HTML e CSS

- Mantenha a estrutura de views e os `id` existentes; o `check.mjs` detecta
  duplicidade.
- Use os tokens CSS de `:root` em vez de cores soltas.
- Respeite `prefers-reduced-motion`.
- Toda imagem ou canvas informativo precisa de alternativa textual. A cobertura
  atual é parcial; não piore.
- Novos controles devem ter rótulo, foco visível e operação por teclado.
- Não use caminhos absolutos (`/assets/...`); o site é publicado em subdiretório
  do GitHub Pages.
- Evite estilos inline; eles dificultam uma futura CSP.

### 8.3 Dados

- `assets/js/data.js` é a fonte do dataset. Não duplique cálculos em `app.js`.
- Novas agregações devem ser funções puras, testáveis e documentadas.
- Mantenha `SEED = 20260421` salvo mudança intencional.
- Não adicione nomes, e-mails, telefones ou documentos reais. Use dados
  fictícios e evite formatos que possam ser confundidos com pessoas reais.

### 8.4 Acessibilidade

Checklist mínimo para UI nova:

- [ ] Funciona apenas com teclado.
- [ ] Foco visível e ordem lógica.
- [ ] Rótulo acessível em botões e campos.
- [ ] Contraste adequado nos temas claro e escuro.
- [ ] Estado não depende apenas de cor.
- [ ] `Esc` fecha sobreposições.
- [ ] Texto alternativo em gráficos e imagens.

## 9. Documentação

Atualize conforme o impacto:

| Mudança | Documento |
| --- | --- |
| Comando, pipeline ou versão | `README.md` e `CHANGELOG.md` |
| Arquitetura, módulo ou decisão | `docs/ARQUITETURA.md` |
| Rotina, release ou dívida | `docs/MANUTENCAO.md` |
| Deploy, incidente ou rollback | `docs/RUNBOOK.md` |
| Controle de segurança | `docs/SEGURANCA.md` e `SECURITY.md` |
| Privacidade, risco ou auditoria | `docs/COMPLIANCE.md` |
| Caso de teste ou critério | `docs/TESTES.md` |

Regras:

- escreva em português brasileiro, tom profissional, sem emojis;
- use tabelas, listas e diagramas ASCII quando ajudarem;
- não descreva capacidade que o código não tem; marque como simulado;
- links relativos devem funcionar a partir do arquivo de origem;
- não publique segredos, dados pessoais ou links internos privados.

## 10. Testes

Antes de abrir o PR:

```bash
npm run check
npm run build
npm start
```

Execute o smoke mínimo de [TESTES.md](docs/TESTES.md):

1. carregar a página sem erro no console;
2. abrir as seis views;
3. alternar período e categoria;
4. abrir o drawer de uma OS;
5. exportar um CSV;
6. abrir as oito sub-abas do admin;
7. testar 375 px de largura.

Cole no PR o resultado de `npm run check` e o que foi testado manualmente. Se
algo não foi testado, diga explicitamente.

## 11. Pull request

O template em `.github/pull_request_template.md` guia o preenchimento. Um PR
deve conter:

- resumo e motivação;
- issue relacionada, se houver;
- tipo de mudança;
- como foi testado;
- risco e rollback;
- impacto em documentação, dados ou segurança;
- capturas de tela quando houver mudança visual.

Critérios de aceite:

- [ ] CI verde.
- [ ] Sem conflito com `main`.
- [ ] Mudança limitada ao escopo declarado.
- [ ] `npm run check` e `npm run build` executados.
- [ ] Smoke manual registrado.
- [ ] Documentação e CHANGELOG atualizados.
- [ ] Sem segredo, dado pessoal ou artefato gerado commitado.
- [ ] Review aprovado.

## 12. Review

O review verifica:

1. correção e clareza do código;
2. aderência à arquitetura e ao escopo de demonstração;
3. segurança de sinks HTML, links e dependências;
4. acessibilidade e responsividade;
5. testes e evidências;
6. documentação e rollback.

Metas de melhores esforços:

| Etapa | Prazo |
| --- | --- |
| Primeira resposta | 2 dias úteis |
| Review completo | 5 dias úteis |
| Correção solicitada | conforme complexidade |

O mantenedor pode recusar mudanças que aumentem a superfície de risco sem
contrapartida, que contrariem o escopo estático ou que apresentem simulação
como capacidade real.

## 13. Release

Somente o mantenedor publica releases. O processo completo está em
[MANUTENCAO.md](docs/MANUTENCAO.md). Resumo:

```bash
git switch main
git pull --ff-only
npm run check
npm run build
npm run release:patch
git push --follow-tags
```

A tag dispara `release.yml`. O merge em `main` dispara `pages.yml`. Não criar
tag manualmente sem passar por `npm version`; a CI confere a tag contra o
`package.json`.

## 14. Segurança

Não abra issue pública para vulnerabilidade. Siga
[SECURITY.md](SECURITY.md) e [docs/SEGURANCA.md](docs/SEGURANCA.md).

Se encontrar segredo no repositório:

1. não copie o valor para a issue;
2. avise o mantenedor em canal privado;
3. aguarde a revogação antes de qualquer limpeza de histórico.

## 15. Conduta

Espere e ofereça tratamento respeitoso, objetivo e técnico. Não são aceitos
assédio, discriminação, ataques pessoais, spam ou divulgação de informação
privada. O mantenedor pode fechar contribuições que não sigam estas regras.

## 16. Licença e propriedade

O `package.json` declara `UNLICENSED`. O código é disponibilizado para
demonstração e avaliação; isso não concede direito de uso comercial,
redistribuição ou criação de obra derivada. Contribuições enviadas podem ser
incorporadas ao projeto sob os mesmos termos.

Dúvidas sobre uso devem ser tratadas com o mantenedor antes de qualquer
publicação.
