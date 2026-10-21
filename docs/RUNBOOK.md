# Runbook de Operações

Procedimentos operacionais para o site estático **Loja do Bairro · Painel de
Operações**. Cobre verificação, deploy, rollback, incidentes, credenciais,
backup e comunicação.

| Campo | Valor |
| --- | --- |
| Versão de referência | 1.0.0 |
| Última revisão | 2026-10-21 |
| Responsável | Manutenção de Sistemas |
| URL de produção | `https://cyber-math.github.io/loja-do-bairro-dashboard/` |
| Repositório | `cyber-math/loja-do-bairro-dashboard` |
| Documentos relacionados | [MANUTENCAO.md](MANUTENCAO.md) · [TESTES.md](TESTES.md) · [SEGURANCA.md](SEGURANCA.md) |

## 1. Escopo e premissas

O sistema é um site estático publicado pelo GitHub Pages a partir de `dist/`.
Não há servidor de aplicação, banco de dados, fila, cache próprio ou job de
backend operado pelo projeto. As ações de "administração" na interface são
simuladas e não alteram nenhum estado fora do navegador.

Consequências para a operação:

- não existe restart de serviço, conexão de banco ou limpeza de fila;
- a restauração é feita por redeploy de um commit saudável;
- a indisponibilidade do GitHub Pages está fora do controle do projeto;
- não há dados de produção a recuperar;
- não há plantão 24x7 nem SLA contratual. As metas são de melhores esforços.

## 2. Severidade

| Nível | Definição | Exemplos | Primeira resposta | Meta de restauração | Comunicação |
| --- | --- | --- | --- | --- | --- |
| SEV1 | Site indisponível ou comprometido | Pages retorna 404/5xx para todos; conteúdo malicioso publicado; credencial com acesso ao repositório exposta | Imediata | 4 horas | Aviso no repositório e partes interessadas |
| SEV2 | Função principal degradada | Deploy falha de forma repetida; dashboard não renderiza; versão errada publicada | 1 hora | 1 dia útil | Registro na issue e aviso |
| SEV3 | Função secundária ou documentação | Gráficos não carregam por CDN; link quebrado; erro em uma view | 1 dia útil | 5 dias úteis | Issue |
| SEV4 | Melhoria ou baixo impacto | Texto incorreto, ajuste visual, dívida técnica | 3 dias úteis | Próxima release | Backlog |

Classificação inicial pode ser revista. Na dúvida entre dois níveis, assumir o
mais alto até obter evidência.

## 3. Papéis e contatos

| Papel | Responsável | Canal | Observação |
| --- | --- | --- | --- |
| Mantenedor primário | `@cyber-math` | Menção em issue/PR e GitHub | Único code owner configurado |
| Segurança | `seguranca@lojadobairro.example` | E-mail | Endereço declarado no `security.txt`; usa domínio reservado `.example` e precisa ser substituído antes de uso real |
| GitHub Support | — | `https://support.github.com` | Somente para falha da plataforma |
| Fornecedor de CDN | — | Sites dos provedores | Chart.js e fontes são serviços de terceiros |

O endereço de segurança acima **não é uma caixa postal comprovadamente
monitorada**. Antes de divulgar o projeto como operacional, substituir por um
endereço real e atualizar `.well-known/security.txt` e [SECURITY.md](../SECURITY.md).
Enquanto isso, relatos podem ser enviados pelo recurso de relatório privado de
vulnerabilidade do GitHub (Security → Advisories), quando habilitado no
repositório.

## 4. Pré-requisitos do operador

| Ferramenta | Versão mínima | Verificação |
| --- | --- | --- |
| Node.js | 22 | `node --version` |
| npm | Incluído no Node | `npm --version` |
| Git | 2.30 | `git --version` |
| GitHub CLI | 2.40 | `gh --version` |
| Navegador atual | Chrome, Firefox, Edge ou Safari | Abrir o site |

```bash
node --version
npm --version
git --version
gh --version
gh auth status
```

O projeto não tem dependências npm e não possui `package-lock.json`. **Não
execute `npm ci` nem `npm install`**; não há nada para instalar.

Permissões necessárias para operar:

- leitura do repositório para diagnóstico;
- escrita em `main` ou permissão para mergear PR para deploy;
- `actions: write` para reexecutar workflows;
- `pages: write` e `id-token: write` são concedidos ao workflow, não ao
  operador;
