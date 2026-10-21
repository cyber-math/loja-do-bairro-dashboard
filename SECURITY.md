# Política de Segurança

Política de reporte e tratamento de vulnerabilidades do **Loja do Bairro ·
Painel de Operações**.

| Campo | Valor |
| --- | --- |
| Versão suportada | 1.x |
| Última revisão | 2026-10-21 |
| Contato | `seguranca@lojadobairro.example` |
| Política completa | [docs/SEGURANCA.md](docs/SEGURANCA.md) |
| Runbook | [docs/RUNBOOK.md](docs/RUNBOOK.md) |

> **Ambiente de demonstração.** Os dados são fictícios, gerados no navegador.
> Não há autenticação, backend ou dados pessoais reais. O painel administrativo
> e a trilha de auditoria são simulações.

## Versões suportadas

| Versão | Suporte | Observação |
| --- | --- | --- |
| 1.x | Sim | Linha atual |
| Anteriores | Não | Sem suporte formal |

Como o site é estático e a versão é carimbada no build, confirme a versão em
`version.json` ou em **Configurações → Sobre o PoC** antes de reportar.

## Como reportar

**Não abra issue pública para uma vulnerabilidade não corrigida.**

Use um dos canais:

1. **GitHub Security Advisory** do repositório, quando disponível.
2. E-mail para `seguranca@lojadobairro.example`.

O endereço acima está declarado no `.well-known/security.txt`, mas usa o domínio
reservado `.example` e **precisa ser substituído por uma caixa real** antes de
ser considerado um canal operacional. Se o e-mail não funcionar, use o recurso
privado de segurança do GitHub.

Inclua no relato:

- descrição do problema e impacto;
- passos de reprodução ou prova de conceito;
- URL, commit ou versão afetada;
- navegador, sistema e condição de rede;
- se o problema já é público;
- nome ou identificação para crédito, se desejar.

Não inclua dados pessoais, credenciais, tokens ou conteúdo de terceiros.

## O que está no escopo

- o repositório e o site publicado no GitHub Pages;
- XSS, injeção e exposição de informação;
- falha de configuração ou de permissão em workflows;
- comprometimento da cadeia de build ou de um CDN usado pelo site;
- bypass de um controle que a documentação afirma existir.

## O que está fora do escopo

- ausência de autenticação no painel administrativo, já documentada;
- dados fictícios ou personagens da simulação;
- engenharia social contra mantenedores;
- negação de serviço, varredura volumosa ou teste que degrade o serviço;
- vulnerabilidades no GitHub, jsDelivr, unpkg, cdnjs ou Google Fonts, que devem
  ser reportadas aos respectivos fornecedores;
- relatos automatizados sem impacto demonstrável.

## Prazos

| Etapa | Meta de melhores esforços |
| --- | --- |
| Confirmação de recebimento | 2 dias úteis |
| Triagem inicial | 5 dias úteis |
| Correção de falha crítica | 30 dias |
| Correção de baixo risco | Próxima release |

Não há SLA contratual, recompensa financeira ou plantão 24x7.

## Divulgação

- Trabalhe de forma privada até a correção e a coordenação da divulgação.
- Não acesse dados de terceiros, não altere conteúdo e não interrompa o serviço.
- O projeto buscará confirmar o relato, corrigir e creditar quem ajudou, se
  autorizado.
- A divulgação pública conjunta pode ocorrer após a correção.

## Salvo-conduto

Pesquisa de boa-fé, dentro do escopo e sem degradar o serviço, será tratada como
pesquisa de segurança. O projeto não adotará medida legal contra quem seguir
esta política e reportar de forma privada. Esta declaração não autoriza acesso
a contas, dados de terceiros ou infraestrutura fora do escopo.

## Limitações conhecidas

Estas condições são conhecidas e não devem ser reportadas como novidade:

- não há autenticação, autorização, sessão ou persistência;
- o painel administrativo é simulado e público;
- a auditoria usa FNV-1a de 32 bits, apesar do rótulo "SHA-256";
- não há CSP nem SRI no Chart.js;
- `docs/` não é copiado para o artefato publicado; os links `Policy` e
  `Acknowledgments` do `security.txt` retornam 404;
- não há monitoramento, alerta ou retenção de logs próprios.

Detalhes, impacto e recomendações estão em [docs/SEGURANCA.md](docs/SEGURANCA.md).

## Reconhecimentos

Nenhuma vulnerabilidade foi reportada ou reconhecida até 2026-10-21. Esta seção
será atualizada com autorização de quem reportar.

## Referências

- [docs/SEGURANCA.md](docs/SEGURANCA.md) — modelo de ameaças e controles.
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — resposta a incidentes e rotação de
  credenciais.
- [docs/COMPLIANCE.md](docs/COMPLIANCE.md) — privacidade e obrigações legais.
- [.well-known/security.txt](.well-known/security.txt) — metadados de contato.
