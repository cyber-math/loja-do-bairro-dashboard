# Documentação técnica

Índice dos documentos de engenharia do PoC **Loja do Bairro · Painel de Operações**.

| Documento | Para quem | Conteúdo |
| --- | --- | --- |
| [ARQUITETURA.md](ARQUITETURA.md) | desenvolvimento | Camadas, módulos, fluxo de dados, decisões (ADRs) e limites. |
| [MANUTENCAO.md](MANUTENCAO.md) | desenvolvimento · gestão | Tipos de manutenção, matriz de mudanças, processo, versionamento e métricas. |
| [RUNBOOK.md](RUNBOOK.md) | operações · SRE | Deploy, rollback, incidentes, severidade, backup e escalonamento. |
| [SEGURANCA.md](SEGURANCA.md) | segurança | Modelo de ameaças, XSS, CSP, OWASP Top 10 e divulgação responsável. |
| [COMPLIANCE.md](COMPLIANCE.md) | compliance · DPO | LGPD, retenção, ISO 27001, PCI-DSS, SOC 2 e resposta a incidentes. |
| [TESTES.md](TESTES.md) | QA | Estratégia, 20+ casos de teste, regressão e definição de pronto. |

## Contexto rápido

- Site estático publicado no GitHub Pages, sem backend.
- Dados mock determinísticos (mulberry32, semente `20260421`), gerados no navegador.
- O painel administrativo em **Configurações → Painel administrativo** é uma simulação visual de controles de operação: compliance, regras, backend, transmissão, ativos, infraestrutura e auditoria.
- Nenhum dado real de cliente é usado ou transmitido.

## Como navegar

1. Leia a arquitetura para entender onde cada comportamento vive.
2. Consulte a matriz de manutenção ao avaliar uma mudança.
3. Siga o runbook em qualquer operação de deploy ou incidente.
4. Registre evidências de teste conforme o template em `TESTES.md`.

Voltar ao [README](../README.md).
