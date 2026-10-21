# Compliance e Privacidade

Mapa de conformidade do PoC **Loja do Bairro · Painel de Operações**. Relaciona
o que o projeto faz, o que não faz e o que precisaria fazer para operar com
dados reais.

| Campo | Valor |
| --- | --- |
| Versão de referência | 1.0.0 |
| Última revisão | 2026-10-21 |
| Responsável | Manutenção de Sistemas |
| Classificação | Público |
| Documentos relacionados | [SEGURANCA.md](SEGURANCA.md) · [RUNBOOK.md](RUNBOOK.md) · [MANUTENCAO.md](MANUTENCAO.md) |

> **Aviso.** Este documento é um mapa de lacunas e boas práticas, não uma
> certificação, parecer jurídico ou atestado de conformidade. O projeto não é
> certificado ISO/IEC 27001, não possui relatório SOC 2 e não processa cartões.
> As afirmações valem para a versão 1.0.0 e para o dataset fictício.

## 1. Escopo e método

Avaliação baseada em:

1. leitura do código, workflows e documentação do repositório;
2. inventário de dados e fluxos reais;
3. comparação com LGPD, ISO/IEC 27001:2022 (Anexo A), PCI DSS v4.0.1, SOC 2 e
   WCAG 2.1 AA;
4. classificação de risco 5x5.

Status usados:

| Status | Significado |
| --- | --- |
| Aplicável | A obrigação incide sobre o projeto |
| Não aplicável | O pressuposto não existe no escopo atual |
| Implementado | Controle existe e pode ser verificado |
| Parcial | Controle existe com lacuna relevante |
| Pendente | Reconhecido e não implementado |
| Simulado | Aparência de controle sem efeito real |
| Herdado | Controle fornecido pela plataforma, fora da operação direta |

## 2. Resumo de aplicabilidade

| Norma ou regime | Aplicabilidade | Situação | Observação |
| --- | --- | --- | --- |
| LGPD (Lei 13.709/2018) | Parcial | Sem dados pessoais reais | Aplica-se se houver coleta, contato ou log identificável |
| ISO/IEC 27001:2022 | Referência voluntária | Não certificado | Controles usados como estrutura de maturidade |
| PCI DSS v4.0.1 | Não aplicável | Sem cartões ou pagamentos | Reavaliar se houver checkout |
| SOC 2 | Não aplicável como relatório | Sem auditoria | Controles mapeados por transparência |
| WCAG 2.1 AA | Recomendado | Parcial | Acessibilidade não é certificada |
| Marco Civil da Internet | Parcial | Sem serviço de aplicação | Provedor é o GitHub |
| Código de Defesa do Consumidor | Não aplicável | Sem oferta ou venda | PoC interno |

## 3. LGPD

### 3.1 Papéis

| Papel | Situação atual | Observação |
| --- | --- | --- |
| Controlador | Não configurado | Não há tratamento de dados pessoais pelo projeto |
| Operador | Não configurado | GitHub atua como provedor de hospedagem |
| Encarregado (DPO) | Não designado | Necessário apenas se houver tratamento relevante |
| Titular | Nenhum cadastrado | Não há formulário ou conta |

Se o projeto passar a coletar dados, definir controlador, operador, encarregado,
base legal e canal do titular antes do go-live.

### 3.2 Princípios e situação

| Princípio (art. 6º) | Como se aplica | Situação |
| --- | --- | --- |
| Finalidade | Dados fictícios para demonstração | Implementado |
| Adequação | Nenhum dado além do necessário para a demo | Implementado |
| Necessidade | Sem cadastro, cookie de sessão ou analytics | Implementado |
| Livre acesso | Não há dados de titular | Não aplicável |
| Qualidade dos dados | Dataset determinístico e documentado | Implementado |
| Transparência | Limitações descritas no README e docs | Implementado |
| Segurança | HTTPS, escape de HTML, permissões mínimas | Parcial |
| Prevenção | Revisão de dependências e CSP pendente | Parcial |
| Não discriminação | Sem perfilamento | Não aplicável |
| Prestação de contas | Este mapa e o runbook | Parcial |

### 3.3 Inventário de dados

