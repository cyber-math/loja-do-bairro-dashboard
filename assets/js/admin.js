/* =========================================================================
   Loja do Bairro — Painel Administrativo
   Manutenção de Sistemas + Operações: compliance, regras de negócio,
   backend, transmissão de eventos, ativos, infraestrutura e auditoria.
   Vanilla ES5, sem build. Exposto como window.ADMIN.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. Utilidades                                                       *
   * ------------------------------------------------------------------ */
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var AGORA = new Date();

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function duas(n) { return n < 10 ? '0' + n : String(n); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ico(nome, classe) {
    return '<svg class="ico' + (classe ? ' ' + classe : '') + '" aria-hidden="true"><use href="#' + nome + '"/></svg>';
  }

  function chip(txt, tipo, ponto) {
    return '<span class="chip chip--' + tipo + '">' + (ponto ? '<i></i>' : '') + esc(txt) + '</span>';
  }

  function alpha(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function moeda(v) {
    if (global.FMT && global.FMT.moeda) return global.FMT.moeda(v);
    return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
  }

  function moedaCurta(v) {
    if (global.FMT && global.FMT.moedaCurta) return global.FMT.moedaCurta(v);
    return 'R$ ' + Math.round(Number(v || 0) / 1000) + ' mil';
  }

  function numero(v) {
    if (global.FMT && global.FMT.numero) return global.FMT.numero(v);
    return String(v);
  }

  function decimal(v) {
    if (global.FMT && global.FMT.decimal) return global.FMT.decimal(v);
    return Number(v || 0).toFixed(1).replace('.', ',');
  }

  function pct(v, casas) {
    if (casas && global.FMT && global.FMT.decimal) return decimal(v) + '%';
    return Math.round(v) + '%';
  }

  function hora(d) { return duas(d.getHours()) + ':' + duas(d.getMinutes()); }
  function horaSeg(d) { return hora(d) + ':' + duas(d.getSeconds()); }

  function dataISO(d) { return d.getFullYear() + '-' + duas(d.getMonth() + 1) + '-' + duas(d.getDate()); }

  function dataRel(dias) {
    var d = new Date(AGORA.getTime());
    d.setDate(d.getDate() + dias);
    return dataISO(d);
  }

  function dataCurta(d) {
    if (typeof d === 'string') d = new Date(d + 'T12:00:00');
    return d.getDate() + ' ' + MESES[d.getMonth()];
  }

  function dataBR(d) {
    if (typeof d === 'string') d = new Date(d + 'T12:00:00');
    return duas(d.getDate()) + '/' + duas(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function mesAno(d) {
    if (typeof d === 'string') d = new Date(d + 'T12:00:00');
    return MESES[d.getMonth()] + '/' + d.getFullYear();
  }

  function dataHoraCurta(d) {
    return dataCurta(d) + ' · ' + horaSeg(d);
  }

  function emMinutos(min) {
    var d = new Date(AGORA.getTime() + min * 60000);
    var mesmoDia = d.getDate() === AGORA.getDate() && d.getMonth() === AGORA.getMonth();
    return (mesmoDia ? 'hoje' : 'amanhã') + ' · ' + hora(d);
  }

  function proximaDiaria(h, m) {
    var d = new Date(AGORA.getTime());
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= AGORA.getTime()) d.setDate(d.getDate() + 1);
    var hoje = d.getDate() === AGORA.getDate();
    return (hoje ? 'hoje' : (d.getDate() === AGORA.getDate() + 1 ? 'amanhã' : DIAS_SEMANA[d.getDay()])) + ' · ' + hora(d);
  }

  function proximaSemanal(dia, h, m) {
    var d = new Date(AGORA.getTime());
    d.setHours(h, m, 0, 0);
    while (d.getDay() !== dia || d.getTime() <= AGORA.getTime()) d.setDate(d.getDate() + 1);
    return DIAS_SEMANA[d.getDay()] + ' · ' + hora(d);
  }

  function diasAte(iso) {
    var d = new Date(iso + 'T12:00:00');
    return Math.ceil((d.getTime() - AGORA.getTime()) / 86400000);
  }

  function normaliza(s) {
    s = String(s == null ? '' : s).toLowerCase();
    return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
  }

  function avisar(titulo, texto, tipo) {
    if (global.LB && typeof global.LB.toast === 'function') global.LB.toast(titulo, texto, tipo || 'info');
    else if (global.console && global.console.log) global.console.log('[ADMIN] ' + titulo + ' — ' + texto);
  }

  function hash8(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  var COR = {
    green: '#10b981', green2: '#22c55e', amber: '#f59e0b', red: '#ef4444',
    blue: '#3b82f6', violet: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', muted: '#7c8bab'
  };

  /* ------------------------------------------------------------------ *
   * 2. Dataset                                                          *
   * ------------------------------------------------------------------ */
  var SERVICOS = [
    { nome: 'API Gateway', uptime: 99.998, p95: 38, replicas: '3/3', cpu: 42, mem: 61, versao: 'v2.14.3', status: 'OK' },
    { nome: 'stock-svc', uptime: 99.994, p95: 74, replicas: '4/4', cpu: 56, mem: 68, versao: 'v2.8.4', status: 'OK' },
    { nome: 'os-svc', uptime: 99.987, p95: 112, replicas: '3/3', cpu: 63, mem: 72, versao: 'v1.9.2', status: 'OK' },
    { nome: 'fiscal-svc', uptime: 99.971, p95: 284, replicas: '2/3', cpu: 71, mem: 79, versao: 'v4.2.0', status: 'ATENÇÃO' },
    { nome: 'PostgreSQL', uptime: 99.999, p95: 21, replicas: '1+2', cpu: 48, mem: 74, versao: 'v16.4', status: 'OK' },
    { nome: 'Redis', uptime: 99.996, p95: 4, replicas: '3/3', cpu: 22, mem: 47, versao: 'v7.4.1', status: 'OK' }
  ];

  var JOBS = [
    { job: 'sync-erp', cron: '*/15 * * * *', proxima: emMinutos(6), duracao: '22 s', status: 'sucesso' },
    { job: 'conciliacao-cartao', cron: '0 */2 * * *', proxima: emMinutos(34), duracao: '3 min 12 s', status: 'sucesso' },
    { job: 'fechamento-caixa', cron: '30 23 * * *', proxima: proximaDiaria(23, 30), duracao: '48 s', status: 'sucesso' },
    { job: 'expurgo-lgpd', cron: '0 3 * * *', proxima: proximaDiaria(3, 0), duracao: '1 min 08 s', status: 'sucesso' },
    { job: 'backup-pg', cron: '0 2 * * *', proxima: proximaDiaria(2, 0), duracao: '12 min 40 s', status: 'sucesso' },
    { job: 'reindex-estoque', cron: '0 4 * * 0', proxima: proximaSemanal(0, 4, 0), duracao: '6 min 21 s', status: 'atenção' }
  ];

  var ALERTAS = [
    { sev: 'Crítico', tipo: 'crit', titulo: 'PostgreSQL replica-2 em modo degraded', origem: 'infra · sa-east-1b', quando: 'há 4 min', icone: 'i-alert', detalhe: 'Lag de replicação de 42 s; leituras desviadas para replica-1.' },
    { sev: 'Atenção', tipo: 'low', titulo: 'Fila fiscal.emit com lag acima de 90 s', origem: 'mensageria · kafka', quando: 'há 12 min', icone: 'i-clock', detalhe: '6 consumidores ativos; SEFAZ com latência acima do normal.' },
    { sev: 'Atenção', tipo: 'low', titulo: 'Freezer FRZ-04 acima de -12 °C', origem: 'sensores · frios', quando: 'há 18 min', icone: 'i-alert', detalhe: 'Temperatura atual -9,8 °C; OS preventiva já aberta.' },
    { sev: 'Info', tipo: 'info', titulo: 'Deploy api-gateway v2.14.3 concluído', origem: 'CI/CD · produção', quando: 'há 41 min', icone: 'i-check', detalhe: 'Rollout canário 10% → 100% sem erros 5xx.' },
    { sev: 'Atenção', tipo: 'low', titulo: 'DLQ notifications com 2 mensagens presas', origem: 'mensageria · webhook', quando: 'há 1 h', icone: 'i-layers', detalhe: 'Provedor WhatsApp retornou 503 em três tentativas.' }
  ];

  var FRAMEWORKS = [
    { nome: 'LGPD', base: 'Lei 13.709/2018 · 44 controles', pct: 96, chip: 'ok', status: 'Conforme', owner: 'Bianca Melo · DPO', proxima: dataRel(22), cor: 'var(--green)' },
    { nome: 'ISO 27001', base: 'ISO/IEC 27001:2022 · 69 controles', pct: 88, chip: 'info', status: 'Em certificação', owner: 'Marina Alves · CISO', proxima: dataRel(43), cor: 'var(--blue)' },
    { nome: 'PCI-DSS', base: 'PCI-DSS v4.0 · 42 controles', pct: 81, chip: 'low', status: 'Plano de ação', owner: 'Sérgio Pinto · SRE', proxima: dataRel(28), cor: 'var(--amber)' },
    { nome: 'SOC 2', base: 'SOC 2 Type II · 38 controles', pct: 74, chip: 'low', status: 'Gaps de evidência', owner: 'Audita.bot · Compliance', proxima: dataRel(91), cor: 'var(--violet)' }
  ];

  var CONTROLES = [
    { id: 'C-01', controle: 'Controle de acesso baseado em função (RBAC)', fw: 'LGPD', owner: 'Marina Alves', evid: 'Revisão de papéis IAM · out/2026', revisao: dataRel(-9), status: 'Conforme', chip: 'ok' },
    { id: 'C-02', controle: 'Criptografia em repouso AES-256', fw: 'LGPD / ISO 27001', owner: 'Sérgio Pinto', evid: 'Laudo pgcrypto + KMS', revisao: dataRel(-13), status: 'Conforme', chip: 'ok' },
    { id: 'C-03', controle: 'MFA obrigatório para acesso administrativo', fw: 'ISO 27001', owner: 'Marina Alves', evid: 'Export IdP · 100% de cobertura', revisao: dataRel(-6), status: 'Conforme', chip: 'ok' },
    { id: 'C-04', controle: 'Registro de auditoria imutável', fw: 'SOC 2', owner: 'Bianca Melo', evid: 'Hash-chain dos últimos 30 dias', revisao: dataRel(-2), status: 'Conforme', chip: 'ok' },
    { id: 'C-05', controle: 'Retenção e expurgo de dados pessoais', fw: 'LGPD', owner: 'Bianca Melo', evid: 'Job expurgo-lgpd · 1 pendência', revisao: dataRel(-20), status: 'Atenção', chip: 'low' },
    { id: 'C-06', controle: 'Backup com teste de restauração', fw: 'ISO 27001', owner: 'Sérgio Pinto', evid: 'Relatório de restore de 19/10', revisao: dataRel(-2), status: 'Conforme', chip: 'ok' },
    { id: 'C-07', controle: 'Segmentação de rede e WAF', fw: 'PCI-DSS', owner: 'Sérgio Pinto', evid: 'Regras WAF v18.4 · 2 exceções', revisao: dataRel(-11), status: 'Atenção', chip: 'low' },
    { id: 'C-08', controle: 'Tokenização de dados de cartão', fw: 'PCI-DSS', owner: 'Bianca Melo', evid: 'SAQ-D pendente de anexo', revisao: dataRel(-23), status: 'Gap', chip: 'crit' },
    { id: 'C-09', controle: 'Due diligence de fornecedores críticos', fw: 'SOC 2', owner: 'Marina Alves', evid: 'F09 sem questionário atualizado', revisao: dataRel(-29), status: 'Gap', chip: 'crit' },
    { id: 'C-10', controle: 'Teste de resposta a incidentes', fw: 'ISO 27001 / SOC 2', owner: 'Carlos Menezes', evid: 'Tabletop de 02/10 · ações abertas', revisao: dataRel(-19), status: 'Em andamento', chip: 'info' }
  ];

  var RETENCAO = [
    { dado: 'Vendas e cupons fiscais', base: 'Obrigação fiscal · Art. 195 CTN', ret: '5 anos', anon: '—', status: 'Conforme', chip: 'ok' },
    { dado: 'Cadastro de clientes', base: 'Execução de contrato · LGPD Art. 7º V', ret: '24 meses após inatividade', anon: 'Anonimização automática', status: 'Conforme', chip: 'ok' },
    { dado: 'Logs de acesso', base: 'Marco Civil · Art. 15', ret: '6 meses', anon: 'Pseudonimização de IP', status: 'Conforme', chip: 'ok' },
    { dado: 'Currículos e candidatos', base: 'Consentimento · LGPD Art. 7º I', ret: '12 meses', anon: 'Expurgo automático', status: 'Revisar', chip: 'low' },
    { dado: 'Dados de cartão', base: 'PCI-DSS 3.2.1', ret: 'Não armazenado', anon: 'Tokenização no PSP', status: 'Conforme', chip: 'ok' },
    { dado: 'Telemetria de aplicação', base: 'Legítimo interesse · LGPD Art. 7º IX', ret: '90 dias', anon: 'Agregação estatística', status: 'Conforme', chip: 'ok' },
    { dado: 'Titulares na União Europeia', base: 'GDPR Art. 6(1)(a) · consentimento', ret: '24 meses', anon: 'Anonimização / direito ao esquecimento', status: 'Revisar', chip: 'low' },
    { dado: 'Gravações de CFTV', base: 'Segurança patrimonial · legítimo interesse', ret: '30 dias', anon: '—', status: 'Revisar', chip: 'low' },
    { dado: 'Saúde ocupacional', base: 'Obrigação legal · NR-7', ret: '20 anos', anon: 'Acesso restrito e auditado', status: 'Conforme', chip: 'ok' },
    { dado: 'Logs de auditoria', base: 'SOC 2 / ISO 27001', ret: '12 meses', anon: 'Hash-chain WORM em S3', status: 'Conforme', chip: 'ok' }
  ];

  var RISCOS = [
    { id: 'R-01', p: 4, i: 5, nome: 'Vazamento de dados de cartão' },
    { id: 'R-02', p: 4, i: 4, nome: 'Indisponibilidade do PDV no pico' },
    { id: 'R-03', p: 3, i: 5, nome: 'Perda de evidências fiscais' },
    { id: 'R-04', p: 5, i: 3, nome: 'Acesso indevido a dados de titulares' },
    { id: 'R-05', p: 3, i: 4, nome: 'Atraso na conciliação de cartões' },
    { id: 'R-06', p: 2, i: 5, nome: 'Falha no teste de restauração' },
    { id: 'R-07', p: 5, i: 4, nome: 'Fraude interna em sangria de caixa' },
    { id: 'R-08', p: 2, i: 3, nome: 'Atraso de fornecedor crítico' }
  ];

  var LGPD = [
    { titular: '***.452.118-**', tipo: 'Acesso aos dados', prazo: dataRel(2), status: 'Em andamento', chip: 'info' },
    { titular: '***.877.203-**', tipo: 'Exclusão definitiva', prazo: dataRel(4), status: 'Em andamento', chip: 'info' },
    { titular: '***.109.774-**', tipo: 'Portabilidade', prazo: dataRel(-2), status: 'Concluída', chip: 'ok' },
    { titular: '***.661.902-**', tipo: 'Correção de cadastro', prazo: dataRel(7), status: 'Aguardando titular', chip: 'low' },
    { titular: '***.334.887-**', tipo: 'Oposição ao tratamento', prazo: dataRel(9), status: 'Em análise', chip: 'violet' }
  ];

  var REGRAS = [
    { id: 'RN-001', nome: 'Estoque mínimo por categoria', tipo: 'Estoque', cond: 'estoque_atual < categoria.minimo * 1.15', acao: 'Abrir sugestão de reposição para o comprador', prio: 'Alta', exec: 18432, falhas: 0, ativa: true, sim: { tipo: 'dias', dica: 'Cobertura de estoque em dias', padrao: 4, limite: 6, op: 'lt', bloquear: false, msg: 'Reposição sugerida para a categoria' } },
    { id: 'RN-002', nome: 'Bloqueio de venda sem saldo', tipo: 'Estoque', cond: 'saldo_disponivel <= 0 && reserva_ativa == false', acao: 'Bloquear item no PDV e sinalizar ao operador', prio: 'Crítica', exec: 9871, falhas: 2, ativa: true, sim: { tipo: 'un', dica: 'Saldo disponível em unidades', padrao: 0, limite: 0, op: 'lte', bloquear: true, msg: 'Venda bloqueada por falta de saldo' } },
    { id: 'RN-003', nome: 'Aprovação de OS acima de R$ 1.000', tipo: 'OS', cond: 'os.custo_estimado > 1000.00', acao: 'Exigir aprovação do gerente antes da execução', prio: 'Alta', exec: 47, falhas: 0, ativa: true, sim: { tipo: 'moeda', dica: 'Custo estimado da OS', padrao: 1240, limite: 1000, op: 'gt', bloquear: true, msg: 'OS exige aprovação da gerência' } },
    { id: 'RN-004', nome: 'SLA de refrigeração em 8 horas', tipo: 'OS', cond: 'os.tipo == "refrigeracao" && idade > 8h', acao: 'Escalonar para o plantão técnico de refrigeração', prio: 'Crítica', exec: 312, falhas: 1, ativa: true, sim: { tipo: 'horas', dica: 'Horas desde a abertura da OS', padrao: 9, limite: 8, op: 'gt', bloquear: false, msg: 'SLA estourado: plantão acionado' } },
    { id: 'RN-005', nome: 'Desconto máximo de 15% sem gerente', tipo: 'Financeiro', cond: 'desconto_pct > 0.15 && perfil != "gerente"', acao: 'Bloquear desconto e solicitar override com justificativa', prio: 'Crítica', exec: 1204, falhas: 3, ativa: true, sim: { tipo: 'pct', dica: 'Desconto concedido no cupom', padrao: 18, limite: 15, op: 'gt', bloquear: true, msg: 'Desconto acima da alçada do operador' } },
    { id: 'RN-006', nome: 'Limite de sangria de caixa', tipo: 'Financeiro', cond: 'sangria_total_dia > 3000.00', acao: 'Exigir dupla conferência e registro no livro de caixa', prio: 'Alta', exec: 38, falhas: 0, ativa: true, sim: { tipo: 'moeda', dica: 'Sangria acumulada no dia', padrao: 3200, limite: 3000, op: 'gt', bloquear: true, msg: 'Sangria acima do limite operacional' } },
    { id: 'RN-007', nome: 'Duplicidade de nota fiscal', tipo: 'Financeiro', cond: 'chave_nfe in notas_24h', acao: 'Bloquear lançamento duplicado e abrir ocorrência fiscal', prio: 'Crítica', exec: 2140, falhas: 0, ativa: true, sim: { tipo: 'un', dica: 'Notas duplicadas detectadas', padrao: 1, limite: 0, op: 'gt', bloquear: true, msg: 'Lançamento duplicado bloqueado' } },
    { id: 'RN-008', nome: 'CPF obrigatório no cadastro', tipo: 'Segurança', cond: 'cliente.cpf == null && valor_total > 0', acao: 'Solicitar CPF ou justificativa de recusa', prio: 'Média', exec: 764, falhas: 5, ativa: true, sim: { tipo: 'un', dica: 'Cadastros sem CPF no lote', padrao: 1, limite: 0, op: 'gt', bloquear: true, msg: 'Cadastro retido até informar CPF' } },
    { id: 'RN-009', nome: 'Retenção de cupom por 5 anos', tipo: 'Financeiro', cond: 'cupom.emitido_em < now() - 5 anos', acao: 'Expurgar cupom após o prazo legal de retenção', prio: 'Baixa', exec: 120, falhas: 0, ativa: true, sim: { tipo: 'dias', dica: 'Dias desde a emissão do cupom', padrao: 365, limite: 1825, op: 'gt', bloquear: false, msg: 'Cupom elegível para expurgo' } },
    { id: 'RN-010', nome: 'Conciliação de cartão diária', tipo: 'Financeiro', cond: 'fechamento_pendente > 0 && hora >= 23', acao: 'Abrir ocorrência de conciliação com o adquirente', prio: 'Alta', exec: 30, falhas: 1, ativa: true, sim: { tipo: 'un', dica: 'Fechamentos pendentes', padrao: 1, limite: 0, op: 'gt', bloquear: false, msg: 'Conciliação automática disparada' } },
    { id: 'RN-011', nome: 'Bloqueio de fornecedor com atraso > 20%', tipo: 'Estoque', cond: 'fornecedor.taxa_atraso > 0.20 && pedidos_abertos > 0', acao: 'Bloquear novos pedidos e notificar compras', prio: 'Média', exec: 58, falhas: 0, ativa: false, sim: { tipo: 'pct', dica: 'Taxa de atraso do fornecedor', padrao: 22, limite: 20, op: 'gt', bloquear: true, msg: 'Fornecedor bloqueado para novos pedidos' } },
    { id: 'RN-012', nome: 'Escalonamento automático de OS crítica', tipo: 'OS', cond: 'os.prioridade == "critica" && sem_tecnico > 15min', acao: 'Notificar coordenação e plantão em até 15 minutos', prio: 'Crítica', exec: 89, falhas: 0, ativa: true, sim: { tipo: 'min', dica: 'Minutos sem técnico atribuído', padrao: 22, limite: 15, op: 'gt', bloquear: false, msg: 'OS crítica escalonada para coordenação' } }
  ];

  var FLAGS = [
    { chave: 'checkout_v2', desc: 'Novo checkout com PSP assíncrono e retry idempotente.', rollout: 25, ativa: true },
    { chave: 'fiscal_automatico', desc: 'Emissão automática de NFC-e com contingência SEFAZ.', rollout: 100, ativa: true },
    { chave: 'estoque_preditivo', desc: 'Previsão de demanda por gradient boosting por loja/SKU.', rollout: 10, ativa: true },
    { chave: 'os_whatsapp', desc: 'Notificações de OS via WhatsApp Business API.', rollout: 60, ativa: true },
    { chave: 'auditoria_fina', desc: 'Eventos de auditoria por campo com diff de payload.', rollout: 100, ativa: true },
    { chave: 'rate_limit_strict', desc: 'Limite de 50 req/s por tenant; rollout bloqueado pelo SRE.', rollout: 0, ativa: false }
  ];

  var ENV = [
    { chave: 'DATABASE_URL', real: 'postgres://lb_app:9f4c2a71@pg-primary.loja.internal:5432/loja', mask: 'postgres://lb_app:••••••@pg-primary.loja.internal:5432/loja', tipo: 'secret' },
    { chave: 'REDIS_URL', real: 'redis://:a81f3d9c@redis-cache.loja.internal:6379/0', mask: 'redis://:••••••@redis-cache.loja.internal:6379/0', tipo: 'secret' },
    { chave: 'JWT_SECRET', real: 'HS256:8d41c2f7b9aa6e10d3f5', mask: 'HS256:••••••••••••••••', tipo: 'secret' },
    { chave: 'SMTP_PASSWORD', real: 'smtp-9c2f4ae1', mask: '••••••••', tipo: 'secret' },
    { chave: 'S3_ACCESS_KEY', real: 'AKIA5T7Q2M4XZP6R', mask: 'AKIA••••••••••••', tipo: 'secret' },
    { chave: 'FEATURE_SALT', real: 'fs_71c9b2e8a4d0', mask: 'fs_••••••••••••', tipo: 'secret' },
    { chave: 'SENTRY_DSN', real: 'https://b7d1e4@o4507.ingest.sentry.io/450612', mask: 'https://••••••@o4507.ingest.sentry.io/450612', tipo: 'secret' },
    { chave: 'WEBHOOK_SECRET', real: 'whsec_4f8a1c92d7be', mask: 'whsec_••••••••••••', tipo: 'secret' },
    { chave: 'PG_POOL_MAX', real: '40', mask: '••', tipo: 'config' },
    { chave: 'LOG_LEVEL', real: 'info', mask: '••••', tipo: 'config' }
  ];

  var ENDPOINTS = [
    { metodo: 'GET', rota: '/v1/catalog/products', p95: 84, erro: 0.12, limite: '600/min', status: 'OK', chip: 'ok' },
    { metodo: 'POST', rota: '/v1/stock/reserve', p95: 112, erro: 0.31, limite: '240/min', status: 'OK', chip: 'ok' },
    { metodo: 'POST', rota: '/v1/sales/commit', p95: 186, erro: 0.48, limite: '120/min', status: 'OK', chip: 'ok' },
    { metodo: 'POST', rota: '/v1/fiscal/emit', p95: 284, erro: 1.92, limite: '90/min', status: 'ATENÇÃO', chip: 'low' },
    { metodo: 'GET', rota: '/v1/os', p95: 96, erro: 0.09, limite: '300/min', status: 'OK', chip: 'ok' },
    { metodo: 'POST', rota: '/v1/auth/token', p95: 61, erro: 0.04, limite: '180/min', status: 'OK', chip: 'ok' },
    { metodo: 'POST', rota: '/v1/webhooks/sefaz', p95: 412, erro: 3.40, limite: '60/min', status: 'DEGRADADO', chip: 'crit' },
    { metodo: 'GET', rota: '/internal/health', p95: 8, erro: 0.00, limite: '1200/min', status: 'OK', chip: 'ok' }
  ];

  var FILAS = [
    { nome: 'stock.sync', profundidade: 1284, consumidores: 8, lag: '240 ms', dlq: 0, status: 'OK', chip: 'ok' },
    { nome: 'os.events', profundidade: 312, consumidores: 4, lag: '90 ms', dlq: 0, status: 'OK', chip: 'ok' },
    { nome: 'fiscal.emit', profundidade: 2047, consumidores: 6, lag: '1,8 s', dlq: 2, status: 'ATENÇÃO', chip: 'low' },
    { nome: 'notifications', profundidade: 458, consumidores: 3, lag: '620 ms', dlq: 2, status: 'ATENÇÃO', chip: 'low' }
  ];

  var CATS_ATIVO = [
    { id: 'todos', nome: 'Todos' }, { id: 'refrigeracao', nome: 'Refrigeração' },
    { id: 'pdv', nome: 'PDV' }, { id: 'eletrica', nome: 'Elétrica' },
    { id: 'mobilidade', nome: 'Mobilidade' }, { id: 'seguranca', nome: 'Segurança' }
  ];

  var ATIVOS = [
    { tag: 'FRZ-01', nome: 'Freezer horizontal 503L', cat: 'refrigeracao', setor: 'Frios', criticidade: 'Alta', saude: 96, status: 'Operacional', mtbf: 4200, mttr: 4.2, prevencao: 22, garantia: 730, valor: 18900 },
    { tag: 'FRZ-02', nome: 'Freezer horizontal 503L', cat: 'refrigeracao', setor: 'Congelados', criticidade: 'Alta', saude: 88, status: 'Operacional', mtbf: 3900, mttr: 5.1, prevencao: 13, garantia: 500, valor: 18900 },
    { tag: 'FRZ-03', nome: 'Freezer horizontal 503L', cat: 'refrigeracao', setor: 'Congelados', criticidade: 'Alta', saude: 72, status: 'Atenção', mtbf: 3100, mttr: 6.4, prevencao: 7, garantia: 300, valor: 18900 },
    { tag: 'FRZ-04', nome: 'Freezer expositor 410L', cat: 'refrigeracao', setor: 'Frios', criticidade: 'Crítica', saude: 48, status: 'Degradado', mtbf: 2200, mttr: 7.8, prevencao: 3, garantia: -30, valor: 21400 },
    { tag: 'CAM-01', nome: 'Câmara frigorífica 12 m³', cat: 'refrigeracao', setor: 'Depósito', criticidade: 'Crítica', saude: 94, status: 'Operacional', mtbf: 6100, mttr: 8.2, prevencao: 59, garantia: 900, valor: 78000 },
    { tag: 'BAL-01', nome: 'Balcão refrigerado 2,0 m', cat: 'refrigeracao', setor: 'Açougue', criticidade: 'Alta', saude: 85, status: 'Operacional', mtbf: 3700, mttr: 5.6, prevencao: 47, garantia: 650, valor: 26500 },
    { tag: 'AC-01', nome: 'Ar-condicionado split 24.000 BTU', cat: 'refrigeracao', setor: 'Área de vendas', criticidade: 'Média', saude: 79, status: 'Atenção', mtbf: 5100, mttr: 4.0, prevencao: 55, garantia: 500, valor: 8900 },
    { tag: 'AC-02', nome: 'Ar-condicionado split 18.000 BTU', cat: 'refrigeracao', setor: 'Administrativo', criticidade: 'Baixa', saude: 91, status: 'Operacional', mtbf: 4800, mttr: 3.8, prevencao: 91, garantia: 400, valor: 7400 },
    { tag: 'PDV-01', nome: 'Terminal PDV com leitor 2D', cat: 'pdv', setor: 'Caixa', criticidade: 'Crítica', saude: 97, status: 'Operacional', mtbf: 7200, mttr: 2.1, prevencao: 31, garantia: 800, valor: 9800 },
    { tag: 'PDV-02', nome: 'Terminal PDV com leitor 2D', cat: 'pdv', setor: 'Caixa', criticidade: 'Crítica', saude: 93, status: 'Operacional', mtbf: 6900, mttr: 2.4, prevencao: 45, garantia: 800, valor: 9800 },
    { tag: 'PDV-03', nome: 'Terminal PDV com leitor 2D', cat: 'pdv', setor: 'Caixa', criticidade: 'Crítica', saude: 64, status: 'Degradado', mtbf: 4100, mttr: 5.2, prevencao: 6, garantia: -60, valor: 9800 },
    { tag: 'IMP-01', nome: 'Impressora fiscal térmica', cat: 'pdv', setor: 'Caixa', criticidade: 'Alta', saude: 89, status: 'Operacional', mtbf: 5800, mttr: 3.1, prevencao: 42, garantia: 450, valor: 4200 },
    { tag: 'IMP-02', nome: 'Impressora fiscal térmica', cat: 'pdv', setor: 'Caixa', criticidade: 'Média', saude: 76, status: 'Atenção', mtbf: 4900, mttr: 4.6, prevencao: 28, garantia: 30, valor: 4200 },
    { tag: 'BAL-02', nome: 'Balança eletrônica 30 kg', cat: 'pdv', setor: 'Hortifruti', criticidade: 'Média', saude: 90, status: 'Operacional', mtbf: 6200, mttr: 2.0, prevencao: 34, garantia: 300, valor: 3100 },
    { tag: 'NOB-01', nome: 'Nobreak 3 kVA', cat: 'eletrica', setor: 'Caixa', criticidade: 'Crítica', saude: 92, status: 'Operacional', mtbf: 8100, mttr: 1.8, prevencao: 15, garantia: 950, valor: 12400 },
    { tag: 'NOB-02', nome: 'Nobreak 1,5 kVA', cat: 'eletrica', setor: 'Administrativo', criticidade: 'Média', saude: 54, status: 'Em manutenção', mtbf: 3900, mttr: 5.4, prevencao: 3, garantia: -20, valor: 4800 },
    { tag: 'GER-01', nome: 'Gerador diesel 55 kVA', cat: 'eletrica', setor: 'Depósito', criticidade: 'Crítica', saude: 87, status: 'Operacional', mtbf: 12000, mttr: 12.5, prevencao: 32, garantia: 1200, valor: 68000 },
    { tag: 'QDR-01', nome: 'Quadro elétrico geral', cat: 'eletrica', setor: 'Depósito', criticidade: 'Crítica', saude: 95, status: 'Operacional', mtbf: 9500, mttr: 9.0, prevencao: 85, garantia: 1500, valor: 34000 },
    { tag: 'ILU-01', nome: 'Iluminação de emergência', cat: 'eletrica', setor: 'Área de vendas', criticidade: 'Média', saude: 81, status: 'Operacional', mtbf: 6800, mttr: 2.2, prevencao: 40, garantia: 280, valor: 6700 },
    { tag: 'EMP-01', nome: 'Empilhadeira elétrica 1,5 t', cat: 'mobilidade', setor: 'Depósito', criticidade: 'Alta', saude: 74, status: 'Atenção', mtbf: 3600, mttr: 10.8, prevencao: 16, garantia: 550, valor: 89000 },
    { tag: 'TRN-01', nome: 'Transpaleteira elétrica', cat: 'mobilidade', setor: 'Depósito', criticidade: 'Média', saude: 90, status: 'Operacional', mtbf: 4300, mttr: 6.2, prevencao: 56, garantia: 600, valor: 21500 },
    { tag: 'CFV-01', nome: 'Câmera IP CFTV 4MP', cat: 'seguranca', setor: 'Área de vendas', criticidade: 'Alta', saude: 99, status: 'Operacional', mtbf: 8700, mttr: 3.0, prevencao: 19, garantia: 900, valor: 3400 },
    { tag: 'CFV-02', nome: 'Câmera IP CFTV 4MP', cat: 'seguranca', setor: 'Estacionamento', criticidade: 'Média', saude: 62, status: 'Degradado', mtbf: 3500, mttr: 15.4, prevencao: 8, garantia: -90, valor: 3400 },
    { tag: 'ACF-01', nome: 'Controlador de acesso RFID', cat: 'seguranca', setor: 'Entrada', criticidade: 'Alta', saude: 86, status: 'Operacional', mtbf: 6100, mttr: 4.1, prevencao: 52, garantia: 750, valor: 5900 }
  ];

  /* @@PART2@@ */
})(window);
