# Manutenção de Sistemas

Plano de manutenção do PoC **Loja do Bairro · Painel de Operações**. Define
tipos de manutenção, responsabilidades, cadência, fluxo de mudança,
versionamento, métricas e critérios de aceite.

| Campo | Valor |
| --- | --- |
| Versão de referência | 1.0.0 |
| Última revisão | 2026-10-21 |
| Responsável | Manutenção de Sistemas |
| Abrangência | Repositório, site publicado e documentação |
| Documentos relacionados | [ARQUITETURA.md](ARQUITETURA.md) · [RUNBOOK.md](RUNBOOK.md) · [TESTES.md](TESTES.md) · [SEGURANCA.md](SEGURANCA.md) · [COMPLIANCE.md](COMPLIANCE.md) |

## 1. Princípios

1. **Mudança pequena e reversível.** Toda alteração entra por pull request e
   pode ser desfeita com `git revert`.
2. **Verificação antes de publicação.** `npm run check` e `npm run build` são
   obrigatórios; a CI repete os mesmos passos.
3. **Fonte única de versão.** `package.json` define a versão; tags `vX.Y.Z`
   precisam conferir com ele.
4. **Documentação junto do código.** Mudança de comportamento atualiza
   `README.md`, `CHANGELOG.md` e o documento afetado em `docs/`.
5. **Honestidade sobre o escopo.** O painel administrativo, a auditoria e os
   indicadores de infraestrutura são simulações. Nenhuma manutenção deve
   apresentá-los como produção.

## 2. Tipos de manutenção

| Tipo | Definição | Exemplos neste projeto | Gatilho típico |
| --- | --- | --- | --- |
| Corretiva | Corrige defeito observado | Referência local quebrada, erro de sintaxe, `resumoPrev` vazio, hash rotulado como SHA-256 | Bug report ou falha na CI |
| Preventiva | Reduz probabilidade de falha | Atualizar actions, revisar links, renovar `security.txt`, testar fallback de CDN | Calendário ou varredura |
| Perfectiva | Melhora qualidade sem corrigir defeito | Acessibilidade dos canvas, clareza de mensagens, desempenho de render | Backlog de melhoria |
| Adaptativa | Acompanha mudança externa | Nova versão do Chart.js, mudança de regra do GitHub Pages, fim de suporte a navegador | Aviso de fornecedor |
| Emergencial | Restaura serviço fora do fluxo normal | Site fora do ar, deploy quebrado, commit suspeito | Incidente SEV1/SEV2 |

Manutenção emergencial segue o [RUNBOOK.md](RUNBOOK.md). As demais seguem o
fluxo da seção 4.

## 3. Matriz de manutenção

Legenda de status: **Implementado** (existe e é executado), **Parcial** (existe
com limitação), **Pendente** (reconhecido e não executado).