| Dado | Titular | Finalidade | Base legal | Retenção | Compartilhamento |
| --- | --- | --- | --- | --- | --- |
| Nome de produto, preço, estoque | Nenhum (fictício) | Demonstração | Não se aplica | Sessão | Nenhum |
| OS, técnico, prioridade | Nenhum (fictício) | Demonstração | Não se aplica | Sessão | Nenhum |
| IP e ator da auditoria | Nenhum (fictício) | Demonstração | Não se aplica | Sessão | Nenhum |
| Tema e densidade | Visitante | Preferência de UI | Legítimo interesse? Não há identificação | Até limpar o navegador | Nenhum |
| E-mail de segurança | Mantenedor | Canal de reporte | Legítimo interesse | Enquanto o projeto existir | GitHub, provedor de e-mail |
| Logs de acesso ao site | Visitante | Segurança e disponibilidade | Legítimo interesse do provedor | Política do GitHub | GitHub |

Não há dado sensível (art. 5º, II), dado de criança, decisão automatizada ou
transferência internacional realizada pelo projeto. O GitHub pode processar
metadados fora do Brasil conforme seus próprios termos.

### 3.4 Direitos do titular

Como não há cadastro, não existe consulta, correção ou exclusão a executar no
painel. Pedidos sobre logs devem ser direcionados ao GitHub. Se o escopo mudar,
o projeto precisa de:

- canal de atendimento e prazo de resposta;
- procedimento de confirmação de identidade;
- registro de requisições e decisões;
- mecanismo de exclusão e portabilidade;
- revisão de contratos com operadores.

### 3.5 Retenção e descarte

| Ativo | Retenção atual | Descarte | Necessidade futura |
| --- | --- | --- | --- |
| Código e histórico | Indefinida | Fecha o repositório ou remove | Política formal |
| Releases e zips | Enquanto a release existir | Excluir release | Definir prazo |
| `localStorage` | Até o usuário limpar | Ação do usuário | Aviso de cookies, se aplicável |
| Auditoria em memória | Até recarregar a página | Automático | Retenção imutável real |
| Logs do GitHub | Conforme GitHub | Conforme GitHub | Contrato e retenção |
| Issues e PRs | Indefinida | Fechar ou excluir | Política de dados |

### 3.6 Incidentes com dados pessoais

O projeto não trata dados pessoais reais. Se isso mudar, aplicar:

1. conter o incidente e preservar evidências;
2. avaliar risco ou dano relevante aos titulares;
3. comunicar a ANPD e os titulares quando exigido;
4. registrar decisão, escopo, medidas e prazo;
5. revisar controles e comunicar o GitHub, se a causa for da plataforma.

A LGPD (art. 48) exige comunicação em prazo razoável. A Resolução CD/ANPD nº
15/2024 estabelece, como regra, **3 dias úteis** contados do conhecimento do
incidente, admitida justificativa para extensão. O prazo interno sugerido é:

| Etapa | Prazo interno |
| --- | --- |
| Triagem e classificação | 24 horas |
| Decisão sobre comunicação | 2 dias úteis |
| Comunicação à ANPD, se aplicável | 3 dias úteis |
| Comunicação ao titular, se aplicável | Junto da ANPD ou antes |
| Postmortem | 5 dias úteis |

O prazo legal deve ser confirmado com assessoria jurídica a cada caso.

## 4. ISO/IEC 27001:2022

O projeto usa o Anexo A como referência de maturidade, sem certificação. A
tabela cobre controles relevantes, não os 93 controles.

### 4.1 Controles organizacionais (A.5)

| Controle | Tema | Situação | Evidência ou lacuna |
| --- | --- | --- | --- |
| A.5.1 | Políticas de segurança | Parcial | [SEGURANCA.md](SEGURANCA.md), sem aprovação formal |
| A.5.2 | Papéis e responsabilidades | Parcial | CODEOWNERS e runbook; sem segregação de funções |
| A.5.7 | Inteligência de ameaças | Pendente | Sem processo formal |
| A.5.19 | Segurança na cadeia de fornecedores | Parcial | Inventário de terceiros; sem due diligence |
| A.5.24 | Planejamento de incidentes | Implementado | [RUNBOOK.md](RUNBOOK.md) |
| A.5.26 | Resposta a incidentes | Parcial | Playbooks; sem plantão |
| A.5.28 | Coleta de evidências | Pendente | Sem retenção forense definida |
| A.5.34 | Privacidade e PII | Implementado | Sem PII real; mapa neste documento |

### 4.2 Controles de pessoas (A.6)

| Controle | Tema | Situação | Evidência ou lacuna |
| --- | --- | --- | --- |
| A.6.3 | Conscientização e treinamento | Pendente | Sem programa formal |
| A.6.5 | Responsabilidades após desligamento | Pendente | Sem processo documentado |
| A.6.6 | Acordos de confidencialidade | Não aplicável | Projeto público, sem equipe |

### 4.3 Controles físicos (A.7)

