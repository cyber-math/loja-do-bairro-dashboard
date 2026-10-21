# Segurança

Documento de segurança do PoC **Loja do Bairro · Painel de Operações**.
Descreve ativos, fronteiras de confiança, modelo de ameaças, controles
existentes, lacunas e canal de reporte.

| Campo | Valor |
| --- | --- |
| Versão de referência | 1.0.0 |
| Última revisão | 2026-10-21 |
| Responsável | Manutenção de Sistemas |
| Classificação | Público |
| Documentos relacionados | [COMPLIANCE.md](COMPLIANCE.md) · [RUNBOOK.md](RUNBOOK.md) · [TESTES.md](TESTES.md) |

> **Aviso de escopo.** Este é um ambiente de demonstração. Os dados são
> fictícios e gerados no navegador. Não há autenticação, autorização,
> persistência ou backend. O painel administrativo e a trilha de auditoria são
> simulações e não devem ser usados como controle de segurança real.

## 1. Ativos e criticidade

| Ativo | Descrição | Criticidade | Observação |
| --- | --- | --- | --- |
| Repositório GitHub | Código, histórico, workflows e configuração | Alta | Comprometimento permite publicar conteúdo malicioso |
| Site publicado | `index.html`, `assets/`, `version.json` | Alta | Vitrine pública; integridade é essencial |
| Workflows e `GITHUB_TOKEN` | CI, Pages e release | Alta | Token efêmero, porém com permissões de escrita no release |
| Conta do mantenedor | Acesso humano ao repositório | Alta | Principal alvo de phishing e roubo de sessão |
| Documentação | `README.md`, `docs/`, `SECURITY.md` | Média | Pode conter promessas incorretas |
| Dados mockados | Produtos, OS, indicadores | Baixa | Fictícios, sem dados pessoais reais |
| Preferências locais | Tema e densidade em `localStorage` | Baixa | Não identificam usuário |
| CDNs e fontes | Chart.js e Google Fonts | Média | Integridade e disponibilidade de terceiros |

## 2. Fronteiras de confiança

```text
+----------------------+        HTTPS         +-----------------------------+
| Navegador do usuário | -------------------> | GitHub Pages (CDN)          |
|  - DOM               |                      |  index.html + assets/       |
|  - localStorage      | <------------------- |  version.json               |
+----------+-----------+        estático       +--------------+--------------+
           |                                                  |
           | HTTPS                                            | build/deploy
           v                                                  v
+----------------------+                           +---------------------+
| CDNs de terceiros    |                           | GitHub Actions      |
|  Chart.js 4.4.7      |                           |  check + build      |
|  Google Fonts        |                           |  GITHUB_TOKEN       |
+----------------------+                           +----------+----------+
                                                              |
                                                              v
                                                   +---------------------+
                                                   | Repositório GitHub  |
                                                   |  código + workflows |
                                                   +---------------------+
```

Fronteiras relevantes:

1. **Navegador ↔ GitHub Pages:** todo o conteúdo é público e servido por HTTPS.
2. **Navegador ↔ CDNs:** scripts e fontes de terceiros executam no contexto da
   página. Não há SRI; a confiança é delegada ao CDN e ao TLS.
3. **GitHub Actions ↔ repositório:** workflows com `contents: write` (release)
   podem criar releases; `pages: write` publica o site.
4. **Operador ↔ GitHub:** a conta humana é o elo mais forte e o mais exposto.
5. **Navegador ↔ localStorage:** apenas tema e densidade; não há sessão.

Não existe fronteira de backend, banco, API interna ou rede privada.

## 3. Dados e privacidade

| Dado | Onde existe | Persistência | Classificação | Observação |
| --- | --- | --- | --- | --- |
| Nome de produtos e categorias | `data.js` e DOM | Memória | Público fictício | Catálogo inventado |
| Ordens de serviço | `data.js` e DOM | Memória | Público fictício | Sem vínculo com pessoa real |
| Nomes de técnicos e atores | `data.js`, `admin.js` | Memória | Público fictício | Personagens da simulação |
| IPs da auditoria | `admin.js` | Memória | Público fictício | Endereços inventados |
| Tema e densidade | `localStorage` | Até limpeza | Preferência | Chaves `lb-tema` e `lb-densidade` |
| Logs de acesso | GitHub | Conforme GitHub | Metadados | Fora do controle do projeto |
| E-mail de segurança | `security.txt` | Repositório | Público | Endereço institucional, não pessoal |