| ID | Item | Tipo | Gatilho / frequência | Ação de manutenção | Responsável | Evidência | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M-01 | Código JavaScript (`assets/js/`) | Corretiva | A cada PR | `npm run check` valida sintaxe com `node --check`; smoke manual das 6 views | Mantenedor | Log da CI e checklist de PR | Implementado |
| M-02 | Referências locais do `index.html` | Preventiva | A cada PR | Verificação automática de `src`/`href` locais e bloqueio de caminho absoluto | Mantenedor | Seção 1 do `check.mjs` | Implementado |
| M-03 | IDs e encoding | Preventiva | A cada PR | Detecta IDs duplicados e caractere U+FFFD em arquivos de texto | Mantenedor | Seções 3 e 4 do `check.mjs` | Implementado |
| M-04 | Chart.js via CDN | Adaptativa | Trimestral e a cada release | Revisar versão 4.4.7, testar os três CDNs, considerar SRI ou vendorização | Mantenedor | Teste T-25 em [TESTES.md](TESTES.md) | Parcial (sem SRI) |
| M-05 | GitHub Actions | Preventiva | Semanal (Dependabot) | Revisar PRs de `checkout`, `setup-node`, `upload-artifact`, `configure-pages`, `upload-pages-artifact`, `deploy-pages` | Mantenedor | PR do Dependabot e execução da CI | Implementado |
| M-06 | Workflows de CI, Pages e release | Corretiva | Falha de pipeline | Ler log, reproduzir localmente, corrigir, reexecutar | Mantenedor | `gh run list` e `gh run view` | Implementado |
| M-07 | Versão e tag | Preventiva | A cada release | `npm run release:*`, conferir tag contra `package.json`, publicar com `git push --follow-tags` | Mantenedor | `release.yml` e release no GitHub | Implementado |
| M-08 | Documentação | Perfectiva | A cada mudança de comportamento | Atualizar README, CHANGELOG e docs; validar links relativos antes do merge | Autor da mudança | Diff do PR | Implementado |
| M-09 | Links e âncoras da documentação | Preventiva | Mensal | Varredura manual ou script local dos links relativos; corrigir âncoras | Mantenedor | Relatório de links | Pendente (manual) |
| M-10 | `docs/` no artefato publicado | Adaptativa | A cada release | Decidir entre incluir `docs/` no build ou remover promessa de política publicada | Mantenedor | `scripts/build.mjs` | Pendente |
| M-11 | `security.txt` | Preventiva | Trimestral | Conferir contato, `Canonical`, `Policy`, `Expires` (2027-10-21) e se os links publicados respondem | Responsável de segurança | `.well-known/security.txt` | Parcial (Policy 404) |
| M-12 | Dados mockados e semente | Preventiva | A cada release | Confirmar seed `20260421`, contagens e ausência de dados pessoais | Mantenedor | `data.js` e teste T-03 | Implementado |
| M-13 | Dependências de fontes | Adaptativa | Semestral | Verificar disponibilidade do Google Fonts e fallback tipográfico | Mantenedor | Teste visual | Parcial (sem auto-hospedagem) |
| M-14 | Acessibilidade | Perfectiva | A cada mudança de UI | Revisar foco, rótulos, contraste e navegação por teclado | Mantenedor | Checklist de acessibilidade | Parcial |
| M-15 | Desempenho | Perfectiva | Trimestral | Medir tamanho do artefato e tempo de carga; evitar novas dependências | Mantenedor | `dist/` e DevTools | Pendente (sem baseline) |
| M-16 | Compatibilidade de navegador | Adaptativa | Semestral | Testar Chrome, Firefox, Edge e Safari nas versões suportadas | Mantenedor | Matriz de compatibilidade | Pendente |
| M-17 | Testes de comportamento | Perfectiva | Contínua | Criar smoke tests automatizados (Playwright) para as 6 views | Mantenedor | Backlog | Pendente |
| M-18 | Segurança de aplicação | Preventiva | Trimestral | Revisar `esc()`, CSP, SRI, dependências e exposição de dados | Responsável de segurança | [SEGURANCA.md](SEGURANCA.md) | Parcial |
| M-19 | Privacidade e LGPD | Preventiva | Semestral | Revisar inventário de dados, retenção e terceiros | Responsável de privacidade | [COMPLIANCE.md](COMPLIANCE.md) | Implementado (sem dados reais) |
| M-20 | Auditoria simulada | Corretiva | Ao tocar `admin.js` | Corrigir rótulo do hash ou implementar SHA-256 real; não prometer WORM | Mantenedor | Teste T-22 | Pendente |
| M-21 | Backup do repositório | Preventiva | Mensal | Clonar espelho e validar release anterior | Mantenedor | `git clone --mirror` | Implementado (manual) |
| M-22 | Rollback | Emergencial | Incidente de deploy | Reverter commit ou reexecutar deploy anterior | Mantenedor | [RUNBOOK.md](RUNBOOK.md) | Implementado |
| M-23 | Incidentes de segurança | Emergencial | Detecção | Conter, revogar credenciais, preservar evidências, comunicar | Responsável de segurança | Registro de incidente | Pendente (sem plantão 24x7) |
| M-24 | Revisão pós-incidente | Preventiva | Até 5 dias úteis após SEV1/SEV2 | Escrever postmortem sem culpa e abrir ações com prazo | Mantenedor | Documento de postmortem | Pendente |

## 4. Fluxo de mudança

```text
  Ideia ou incidente
        |
        v
  Issue (bug_report / feature_request)
        |
        v
  Branch curta: fix/... ou feat/...
        |
        v
  Alteração + documentação + CHANGELOG
        |
        v
  npm run check  --> falhou? corrige e repete
        |
        v
  npm run build  --> inspeciona dist/ e version.json
        |
        v
  Pull request --> CI (check + build) --> review do CODEOWNERS
        |
        v
  Merge em main --> pages.yml --> verificação pós-deploy
        |
        v
  Tag vX.Y.Z (quando aplicável) --> release.yml --> release + zip
```

