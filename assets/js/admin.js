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
      h = ((h * 31) + str.charCodeAt(i)) | 0;
    }
    var hex = (h >>> 0).toString(16);
    while (hex.length < 8) hex = '0' + hex;
    return hex;
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
    { chave: 'S3_ACCESS_KEY', real: 'EXEMPLO-AWS-ACCESS-KEY-01', mask: 'EXEMPLO-••••••••••••', tipo: 'secret' },
    { chave: 'FEATURE_SALT', real: 'fs_71c9b2e8a4d0', mask: 'fs_••••••••••••', tipo: 'secret' },
    { chave: 'SENTRY_DSN', real: 'https://b7d1e4@o4507.ingest.sentry.io/450612', mask: 'https://••••••@o4507.ingest.sentry.io/450612', tipo: 'secret' },
    { chave: 'WEBHOOK_SECRET', real: 'exemplo-webhook-secret-01', mask: 'exemplo-••••••••••••', tipo: 'secret' },
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

  var INFRA_TIERS = [
    { label: 'Borda', nodes: [
      { nome: 'CDN', versao: 'CloudFront', meta: 'edge · 38 ms', dot: 'var(--green)' },
      { nome: 'WAF', versao: 'v18.4', meta: '6,2k req/min · 0,3% blq.', dot: 'var(--green)' },
      { nome: 'Load Balancer', versao: 'ALB 2.8', meta: 'p95 12 ms · 3 AZs', dot: 'var(--green)' }
    ] },
    { label: 'Aplicação', nodes: [
      { nome: 'API Gateway', versao: 'v2.14.3', meta: 'p95 38 ms', dot: 'var(--green)' },
      { nome: 'auth-svc', versao: 'v2.4.1', meta: 'p95 41 ms', dot: 'var(--green)' },
      { nome: 'catalog-svc', versao: 'v3.1.0', meta: 'p95 88 ms', dot: 'var(--green)' },
      { nome: 'stock-svc', versao: 'v2.8.4', meta: 'p95 74 ms', dot: 'var(--green)' },
      { nome: 'os-svc', versao: 'v1.9.2', meta: 'p95 112 ms', dot: 'var(--green)' },
      { nome: 'fiscal-svc', versao: 'v4.2.0', meta: 'p95 284 ms · 2/3 réplicas', dot: 'var(--amber)' },
      { nome: 'notify-svc', versao: 'v1.6.3', meta: 'p95 96 ms', dot: 'var(--green)' },
      { nome: 'Event Bus', versao: 'Kafka 3.8', meta: 'lag 1,8 s · 4 tópicos', dot: 'var(--amber)' }
    ] },
    { label: 'Dados', nodes: [
      { nome: 'PostgreSQL primary', versao: 'v16.4', meta: 'p95 21 ms · 32/40', dot: 'var(--green)' },
      { nome: 'PostgreSQL replica-1', versao: 'v16.4', meta: 'lag 0,4 s', dot: 'var(--green)' },
      { nome: 'PostgreSQL replica-2', versao: 'v16.4', meta: 'lag 42 s · degraded', dot: 'var(--red)', down: true, title: 'replica-2: lag de replicação de 42 s acima do limite de 10 s. Tráfego de leitura desviado para replica-1.' },
      { nome: 'Redis', versao: 'v7.4.1', meta: 'p95 4 ms · 96,4% hit', dot: 'var(--green)' },
      { nome: 'S3', versao: 'Object Lock', meta: '12,4 GB · 35 dias', dot: 'var(--green)' }
    ] },
    { label: 'Observabilidade', nodes: [
      { nome: 'Prometheus', versao: 'v2.55', meta: '148 targets', dot: 'var(--green)' },
      { nome: 'Grafana', versao: 'v11.2', meta: '22 dashboards', dot: 'var(--green)' },
      { nome: 'Loki', versao: 'v3.2', meta: '1,2 TB/mês', dot: 'var(--green)' },
      { nome: 'OTel Collector', versao: 'v0.112', meta: '48k spans/min', dot: 'var(--green)' }
    ] }
  ];

  var INFRA_SERVICOS = SERVICOS.concat([
    { nome: 'notify-svc', uptime: 99.992, p95: 96, replicas: '2/2', cpu: 38, mem: 57, versao: 'v1.6.3', status: 'OK' },
    { nome: 'catalog-svc', uptime: 99.996, p95: 88, replicas: '3/3', cpu: 47, mem: 62, versao: 'v3.1.0', status: 'OK' }
  ]).filter(function (s, i, arr) {
    return arr.map(function (x) { return x.nome; }).indexOf(s.nome) === i;
  });

  var DEPLOYS = [
    { commit: 'a1f9c2e', autor: 'marina.alves', env: 'produção', status: 'sucesso', duracao: '4 min 12 s', quando: 'há 41 min', chip: 'ok' },
    { commit: '7d2e8b1', autor: 'integracao.erp', env: 'produção', status: 'sucesso', duracao: '2 min 48 s', quando: 'há 3 h', chip: 'ok' },
    { commit: '91c40af', autor: 'sergio.pinto', env: 'staging', status: 'sucesso', duracao: '3 min 05 s', quando: 'há 5 h', chip: 'ok' },
    { commit: '3e77b02', autor: 'marina.alves', env: 'produção', status: 'revertido', duracao: '4 min 33 s', quando: 'há 1 d', chip: 'low' },
    { commit: 'b82d110', autor: 'diego.alves', env: 'produção', status: 'falha', duracao: '1 min 19 s', quando: 'há 1 d', chip: 'crit' }
  ];

  var SLOs = [
    { slo: 'Disponibilidade da API', alvo: '≥ 99,95%', atual: '99,982%', orcamento: 72, status: 'Dentro', chip: 'ok' },
    { slo: 'Latência p95 da API', alvo: '≤ 300 ms', atual: '184 ms', orcamento: 61, status: 'Dentro', chip: 'ok' },
    { slo: 'Taxa de erros 5xx', alvo: '≤ 0,50%', atual: '0,21%', orcamento: 58, status: 'Dentro', chip: 'ok' },
    { slo: 'Lag da fila fiscal.emit', alvo: '≤ 60 s', atual: '92 s', orcamento: 0, status: 'Estourado', chip: 'crit' },
    { slo: 'Sucesso de restauração', alvo: '≥ 99%', atual: '100%', orcamento: 100, status: 'Dentro', chip: 'ok' }
  ];

  var LOGS = [
    { nivel: 'INFO', cor: 'var(--green)', texto: 'request id=req_8f21 method=GET path=/v1/catalog/products status=200 duration=38ms' },
    { nivel: 'WARN', cor: 'var(--amber)', texto: 'fiscal-svc retry=2/3 sefaz timeout=30000ms nfe=352610...' },
    { nivel: 'INFO', cor: 'var(--green)', texto: 'stock-svc consumer lag=0.24s partition=3 topic=stock.sync' },
    { nivel: 'ERROR', cor: 'var(--red)', texto: 'replica-2 replication_lag=42s threshold=10s action=read_only' },
    { nivel: 'INFO', cor: 'var(--green)', texto: 'backup-pg completed size=12.4GB duration=760s target=s3://lb-backups' }
  ];

  var ACOES_AUDITORIA = {
    login: 'Login', alteracao_preco: 'Alteração de preço', exclusao_produto: 'Exclusão de produto',
    aprovacao_os: 'Aprovação de OS', feature_flag: 'Mudança de feature flag', exportacao_lgpd: 'Exportação LGPD',
    acesso_dado_sensivel: 'Acesso a dado sensível', rollback_deploy: 'Rollback de deploy',
    alteracao_regra: 'Alteração de regra', criacao_usuario: 'Criação de usuário',
    bloqueio_fornecedor: 'Bloqueio de fornecedor', reprocessamento_dlq: 'Reprocessamento de DLQ'
  };

  var PESSOAS = [
    { ator: 'marina.alves', papel: 'Gerente', ip: '10.14.2.31' },
    { ator: 'rafael.ito', papel: 'Operador de caixa', ip: '10.14.2.84' },
    { ator: 'bianca.melo', papel: 'DPO', ip: '10.14.2.19' },
    { ator: 'sergio.pinto', papel: 'SRE', ip: '10.14.3.12' },
    { ator: 'diego.alves', papel: 'Técnico PDV', ip: '10.14.8.55' },
    { ator: 'carlos.menezes', papel: 'Técnico elétrica', ip: '10.14.8.61' },
    { ator: 'joao.prado', papel: 'Supervisor', ip: '10.14.2.44' },
    { ator: 'elaine.souza', papel: 'Técnica', ip: '10.14.8.72' },
    { ator: 'sistema.scheduler', papel: 'Serviço', ip: '10.14.0.5' },
    { ator: 'integracao.erp', papel: 'Serviço', ip: '10.14.0.12' },
    { ator: 'audita.bot', papel: 'Compliance', ip: '10.14.0.21' },
    { ator: 'externo.fornecedor', papel: 'Fornecedor', ip: '189.45.112.7' }
  ];

  var EVENTOS_AUDITORIA = [
    { h: 0.12, p: 0, acao: 'login', ent: 'sessão web · MFA', res: 'sucesso' },
    { h: 0.35, p: 2, acao: 'exportacao_lgpd', ent: 'titular ***.452.118-**', res: 'sucesso' },
    { h: 0.75, p: 3, acao: 'rollback_deploy', ent: 'api-gateway v2.14.2', res: 'sucesso' },
    { h: 1.2, p: 0, acao: 'feature_flag', ent: 'checkout_v2 · rollout 25%', res: 'sucesso' },
    { h: 2.1, p: 4, acao: 'aprovacao_os', ent: 'OS-2026-1187 · R$ 1.240,00', res: 'sucesso' },
    { h: 2.8, p: 1, acao: 'alteracao_preco', ent: 'LB-BEB-1042 · R$ 4,49 → R$ 4,99', res: 'negado' },
    { h: 3.6, p: 8, acao: 'reprocessamento_dlq', ent: 'fiscal.emit · msg 7f2a', res: 'sucesso' },
    { h: 4.4, p: 6, acao: 'bloqueio_fornecedor', ent: 'F09 · atraso 21,4%', res: 'sucesso' },
    { h: 5.2, p: 0, acao: 'alteracao_regra', ent: 'RN-005 · limite 15%', res: 'sucesso' },
    { h: 6.1, p: 2, acao: 'acesso_dado_sensivel', ent: 'clientes · campo cpf', res: 'sucesso' },
    { h: 7.3, p: 11, acao: 'login', ent: 'portal B2B', res: 'negado' },
    { h: 8.5, p: 0, acao: 'exclusao_produto', ent: 'LB-PET-0098', res: 'sucesso' },
    { h: 10, p: 7, acao: 'aprovacao_os', ent: 'OS-2026-1164 · R$ 860,00', res: 'sucesso' },
    { h: 12, p: 1, acao: 'alteracao_preco', ent: 'LB-HIG-1002 · R$ 18,90 → R$ 16,90', res: 'negado' },
    { h: 14, p: 10, acao: 'exportacao_lgpd', ent: 'relatório DPO · out/2026', res: 'sucesso' },
    { h: 17, p: 0, acao: 'criacao_usuario', ent: 'usuário tiago.moraes', res: 'sucesso' },
    { h: 20, p: 8, acao: 'reprocessamento_dlq', ent: 'notifications · msg 2c9d', res: 'sucesso' },
    { h: 24, p: 2, acao: 'acesso_dado_sensivel', ent: 'titulares UE · export GDPR', res: 'sucesso' },
    { h: 29, p: 4, acao: 'aprovacao_os', ent: 'OS-2026-1131 · R$ 1.480,00', res: 'sucesso' },
    { h: 34, p: 3, acao: 'feature_flag', ent: 'rate_limit_strict · rollout 0%', res: 'sucesso' },
    { h: 40, p: 0, acao: 'rollback_deploy', ent: 'stock-svc v2.8.3', res: 'sucesso' },
    { h: 48, p: 6, acao: 'bloqueio_fornecedor', ent: 'F05 · atraso 14,2%', res: 'negado' },
    { h: 55, p: 1, acao: 'login', ent: 'PDV-02 · turno manhã', res: 'sucesso' },
    { h: 64, p: 2, acao: 'exportacao_lgpd', ent: 'titular ***.877.203-**', res: 'sucesso' },
    { h: 80, p: 8, acao: 'reprocessamento_dlq', ent: 'stock.sync · msg 91ab', res: 'sucesso' },
    { h: 96, p: 0, acao: 'alteracao_regra', ent: 'RN-011 · fornecedor > 20%', res: 'sucesso' },
    { h: 120, p: 10, acao: 'acesso_dado_sensivel', ent: 'auditoria · hash-chain', res: 'sucesso' },
    { h: 150, p: 3, acao: 'rollback_deploy', ent: 'notify-svc v1.6.2', res: 'falha' },
    { h: 190, p: 7, acao: 'aprovacao_os', ent: 'OS-2026-1042 · R$ 640,00', res: 'sucesso' },
    { h: 240, p: 0, acao: 'alteracao_preco', ent: 'LB-MER-1018 · R$ 27,90 → R$ 28,90', res: 'sucesso' }
  ];

  var AUDITORIA = (function () {
    var lista = EVENTOS_AUDITORIA.map(function (e, idx) {
      var p = PESSOAS[e.p];
      var ts = new Date(AGORA.getTime() - e.h * 3600000);
      return {
        ts: ts, ator: p.ator, papel: p.papel, ip: p.ip,
        acao: e.acao, acaoLabel: ACOES_AUDITORIA[e.acao], entidade: e.ent, resultado: e.res,
        hash: '', seq: idx
      };
    });
    var prev = '00000000';
    for (var i = lista.length - 1; i >= 0; i--) {
      var ev = lista[i];
      ev.hash = hash8(prev + '|' + ev.ator + '|' + ev.acao + '|' + ev.entidade + '|' + ev.ts.getTime());
      prev = ev.hash;
    }
    return lista;
  })();

  var DLQ = [
    { id: 'dlq_01', topico: 'fiscal.emit', motivo: 'timeout', detalhe: 'SEFAZ não respondeu em 30 s após 3 tentativas', tentativas: 3, recebida: new Date(AGORA.getTime() - 14 * 60000) },
    { id: 'dlq_02', topico: 'stock.sync', motivo: 'schema inválido', detalhe: 'Campo "saldo" chegou como string em stock.updated.v2', tentativas: 1, recebida: new Date(AGORA.getTime() - 47 * 60000) },
    { id: 'dlq_03', topico: 'notifications', motivo: '5xx', detalhe: 'Provedor WhatsApp retornou 503 em 3 tentativas', tentativas: 3, recebida: new Date(AGORA.getTime() - 78 * 60000) },
    { id: 'dlq_04', topico: 'fiscal.emit', motivo: 'poison message', detalhe: 'Mesmo message-id reentregue 12 vezes sem avanço', tentativas: 12, recebida: new Date(AGORA.getTime() - 96 * 60000) }
  ];

  /* ------------------------------------------------------------------ *
   * 3. Estado                                                           *
   * ------------------------------------------------------------------ */
  var S = {
    montado: false, raiz: null, aba: 'visao', rootId: 'adminRoot', geracao: 0,
    regrasFiltro: 'todas', ativosFiltro: 'todos', envRevelado: false,
    auditAtor: 'todos', auditAcao: 'todas', auditPeriodo: '30d', auditBusca: '',
    intervalos: [],
    stream: {
      timer: null, rodando: false, tick: 0, seq: 0, falhaTicks: 0,
      msgsMin: 94, latP95: 184, latP50: 64, taxaErro: 1.8, reconexoes: 3,
      hist: { labels: [], throughput: [], p50: [], p95: [] }
    }
  };

  var DADOS_ADMIN = {
    geradoEm: AGORA, servicos: SERVICOS, jobs: JOBS, alertas: ALERTAS, frameworks: FRAMEWORKS,
    controles: CONTROLES, retencao: RETENCAO, riscos: RISCOS, lgpd: LGPD, regras: REGRAS,
    flags: FLAGS, env: ENV, endpoints: ENDPOINTS, filas: FILAS, ativos: ATIVOS,
    deploys: DEPLOYS, slos: SLOs, logs: LOGS, auditoria: AUDITORIA, dlq: DLQ,
    transmissao: null, estado: S
  };

  /* ------------------------------------------------------------------ *
   * 4. Blocos HTML                                                      *
   * ------------------------------------------------------------------ */
  function kpiHTML(o) {
    return '<article class="admin-kpi" style="--kpi-accent:' + (o.cor || 'var(--brand)') + '">' +
      '<div class="admin-kpi__label">' + esc(o.label) + '</div>' +
      '<div class="admin-kpi__value"' + (o.valorId ? ' id="' + o.valorId + '"' : '') + '>' + o.valor + '</div>' +
      '<div class="admin-kpi__foot">' + esc(o.foot || '') + '</div>' +
      '<span class="admin-kpi__icon" style="color:' + (o.cor || 'var(--brand)') + '">' + ico(o.icone) + '</span>' +
      '</article>';
  }

  function tabelaJobsHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Job</th><th scope="col">Cron</th><th scope="col">Próxima</th>' +
      '<th scope="col">Duração</th><th scope="col">Status</th></tr></thead><tbody>' +
      JOBS.map(function (j) {
        return '<tr><td class="table__primary">' + esc(j.job) + '</td>' +
          '<td class="mono" style="white-space:nowrap">' + esc(j.cron) + '</td>' +
          '<td>' + esc(j.proxima) + '</td>' +
          '<td class="num">' + esc(j.duracao) + '</td>' +
          '<td>' + chip(j.status, j.status === 'sucesso' ? 'ok' : 'low', true) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function alertasHTML() {
    return '<div class="alerts">' + ALERTAS.map(function (a) {
      var cor = a.tipo === 'crit' ? 'var(--red)' : a.tipo === 'low' ? 'var(--amber)' : a.tipo === 'info' ? 'var(--blue)' : 'var(--brand)';
      return '<div class="alert" style="--a-color:' + cor + '" title="' + esc(a.detalhe) + '">' +
        '<span class="alert__icon">' + ico(a.icone) + '</span>' +
        '<div><div class="alert__title">' + esc(a.titulo) + '</div>' +
        '<div class="alert__desc">' + esc(a.origem) + ' · ' + esc(a.quando) + '</div></div>' +
        '<span class="alert__tag">' + chip(a.sev, a.tipo, false) + '</span></div>';
    }).join('') + '</div>';
  }

  function trilhaHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Quando</th><th scope="col">Ator</th><th scope="col">Ação</th>' +
      '<th scope="col">Entidade</th><th scope="col">Resultado</th><th scope="col">Hash</th></tr></thead><tbody>' +
      AUDITORIA.slice(0, 5).map(function (e) {
        return '<tr><td class="mono">' + esc(dataHoraCurta(e.ts)) + '</td>' +
          '<td class="table__primary">' + esc(e.ator) + '</td>' +
          '<td>' + esc(e.acaoLabel) + '</td>' +
          '<td class="mono" title="' + esc(e.entidade) + '">' + esc(e.entidade) + '</td>' +
          '<td>' + chip(e.resultado, e.resultado === 'sucesso' ? 'ok' : 'crit', false) + '</td>' +
          '<td class="mono">' + esc(e.hash) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function frameworksHTML() {
    return '<div class="admin-grid admin-grid--2">' + FRAMEWORKS.map(function (f) {
      return '<article class="card"><header class="card__head"><div><h2>' + esc(f.nome) + '</h2>' +
        '<p class="card__sub">' + esc(f.base) + '</p></div>' + chip(f.pct + '%', f.chip, false) + '</header>' +
        '<div class="mini-bar" role="img" aria-label="Aderência de ' + f.pct + '%"><i style="width:' + f.pct + '%;background:' + f.cor + '"></i></div>' +
        '<div class="kv" style="margin-top:12px">' +
        '<div class="kv__row"><span class="kv__k">Status</span><span class="kv__v">' + chip(f.status, f.chip, true) + '</span></div>' +
        '<div class="kv__row"><span class="kv__k">Responsável</span><span class="kv__v">' + esc(f.owner) + '</span></div>' +
        '<div class="kv__row"><span class="kv__k">Próxima auditoria</span><span class="kv__v">' + esc(dataCurta(f.proxima)) + '</span></div>' +
        '</div></article>';
    }).join('') + '</div>';
  }

  function controlesHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">ID</th><th scope="col">Controle</th><th scope="col">Framework</th><th scope="col">Responsável</th>' +
      '<th scope="col">Evidência</th><th scope="col">Revisão</th><th scope="col">Status</th></tr></thead><tbody>' +
      CONTROLES.map(function (c) {
        return '<tr><td class="mono">' + c.id + '</td>' +
          '<td class="table__primary" title="' + esc(c.controle) + '">' + esc(c.controle) + '</td>' +
          '<td>' + esc(c.fw) + '</td><td>' + esc(c.owner) + '</td>' +
          '<td class="muted" title="' + esc(c.evid) + '">' + esc(c.evid) + '</td>' +
          '<td>' + esc(dataCurta(c.revisao)) + '</td>' +
          '<td>' + chip(c.status, c.chip, false) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function retencaoHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Dado</th><th scope="col">Base legal</th><th scope="col">Retenção</th>' +
      '<th scope="col">Anonimização</th><th scope="col">Status</th></tr></thead><tbody>' +
      RETENCAO.map(function (r) {
        return '<tr><td class="table__primary">' + esc(r.dado) + '</td>' +
          '<td class="muted">' + esc(r.base) + '</td><td>' + esc(r.ret) + '</td>' +
          '<td class="muted">' + esc(r.anon) + '</td><td>' + chip(r.status, r.chip, false) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function riscoHTML() {
    var porCelula = {};
    RISCOS.forEach(function (r) { porCelula[r.p + '-' + r.i] = r; });
    var cells = '';
    for (var p = 5; p >= 1; p--) {
      for (var i = 1; i <= 5; i++) {
        var score = p * i;
        var cls = score >= 15 ? 'crit' : score >= 10 ? 'high' : score >= 5 ? 'med' : 'low';
        var risco = porCelula[p + '-' + i];
        var titulo = 'Probabilidade ' + p + ' × Impacto ' + i + ' · score ' + score;
        if (risco) titulo += ' · ' + risco.id + ': ' + risco.nome;
        cells += '<div class="risk-cell risk-cell--' + cls + '" role="gridcell" title="' + esc(titulo) + '" aria-label="' + esc(titulo) + '">' +
          (risco ? '<span>' + risco.id + '</span>' : '') + '</div>';
      }
    }
    return '<div class="risk-grid" role="grid" aria-label="Matriz de risco 5 por 5">' + cells + '</div>' +
      '<p class="card__sub" style="margin-top:10px">Probabilidade (linhas, 5 → 1) × Impacto (colunas, 1 → 5). Score = P × I.</p>' +
      '<div class="card__legend" style="margin-top:8px">' +
      '<span><i style="background:var(--green)"></i>Baixo 1–4</span>' +
      '<span><i style="background:var(--amber)"></i>Médio 5–9</span>' +
      '<span><i style="background:var(--orange,#f97316)"></i>Alto 10–14</span>' +
      '<span><i style="background:var(--red)"></i>Crítico ≥ 15</span></div>';
  }

  function lgpdHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Titular</th><th scope="col">Tipo de solicitação</th><th scope="col">Prazo</th><th scope="col">Status</th></tr></thead><tbody>' +
      LGPD.map(function (l) {
        return '<tr><td class="mono">' + esc(l.titular) + '</td><td class="table__primary">' + esc(l.tipo) + '</td>' +
          '<td>' + esc(dataCurta(l.prazo)) + '</td><td>' + chip(l.status, l.chip, false) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function regraHTML(r) {
    var ativa = r.ativa;
    return '<article class="rule' + (ativa ? '' : ' is-off') + '" data-rule-card="' + r.id + '">' +
      '<div class="rule__head"><span class="rule__id">' + r.id + '</span>' +
      '<span class="rule__name">' + esc(r.nome) + '</span>' +
      chip(r.tipo, 'muted', false) + '<span class="rule__prio">' + chip('Prioridade ' + r.prio, r.prio === 'Crítica' ? 'crit' : r.prio === 'Alta' ? 'low' : 'muted', false) + '</span></div>' +
      '<div class="rule__cond">' + esc(r.cond) + '</div>' +
      '<div class="rule__meta"><span>Ação: ' + esc(r.acao) + '</span><span>Execuções 24h: ' + numero(r.exec) + '</span>' +
      '<span>Falhas: <b style="color:' + (r.falhas ? 'var(--red)' : 'var(--muted)') + '">' + r.falhas + '</b></span></div>' +
      '<div class="rule__actions"><span class="chip ' + (ativa ? 'chip--ok' : 'chip--muted') + '" data-rule-state>' + (ativa ? 'Ativa' : 'Pausada') + '</span>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-rule-sim="' + r.id + '">Testar regra</button>' +
      '<label class="switch" title="' + (ativa ? 'Desativar' : 'Ativar') + ' regra ' + r.id + '">' +
      '<input type="checkbox" data-rule-toggle="' + r.id + '"' + (ativa ? ' checked' : '') + ' aria-label="Ativar regra ' + r.id + '"><span></span></label>' +
      '</div></article>';
  }

  function regrasHTML(filtro) {
    var lista = REGRAS.filter(function (r) { return !filtro || filtro === 'todas' || r.tipo === filtro; });
    if (!lista.length) return '<p class="hint">Nenhuma regra neste tipo.</p>';
    return lista.map(regraHTML).join('');
  }

  function contadorRegras() {
    var ativas = REGRAS.filter(function (r) { return r.ativa; }).length;
    return ativas + '/' + REGRAS.length + ' ativas';
  }

  function simuladorHTML() {
    var opts = REGRAS.map(function (r) { return '<option value="' + r.id + '">' + r.id + ' · ' + esc(r.nome) + '</option>'; }).join('');
    return '<article class="card"><header class="card__head"><div><h2>Simulador de regra</h2>' +
      '<p class="card__sub">Avalia uma entrada contra o motor de políticas, sem persistir alterações.</p></div>' +
      chip('sandbox', 'violet', false) + '</header>' +
      '<div class="admin-toolbar"><label class="hint" for="adminSimRule">Regra</label>' +
      '<select class="select" id="adminSimRule" aria-label="Regra a simular">' + opts + '</select></div>' +
      '<div class="admin-toolbar" style="margin-top:10px"><label class="hint" for="adminSimInput" id="adminSimLabel">Entrada</label>' +
      '<div class="search">' + ico('i-target') + '<input id="adminSimInput" type="number" step="0.01" value="4" aria-label="Valor de entrada" style="width:150px"></div>' +
      '<button type="button" class="btn btn--soft btn--sm" data-sim-run="1">' + ico('i-command') + 'Testar</button></div>' +
      '<p class="hint" id="adminSimHint" style="margin-top:8px"></p>' +
      '<div id="adminSimResult" aria-live="polite" style="margin-top:12px">' +
      '<div class="rule is-off"><div class="rule__head"><span class="rule__id">SIM</span><span class="rule__name">Aguardando teste</span>' + chip('não executado', 'muted', false) + '</div>' +
      '<div class="rule__meta">Selecione uma regra, informe a entrada e clique em Testar.</div></div></div></article>';
  }

  function execucoesHTML() {
    var linhas = [
      ['RN-003', 'OS-2026-1187 · R$ 1.240,00', 'Bloqueado', '1,2 ms'],
      ['RN-005', 'Cupom 88213 · 18% desconto', 'Bloqueado', '0,9 ms'],
      ['RN-001', 'LB-BEB-1042 · cobertura 4 d', 'Ação', '1,4 ms'],
      ['RN-012', 'OS-2026-1187 · 22 min', 'Ação', '1,1 ms'],
      ['RN-002', 'LB-CON-1007 · saldo 0', 'Bloqueado', '0,7 ms'],
      ['RN-007', 'NFe 352610... · duplicada', 'Bloqueado', '1,6 ms'],
      ['RN-009', 'Cupom 44190 · 1.912 dias', 'Ação', '0,8 ms'],
      ['RN-010', 'Fechamento 20/10 · pendente', 'Ação', '1,0 ms']
    ];
    var horas = [2, 9, 17, 26, 38, 55, 73, 96];
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Timestamp</th><th scope="col">Regra</th><th scope="col">Entrada</th><th scope="col">Resultado</th><th scope="col">Duração</th></tr></thead><tbody>' +
      linhas.map(function (l, i) {
        var ts = new Date(AGORA.getTime() - horas[i] * 60000);
        var tipo = l[2] === 'Bloqueado' ? 'crit' : 'info';
        return '<tr><td class="mono">' + esc(horaSeg(ts)) + '</td><td class="mono">' + l[0] + '</td>' +
          '<td class="mono" title="' + esc(l[1]) + '">' + esc(l[1]) + '</td><td>' + chip(l[2], tipo, false) + '</td>' +
          '<td class="num">' + l[3] + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function flagsHTML() {
    return FLAGS.map(function (f) {
      return '<div class="flag' + (f.ativa ? '' : ' is-off') + '" data-flag-card="' + f.chave + '">' +
        '<div class="flag__info"><strong class="mono">' + f.chave + '</strong><p>' + esc(f.desc) + '</p>' +
        '<div class="flag__meta"><span class="chip chip--info">rollout ' + f.rollout + '%</span>' +
        '<span class="chip ' + (f.ativa ? 'chip--ok' : 'chip--muted') + '" data-flag-state>' + (f.ativa ? 'ativa' : 'pausada') + '</span></div></div>' +
        '<label class="switch" title="' + (f.ativa ? 'Pausar' : 'Ativar') + ' ' + f.chave + '">' +
        '<input type="checkbox" data-flag-toggle="' + f.chave + '"' + (f.ativa ? ' checked' : '') + ' aria-label="Ativar feature flag ' + f.chave + '"><span></span></label></div>';
    }).join('');
  }

  function envHTML() {
    return '<div class="envbox">' + ENV.map(function (e) {
      return '<div class="env-row" data-env-row="' + e.chave + '"><span class="env-key">' + e.chave + '</span>' +
        '<span class="env-val" data-env-val="' + e.chave + '" title="Use Revelar para ver o valor">' + esc(e.mask) + '</span>' +
        '<span class="chip ' + (e.tipo === 'secret' ? 'chip--low' : 'chip--muted') + '">' + (e.tipo === 'secret' ? 'secret' : 'config') + '</span></div>';
    }).join('') + '</div>';
  }

  function endpointsHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Método</th><th scope="col">Rota</th><th scope="col">p95</th><th scope="col">Erro</th>' +
      '<th scope="col">Rate limit</th><th scope="col">Status</th></tr></thead><tbody>' +
      ENDPOINTS.map(function (e) {
        return '<tr><td class="mono">' + e.metodo + '</td><td class="mono">' + esc(e.rota) + '</td>' +
          '<td class="num">' + numero(e.p95) + ' ms</td><td class="num">' + decimal(e.erro) + '%</td>' +
          '<td class="mono">' + esc(e.limite) + '</td><td>' + chip(e.status, e.chip, false) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function dbCacheHTML() {
    return '<div class="kv">' +
      '<div class="kv__row"><span class="kv__k">Pool PostgreSQL</span><span class="kv__v">32 / 40 conexões ' + chip('80%', 'ok', false) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Conexões ativas</span><span class="kv__v">39 · 27 primary + 12 réplica</span></div>' +
      '<div class="kv__row"><span class="kv__k">Slow queries (&gt; 200 ms)</span><span class="kv__v">6 ' + chip('atenção', 'low', false) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Migrations pendentes</span><span class="kv__v" title="2026_10_18_idx_os_status; 2026_10_20_drop_legacy">2</span></div>' +
      '<div class="kv__row"><span class="kv__k">Último backup</span><span class="kv__v">' + esc(dataCurta(AGORA)) + ' · 02:00 · 12,4 GB</span></div>' +
      '<div class="kv__row"><span class="kv__k">Cache hit rate</span><span class="kv__v">96,4% ' + chip('saudável', 'ok', false) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Memória Redis</span><span class="kv__v">3,8 / 8 GB · 47%</span></div>' +
      '<div class="kv__row"><span class="kv__k">Eviction</span><span class="kv__v">0 · volatile-lru</span></div>' +
      '</div>';
  }

  function filasHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Fila</th><th scope="col">Profundidade</th><th scope="col">Consumidores</th>' +
      '<th scope="col">Lag</th><th scope="col">DLQ</th><th scope="col">Status</th></tr></thead><tbody>' +
      FILAS.map(function (f) {
        return '<tr><td class="mono">' + esc(f.nome) + '</td><td class="num">' + numero(f.profundidade) + '</td>' +
          '<td class="num">' + f.consumidores + '</td><td class="num">' + esc(f.lag) + '</td>' +
          '<td class="num">' + f.dlq + '</td><td>' + chip(f.status, f.chip, false) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function contratosHTML() {
    var contratos = [
      ['stock.updated', 'v2', 'stock.updated.v2.json', 'Retrocompatível (aditivo)', 'stock-svc, catalog-svc, analytics'],
      ['os.created', 'v3', 'os.created.v3.avsc', 'Breaking desde v2 (campo required)', 'os-svc, notify-svc, bi-warehouse'],
      ['sale.committed', 'v2', 'sale.committed.v2.json', 'Retrocompatível', 'fiscal-svc, stock-svc, loyalty'],
      ['fiscal.emit', 'v4', 'fiscal.emit.v4.xsd', 'Compatível com NFe 4.00', 'fiscal-svc, sefaz-gateway'],
      ['inventory.counted', 'v1', 'inventory.counted.v1.json', 'Em maturação (beta)', 'stock-svc, analytics']
    ];
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Evento</th><th scope="col">Versão</th><th scope="col">Schema</th>' +
      '<th scope="col">Compatibilidade</th><th scope="col">Consumidores</th></tr></thead><tbody>' +
      contratos.map(function (c) {
        return '<tr><td class="table__primary mono">' + c[0] + '</td><td>' + chip(c[1], 'violet', false) + '</td>' +
          '<td class="mono">' + c[2] + '</td><td class="muted">' + c[3] + '</td><td class="muted">' + c[4] + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function dlqHTML() {
    return '<article class="card"><header class="card__head"><div><h2>Dead letter queue</h2>' +
      '<p class="card__sub">Mensagens que esgotaram as tentativas e exigem intervenção.</p></div>' +
      '<span class="chip chip--crit" id="adminDlqCount">' + DLQ.length + ' mensagens</span></header>' +
      '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Tópico</th><th scope="col">Motivo</th><th scope="col">Detalhe</th>' +
      '<th scope="col">Tentativas</th><th scope="col">Recebida</th><th scope="col">Ação</th></tr></thead>' +
      '<tbody id="adminDlqBody"></tbody></table></div></article>';
  }

  function ativosTabelaHTML(filtro) {
    var lista = ATIVOS.filter(function (a) { return !filtro || filtro === 'todos' || a.cat === filtro; });
    if (!lista.length) return '<tr><td colspan="12" class="muted">Nenhum ativo nesta categoria.</td></tr>';
    return lista.map(function (a) {
      var corSaude = a.saude >= 85 ? 'var(--green)' : a.saude >= 70 ? 'var(--amber)' : 'var(--red)';
      var corStatus = a.status === 'Operacional' ? 'ok' : a.status === 'Atenção' ? 'low' : a.status === 'Em manutenção' ? 'violet' : 'crit';
      var garantiaFora = diasAte(dataRel(a.garantia)) < 0;
      return '<tr><td class="mono" style="white-space:nowrap">' + a.tag + '</td>' +
        '<td class="table__primary" title="' + esc(a.nome) + '">' + esc(a.nome) + '</td>' +
        '<td>' + esc(nomeCategoria(a.cat)) + '</td><td>' + esc(a.setor) + '</td>' +
        '<td>' + chip(a.criticidade, a.criticidade === 'Crítica' ? 'crit' : a.criticidade === 'Alta' ? 'low' : 'muted', false) + '</td>' +
        '<td><div class="asset-health"><span class="mono">' + a.saude + '%</span><div class="health-bar" role="img" aria-label="Saúde ' + a.saude + '%"><i style="width:' + a.saude + '%;background:' + corSaude + '"></i></div></div></td>' +
        '<td>' + chip(a.status, corStatus, false) + '</td>' +
        '<td class="num">' + numero(a.mtbf) + '</td><td class="num">' + decimal(a.mttr) + '</td>' +
        '<td>' + esc(dataCurta(dataRel(a.prevencao))) + '</td>' +
        '<td title="Vigência até ' + esc(dataBR(dataRel(a.garantia))) + '">' + esc(mesAno(dataRel(a.garantia))) +
        (garantiaFora ? '<span class="table__sub" style="color:var(--red)">fora da garantia</span>' : '') + '</td>' +
        '<td><button type="button" class="btn btn--sm btn--ghost" data-asset-os="' + a.tag + '">Abrir OS</button></td></tr>';
    }).join('');
  }

  function nomeCategoria(id) {
    var c = CATS_ATIVO.filter(function (x) { return x.id === id; })[0];
    return c ? c.nome : id;
  }

  function cicloVidaHTML() {
    var fora = ATIVOS.filter(function (a) { return diasAte(dataRel(a.garantia)) < 0; }).length;
    return '<div class="kv">' +
      '<div class="kv__row"><span class="kv__k">Vida útil média</span><span class="kv__v">8,4 anos</span></div>' +
      '<div class="kv__row"><span class="kv__k">Depreciação anual</span><span class="kv__v">' + moeda(148200) + ' · linear 12,5%</span></div>' +
      '<div class="kv__row"><span class="kv__k">Ativos fora da garantia</span><span class="kv__v">' + fora + ' ' + chip('revisar', 'low', false) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Próximas substituições</span><span class="kv__v">FRZ-04 · ' + esc(mesAno(dataRel(60))) + '; PDV-03 · ' + esc(mesAno(dataRel(150))) + '; CFV-02 · ' + esc(mesAno(dataRel(270))) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">CAPEX previsto 12m</span><span class="kv__v">' + moeda(286400) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Valor residual estimado</span><span class="kv__v">' + moedaCurta(412900) + '</span></div>' +
      '</div>';
  }

  function diagramaHTML() {
    return '<div class="diagram">' + INFRA_TIERS.map(function (t, idx) {
      return '<div class="diagram__tier"><div class="diagram__tier-label">' + esc(t.label) + '</div><div class="diagram__nodes">' +
        t.nodes.map(function (n) {
          return '<div class="node' + (n.down ? ' is-down' : '') + '"' + (n.title ? ' title="' + esc(n.title) + '"' : '') + '>' +
            '<span class="node__dot" style="background:' + n.dot + '"></span>' +
            '<span class="node__name">' + esc(n.nome) + '</span>' +
            '<span class="node__meta">' + esc(n.versao) + ' · ' + esc(n.meta) + '</span></div>';
        }).join('') + '</div></div>' +
        (idx < INFRA_TIERS.length - 1 ? '<div class="diagram__link" aria-hidden="true"></div>' : '');
    }).join('') + '</div>';
  }

  function servicosInfraHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Serviço</th><th scope="col">Réplicas</th><th scope="col">CPU</th><th scope="col">Memória</th>' +
      '<th scope="col">Versão</th><th scope="col">Uptime</th><th scope="col">p95</th><th scope="col">Status</th></tr></thead><tbody>' +
      INFRA_SERVICOS.map(function (s) {
        var cpuCor = s.cpu >= 80 ? 'var(--red)' : s.cpu >= 60 ? 'var(--amber)' : 'var(--green)';
        var memCor = s.mem >= 80 ? 'var(--red)' : s.mem >= 65 ? 'var(--amber)' : 'var(--green)';
        return '<tr><td class="table__primary mono">' + esc(s.nome) + '</td><td>' + s.replicas + '</td>' +
          '<td><div class="coverage"><div class="mini-bar"><i style="width:' + s.cpu + '%;background:' + cpuCor + '"></i></div><b>' + s.cpu + '%</b></div></td>' +
          '<td><div class="coverage"><div class="mini-bar"><i style="width:' + s.mem + '%;background:' + memCor + '"></i></div><b>' + s.mem + '%</b></div></td>' +
          '<td class="mono">' + esc(s.versao) + '</td><td class="num">' + s.uptime.toFixed(3).replace('.', ',') + '%</td>' +
          '<td class="num">' + s.p95 + ' ms</td><td>' + chip(s.status, s.status === 'OK' ? 'ok' : 'low', false) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function deploysHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Commit</th><th scope="col">Autor</th><th scope="col">Ambiente</th><th scope="col">Status</th>' +
      '<th scope="col">Duração</th><th scope="col">Quando</th><th scope="col">Ação</th></tr></thead><tbody>' +
      DEPLOYS.map(function (d) {
        return '<tr><td class="mono">' + d.commit + '</td><td>' + esc(d.autor) + '</td><td>' + esc(d.env) + '</td>' +
          '<td>' + chip(d.status, d.chip, false) + '</td><td class="num">' + d.duracao + '</td><td class="muted">' + d.quando + '</td>' +
          '<td><button type="button" class="btn btn--sm btn--danger" data-deploy-rollback="' + d.commit + '">Rollback</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function backupHTML() {
    return '<div class="kv">' +
      '<div class="kv__row"><span class="kv__k">RPO</span><span class="kv__v">15 min · WAL streaming</span></div>' +
      '<div class="kv__row"><span class="kv__k">RTO</span><span class="kv__v">2 h · runbook DR-02</span></div>' +
      '<div class="kv__row"><span class="kv__k">Último backup</span><span class="kv__v">' + esc(dataCurta(AGORA)) + ' · 02:00 · 12,4 GB</span></div>' +
      '<div class="kv__row"><span class="kv__k">Último teste de restauração</span><span class="kv__v">' + esc(dataCurta(dataRel(-2))) + ' · 11 min 40 s</span></div>' +
      '<div class="kv__row"><span class="kv__k">Região DR</span><span class="kv__v">sa-east-1b · ativa-passiva</span></div>' +
      '<div class="kv__row"><span class="kv__k">Retenção</span><span class="kv__v">35 dias (diário) + 12 meses (mensal)</span></div></div>';
  }

  function slosHTML() {
    return '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">SLO</th><th scope="col">Alvo</th><th scope="col">Atual</th><th scope="col">Orçamento de erro</th><th scope="col">Status</th></tr></thead><tbody>' +
      SLOs.map(function (s) {
        var cor = s.orcamento >= 50 ? 'var(--green)' : s.orcamento > 0 ? 'var(--amber)' : 'var(--red)';
        return '<tr><td class="table__primary">' + esc(s.slo) + '</td><td>' + esc(s.alvo) + '</td>' +
          '<td class="num">' + esc(s.atual) + '</td><td><div class="coverage"><div class="mini-bar"><i style="width:' + s.orcamento + '%;background:' + cor + '"></i></div><b>' + s.orcamento + '%</b></div></td>' +
          '<td>' + chip(s.status, s.chip, false) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function logsHTML() {
    return '<div class="stream__json" style="display:block;margin:0;padding:12px;max-height:220px;overflow:auto">' +
      LOGS.map(function (l) {
        return '<div style="white-space:pre;font-family:var(--mono);font-size:12px;color:var(--text-2)">' + esc(horaSeg(new Date(AGORA.getTime() - (LOGS.indexOf(l) + 1) * 45000))) +
          ' <span style="color:' + l.cor + ';font-weight:700">[' + l.nivel + ']</span> ' + esc(l.texto) + '</div>';
      }).join('') + '</div>';
  }

  function integridadeHTML() {
    return '<div class="kv">' +
      '<div class="kv__row"><span class="kv__k">Modelo</span><span class="kv__v">SHA-256 · hash-chain por evento</span></div>' +
      '<div class="kv__row"><span class="kv__k">Último selo</span><span class="kv__v mono" id="adminSelo">' + esc(AUDITORIA[0].hash) + ' · ' + esc(horaSeg(AUDITORIA[0].ts)) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Verificações 24h</span><span class="kv__v">' + numero(12480) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Falhas de integridade</span><span class="kv__v">0 ' + chip('íntegra', 'ok', true) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Próximo selo</span><span class="kv__v">a cada 15 min · ' + esc(hora(new Date(AGORA.getTime() + 15 * 60000))) + '</span></div>' +
      '<div class="kv__row"><span class="kv__k">Janela imutável</span><span class="kv__v">12 meses · S3 Object Lock (WORM)</span></div></div>';
  }

  /* ------------------------------------------------------------------ *
   * 5. Painéis                                                          *
   * ------------------------------------------------------------------ */
  function painelVisao() {
    var criticos = ATIVOS.filter(function (a) { return a.saude < 60; }).length;
    var regrasAtivas = REGRAS.filter(function (r) { return r.ativa; }).length;
    var kpis =
      kpiHTML({ label: 'Uptime 30d', valor: '99,982%', foot: 'SLO 99,95% · +0,032 p.p.', cor: 'var(--green)', icone: 'i-trend-up' }) +
      kpiHTML({ label: 'Incidentes abertos', valor: '3', foot: '1 crítico · 2 em atenção', cor: 'var(--amber)', icone: 'i-alert' }) +
      kpiHTML({ label: 'Conformidade global', valor: '92%', foot: 'média ponderada · 4 frameworks', cor: 'var(--violet)', icone: 'i-check' }) +
      kpiHTML({ label: 'Regras ativas', valor: regrasAtivas + '/' + REGRAS.length, foot: (REGRAS.length - regrasAtivas) + ' em revisão pelo compliance', cor: 'var(--blue)', icone: 'i-filter' }) +
      kpiHTML({ label: 'Ativos críticos', valor: String(criticos), foot: 'de 24 ativos monitorados', cor: 'var(--red)', icone: 'i-box' }) +
      kpiHTML({ label: 'DLQ', valor: String(DLQ.length), valorId: 'adminKpiVisaoDlq', foot: 'fiscal.emit 2 · notifications 2', cor: 'var(--amber)', icone: 'i-layers' });

    return '<div class="admin-kpis">' + kpis + '</div>' +
      '<div class="admin-grid admin-grid--2">' +
        '<article class="card"><header class="card__head"><div><h2>Saúde dos serviços</h2>' +
        '<p class="card__sub">Uptime de 30 dias por serviço · produção-sim</p></div>' + chip('99,982%', 'ok', true) + '</header>' +
        '<div class="chart-wrap"><canvas id="chAdminServicos" role="img" aria-label="Uptime por serviço"></canvas></div></article>' +
        '<article class="card"><header class="card__head"><div><h2>Conformidade por framework</h2>' +
        '<p class="card__sub">Aderência consolidada dos controles auditados</p></div>' + chip('92% global', 'info', false) + '</header>' +
        '<div class="chart-wrap chart-wrap--lg"><canvas id="chAdminCompliance" role="img" aria-label="Radar de conformidade por framework"></canvas></div></article>' +
      '</div>' +
      '<div class="admin-grid admin-grid--2">' +
        '<article class="card"><header class="card__head"><div><h2>Próximos jobs</h2>' +
        '<p class="card__sub">Agendamentos do scheduler e última execução</p></div>' + chip('6 jobs', 'muted', false) + '</header>' +
        tabelaJobsHTML() + '</article>' +
        '<article class="card"><header class="card__head"><div><h2>Alertas de plataforma</h2>' +
        '<p class="card__sub">Sinais de infraestrutura, mensageria e sensores</p></div>' + chip('5 abertos', 'low', true) + '</header>' +
        alertasHTML() + '</article>' +
      '</div>' +
      '<article class="card"><header class="card__head"><div><h2>Trilha recente</h2>' +
      '<p class="card__sub">Últimos eventos imutáveis da auditoria</p></div>' +
      '<button type="button" class="btn btn--soft btn--sm" data-admin-go="auditoria">' + ico('i-search') + 'Abrir auditoria</button></header>' +
      trilhaHTML() + '</article>';
  }

  function painelCompliance() {
    return frameworksHTML() +
      '<div class="admin-grid admin-grid--2">' +
        '<article class="card"><header class="card__head"><div><h2>Evolução da conformidade</h2>' +
        '<p class="card__sub">Aderência dos frameworks nos últimos 6 meses</p></div>' + chip('+8 p.p. LGPD', 'ok', false) + '</header>' +
        '<div class="chart-wrap"><canvas id="chAdminComplianceEvolucao" role="img" aria-label="Evolução da conformidade por framework"></canvas></div></article>' +
        '<article class="card"><header class="card__head"><div><h2>Matriz de risco</h2>' +
        '<p class="card__sub">Probabilidade × impacto · riscos residuais</p></div>' + chip('8 riscos', 'low', false) + '</header>' +
        riscoHTML() + '</article>' +
      '</div>' +
      '<article class="card"><header class="card__head"><div><h2>Controles e evidências</h2>' +
      '<p class="card__sub">Amostra de 10 controles do plano de auditoria</p></div>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-admin-go="auditoria">' + ico('i-layers') + 'Evidências</button></header>' +
      controlesHTML() + '</article>' +
      '<article class="card"><header class="card__head"><div><h2>Políticas de retenção e privacidade</h2>' +
      '<p class="card__sub">LGPD, GDPR e obrigações fiscais aplicadas ao ciclo de vida do dado</p></div>' + chip('LGPD + GDPR', 'violet', false) + '</header>' +
      retencaoHTML() + '</article>' +
      '<article class="card"><header class="card__head"><div><h2>Solicitações LGPD</h2>' +
      '<p class="card__sub">Direitos dos titulares em atendimento pelo DPO</p></div>' + chip('5 solicitações', 'info', false) + '</header>' +
      lgpdHTML() + '</article>';
  }

  function painelRegras() {
    var tipos = ['Todas', 'Estoque', 'OS', 'Financeiro', 'Segurança'];
    var botoes = tipos.map(function (t) {
      var val = t === 'Todas' ? 'todas' : t;
      return '<button type="button" class="seg__btn' + (S.regrasFiltro === val ? ' is-active' : '') + '" data-rule-filter="' + val + '">' + t + '</button>';
    }).join('');
    return '<article class="card"><header class="card__head"><div><h2>Regras de negócio</h2>' +
      '<p class="card__sub">Motor de políticas avaliado no commit de vendas, OS e estoque</p></div>' +
      '<span class="chip chip--info" id="adminRulesCount">' + contadorRegras() + '</span></header>' +
      '<div class="admin-toolbar"><span class="filterbar__title">' + ico('i-filter') + 'Tipo</span>' +
      '<div class="seg" id="adminRuleFilters">' + botoes + '</div>' +
      '<span class="hint" style="margin-left:auto">Alterações são registradas na trilha de auditoria</span></div>' +
      '<div id="adminRulesList" style="margin-top:12px">' + regrasHTML(S.regrasFiltro) + '</div></article>' +
      '<div class="admin-grid admin-grid--2">' +
      simuladorHTML() +
      '<article class="card"><header class="card__head"><div><h2>Últimas execuções</h2>' +
      '<p class="card__sub">Amostra de avaliações do motor nas últimas 2 horas</p></div>' + chip('8 eventos', 'muted', false) + '</header>' +
      execucoesHTML() + '</article></div>';
  }

  function painelBackend() {
    return '<div class="admin-grid admin-grid--2">' +
      '<article class="card"><header class="card__head"><div><h2>Feature flags</h2>' +
      '<p class="card__sub">Rollout controlado por tenant e por loja</p></div>' + chip('6 flags', 'violet', false) + '</header>' +
      flagsHTML() + '</article>' +
      '<article class="card"><header class="card__head"><div><h2>Variáveis de ambiente</h2>' +
      '<p class="card__sub">Secrets e configuração do serviço de aplicação</p></div>' +
      '<button type="button" class="btn btn--sm btn--ghost" id="adminEnvToggle" data-env-toggle="1" aria-pressed="false">' + ico('i-edit') + 'Revelar</button></header>' +
      envHTML() + '</article></div>' +
      '<article class="card"><header class="card__head"><div><h2>Endpoints internos</h2>' +
      '<p class="card__sub">Janela de 15 minutos · p95, erros e rate limit por rota</p></div>' + chip('8 rotas', 'muted', false) + '</header>' +
      endpointsHTML() + '</article>' +
      '<div class="admin-grid admin-grid--2">' +
      '<article class="card"><header class="card__head"><div><h2>Banco de dados e cache</h2>' +
      '<p class="card__sub">PostgreSQL 16.4 e Redis 7.4.1</p></div>' + chip('saudável', 'ok', true) + '</header>' + dbCacheHTML() + '</article>' +
      '<article class="card"><header class="card__head"><div><h2>Filas</h2>' +
      '<p class="card__sub">Profundidade, consumidores e dead letters</p></div>' + chip('2 em atenção', 'low', false) + '</header>' +
      filasHTML() + '</article></div>';
  }

  function painelTransmissao() {
    var kpis =
      kpiHTML({ label: 'Mensagens/min', valor: '94', valorId: 'adminKpiMsgs', foot: 'janela móvel de 60 s', cor: 'var(--brand)', icone: 'i-trend-up' }) +
      kpiHTML({ label: 'Latência p95', valor: '184 ms', valorId: 'adminKpiLat', foot: 'p50 em 64 ms', cor: 'var(--blue)', icone: 'i-clock' }) +
      kpiHTML({ label: 'Taxa de erro', valor: '1,8%', valorId: 'adminKpiErr', foot: 'retry + DLQ / total', cor: 'var(--amber)', icone: 'i-alert' }) +
      kpiHTML({ label: 'Na DLQ', valor: String(DLQ.length), valorId: 'adminKpiDlq', foot: 'mensagens aguardando reprocesso', cor: 'var(--red)', icone: 'i-layers' }) +
      kpiHTML({ label: 'Reconexões', valor: '3', valorId: 'adminKpiRecon', foot: 'desde o início da sessão', cor: 'var(--violet)', icone: 'i-refresh' });

    return '<div class="admin-toolbar">' +
      '<span class="chip chip--ok" id="adminStreamStatus" role="status"><i></i>AO VIVO · 1,2 s</span>' +
      '<span class="hint" id="adminStreamMeta">console com até 60 linhas · 5 tópicos</span>' +
      '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn btn--sm" id="adminStreamToggle" data-stream-toggle="1">' + ico('i-clock') + 'Pausar</button>' +
      '<button type="button" class="btn btn--sm btn--danger" id="adminStreamFault" data-stream-fault="1">' + ico('i-alert') + 'Injetar falha</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" id="adminStreamClear" data-stream-clear="1">' + ico('i-x') + 'Limpar</button></div></div>' +
      '<div class="admin-kpis">' + kpis + '</div>' +
      '<div class="admin-grid admin-grid--2">' +
      '<article class="card"><header class="card__head"><div><h2>Throughput por segundo</h2>' +
      '<p class="card__sub">Eventos publicados no barramento · 60 pontos</p></div>' + chip('tempo real', 'ok', true) + '</header>' +
      '<div class="chart-wrap"><canvas id="chAdminTransmissao" role="img" aria-label="Throughput de eventos por segundo"></canvas></div></article>' +
      '<article class="card"><header class="card__head"><div><h2>Latência p50 e p95</h2>' +
      '<p class="card__sub">Percentis de entrega no consumidor</p></div>' + chip('p95', 'info', false) + '</header>' +
      '<div class="chart-wrap"><canvas id="chAdminLatencia" role="img" aria-label="Latência p50 e p95 por evento"></canvas></div></article></div>' +
      '<article class="card"><header class="card__head"><div><h2>Console de eventos</h2>' +
      '<p class="card__sub">Fluxo simulado do PDV até os serviços de domínio</p></div>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-admin-go="backend">' + ico('i-command') + 'Ver backend</button></header>' +
      '<div class="stream"><div class="stream__head">' +
      '<div class="stream__cell">Hora</div><div class="stream__cell">Evento</div><div class="stream__cell">Rota</div>' +
      '<div class="stream__cell">Status</div><div class="stream__cell">Latência</div><div class="stream__cell" aria-hidden="true"></div></div>' +
      '<div class="stream__body" id="adminStreamBody" role="log" aria-live="off" aria-label="Console de eventos em tempo real"></div></div></article>' +
      '<article class="card"><header class="card__head"><div><h2>Contratos de evento</h2>' +
      '<p class="card__sub">Schema registry e compatibilidade entre versões</p></div>' + chip('schema registry', 'violet', false) + '</header>' +
      contratosHTML() + '</article>' +
      dlqHTML();
  }

  function painelAtivos() {
    var emAtencao = ATIVOS.filter(function (a) { return a.status !== 'Operacional'; }).length;
    var criticos = ATIVOS.filter(function (a) { return a.saude < 60; }).length;
    var prev = ATIVOS.filter(function (a) { var d = diasAte(dataRel(a.prevencao)); return d >= 0 && d <= 30; }).length;
    var mttr = ATIVOS.reduce(function (s, a) { return s + a.mttr; }, 0) / ATIVOS.length;
    var valor = ATIVOS.reduce(function (s, a) { return s + a.valor; }, 0);
    var kpis =
      kpiHTML({ label: 'Ativos monitorados', valor: String(ATIVOS.length), foot: '100% do inventário operacional', cor: 'var(--brand)', icone: 'i-box' }) +
      kpiHTML({ label: 'Valor patrimonial', valor: moedaCurta(valor), foot: 'depreciação linear · 8,4 anos', cor: 'var(--blue)', icone: 'i-chart' }) +
      kpiHTML({ label: 'Em atenção', valor: String(emAtencao), foot: '4 atenção · 3 degradados · 1 manutenção', cor: 'var(--amber)', icone: 'i-alert' }) +
      kpiHTML({ label: 'Críticos', valor: String(criticos), foot: 'saúde abaixo de 60%', cor: 'var(--red)', icone: 'i-alert' }) +
      kpiHTML({ label: 'Preventivas em 30 dias', valor: String(prev), foot: 'plano de manutenção preventiva', cor: 'var(--violet)', icone: 'i-clock' }) +
      kpiHTML({ label: 'MTTR médio', valor: decimal(mttr) + ' h', foot: 'tempo médio de reparo · 90 dias', cor: 'var(--cyan)', icone: 'i-tool' });

    var filtros = CATS_ATIVO.map(function (c) {
      return '<button type="button" class="seg__btn' + (S.ativosFiltro === c.id ? ' is-active' : '') + '" data-asset-filter="' + c.id + '">' + c.nome + '</button>';
    }).join('');

    return '<div class="admin-kpis">' + kpis + '</div>' +
      '<article class="card"><header class="card__head"><div><h2>Inventário de ativos</h2>' +
      '<p class="card__sub">Saúde, manutenção e garantia dos equipamentos da loja</p></div>' +
      '<span class="chip chip--muted" id="adminAssetCount">' + ATIVOS.length + ' ativos</span></header>' +
      '<div class="admin-toolbar"><span class="filterbar__title">' + ico('i-filter') + 'Categoria</span>' +
      '<div class="seg" id="adminAssetFilters">' + filtros + '</div></div>' +
      '<div class="table-wrap" style="margin-top:12px"><table class="table admin-table" style="min-width:1180px"><thead><tr>' +
      '<th scope="col">TAG</th><th scope="col">Ativo</th><th scope="col">Categoria</th><th scope="col">Setor</th>' +
      '<th scope="col">Criticidade</th><th scope="col">Saúde</th><th scope="col">Status</th><th scope="col">MTBF (h)</th>' +
      '<th scope="col">MTTR (h)</th><th scope="col">Preventiva</th><th scope="col">Garantia</th><th scope="col">Ação</th></tr></thead>' +
      '<tbody id="adminAssetBody">' + ativosTabelaHTML(S.ativosFiltro) + '</tbody></table></div></article>' +
      '<div class="admin-grid admin-grid--3">' +
      '<article class="card"><header class="card__head"><div><h2>Ativos por status</h2>' +
      '<p class="card__sub">Distribuição do inventário</p></div></header>' +
      '<div class="chart-wrap"><canvas id="chAdminAtivos" role="img" aria-label="Distribuição de ativos por status"></canvas></div></article>' +
      '<article class="card"><header class="card__head"><div><h2>Saúde média</h2>' +
      '<p class="card__sub">Índice de saúde por categoria</p></div></header>' +
      '<div class="chart-wrap"><canvas id="chAdminSaude" role="img" aria-label="Saúde média por categoria de ativo"></canvas></div></article>' +
      '<article class="card"><header class="card__head"><div><h2>Ciclo de vida e depreciação</h2>' +
      '<p class="card__sub">Substituições e CAPEX projetado</p></div>' + chip('CAPEX 12m', 'info', false) + '</header>' +
      cicloVidaHTML() + '</article></div>';
  }

  function painelInfra() {
    return '<article class="card"><header class="card__head"><div><h2>Arquitetura de referência</h2>' +
      '<p class="card__sub">Borda, aplicação, dados e observabilidade · produção-sim</p></div>' +
      '<span class="chip chip--crit"><i></i>1 nó degradado</span></header>' + diagramaHTML() + '</article>' +
      '<article class="card"><header class="card__head"><div><h2>Serviços</h2>' +
      '<p class="card__sub">Réplicas, saturação e versões em execução</p></div>' + chip('8 serviços', 'muted', false) + '</header>' +
      servicosInfraHTML() + '</article>' +
      '<article class="card"><header class="card__head"><div><h2>Deploys recentes</h2>' +
      '<p class="card__sub">Pipeline CI/CD · janela de 7 dias</p></div>' + chip('5 deploys', 'info', false) + '</header>' +
      deploysHTML() + '</article>' +
      '<div class="admin-grid admin-grid--2">' +
      '<article class="card"><header class="card__head"><div><h2>Latência p95 por serviço</h2>' +
      '<p class="card__sub">Últimos 15 minutos · limite de 300 ms</p></div>' + chip('SLO 300 ms', 'ok', false) + '</header>' +
      '<div class="chart-wrap"><canvas id="chAdminInfra" role="img" aria-label="Latência p95 por serviço"></canvas></div></article>' +
      '<article class="card"><header class="card__head"><div><h2>Backup e continuidade</h2>' +
      '<p class="card__sub">Plano de recuperação de desastre</p></div>' + chip('testado', 'ok', true) + '</header>' +
      backupHTML() + '</article></div>' +
      '<div class="admin-grid admin-grid--2">' +
      '<article class="card"><header class="card__head"><div><h2>SLOs e observabilidade</h2>' +
      '<p class="card__sub">Objetivos, consumo de orçamento e status</p></div>' + chip('1 estourado', 'crit', false) + '</header>' +
      slosHTML() + '</article>' +
      '<article class="card"><header class="card__head"><div><h2>Logs recentes</h2>' +
      '<p class="card__sub">Amostra do Loki · últimos 4 minutos</p></div>' + chip('5 linhas', 'muted', false) + '</header>' +
      logsHTML() + '</article></div>';
  }

  function painelAuditoria() {
    var atores = [{ v: 'todos', t: 'Todos os atores' }];
    PESSOAS.forEach(function (p) { atores.push({ v: p.ator, t: p.ator + ' · ' + p.papel }); });
    var atorOpts = atores.map(function (a) {
      return '<option value="' + esc(a.v) + '"' + (S.auditAtor === a.v ? ' selected' : '') + '>' + esc(a.t) + '</option>';
    }).join('');
    var acaoOpts = '<option value="todas">Todas as ações</option>' + Object.keys(ACOES_AUDITORIA).map(function (k) {
      return '<option value="' + k + '"' + (S.auditAcao === k ? ' selected' : '') + '>' + esc(ACOES_AUDITORIA[k]) + '</option>';
    }).join('');
    var periodos = [
      { v: '24h', t: 'Últimas 24 h' }, { v: '7d', t: 'Últimos 7 dias' },
      { v: '30d', t: 'Últimos 30 dias' }, { v: 'todos', t: 'Todo o período' }
    ];
    var perOpts = periodos.map(function (p) {
      return '<option value="' + p.v + '"' + (S.auditPeriodo === p.v ? ' selected' : '') + '>' + p.t + '</option>';
    }).join('');

    return '<article class="card"><header class="card__head"><div><h2>Trilha de auditoria</h2>' +
      '<p class="card__sub">Eventos imutáveis de acesso, mudança e operação</p></div>' +
      '<div class="admin-toolbar" style="margin:0">' +
      '<span class="chip chip--muted" id="adminAuditCount">' + AUDITORIA.length + ' eventos</span>' +
      '<button type="button" class="btn btn--soft btn--sm" data-admin-export="1">' + ico('i-download') + 'Exportar CSV</button></div></header>' +
      '<div class="admin-toolbar">' +
      '<select class="select" id="adminAuditActor" aria-label="Filtrar por ator">' + atorOpts + '</select>' +
      '<select class="select" id="adminAuditAction" aria-label="Filtrar por ação">' + acaoOpts + '</select>' +
      '<select class="select" id="adminAuditPeriod" aria-label="Filtrar por período">' + perOpts + '</select>' +
      '<div class="search">' + ico('i-search') + '<input id="adminAuditSearch" type="search" value="' + esc(S.auditBusca) + '" placeholder="Ator, entidade ou IP" aria-label="Buscar na auditoria"></div>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-audit-clear="1">' + ico('i-x') + 'Limpar</button></div>' +
      '<div class="table-wrap" style="margin-top:12px"><table class="table admin-table"><thead><tr>' +
      '<th scope="col">Timestamp</th><th scope="col">Ator</th><th scope="col">Papel</th><th scope="col">Ação</th>' +
      '<th scope="col">Entidade</th><th scope="col">IP</th><th scope="col">Resultado</th><th scope="col">Hash</th></tr></thead>' +
      '<tbody id="adminAuditBody"></tbody></table></div></article>' +
      '<article class="card"><header class="card__head"><div><h2>Integridade da trilha</h2>' +
      '<p class="card__sub">Encadeamento criptográfico e verificações periódicas</p></div>' + chip('hash-chain', 'violet', false) + '</header>' +
      integridadeHTML() + '</article>';
  }

  /* ------------------------------------------------------------------ *
   * 6. Montagem                                                         *
   * ------------------------------------------------------------------ */
  var ABAS = [
    { id: 'visao', nome: 'Visão', icone: 'i-grid' },
    { id: 'compliance', nome: 'Compliance', icone: 'i-check' },
    { id: 'regras', nome: 'Regras', icone: 'i-filter' },
    { id: 'backend', nome: 'Backend', icone: 'i-command' },
    { id: 'transmissao', nome: 'Transmissão', icone: 'i-refresh' },
    { id: 'ativos', nome: 'Ativos', icone: 'i-box' },
    { id: 'infra', nome: 'Infraestrutura', icone: 'i-layers' },
    { id: 'auditoria', nome: 'Auditoria', icone: 'i-search' }
  ];

  function montarHTML() {
    var nav = ABAS.map(function (a) {
      var ativo = S.aba === a.id;
      return '<button type="button" class="admin__tab' + (ativo ? ' is-active' : '') + '" data-admin="' + a.id + '" role="tab" aria-selected="' + (ativo ? 'true' : 'false') + '" aria-controls="admin-panel-' + a.id + '" id="admin-tab-' + a.id + '">' +
        ico(a.icone) + '<span>' + a.nome + '</span></button>';
    }).join('');

    var paineis = [
      { id: 'visao', html: painelVisao() },
      { id: 'compliance', html: painelCompliance() },
      { id: 'regras', html: painelRegras() },
      { id: 'backend', html: painelBackend() },
      { id: 'transmissao', html: painelTransmissao() },
      { id: 'ativos', html: painelAtivos() },
      { id: 'infra', html: painelInfra() },
      { id: 'auditoria', html: painelAuditoria() }
    ].map(function (p) {
      var ativo = S.aba === p.id;
      return '<section class="admin__panel' + (ativo ? ' is-active' : '') + '" data-panel="' + p.id + '" id="admin-panel-' + p.id + '" role="tabpanel" aria-labelledby="admin-tab-' + p.id + '" tabindex="0"' + (ativo ? '' : ' hidden') + '>' + p.html + '</section>';
    }).join('');

    return '<div class="admin">' +
      '<div class="admin__bar" style="top:calc(var(--topbar-h, 68px) + 12px)"><nav class="admin__nav" role="tablist" aria-label="Painel administrativo">' + nav + '</nav>' +
      '<div class="admin__tools"><span class="chip chip--low" title="Ambiente de demonstração: nenhuma transmissão real é enviada"><i></i>ambiente: produção-sim</span>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-admin-export="1">' + ico('i-download') + 'Exportar auditoria</button></div></div>' +
      '<div class="admin__panels">' + paineis + '</div></div>';
  }

  /* ------------------------------------------------------------------ *
   * 7. Núcleo: render, navegação e eventos                              *
   * ------------------------------------------------------------------ */
  var raizLigada = null;

  function acharRaiz(rootId) {
    var id = String(rootId || S.rootId).replace(/^#/, '');
    var el = document.getElementById(id);
    if (!el) {
      try { el = document.querySelector('#' + id); } catch (e) { el = null; }
    }
    return el;
  }

  function render(rootId) {
    if (rootId) S.rootId = rootId;
    var raiz = acharRaiz(S.rootId);
    if (!raiz) {
      if (global.console && global.console.warn) global.console.warn('[ADMIN] root "' + S.rootId + '" não encontrado.');
      return;
    }
    S.raiz = raiz;
    if (raiz.getAttribute('data-admin-ready') === '1' && raiz.querySelector('.admin')) {
      S.montado = true;
      ligarEventos(raiz);
      abrir(S.aba);
      return;
    }
    raiz.innerHTML = montarHTML();
    raiz.setAttribute('data-admin-ready', '1');
    S.montado = true;
    ligarEventos(raiz);
    prepararUI();
    prepararStream();
    abrir(S.aba);
  }

  function abrir(aba) {
    var ids = ABAS.map(function (a) { return a.id; });
    if (ids.indexOf(aba) === -1) return;
    S.aba = aba;
    if (!S.montado || !S.raiz) return;
    $$('.admin__tab', S.raiz).forEach(function (b) {
      var ativo = b.getAttribute('data-admin') === aba;
      b.classList.toggle('is-active', ativo);
      b.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    $$('.admin__panel', S.raiz).forEach(function (p) {
      var ativo = p.getAttribute('data-panel') === aba;
      p.classList.toggle('is-active', ativo);
      if (ativo) p.removeAttribute('hidden');
      else p.setAttribute('hidden', 'hidden');
    });
    if (aba === 'transmissao') {
      iniciar();
    } else {
      pararStream();
      desenharAba(aba);
    }
  }

  function ligarEventos(raiz) {
    if (raizLigada === raiz) return;
    if (raizLigada) {
      raizLigada.removeEventListener('click', aoClicar);
      raizLigada.removeEventListener('change', aoMudar);
      raizLigada.removeEventListener('input', aoDigitar);
    }
    raiz.addEventListener('click', aoClicar);
    raiz.addEventListener('change', aoMudar);
    raiz.addEventListener('input', aoDigitar);
    raizLigada = raiz;
  }

  function alvoValido(e, seletor) {
    var alvo = e.target;
    if (!alvo || !alvo.closest) return null;
    var el = alvo.closest(seletor);
    return el && S.raiz && S.raiz.contains(el) ? el : null;
  }

  function aoClicar(e) {
    var el;
    if ((el = alvoValido(e, '[data-admin]'))) { abrir(el.getAttribute('data-admin')); return; }
    if ((el = alvoValido(e, '[data-admin-go]'))) { abrir(el.getAttribute('data-admin-go')); return; }
    if (alvoValido(e, '[data-admin-export]')) { exportarAuditoriaCSV(); return; }
    if ((el = alvoValido(e, '[data-rule-filter]'))) {
      S.regrasFiltro = el.getAttribute('data-rule-filter');
      $$('#adminRuleFilters .seg__btn', S.raiz).forEach(function (b) { b.classList.toggle('is-active', b === el); });
      renderRegrasLista();
      return;
    }
    if ((el = alvoValido(e, '[data-rule-sim]'))) { selecionarRegraSimulador(el.getAttribute('data-rule-sim')); return; }
    if (alvoValido(e, '[data-sim-run]')) { executarSimulador(); return; }
    if (alvoValido(e, '[data-env-toggle]')) { alternarEnv(); return; }
    if (alvoValido(e, '[data-stream-toggle]')) { alternarStream(); return; }
    if (alvoValido(e, '[data-stream-fault]')) { injetarFalha(); return; }
    if (alvoValido(e, '[data-stream-clear]')) { limparStream(); return; }
    if ((el = alvoValido(e, '[data-stream-expand]'))) { alternarPayload(el); return; }
    if ((el = alvoValido(e, '[data-dlq-reprocess]'))) { reprocessarDlq(el.getAttribute('data-dlq-reprocess')); return; }
    if ((el = alvoValido(e, '[data-asset-filter]'))) {
      S.ativosFiltro = el.getAttribute('data-asset-filter');
      $$('#adminAssetFilters .seg__btn', S.raiz).forEach(function (b) { b.classList.toggle('is-active', b === el); });
      renderAtivos();
      return;
    }
    if ((el = alvoValido(e, '[data-asset-os]'))) { abrirOSAtivo(el.getAttribute('data-asset-os')); return; }
    if ((el = alvoValido(e, '[data-deploy-rollback]'))) {
      avisar('Rollback solicitado', 'Deploy ' + el.getAttribute('data-deploy-rollback') + ' agendado para o próximo slot do pipeline.', 'warn');
      return;
    }
    if (alvoValido(e, '[data-audit-clear]')) { limparFiltrosAuditoria(); return; }
  }

  function aoMudar(e) {
    var el;
    if ((el = alvoValido(e, '[data-rule-toggle]'))) { alternarRegra(el.getAttribute('data-rule-toggle'), el.checked); return; }
    if ((el = alvoValido(e, '[data-flag-toggle]'))) { alternarFlag(el.getAttribute('data-flag-toggle'), el.checked); return; }
    if (e.target && e.target.id === 'adminSimRule') { atualizarSimulador(); return; }
    if (e.target && e.target.id === 'adminAuditActor') { S.auditAtor = e.target.value; renderAuditoria(); return; }
    if (e.target && e.target.id === 'adminAuditAction') { S.auditAcao = e.target.value; renderAuditoria(); return; }
    if (e.target && e.target.id === 'adminAuditPeriod') { S.auditPeriodo = e.target.value; renderAuditoria(); return; }
  }

  function aoDigitar(e) {
    if (e.target && e.target.id === 'adminAuditSearch') {
      S.auditBusca = e.target.value;
      renderAuditoria();
    }
  }

  function prepararUI() {
    atualizarSimulador();
    renderAuditoria();
    renderDlq();
    atualizarKpisDlq();
  }

  function renderRegrasLista() {
    var box = $('#adminRulesList', S.raiz);
    if (box) box.innerHTML = regrasHTML(S.regrasFiltro);
    var c = $('#adminRulesCount', S.raiz);
    if (c) c.textContent = contadorRegras();
  }

  function alternarRegra(id, ativa) {
    var r = REGRAS.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.ativa = !!ativa;
    var card = $('[data-rule-card="' + id + '"]', S.raiz);
    if (card) {
      card.classList.toggle('is-off', !r.ativa);
      var st = $('[data-rule-state]', card);
      if (st) {
        st.className = 'chip ' + (r.ativa ? 'chip--ok' : 'chip--muted');
        st.textContent = r.ativa ? 'Ativa' : 'Pausada';
      }
      var sw = $('.switch', card);
      if (sw) sw.setAttribute('title', (r.ativa ? 'Desativar' : 'Ativar') + ' regra ' + id);
    }
    var c = $('#adminRulesCount', S.raiz);
    if (c) c.textContent = contadorRegras();
    avisar(r.ativa ? 'Regra ativada' : 'Regra desativada', id + ' · ' + r.nome + '. Alteração registrada na trilha (simulação).', r.ativa ? 'ok' : 'warn');
  }

  function alternarFlag(chave, ativa) {
    var f = FLAGS.filter(function (x) { return x.chave === chave; })[0];
    if (!f) return;
    f.ativa = !!ativa;
    var card = $('[data-flag-card="' + chave + '"]', S.raiz);
    if (card) {
      card.classList.toggle('is-off', !f.ativa);
      var st = $('[data-flag-state]', card);
      if (st) {
        st.className = 'chip ' + (f.ativa ? 'chip--ok' : 'chip--muted');
        st.textContent = f.ativa ? 'ativa' : 'pausada';
      }
    }
    avisar(f.ativa ? 'Feature flag ativada' : 'Feature flag pausada', chave + ' · rollout ' + f.rollout + '%.', f.ativa ? 'ok' : 'warn');
  }

  function alternarEnv() {
    S.envRevelado = !S.envRevelado;
    ENV.forEach(function (e) {
      var row = $('[data-env-row="' + e.chave + '"]', S.raiz);
      var val = $('[data-env-val="' + e.chave + '"]', S.raiz);
      if (row) row.classList.toggle('is-revealed', S.envRevelado);
      if (val) {
        val.textContent = S.envRevelado ? e.real : e.mask;
        val.setAttribute('title', S.envRevelado ? 'Valor visível nesta sessão' : 'Use Revelar para ver o valor');
      }
    });
    var btn = $('#adminEnvToggle', S.raiz);
    if (btn) {
      btn.innerHTML = ico(S.envRevelado ? 'i-x' : 'i-edit') + (S.envRevelado ? 'Ocultar' : 'Revelar');
      btn.setAttribute('aria-pressed', S.envRevelado ? 'true' : 'false');
    }
    avisar(S.envRevelado ? 'Variáveis reveladas' : 'Variáveis ocultadas', 'Valores mock; nenhum secret real é exposto.', 'info');
  }

  function opRegraDispara(regra, valor) {
    var op = regra.sim.op;
    if (op === 'gt') return valor > regra.sim.limite;
    if (op === 'gte') return valor >= regra.sim.limite;
    if (op === 'lt') return valor < regra.sim.limite;
    return valor <= regra.sim.limite;
  }

  function formatarValorRegra(tipo, v) {
    if (tipo === 'moeda') return moeda(v);
    if (tipo === 'pct') return decimal(v) + '%';
    if (tipo === 'horas') return decimal(v) + ' h';
    if (tipo === 'dias') return numero(v) + ' d';
    if (tipo === 'min') return numero(v) + ' min';
    return numero(v) + ' un';
  }

  function atualizarSimulador() {
    var sel = $('#adminSimRule', S.raiz);
    var inp = $('#adminSimInput', S.raiz);
    var lab = $('#adminSimLabel', S.raiz);
    var hint = $('#adminSimHint', S.raiz);
    if (!sel || !inp) return;
    var r = REGRAS.filter(function (x) { return x.id === sel.value; })[0] || REGRAS[0];
    sel.value = r.id;
    inp.value = r.sim.padrao;
    if (lab) lab.textContent = 'Entrada · ' + r.sim.dica;
    if (hint) hint.textContent = 'Condição: ' + r.cond + ' · limite: ' + formatarValorRegra(r.sim.tipo, r.sim.limite) + '.';
  }

  function selecionarRegraSimulador(id) {
    var sel = $('#adminSimRule', S.raiz);
    if (!sel) return;
    sel.value = id;
    atualizarSimulador();
    var card = $('.admin-grid .card:last-child', S.raiz);
    var sim = $('#adminSimResult', S.raiz);
    if (sim && sim.scrollIntoView) sim.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var inp = $('#adminSimInput', S.raiz);
    if (inp) { inp.focus(); if (inp.select) inp.select(); }
  }

  function executarSimulador() {
    var sel = $('#adminSimRule', S.raiz);
    var inp = $('#adminSimInput', S.raiz);
    var box = $('#adminSimResult', S.raiz);
    if (!sel || !inp || !box) return;
    var r = REGRAS.filter(function (x) { return x.id === sel.value; })[0];
    var valor = parseFloat(String(inp.value).replace(',', '.'));
    if (!r) return;
    if (!isFinite(valor)) {
      avisar('Valor inválido', 'Informe um número para simular a regra ' + r.id + '.', 'warn');
      inp.focus();
      return;
    }
    var disparou = opRegraDispara(r, valor);
    var bloqueou = disparou && r.sim.bloquear;
    var tipoChip = bloqueou ? 'crit' : (disparou ? 'info' : 'ok');
    var titulo = bloqueou ? 'Bloqueado' : (disparou ? 'Ação disparada' : 'Aprovado');
    var ms = (0.6 + Math.random() * 1.5).toFixed(1).replace('.', ',');
    box.innerHTML = '<div class="rule"><div class="rule__head"><span class="rule__id">' + r.id + '</span>' +
      '<span class="rule__name">' + esc(r.nome) + '</span>' + chip(titulo, tipoChip, true) + '</div>' +
      '<div class="rule__cond">entrada: ' + esc(formatarValorRegra(r.sim.tipo, valor)) + ' · limite: ' + esc(formatarValorRegra(r.sim.tipo, r.sim.limite)) + '</div>' +
      '<div class="rule__meta"><span>Regra aplicada: ' + r.id + ' · ' + esc(r.nome) + '</span>' +
      '<span>Tempo de avaliação: ' + ms + ' ms</span><span>' + esc(r.sim.msg) + '</span></div></div>';
    avisar('Simulação concluída', r.id + ' · ' + titulo + ' em ' + ms + ' ms.', bloqueou ? 'warn' : 'ok');
  }

  function renderAtivos() {
    var body = $('#adminAssetBody', S.raiz);
    if (body) body.innerHTML = ativosTabelaHTML(S.ativosFiltro);
    var c = $('#adminAssetCount', S.raiz);
    if (c) {
      var n = ATIVOS.filter(function (a) { return S.ativosFiltro === 'todos' || a.cat === S.ativosFiltro; }).length;
      c.textContent = n + ' ativos';
    }
  }

  function abrirOSAtivo(tag) {
    var a = ATIVOS.filter(function (x) { return x.tag === tag; })[0];
    if (!a) return;
    var tecnico = 'plantão de manutenção';
    if (global.DADOS && global.DADOS.TECNICOS) {
      var esp = a.cat === 'refrigeracao' ? 'refrigeracao' : a.cat === 'pdv' ? 'pdv' : a.cat === 'eletrica' ? 'eletrica' : a.cat === 'seguranca' ? 'seguranca' : 'predial';
      var t = global.DADOS.TECNICOS.filter(function (x) { return x.especialidade === esp; })[0];
      if (t) tecnico = t.nome;
    }
    avisar('OS aberta (simulação)', 'Chamado para ' + a.tag + ' · ' + a.nome + ' encaminhado para ' + tecnico + '.', 'ok');
  }

  function filtrarAuditoria() {
    var limite = S.auditPeriodo === '24h' ? 24 : S.auditPeriodo === '7d' ? 168 : S.auditPeriodo === '30d' ? 720 : 999999;
    var busca = normaliza(S.auditBusca);
    return AUDITORIA.filter(function (e) {
      if (AGORA.getTime() - e.ts.getTime() > limite * 3600000) return false;
      if (S.auditAtor !== 'todos' && e.ator !== S.auditAtor) return false;
      if (S.auditAcao !== 'todas' && e.acao !== S.auditAcao) return false;
      if (busca) {
        var alvo = normaliza(e.ator + ' ' + e.papel + ' ' + e.acaoLabel + ' ' + e.entidade + ' ' + e.ip + ' ' + e.resultado);
        if (alvo.indexOf(busca) === -1) return false;
      }
      return true;
    });
  }

  function renderAuditoria() {
    var body = $('#adminAuditBody', S.raiz);
    if (!body) return;
    var lista = filtrarAuditoria();
    if (!lista.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted">Nenhum evento para os filtros selecionados.</td></tr>';
    } else {
      body.innerHTML = lista.map(function (e) {
        var tipo = e.resultado === 'sucesso' ? 'ok' : e.resultado === 'negado' ? 'crit' : 'low';
        return '<tr><td class="mono" title="' + esc(dataBR(e.ts) + ' ' + horaSeg(e.ts)) + '">' + esc(dataHoraCurta(e.ts)) + '</td>' +
          '<td class="table__primary">' + esc(e.ator) + '</td><td>' + esc(e.papel) + '</td>' +
          '<td>' + esc(e.acaoLabel) + '</td>' +
          '<td class="mono" title="' + esc(e.entidade) + '">' + esc(e.entidade) + '</td>' +
          '<td class="mono">' + esc(e.ip) + '</td><td>' + chip(e.resultado, tipo, false) + '</td>' +
          '<td class="mono" title="Hash SHA-256 truncado">' + esc(e.hash) + '</td></tr>';
      }).join('');
    }
    var c = $('#adminAuditCount', S.raiz);
    if (c) c.textContent = lista.length + ' de ' + AUDITORIA.length + ' eventos';
  }

  function limparFiltrosAuditoria() {
    S.auditAtor = 'todos'; S.auditAcao = 'todas'; S.auditPeriodo = '30d'; S.auditBusca = '';
    if ($('#adminAuditActor', S.raiz)) $('#adminAuditActor', S.raiz).value = 'todos';
    if ($('#adminAuditAction', S.raiz)) $('#adminAuditAction', S.raiz).value = 'todas';
    if ($('#adminAuditPeriod', S.raiz)) $('#adminAuditPeriod', S.raiz).value = '30d';
    if ($('#adminAuditSearch', S.raiz)) $('#adminAuditSearch', S.raiz).value = '';
    renderAuditoria();
    avisar('Filtros limpos', 'Exibindo os últimos 30 dias de auditoria.', 'info');
  }

  function csvCampo(v) {
    return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  }

  function exportarAuditoriaCSV() {
    var lista = filtrarAuditoria();
    if (!lista.length) {
      avisar('Nada para exportar', 'Nenhum evento corresponde aos filtros atuais.', 'warn');
      return;
    }
    var linhas = [['timestamp', 'ator', 'papel', 'acao', 'entidade', 'ip', 'resultado', 'hash']];
    lista.forEach(function (e) {
      linhas.push([e.ts.toISOString(), e.ator, e.papel, e.acaoLabel, e.entidade, e.ip, e.resultado, e.hash]);
    });
    var csv = '\uFEFF' + linhas.map(function (l) { return l.map(csvCampo).join(';'); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = global.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'auditoria_loja-do-bairro_' + dataISO(AGORA) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 800);
    avisar('CSV exportado', lista.length + ' eventos · separador ";" · UTF-8 com BOM.', 'ok');
  }

  /* ------------------------------------------------------------------ *
   * 8. Gráficos                                                         *
   * ------------------------------------------------------------------ */
  function prontoDesenho(callback) {
    var C = global.Charts;
    if (!C) return;
    var g = S.geracao;
    C.ready.then(function () {
      if (g !== S.geracao || !C.disponivel) return;
      callback(C);
    }).catch(function () { /* Chart.js indisponível: a página continua funcional */ });
  }

  function legendaTema(t, posicao) {
    return {
      display: true, position: posicao || 'bottom',
      labels: {
        color: t.texto2, usePointStyle: true, pointStyle: 'circle',
        boxWidth: 7, boxHeight: 7, padding: 14,
        font: { family: 'Inter', size: 11 }
      }
    };
  }

  function desenharServicos() {
    prontoDesenho(function (C) {
      var t = C.temaAtual();
      var o = C.baseOptions(t);
      o.indexAxis = 'y';
      o.animation = C.animacoes ? { duration: 520, easing: 'easeOutQuart' } : false;
      o.scales = {
        x: C.escalaY(t, {
          beginAtZero: false, min: 99.95, max: 100,
          ticks: { color: t.mudo, callback: function (v) { return Number(v).toFixed(2).replace('.', ',') + '%'; } }
        }),
        y: C.escalaX(t)
      };
      o.plugins.tooltip.callbacks = {
        label: function (ctx) { return 'Uptime: ' + Number(ctx.parsed.x).toFixed(3).replace('.', ',') + '%'; }
      };
      C.upsert('chAdminServicos', {
        type: 'bar',
        data: {
          labels: SERVICOS.map(function (s) { return s.nome; }),
          datasets: [{
            label: 'Uptime 30d',
            data: SERVICOS.map(function (s) { return s.uptime; }),
            backgroundColor: SERVICOS.map(function (s) { return s.uptime < 99.98 ? COR.amber : COR.green; }),
            borderRadius: 6, barThickness: 16
          }]
        },
        options: o
      });
    });
  }

  function desenharRadar() {
    prontoDesenho(function (C) {
      var t = C.temaAtual();
      var o = C.baseOptions(t);
      o.animation = C.animacoes ? { duration: 620, easing: 'easeOutQuart' } : false;
      o.scales = {
        r: {
          min: 0, max: 100,
          grid: { color: t.grade },
          angleLines: { color: t.grade },
          pointLabels: { color: t.texto2, font: { family: 'Inter', size: 11, weight: '600' } },
          ticks: { stepSize: 25, color: t.mudo, backdropColor: 'transparent', font: { family: 'Inter', size: 10 } }
        }
      };
      o.plugins.tooltip.callbacks = { label: function (ctx) { return ctx.label + ': ' + ctx.raw + '%'; } };
      C.upsert('chAdminCompliance', {
        type: 'radar',
        data: {
          labels: FRAMEWORKS.map(function (f) { return f.nome; }),
          datasets: [{
            label: 'Aderência',
            data: FRAMEWORKS.map(function (f) { return f.pct; }),
            borderColor: COR.violet, backgroundColor: alpha(COR.violet, 0.18),
            pointBackgroundColor: COR.violet, pointBorderColor: COR.violet,
            pointRadius: 4, borderWidth: 2, fill: true
          }]
        },
        options: o
      });
    });
  }

  function desenharComplianceEvolucao() {
    prontoDesenho(function (C) {
      var t = C.temaAtual();
      var o = C.baseOptions(t);
      o.animation = C.animacoes ? { duration: 520 } : false;
      o.plugins.legend = legendaTema(t, 'bottom');
      o.scales = {
        x: C.escalaX(t),
        y: C.escalaY(t, { beginAtZero: false, min: 50, max: 100, ticks: { color: t.mudo, callback: function (v) { return v + '%'; } } })
      };
      o.plugins.tooltip.callbacks = { label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + '%'; } };
      C.upsert('chAdminComplianceEvolucao', {
        type: 'line',
        data: {
          labels: ['mai/26', 'jun/26', 'jul/26', 'ago/26', 'set/26', 'out/26'],
          datasets: [
            { label: 'LGPD', data: [88, 90, 91, 93, 95, 96], borderColor: COR.green, backgroundColor: alpha(COR.green, 0.08), tension: 0.35, borderWidth: 2, pointRadius: 2.5, fill: false },
            { label: 'ISO 27001', data: [80, 82, 84, 85, 87, 88], borderColor: COR.blue, backgroundColor: alpha(COR.blue, 0.08), tension: 0.35, borderWidth: 2, pointRadius: 2.5, fill: false },
            { label: 'PCI-DSS', data: [70, 72, 75, 77, 79, 81], borderColor: COR.amber, backgroundColor: alpha(COR.amber, 0.08), tension: 0.35, borderWidth: 2, pointRadius: 2.5, fill: false },
            { label: 'SOC 2', data: [62, 65, 68, 70, 72, 74], borderColor: COR.violet, backgroundColor: alpha(COR.violet, 0.08), tension: 0.35, borderWidth: 2, pointRadius: 2.5, fill: false }
          ]
        },
        options: o
      });
    });
  }

  function desenharAtivosDoughnut() {
    prontoDesenho(function (C) {
      var t = C.temaAtual();
      var status = ['Operacional', 'Atenção', 'Degradado', 'Em manutenção'];
      var cores = [COR.green, COR.amber, COR.red, COR.violet];
      var valores = status.map(function (s) {
        return ATIVOS.filter(function (a) { return a.status === s; }).length;
      });
      var total = ATIVOS.length;
      var o = C.baseOptions(t);
      o.cutout = '68%';
      o.interaction = { mode: 'nearest', intersect: true };
      o.plugins.legend = legendaTema(t, 'bottom');
      o.plugins.tooltip.callbacks = {
        label: function (ctx) {
          var p = total ? Math.round((ctx.parsed / total) * 100) : 0;
          return ' ' + ctx.label + ': ' + ctx.parsed + ' ativos (' + p + '%)';
        }
      };
      C.upsert('chAdminAtivos', {
        type: 'doughnut',
        data: {
          labels: status,
          datasets: [{ data: valores, backgroundColor: cores, borderWidth: 0, hoverOffset: 5 }]
        },
        options: o
      });
    });
  }

  function desenharAtivosSaude() {
    prontoDesenho(function (C) {
      var t = C.temaAtual();
      var cats = CATS_ATIVO.filter(function (c) { return c.id !== 'todos'; });
      var medias = cats.map(function (c) {
        var lista = ATIVOS.filter(function (a) { return a.cat === c.id; });
        return lista.length ? lista.reduce(function (s, a) { return s + a.saude; }, 0) / lista.length : 0;
      });
      var cores = [COR.blue, COR.violet, COR.amber, COR.cyan, COR.pink];
      var o = C.baseOptions(t);
      o.indexAxis = 'y';
      o.animation = C.animacoes ? { duration: 500 } : false;
      o.scales = {
        x: C.escalaY(t, { beginAtZero: true, max: 100, ticks: { color: t.mudo, callback: function (v) { return v + '%'; } } }),
        y: C.escalaX(t)
      };
      o.plugins.tooltip.callbacks = { label: function (ctx) { return 'Saúde média: ' + decimal(ctx.parsed.x) + '%'; } };
      C.upsert('chAdminSaude', {
        type: 'bar',
        data: {
          labels: cats.map(function (c) { return c.nome; }),
          datasets: [{ label: 'Saúde média', data: medias, backgroundColor: cores, borderRadius: 6, barThickness: 16 }]
        },
        options: o
      });
    });
  }

  function desenharTransmissao() {
    prontoDesenho(function (C) {
      var t = C.temaAtual();
      var h = S.stream.hist;
      var o = C.baseOptions(t);
      o.animation = C.animacoes ? { duration: 260 } : false;
      o.scales = {
        x: C.escalaX(t, { ticks: { color: t.mudo, maxTicksLimit: 6, maxRotation: 0 } }),
        y: C.escalaY(t, { beginAtZero: true, suggestedMax: 3, ticks: { color: t.mudo, callback: function (v) { return decimal(v) + '/s'; } } })
      };
      o.plugins.tooltip.callbacks = {
        label: function (ctx) { return 'Throughput: ' + decimal(ctx.parsed.y) + ' eventos/s'; }
      };
      C.upsert('chAdminTransmissao', {
        type: 'line',
        data: {
          labels: h.labels.slice(),
          datasets: [{
            label: 'Eventos/s', data: h.throughput.slice(),
            borderColor: COR.green, backgroundColor: alpha(COR.green, 0.16),
            borderWidth: 2, tension: 0.35, fill: true, pointRadius: 0
          }]
        },
        options: o
      });
    });
  }

  function desenharLatencia() {
    prontoDesenho(function (C) {
      var t = C.temaAtual();
      var h = S.stream.hist;
      var o = C.baseOptions(t);
      o.animation = C.animacoes ? { duration: 260 } : false;
      o.plugins.legend = legendaTema(t, 'bottom');
      o.scales = {
        x: C.escalaX(t, { ticks: { color: t.mudo, maxTicksLimit: 6, maxRotation: 0 } }),
        y: C.escalaY(t, { beginAtZero: true, ticks: { color: t.mudo, callback: function (v) { return v + ' ms'; } } })
      };
      o.plugins.tooltip.callbacks = { label: function (ctx) { return ctx.dataset.label + ': ' + numero(ctx.parsed.y) + ' ms'; } };
      C.upsert('chAdminLatencia', {
        type: 'line',
        data: {
          labels: h.labels.slice(),
          datasets: [
            { label: 'p50', data: h.p50.slice(), borderColor: COR.blue, backgroundColor: alpha(COR.blue, 0.08), borderWidth: 2, tension: 0.35, pointRadius: 0, fill: false },
            { label: 'p95', data: h.p95.slice(), borderColor: COR.amber, backgroundColor: alpha(COR.amber, 0.08), borderWidth: 2, tension: 0.35, pointRadius: 0, fill: false }
          ]
        },
        options: o
      });
    });
  }

  function desenharInfra() {
    prontoDesenho(function (C) {
      var t = C.temaAtual();
      var lista = INFRA_SERVICOS;
      var o = C.baseOptions(t);
      o.indexAxis = 'y';
      o.animation = C.animacoes ? { duration: 500 } : false;
      o.scales = {
        x: C.escalaY(t, { beginAtZero: true, max: 450, ticks: { color: t.mudo, callback: function (v) { return v + ' ms'; } } }),
        y: C.escalaX(t)
      };
      o.plugins.tooltip.callbacks = { label: function (ctx) { return 'p95: ' + numero(ctx.parsed.x) + ' ms'; } };
      C.upsert('chAdminInfra', {
        type: 'bar',
        data: {
          labels: lista.map(function (s) { return s.nome; }),
          datasets: [{
            label: 'p95', data: lista.map(function (s) { return s.p95; }),
            backgroundColor: lista.map(function (s) { return s.p95 > 300 ? COR.red : s.p95 > 180 ? COR.amber : COR.green; }),
            borderRadius: 6, barThickness: 14
          }]
        },
        options: o
      });
    });
  }

  function desenharAba(aba) {
    if (aba === 'visao') { desenharServicos(); desenharRadar(); }
    else if (aba === 'compliance') { desenharComplianceEvolucao(); }
    else if (aba === 'transmissao') { desenharTransmissao(); desenharLatencia(); }
    else if (aba === 'ativos') { desenharAtivosDoughnut(); desenharAtivosSaude(); }
    else if (aba === 'infra') { desenharInfra(); }
  }

  /* ------------------------------------------------------------------ *
   * 9. Transmissão simulada                                             *
   * ------------------------------------------------------------------ */
  var TIPOS_STREAM = [
    { tipo: 'stock.updated', versao: 'v2', origens: ['PDV-01', 'PDV-02', 'PDV-03', 'COLETOR-02'], destino: 'stock-svc', base: 80 },
    { tipo: 'os.created', versao: 'v3', origens: ['OS-WEB', 'TOTEM-01'], destino: 'os-svc', base: 120 },
    { tipo: 'sale.committed', versao: 'v2', origens: ['PDV-01', 'PDV-02', 'PDV-03'], destino: 'checkout-svc', base: 95 },
    { tipo: 'fiscal.emit', versao: 'v4', origens: ['fiscal-svc'], destino: 'sefaz-gateway', base: 260 },
    { tipo: 'inventory.counted', versao: 'v1', origens: ['COLETOR-01', 'COLETOR-02'], destino: 'stock-svc', base: 140 }
  ];

  function sortear(lista) { return lista[Math.floor(Math.random() * lista.length)]; }

  function skuAleatorio() {
    if (global.DADOS && global.DADOS.PRODUTOS && global.DADOS.PRODUTOS.length) {
      return global.DADOS.PRODUTOS[Math.floor(Math.random() * global.DADOS.PRODUTOS.length)].sku;
    }
    return 'LB-BEB-1042';
  }

  function payloadEvento(t) {
    var base = {
      event_id: 'evt_' + Date.now().toString(36) + '_' + S.stream.seq,
      type: t.tipo,
      version: t.versao,
      occurred_at: new Date().toISOString(),
      source: sortear(t.origens),
      trace_id: 'trc_' + Math.random().toString(36).slice(2, 12),
      store_id: 'LB-014'
    };
    if (t.tipo === 'stock.updated') {
      base.payload = { sku: skuAleatorio(), delta: -1 - Math.floor(Math.random() * 3), saldo: 20 + Math.floor(Math.random() * 60), motivo: 'venda_pdv' };
    } else if (t.tipo === 'os.created') {
      var tipos = ['refrigeracao', 'eletrica', 'pdv', 'preventiva'];
      base.payload = { os_id: 'OS-2026-' + (1160 + Math.floor(Math.random() * 60)), tipo: sortear(tipos), prioridade: Math.random() > 0.7 ? 'critica' : 'alta', asset_tag: sortear(['FRZ-04', 'PDV-03', 'CAM-01', 'NOB-02']) };
    } else if (t.tipo === 'sale.committed') {
      base.payload = { sale_id: 'VD-' + (88000 + Math.floor(Math.random() * 900)), total: Number((40 + Math.random() * 180).toFixed(2)), itens: 2 + Math.floor(Math.random() * 8), payment: sortear(['credit', 'debit', 'pix']) };
    } else if (t.tipo === 'fiscal.emit') {
      base.payload = { nfe_key: '352610' + String(Date.now()).slice(-20), modelo: 'NFC-e', total: Number((60 + Math.random() * 120).toFixed(2)), status: 'autorizada' };
    } else {
      base.payload = { asset_tag: sortear(['CAM-01', 'FRZ-04', 'BAL-01', 'EMP-01']), contagem: 20 + Math.floor(Math.random() * 40), divergencia: sortear([-1, 0, 0, 1]), operador: 'COLETOR-02' };
    }
    return base;
  }

  function montarEvento(t, ts, status, latencia) {
    S.stream.seq++;
    var origem = sortear(t.origens);
    var payload = payloadEvento(t);
    payload.occurred_at = ts.toISOString();
    return {
      id: 'evt_' + S.stream.seq, ts: ts, tipo: t.tipo, versao: t.versao,
      origem: origem, destino: t.destino, status: status, latencia: latencia,
      tentativas: status === 'entregue' ? 1 : (status === 'DLQ' ? 3 : 2),
      payload: payload
    };
  }

  function eventoAleatorio(falha, ts) {
    var t = sortear(TIPOS_STREAM);
    var erro = Math.random() < (falha ? 0.18 : 0.018);
    var status = 'entregue';
    if (erro) status = Math.random() < 0.25 ? 'DLQ' : 'retry';
    var lat = Math.round(t.base + Math.random() * 70 + (falha ? 180 + Math.random() * 420 : 0) + (status !== 'entregue' ? 90 : 0));
    var ev = montarEvento(t, ts || new Date(), status, lat);
    if (status === 'DLQ') {
      var motivos = ['timeout', 'schema inválido', '5xx', 'poison message'];
      var motivo = sortear(motivos);
      var detalhe = motivo === 'timeout' ? 'Timeout de 30 s no consumidor ' + ev.destino :
        motivo === 'schema inválido' ? 'Payload fora do contrato ' + ev.tipo + '.' + ev.versao :
        motivo === '5xx' ? 'Consumidor ' + ev.destino + ' retornou 503 em 3 tentativas' :
        'Mesmo message-id reentregue 12 vezes sem avanço';
      DLQ.unshift({
        id: 'dlq_live_' + ev.id, topico: ev.tipo, motivo: motivo, detalhe: detalhe,
        tentativas: 3, recebida: new Date()
      });
      if (DLQ.length > 6) DLQ.pop();
    }
    return ev;
  }

  function statusCor(status) {
    return status === 'entregue' ? 'var(--green)' : status === 'retry' ? 'var(--amber)' : 'var(--red)';
  }

  function linhaHTML(ev) {
    var btn = '<button type="button" class="btn btn--ghost btn--sm" data-stream-expand aria-expanded="false" aria-label="Expandir payload do evento ' + esc(ev.tipo) + '" title="Ver payload JSON" style="width:18px;height:18px;padding:0;border:0;background:transparent;justify-content:center;color:var(--muted)">' + ico('i-layers') + '</button>';
    var json = JSON.stringify(ev.payload, null, 2);
    return '<div class="stream__row' + (ev.status !== 'entregue' ? ' is-err' : '') + '" data-event-id="' + esc(ev.id) + '">' +
      '<div class="stream__cell mono">' + esc(horaSeg(ev.ts)) + '</div>' +
      '<div class="stream__cell"><span class="mono">' + esc(ev.tipo) + '</span> <span class="chip chip--muted">' + esc(ev.versao) + '</span></div>' +
      '<div class="stream__cell" title="' + esc(ev.origem + ' → ' + ev.destino) + '">' + esc(ev.origem) + ' → ' + esc(ev.destino) + '</div>' +
      '<div class="stream__cell"><span class="stream__status" style="color:' + statusCor(ev.status) + '" title="Tentativas: ' + ev.tentativas + '">' + esc(ev.status) + '</span></div>' +
      '<div class="stream__cell num">' + numero(ev.latencia) + ' ms</div>' +
      '<div class="stream__cell">' + btn + '</div></div>' +
      '<div class="stream__json" hidden><code>' + esc(json) + '</code></div>';
  }

  function semearHistorico() {
    var h = S.stream.hist;
    h.labels = []; h.throughput = []; h.p50 = []; h.p95 = [];
    for (var i = 0; i < 60; i++) {
      var d = new Date(AGORA.getTime() - (60 - i) * 6000);
      h.labels.push(horaSeg(d));
      h.throughput.push(Number((1.4 + Math.sin(i / 5) * 0.35 + Math.random() * 0.45).toFixed(2)));
      h.p50.push(Math.round(58 + Math.sin(i / 4) * 7 + Math.random() * 9));
      h.p95.push(Math.round(172 + Math.sin(i / 6) * 20 + Math.random() * 26));
    }
  }

  function semearLinhas() {
    var body = $('#adminStreamBody', S.raiz);
    if (!body) return;
    var evs = [];
    for (var i = 11; i >= 0; i--) {
      var t = sortear(TIPOS_STREAM);
      var ts = new Date(AGORA.getTime() - i * 8000 - Math.floor(Math.random() * 2500));
      var status = i === 4 ? 'retry' : 'entregue';
      var lat = Math.round(t.base + Math.random() * 55);
      evs.push(montarEvento(t, ts, status, lat));
    }
    body.innerHTML = evs.map(linhaHTML).join('');
    atualizarMetaStream();
  }

  function prepararStream() {
    if (!S.stream.hist.labels.length) semearHistorico();
    var body = $('#adminStreamBody', S.raiz);
    if (body && !body.children.length) semearLinhas();
    atualizarKpiStream();
    atualizarStatusStream();
    atualizarBotaoStream();
  }

  function adicionarLinhas(novos) {
    var body = $('#adminStreamBody', S.raiz);
    if (!body || !novos.length) return;
    var vazio = $('[data-stream-empty]', body);
    if (vazio) vazio.parentNode.removeChild(vazio);
    $$('.stream__row.is-new', body).forEach(function (r) { r.classList.remove('is-new'); });
    var html = novos.slice().reverse().map(function (ev) {
      return linhaHTML(ev).replace('class="stream__row', 'class="stream__row is-new');
    }).join('');
    body.insertAdjacentHTML('afterbegin', html);
    var rows = $$('.stream__row', body);
    while (rows.length > 60) {
      var ultima = rows.pop();
      var json = ultima.nextElementSibling;
      if (json && json.classList.contains('stream__json')) json.parentNode.removeChild(json);
      ultima.parentNode.removeChild(ultima);
    }
    atualizarMetaStream();
  }

  function atualizarMetaStream() {
    var meta = $('#adminStreamMeta', S.raiz);
    if (!meta) return;
    var n = $$('#adminStreamBody .stream__row', S.raiz).length;
    meta.textContent = n + ' linhas no console · atualizado ' + horaSeg(new Date());
  }

  function atualizarKpiStream() {
    function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
    set('adminKpiMsgs', numero(S.stream.msgsMin));
    set('adminKpiLat', numero(S.stream.latP95) + ' ms');
    set('adminKpiErr', decimal(S.stream.taxaErro) + '%');
    set('adminKpiRecon', numero(S.stream.reconexoes));
    atualizarKpisDlq();
  }

  function atualizarKpisDlq() {
    var a = document.getElementById('adminKpiDlq');
    var b = document.getElementById('adminKpiVisaoDlq');
    if (a) a.textContent = String(DLQ.length);
    if (b) b.textContent = String(DLQ.length);
    var c = document.getElementById('adminDlqCount');
    if (c) c.textContent = DLQ.length + ' mensagens';
  }

  function tickStream() {
    var falha = S.stream.falhaTicks > 0;
    var qtd = 1 + Math.floor(Math.random() * 3);
    var novos = [];
    var lats = [];
    var erros = 0;
    var dlqAntes = DLQ.length;
    for (var i = 0; i < qtd; i++) {
      var ev = eventoAleatorio(falha, new Date(Date.now() + i));
      novos.push(ev);
      lats.push(ev.latencia);
      if (ev.status !== 'entregue') erros++;
    }
    adicionarLinhas(novos);

    lats.sort(function (a, b) { return a - b; });
    var p50 = lats[Math.floor((lats.length - 1) / 2)];
    var p95 = lats[Math.min(lats.length - 1, Math.ceil(lats.length * 0.95) - 1)];
    S.stream.latP50 = Math.round(S.stream.latP50 * 0.6 + p50 * 0.4);
    S.stream.latP95 = Math.round(S.stream.latP95 * 0.55 + Math.max(p95, p50 + 30) * 0.45);

    var alvoErro = erros ? (erros / qtd) * 100 : (falha ? 7.5 : 0.9);
    S.stream.taxaErro = Number((S.stream.taxaErro * 0.7 + alvoErro * 0.3).toFixed(2));
    S.stream.msgsMin = Math.round(S.stream.msgsMin * 0.86 + qtd * 50 * 0.14);

    S.stream.hist.labels.push(horaSeg(new Date()));
    S.stream.hist.throughput.push(Number((qtd / 1.2).toFixed(2)));
    S.stream.hist.p50.push(S.stream.latP50);
    S.stream.hist.p95.push(S.stream.latP95);
    while (S.stream.hist.labels.length > 60) {
      S.stream.hist.labels.shift();
      S.stream.hist.throughput.shift();
      S.stream.hist.p50.shift();
      S.stream.hist.p95.shift();
    }

    if (DLQ.length !== dlqAntes) renderDlq();
    atualizarKpiStream();
    S.stream.tick++;
    if (S.stream.tick % 5 === 0 && S.aba === 'transmissao') {
      desenharTransmissao();
      desenharLatencia();
    }
    if (falha) S.stream.falhaTicks = Math.max(0, S.stream.falhaTicks - 1);
    atualizarStatusStream();
  }

  function iniciar() {
    if (!S.montado || !S.raiz) return false;
    if (!$('#adminStreamBody', S.raiz)) return false;
    if (S.stream.timer) return true;
    if (!S.stream.hist.labels.length) semearHistorico();
    S.stream.rodando = true;
    S.stream.timer = global.setInterval(tickStream, 1200);
    S.intervalos.push(S.stream.timer);
    atualizarStatusStream();
    atualizarBotaoStream();
    desenharTransmissao();
    desenharLatencia();
    atualizarMetaStream();
    return true;
  }

  function pararStream() {
    if (S.stream.timer != null) {
      global.clearInterval(S.stream.timer);
      S.intervalos = S.intervalos.filter(function (id) { return id !== S.stream.timer; });
      S.stream.timer = null;
    }
    S.stream.rodando = false;
    atualizarStatusStream();
    atualizarBotaoStream();
  }

  function alternarStream() {
    if (S.stream.timer) {
      pararStream();
      avisar('Stream pausado', 'O console mantém as linhas atuais e retoma do mesmo ponto.', 'info');
    } else {
      iniciar();
      avisar('Stream retomado', 'Novos eventos entram a cada 1,2 s.', 'ok');
    }
  }

  function injetarFalha() {
    S.stream.falhaTicks = 5;
    S.stream.reconexoes += 1;
    if (!S.stream.timer) iniciar();
    atualizarKpiStream();
    atualizarStatusStream();
    avisar('Falha injetada', 'Taxa de erro elevada por 5 ciclos (~6 s). Acompanhe retries e DLQ.', 'warn');
  }

  function limparStream() {
    var body = $('#adminStreamBody', S.raiz);
    if (!body) return;
    body.innerHTML = '<div class="stream__row" data-stream-empty="1"><div class="stream__cell" style="grid-column:1/-1;color:var(--muted)">Console limpo. Aguardando novos eventos…</div></div>';
    atualizarMetaStream();
    avisar('Console limpo', 'As linhas foram removidas; os KPIs e o histórico dos gráficos foram mantidos.', 'info');
  }

  function alternarPayload(btn) {
    var row = btn.closest('.stream__row');
    if (!row) return;
    var json = row.nextElementSibling;
    if (!json || !json.classList.contains('stream__json')) return;
    json.hidden = !json.hidden;
    btn.setAttribute('aria-expanded', json.hidden ? 'false' : 'true');
    btn.setAttribute('title', json.hidden ? 'Ver payload JSON' : 'Ocultar payload JSON');
  }

  function atualizarStatusStream() {
    var pill = document.getElementById('adminStreamStatus');
    if (!pill) return;
    if (!S.stream.rodando) {
      pill.className = 'chip chip--muted';
      pill.innerHTML = '<i></i>PAUSADO';
    } else if (S.stream.falhaTicks > 0) {
      pill.className = 'chip chip--crit';
      pill.innerHTML = '<i></i>FALHA INJETADA · ' + S.stream.falhaTicks + ' ciclos';
    } else {
      pill.className = 'chip chip--ok';
      pill.innerHTML = '<i></i>AO VIVO · 1,2 s';
    }
  }

  function atualizarBotaoStream() {
    var btn = document.getElementById('adminStreamToggle');
    if (!btn) return;
    btn.innerHTML = ico(S.stream.rodando ? 'i-clock' : 'i-refresh') + (S.stream.rodando ? 'Pausar' : 'Retomar');
  }

  function renderDlq() {
    var body = $('#adminDlqBody', S.raiz);
    if (!body) return;
    if (!DLQ.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">Nenhuma mensagem na DLQ. Operação normalizada.</td></tr>';
    } else {
      body.innerHTML = DLQ.map(function (d) {
        var tipo = d.motivo === 'timeout' ? 'low' : d.motivo === '5xx' ? 'crit' : d.motivo === 'schema inválido' ? 'violet' : 'crit';
        return '<tr><td class="mono">' + esc(d.topico) + '</td><td>' + chip(d.motivo, tipo, false) + '</td>' +
          '<td class="muted" title="' + esc(d.detalhe) + '">' + esc(d.detalhe) + '</td>' +
          '<td class="num">' + d.tentativas + '</td><td class="mono">' + esc(horaSeg(d.recebida)) + '</td>' +
          '<td><button type="button" class="btn btn--sm btn--soft" data-dlq-reprocess="' + esc(d.id) + '">Reprocessar</button></td></tr>';
      }).join('');
    }
    atualizarKpisDlq();
  }

  function reprocessarDlq(id) {
    var idx = -1;
    for (var i = 0; i < DLQ.length; i++) { if (DLQ[i].id === id) { idx = i; break; } }
    if (idx < 0) return;
    var d = DLQ[idx];
    DLQ.splice(idx, 1);
    renderDlq();
    atualizarKpiStream();
    avisar('Mensagem reenfileirada', d.topico + ' · ' + d.motivo + '. Consumidor notificado (simulação).', 'ok');
  }

  /* ------------------------------------------------------------------ *
   * 10. Parada e API pública                                            *
   * ------------------------------------------------------------------ */
  function destruirGraficos() {
    var C = global.Charts;
    if (!C) return;
    try {
      Object.keys(C.registry || {}).forEach(function (id) {
        if (id.indexOf('chAdmin') === 0) C.destroy(id);
      });
    } catch (e) { /* registry indisponível */ }
  }

  function parar() {
    pararStream();
    (S.intervalos || []).forEach(function (id) { global.clearInterval(id); });
    S.intervalos = [];
    S.geracao++;
    destruirGraficos();
    atualizarStatusStream();
    atualizarBotaoStream();
  }

  DADOS_ADMIN.transmissao = S.stream;

  global.ADMIN = {
    render: render,
    abrir: abrir,
    parar: parar,
    iniciar: iniciar,
    dados: DADOS_ADMIN
  };
})(window);