Não há formulário, cadastro, cookie de sessão, analytics, fingerprint, pixel ou
envio de dados para servidor do projeto. A aplicação não coleta dados pessoais.
Se isso mudar, [COMPLIANCE.md](COMPLIANCE.md) deve ser atualizado antes do
lançamento.

## 4. Modelo de ameaças STRIDE

| Categoria | Cenário | Controle atual | Status | Risco residual |
| --- | --- | --- | --- | --- |
| **S**poofing | Alguém se passa pelo mantenedor e publica conteúdo | 2FA na conta GitHub (recomendado, não verificável no repo); revisão por CODEOWNERS | Parcial | Médio |
| **S**poofing | Painel administrativo simula login e MFA | Aviso de demonstração; nenhuma sessão real | Parcial | Baixo (não protege nada) |
| **T**ampering | Alteração maliciosa de `assets/js` ou workflow | Histórico Git, PR, CI, CODEOWNERS, branch protection recomendada | Parcial | Médio |
| **T**ampering | Chart.js ou fonte modificados no CDN | HTTPS; sem SRI; versão fixa 4.4.7 | Ausente | Médio |
| **R**epudiation | Ação administrativa sem registro confiável | Auditoria simulada em memória, hash FNV-1a 32 bits, sem WORM | Parcial | Alto se tratado como real |
| **I**nformation disclosure | Exposição de dados pessoais | Não há dados reais; dataset fictício | Implementado | Baixo |
| **I**nformation disclosure | Segredo commitado no repositório | Nenhum secret conhecido no código atual; `GITHUB_TOKEN` efêmero; revisão de diff | Parcial | Médio |
| **D**enial of service | CDN fora do ar | Fallback jsDelivr → unpkg → cdnjs; mensagem de indisponibilidade | Parcial | Baixo |
| **D**enial of service | GitHub Pages indisponível | Sem controle; runbook e comunicação | Ausente | Baixo |
| **E**levation of privilege | Usuário comum acessa admin | Não há controle de acesso; admin é simulado e público | Ausente | Alto se houver dados reais |
| **E**levation of privilege | Workflow malicioso obtém `contents: write` | Permissões mínimas por workflow; revisão de PR | Parcial | Médio |

O risco residual é avaliado considerando o contexto de demonstração. Em um
sistema com dados reais, vários itens passariam a ser críticos.

## 5. OWASP Top 10 2021

| Categoria | Aplicabilidade | Situação no projeto | Status |
| --- | --- | --- | --- |
| A01 Broken Access Control | Alta | Não há autenticação nem autorização; o painel admin é acessível a qualquer visitante e apenas simula controle | Ausente |
| A02 Cryptographic Failures | Média | HTTPS no Pages; nenhum dado sensível; hash de auditoria é FNV-1a 32 bits, não criptográfico | Parcial |
| A03 Injection | Alta | Renderização usa `innerHTML` com `esc()` nos pontos revisados; não há auditoria automatizada de sinks; CSV não neutraliza fórmulas | Parcial |
| A04 Insecure Design | Média | Escopo de demonstração documentado; modelo de ameaças e limites explícitos | Parcial |
| A05 Security Misconfiguration | Alta | Sem CSP, sem SRI, sem cabeçalhos próprios; Pages controla a borda | Ausente |
| A06 Vulnerable and Outdated Components | Média | Chart.js fixo em 4.4.7; actions em tags principais; Dependabot semanal; sem lockfile | Parcial |
| A07 Identification and Authentication Failures | Alta | Não há login; "MFA ativo" e perfil são rótulos simulados | Ausente |
| A08 Software and Data Integrity Failures | Alta | Sem SRI nem assinatura de release; build determinístico e versionado | Parcial |
| A09 Security Logging and Monitoring Failures | Alta | Auditoria apenas simulada; sem telemetria, alerta ou retenção real | Ausente |
| A10 SSRF | Baixa | Não há requisição server-side nem URL controlada pelo usuário | Não aplicável |

## 6. Controles existentes