Regras do fluxo:

- Uma mudança por PR; refatoração ampla não se mistura com correção.
- O PR descreve risco, rollback e evidência de teste.
- O merge em `main` publica imediatamente. Não existe ambiente de staging.
- A verificação pós-deploy é manual e está no [RUNBOOK.md](RUNBOOK.md).
- Hotfix segue o mesmo caminho, com revisão acelerada e postmortem depois.

## 5. Versionamento e canais

O projeto segue [SemVer](https://semver.org/lang/pt-BR/) e
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

| Mudança | Incremento | Exemplo |
| --- | --- | --- |
| Correção compatível | Patch | 1.0.0 → 1.0.1 |
| Nova funcionalidade compatível | Minor | 1.0.0 → 1.1.0 |
| Quebra de comportamento ou formato | Major | 1.0.0 → 2.0.0 |

Comandos reais:

```bash
npm run release:patch
npm run release:minor
npm run release:major
git push --follow-tags
```

`npm version` exige árvore limpa, altera `package.json`, cria commit e tag. O
workflow `release.yml` confere a tag com
`node scripts/version.mjs --verify-tag vX.Y.Z`, roda check e build, empacota
`dist/` e cria a release.

Canais exibidos no painel:

| Canal | Origem | Implicação |
| --- | --- | --- |
| `Release · tag` | Build de uma tag `vX.Y.Z` | Artefato de referência |
| `Branch · main` | Topo de `main` | Pode conter mudanças ainda sem tag |
| `Local · sem CI` | `npm run build` local | Sufixo `-dirty` se houver alteração não commitada |

Não há versionamento separado de dados ou de documentação. A versão do
`package.json` cobre o conjunto.

## 6. Política de depreciação

Aplica-se a funcionalidades de interface, formatos de exportação e parâmetros
documentados. Como não há API pública, não existe contrato externo formal.

1. **Anunciar** em `CHANGELOG.md` na seção `Deprecated`, com alternativa e
   prazo.
2. **Manter** o comportamento por pelo menos uma versão minor ou 90 dias, o
   que for maior.
3. **Registrar** no PR e na documentação afetada.
4. **Remover** apenas em versão major, salvo falha de segurança ou custo
   operacional proibitivo.
5. **Comunicar** na release e, se houver impacto, em issue fixada.

| Estado | Significado | Ainda funciona |
| --- | --- | --- |
| Ativo | Suportado e documentado | Sim |
| Descontinuado | Anunciado, com substituto | Sim, até a remoção |
| Removido | Fora da versão atual | Não |

## 7. Janelas e cadência

| Atividade | Cadência | Janela sugerida | Duração |
| --- | --- | --- | --- |
| Revisão de PRs | Contínua | Horário comercial | Até 2 dias úteis |
| Deploy de mudanças | A cada merge | Horário comercial | Minutos |
| Release | Mensal ou sob demanda | Início da semana | 30 min |
| Atualização de actions | Semanal | Automática via Dependabot | 15 min |
| Revisão de segurança | Trimestral | Fora de pico | 2 h |
| Revisão de privacidade | Semestral | Fora de pico | 2 h |
| Teste de restauração | Semestral | Fora de pico | 1 h |
| Revisão deste plano | Semestral | Junto da revisão de privacidade | 1 h |

O projeto não tem SLA contratual nem operação 24x7. As metas abaixo são
compromissos de melhores esforços do mantenedor.

## 8. Métricas de manutenção

| Métrica | Definição | Meta | Como medir | Baseline atual |
| --- | --- | --- | --- | --- |
| Lead time | Issue aberta até merge | ≤ 10 dias úteis | Datas da issue e do PR | Não instrumentado |
| Frequência de deploy | Merges em `main` por mês | ≥ 2 | Histórico do GitHub | Não instrumentado |
| Change failure rate | Deploys que exigem rollback ou hotfix | ≤ 10% | Runs de Pages e incidentes | Não instrumentado |
| MTTR | Detecção até restauração | SEV1 ≤ 4 h; SEV2 ≤ 1 dia útil | Registro de incidente | Não instrumentado |
| Duração da CI | `check` + `build` no runner | ≤ 5 min | GitHub Actions | Coletável por run |
| Cobertura estática | Verificações do `check.mjs` | 100% sem erro | Log da CI | 17 verificações ok |
| Dívida crítica aberta | Itens de severidade alta | 0 | Backlog | 3 itens altos |
| Links quebrados em docs | Links relativos inválidos | 0 | Varredura manual | 0 em 75 links (2026-10-21) |

Não há telemetria de produção. Métricas de uso, erro de runtime e Web Vitals
não são coletadas; qualquer número nesse sentido seria estimativa.

## 9. Dívida técnica priorizada

| ID | Dívida | Impacto | Severidade | Esforço | Ação |
| --- | --- | --- | --- | --- | --- |
| D-01 | `resumoPrev` sempre vazio em `app.js` | Comparação de OS com período anterior incorreta | Alta | Baixo | Corrigir filtro e adicionar caso de teste |
| D-02 | Hash de auditoria FNV-1a 32 bits rotulado como SHA-256 | Expectativa falsa de integridade | Alta | Médio | Trocar rótulo ou usar `crypto.subtle` com encadeamento |
| D-03 | `docs/` fora do build | Política de segurança referenciada retorna 404 no site | Alta | Baixo | Incluir `docs/` no `build.mjs` ou ajustar os links |
| D-04 | Sem CSP nem SRI | Superfície de XSS e supply chain | Média | Médio | Meta CSP compatível e SRI do Chart.js |
| D-05 | Sem testes de comportamento | Regressões visuais e de fluxo | Média | Alto | Playwright com smoke das 6 views |
| D-06 | Sem autenticação no admin | Falsa sensação de controle | Média | Alto | Rotular como demo ou integrar IdP |
| D-07 | Sem `@media print` | Impressão não suportada | Baixa | Baixo | Folha de impressão ou remover expectativa |
| D-08 | Sem baseline de desempenho | Regressão silenciosa | Baixa | Médio | Medir tamanho e LCP a cada release |
| D-09 | Cobertura de acessibilidade parcial | Barreiras de uso | Média | Médio | Auditoria e correções por view |
| D-10 | Exportação CSV sem neutralização de fórmulas | Risco baixo com dados mock | Baixa | Baixo | Prefixar `= + - @` quando houver dado externo |

## 10. Checklist de release

Copiar para a issue ou PR de release.

- [ ] Árvore limpa e `main` atualizada.
- [ ] `npm run check` sem erro e sem aviso novo.
- [ ] `npm run build` concluído; `dist/version.json` confere.
- [ ] Smoke manual das 6 views e do painel administrativo.
- [ ] CHANGELOG atualizado com data e versão.
- [ ] Documentação afetada revisada e links relativos válidos.
- [ ] `security.txt` dentro da validade e contato revisado (substituir o domínio `.example` antes de uso real).
- [ ] `npm run release:patch|minor|major` executado.
- [ ] `git push --follow-tags` concluído.
- [ ] Workflow `Release` verde e zip anexado.
- [ ] Deploy do Pages verde e versão visível no rodapé/Configurações.
- [ ] Verificação pós-deploy registrada no PR ou issue.

## 11. Registro de manutenção

Modelo para anexar à issue ou ao PR:

```text
ID: MAN-AAAA-MM-DD-NN
Tipo: corretiva | preventiva | perfectiva | adaptativa | emergencial
Item da matriz: M-XX
Motivo:
Mudança realizada:
Arquivos afetados:
Verificação executada:
  npm run check:
  npm run build:
  smoke manual:
Risco e rollback:
Evidência (links, prints, logs):
Horário de início e fim:
Responsável:
Ações futuras:
```

## 12. Critérios de aceite da manutenção

Uma manutenção é considerada concluída quando:

1. O comportamento esperado está descrito e foi verificado.
2. `npm run check` passa sem novos avisos.
3. O build foi gerado e inspecionado.
4. A documentação e o CHANGELOG refletem a mudança.
5. O deploy foi verificado ou a mudança foi explicitamente limitada ao
   repositório.
6. Riscos residuais e rollback estão registrados.

## 13. Referências

- [README.md](../README.md) — comandos, pipelines e limitações.
- [ARQUITETURA.md](ARQUITETURA.md) — decisões e limites técnicos.
- [RUNBOOK.md](RUNBOOK.md) — operação, incidentes e rollback.
- [TESTES.md](TESTES.md) — casos, checklist e definição de pronto.
- [SEGURANCA.md](SEGURANCA.md) — controles e reporte de vulnerabilidades.
- [COMPLIANCE.md](COMPLIANCE.md) — LGPD, ISO, PCI DSS, SOC 2 e riscos.