| Controle | Tema | Situação | Evidência ou lacuna |
| --- | --- | --- | --- |
| A.7.1 | Perímetro físico | Herdado | GitHub é responsável pelo data center |
| A.7.4 | Monitoramento físico | Herdado | Sem acesso físico do projeto |
| A.7.10 | Mídia de armazenamento | Pendente | Backups locais sem criptografia definida |

### 4.4 Controles tecnológicos (A.8)

| Controle | Tema | Situação | Evidência ou lacuna |
| --- | --- | --- | --- |
| A.8.2 | Direitos de acesso privilegiado | Parcial | Conta única; 2FA não verificável |
| A.8.3 | Restrição de acesso à informação | Parcial | Site público; admin sem controle real |
| A.8.7 | Proteção contra malware | Herdado | Runner e Pages gerenciados |
| A.8.8 | Gestão de vulnerabilidades | Parcial | Dependabot para actions; sem varredura de código |
| A.8.9 | Gestão de configuração | Parcial | Workflows versionados; Pages manual |
| A.8.12 | Prevenção de vazamento | Parcial | Sem dados; sem DLP |
| A.8.15 | Registro de eventos | Simulado | Auditoria em memória |
| A.8.16 | Monitoramento | Pendente | Sem alerta ou uptime check |
| A.8.24 | Uso de criptografia | Parcial | HTTPS; hash de auditoria não criptográfico |
| A.8.25 | Ciclo de desenvolvimento seguro | Parcial | PR e check; sem SAST |
| A.8.28 | Codificação segura | Parcial | `esc()` e revisão; sem teste automatizado |
| A.8.32 | Gestão de mudanças | Implementado | Fluxo de PR e release |
| A.8.34 | Proteção durante auditoria | Não aplicável | Sem auditoria externa |

## 5. PCI DSS v4.0.1

**Situação: fora de escopo.** O site não vende, não recebe pagamento, não
processa, armazena ou transmite dados de cartão. Não há checkout, formulário de
pagamento, tokenização ou integração com adquirente.

Se um checkout for adicionado:

| Requisito | Efeito |
| --- | --- |
| 3 | Não armazenar dados sensíveis de autenticação após autorização |
| 4 | Criptografar transmissão de dados do titular em redes abertas |
| 6 | Desenvolver software seguro e corrigir vulnerabilidades |
| 8 | Identificar usuários e autenticar acessos |
| 10 | Registrar e monitorar acessos a componentes do sistema |
| 11 | Testar segurança de sistemas e redes regularmente |
| 12 | Manter política e programa de segurança da informação |

A avaliação aplicável dependeria do modelo (SAQ A, A-EP ou superior) e da
participação de provedor de pagamento. Nada neste repositório deve ser
interpretado como conformidade PCI.

## 6. SOC 2

Não há relatório SOC 2, auditoria independente ou período de observação. A
tabela mapeia os critérios de confiança (TSC) de forma qualitativa.

| Critério | Situação | Justificativa |
| --- | --- | --- |
| Security | Parcial | Controles básicos de repositório, sem monitoramento ou controle de acesso real |
| Availability | Parcial | Depende do GitHub Pages; sem SLO formal ou alerta |
| Processing integrity | Implementado | Dados determinísticos, build versionado e verificação estática |
| Confidentiality | Não aplicável | Não há informação confidencial no escopo |
| Privacy | Implementado | Sem dados pessoais reais; mapa em [COMPLIANCE.md](COMPLIANCE.md) |

Para SOC 2 seriam necessários: escopo formal, políticas aprovadas, evidências
por período, controle de acesso, gestão de mudanças, monitoramento, resposta a
incidentes, avaliação de fornecedores e auditoria independente.

## 7. Auditoria simulada

### 7.1 O que existe

| Elemento | Implementação | Efeito |
| --- | --- | --- |
| Trilha de eventos | Lista `AUDITORIA` em memória, gerada a partir de eventos estáticos | Visualização na aba Auditoria |
| Encadeamento | Cada evento recebe `hash8(prev + ator + ação + entidade + timestamp)` | Encadeamento lógico |
| Hash | FNV-1a de 32 bits, 8 caracteres hexadecimais | Não criptográfico |
| Exportação | CSV com timestamp, ator, papel, ação, entidade, IP, resultado e hash | Evidência exportável |
| Interface | Rótulos "SHA-256", "S3 Object Lock (WORM)", "janela imutável de 12 meses" | **Não correspondem à implementação** |
| Verificações | Números fixos de "verificações 24h" e "falhas de integridade" | Simulação |