- acesso de administração para trocar configuração do Pages.

## 5. Verificação de saúde

### 5.1 Site publicado

Bash, macOS, Linux, Git Bash ou WSL:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://cyber-math.github.io/loja-do-bairro-dashboard/
curl -sS https://cyber-math.github.io/loja-do-bairro-dashboard/version.json
```

PowerShell:

```powershell
(Invoke-WebRequest -Uri "https://cyber-math.github.io/loja-do-bairro-dashboard/" -UseBasicParsing).StatusCode
(Invoke-RestMethod -Uri "https://cyber-math.github.io/loja-do-bairro-dashboard/version.json") | Format-List
```

Sinais esperados:

- HTTP 200 no `index.html`;
- `version.json` com `version`, `commit`, `channel` e `builtAt`;
- versão exibida no painel igual à do `version.json`;
- console do navegador sem erro de sintaxe ou 404 de arquivo local.

### 5.2 Pipeline e Pages

```bash
gh run list --workflow=ci.yml --limit 5
gh run list --workflow=pages.yml --limit 5
gh run view <RUN_ID> --log
gh api repos/cyber-math/loja-do-bairro-dashboard/pages
```

O retorno de `pages` deve indicar `status: built`, `build_type: workflow` e a
URL publicada. `https_certificate` pode levar alguns minutos após a primeira
publicação.

### 5.3 Versão local

```bash
node scripts/version.mjs
git status --porcelain
git log -1 --oneline
```

`node scripts/version.mjs` mostra a versão que o próximo build usaria. Se
`git status --porcelain` tiver saída, o build local recebe sufixo `-dirty`.

### 5.4 Checklist de saúde

- [ ] Site responde 200.
- [ ] `version.json` é válido e corresponde ao painel.
- [ ] Dashboard, Estoque, Ordens, Analytics, Fornecedores e Configurações abrem.
- [ ] Filtros de período e categoria alteram KPIs e gráficos.
- [ ] Exportação CSV baixa um arquivo com linhas.
- [ ] Painel administrativo abre e mostra o aviso de simulação.
- [ ] Console sem erro vermelho de arquivo local.
- [ ] Último run de `pages.yml` está verde.

## 6. Deploy

### 6.1 Deploy padrão

1. Abrir PR da branch para `main`.
2. Aguardar `CI` verde.
3. Obter review e mergear.
4. O push em `main` dispara `pages.yml`.
5. Acompanhar:

```bash
gh run list --workflow=pages.yml --limit 3
gh run watch <RUN_ID> --exit-status
```

6. Executar a verificação pós-deploy da seção 5.
7. Registrar a evidência no PR ou na issue.

O workflow usa `concurrency: pages` com `cancel-in-progress: true`. Um novo
push em `main` cancela o deploy anterior em andamento; isso é esperado.

### 6.2 Deploy manual

```bash
gh workflow run pages.yml --ref main
gh run list --workflow=pages.yml --limit 1
gh run watch <RUN_ID> --exit-status
```

Executar deploy manual apenas quando o push não disparou o workflow ou quando
for necessário republicar o topo de `main` sem novo commit.

### 6.3 Pré-visualização local

```bash
npm run check
npm run build
npm start
```

`npm start` serve `dist/` quando ele existe e a raiz quando não existe, em
`http://localhost:8000`. Para outra porta:

```bash
PORT=3001 npm start
```

```powershell
$env:PORT=3001
npm start
```

O servidor local envia `cache-control: no-store` e não reproduz cabeçalhos do
GitHub Pages. A pré-visualização não substitui o teste no domínio publicado.

### 6.4 Verificação pós-deploy

| Item | Como verificar | Critério |
| --- | --- | --- |
| Disponibilidade | `curl` ou navegador | HTTP 200 |
| Versão | `version.json` e rodapé/Configurações | Valores iguais |
| Canal | Painel | `Branch · main` ou `Release · tag` coerente |
| Assets | DevTools, aba Network | Sem 404 em `assets/` |
| Gráficos | Abrir Dashboard e Analytics | Canvas renderizado ou aviso claro |
| Dados | Contagens e seed | 101 produtos base, 168 OS, 540 dias |
| Admin | Configurações → Painel administrativo | 8 sub-abas abrem |
| Console | DevTools | Sem erro de sintaxe ou referência local quebrada |

