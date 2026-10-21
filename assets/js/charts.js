/* =========================================================================
   Loja do Bairro — Painel de Operações
   Camada de gráficos (Chart.js 4 via CDN, com fallback multi-CDN)
   ========================================================================= */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Formatadores compartilhados                                         *
   * ------------------------------------------------------------------ */
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
  var num = new Intl.NumberFormat('pt-BR');
  var num1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  var FMT = {
    moeda: function (v) { return brl.format(v || 0); },
    moedaCurta: function (v) { return brlCompact.format(v || 0); },
    numero: function (v) { return num.format(Math.round(v || 0)); },
    decimal: function (v) { return num1.format(v || 0); },
    pct: function (v, casas) { return (casas === 1 ? num1 : num).format(v || 0) + '%'; },
    data: function (d) { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); },
    dataHora: function (d) { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); },
    horas: function (h) {
      if (h == null) return '—';
      if (h < 24) return Math.round(h) + 'h';
      return Math.floor(h / 24) + 'd ' + Math.round(h % 24) + 'h';
    }
  };
  global.FMT = FMT;

  /* ------------------------------------------------------------------ *
   * Carregamento resiliente do Chart.js                                 *
   * ------------------------------------------------------------------ */
  var CDNS = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
    'https://unpkg.com/chart.js@4.4.7/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.7/chart.umd.min.js'
  ];

  function carregarScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  var readyPromise = (function () {
    if (global.Chart) return Promise.resolve(global.Chart);
    var i = 0;
    function tentar() {
      if (i >= CDNS.length) return Promise.reject(new Error('Chart.js indisponível'));
      return carregarScript(CDNS[i++]).then(function () {
        if (!global.Chart) return tentar();
        return global.Chart;
      }).catch(tentar);
    }
    return tentar();
  })();

  /* ------------------------------------------------------------------ *
   * Registro de instâncias                                              *
   * ------------------------------------------------------------------ */
  var registry = {};
  var animacoesAtivas = true;

  function cssVar(nome, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return v || fallback;
  }

  function tema() {
    return {
      texto: cssVar('--text', '#e8eefc'),
      texto2: cssVar('--text-2', '#a7b4d0'),
      mudo: cssVar('--muted', '#7c8bab'),
      grade: cssVar('--grid-line', 'rgba(255,255,255,.05)'),
      borda: cssVar('--border', 'rgba(255,255,255,.08)'),
      surface: cssVar('--surface-2', '#16203a'),
      textoForte: cssVar('--text', '#e8eefc')
    };
  }

  function baseOptions(t, extras) {
    var o = {
      responsive: true,
      maintainAspectRatio: false,
      animation: animacoesAtivas ? { duration: 650, easing: 'easeOutQuart' } : false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.surface,
          titleColor: t.texto,
          bodyColor: t.texto2,
          borderColor: t.borda,
          borderWidth: 1,
          padding: 11,
          cornerRadius: 10,
          titleFont: { family: 'Inter', size: 12, weight: '700' },
          bodyFont: { family: 'Inter', size: 12 },
          boxPadding: 5,
          usePointStyle: true
        }
      }
    };
    if (extras) Object.keys(extras).forEach(function (k) { o[k] = extras[k]; });
    return o;
  }

  function escalaY(t, extras) {
    var o = {
      beginAtZero: true,
      grid: { color: t.grade, drawTicks: false },
      border: { display: false },
      ticks: { color: t.mudo, font: { family: 'Inter', size: 11 }, padding: 8 }
    };
    if (extras) Object.keys(extras).forEach(function (k) { o[k] = extras[k]; });
    return o;
  }

  function escalaX(t, extras) {
    var o = {
      grid: { display: false },
      border: { color: t.borda },
      ticks: { color: t.mudo, font: { family: 'Inter', size: 11 } }
    };
    if (extras) Object.keys(extras).forEach(function (k) { o[k] = extras[k]; });
    return o;
  }

  function gradiente(ctx, area, cor, topo) {
    if (!area) return cor;
    var g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, topo || cor.replace('1)', '0.35)').replace('#', 'rgba(') === cor ? cor : cor);
    return g;
  }

  /* ------------------------------------------------------------------ *
   * API pública                                                        *
   * ------------------------------------------------------------------ */
  var Charts = {
    FMT: FMT,
    ready: readyPromise,
    registry: registry,
    get disponivel() { return !!global.Chart; },

    setAnimacoes: function (v) { animacoesAtivas = !!v; },
    get animacoes() { return animacoesAtivas; },

    /** Cria ou atualiza um gráfico. */
    upsert: function (id, config) {
      var el = document.getElementById(id);
      if (!el || !global.Chart) return null;
      if (registry[id]) {
        var c = registry[id];
        c.chart.data = config.data;
        c.chart.options = config.options;
        if (config.plugins) c.chart.plugins = config.plugins;
        c.chart.update();
        return c.chart;
      }
      var chart = new global.Chart(el.getContext('2d'), config);
      registry[id] = { chart: chart, config: config };
      return chart;
    },

    get: function (id) { return registry[id] ? registry[id].chart : null; },

    destroy: function (id) {
      if (registry[id]) { registry[id].chart.destroy(); delete registry[id]; }
    },

    destroyAll: function () {
      Object.keys(registry).forEach(function (id) { Charts.destroy(id); });
    },

    /** Reaplica cores do tema a todos os gráficos registrados. */
    aplicarTema: function () {
      var t = tema();
      Object.keys(registry).forEach(function (id) {
        var c = registry[id];
        var opts = c.chart.options;
        if (opts.scales) {
          Object.keys(opts.scales).forEach(function (k) {
            var sc = opts.scales[k];
            if (sc.grid && sc.grid.color !== undefined) sc.grid.color = t.grade;
            if (sc.ticks) sc.ticks.color = t.mudo;
            if (sc.border && sc.border.color) sc.border.color = t.borda;
          });
        }
        if (opts.plugins && opts.plugins.tooltip) {
          opts.plugins.tooltip.backgroundColor = t.surface;
          opts.plugins.tooltip.borderColor = t.borda;
          opts.plugins.tooltip.titleColor = t.texto;
          opts.plugins.tooltip.bodyColor = t.texto2;
        }
        c.chart.update('none');
      });
    },

    temaAtual: tema,
    escalaY: escalaY,
    escalaX: escalaX,
    baseOptions: baseOptions
  };

  global.Charts = Charts;
})(window);