| Controle | Implementação | Cobertura | Limitação |
| --- | --- | --- | --- |
| Escape de HTML | `esc()` em `app.js` e `admin.js` substitui `& < > " '` | Pontos revisados de `innerHTML` | Não há teste automatizado de XSS |
| HTTPS | GitHub Pages serve o site por HTTPS | Todo o site | Cabeçalhos controlados pelo GitHub |
| Permissões de workflow | `contents: read` na CI; `pages: write`/`id-token: write` no Pages; `contents: write` no release | Workflows | Actions de terceiros não são usadas; apenas `actions/*` |
| Token efêmero | `GITHUB_TOKEN` por job | Automação | Não há secret de longa duração |
| Dependabot | Atualização semanal das actions | `.github/dependabot.yml` | Não cobre CDN nem fontes |
| Revisão por código | CODEOWNERS e template de PR | Repositório | Sem branch protection verificável |
| Verificação estática | `npm run check` | Referências, sintaxe, IDs, encoding, versão, `.nojekyll` | Não detecta falha de runtime ou segurança |
| Minimização de dados | Dataset fictício; sem formulário | Todo o site | Muda se houver integração real |
| Aviso de simulação | Textos no admin e na documentação | Interface e docs | Não é controle técnico |
| `security.txt` | Contato, expiração e política | Publicado no Pages | Links `Policy` e `Acknowledgments` retornam 404 |

## 7. Lacunas de segurança

| ID | Lacuna | Risco | Impacto | Tratamento recomendado |
| --- | --- | --- | --- | --- |
| S-01 | Sem autenticação ou autorização | Alto (se dados reais) | Qualquer visitante acessa o admin | Integrar IdP e RBAC antes de dados reais |
| S-02 | Sem CSP | Médio | XSS tem mais liberdade de execução | CSP em cabeçalho ou `<meta>` compatível |
| S-03 | Sem SRI no Chart.js | Médio | CDN comprometido executa código | Vendorizar ou adicionar `integrity` |
| S-04 | Auditoria com hash de 32 bits | Médio | Colisão e falsificação viáveis | SHA-256 com `crypto.subtle` e encadeamento |
| S-05 | Sem monitoramento ou alerta | Médio | Detecção depende de terceiros | Erros de front-end e uptime check |
| S-06 | Sem branch protection documentada | Médio | Push direto em `main` publica | Exigir PR, CI e review |
| S-07 | Sem 2FA verificável | Alto | Roubo de conta publica conteúdo | Exigir 2FA na organização |
| S-08 | CSV sem neutralização de fórmula | Baixo | Fórmula executa ao abrir em planilha | Prefixar `= + - @` em campos |
| S-09 | Links `Policy` e `Acknowledgments` do `security.txt` retornam 404 | Médio | Canal de reporte incompleto | Incluir `docs/` no build ou apontar para página existente |
| S-10 | E-mail em domínio `.example` | Médio | Relatos não chegam | Substituir por caixa real |
| S-11 | Sem política de retenção de logs | Baixo | Evidência indisponível | Definir retenção no GitHub |
| S-12 | Dependência de rede e terceiros | Baixo | Gráficos e fontes falham | Auto-hospedar ativos |

## 8. Orientação de CSP e SRI

Nada abaixo está implementado. São recomendações para reduzir S-02 e S-03.

### 8.1 CSP

O `index.html` possui script inline de hidratação de versão e estilos inline
em alguns pontos. Por isso, uma política inicial precisaria de
`'unsafe-inline'`, o que reduz o valor da CSP. O caminho correto é:

1. Mover o script inline para `assets/js/version-tag.js`.
2. Remover estilos inline ou autorizá-los por hash.
3. Publicar a política em cabeçalho HTTP, quando houver hospedagem que permita
   cabeçalhos. Em GitHub Pages, o repositório não controla cabeçalhos.
4. Se usar `<meta http-equiv="Content-Security-Policy">`, lembrar que
   `frame-ancestors`, `report-uri` e `sandbox` não funcionam nesse contexto.

Rascunho conservador, apenas para teste:

```text
default-src 'self';
script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'none';
frame-ancestors 'none';
upgrade-insecure-requests
```

O rascunho ainda permite `'unsafe-inline'` para estilos e não cobre o script
inline. Não aplicar sem testar todas as views e o fallback de CDN.

### 8.2 SRI

Para usar SRI no Chart.js:

1. Fixar a versão exata `4.4.7` (já fixada).
2. Escolher um CDN primário e calcular o hash SHA-384 do arquivo.
3. Adicionar `integrity="sha384-..."` e `crossorigin="anonymous"` ao `<script>`.
4. Manter fallback apenas se o hash for idêntico entre CDNs; caso contrário,
   cada URL precisa do seu próprio hash.
5. Atualizar o hash junto da versão, em PR revisado.

O projeto carrega o Chart.js dinamicamente em `charts.js`, portanto a mudança
exige alterar o loader, não apenas o HTML.

## 9. Autenticação e autorização

Não existem. A interface exibe "MFA ativo", perfil de gerente e painel
administrativo, mas tudo é encenação visual. Não há cookie, token, sessão,
senha, verificação ou chamada de identidade.

Regras para evolução:

- não reutilizar os rótulos atuais como se fossem controle real;
- autenticar antes de exibir qualquer dado não público;
- aplicar RBAC no servidor, nunca apenas no JavaScript;
- usar cookies `HttpOnly`, `Secure` e `SameSite` se houver sessão;
- registrar acesso e mudança em log imutável;
- testar autorização por perfil e por recurso.

Enquanto isso, qualquer informação publicada no site deve ser considerada
pública.

## 10. XSS, DOM e exportação

A aplicação monta HTML por concatenação e usa `innerHTML`. O controle principal
é `esc()`:

```js
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
```

Pontos de atenção:

- `esc()` é adequado para conteúdo e atributos entre aspas, mas não para
  JavaScript inline, URLs ou CSS. Não inserir dados em `onclick`, `href` ou
  `style` sem validação específica.
- Dados atuais são fixos, o que reduz a superfície. Uma integração externa
  mudaria o risco.
- Não há sanitização de HTML nem Trusted Types.
- A exportação CSV usa `;`, aspas duplas e BOM UTF-8, mas não neutraliza
  fórmulas iniciadas por `=`, `+`, `-` ou `@`. Com dados externos, isso é
  CSV injection.
- Downloads usam `Blob` e `URL.createObjectURL`; não há upload.

Recomendações: preferir `textContent` para texto, criar elementos via DOM,
validar URLs com allowlist, adicionar testes de XSS e neutralizar fórmulas no
CSV.

## 11. Cadeia de suprimentos

| Componente | Origem | Fixação | Integridade | Risco |
| --- | --- | --- | --- | --- |
| Chart.js 4.4.7 | jsDelivr, unpkg, cdnjs | Versão exata na URL | Sem SRI | Médio |
| Google Fonts | fonts.googleapis.com e fonts.gstatic.com | Sem versão | Sem SRI | Baixo |
| GitHub Actions | `actions/checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4` | Tag principal | Mantidas pelo GitHub | Baixo |
| Node.js | Runner `ubuntu-latest` | `node-version: 22` | Imagem do runner | Baixo |
| npm | Não usado | Sem dependências | Não aplicável | Nenhum |

O Dependabot cobre as actions. Não há lockfile porque não há dependências npm.
A atualização do Chart.js é manual e deve ser testada nos três CDNs.

## 12. Desenvolvimento seguro

Checklist para PRs que tocam segurança:

- [ ] Nenhum segredo, token, senha ou dado pessoal no diff.
- [ ] Entrada externa escapada antes de `innerHTML`.
- [ ] Nenhuma nova dependência de CDN sem justificativa e revisão.
- [ ] Permissões de workflow mantidas no mínimo necessário.
- [ ] `npm run check` verde.
- [ ] Comportamento testado em navegador.
- [ ] Documentação de segurança atualizada quando o controle mudar.
- [ ] Rollback descrito.

Recomendações de repositório, fora do alcance do código:

1. Ativar 2FA obrigatório na conta/organização.
2. Proteger `main` com PR obrigatório, CI verde e review do CODEOWNERS.
3. Ativar secret scanning e push protection.
4. Ativar alertas de Dependabot e code scanning, se disponíveis.
5. Revisar colaboradores e chaves SSH periodicamente.

## 13. Reporte de vulnerabilidades

### 13.1 Como reportar

Enviar e-mail para `seguranca@lojadobairro.example` (canal provisório; ver
seção 14) ou usar o recurso de **Security advisory** do GitHub, quando
habilitado. **Não abrir issue pública para vulnerabilidade não corrigida.**

Incluir:

- descrição do problema e impacto;
- passos de reprodução ou prova de conceito;
- URL, commit ou versão afetada;
- navegador e sistema;
- se o problema é conhecido publicamente;
- forma de contato e crédito desejado.