### 7.2 Limitações

- FNV-1a 32 bits tem espaço de 2^32 e não resiste a colisão intencional.
- O encadeamento é calculado no navegador e pode ser recalculado por qualquer
  pessoa; não há assinatura, âncora externa ou prova de tempo.
- Não há armazenamento imutável, WORM, S3 ou retenção de 12 meses.
- Recarregar a página regenera a trilha a partir dos dados fixos.
- Não há controle de acesso à auditoria.
- A exportação CSV não é assinada e não tem valor probatório por si só.

### 7.3 O que seria necessário para auditoria real

1. Backend com autenticação e autorização.
2. Registro append-only com SHA-256 ou assinatura digital.
3. Armazenamento WORM com retenção configurada.
4. Sincronização de tempo confiável.
5. Acesso somente leitura à trilha, com log de consulta.
6. Monitoramento de falha de integridade e alerta.
7. Procedimento de exportação e cadeia de custódia.
8. Revisão periódica e retenção conforme política.

Até lá, a interface deve ser lida como **demonstração visual**, não como
evidência de conformidade.

## 8. Terceiros

| Fornecedor | Serviço | Dados envolvidos | Contrato / DPA | Risco |
| --- | --- | --- | --- | --- |
| GitHub | Repositório, Actions, Pages | Código, metadados de acesso, IPs | Termos do GitHub; DPA disponível mediante plano aplicável | Médio |
| jsDelivr | CDN do Chart.js | IP, user agent, referer | Termos do provedor | Médio |
| unpkg | CDN de fallback | IP, user agent, referer | Termos do provedor | Médio |
| cdnjs | CDN de fallback | IP, user agent, referer | Termos do provedor | Médio |
| Google Fonts | Fontes | IP, user agent, referer | Termos do Google | Baixo |

O projeto não possui contrato assinado com os CDNs nem avaliação formal de
segurança. A dependência é aceitável para um PoC público sem dados pessoais;
não seria aceitável para dados sensíveis sem revisão.

## 9. Matriz de risco

Escala: probabilidade (1 raro a 5 quase certo) × impacto (1 insignificante a 5
crítico). Nível = P × I.

```text
IMPACTO ->      1       2       3       4       5
PROBABILIDADE
     5          5      10      15      20      25
     4          4       8      12      16      20
     3          3       6       9      12      15
     2          2       4       6       8      10
     1          1       2       3       4       5

Legenda: 1-4 baixo | 5-9 médio | 10-14 alto | 15-25 crítico
```

| ID | Risco | P | I | Nível | Tratamento | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Conta do mantenedor comprometida publica conteúdo malicioso | 3 | 5 | 15 crítico | 2FA, branch protection, revisão de PR | Pendente |
| R-02 | Painel admin simulado ser confundido com controle real | 4 | 4 | 16 crítico | Avisos na UI e nos docs; não usar com dados reais | Parcial |
| R-03 | Chart.js comprometido no CDN | 2 | 5 | 10 alto | SRI ou vendorização | Pendente |
| R-04 | Auditoria simulada usada como evidência formal | 3 | 4 | 12 alto | Corrigir rótulos e documentar limites | Parcial |
| R-05 | Links `Policy` e `Acknowledgments` do `security.txt` retornam 404 | 4 | 3 | 12 alto | Incluir `docs/` no build ou apontar para página existente | Pendente |
| R-06 | E-mail de segurança inexistente | 4 | 3 | 12 alto | Substituir domínio `.example` | Pendente |
| R-07 | XSS por dado externo no futuro | 2 | 4 | 8 médio | `esc()`, CSP, testes | Parcial |
| R-08 | CSV injection ao abrir exportação | 2 | 3 | 6 médio | Neutralizar fórmulas | Pendente |
| R-09 | Indisponibilidade do GitHub Pages | 2 | 4 | 8 médio | Runbook e comunicação | Aceito |
| R-10 | Dependência de CDN sem fallback suficiente | 2 | 3 | 6 médio | Três CDNs e mensagem clara | Mitigado |
| R-11 | Vazamento de dado pessoal em issue ou log | 2 | 4 | 8 médio | Orientação e revisão | Parcial |
| R-12 | Mudança de escopo sem revisão de privacidade | 2 | 5 | 10 alto | Checklist de go-live | Pendente |

### 9.1 Top 5 riscos