## 7. Rollback

Preferir revert. Não usar `git push --force` em `main`.

### 7.1 Reverter o commit problemático

```bash
git switch main
git pull --ff-only
git log --oneline -5
git revert <COMMIT_SHA>
git push origin main
```

O revert gera um novo commit, dispara `pages.yml` e publica o estado anterior
sem reescrever o histórico.

### 7.2 Reexecutar o último deploy saudável

```bash
gh run list --workflow=pages.yml --status success --limit 5
gh run rerun <RUN_ID>
gh run watch <RUN_ID> --exit-status
```

A reexecução reconstrói o artefato a partir do commit daquele run e o publica.
Ela não altera `main`. Se o run tiver sido expirado ou o commit não existir
mais, usar o revert.

### 7.3 Republicar uma tag

```bash
git tag --list 'v*' --sort=-v:refname | head -5
gh workflow run pages.yml --ref v1.0.0
gh run list --workflow=pages.yml --limit 1
gh run watch <RUN_ID> --exit-status
```

Só funciona se o workflow existir na tag e a tag apontar para um commit com
`package.json` válido. A versão publicada será a da tag, não a de `main`.

### 7.4 Confirmar o rollback

- [ ] `version.json` mostra o commit ou a versão esperada.
- [ ] O comportamento corrigido/removido voltou ao estado anterior.
- [ ] O console não tem erro novo.
- [ ] A issue registra horário, commit de origem, commit de rollback e motivo.
- [ ] A causa raiz entrou no backlog.

## 8. Resposta a incidentes

```text
Detectar --> Triar --> Conter --> Comunicar --> Recuperar --> Validar --> Postmortem
   |           |          |           |            |            |            |
   v           v          v           v            v            v            v
 Alerta     Severidade  Reverter   Aviso       Redeploy     Checklist    Ações
 manual     e impacto   ou limitar  curto       saudável     de saúde     com prazo
```

1. **Detectar.** Confirmar por `curl`, navegador e runs do GitHub Actions. Não
   assumir que é CDN antes de verificar o `index.html`.
2. **Triar.** Classificar SEV1 a SEV4 e nomear um responsável pela coordenação.
3. **Conter.** Reverter, desabilitar o workflow problemático ou remover o
   conteúdo. Preservar logs e commits.
4. **Comunicar.** Usar os modelos da seção 13. Em SEV1, comunicar mesmo sem
   causa raiz.
5. **Recuperar.** Aplicar o procedimento da seção 7 ou o playbook específico.
6. **Validar.** Executar a seção 5 e confirmar com quem reportou.
7. **Postmortem.** Em até 5 dias úteis para SEV1/SEV2, sem culpa, com ações.

## 9. Playbooks

### P-01 — Site retorna 404 ou página em branco

**Sintomas:** HTTP 404, tela vazia, apenas HTML sem estilo.

**Diagnóstico:**

```bash
gh run list --workflow=pages.yml --limit 5
gh api repos/cyber-math/loja-do-bairro-dashboard/pages
curl -sS -I https://cyber-math.github.io/loja-do-bairro-dashboard/
```

Verificar também se o artefato contém `index.html` e `assets/`:

```bash
npm run build
find dist -maxdepth 2 -type f | sort
```

```powershell
npm run build
Get-ChildItem -Recurse dist | Select-Object FullName
```

**Mitigação:** se o último deploy falhou, corrigir a causa e reexecutar. Se o
Pages estiver em configuração incorreta, em **Settings → Pages**, selecionar
**Source: GitHub Actions**. Se o `dist/` estiver incompleto, corrigir
`scripts/build.mjs` e publicar.

**Validar:** HTTP 200, CSS aplicado, console sem 404.

### P-02 — CI vermelha em `npm run check`

**Sintomas:** step "Verificações" falha.

**Diagnóstico:** o log indica a seção e o arquivo. Reproduzir localmente:

```bash
npm run check
```

Causas comuns e correção:

