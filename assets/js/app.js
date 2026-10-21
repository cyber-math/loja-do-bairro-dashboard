/* =========================================================================
   Loja do Bairro — Painel de Operações
   Aplicação: estado, renderização, filtros, interações e navegação.
   ========================================================================= */
(function (global) {
  'use strict';

  var D = global.DADOS;
  var C = global.Charts;
  var F = global.FMT;

  /* ------------------------------------------------------------------ *
   * Utilidades                                                          *
   * ------------------------------------------------------------------ */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function alpha(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function delta(atual, anterior) {
    if (!anterior || anterior === 0) return null;
    return ((atual - anterior) / Math.abs(anterior)) * 100;
  }

  function soma(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }

  function bucketizar(valores, rotulos, maxPontos) {
    if (valores.length <= maxPontos) return { valores: valores, rotulos: rotulos };
    var passo = Math.ceil(valores.length / maxPontos);
    var v = [], r = [];
    for (var i = 0; i < valores.length; i += passo) {
      var s = 0;
      for (var j = i; j < Math.min(i + passo, valores.length); j++) s += valores[j];
      v.push(s);
      r.push(rotulos[Math.min(i, rotulos.length - 1)]);
    }
    return { valores: v, rotulos: r };
  }

  function sparkline(valores, cor) {
    if (!valores || !valores.length) return '';
    var w = 100, h = 34, pad = 3;
    var min = Math.min.apply(null, valores);
    var max = Math.max.apply(null, valores);
    var range = max - min || 1;
    var pts = valores.map(function (v, i) {
      return [pad + i * (w - pad * 2) / Math.max(1, valores.length - 1), h - pad - ((v - min) / range) * (h - pad * 2)];
    });
    var d = 'M' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2);
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i];
      var cx = (p0[0] + p1[0]) / 2;
      d += ' C' + cx.toFixed(2) + ',' + p0[1].toFixed(2) + ' ' + cx.toFixed(2) + ',' + p1[1].toFixed(2) + ' ' + p1[0].toFixed(2) + ',' + p1[1].toFixed(2);
    }
    var uid = 'sg' + Math.random().toString(36).slice(2, 8);
    var area = d + ' L' + pts[pts.length - 1][0].toFixed(2) + ',' + h + ' L' + pts[0][0].toFixed(2) + ',' + h + ' Z';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + cor + '" stop-opacity=".35"/>' +
      '<stop offset="100%" stop-color="' + cor + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + uid + ')"/>' +
      '<path d="' + d + '" fill="none" stroke="' + cor + '" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  /* ------------------------------------------------------------------ *
   * Estado                                                              *
   * ------------------------------------------------------------------ */
  var state = {
    view: 'dashboard',
    dias: 30,
    categoria: 'todas',
    prioridade: 'todas',
    statusOS: 'todas',
    tipoOS: 'todas',
    responsavelOS: 'todas',
    buscaOS: '',
    buscaEstoque: '',
    statusEstoque: 'todas',
    ordemEstoque: 'receita',
    pageEstoque: 1,
    pageOS: 1,
    pageSize: 10,
    osMode: 'tabela',
    configTab: 'aparencia',
    adminTab: 'visao'
  };

  var sortState = {
    estoque: { campo: 'receita', dir: -1 },
    os: { campo: 'abertura', dir: -1 }
  };

  /* ------------------------------------------------------------------ *
   * Navegação                                                           *
   * ------------------------------------------------------------------ */
  var VIEW_META = {
    dashboard: { titulo: 'Dashboard', sub: 'Visão consolidada de estoque, operação e manutenção' },
    estoque: { titulo: 'Estoque', sub: 'Catálogo, cobertura e saúde dos produtos' },
    ordens: { titulo: 'Ordens de Serviço', sub: 'Chamados de manutenção, SLA e custos' },
    analytics: { titulo: 'Analytics', sub: 'Curva ABC, projeções, sazonalidade e fornecedores' },
    fornecedores: { titulo: 'Fornecedores', sub: 'Prazo, qualidade e participação no portfólio' },
    config: { titulo: 'Configurações', sub: 'Preferências, segurança e administração da plataforma' }
  };

  function navegar(view) {
    if (!VIEW_META[view]) return;
    state.view = view;
    $$('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-' + view); });
    $$('.nav__item').forEach(function (b) { b.classList.toggle('is-active', b.dataset.view === view); });
    $('#pageTitle').textContent = VIEW_META[view].titulo;
    $('#pageSubtitle').textContent = VIEW_META[view].sub;
    if (view === 'dashboard') renderDashboard();
    if (view === 'estoque') renderEstoque();
    if (view === 'ordens') renderOrdens();
    if (view === 'analytics') renderAnalytics();
    if (view === 'fornecedores') renderFornecedores();
    if (view === 'config') { renderConfig(); configTab(state.configTab); }
    if (view !== 'config' && global.ADMIN && global.ADMIN.parar) global.ADMIN.parar();
    fecharSidebar();
    global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function abrirSidebar() { $('#sidebar').classList.add('is-open'); $('#scrim').classList.add('is-open'); }
  function fecharSidebar() { $('#sidebar').classList.remove('is-open'); $('#scrim').classList.remove('is-open'); }

  /**
   * Roteamento por hash — permite links externos (ex.: 404.html → ./#config)
   * abrirem a view/aba correspondente.
   */
  function rotaHash() {
    var bruto = (global.location.hash || '').replace('#', '');
    if (!bruto) return;
    var partes = bruto.split('/');
    var view = partes[0];
    if (!VIEW_META[view]) return;
    navegar(view);
    if (view === 'config' && partes[1]) configTab(partes[1]);
  }

  /* ------------------------------------------------------------------ *
   * Dados derivados                                                     *
   * ------------------------------------------------------------------ */
  function produtosFiltrados() {
    return D.PRODUTOS.filter(function (p) {
      return state.categoria === 'todas' || p.catId === state.categoria;
    });
  }

  function osFiltradas(opts) {
    var o = {
      dias: state.dias,
      status: state.statusOS,
      tipo: state.tipoOS,
      prioridade: state.prioridade === 'todas' ? 'todas' : state.prioridade,
      responsavel: state.responsavelOS,
      texto: state.buscaOS
    };
    if (opts) Object.keys(opts).forEach(function (k) { o[k] = opts[k]; });
    return D.filtrarOS(o);
  }

  function metricas() {
    var jan = D.janela(state.dias);
    var prevFim = jan.ini - 1;
    var prevIni = Math.max(0, prevFim - state.dias + 1);
    var cat = state.categoria;
    var produtos = produtosFiltrados();

    var atual = D.agregar(D.PRODUTOS, cat, jan.ini, jan.fim);
    var anterior = prevFim >= prevIni ? D.agregar(D.PRODUTOS, cat, prevIni, prevFim) : null;
    var serie = D.serieDiaria(D.PRODUTOS, cat, jan.ini, jan.fim);

    var valorEstoque = soma(produtos.map(function (p) { return p.valorEmEstoque; }));
    var idx30 = Math.max(0, D.DIAS - 1 - 30);
    var valorEstoque30 = soma(produtos.map(function (p) { return p.serieEstoque[idx30] * p.custo; }));

    var criticos = produtos.filter(function (p) { return p.coberturaDias <= 7; });
    var parados = produtos.filter(function (p) { return p.diasSemVenda >= 30; });

    var os = osFiltradas();
    var resumo = D.resumoOS(os);

    var clientes = soma(serie.clientes);
    var ticket = clientes ? atual.receita / clientes : 0;
    var ticketPrev = anterior && anterior.receita ? anterior.receita / Math.max(1, Math.round(anterior.unidades / 2.8)) : 0;

    return {
      jan: jan, produtos: produtos, atual: atual, anterior: anterior, serie: serie,
      valorEstoque: valorEstoque, valorEstoque30: valorEstoque30,
      criticos: criticos, parados: parados,
      os: os, resumo: resumo,
      clientes: clientes, ticket: ticket, ticketPrev: ticketPrev
    };
  }

  /* ------------------------------------------------------------------ *
   * KPIs                                                                *
   * ------------------------------------------------------------------ */
  function kpiHTML(k, i) {
    var d = k.delta;
    var classe = d == null ? 'is-flat' : d > 0.4 ? 'is-up' : d < -0.4 ? 'is-down' : 'is-flat';
    var seta = d == null ? '' : d > 0 ? '▲' : d < 0 ? '▼' : '■';
    var deltaTxt = d == null ? 'sem base' : (d > 0 ? '+' : '') + F.decimal(d) + '%';
    return '<article class="kpi" style="--kpi-accent:' + k.cor + ';animation-delay:' + (i * 45) + 'ms">' +
      '<div class="kpi__top">' +
        '<span class="kpi__label">' + esc(k.label) + '</span>' +
        '<span class="kpi__icon"><svg class="ico"><use href="#' + k.icone + '"/></svg></span>' +
      '</div>' +
      '<div class="kpi__value">' + k.valor + '</div>' +
      '<div class="kpi__row">' +
        '<span class="kpi__delta ' + classe + '">' + seta + ' ' + deltaTxt + '</span>' +
        '<span class="kpi__cmp">' + esc(k.comparativo) + '</span>' +
      '</div>' +
      '<div class="kpi__spark">' + (k.spark ? sparkline(k.spark, k.cor) : '') + '</div>' +
      (k.progresso != null ? '<div class="kpi__bar"><i style="width:' + Math.max(0, Math.min(100, k.progresso)) + '%"></i></div>' : '') +
      '<div class="kpi__meta"><span>' + esc(k.metaEsq || '') + '</span><span>' + esc(k.metaDir || '') + '</span></div>' +
      '</article>';
  }

  function renderKPIs(m) {
    var a = m.atual, ant = m.anterior;
    var osRes = m.resumo;
    var metaMensal = 620000;
    var receitaProjetada = (a.receita / state.dias) * 30;

    var kpis = [
      {
        label: 'Receita do período', valor: F.moedaCurta(a.receita), cor: '#10b981', icone: 'i-trend-up',
        delta: ant ? delta(a.receita, ant.receita) : null, comparativo: 'vs. período anterior',
        spark: m.serie.receita, progresso: (receitaProjetada / metaMensal) * 100,
        metaEsq: 'Meta ' + F.moedaCurta(metaMensal) + '/mês', metaDir: Math.round((receitaProjetada / metaMensal) * 100) + '% da meta'
      },
      {
        label: 'Lucro bruto', valor: F.moedaCurta(a.lucro), cor: '#8b5cf6', icone: 'i-chart',
        delta: ant ? delta(a.lucro, ant.lucro) : null, comparativo: 'margem ' + F.decimal(a.receita ? (a.lucro / a.receita) * 100 : 0) + '%',
        spark: m.serie.receita.map(function (v, i) { return v - m.serie.custo[i]; }),
        progresso: a.receita ? (a.lucro / a.receita) * 100 : 0,
        metaEsq: 'Margem sobre receita', metaDir: a.receita ? Math.round((a.lucro / a.receita) * 100) + '%' : '—'
      },
      {
        label: 'Ticket médio', valor: F.moeda(m.ticket), cor: '#3b82f6', icone: 'i-target',
        delta: m.ticketPrev ? delta(m.ticket, m.ticketPrev) : null, comparativo: F.numero(m.clientes) + ' compradores',
        spark: m.serie.receita.map(function (v, i) { return v / Math.max(1, m.serie.clientes[i]); }),
        progresso: 68, metaEsq: 'Meta R$ 62,00', metaDir: m.ticket >= 62 ? 'Meta atingida' : 'Abaixo da meta'
      },
      {
        label: 'Unidades vendidas', valor: F.numero(a.unidades), cor: '#06b6d4', icone: 'i-box',
        delta: ant ? delta(a.unidades, ant.unidades) : null, comparativo: 'itens no período',
        spark: m.serie.unidades, progresso: 74,
        metaEsq: 'Giro médio ' + F.numero(a.unidades / state.dias) + '/dia', metaDir: 'Cobertura ' + Math.round(soma(m.produtos.map(function (p) { return p.coberturaDias; })) / Math.max(1, m.produtos.length)) + 'd'
      },
      {
        label: 'Valor em estoque', valor: F.moedaCurta(m.valorEstoque), cor: '#f59e0b', icone: 'i-layers',
        delta: m.valorEstoque30 ? delta(m.valorEstoque, m.valorEstoque30) : null, comparativo: 'a custo de aquisição',
        spark: (function () {
          var arr = [];
          for (var i = Math.max(0, D.DIAS - state.dias); i < D.DIAS; i += Math.max(1, Math.floor(state.dias / 14))) {
            arr.push(soma(m.produtos.map(function (p) { return p.serieEstoque[i] * p.custo; })));
          }
          return arr;
        })(),
        progresso: Math.min(100, (m.valorEstoque / 380000) * 100),
        metaEsq: F.numero(m.produtos.length) + ' SKUs ativos', metaDir: 'Capacidade 380 mil'
      },
      {
        label: 'Produtos críticos', valor: F.numero(m.criticos.length), cor: '#ef4444', icone: 'i-alert',
        delta: null, comparativo: 'cobertura ≤ 7 dias',
        spark: null, progresso: (m.criticos.length / Math.max(1, m.produtos.length)) * 100,
        metaEsq: Math.round((m.criticos.length / Math.max(1, m.produtos.length)) * 100) + '% do catálogo', metaDir: F.numero(m.parados.length) + ' sem giro'
      },
      {
        label: 'OS em aberto', valor: F.numero(osRes.total - osRes.concluida - osRes.cancelada), cor: '#6366f1', icone: 'i-tool',
        delta: null, comparativo: osRes.slaEstourado + ' com SLA estourado',
        spark: (function () {
          var arr = [];
          for (var i = Math.max(0, D.DIAS - state.dias); i < D.DIAS; i += Math.max(1, Math.floor(state.dias / 14))) arr.push(D.OS_POR_DIA[i].abertas);
          return arr;
        })(),
        progresso: osRes.total ? ((osRes.total - osRes.concluida - osRes.cancelada) / osRes.total) * 100 : 0,
        metaEsq: F.numero(osRes.total) + ' chamados no período', metaDir: Math.round(osRes.taxaConclusao * 100) + '% concluídos'
      },
      {
        label: 'Custo de manutenção', valor: F.moedaCurta(osRes.custo), cor: '#ec4899', icone: 'i-download',
        delta: null, comparativo: 'OS concluídas no período',
        spark: (function () {
          var arr = [], acumulado = [];
          for (var i = Math.max(0, D.DIAS - state.dias); i < D.DIAS; i++) acumulado.push(D.OS_POR_DIA[i].custo);
          var passo = Math.max(1, Math.ceil(acumulado.length / 14)), s = 0;
          for (var k = 0; k < acumulado.length; k++) { s += acumulado[k]; if ((k + 1) % passo === 0) { arr.push(s); s = 0; } }
          return arr;
        })(),
        progresso: Math.min(100, (osRes.custo / 60000) * 100),
        metaEsq: 'Ticket médio ' + F.moedaCurta(osRes.custoMedio), metaDir: 'Orçamento 60 mil'
      }
    ];

    $('#kpiGrid').innerHTML = kpis.map(kpiHTML).join('');
  }

  /* ------------------------------------------------------------------ *
   * Dashboard                                                           *
   * ------------------------------------------------------------------ */
  function renderDashboard() {
    if (state.view !== 'dashboard') return;
    var m = metricas();
    renderKPIs(m);
    $('#periodHint').textContent = 'Últimos ' + state.dias + ' dias · ' + (state.categoria === 'todas' ? 'todas as categorias' : D.categoria(state.categoria).nome);
    renderAlertas(m);
    renderOSRecentes(m);
    renderGraficosDashboard(m);
  }

  function renderAlertas(m) {
    var a = [];
    if (m.criticos.length) {
      a.push({
        cor: '#ef4444', icone: 'i-alert',
        titulo: m.criticos.length + ' produtos em nível crítico',
        desc: 'Cobertura inferior a 7 dias: ' + m.criticos.slice(0, 3).map(function (p) { return p.nome.split(' ').slice(0, 3).join(' '); }).join(', ') + (m.criticos.length > 3 ? '…' : ''),
        tag: 'Repor'
      });
    }
    if (m.resumo.slaEstourado) {
      a.push({
        cor: '#f59e0b', icone: 'i-clock',
        titulo: m.resumo.slaEstourado + ' chamados com SLA estourado',
        desc: 'Ordens em aberto há mais tempo que o prazo contratado. Priorize a fila de refrigeração.',
        tag: 'SLA'
      });
    }
    if (m.parados.length) {
      a.push({
        cor: '#8b5cf6', icone: 'i-layers',
        titulo: m.parados.length + ' SKUs sem giro há 30+ dias',
        desc: F.moedaCurta(soma(m.parados.map(function (p) { return p.valorEmEstoque; }))) + ' imobilizados em estoque parado.',
        tag: 'Capital'
      });
    }
    var catTop = Object.keys(m.atual.porCat).map(function (id) {
      return { id: id, receita: m.atual.porCat[id].receita };
    }).sort(function (x, y) { return y.receita - x.receita; })[0];
    if (catTop && catTop.receita) {
      a.push({
        cor: '#10b981', icone: 'i-trend-up',
        titulo: D.categoria(catTop.id).nome + ' lidera o faturamento',
        desc: F.moedaCurta(catTop.receita) + ' no período — ' + Math.round((catTop.receita / m.atual.receita) * 100) + '% da receita total.',
        tag: 'Insight'
      });
    }
    if (!a.length) a.push({ cor: '#10b981', icone: 'i-check', titulo: 'Nenhum alerta no período', desc: 'Operação dentro dos parâmetros monitorados.', tag: 'OK' });

    $('#alertas').innerHTML = a.map(function (x) {
      return '<div class="alert" style="--a-color:' + x.cor + '">' +
        '<span class="alert__icon"><svg class="ico"><use href="#' + x.icone + '"/></svg></span>' +
        '<div><div class="alert__title">' + esc(x.titulo) + '</div><div class="alert__desc">' + esc(x.desc) + '</div></div>' +
        '<span class="chip chip--muted alert__tag">' + esc(x.tag) + '</span></div>';
    }).join('');
  }

  function renderOSRecentes(m) {
    var lista = m.os.slice(0, 6);
    if (!lista.length) {
      $('#osRecentes').innerHTML = '<p class="muted" style="font-size:12.5px;padding:12px 0">Nenhuma OS no período com os filtros atuais.</p>';
      return;
    }
    $('#osRecentes').innerHTML = lista.map(function (o) {
      var st = D.statusOS(o.statusId);
      var tp = D.tipoOS(o.tipoId);
      var prio = D.prioridade(o.prioridadeId);
      return '<div class="os-item" data-os="' + esc(o.id) + '" style="--o-color:' + st.cor + '">' +
        '<span class="os-item__bar"></span>' +
        '<div class="os-item__body">' +
          '<div class="os-item__title">' + esc(o.titulo) + '</div>' +
          '<div class="os-item__meta"><span class="mono">' + esc(o.id) + '</span><span>·</span><span>' + esc(tp.nome) + '</span><span>·</span><span>' + esc(o.setor) + '</span></div>' +
        '</div>' +
        '<div class="os-item__right">' +
          '<span class="chip" style="color:' + st.cor + ';background:' + alpha(st.cor, .13) + '">' + esc(st.nome) + '</span>' +
          '<div class="os-item__meta" style="justify-content:flex-end"><span style="color:' + prio.cor + '">' + esc(prio.nome) + '</span></div>' +
        '</div></div>';
    }).join('');
  }

  var coresCat = function () {
    var o = {};
    D.CATEGORIAS.forEach(function (c) { o[c.id] = c.cor; });
    return o;
  };

  function renderGraficosDashboard(m) {
    if (!C || !C.disponivel) return;
    var t = C.temaAtual();
    var mensal = D.serieMensal(D.PRODUTOS, state.categoria);

    /* --- Receita, custo e lucro --- */
    C.upsert('chFinanceiro', {
      type: 'line',
      data: {
        labels: mensal.meses.map(function (x) { return x.rotulo; }),
        datasets: [
          {
            label: 'Receita', data: mensal.dados.map(function (x) { return x.receita; }),
            borderColor: '#10b981', borderWidth: 2.4, tension: .4, pointRadius: 0, pointHoverRadius: 4,
            pointHoverBackgroundColor: '#10b981', pointHoverBorderColor: '#fff', fill: true,
            backgroundColor: function (ctx) {
              var area = ctx.chart.chartArea;
              if (!area) return alpha('#10b981', .12);
              var g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, alpha('#10b981', .34));
              g.addColorStop(1, alpha('#10b981', 0));
              return g;
            }
          },
          {
            label: 'Custo', data: mensal.dados.map(function (x) { return x.custo; }),
            borderColor: '#f59e0b', borderWidth: 2, borderDash: [5, 4], tension: .4, pointRadius: 0, pointHoverRadius: 4, fill: false
          },
          {
            label: 'Lucro', data: mensal.dados.map(function (x) { return x.lucro; }),
            borderColor: '#8b5cf6', borderWidth: 2, tension: .4, pointRadius: 0, pointHoverRadius: 4, fill: false
          }
        ]
      },
      options: C.baseOptions(t, {
        scales: {
          x: C.escalaX(t),
          y: C.escalaY(t, { ticks: { color: t.mudo, callback: function (v) { return F.moedaCurta(v); }, font: { size: 11 } } })
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + F.moeda(ctx.parsed.y); } }
          }
        }
      })
    });

    $('#legendFinanceiro').innerHTML = [
      ['#10b981', 'Receita'], ['#f59e0b', 'Custo'], ['#8b5cf6', 'Lucro']
    ].map(function (x) { return '<span><i style="background:' + x[0] + '"></i>' + x[1] + '</span>'; }).join('');

    /* --- Doughnut estoque por categoria --- */
    var cats = D.CATEGORIAS.map(function (c) {
      return {
        id: c.id, nome: c.nome, cor: c.cor,
        valor: soma(m.produtos.filter(function (p) { return p.catId === c.id; }).map(function (p) { return p.valorEmEstoque; }))
      };
    }).filter(function (c) { return c.valor > 0; }).sort(function (a, b) { return b.valor - a.valor; });

    C.upsert('chCategorias', {
      type: 'doughnut',
      data: {
        labels: cats.map(function (c) { return c.nome; }),
        datasets: [{
          data: cats.map(function (c) { return c.valor; }),
          backgroundColor: cats.map(function (c) { return c.cor; }),
          borderColor: t.surface, borderWidth: 3, hoverOffset: 8
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        animation: C.animacoes ? { animateRotate: true, duration: 700 } : false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: {
              label: function (ctx) {
                var total = soma(ctx.dataset.data);
                return ' ' + F.moeda(ctx.parsed) + ' · ' + Math.round((ctx.parsed / total) * 100) + '%';
              }
            }
          }
        },
        onClick: function (evt, els) {
          if (!els.length) return;
          var nome = cats[els[0].index].nome;
          state.categoria = state.categoria === cats[els[0].index].id ? 'todas' : cats[els[0].index].id;
          $('#fCategoria').value = state.categoria;
          toast('Filtro aplicado', nome + ' · ' + (state.categoria === 'todas' ? 'exibindo todas as categorias' : 'exibindo apenas ' + nome), 'ok');
          renderDashboard();
        }
      }
    });

    var totalEstoque = soma(cats.map(function (c) { return c.valor; }));
    $('#catLegend').innerHTML = cats.slice(0, 5).map(function (c) {
      return '<li><i style="background:' + c.cor + '"></i>' + esc(c.nome) +
        '<span class="mini-list__val">' + F.moedaCurta(c.valor) + '</span>' +
        '<span class="mini-list__pct">' + Math.round((c.valor / Math.max(1, totalEstoque)) * 100) + '%</span></li>';
    }).join('');

    /* --- Volume x ticket --- */
    var labelsDiarios = [];
    for (var i = m.jan.ini; i <= m.jan.fim; i++) labelsDiarios.push(F.data(D.DATAS[i]));
    var bkU = bucketizar(m.serie.unidades, labelsDiarios, 14);
    var bkR = bucketizar(m.serie.receita, labelsDiarios, 14);
    var ticketSerie = bkR.valores.map(function (r, idx) { return r / Math.max(1, bkU.valores[idx] / 2.8); });

    C.upsert('chVolume', {
      type: 'bar',
      data: {
        labels: bkU.rotulos,
        datasets: [
          {
            type: 'bar', label: 'Unidades', data: bkU.valores,
            backgroundColor: alpha('#06b6d4', .55), hoverBackgroundColor: '#06b6d4',
            borderRadius: 5, borderSkipped: false, maxBarThickness: 34, yAxisID: 'y'
          },
          {
            type: 'line', label: 'Ticket médio', data: ticketSerie,
            borderColor: '#f59e0b', borderWidth: 2.2, tension: .4, pointRadius: 0, pointHoverRadius: 4,
            fill: false, yAxisID: 'y1'
          }
        ]
      },
      options: C.baseOptions(t, {
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: C.escalaX(t, { grid: { display: false } }),
          y: C.escalaY(t, { position: 'left' }),
          y1: {
            position: 'right', beginAtZero: false,
            grid: { display: false }, border: { display: false },
            ticks: { color: t.mudo, font: { size: 11 }, callback: function (v) { return F.moedaCurta(v); } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: {
              label: function (ctx) {
                if (ctx.dataset.label === 'Ticket médio') return 'Ticket médio: ' + F.moeda(ctx.parsed.y);
                return 'Unidades: ' + F.numero(ctx.parsed.y);
              }
            }
          }
        }
      })
    });

    /* --- OS por status (doughnut) --- */
    var statusCount = D.STATUS_OS.map(function (s) {
      return { id: s.id, nome: s.nome, cor: s.cor, total: m.os.filter(function (o) { return o.statusId === s.id; }).length };
    }).filter(function (s) { return s.total > 0; });

    C.upsert('chStatusOS', {
      type: 'doughnut',
      data: {
        labels: statusCount.map(function (s) { return s.nome; }),
        datasets: [{
          data: statusCount.map(function (s) { return s.total; }),
          backgroundColor: statusCount.map(function (s) { return s.cor; }),
          borderColor: t.surface, borderWidth: 3, hoverOffset: 7
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '64%',
        animation: C.animacoes ? { animateRotate: true, duration: 700 } : false,
        plugins: {
          legend: {
            display: true, position: 'right',
            labels: { color: t.texto2, boxWidth: 9, boxHeight: 9, usePointStyle: true, pointStyle: 'circle', padding: 12, font: { family: 'Inter', size: 11.5 } }
          },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: { label: function (ctx) { return ' ' + ctx.parsed + ' chamados'; } }
          }
        },
        onClick: function (evt, els) {
          if (!els.length) return;
          var alvo = statusCount[els[0].index];
          state.statusOS = state.statusOS === alvo.id ? 'todas' : alvo.id;
          toast('Filtro de OS', state.statusOS === 'todas' ? 'Exibindo todos os status' : 'Status: ' + alvo.nome, 'info');
          navegar('ordens');
        }
      }
    });

    /* --- Saúde do estoque --- */
    var faixas = [
      { nome: 'Crítico (≤3d)', min: 0, max: 3, cor: '#ef4444' },
      { nome: 'Baixo (4-7d)', min: 4, max: 7, cor: '#f59e0b' },
      { nome: 'Saudável (8-30d)', min: 8, max: 30, cor: '#10b981' },
      { nome: 'Excesso (>30d)', min: 31, max: Infinity, cor: '#3b82f6' }
    ];
    var faixaDados = faixas.map(function (f) {
      return m.produtos.filter(function (p) { return p.coberturaDias >= f.min && p.coberturaDias <= f.max; }).length;
    });

    C.upsert('chSaude', {
      type: 'bar',
      data: {
        labels: faixas.map(function (f) { return f.nome; }),
        datasets: [{
          data: faixaDados,
          backgroundColor: faixas.map(function (f) { return alpha(f.cor, .72); }),
          hoverBackgroundColor: faixas.map(function (f) { return f.cor; }),
          borderRadius: 6, borderSkipped: false, maxBarThickness: 46
        }]
      },
      options: C.baseOptions(t, {
        indexAxis: 'y',
        scales: {
          x: C.escalaY(t, { beginAtZero: true, ticks: { color: t.mudo, font: { size: 11 }, precision: 0 } }),
          y: C.escalaX(t, { grid: { display: false }, ticks: { color: t.texto2, font: { size: 11.5 } } })
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: { label: function (ctx) { return ctx.parsed.x + ' SKUs'; } }
          }
        }
      })
    });

    /* --- Top produtos --- */
    var receitasProduto = m.produtos.map(function (p) {
      var r = 0;
      for (var d = m.jan.ini; d <= m.jan.fim; d++) r += p.serieReceita[d];
      return { nome: p.nome, receita: r, cor: D.categoria(p.catId).cor };
    }).sort(function (a, b) { return b.receita - a.receita; }).slice(0, 8);

    C.upsert('chTopProdutos', {
      type: 'bar',
      data: {
        labels: receitasProduto.map(function (p) { return p.nome.length > 26 ? p.nome.slice(0, 24) + '…' : p.nome; }),
        datasets: [{
          data: receitasProduto.map(function (p) { return p.receita; }),
          backgroundColor: receitasProduto.map(function (p) { return alpha(p.cor, .8); }),
          hoverBackgroundColor: receitasProduto.map(function (p) { return p.cor; }),
          borderRadius: 5, borderSkipped: false, maxBarThickness: 18
        }]
      },
      options: C.baseOptions(t, {
        indexAxis: 'y',
        scales: {
          x: C.escalaY(t, { beginAtZero: true, ticks: { color: t.mudo, font: { size: 10.5 }, callback: function (v) { return F.moedaCurta(v); } } }),
          y: C.escalaX(t, { grid: { display: false }, ticks: { color: t.texto2, font: { size: 10.5 } } })
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: { label: function (ctx) { return F.moeda(ctx.parsed.x); } }
          }
        }
      })
    });
  }

  /* ------------------------------------------------------------------ *
   * Estoque                                                             *
   * ------------------------------------------------------------------ */
  function statusEstoqueDe(p) {
    if (p.diasSemVenda >= 30) return { id: 'parado', nome: 'Parado', cor: '#8b5cf6', classe: 'chip--violet' };
    if (p.coberturaDias <= 3) return { id: 'critico', nome: 'Crítico', cor: '#ef4444', classe: 'chip--crit' };
    if (p.coberturaDias <= 7) return { id: 'baixo', nome: 'Baixo', cor: '#f59e0b', classe: 'chip--low' };
    if (p.coberturaDias > 30) return { id: 'excesso', nome: 'Excesso', cor: '#3b82f6', classe: 'chip--info' };
    return { id: 'ok', nome: 'Saudável', cor: '#10b981', classe: 'chip--ok' };
  }

  function estoqueLista() {
    var jan = D.janela(state.dias);
    var termo = state.buscaEstoque.toLowerCase();
    var lista = produtosFiltrados().map(function (p) {
      var receita = 0;
      for (var d = jan.ini; d <= jan.fim; d++) receita += p.serieReceita[d];
      return {
        ref: p, nome: p.nome, sku: p.sku, categoria: D.categoria(p.catId).nome, catId: p.catId,
        preco: p.preco, margem: p.margemPct * 100, estoque: p.estoqueAtual,
        cobertura: p.coberturaDias, receita: receita, valor: p.valorEmEstoque,
        status: statusEstoqueDe(p)
      };
    }).filter(function (x) {
      if (termo && (x.nome + ' ' + x.sku).toLowerCase().indexOf(termo) === -1) return false;
      if (state.statusEstoque !== 'todas' && x.status.id !== state.statusEstoque) return false;
      return true;
    });

    var campo = sortState.estoque.campo, dir = sortState.estoque.dir;
    lista.sort(function (a, b) {
      var va = a[campo], vb = b[campo];
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
    return lista;
  }

  function renderEstoque() {
    if (state.view !== 'estoque') return;
    var m = metricas();
    var lista = estoqueLista();

    $('#estoqueStrip').innerHTML = [
      { l: 'Valor em estoque', v: F.moedaCurta(m.valorEstoque), f: F.numero(m.produtos.length) + ' SKUs · custo de aquisição' },
      { l: 'Cobertura média', v: Math.round(soma(m.produtos.map(function (p) { return p.coberturaDias; })) / Math.max(1, m.produtos.length)) + ' dias', f: 'Autonomia média do catálogo' },
      { l: 'Abaixo do mínimo', v: F.numero(m.criticos.length), f: 'Produtos com cobertura ≤ 7 dias' },
      { l: 'Capital parado', v: F.moedaCurta(soma(m.parados.map(function (p) { return p.valorEmEstoque; }))), f: F.numero(m.parados.length) + ' SKUs sem giro há 30+ dias' },
      { l: 'Margem média', v: F.decimal(soma(m.produtos.map(function (p) { return p.margemPct; })) / Math.max(1, m.produtos.length) * 100) + '%', f: 'Sobre o preço de venda' }
    ].map(function (s) {
      return '<div class="stat"><div class="stat__label">' + s.l + '</div><div class="stat__value">' + s.v + '</div><div class="stat__foot">' + s.f + '</div></div>';
    }).join('');

    var totalPag = Math.max(1, Math.ceil(lista.length / state.pageSize));
    state.pageEstoque = Math.min(state.pageEstoque, totalPag);
    var ini = (state.pageEstoque - 1) * state.pageSize;
    var pagina = lista.slice(ini, ini + state.pageSize);

    $('#tabelaEstoque tbody').innerHTML = pagina.map(function (x) {
      var maxCob = 45;
      var pct = Math.min(100, (x.cobertura / maxCob) * 100);
      return '<tr class="' + (x.status.id === 'critico' ? 'row-danger' : '') + '">' +
        '<td><span class="table__primary">' + esc(x.nome) + '</span><span class="table__sub mono">' + esc(x.sku) + '</span></td>' +
        '<td><span class="chip chip--muted">' + esc(x.categoria) + '</span></td>' +
        '<td class="num mono">' + F.moeda(x.preco) + '</td>' +
        '<td class="num">' + F.decimal(x.margem) + '%</td>' +
        '<td class="num mono">' + F.numero(x.estoque) + '</td>' +
        '<td><div class="coverage"><div class="mini-bar"><i style="width:' + pct + '%;background:' + x.status.cor + '"></i></div><b>' + (x.cobertura > 365 ? '365+' : x.cobertura) + 'd</b></div></td>' +
        '<td class="num mono">' + F.moedaCurta(x.receita) + '</td>' +
        '<td class="num mono">' + F.moedaCurta(x.valor) + '</td>' +
        '<td><span class="chip ' + x.status.classe + '"><i></i>' + x.status.nome + '</span></td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px">Nenhum produto encontrado com os filtros atuais.</td></tr>';

    $('#estoqueCount').textContent = lista.length + ' produtos · ' + (state.categoria === 'todas' ? 'todas as categorias' : D.categoria(state.categoria).nome);
    $('#estoqueFoot').textContent = 'Mostrando ' + (lista.length ? ini + 1 : 0) + '–' + Math.min(ini + state.pageSize, lista.length) + ' de ' + lista.length;
    $('#estoquePage').textContent = state.pageEstoque + ' / ' + totalPag;
    $('#estoquePrev').disabled = state.pageEstoque <= 1;
    $('#estoqueNext').disabled = state.pageEstoque >= totalPag;

    renderGraficosEstoque(m);
  }

  function renderGraficosEstoque(m) {
    if (!C || !C.disponivel) return;
    var t = C.temaAtual();

    var criticos = m.produtos.slice().sort(function (a, b) { return a.coberturaDias - b.coberturaDias; }).slice(0, 12);
    C.upsert('chCobertura', {
      type: 'bar',
      data: {
        labels: criticos.map(function (p) { return p.nome.length > 24 ? p.nome.slice(0, 22) + '…' : p.nome; }),
        datasets: [{
          data: criticos.map(function (p) { return p.coberturaDias; }),
          backgroundColor: criticos.map(function (p) { return alpha(statusEstoqueDe(p).cor, .78); }),
          hoverBackgroundColor: criticos.map(function (p) { return statusEstoqueDe(p).cor; }),
          borderRadius: 5, borderSkipped: false, maxBarThickness: 16
        }]
      },
      options: C.baseOptions(t, {
        indexAxis: 'y',
        scales: {
          x: C.escalaY(t, { beginAtZero: true, ticks: { color: t.mudo, font: { size: 10.5 }, callback: function (v) { return v + 'd'; } } }),
          y: C.escalaX(t, { grid: { display: false }, ticks: { color: t.texto2, font: { size: 10.5 } } })
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: { label: function (ctx) { return ctx.parsed.x + ' dias de cobertura'; } }
          }
        }
      })
    });

    var cats = D.CATEGORIAS.map(function (c) {
      var ps = m.produtos.filter(function (p) { return p.catId === c.id; });
      return {
        nome: c.nome, cor: c.cor,
        margem: ps.length ? soma(ps.map(function (p) { return p.margemPct; })) / ps.length * 100 : 0
      };
    });

    C.upsert('chMargem', {
      type: 'bar',
      data: {
        labels: cats.map(function (c) { return c.nome; }),
        datasets: [
          {
            label: 'Margem', data: cats.map(function (c) { return c.margem; }),
            backgroundColor: cats.map(function (c) { return alpha(c.cor, .8); }),
            hoverBackgroundColor: cats.map(function (c) { return c.cor; }),
            borderRadius: 5, borderSkipped: false, maxBarThickness: 34, order: 2
          },
          {
            type: 'line', label: 'Meta 30%', data: cats.map(function () { return 30; }),
            borderColor: alpha(t.texto2 === '#a7b4d0' ? '#a7b4d0' : '#64748b', .8), borderWidth: 1.5, borderDash: [5, 4],
            pointRadius: 0, fill: false, order: 1
          }
        ]
      },
      options: C.baseOptions(t, {
        scales: {
          x: C.escalaX(t, { grid: { display: false }, ticks: { color: t.texto2, font: { size: 10.5 }, maxRotation: 40, minRotation: 0 } }),
          y: C.escalaY(t, { ticks: { color: t.mudo, font: { size: 11 }, callback: function (v) { return v + '%'; } } })
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + F.decimal(ctx.parsed.y) + '%'; } }
          }
        }
      })
    });
  }

  /* ------------------------------------------------------------------ *
   * Ordens de Serviço                                                   *
   * ------------------------------------------------------------------ */
  function renderOrdens() {
    if (state.view !== 'ordens') return;

    var todas = osFiltradas({ status: 'todas' });
    var contagem = {};
    todas.forEach(function (o) { contagem[o.statusId] = (contagem[o.statusId] || 0) + 1; });

    var chips = [{ id: 'todas', nome: 'Todas', cor: '#94a3b8', total: todas.length }].concat(
      D.STATUS_OS.map(function (s) { return { id: s.id, nome: s.nome, cor: s.cor, total: contagem[s.id] || 0 }; })
    );

    $('#osChips').innerHTML = chips.map(function (c) {
      return '<button class="status-chip ' + (state.statusOS === c.id ? 'is-active' : '') + '" data-status="' + c.id + '" style="--chip-color:' + c.cor + '">' +
        '<div class="status-chip__top"><span class="status-chip__dot"></span><span class="status-chip__name">' + esc(c.nome) + '</span></div>' +
        '<div class="status-chip__val">' + c.total + '</div>' +
        '<div class="status-chip__pct">' + (todas.length ? Math.round((c.total / todas.length) * 100) : 0) + '% do período</div>' +
        '</button>';
    }).join('');

    var lista = osFiltradas();
    var resumo = D.resumoOS(todas);

    // ordenação
    var campo = sortState.os.campo, dir = sortState.os.dir;
    lista.sort(function (a, b) {
      var va, vb;
      switch (campo) {
        case 'id': va = a.id; vb = b.id; break;
        case 'titulo': va = a.titulo; vb = b.titulo; break;
        case 'tipo': va = D.tipoOS(a.tipoId).nome; vb = D.tipoOS(b.tipoId).nome; break;
        case 'prioridade': va = D.prioridade(a.prioridadeId).peso; vb = D.prioridade(b.prioridadeId).peso; break;
        case 'status': va = a.statusId; vb = b.statusId; break;
        case 'solicitante': va = a.solicitante; vb = b.solicitante; break;
        case 'responsavel': va = D.tecnico(a.responsavelId).nome; vb = D.tecnico(b.responsavelId).nome; break;
        case 'prazo': va = a.slaHoras; vb = b.slaHoras; break;
        case 'custo': va = a.custoPecas + a.custoMaoObra + a.custoDeslocamento; vb = b.custoPecas + b.custoMaoObra + b.custoDeslocamento; break;
        default: va = a.criadaEm.getTime(); vb = b.criadaEm.getTime();
      }
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });

    var totalPag = Math.max(1, Math.ceil(lista.length / state.pageSize));
    state.pageOS = Math.min(state.pageOS, totalPag);
    var ini = (state.pageOS - 1) * state.pageSize;
    var pagina = lista.slice(ini, ini + state.pageSize);

    $('#tabelaOS tbody').innerHTML = pagina.map(function (o) {
      var st = D.statusOS(o.statusId);
      var tp = D.tipoOS(o.tipoId);
      var pr = D.prioridade(o.prioridadeId);
      var horas = (D.HOJE.getTime() - o.criadaEm.getTime()) / 3600000;
      var dentroSla = o.statusId === 'concluida' ? (o.horasDuracao <= o.slaHoras) : horas <= o.slaHoras;
      var prazoTxt = o.statusId === 'concluida' ? F.horas(o.horasDuracao) : (dentroSla ? F.horas(o.slaHoras - horas) + ' restantes' : 'estourado');
      var custo = o.custoPecas + o.custoMaoObra + o.custoDeslocamento;
      return '<tr class="is-clickable" data-os="' + esc(o.id) + '">' +
        '<td class="mono">' + esc(o.id) + '</td>' +
        '<td><span class="table__primary">' + esc(o.titulo) + '</span><span class="table__sub">' + esc(o.setor) + '</span></td>' +
        '<td><span class="chip chip--muted">' + esc(tp.nome) + '</span></td>' +
        '<td><span class="chip" style="color:' + pr.cor + ';background:' + alpha(pr.cor, .13) + '">' + esc(pr.nome) + '</span></td>' +
        '<td><span class="chip" style="color:' + st.cor + ';background:' + alpha(st.cor, .13) + '"><i></i>' + esc(st.nome) + '</span></td>' +
        '<td class="muted">' + esc(o.solicitante.split(' ')[0] + ' ' + o.solicitante.split(' ')[1]) + '</td>' +
        '<td>' + esc(D.tecnico(o.responsavelId).nome) + '</td>' +
        '<td class="muted mono">' + F.data(o.criadaEm) + '</td>' +
        '<td><span class="chip ' + (o.statusId === 'concluida' ? (dentroSla ? 'chip--ok' : 'chip--crit') : (dentroSla ? 'chip--ok' : 'chip--crit')) + '">' + esc(prazoTxt) + '</span></td>' +
        '<td class="num mono">' + F.moeda(custo) + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:30px">Nenhuma OS com os filtros atuais.</td></tr>';

    $('#osCount').textContent = lista.length + ' chamados · ' + (state.statusOS === 'todas' ? 'todos os status' : D.statusOS(state.statusOS).nome);
    $('#osFoot').textContent = 'Mostrando ' + (lista.length ? ini + 1 : 0) + '–' + Math.min(ini + state.pageSize, lista.length) + ' de ' + lista.length;
    $('#osPage').textContent = state.pageOS + ' / ' + totalPag;
    $('#osPrev').disabled = state.pageOS <= 1;
    $('#osNext').disabled = state.pageOS >= totalPag;

    renderSLA(resumo);
    renderQuadro();
    renderGraficosOS(todas);
  }

  function renderSLA(r) {
    var abertas = r.total - r.concluida - r.cancelada;
    var dentro = Math.max(0, abertas - r.slaEstourado - r.slaEmRisco);
    var pct = abertas ? Math.round(((abertas - r.slaEstourado) / abertas) * 100) : 100;
    var cor = pct >= 85 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444';
    var circunferencia = 2 * Math.PI * 44;

    $('#slaPainel').innerHTML =
      '<div class="sla__main">' +
        '<div class="sla__ring">' +
          '<svg width="108" height="108" viewBox="0 0 108 108">' +
            '<circle cx="54" cy="54" r="44" fill="none" stroke="var(--surface-3)" stroke-width="9"/>' +
            '<circle cx="54" cy="54" r="44" fill="none" stroke="' + cor + '" stroke-width="9" stroke-linecap="round" ' +
              'stroke-dasharray="' + circunferencia + '" stroke-dashoffset="' + (circunferencia * (1 - pct / 100)) + '"/>' +
          '</svg>' +
          '<div class="sla__ring-value"><b>' + pct + '%</b><small>no prazo</small></div>' +
        '</div>' +
        '<div class="sla__rows">' +
          '<div class="sla__row"><i style="background:#10b981"></i>Dentro do SLA<b>' + dentro + '</b></div>' +
          '<div class="sla__row"><i style="background:#f59e0b"></i>Em risco<b>' + r.slaEmRisco + '</b></div>' +
          '<div class="sla__row"><i style="background:#ef4444"></i>Estourado<b>' + r.slaEstourado + '</b></div>' +
          '<div class="sla__row"><i style="background:#6b7280"></i>Sem prazo (concluídas)<b>' + r.concluida + '</b></div>' +
        '</div>' +
      '</div>' +
      '<div class="stat" style="margin:0">' +
        '<div class="stat__label">Tempo médio de resolução</div>' +
        '<div class="stat__value">' + F.horas(r.prazoMedio) + '</div>' +
        '<div class="stat__foot">' + r.concluidasCount + ' chamados concluídos · custo médio ' + F.moedaCurta(r.custoMedio) + '</div>' +
      '</div>';
  }

  function renderQuadro() {
    var lista = osFiltradas();
    $('#osQuadro').innerHTML = D.STATUS_OS.map(function (s) {
      var cards = lista.filter(function (o) { return o.statusId === s.id; }).slice(0, 8);
      return '<div class="board__col">' +
        '<div class="board__head"><i style="background:' + s.cor + '"></i>' + esc(s.nome) + '<span>' + lista.filter(function (o) { return o.statusId === s.id; }).length + '</span></div>' +
        '<div class="board__cards">' + cards.map(function (o) {
          var pr = D.prioridade(o.prioridadeId);
          return '<div class="board__card" data-os="' + esc(o.id) + '">' +
            '<h4>' + esc(o.titulo) + '</h4>' +
            '<p class="mono">' + esc(o.id) + '</p>' +
            '<div class="board__foot">' +
              '<span class="chip" style="color:' + pr.cor + ';background:' + alpha(pr.cor, .12) + '">' + esc(pr.nome) + '</span>' +
              '<span class="chip chip--muted">' + esc(D.tipoOS(o.tipoId).nome) + '</span>' +
            '</div></div>';
        }).join('') + '</div></div>';
    }).join('');
  }

  function renderGraficosOS(lista) {
    if (!C || !C.disponivel) return;
    var t = C.temaAtual();

    var statusIds = D.STATUS_OS.map(function (s) { return s.id; });
    var datasets = D.STATUS_OS.map(function (s, i) {
      return {
        label: s.nome,
        data: D.TIPOS_OS.map(function (tp) {
          return lista.filter(function (o) { return o.tipoId === tp.id && o.statusId === s.id; }).length;
        }),
        backgroundColor: alpha(s.cor, .78),
        hoverBackgroundColor: s.cor,
        borderRadius: 4, borderSkipped: false, maxBarThickness: 26
      };
    });

    C.upsert('chOSTipo', {
      type: 'bar',
      data: { labels: D.TIPOS_OS.map(function (tp) { return tp.nome; }), datasets: datasets },
      options: C.baseOptions(t, {
        indexAxis: 'y',
        scales: {
          x: C.escalaY(t, { stacked: true, ticks: { color: t.mudo, font: { size: 10.5 }, precision: 0 } }),
          y: C.escalaX(t, { stacked: true, grid: { display: false }, ticks: { color: t.texto2, font: { size: 10.5 } } })
        },
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: { color: t.texto2, boxWidth: 9, boxHeight: 9, usePointStyle: true, pointStyle: 'circle', padding: 14, font: { family: 'Inter', size: 11 } }
          },
          tooltip: { backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10 }
        }
      })
    });
  }

  /* ------------------------------------------------------------------ *
   * Analytics                                                           *
   * ------------------------------------------------------------------ */
  function renderAnalytics() {
    if (state.view !== 'analytics') return;
    var m = metricas();

    /* --- Insights --- */
    var cats = Object.keys(m.atual.porCat).map(function (id) { return { id: id, r: m.atual.porCat[id].receita }; }).sort(function (a, b) { return b.r - a.r; });
    var top = cats[0];
    var top10 = m.produtos.map(function (p) {
      var r = 0;
      for (var d = m.jan.ini; d <= m.jan.fim; d++) r += p.serieReceita[d];
      return { p: p, r: r };
    }).sort(function (a, b) { return b.r - a.r; }).slice(0, 10);
    var top10pct = m.atual.receita ? (soma(top10.map(function (x) { return x.r; })) / m.atual.receita) * 100 : 0;
    var projecao = (m.atual.receita / state.dias) * 30;

    var insights = [
      { cor: '#10b981', icone: 'i-trend-up', titulo: 'Categoria líder', metrica: top ? Math.round((top.r / m.atual.receita) * 100) + '%' : '—', texto: top ? D.categoria(top.id).nome + ' concentra ' + F.moedaCurta(top.r) + ' da receita no período.' : 'Sem dados.' },
      { cor: '#8b5cf6', icone: 'i-layers', titulo: 'Concentração ABC', metrica: F.decimal(top10pct) + '%', texto: 'Os 10 produtos mais vendidos respondem por ' + F.decimal(top10pct) + '% do faturamento — risco de dependência.' },
      { cor: '#ef4444', icone: 'i-alert', titulo: 'Risco de ruptura', metrica: m.criticos.length + ' SKUs', texto: 'Cobertura abaixo de 7 dias. Reposição estimada em ' + F.moedaCurta(soma(m.criticos.map(function (p) { return (p.estoqueMax - p.estoqueAtual) * p.custo; }))) + '.' },
      { cor: '#f59e0b', icone: 'i-target', titulo: 'Projeção 30 dias', metrica: F.moedaCurta(projecao), texto: 'Mantendo o ritmo atual, a receita do próximo mês deve ficar em ' + F.moedaCurta(projecao) + '.' }
    ];

    $('#insights').innerHTML = insights.map(function (x) {
      return '<article class="insight" style="--i-color:' + x.cor + '">' +
        '<div class="insight__icon"><svg class="ico"><use href="#' + x.icone + '"/></svg></div>' +
        '<div class="insight__title">' + esc(x.titulo) + '</div>' +
        '<div class="insight__metric">' + x.metrica + '</div>' +
        '<div class="insight__text">' + esc(x.texto) + '</div></article>';
    }).join('');

    renderGraficosAnalytics(m, top10);
  }

  function renderGraficosAnalytics(m, top10) {
    var t = C.temaAtual();

    /* --- Curva ABC --- */
    var ordenados = m.produtos.map(function (p) {
      var r = 0;
      for (var d = m.jan.ini; d <= m.jan.fim; d++) r += p.serieReceita[d];
      return { nome: p.nome, r: r };
    }).sort(function (a, b) { return b.r - a.r; }).slice(0, 24);

    var total = soma(ordenados.map(function (x) { return x.r; }));
    var acumulado = [], acc = 0;
    ordenados.forEach(function (x) { acc += x.r; acumulado.push(total ? (acc / total) * 100 : 0); });

    C.upsert('chABC', {
      type: 'bar',
      data: {
        labels: ordenados.map(function (x, i) { return '#' + (i + 1); }),
        datasets: [
          {
            label: 'Receita', data: ordenados.map(function (x) { return x.r; }),
            backgroundColor: ordenados.map(function (x, i) { return i < 8 ? alpha('#10b981', .85) : alpha('#10b981', .35); }),
            borderRadius: 4, borderSkipped: false, order: 2, maxBarThickness: 26
          },
          {
            type: 'line', label: 'Acumulado', data: acumulado, yAxisID: 'y1',
            borderColor: '#f59e0b', borderWidth: 2, tension: .35, pointRadius: 0, pointHoverRadius: 4, order: 1, fill: false
          }
        ]
      },
      options: C.baseOptions(t, {
        scales: {
          x: C.escalaX(t, { grid: { display: false }, ticks: { color: t.mudo, font: { size: 10 } } }),
          y: C.escalaY(t, { ticks: { color: t.mudo, font: { size: 10.5 }, callback: function (v) { return F.moedaCurta(v); } } }),
          y1: { position: 'right', min: 0, max: 100, grid: { display: false }, border: { display: false }, ticks: { color: t.mudo, font: { size: 10.5 }, callback: function (v) { return v + '%'; } } }
        },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10 } }
      })
    });

    /* --- Projeção --- */
    var nHist = Math.min(60, state.dias);
    var histLabels = [], histValores = [];
    for (var i = m.jan.fim - nHist + 1; i <= m.jan.fim; i++) {
      histLabels.push(F.data(D.DATAS[i]));
      histValores.push(m.serie.receita[i - m.jan.ini]);
    }

    // regressão linear simples sobre a série histórica
    var n = histValores.length;
    var somaX = 0, somaY = 0, somaXY = 0, somaX2 = 0;
    histValores.forEach(function (v, i) { somaX += i; somaY += v; somaXY += i * v; somaX2 += i * i; });
    var b = (n * somaXY - somaX * somaY) / Math.max(1, n * somaX2 - somaX * somaX);
    var a0 = (somaY - b * somaX) / Math.max(1, n);

    var futuros = [], labelsProj = [], superiores = [], inferiores = [];
    var histSerie = histValores.concat(new Array(30).fill(null));
    var projSerie = new Array(n - 1).fill(null).concat([histValores[n - 1]]);
    var supSerie = new Array(n - 1).fill(null).concat([histValores[n - 1]]);
    var infSerie = new Array(n - 1).fill(null).concat([histValores[n - 1]]);

    for (var k = 1; k <= 30; k++) {
      var v = Math.max(0, a0 + b * (n - 1 + k));
      var desvio = Math.abs(v) * 0.09 * Math.sqrt(k / 6);
      futuros.push(v);
      labelsProj.push(F.data(new Date(D.HOJE.getTime() + k * 86400000)));
      projSerie.push(v);
      supSerie.push(v + desvio);
      infSerie.push(Math.max(0, v - desvio));
    }

    C.upsert('chProjecao', {
      type: 'line',
      data: {
        labels: histLabels.concat(labelsProj),
        datasets: [
          { label: 'Realizado', data: histSerie, borderColor: '#10b981', borderWidth: 2.2, tension: .35, pointRadius: 0, fill: true, backgroundColor: alpha('#10b981', .1) },
          { label: 'Projeção', data: projSerie, borderColor: '#f59e0b', borderWidth: 2, borderDash: [6, 4], tension: .3, pointRadius: 0, fill: false },
          { label: 'Limite inferior', data: infSerie, borderColor: 'transparent', pointRadius: 0, fill: false },
          { label: 'Limite superior', data: supSerie, borderColor: 'transparent', pointRadius: 0, fill: '-1', backgroundColor: alpha('#f59e0b', .12) }
        ]
      },
      options: C.baseOptions(t, {
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: C.escalaX(t, { grid: { display: false }, ticks: { color: t.mudo, font: { size: 10 }, maxTicksLimit: 10 } }),
          y: C.escalaY(t, { ticks: { color: t.mudo, font: { size: 10.5 }, callback: function (v) { return F.moedaCurta(v); } } })
        },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: t.texto2, boxWidth: 9, boxHeight: 9, usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 } } },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            filter: function (item) { return item.dataset.label === 'Realizado' || item.dataset.label === 'Projeção'; },
            callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + F.moeda(ctx.parsed.y); } }
          }
        }
      })
    });

    /* --- Mensal por categoria --- */
    var mensal = D.serieMensal(D.PRODUTOS, state.categoria);
    var topCats = D.CATEGORIAS.map(function (c) {
      var totalCat = 0;
      D.PRODUTOS.forEach(function (p) {
        if (p.catId !== c.id) return;
        for (var d = 0; d < D.DIAS; d++) totalCat += p.serieReceita[d];
      });
      return { c: c, total: totalCat };
    }).sort(function (a, b) { return b.total - a.total; }).slice(0, 5);

    var dsCat = topCats.map(function (item) {
      return {
        label: item.c.nome,
        data: mensal.meses.map(function (mes) {
          var somaCat = 0;
          D.PRODUTOS.forEach(function (p) {
            if (p.catId !== item.c.id) return;
            for (var d = 0; d < D.DIAS; d++) {
              var dt = D.DATAS[d];
              if (dt.getFullYear() === mes.inicio.getFullYear() && dt.getMonth() === mes.inicio.getMonth()) somaCat += p.serieReceita[d];
            }
          });
          return somaCat;
        }),
        backgroundColor: alpha(item.c.cor, .8),
        hoverBackgroundColor: item.c.cor,
        borderRadius: 3, borderSkipped: false, maxBarThickness: 22
      };
    });

    C.upsert('chMensalCat', {
      type: 'bar',
      data: { labels: mensal.meses.map(function (x) { return x.rotulo; }), datasets: dsCat },
      options: C.baseOptions(t, {
        scales: {
          x: C.escalaX(t, { stacked: true, grid: { display: false }, ticks: { color: t.mudo, font: { size: 10 } } }),
          y: C.escalaY(t, { stacked: true, ticks: { color: t.mudo, font: { size: 10.5 }, callback: function (v) { return F.moedaCurta(v); } } })
        },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: t.texto2, boxWidth: 9, boxHeight: 9, usePointStyle: true, pointStyle: 'circle', padding: 11, font: { size: 10.5 } } },
          tooltip: { backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10 }
        }
      })
    });

    /* --- Fornecedores scatter --- */
    var custoMedio = soma(D.PRODUTOS.map(function (p) { return p.custo; })) / D.PRODUTOS.length;
    var pontos = D.FORNECEDORES.map(function (f) {
      var custoF = soma(D.PRODUTOS.filter(function (p) { return p.fornecedorId === f.id; }).map(function (p) { return p.custo; }));
      var qtd = D.PRODUTOS.filter(function (p) { return p.fornecedorId === f.id; }).length;
      return { x: f.prazoMedio, y: qtd ? custoF / qtd : 0, r: 5 + f.volume / 8, nome: f.nome, volume: f.volume };
    });

    C.upsert('chFornecedores', {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Fornecedores', data: pontos,
          backgroundColor: pontos.map(function (p) { return alpha('#8b5cf6', .45); }),
          borderColor: '#8b5cf6', borderWidth: 1.5, hoverBackgroundColor: alpha('#8b5cf6', .75)
        }]
      },
      options: C.baseOptions(t, {
        scales: {
          x: C.escalaX(t, { title: { display: true, text: 'Prazo médio (dias)', color: t.mudo, font: { size: 10.5 } }, ticks: { color: t.mudo, font: { size: 10.5 } } }),
          y: C.escalaY(t, { title: { display: true, text: 'Custo médio (R$)', color: t.mudo, font: { size: 10.5 } }, ticks: { color: t.mudo, font: { size: 10.5 }, callback: function (v) { return F.moedaCurta(v); } } })
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: {
              label: function (ctx) {
                var p = pontos[ctx.dataIndex];
                return [p.nome, 'Prazo: ' + p.x + 'd', 'Custo médio: ' + F.moeda(p.y), 'Volume: ' + p.volume + '%'];
              }
            }
          }
        }
      })
    });

    /* --- Heatmap --- */
    renderHeatmap();

    /* --- Donut OS por tipo --- */
    var os12 = D.OS.filter(function (o) { return o.criadaEm.getTime() > D.HOJE.getTime() - 365 * 86400000; });
    var porTipo = D.TIPOS_OS.map(function (tp) {
      return { nome: tp.nome, cor: tp.cor, total: os12.filter(function (o) { return o.tipoId === tp.id; }).length };
    }).filter(function (x) { return x.total > 0; }).sort(function (a, b) { return b.total - a.total; });

    C.upsert('chDonutOS', {
      type: 'doughnut',
      data: {
        labels: porTipo.map(function (x) { return x.nome; }),
        datasets: [{ data: porTipo.map(function (x) { return x.total; }), backgroundColor: porTipo.map(function (x) { return x.cor; }), borderColor: t.surface, borderWidth: 2.5, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        animation: C.animacoes ? { animateRotate: true, duration: 700 } : false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10, callbacks: { label: function (ctx) { return ' ' + ctx.parsed + ' chamados'; } } }
        }
      }
    });

    $('#donutLegenda').innerHTML = porTipo.slice(0, 6).map(function (x) {
      return '<li><i style="background:' + x.cor + '"></i>' + esc(x.nome) + '<span class="mini-list__val">' + x.total + '</span></li>';
    }).join('');
  }

  function renderHeatmap() {
    var semanas = 52;
    var diaMs = 86400000;

    function diaUTC(d) {
      return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / diaMs);
    }

    // 52 colunas fechadas de segunda a domingo, terminando na semana atual
    var diasDesdeSegunda = (D.HOJE.getDay() + 6) % 7;
    var inicio = new Date(D.HOJE.getTime());
    inicio.setDate(inicio.getDate() - diasDesdeSegunda - (semanas - 1) * 7);
    var inicioUTC = diaUTC(inicio);

    var primeiroIndice = 0;
    for (var d = 0; d < D.DIAS; d++) {
      if (diaUTC(D.DATAS[d]) >= inicioUTC) { primeiroIndice = d; break; }
    }

    // Usa o histórico completo (respeitando o filtro de categoria), não a
    // janela de 30/90 dias dos KPIs — senão só as primeiras semanas aparecem.
    var serie = D.serieDiaria(produtosFiltrados(), 'todas', primeiroIndice, D.DIAS - 1);

    var grade = [];
    for (var s = 0; s < semanas; s++) grade.push(new Array(7).fill(null));

    var min = Infinity, max = -Infinity;
    serie.receita.forEach(function (v, i) {
      var data = D.DATAS[primeiroIndice + i];
      var semana = Math.floor((diaUTC(data) - inicioUTC) / 7);
      var dia = (data.getDay() + 6) % 7;
      if (semana < 0 || semana >= semanas) return;
      grade[semana][dia] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    });

    if (!isFinite(min)) { min = 0; max = 0; }
    var escopo = max - min || 1;

    var dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    var corBase = '#10b981';
    var html = dias.map(function (nome, dia) {
      var cells = '';
      for (var s = 0; s < semanas; s++) {
        var data = new Date(inicio.getTime());
        data.setDate(data.getDate() + s * 7 + dia);
        var rotulo = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        var v = grade[s][dia];

        if (v === null) {
          cells += '<span class="heatmap__cell is-vazio" title="' + nome + ' · ' + rotulo + ' · sem dados"></span>';
          continue;
        }

        var intensidade = Math.max(0, Math.min(1, (v - min) / escopo));
        var cor = v === 0 ? 'var(--surface-3)' : alpha(corBase, 0.12 + intensidade * 0.88);
        cells += '<span class="heatmap__cell" style="background:' + cor + '" title="' + nome + ' · ' + rotulo + ' · ' + F.moeda(v) + '"></span>';
      }
      return '<div class="heatmap__row"><span class="heatmap__label">' + nome + '</span>' + cells + '</div>';
    }).join('');

    html += '<div class="heatmap__legend"><span>Menos</span><div class="heatmap__scale">' +
      [0.12, 0.32, 0.52, 0.72, 0.92].map(function (a) { return '<i style="background:' + alpha(corBase, a) + '"></i>'; }).join('') +
      '</div><span>Mais</span><span style="margin-left:auto">' + F.moedaCurta(min) + ' — ' + F.moedaCurta(max) + '</span></div>';

    $('#heatmap').innerHTML = html;
  }

  /* ------------------------------------------------------------------ *
   * Fornecedores                                                        *
   * ------------------------------------------------------------------ */
  function renderFornecedores() {
    if (state.view !== 'fornecedores') return;
    var jan = D.janela(state.dias);
    var linhas = D.FORNECEDORES.map(function (f) {
      var ps = D.PRODUTOS.filter(function (p) { return p.fornecedorId === f.id; });
      var receita = 0;
      ps.forEach(function (p) {
        for (var d = jan.ini; d <= jan.fim; d++) receita += p.serieReceita[d];
      });
      return { f: f, skus: ps.length, receita: receita };
    });
    var totalRec = soma(linhas.map(function (l) { return l.receita; }));

    $('#tabelaFornecedores tbody').innerHTML = linhas.sort(function (a, b) { return b.receita - a.receita; }).map(function (l) {
      var share = totalRec ? (l.receita / totalRec) * 100 : 0;
      var estrelas = '★★★★★'.slice(0, Math.round(l.f.rating)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(l.f.rating));
      return '<tr>' +
        '<td><span class="table__primary">' + esc(l.f.nome) + '</span><span class="table__sub">' + esc(l.f.id) + '</span></td>' +
        '<td class="muted">' + esc(l.f.contato) + '</td>' +
        '<td class="num mono">' + l.skus + '</td>' +
        '<td class="num mono">' + F.moedaCurta(l.receita) + '</td>' +
        '<td><div class="coverage"><div class="mini-bar"><i style="width:' + share + '%;background:var(--brand)"></i></div><b>' + Math.round(share) + '%</b></div></td>' +
        '<td class="num mono">' + l.f.prazoMedio + 'd</td>' +
        '<td class="num"><span class="chip ' + (l.f.taxaAtraso > 12 ? 'chip--crit' : l.f.taxaAtraso > 7 ? 'chip--low' : 'chip--ok') + '">' + l.f.taxaAtraso + '%</span></td>' +
        '<td class="num mono">' + l.f.qualidade + '</td>' +
        '<td><span style="color:#f59e0b;letter-spacing:1px">' + estrelas + '</span></td>' +
        '</tr>';
    }).join('');

    if (!C || !C.disponivel) return;
    var t = C.temaAtual();

    C.upsert('chFnQualidade', {
      type: 'bubble',
      data: {
        datasets: [{
          data: D.FORNECEDORES.map(function (f) { return { x: f.volume, y: f.qualidade, r: 6 + (5 - f.prazoMedio) * 2, nome: f.nome }; }),
          backgroundColor: alpha('#10b981', .42), borderColor: '#10b981', borderWidth: 1.5, hoverBackgroundColor: alpha('#10b981', .7)
        }]
      },
      options: C.baseOptions(t, {
        scales: {
          x: C.escalaX(t, { title: { display: true, text: 'Participação no portfólio (%)', color: t.mudo, font: { size: 10.5 } }, ticks: { color: t.mudo, font: { size: 10.5 } } }),
          y: C.escalaY(t, { min: 75, max: 100, title: { display: true, text: 'Qualidade', color: t.mudo, font: { size: 10.5 } }, ticks: { color: t.mudo, font: { size: 10.5 } } })
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10,
            callbacks: { label: function (ctx) { return [ctx.raw.nome, 'Volume: ' + ctx.raw.x + '%', 'Qualidade: ' + ctx.raw.y]; } }
          }
        }
      })
    });

    C.upsert('chFnPrazo', {
      type: 'bar',
      data: {
        labels: D.FORNECEDORES.map(function (f) { return f.nome; }),
        datasets: [{
          data: D.FORNECEDORES.map(function (f) { return f.prazoMedio; }),
          backgroundColor: D.FORNECEDORES.map(function (f) { return f.prazoMedio <= 2 ? alpha('#10b981', .8) : f.prazoMedio <= 5 ? alpha('#f59e0b', .8) : alpha('#ef4444', .8); }),
          borderRadius: 5, borderSkipped: false, maxBarThickness: 34
        }]
      },
      options: C.baseOptions(t, {
        indexAxis: 'y',
        scales: {
          x: C.escalaY(t, { ticks: { color: t.mudo, font: { size: 10.5 }, callback: function (v) { return v + 'd'; } } }),
          y: C.escalaX(t, { grid: { display: false }, ticks: { color: t.texto2, font: { size: 10.5 } } })
        },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: t.surface, borderColor: t.borda, borderWidth: 1, padding: 11, cornerRadius: 10, callbacks: { label: function (ctx) { return ctx.parsed.x + ' dias'; } } } }
      })
    });
  }

  /* ------------------------------------------------------------------ *
   * Configurações                                                       *
   * ------------------------------------------------------------------ */
  function renderConfig() {
    $('#cfgSeed').textContent = D.SEED;
    $('#cfgProdutos').textContent = D.PRODUTOS.length;
    $('#cfgOS').textContent = D.OS.length;
    $('#cfgJanela').textContent = D.DIAS + ' dias';
  }

  /* ------------------------------------------------------------------ *
   * Configurações: abas, perfil e painel administrativo                 *
   * ------------------------------------------------------------------ */
  function configTab(aba) {
    state.configTab = aba || 'aparencia';

    $$('#settingsTabs .tab').forEach(function (b) {
      var ativo = b.dataset.tab === state.configTab;
      b.classList.toggle('is-active', ativo);
      b.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    $$('.tab-panel', $('#view-config')).forEach(function (p) {
      p.classList.toggle('is-active', p.dataset.panel === state.configTab);
    });

    if (state.configTab === 'admin') montarAdmin(state.adminTab);
    else if (global.ADMIN && global.ADMIN.parar) global.ADMIN.parar();
  }

  function montarAdmin(aba) {
    if (!global.ADMIN) {
      var root = $('#adminRoot');
      if (root) root.innerHTML = '<div class="card" style="text-align:center;color:var(--muted);padding:32px">' +
        '<strong style="color:var(--text)">Módulo administrativo indisponível</strong>' +
        '<p style="margin-top:6px;font-size:12.5px">O arquivo <code>assets/js/admin.js</code> não foi carregado.</p></div>';
      return;
    }
    try {
      global.ADMIN.render('adminRoot');
      if (global.ADMIN.abrir) global.ADMIN.abrir(aba || state.adminTab || 'visao');
    } catch (e) {
      console.error('[admin] falha ao montar painel', e);
    }
  }

  function abrirConfig(aba) {
    if (aba) state.configTab = aba;
    navegar('config');
  }

  function abrirAdmin(aba) {
    if (aba) state.adminTab = aba;
    abrirConfig('admin');
  }

  /* --- Menu de perfil ------------------------------------------------- */
  function toggleProfile(forcar) {
    var menu = $('#profileMenu');
    if (!menu) return;
    var abrir = typeof forcar === 'boolean' ? forcar : menu.hidden;
    menu.hidden = !abrir;
    $('#profileWrap').classList.toggle('is-open', abrir);
    $('#btnProfile').setAttribute('aria-expanded', abrir ? 'true' : 'false');
  }

  function acaoPerfil(acao) {
    toggleProfile(false);
    switch (acao) {
      case 'perfil':
        toast('Meu perfil', 'Marina Alves · gerente da loja 0042 · MFA ativo desde 12/03.', 'info');
        break;
      case 'preferencias':
        abrirConfig('aparencia');
        break;
      case 'admin':
        abrirAdmin('visao');
        break;
      case 'auditoria':
        abrirAdmin('auditoria');
        break;
      case 'status':
        abrirAdmin('infra');
        break;
      case 'transmissao':
        abrirAdmin('transmissao');
        toast('Transmissão ao vivo', 'Conectado ao barramento de eventos simulado.', 'ok');
        break;
      case 'sair':
        toast('Sessão encerrada (simulação)', 'Em produção você seria redirecionado para o login.', 'warn');
        break;
    }
  }

  /* ------------------------------------------------------------------ *
   * Drawer de OS                                                       *
   * ------------------------------------------------------------------ */
  var osAberta = null;

  function abrirOS(id) {
    var o = D.OS.find(function (x) { return x.id === id; });
    if (!o) return;
    osAberta = o;
    var st = D.statusOS(o.statusId);
    var tp = D.tipoOS(o.tipoId);
    var pr = D.prioridade(o.prioridadeId);
    var tec = D.tecnico(o.responsavelId);
    var custo = o.custoPecas + o.custoMaoObra + o.custoDeslocamento;
    var horas = (D.HOJE.getTime() - o.criadaEm.getTime()) / 3600000;
    var slaPct = Math.min(100, (horas / o.slaHoras) * 100);
    var slaOk = o.statusId === 'concluida' ? (o.horasDuracao <= o.slaHoras) : horas <= o.slaHoras;

    $('#drawerBody').innerHTML =
      '<div class="drawer__head">' +
        '<div>' +
          '<div class="drawer__id">' + esc(o.id) + ' · ' + esc(tp.nome) + '</div>' +
          '<h2 class="drawer__title">' + esc(o.titulo) + '</h2>' +
        '</div>' +
        '<button class="icon-btn drawer__close" id="drawerClose"><svg class="ico"><use href="#i-x"/></svg></button>' +
      '</div>' +
      '<div class="drawer__body">' +
        '<div class="pill-list">' +
          '<span class="chip" style="color:' + st.cor + ';background:' + alpha(st.cor, .13) + '"><i></i>' + esc(st.nome) + '</span>' +
          '<span class="chip" style="color:' + pr.cor + ';background:' + alpha(pr.cor, .13) + '">Prioridade ' + esc(pr.nome) + '</span>' +
          '<span class="chip ' + (slaOk ? 'chip--ok' : 'chip--crit') + '">' + (slaOk ? 'Dentro do SLA' : 'SLA estourado') + '</span>' +
        '</div>' +

        '<div class="drawer__grid">' +
          '<div class="dfield"><div class="dfield__label">Solicitante</div><div class="dfield__value">' + esc(o.solicitante) + '<small>Setor: ' + esc(o.setor) + '</small></div></div>' +
          '<div class="dfield"><div class="dfield__label">Responsável</div><div class="dfield__value">' + esc(tec.nome) + '<small>★ ' + F.decimal(tec.avaliacao) + ' · ' + esc(D.tipoOS(tec.especialidade).nome) + '</small></div></div>' +
          '<div class="dfield"><div class="dfield__label">Abertura</div><div class="dfield__value">' + F.dataHora(o.criadaEm) + '<small>' + F.horas(horas) + ' em aberto</small></div></div>' +
          '<div class="dfield"><div class="dfield__label">SLA contratado</div><div class="dfield__value">' + o.slaHoras + 'h<small>' + Math.round(slaPct) + '% consumido</small></div></div>' +
        '</div>' +

        '<div class="drawer__section">' +
          '<h3>Consumo do SLA</h3>' +
          '<div class="kpi__bar" style="height:7px"><i style="width:' + slaPct + '%;background:' + (slaOk ? 'var(--brand)' : 'var(--red)') + '"></i></div>' +
        '</div>' +

        '<div class="drawer__section">' +
          '<h3>Custo do chamado · ' + F.moeda(custo) + '</h3>' +
          '<div class="drawer__grid">' +
            '<div class="dfield"><div class="dfield__label">Peças</div><div class="dfield__value">' + F.moeda(o.custoPecas) + '</div></div>' +
            '<div class="dfield"><div class="dfield__label">Mão de obra</div><div class="dfield__value">' + F.moeda(o.custoMaoObra) + '</div></div>' +
            '<div class="dfield"><div class="dfield__label">Deslocamento</div><div class="dfield__value">' + F.moeda(o.custoDeslocamento) + '</div></div>' +
            '<div class="dfield"><div class="dfield__label">Peças aplicadas</div><div class="dfield__value">' + o.pecas.length + '<small>' + esc(o.pecas.map(function (p) { return p.nome; }).join(', ')) + '</small></div></div>' +
          '</div>' +
        '</div>' +

        '<div class="drawer__section">' +
          '<h3>Histórico</h3>' +
          '<div class="timeline">' + o.historico.map(function (h) {
            return '<div class="tl"><div class="tl__rail"><span class="tl__dot"></span><span class="tl__line"></span></div>' +
              '<div class="tl__body"><div class="tl__meta">' + F.dataHora(h.em) + ' · ' + esc(h.autor) + '</div><div class="tl__text">' + esc(h.texto) + '</div></div></div>';
          }).join('') + '</div>' +
        '</div>' +

        '<div class="drawer__actions">' +
          (o.statusId !== 'concluida' && o.statusId !== 'cancelada' ? '<button class="btn btn--soft" data-acao="concluir"><svg class="ico ico--sm"><use href="#i-check"/></svg> Concluir chamado</button>' : '') +
          (o.statusId !== 'concluida' && o.statusId !== 'cancelada' ? '<button class="btn" data-acao="reatribuir"><svg class="ico ico--sm"><use href="#i-user"/></svg> Reatribuir</button>' : '') +
          (o.statusId !== 'concluida' && o.statusId !== 'cancelada' ? '<button class="btn btn--danger" data-acao="cancelar"><svg class="ico ico--sm"><use href="#i-x"/></svg> Cancelar</button>' : '') +
          '<button class="btn btn--ghost" data-acao="csv"><svg class="ico ico--sm"><use href="#i-download"/></svg> Exportar</button>' +
        '</div>' +
      '</div>';

    $('#drawer').hidden = false;
    $('#drawerScrim').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function fecharDrawer() {
    $('#drawer').hidden = true;
    $('#drawerScrim').hidden = true;
    document.body.style.overflow = '';
    osAberta = null;
  }

  function acaoOS(acao) {
    if (!osAberta) return;
    if (acao === 'concluir') {
      osAberta.statusId = 'concluida';
      osAberta.resolvidaEm = new Date();
      osAberta.horasDuracao = Math.round((osAberta.resolvidaEm - osAberta.criadaEm) / 3600000);
      osAberta.historico.push({ em: new Date(), autor: 'Marina Alves', texto: 'Chamado concluído manualmente pelo painel.' });
      toast('Chamado concluído', osAberta.id + ' marcado como concluído.', 'ok');
      fecharDrawer();
      renderOrdens(); renderDashboard();
    } else if (acao === 'reatribuir') {
      var idx = D.TECNICOS.findIndex(function (t) { return t.id === osAberta.responsavelId; });
      var novo = D.TECNICOS[(idx + 1) % D.TECNICOS.length];
      osAberta.responsavelId = novo.id;
      osAberta.historico.push({ em: new Date(), autor: 'Marina Alves', texto: 'Chamado reatribuído para ' + novo.nome + '.' });
      toast('Reatribuído', osAberta.id + ' agora é de ' + novo.nome + '.', 'info');
      abrirOS(osAberta.id);
      renderOrdens();
    } else if (acao === 'cancelar') {
      osAberta.statusId = 'cancelada';
      osAberta.historico.push({ em: new Date(), autor: 'Marina Alves', texto: 'Chamado cancelado pelo painel.' });
      toast('Chamado cancelado', osAberta.id + ' foi cancelado.', 'warn');
      fecharDrawer();
      renderOrdens(); renderDashboard();
    } else if (acao === 'csv') {
      exportarCSV([{
        id: osAberta.id, titulo: osAberta.titulo, tipo: D.tipoOS(osAberta.tipoId).nome,
        status: D.statusOS(osAberta.statusId).nome, prioridade: D.prioridade(osAberta.prioridadeId).nome,
        responsavel: D.tecnico(osAberta.responsavelId).nome,
        aberta: osAberta.criadaEm.toISOString(), custo: osAberta.custoPecas + osAberta.custoMaoObra + osAberta.custoDeslocamento
      }], 'os-' + osAberta.id);
    }
  }

  /* ------------------------------------------------------------------ *
   * Exportação CSV                                                      *
   * ------------------------------------------------------------------ */
  function exportarCSV(linhas, nome) {
    if (!linhas.length) { toast('Nada para exportar', 'Ajuste os filtros e tente novamente.', 'warn'); return; }
    var cab = Object.keys(linhas[0]);
    var csv = cab.join(';') + '\r\n' + linhas.map(function (l) {
      return cab.map(function (c) {
        var v = l[c] == null ? '' : String(l[c]);
        return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(';');
    }).join('\r\n');

    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (nome || 'export') + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    toast('Exportação concluída', linhas.length + ' linhas exportadas em CSV.', 'ok');
  }

  /* ------------------------------------------------------------------ *
   * Toasts                                                              *
   * ------------------------------------------------------------------ */
  var ICONE_TOAST = { ok: 'i-check', info: 'i-bell', warn: 'i-alert', error: 'i-x' };
  var COR_TOAST = { ok: '#10b981', info: '#3b82f6', warn: '#f59e0b', error: '#ef4444' };

  function toast(titulo, texto, tipo) {
    tipo = tipo || 'ok';
    var el = document.createElement('div');
    el.className = 'toast';
    el.style.setProperty('--t-color', COR_TOAST[tipo] || COR_TOAST.ok);
    el.innerHTML = '<span class="toast__icon"><svg class="ico"><use href="#' + (ICONE_TOAST[tipo] || ICONE_TOAST.ok) + '"/></svg></span>' +
      '<div><strong>' + esc(titulo) + '</strong><p>' + esc(texto || '') + '</p></div>';
    $('#toasts').appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 260);
    }, 3800);
  }

  /* ------------------------------------------------------------------ *
   * Paleta de comandos                                                  *
   * ------------------------------------------------------------------ */
  var paletteItens = [];
  var paletteSel = 0;

  function montarPalette() {
    paletteItens = [
      { grupo: 'Navegação', icone: 'i-grid', texto: 'Ir para Dashboard', acao: function () { navegar('dashboard'); } },
      { grupo: 'Navegação', icone: 'i-box', texto: 'Ir para Estoque', acao: function () { navegar('estoque'); } },
      { grupo: 'Navegação', icone: 'i-tool', texto: 'Ir para Ordens de Serviço', acao: function () { navegar('ordens'); } },
      { grupo: 'Navegação', icone: 'i-chart', texto: 'Ir para Analytics', acao: function () { navegar('analytics'); } },
      { grupo: 'Navegação', icone: 'i-truck', texto: 'Ir para Fornecedores', acao: function () { navegar('fornecedores'); } },
      { grupo: 'Navegação', icone: 'i-gear', texto: 'Ir para Configurações', acao: function () { navegar('config'); } },
      { grupo: 'Ações', icone: 'i-sun', texto: 'Alternar tema claro/escuro', acao: alternarTema },
      { grupo: 'Ações', icone: 'i-refresh', texto: 'Limpar todos os filtros', acao: limparFiltros },
      { grupo: 'Ações', icone: 'i-download', texto: 'Exportar estoque em CSV', acao: function () { exportarEstoque(); } },
      { grupo: 'Ações', icone: 'i-tool', texto: 'Filtrar OS com SLA estourado', acao: function () { state.statusOS = 'todas'; navegar('ordens'); toast('Filtro', 'Use os chips de status para refinar a fila.', 'info'); } }
    ];

    var vistos = {};
    D.PRODUTOS.forEach(function (p) {
      if (vistos[p.catId] || paletteItens.length > 90) return;
      vistos[p.catId] = true;
      paletteItens.push({
        grupo: 'Categorias', icone: 'i-box', texto: 'Filtrar categoria: ' + D.categoria(p.catId).nome,
        acao: function () {
          state.categoria = p.catId;
          $('#fCategoria').value = p.catId;
          navegar('estoque');
          toast('Filtro aplicado', D.categoria(p.catId).nome, 'ok');
        }
      });
    });

    D.TECNICOS.forEach(function (t) {
      paletteItens.push({
        grupo: 'Técnicos', icone: 'i-user', texto: 'OS de ' + t.nome,
        acao: function () { state.responsavelOS = t.id; $('#osResponsavel').value = t.id; navegar('ordens'); }
      });
    });
  }

  function abrirPalette() {
    $('#paletteScrim').hidden = false;
    $('#paletteInput').value = '';
    paletteSel = 0;
    renderPalette('');
    setTimeout(function () { $('#paletteInput').focus(); }, 30);
  }

  function fecharPalette() { $('#paletteScrim').hidden = true; }

  function renderPalette(termo) {
    var t = termo.toLowerCase();
    var filtrados = paletteItens.filter(function (i) { return i.texto.toLowerCase().indexOf(t) > -1; }).slice(0, 14);
    var html = '', grupoAtual = null;
    filtrados.forEach(function (item, idx) {
      if (item.grupo !== grupoAtual) { html += '<li class="pal-group">' + esc(item.grupo) + '</li>'; grupoAtual = item.grupo; }
      html += '<li data-idx="' + idx + '" class="' + (idx === paletteSel ? 'is-sel' : '') + '"><svg class="ico"><use href="#' + item.icone + '"/></svg><span>' + esc(item.texto) + '</span></li>';
    });
    if (!filtrados.length) html = '<li class="pal-group">Nenhum resultado</li>';
    $('#paletteList').innerHTML = html;
    paletteItens._filtrados = filtrados;
  }

  function executarPalette(idx) {
    var lista = paletteItens._filtrados || [];
    var item = lista[idx];
    if (!item) return;
    fecharPalette();
    item.acao();
  }

  /* ------------------------------------------------------------------ *
   * Tema / densidade                                                    *
   * ------------------------------------------------------------------ */
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    try { localStorage.setItem('lb-tema', tema); } catch (e) {}
    $$('#cfgTema .seg__btn').forEach(function (b) { b.classList.toggle('is-active', b.dataset.tema === tema); });
    if (C) C.aplicarTema();
    if (state.view === 'dashboard') renderDashboard();
    else if (state.view === 'estoque') renderEstoque();
    else if (state.view === 'ordens') renderOrdens();
    else if (state.view === 'analytics') renderAnalytics();
    else if (state.view === 'fornecedores') renderFornecedores();
  }

  function alternarTema() {
    var atual = document.documentElement.getAttribute('data-theme');
    aplicarTema(atual === 'dark' ? 'light' : 'dark');
    toast('Tema alterado', 'Agora em modo ' + (atual === 'dark' ? 'claro' : 'escuro') + '.', 'info');
  }

  function aplicarDensidade(d) {
    document.documentElement.setAttribute('data-density', d);
    try { localStorage.setItem('lb-densidade', d); } catch (e) {}
    $$('#cfgDensidade .seg__btn').forEach(function (b) { b.classList.toggle('is-active', b.dataset.dens === d); });
  }

  /* ------------------------------------------------------------------ *
   * Filtros                                                            *
   * ------------------------------------------------------------------ */
  function limparFiltros() {
    state.categoria = 'todas';
    state.prioridade = 'todas';
    state.statusOS = 'todas';
    state.tipoOS = 'todas';
    state.responsavelOS = 'todas';
    state.buscaOS = '';
    state.buscaEstoque = '';
    state.statusEstoque = 'todas';
    state.ordemEstoque = 'receita';
    state.pageEstoque = 1;
    state.pageOS = 1;
    $('#fCategoria').value = 'todas';
    $('#fPrioridade').value = 'todas';
    $('#osTipo').value = 'todas';
    $('#osPrioridade').value = 'todas';
    $('#osResponsavel').value = 'todas';
    $('#osBusca').value = '';
    $('#estoqueBusca').value = '';
    $('#estoqueStatus').value = 'todas';
    $('#estoqueOrdem').value = 'receita';
    renderDashboard();
    if (state.view === 'estoque') renderEstoque();
    if (state.view === 'ordens') renderOrdens();
    toast('Filtros limpos', 'Voltamos à visão completa da loja.', 'ok');
  }

  function exportarEstoque() {
    var lista = estoqueLista();
    exportarCSV(lista.map(function (x) {
      return {
        sku: x.sku, produto: x.nome, categoria: x.categoria,
        preco: x.preco.toFixed(2), margem_pct: x.margem.toFixed(1),
        estoque: x.estoque, cobertura_dias: x.cobertura,
        receita_periodo: x.receita.toFixed(2), valor_estoque: x.valor.toFixed(2), status: x.status.nome
      };
    }), 'estoque-loja-do-bairro');
  }

  /* ------------------------------------------------------------------ *
   * Bootstrap                                                          *
   * ------------------------------------------------------------------ */
  function popularSelects() {
    $('#fCategoria').innerHTML = '<option value="todas">Todas as categorias</option>' +
      D.CATEGORIAS.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + '</option>'; }).join('');

    $('#fPrioridade').innerHTML = '<option value="todas">Todas as prioridades</option>' +
      D.PRIORIDADES.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nome) + '</option>'; }).join('');

    $('#osTipo').innerHTML = '<option value="todas">Todos os tipos</option>' +
      D.TIPOS_OS.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nome) + '</option>'; }).join('');

    $('#osPrioridade').innerHTML = '<option value="todas">Todas as prioridades</option>' +
      D.PRIORIDADES.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nome) + '</option>'; }).join('');

    $('#osResponsavel').innerHTML = '<option value="todas">Todos os responsáveis</option>' +
      D.TECNICOS.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nome) + '</option>'; }).join('');
  }

  function ligarEventos() {
    $$('.nav__item').forEach(function (b) {
      b.addEventListener('click', function () { navegar(b.dataset.view); });
    });
    $$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { navegar(b.dataset.goto); });
    });

    $('#burger').addEventListener('click', abrirSidebar);
    $('#scrim').addEventListener('click', fecharSidebar);

    $$('#periodSeg .seg__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#periodSeg .seg__btn').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        state.dias = parseInt(b.dataset.period, 10);
        state.pageEstoque = 1;
        state.pageOS = 1;
        renderViewAtual();
        toast('Período atualizado', 'Exibindo os últimos ' + state.dias + ' dias.', 'info');
      });
    });

    $('#fCategoria').addEventListener('change', function (e) { state.categoria = e.target.value; state.pageEstoque = 1; renderViewAtual(); });
    $('#fPrioridade').addEventListener('change', function (e) { state.prioridade = e.target.value; state.pageOS = 1; renderViewAtual(); });

    $('#btnRefresh').addEventListener('click', atualizarDados);
    $('#btnTheme').addEventListener('click', alternarTema);
    $('#btnPalette').addEventListener('click', abrirPalette);
    $('#btnReset').addEventListener('click', limparFiltros);
    $('#btnExport').addEventListener('click', exportarEstoque);

    $('#btnBell').addEventListener('click', function () {
      var m = metricas();
      toast('Central de alertas', m.criticos.length + ' produtos críticos, ' + m.resumo.slaEstourado + ' SLA estourado(s) e ' + m.parados.length + ' SKUs parados.', 'warn');
    });

    /* Configurações, perfil e admin */
    $('#btnProfile').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleProfile();
    });
    $$('[data-profile]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        acaoPerfil(b.dataset.profile);
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#profileWrap')) toggleProfile(false);
    });

    $$('#settingsTabs .tab').forEach(function (b) {
      b.addEventListener('click', function () { configTab(b.dataset.tab); });
    });

    document.addEventListener('click', function (e) {
      var sub = e.target.closest('.admin__tab');
      if (sub && sub.dataset.admin) state.adminTab = sub.dataset.admin;
    });

    $$('#view-config .switch input').forEach(function (inp) {
      if (inp.id === 'cfgAnim') return;
      inp.addEventListener('change', function () {
        var setting = inp.closest('.setting');
        var nome = setting ? setting.querySelector('strong').textContent : 'Preferência';
        toast('Preferência salva', nome + (inp.checked ? ' ativada.' : ' desativada.'), 'ok');
      });
    });

    var btnRevogar = $('#btnRevogar');
    if (btnRevogar) btnRevogar.addEventListener('click', function () {
      toast('Sessões revogadas', 'Os 3 dispositivos seriam desconectados (simulação).', 'warn');
    });

    /* Estoque */
    $('#estoqueBusca').addEventListener('input', debounce(function (e) { state.buscaEstoque = e.target.value; state.pageEstoque = 1; renderEstoque(); }, 220));
    $('#estoqueStatus').addEventListener('change', function (e) { state.statusEstoque = e.target.value; state.pageEstoque = 1; renderEstoque(); });
    $('#estoqueOrdem').addEventListener('change', function (e) {
      state.ordemEstoque = e.target.value;
      var mapa = { receita: 'receita', cobertura: 'cobertura', valor: 'valor', margem: 'margem', nome: 'nome' };
      sortState.estoque.campo = mapa[e.target.value] || 'receita';
      sortState.estoque.dir = e.target.value === 'nome' || e.target.value === 'cobertura' || e.target.value === 'margem' ? 1 : -1;
      renderEstoque();
    });
    $('#estoquePrev').addEventListener('click', function () { if (state.pageEstoque > 1) { state.pageEstoque--; renderEstoque(); } });
    $('#estoqueNext').addEventListener('click', function () { state.pageEstoque++; renderEstoque(); });

    /* OS */
    $('#osBusca').addEventListener('input', debounce(function (e) { state.buscaOS = e.target.value; state.pageOS = 1; renderOrdens(); }, 220));
    $('#osTipo').addEventListener('change', function (e) { state.tipoOS = e.target.value; state.pageOS = 1; renderOrdens(); });
    $('#osPrioridade').addEventListener('change', function (e) { state.prioridade = e.target.value; $('#fPrioridade').value = e.target.value; state.pageOS = 1; renderOrdens(); });
    $('#osResponsavel').addEventListener('change', function (e) { state.responsavelOS = e.target.value; state.pageOS = 1; renderOrdens(); });
    $('#osPrev').addEventListener('click', function () { if (state.pageOS > 1) { state.pageOS--; renderOrdens(); } });
    $('#osNext').addEventListener('click', function () { state.pageOS++; renderOrdens(); });

    $$('#osViewSeg .seg__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#osViewSeg .seg__btn').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        state.osMode = b.dataset.mode;
        $('#osTabelaWrap').hidden = state.osMode !== 'tabela';
        $('#osQuadro').hidden = state.osMode !== 'quadro';
        $('.card__foot', $('#view-ordens')).style.display = state.osMode === 'quadro' ? 'none' : '';
      });
    });

    /* Tabelas: ordenação */
    $$('#tabelaEstoque thead th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var campo = th.dataset.sort;
        if (sortState.estoque.campo === campo) sortState.estoque.dir *= -1;
        else { sortState.estoque.campo = campo; sortState.estoque.dir = campo === 'nome' ? 1 : -1; }
        atualizarCabecalhos('tabelaEstoque', sortState.estoque);
        renderEstoque();
      });
    });
    $$('#tabelaOS thead th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var campo = th.dataset.sort;
        if (sortState.os.campo === campo) sortState.os.dir *= -1;
        else { sortState.os.campo = campo; sortState.os.dir = campo === 'id' || campo === 'titulo' ? 1 : -1; }
        atualizarCabecalhos('tabelaOS', sortState.os);
        renderOrdens();
      });
    });

    /* Delegação global: abrir OS */
    document.addEventListener('click', function (e) {
      var alvo = e.target.closest('[data-os]');
      if (alvo) { abrirOS(alvo.dataset.os); return; }
      var chip = e.target.closest('.status-chip');
      if (chip) {
        state.statusOS = chip.dataset.status;
        state.pageOS = 1;
        renderOrdens();
        return;
      }
      var acao = e.target.closest('[data-acao]');
      if (acao) { acaoOS(acao.dataset.acao); return; }
      if (e.target.closest('#drawerClose')) fecharDrawer();
    });

    $('#drawerScrim').addEventListener('click', fecharDrawer);

    /* Config */
    $$('#cfgTema .seg__btn').forEach(function (b) { b.addEventListener('click', function () { aplicarTema(b.dataset.tema); }); });
    $$('#cfgDensidade .seg__btn').forEach(function (b) { b.addEventListener('click', function () { aplicarDensidade(b.dataset.dens); }); });
    $('#cfgAnim').addEventListener('change', function (e) {
      C.setAnimacoes(e.target.checked);
      renderViewAtual();
      toast('Animações', e.target.checked ? 'Transições ativadas.' : 'Transições desativadas.', 'info');
    });

    /* Paleta */
    $('#paletteScrim').addEventListener('click', function (e) { if (e.target === $('#paletteScrim')) fecharPalette(); });
    $('#paletteInput').addEventListener('input', function (e) { paletteSel = 0; renderPalette(e.target.value); });
    $('#paletteInput').addEventListener('keydown', function (e) {
      var lista = paletteItens._filtrados || [];
      if (e.key === 'ArrowDown') { e.preventDefault(); paletteSel = Math.min(lista.length - 1, paletteSel + 1); renderPalette($('#paletteInput').value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); paletteSel = Math.max(0, paletteSel - 1); renderPalette($('#paletteInput').value); }
      else if (e.key === 'Enter') { e.preventDefault(); executarPalette(paletteSel); }
      else if (e.key === 'Escape') { fecharPalette(); }
    });
    $('#paletteList').addEventListener('click', function (e) {
      var li = e.target.closest('li[data-idx]');
      if (li) executarPalette(parseInt(li.dataset.idx, 10));
    });

    /* Atalhos */
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirPalette(); return; }
      if (e.key === 'Escape') { fecharPalette(); fecharDrawer(); fecharSidebar(); toggleProfile(false); }
      if (e.target.matches('input, select, textarea')) return;
      if (e.key >= '1' && e.key <= '4') {
        var alvo = ['dashboard', 'estoque', 'ordens', 'analytics'][parseInt(e.key, 10) - 1];
        if (alvo) navegar(alvo);
      }
    });
  }

  function atualizarCabecalhos(tabela, sort) {
    $$('#' + tabela + ' thead th[data-sort]').forEach(function (th) {
      th.classList.remove('is-sorted', 'is-sorted-asc', 'is-sorted-desc');
      if (th.dataset.sort === sort.campo) th.classList.add('is-sorted', sort.dir > 0 ? 'is-sorted-asc' : 'is-sorted-desc');
    });
  }

  function renderViewAtual() {
    if (state.view === 'dashboard') renderDashboard();
    else if (state.view === 'estoque') renderEstoque();
    else if (state.view === 'ordens') renderOrdens();
    else if (state.view === 'analytics') renderAnalytics();
    else if (state.view === 'fornecedores') renderFornecedores();
  }

  function atualizarDados() {
    var btn = $('#btnRefresh');
    btn.style.transform = 'rotate(360deg)';
    btn.style.transition = 'transform .7s cubic-bezier(.22,.61,.36,1)';
    setTimeout(function () { btn.style.transform = ''; }, 720);

    $('#syncInfo').textContent = 'Sincronizando…';
    setTimeout(function () {
      $('#syncInfo').textContent = 'Sincronizado agora';
      renderViewAtual();
      toast('Dados atualizados', 'Indicadores recalculados para os últimos ' + state.dias + ' dias.', 'ok');
    }, 650);
  }

  function atualizarBadge() {
    var m = metricas();
    var total = m.criticos.length + m.resumo.slaEstourado;
    var b = $('#bellCount');
    b.textContent = total > 99 ? '99+' : total;
    b.dataset.zero = total === 0 ? '1' : '0';
  }

  function registrarTabelasIniciais() {
    atualizarCabecalhos('tabelaEstoque', sortState.estoque);
    atualizarCabecalhos('tabelaOS', sortState.os);
  }

  function iniciar() {
    popularSelects();
    ligarEventos();
    registrarTabelasIniciais();
    montarPalette();

    $$('[data-app-version]').forEach(function (el) {
      el.textContent = (document.querySelector('meta[name="app-version"]') || {}).content || 'v1.0.0-poc';
    });
    $$('[data-app-commit]').forEach(function (el) {
      el.textContent = (document.querySelector('meta[name="app-commit"]') || {}).content || 'demo';
    });
    $$('[data-app-channel]').forEach(function (el) {
      el.textContent = (document.querySelector('meta[name="app-channel"]') || {}).content || 'github-pages';
    });

    // preferências salvas
    var tema = 'dark', dens = 'normal';
    try { tema = localStorage.getItem('lb-tema') || 'dark'; dens = localStorage.getItem('lb-densidade') || 'normal'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', tema);
    document.documentElement.setAttribute('data-density', dens);
    $$('#cfgTema .seg__btn').forEach(function (b) { b.classList.toggle('is-active', b.dataset.tema === tema); });
    $$('#cfgDensidade .seg__btn').forEach(function (b) { b.classList.toggle('is-active', b.dataset.dens === dens); });

    renderDashboard();
    atualizarBadge();

    C.ready.then(function () {
      renderDashboard();
      if (state.view === 'estoque') renderEstoque();
      if (state.view === 'ordens') renderOrdens();
      if (state.view === 'analytics') renderAnalytics();
      if (state.view === 'fornecedores') renderFornecedores();
      $$('.chart-wrap').forEach(function (w) { w.classList.remove('is-loading'); });
    }).catch(function () {
      $$('.chart-wrap').forEach(function (w) {
        w.innerHTML = '<div style="height:100%;display:grid;place-content:center;text-align:center;gap:6px;color:var(--muted);font-size:12.5px">' +
          '<strong style="color:var(--text)">Gráficos indisponíveis</strong>' +
          '<span>Não foi possível carregar o Chart.js (CDN bloqueado).<br>Os KPIs e tabelas continuam funcionando.</span></div>';
      });
    });

    setTimeout(function () {
      $('#app').hidden = false;
      $('#boot').classList.add('is-done');
      document.body.classList.add('is-ready');
    }, 420);

    // relógio de sincronização
    setInterval(function () {
      var agora = new Date();
      $('#syncInfo').textContent = 'Sincronizado ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }, 60000);

    // links externos com hash (ex.: ./#config) abrem a view correspondente
    global.addEventListener('hashchange', rotaHash);
    rotaHash();

    // status vivo das camadas de backend (simulação)
    var camadas = ['api', 'db', 'queue', 'cdn'];
    setInterval(function () {
      $$('#layerStatus .layer').forEach(function (el) { el.classList.remove('is-warn', 'is-down'); });
      if (Math.random() < 0.28) {
        var alvo = camadas[Math.floor(Math.random() * camadas.length)];
        var node = $('#layerStatus .layer[data-layer="' + alvo + '"]');
        if (node) node.classList.add(Math.random() < 0.18 ? 'is-down' : 'is-warn');
      }
    }, 5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  // expõe para depuração no console
  global.LB = { state: state, render: renderViewAtual, navegar: navegar, abrirAdmin: abrirAdmin, toast: toast, DADOS: D, Charts: C };
})(window);