| Ordem | Risco | Nível | Ação Prioritária | Prazo |
| --- | --- | --- | --- | --- |
| 1 | R-02 — confusão entre demo e controle real | 16 | Reforçar avisos e remover promessas de WORM/SHA-256 | Imediato |
| 2 | R-01 — comprometimento da conta | 15 | 2FA e branch protection | 7 dias |
| 3 | R-04 — auditoria usada como evidência | 12 | Corrigir rótulos e limitações | 30 dias |
| 4 | R-05 — política do `security.txt` não publicada | 12 | Ajustar build ou links | 30 dias |
| 5 | R-06 — canal de reporte inválido | 12 | Trocar e-mail e testar | 30 dias |

## 10. Notificação de incidentes

| Marco | Prazo | Responsável | Registro |
| --- | --- | --- | --- |
| Detecção e abertura | Imediato | Quem detectou | Issue ou registro de incidente |
| Classificação | 1 hora (SEV1/SEV2) | Mantenedor | Severidade e impacto |
| Contenção | 4 horas (SEV1) | Mantenedor | Ação e evidência |
| Avaliação de dados pessoais | 24 horas | Responsável de privacidade | Dados afetados e titulares |
| Decisão de comunicação à ANPD | 2 dias úteis | Controlador | Fundamentação |
| Comunicação à ANPD | 3 dias úteis, se aplicável | Controlador | Protocolo |
| Comunicação ao titular | Quando aplicável | Controlador | Canal e conteúdo |
| Postmortem | 5 dias úteis | Mantenedor | Ações e prazos |

Contatos e procedimentos operacionais estão no [RUNBOOK.md](RUNBOOK.md). A
comunicação não deve prometer causa ou prazo antes da confirmação.

## 11. Evidências

| Evidência | Onde está | Retenção | Uso |
| --- | --- | --- | --- |
| Histórico de commits e PRs | GitHub | Indefinida | Mudança e revisão |
| Runs de CI, Pages e release | GitHub Actions | Conforme GitHub | Verificação e deploy |
| Releases e zips | GitHub Releases | Enquanto existirem | Versão publicada |
| `version.json` | Site | Enquanto a versão estiver no ar | Rastreabilidade |
| Checklist de release | Issue ou PR | Indefinida | Controle de mudança |
| Registro de incidente | Registro restrito | Definir | Resposta e auditoria |
| Backup espelho | Local | Definir | Continuidade |
| Auditoria da UI | Memória | Sessão | Demonstração apenas |

## 12. Checklist de go-live com dados reais

Não usar este checklist como autorização automática. Cada item exige evidência.

- [ ] Base legal e finalidade documentadas para cada dado.
- [ ] Controlador, operador e encarregado designados.
- [ ] Inventário de dados e retenção aprovados.
- [ ] Política de privacidade publicada e acessível.
- [ ] Canal do titular e prazo de resposta definidos.
- [ ] Autenticação e autorização reais, com RBAC no servidor.
- [ ] Auditoria imutável com hash criptográfico e retenção.
- [ ] Contratos e avaliações de fornecedores.
- [ ] Plano de resposta a incidentes com prazos legais.
- [ ] Backup testado e restore documentado.
- [ ] Monitoramento, alerta e plantão definidos.
- [ ] Testes de segurança e acessibilidade concluídos.
- [ ] Aprovação jurídica e de segurança registradas.

## 13. Lacunas e roadmap

| Prioridade | Lacuna | Ação | Prazo sugerido |
| --- | --- | --- | --- |
| P1 | Rótulos falsos de SHA-256/WORM | Corrigir interface e docs | Imediato |
| P1 | Sem 2FA/branch protection | Configurar no GitHub | 7 dias |
| P1 | Política do `security.txt` não publicada | Incluir `docs/` no build ou ajustar links | 30 dias |
| P1 | E-mail `.example` | Substituir e testar | 30 dias |
| P2 | Sem retenção formal | Definir política | 60 dias |
| P2 | Sem avaliação de fornecedores | Documentar CDNs e GitHub | 60 dias |
| P2 | Auditoria sem valor probatório | Planejar backend e WORM | 90 dias |
| P3 | Sem DPO ou política de privacidade | Só se houver dados reais | Antes do go-live |
| P3 | Sem SOC 2/ISO | Decidir se há necessidade comercial | Conforme demanda |

## 14. Referências

- [Lei nº 13.709/2018 — LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Resolução CD/ANPD nº 15/2024](https://www.gov.br/anpd/pt-br)
- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/standards/pci-dss/)
- [AICPA — Trust Services Criteria](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/)
- [SEGURANCA.md](SEGURANCA.md) — controles técnicos e reporte.
- [RUNBOOK.md](RUNBOOK.md) — resposta operacional.