| Mensagem | Causa | Correção |
| --- | --- | --- |
| `referência local não encontrada` | Caminho errado ou arquivo removido | Corrigir `src`/`href` ou restaurar o arquivo |
| `referência absoluta quebra o GitHub Pages` | Caminho iniciado por `/` | Usar caminho relativo |
| `sintaxe inválida` | Erro de JavaScript | Corrigir e rodar `node --check <arquivo>` |
| `ID duplicado` | `id` repetido no HTML | Renomear e atualizar seletores |
| `caractere U+FFFD` | Encoding quebrado | Salvar em UTF-8 sem BOM corrompido |
| `.nojekyll ausente` | Arquivo removido | Restaurar `.nojekyll` |

**Mitigação:** corrigir no branch, commitar e aguardar novo run. Não mergear
com check vermelho.

### P-03 — Deploy do Pages falha

**Sintomas:** `pages.yml` vermelho no job `build` ou `deploy`.

**Diagnóstico:**

```bash
gh run view <RUN_ID> --log
gh api repos/cyber-math/loja-do-bairro-dashboard/pages
```

- Falha no `build`: mesma investigação de P-02.
- Falha no `deploy`: verificar ambiente `github-pages`, permissões
  (`pages: write`, `id-token: write`), configuração de Source e status do
  GitHub. Falha recorrente da plataforma deve ser tratada com o GitHub Support.

**Mitigação:** reexecutar o job; se persistir, republicar o último run saudável
(seção 7.2). Registrar o incidente.

### P-04 — Gráficos não aparecem

**Sintomas:** cards e tabelas funcionam; áreas de gráfico mostram aviso ou
ficam vazias.

**Diagnóstico:** abrir DevTools → Network e verificar jsDelivr, unpkg e cdnjs.
Testar acesso a `https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js`.
Verificar bloqueio por extensão, proxy ou rede corporativa.

**Mitigação:** o fallback já tenta três CDNs. Se todos falharem, o restante do
painel continua. Registrar a limitação; a correção estrutural é vendorizar o
Chart.js no repositório. Não prometer gráficos sem rede.

**Validar:** canvas renderizado após recarregar; tabelas e CSV intactos.

### P-05 — Versão publicada diferente da esperada

**Sintomas:** rodapé ou Configurações mostra versão/commit antigos.

**Diagnóstico:**

```bash
curl -sS https://cyber-math.github.io/loja-do-bairro-dashboard/version.json
git log -1 --oneline
gh run list --workflow=pages.yml --limit 5
```

**Mitigação:** confirmar se o merge chegou em `main`; aguardar o run; se o
workflow não disparou, executar deploy manual. CDN do GitHub Pages pode levar
alguns minutos para propagar; testar com recarga sem cache.

### P-06 — Link quebrado na documentação

**Sintomas:** link relativo em `docs/` ou README retorna 404 no GitHub.

**Diagnóstico:** conferir o caminho a partir do arquivo de origem. Exemplo:
em `docs/MANUTENCAO.md`, `../README.md` aponta para a raiz; `README.md` aponta
para `docs/README.md` e está errado.

**Mitigação:** corrigir o link no PR. Lembrar que `docs/` não é publicado no
Pages; links de documentação funcionam apenas no GitHub.

### P-07 — Commit suspeito ou credencial exposta

**Sintomas:** alteração não reconhecida, segredo em diff, release inesperada.

**Ações imediatas:**

1. Não force push e não apague evidências.
2. Se houver segredo, revogar a credencial antes de qualquer limpeza.
3. Restringir a origem: desabilitar o workflow afetado ou o Pages se o conteúdo
   publicado for malicioso.
4. Reverter o conteúdo com `git revert`.
5. Abrir relatório privado de vulnerabilidade (Security → Advisories) e
   registrar horário, escopo e ações.
6. Se dados de terceiros forem afetados, acionar o processo de
   [COMPLIANCE.md](COMPLIANCE.md).

**Atenção:** remover um segredo do commit atual não o remove do histórico. A
credencial deve ser revogada e rotacionada.

### P-08 — Rotação de credenciais

| Credencial | Onde é usada | Procedimento |
| --- | --- | --- |
| Senha da conta GitHub | Acesso humano | Alterar em GitHub → Settings → Password; ativar 2FA |
| Token de PAT | Automação local | Revogar em Settings → Developer settings → Tokens; criar novo com escopo mínimo |
| Sessão do `gh` | CLI local | `gh auth logout` e `gh auth login` |
| `GITHUB_TOKEN` | Workflows | Efêmero; rotacionado pelo GitHub a cada job; não há secret manual |
| E-mail de segurança | `security.txt` | Trocar o endereço no arquivo e em `SECURITY.md`; testar recebimento |

