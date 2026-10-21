## Resumo

<!-- Explique a mudança em 1 a 3 frases. -->

## Motivação

<!-- Qual problema resolve? Issue relacionada: "Closes #123". -->

Closes #

## Tipo de mudança

- [ ] Correção de defeito
- [ ] Nova funcionalidade
- [ ] Refatoração sem mudança de comportamento
- [ ] Documentação
- [ ] CI, build ou release
- [ ] Segurança
- [ ] Acessibilidade
- [ ] Outro:

## O que mudou

<!-- Liste os arquivos ou áreas principais e o comportamento afetado. -->

-
-
-

## Como foi testado

- [ ] `npm run check` passou
- [ ] `npm run build` passou
- [ ] Smoke manual das views afetadas
- [ ] Teste em 375 px, 768 px e 1440 px
- [ ] Navegação por teclado
- [ ] Teste do fallback de CDN
- [ ] Não se aplica

Descreva os passos e o resultado:

```text
1.
2.
3.
```

## Evidências

<!-- Logs, capturas, link do run ou versão publicada. Não anexe dados pessoais ou segredos. -->

## Risco e rollback

| Item | Descrição |
| --- | --- |
| Risco | Baixo / Médio / Alto |
| Impacto | |
| Rollback | `git revert <SHA>` / outro |

## Checklist

- [ ] A mudança está limitada ao escopo do PR.
- [ ] Não adicionei dependência, CDN ou serviço sem discussão prévia.
- [ ] Valores dinâmicos em HTML passam por `esc()` ou `textContent`.
- [ ] Não adicionei segredo, token ou dado pessoal.
- [ ] Atualizei `CHANGELOG.md` quando o comportamento mudou.
- [ ] Atualizei a documentação afetada.
- [ ] Links relativos da documentação estão corretos.
- [ ] O painel administrativo continua identificado como simulação.
- [ ] Não commitei `dist/` nem arquivos gerados.
- [ ] O PR está pronto para review.

## Observações para o review

<!-- Limitações, dúvidas, decisões que merecem atenção. -->