Não enviar dados pessoais, credenciais ou conteúdo de terceiros.

### 13.2 Escopo

Dentro do escopo:

- o repositório e o site publicado;
- falhas de XSS, injeção, exposição de informação e configuração;
- bypass de controles que o projeto afirma ter;
- comprometimento da cadeia de build ou dos workflows.

Fora do escopo:

- ausência de autenticação no painel administrativo, já documentada;
- dados fictícios exibidos na interface;
- engenharia social contra mantenedores;
- negação de serviço, varredura volumosa ou testes que degradem o serviço;
- vulnerabilidades em GitHub, CDNs ou Google Fonts, que devem ser reportadas
  aos respectivos fornecedores;
- relatos automatizados sem impacto demonstrável.

### 13.3 Prazos e expectativa

| Etapa | Meta de melhores esforços |
| --- | --- |
| Confirmação de recebimento | 2 dias úteis |
| Triagem inicial | 5 dias úteis |
| Correção de falha crítica | 30 dias |
| Correção de falha de baixo risco | Próxima release |
| Crédito, se desejado | Na correção |

Não há programa de recompensas, SLA contratual ou plantão 24x7. O projeto é um
PoC mantido de forma independente.

### 13.4 Salvo-conduto

Testes realizados de boa-fé, dentro do escopo e sem degradar o serviço, serão
tratados como pesquisa de segurança. O projeto não adotará medida legal contra
quem seguir estas regras e reportar de forma privada. Essa declaração não
autoriza acesso a contas, dados de terceiros ou infraestrutura fora do escopo.

### 13.5 Reconhecimentos

<a id="reconhecimentos" name="reconhecimentos"></a>

Nenhuma vulnerabilidade foi reportada ou reconhecida até 2026-10-21. Esta
seção será atualizada com nome ou identificação do pesquisador, mediante
autorização.

## 14. `security.txt` e divulgação

O arquivo `.well-known/security.txt` declara:

- contato: `seguranca@lojadobairro.example`;
- expiração: `2027-10-21T00:00:00.000Z`;
- idiomas: `pt-BR` e `en`;
- política: `https://tiagocfonsecaba.github.io/loja-do-bairro-dashboard/docs/SEGURANCA.md`;
- reconhecimentos: âncora nesta seção.

Duas limitações devem ser corrigidas:

1. O domínio `.example` é reservado e não recebe e-mail. Sem um endereço real,
   o canal não funciona.
2. `scripts/build.mjs` publica `.well-known/security.txt`, mas não copia
   `docs/`. Portanto, os links `Policy` e `Acknowledgments` do arquivo apontam
   para uma página que retorna 404 no domínio público.

Até a correção, o reporte deve usar o recurso de segurança do GitHub, se
disponível.

## 15. Roadmap de segurança

| Prioridade | Ação | Reduz | Esforço |
| --- | --- | --- | --- |
| P1 | Substituir e-mail `.example` por caixa real | S-10 | Baixo |
| P1 | Incluir `docs/` no build ou corrigir links do `security.txt` | S-09 | Baixo |
| P1 | Ativar 2FA e branch protection | S-07, S-06 | Baixo |
| P2 | Corrigir rótulo ou implementar SHA-256 na auditoria | S-04 | Médio |
| P2 | Adicionar CSP após remover inline | S-02 | Médio |
| P2 | Vendorizar Chart.js ou aplicar SRI | S-03, S-12 | Médio |
| P2 | Neutralizar fórmulas no CSV | S-08 | Baixo |
| P3 | Adicionar checagem de uptime e erro de front-end | S-05 | Médio |
| P3 | Criar testes de XSS e de autorização futura | S-01 | Alto |
| P3 | Integrar IdP e RBAC antes de qualquer dado real | S-01 | Alto |

## 16. Referências

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/CSP)
- [GitHub Pages: secure sites](https://docs.github.com/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [RFC 9116: security.txt](https://www.rfc-editor.org/rfc/rfc9116)
- [COMPLIANCE.md](COMPLIANCE.md) — privacidade, auditoria e riscos.
- [RUNBOOK.md](RUNBOOK.md) — resposta a incidentes e rotação de credenciais.
- [SECURITY.md](../SECURITY.md) — política resumida de reporte.