Após rotacionar, verificar workflows e acessos, e registrar a data.

### P-09 — Porta local ocupada

**Sintoma:** `EADDRINUSE` ao rodar `npm start`.

**Mitigação:**

```bash
PORT=3001 npm start
```

```powershell
$env:PORT=3001
npm start
```

Se a porta estiver ocupada por processo desconhecido:

```powershell
Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess
Get-Process -Id <PID>
```

### P-10 — Dados diferentes do esperado

**Sintomas:** contagens ou séries mudaram sem alteração de código.

**Diagnóstico:** a janela de 540 dias é relativa a `new Date()`. Em outro dia,
as datas se deslocam e valores agregados do período mudam. Confirmar a seed:

```bash
grep -n "SEED" assets/js/data.js
```

```powershell
Select-String -Path assets/js/data.js -Pattern "SEED"
```

**Mitigação:** se a seed foi alterada sem intenção, restaurar
`20260421`. Se a mudança foi intencional, atualizar testes e documentação.

### P-11 — `security.txt` expirado ou inválido

**Sintomas:** `Expires` no passado; contato inacessível; `Policy` ou
`Acknowledgments` apontam para página 404 no site.

**Mitigação:**

1. Atualizar `Expires` para até 12 meses no futuro.
2. Confirmar `Contact` e `Canonical`.
3. O `security.txt` é publicado, mas `docs/` não é copiado para o artefato.
   Incluir `docs/` no build ou apontar `Policy` e `Acknowledgments` para uma
   página existente.
4. Validar o formato e registrar a revisão.

## 10. Backup e restauração

### 10.1 O que existe para backup

| Ativo | Forma de backup | Retenção |
| --- | --- | --- |
| Código e histórico | Clone espelho e GitHub | Enquanto o repositório existir |
| Site publicado | Zip anexado a cada release | Enquanto a release existir |
| Documentação | Mesmo repositório | Mesma do código |
| Dados | Nenhum dado persistente; mock gerado no navegador | Não aplicável |
| Configuração do Pages | Documentada neste runbook e no README | Não aplicável |

### 10.2 Criar backup local

```bash
git clone --mirror https://github.com/cyber-math/loja-do-bairro-dashboard.git backup.git
git bundle create loja-do-bairro-$(date +%Y%m%d).bundle --all
```

PowerShell:

```powershell
git clone --mirror https://github.com/cyber-math/loja-do-bairro-dashboard.git backup.git
git bundle create "loja-do-bairro-$(Get-Date -Format yyyyMMdd).bundle" --all
```

Baixar o zip da última release:

```bash
gh release download --pattern "*.zip" --dir backup-release
```

### 10.3 Restaurar

```bash
git clone https://github.com/cyber-math/loja-do-bairro-dashboard.git restaurado
cd restaurado
git checkout v1.0.0
npm run check
npm run build
npm start
```

Se o repositório não existir mais, criar um novo a partir do espelho:

```bash
git clone --mirror backup.git restaurado.git
cd restaurado.git
git remote set-url origin https://github.com/<novo-owner>/<novo-repo>.git
git push --mirror origin
```

Depois, configurar **Settings → Pages → Source: GitHub Actions** e conferir as
permissões dos workflows.

### 10.4 Teste de restauração

Semestralmente:

- [ ] Clonar o espelho em diretório temporário.
- [ ] Fazer checkout da última tag.
- [ ] Rodar `npm run check` e `npm run build`.
- [ ] Abrir `dist/index.html` via `npm start`.
- [ ] Comparar `version.json` com a release.
- [ ] Registrar data, responsável e resultado.

## 11. Manutenção programada

| Atividade | Frequência | Comando ou ação | Evidência |
| --- | --- | --- | --- |
| Revisar PRs do Dependabot | Semanal | `gh pr list --author app/dependabot` | Merge ou justificativa |
| Revisar runs falhos | Semanal | `gh run list --status failure --limit 20` | Issue ou correção |
| Revisar links da documentação | Mensal | Varredura manual | Correções |
| Testar backup | Semestral | Seção 10.4 | Registro |
| Revisar `security.txt` | Trimestral | Conferir `Expires` e contatos | Arquivo atualizado |
| Revisar controles de segurança | Trimestral | [SEGURANCA.md](SEGURANCA.md) | Registro |
| Revisar privacidade | Semestral | [COMPLIANCE.md](COMPLIANCE.md) | Registro |
| Atualizar Node/actions | Semestral | Dependabot e testes | CI verde |
| Revisar este runbook | Semestral | Leitura crítica e simulação | Nova versão |

## 12. Referência rápida de comandos

| Objetivo | Comando |
| --- | --- |
| Validar | `npm run check` |
| Buildar | `npm run build` |
| Pré-visualizar | `npm start` |
| Versão local | `node scripts/version.mjs` |
| Conferir tag | `node scripts/version.mjs --verify-tag v1.0.0` |
| Ver runs | `gh run list --limit 10` |
| Ver log | `gh run view <RUN_ID> --log` |
| Reexecutar | `gh run rerun <RUN_ID>` |
| Deploy manual | `gh workflow run pages.yml --ref main` |
| Status do Pages | `gh api repos/cyber-math/loja-do-bairro-dashboard/pages` |
| Listar releases | `gh release list` |
| Baixar release | `gh release download --pattern "*.zip"` |
| Reverter | `git revert <SHA>` e `git push origin main` |
| Backup espelho | `git clone --mirror <URL> backup.git` |

## 13. Modelos de comunicação

### 13.1 Abertura

```text
[SEV<n>] <título curto>

Status: investigando
Início: AAAA-MM-DD HH:MM (America/Sao_Paulo)
Impacto: <quem e o que é afetado>
Sintoma: <HTTP, mensagem, tela>
Ações em andamento: <contenção>
Próxima atualização: <horário>
Responsável: <nome ou @usuario>
```

### 13.2 Atualização

```text
[SEV<n>] <título> — atualização

Status: identificado | mitigado | monitorando
Causa provável: <descrição>
Ação executada: <revert, rerun, correção>
Evidência: <link do run, commit, versão>
Próxima atualização: <horário>
```

### 13.3 Encerramento

```text
[SEV<n>] <título> — encerrado

Status: resolvido
Duração: <início> a <fim>
Impacto total: <escopo>
Causa raiz: <descrição>
Correção: <commit ou release>
Prevenção: <ações com prazo>
Postmortem: <link ou data prevista>
```

## 14. Escalonamento

| Condição | Escalonar para | Prazo | Canal |
| --- | --- | --- | --- |
| SEV1 sem contenção em 1 h | Mantenedor primário e segurança | Imediato | Menção e e-mail |
| Suspeita de comprometimento | Responsável de segurança | Imediato | Issue privada e e-mail |
| Falha do GitHub Pages | GitHub Support | Após 30 min de indisponibilidade | support.github.com |
| Exposição de dados pessoais | Responsável de privacidade | Imediato | Processo de [COMPLIANCE.md](COMPLIANCE.md) |
| CDN indisponível por mais de 1 dia | Mantenedor | 1 dia útil | Issue |
| Necessidade de mudança de escopo | Mantenedor | 3 dias úteis | Issue |

## 15. Postmortem

Modelo:

```text
Título:
Data e duração:
Severidade:
Impacto:
Detecção:
Linha do tempo (horário, ação, responsável):
Causa raiz:
Fatores contribuintes:
O que funcionou:
O que falhou:
Ações corretivas (ID, dono, prazo, verificação):
Lições:
```

Regras:

- postmortem sem culpa, focado em sistema e processo;
- pelo menos uma ação preventiva verificável;
- ação com dono e prazo, registrada como issue;
- revisão em 30 dias para confirmar eficácia.

## 16. Limitações conhecidas da operação

- Não há monitoramento automático, alerta ou on-call. A detecção depende de
  usuários, mantenedor ou execução manual.
- Não há staging; todo merge em `main` publica.
- Não há dados persistentes para backup.
- Os links `Policy` e `Acknowledgments` do `security.txt` apontam para
  `docs/SEGURANCA.md`, que não é copiado para o Pages e retorna 404.
- O e-mail de segurança usa domínio reservado e precisa ser substituído.
- Sem autenticação, o painel administrativo não deve ser tratado como área
  restrita.
- Sem SRI, a integridade do Chart.js depende do CDN e do HTTPS.
