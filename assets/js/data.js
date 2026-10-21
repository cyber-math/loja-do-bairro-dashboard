/* =========================================================================
 * Loja do Bairro — PoC Dashboard
 * Camada de dados (mock determinístico)
 * -------------------------------------------------------------------------
 * Todos os números vêm de um PRNG com semente fixa (mulberry32), de forma
 * que o dashboard exiba EXATAMENTE os mesmos dados a cada carregamento.
 * Isso é essencial para um PoC de demonstração: o que você vê na tela
 * hoje é o mesmo que o cliente vai ver amanhã.
 *
 * Exposto globalmente como `window.DADOS` (API pública abaixo).
 * ========================================================================= */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. PRNG determinístico                                             *
   * ------------------------------------------------------------------ */
  function mulberry32(semente) {
    var a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var SEED = 20260421;
  var rng = mulberry32(SEED);

  function rand() { return rng(); }
  function randInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
  function pick(lista) { return lista[Math.floor(rng() * lista.length)]; }
  function pickWeighted(pesos) {
    var total = pesos.reduce(function (a, b) { return a + b; }, 0);
    var r = rng() * total;
    for (var i = 0; i < pesos.length; i++) {
      r -= pesos[i];
      if (r <= 0) return i;
    }
    return pesos.length - 1;
  }
  function gauss(media, desvio) {
    var u = 1 - rng(), v = rng();
    return media + desvio * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* ------------------------------------------------------------------ *
   * 2. Dimensões do tempo                                              *
   * ------------------------------------------------------------------ */
  var HOJE = new Date();
  HOJE.setHours(0, 0, 0, 0);
  var DIAS = 540; // ~18 meses de histórico simulado

  function dataDeOffset(diasAtras) {
    var d = new Date(HOJE.getTime());
    d.setDate(d.getDate() - diasAtras);
    return d;
  }
  function chaveData(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function iso(d) { return d.toISOString().slice(0, 10); }

  /* ------------------------------------------------------------------ *
   * 3. Catálogos                                                       *
   * ------------------------------------------------------------------ */
  var CATEGORIAS = [
    { id: 'bebidas',     nome: 'Bebidas',          cor: '#10b981' },
    { id: 'mercearia',   nome: 'Mercearia',        cor: '#f59e0b' },
    { id: 'padaria',     nome: 'Padaria',          cor: '#f97316' },
    { id: 'congelados',  nome: 'Congelados',       cor: '#3b82f6' },
    { id: 'limpeza',     nome: 'Limpeza',          cor: '#06b6d4' },
    { id: 'higiene',     nome: 'Higiene & Beleza',  cor: '#8b5cf6' },
    { id: 'hortifruti',  nome: 'Hortifruti',       cor: '#22c55e' },
    { id: 'pet',         nome: 'Pet Shop',         cor: '#ec4899' }
  ];

  var CATEGORIA_POR_ID = {};
  CATEGORIAS.forEach(function (c) { CATEGORIA_POR_ID[c.id] = c; });

  var FORNECEDORES = [
    { id: 'F01', nome: 'Distribuidora Central', contato: 'compras@distcentral.com.br', prazoMedio: 3, taxaAtraso: 6,  qualidade: 94, rating: 4.6, volume: 38 },
    { id: 'F02', nome: 'Alimentos Norte',       contato: 'pedidos@alimentosnorte.com', prazoMedio: 5, taxaAtraso: 11, qualidade: 88, rating: 4.1, volume: 26 },
    { id: 'F03', nome: 'Laticínios Serra',      contato: 'sac@laticiniosserra.com',   prazoMedio: 2, taxaAtraso: 3,  qualidade: 97, rating: 4.8, volume: 14 },
    { id: 'F04', nome: 'Higiene Total',         contato: 'vendas@higienetotal.com',   prazoMedio: 4, taxaAtraso: 8,  qualidade: 91, rating: 4.3, volume: 17 },
    { id: 'F05', nome: 'Pet & Companhia',       contato: 'contato@petcompanhia.com',  prazoMedio: 6, taxaAtraso: 14, qualidade: 85, rating: 4.0, volume: 9 },
    { id: 'F06', nome: 'Hortifruti da Vila',    contato: 'entrega@hortivila.com',    prazoMedio: 1, taxaAtraso: 2,  qualidade: 96, rating: 4.7, volume: 12 },
    { id: 'F07', nome: 'Padaria Pão Novo',      contato: 'pedidos@paonovo.com',       prazoMedio: 1, taxaAtraso: 1,  qualidade: 98, rating: 4.9, volume: 11 },
    { id: 'F08', nome: 'Limpar Mais',           contato: 'sac@limparmais.com',       prazoMedio: 4, taxaAtraso: 9,  qualidade: 90, rating: 4.4, volume: 8 },
    { id: 'F09', nome: 'Tech Foodservice',      contato: 'suporte@techfs.com',        prazoMedio: 8, taxaAtraso: 19, qualidade: 82, rating: 3.8, volume: 6 },
    { id: 'F10', nome: 'Global Supply',         contato: 'b2b@globalsupply.com',      prazoMedio: 7, taxaAtraso: 16, qualidade: 86, rating: 4.0, volume: 7 }
  ];
  var FORNECEDOR_POR_ID = {};
  FORNECEDORES.forEach(function (f) { FORNECEDOR_POR_ID[f.id] = f; });

  var TIPOS_OS = [
    { id: 'refrigeracao', nome: 'Refrigeração',      cor: '#3b82f6', slaHoras: 8,  custoBase: 240 },
    { id: 'eletrica',     nome: 'Elétrica',          cor: '#f59e0b', slaHoras: 12, custoBase: 180 },
    { id: 'hidraulica',   nome: 'Hidráulica',        cor: '#06b6d4', slaHoras: 16, custoBase: 210 },
    { id: 'pdv',          nome: 'PDV & Sistemas',    cor: '#8b5cf6', slaHoras: 4,  custoBase: 320 },
    { id: 'predial',      nome: 'Reparo Predial',    cor: '#f97316', slaHoras: 48, custoBase: 420 },
    { id: 'seguranca',    nome: 'Segurança',         cor: '#ef4444', slaHoras: 6,  custoBase: 260 },
    { id: 'preventiva',   nome: 'Manutenção Preventiva', cor: '#10b981', slaHoras: 72, custoBase: 190 },
    { id: 'higienizacao', nome: 'Limpeza & Higienização', cor: '#ec4899', slaHoras: 24, custoBase: 150 }
  ];
  var TIPO_OS_POR_ID = {};
  TIPOS_OS.forEach(function (t) { TIPO_OS_POR_ID[t.id] = t; });

  var STATUS_OS = [
    { id: 'aberta',          nome: 'Aberta',             cor: '#f59e0b' },
    { id: 'em_andamento',    nome: 'Em andamento',       cor: '#3b82f6' },
    { id: 'aguardando_peca', nome: 'Aguardando peça',    cor: '#a855f7' },
    { id: 'concluida',       nome: 'Concluída',          cor: '#10b981' },
    { id: 'cancelada',       nome: 'Cancelada',          cor: '#6b7280' }
  ];
  var STATUS_OS_POR_ID = {};
  STATUS_OS.forEach(function (s) { STATUS_OS_POR_ID[s.id] = s; });

  var PRIORIDADES = [
    { id: 'baixa',   nome: 'Baixa',   cor: '#6b7280', peso: 22 },
    { id: 'media',   nome: 'Média',   cor: '#0ea5e9', peso: 38 },
    { id: 'alta',    nome: 'Alta',    cor: '#f59e0b', peso: 27 },
    { id: 'critica', nome: 'Crítica', cor: '#ef4444', peso: 13 }
  ];

  var TECNICOS = [
    { id: 'T01', nome: 'Ana Ribeiro',     especialidade: 'refrigeracao', avaliacao: 4.9 },
    { id: 'T02', nome: 'Carlos Menezes',  especialidade: 'eletrica',     avaliacao: 4.6 },
    { id: 'T03', nome: 'Diego Alves',     especialidade: 'pdv',          avaliacao: 4.8 },
    { id: 'T04', nome: 'Elaine Souza',    especialidade: 'hidraulica',   avaliacao: 4.4 },
    { id: 'T05', nome: 'Fábio Teixeira',  especialidade: 'predial',      avaliacao: 4.2 },
    { id: 'T06', nome: 'Gabriela Lima',   especialidade: 'higienizacao', avaliacao: 4.7 },
    { id: 'T07', nome: 'Hugo Barros',     especialidade: 'preventiva',   avaliacao: 4.3 }
  ];

  var SOLICITANTES = [
    'Marina Alves (gerente)', 'Rafael Ito (caixa)', 'Tatiane Lopes (operação)',
    'Sérgio Pinto (logística)', 'Bianca Melo (fiscal)', 'João Prado (operação)'
  ];

  var SETORES = ['Caixa', 'Açougue', 'Padaria', 'Frios', 'Mercearia', 'Depósito', 'Área de vendas', 'Administrativo'];

  /* ------------------------------------------------------------------ *
   * 4. Catálogo de produtos                                            *
   *    [nome, categoria, preço, custo unitário, giro médio/dia]         *
   * ------------------------------------------------------------------ */
  var PRODUTOS_BASE = [
    // Bebidas
    ['Refrigerante Coca-Cola Lata 350ml', 'bebidas', 4.49, 2.98, 14],
    ['Refrigerante Pepsi Lata 350ml', 'bebidas', 3.89, 2.61, 11],
    ['Guaraná Antarctica Lata 350ml', 'bebidas', 3.49, 2.35, 12],
    ['Refrigerante Coca-Cola 2L', 'bebidas', 9.90, 6.85, 6],
    ['Refrigerante Coca-Cola Zero 2L', 'bebidas', 9.90, 6.90, 4],
    ['Água Mineral sem Gás 500ml', 'bebidas', 2.49, 1.42, 26],
    ['Água Mineral com Gás 500ml', 'bebidas', 3.29, 2.05, 7],
    ['Suco de Uva Integral 1L', 'bebidas', 12.90, 8.40, 4],
    ['Suco de Laranja Integral 1L', 'bebidas', 11.50, 7.35, 3],
    ['Cerveja Long Neck Original', 'bebidas', 8.90, 5.60, 9],
    ['Cerveja Lata Premium', 'bebidas', 7.50, 4.80, 6],
    ['Chá Mate Natural 1L', 'bebidas', 7.90, 5.10, 4],
    ['Chá Verde Limão 1L', 'bebidas', 8.50, 5.60, 3],
    ['Refrigerante Energético 269ml', 'bebidas', 9.90, 7.20, 5],
    ['Refrigerante Isotonic 500ml', 'bebidas', 6.90, 4.60, 4],
    // Mercearia
    ['Arroz Tipo 1 Agro 5kg', 'mercearia', 27.90, 21.40, 4],
    ['Feijão Carioca Extra 1kg', 'mercearia', 8.49, 6.15, 7],
    ['Açúcar Refinado 1kg', 'mercearia', 4.99, 3.60, 9],
    ['Óleo de Soja 900ml', 'mercearia', 7.49, 5.85, 6],
    ['Macarrão Espaguete 500g', 'mercearia', 4.79, 3.20, 8],
    ['Farinha de Mandioca 1kg', 'mercearia', 6.99, 4.85, 4],
    ['Aveia em Flocos 200g', 'mercearia', 9.90, 7.10, 2],
    ['Atum Solidificado 170g', 'mercearia', 7.99, 5.60, 5],
    ['Extrato de Tomate 400g', 'mercearia', 5.49, 3.85, 6],
    ['Sal Refinado Iodado 1kg', 'mercearia', 3.49, 2.15, 7],
    ['Corn Flakes 360g', 'mercearia', 13.90, 9.80, 3],
    ['Granola Integral 400g', 'mercearia', 18.90, 13.60, 2],
    ['Mel Silvestre 300g', 'mercearia', 16.50, 11.90, 1],
    ['Achocolatado em Pó 400g', 'mercearia', 12.90, 9.10, 3],
    ['Fubá de Moinho 1kg', 'mercearia', 5.99, 4.10, 2],
    // Padaria
    ['Pão Francês kg', 'padaria', 18.90, 11.40, 9],
    ['Pão de Forma Integral 500g', 'padaria', 12.90, 8.20, 4],
    ['Croissant Manteiga', 'padaria', 6.50, 3.80, 5],
    ['Bolo de Chocolate-fatia', 'padaria', 9.90, 5.60, 4],
    ['Cuca de Banana', 'padaria', 7.00, 4.10, 3],
    ['Bisnaguinho com Doce de Leite', 'padaria', 8.50, 5.00, 2],
    ['Pão de Queijo 500g', 'padaria', 21.90, 13.50, 2],
    ['Torta de Limão', 'padaria', 24.90, 14.80, 1],
    ['Pão Integral 500g', 'padaria', 13.90, 8.90, 2],
    ['Croissant Chocolate', 'padaria', 7.50, 4.40, 3],
    ['Pão de Açúcar', 'padaria', 3.50, 1.80, 8],
    ['Bolo de Cenoura FATIA', 'padaria', 8.00, 4.50, 3],
    // Congelados
    ['Pizza Calabresa Congelada 460g', 'congelados', 22.90, 15.40, 5],
    ['Lasanha de Carne 500g', 'congelados', 19.90, 13.20, 3],
    ['Batata Frita Congelada 2kg', 'congelados', 24.90, 17.60, 4],
    ['Sorvete Chocolate 2L', 'congelados', 21.90, 14.70, 2],
    ['Empanado de Frango 1kg', 'congelados', 29.90, 20.10, 3],
    ['Filé de Tilápia 500g', 'congelados', 18.90, 12.90, 2],
    ['Hambúrguer 120g (un)', 'congelados', 5.90, 3.60, 6],
    ['Feijão Congelado 500g', 'congelados', 11.90, 8.20, 2],
    ['Batata Palito 2kg', 'congelados', 23.90, 16.80, 3],
    ['Nuggets de Frango 300g', 'congelados', 18.90, 12.60, 2],
    ['Pão de Queijo Congelado 1kg', 'congelados', 29.90, 19.80, 1],
    ['Sorvete Creme 2L', 'congelados', 20.90, 13.90, 1],
    // Limpeza
    ['Detergente Neutro 500ml', 'limpeza', 3.49, 2.05, 9],
    ['Amaciante Concentrado 500ml', 'limpeza', 9.90, 6.40, 4],
    ['Água Sanitária 1L', 'limpeza', 5.49, 3.30, 4],
    ['Desinfetante Concentrado 500ml', 'limpeza', 8.90, 5.60, 3],
    ['Esponja Normal', 'limpeza', 2.49, 1.20, 8],
    ['Saco de Lixo 100L (pacote 100un)', 'limpeza', 34.90, 22.50, 2],
    ['Pão de Esponja 4un', 'limpeza', 11.90, 7.30, 3],
    ['Limpa Vidros 500ml', 'limpeza', 6.49, 4.10, 3],
    ['Álcool 70% 1L', 'limpeza', 12.90, 8.20, 3],
    ['Removedor de Manchas 500ml', 'limpeza', 10.90, 6.90, 2],
    ['Saco de Lixo 30L (pacote 50un)', 'limpeza', 18.90, 12.40, 2],
    ['Papel Toalha Interfolhado (fardo)', 'limpeza', 39.90, 27.30, 1],
    // Higiene & Beleza
    ['Sabonete em Barra 90g', 'higiene', 3.49, 2.05, 7],
    ['Shampoo 400ml', 'higiene', 18.90, 12.10, 4],
    ['Condicionador 400ml', 'higiene', 19.90, 12.80, 3],
    ['Pasta de Dente 90g', 'higiene', 7.99, 5.10, 6],
    ['Escova Dental Macia', 'higiene', 6.49, 3.90, 4],
    ['Desodorante Aerosol 150ml', 'higiene', 12.90, 8.40, 3],
    ['Absorvente Noturno (pacote 8un)', 'higiene', 24.90, 16.30, 2],
    ['Fio Dental 100m', 'higiene', 9.90, 6.60, 2],
    ['Envelope Funeral 100un', 'higiene', 14.90, 9.80, 1],
    ['Algodão 100g', 'higiene', 6.90, 4.40, 2],
    ['Creme Dental Clareador 90g', 'higiene', 24.90, 16.90, 1],
    ['Kit Presentação Shampoo + Cond. 500ml', 'higiene', 49.90, 33.50, 1],
    // Hortifruti
    ['Banana Prata (kg)', 'hortifruti', 6.90, 4.20, 11],
    ['Tomate Italiano (kg)', 'hortifruti', 12.90, 8.40, 7],
    ['Alface Crespa (un)', 'hortifruti', 5.90, 3.60, 9],
    ['Batata inglesa (kg)', 'hortifruti', 7.90, 4.90, 10],
    ['Cebola (kg)', 'hortifruti', 8.90, 5.60, 9],
    ['Alho (kg)', 'hortifruti', 29.90, 20.50, 3],
    ['Maçã Nacional (kg)', 'hortifruti', 16.90, 11.20, 8],
    ['Laranja Pera (kg)', 'hortifruti', 7.90, 5.10, 9],
    ['Abacate (kg)', 'hortifruti', 11.90, 7.60, 5],
    ['Uva Niagra (kg)', 'hortifruti', 18.90, 12.40, 5],
    ['Morango (bandeja 250g)', 'hortifruti', 14.90, 9.80, 4],
    ['Pimentão amarelo (kg)', 'hortifruti', 13.90, 9.10, 4],
    ['Mandioca (kg)', 'hortifruti', 9.90, 6.40, 5],
    ['Cenoura (kg)', 'hortifruti', 8.90, 5.70, 6],
    // Pet Shop
    ['Ração Gatos Castanha 3kg', 'pet', 44.90, 31.20, 2],
    ['Ração Cães Adulto 15kg', 'pet', 119.90, 86.40, 1],
    ['Areia Sanitária 4kg', 'pet', 19.90, 13.10, 3],
    ['Petisco Bifinho 500g', 'pet', 17.90, 11.40, 3],
    ['Brinquedo Mordedor Corda', 'pet', 24.90, 15.60, 1],
    ['Tapete Higiênico (pacote 30un)', 'pet', 69.90, 48.20, 1],
    ['Shampoo Neutro Pet 500ml', 'pet', 32.90, 21.70, 1],
    ['Coleira Peitoral N (M)', 'pet', 49.90, 33.10, 1],
    ['Antipulgas 3 pipetas', 'pet', 89.90, 63.40, 1]
  ];

  /* ------------------------------------------------------------------ *
   * 5. Simulação de histórico (540 dias)                                *
   * ------------------------------------------------------------------ */
  var FATOR_DIA_SEMANA = [0.78, 0.72, 0.80, 0.88, 1.18, 1.42, 1.25]; // dom..sáb

  function sazonalidade(dia) {
    // pico em junho (Dia das Mães) e dezembro (Natal)
    var m = dia.getMonth();
    var pico = 1 + 0.28 * Math.cos((m - 5) / 12 * 2 * Math.PI) + 0.22 * Math.cos((m - 11) / 12 * 2 * Math.PI);
    return clamp(pico, 0.7, 1.7);
  }

  function gerarProdutos() {
    var produtos = [];
    PRODUTOS_BASE.forEach(function (linha, idx) {
      var preco = linha[2];
      var custo = linha[3];
      var giroDia = linha[4];
      var estoqueMin = Math.max(3, Math.round(giroDia * 6));
      var estoqueMax = Math.max(estoqueMin * 2, Math.round(giroDia * 26));
      var estoqueInicial = randInt(estoqueMin, estoqueMax);
      var empacotamento = pick(['un', 'cx', 'pct', 'kg']);
      produtos.push({
        id: 'P' + String(idx + 1).padStart(4, '0'),
        sku: 'LB-' + String(CATEGORIA_POR_ID[linha[1]].id).slice(0, 3).toUpperCase() + '-' + String(1000 + idx),
        nome: linha[0],
        catId: linha[1],
        preco: preco,
        custo: custo,
        margemPct: (preco - custo) / preco,
        giroDia: giroDia,
        estoqueMin: estoqueMin,
        estoqueMax: estoqueMax,
        estoqueInicial: estoqueInicial,
        empacotamento: empacotamento,
        fornecedorId: FORNECEDORES[pickWeighted([40, 22, 8, 14, 4, 6, 4, 5, 3, 4])].id,
        serieVendas: new Array(DIAS),
        serieReceita: new Array(DIAS),
        serieEstoque: new Array(DIAS),
        diasSemVenda: 0,
        ultimaVenda: null,
        entradasMes: 0,
        custoReposicao: 0
      });
    });

    // Garante que todo fornecedor tenha ao menos um SKU. Sem isso, um
    // fornecedor sorteado com zero produtos aparece como ponto zerado no
    // scatter de desempenho e como linha vazia na tabela de portfólio.
    var contagem = {};
    produtos.forEach(function (p) { contagem[p.fornecedorId] = (contagem[p.fornecedorId] || 0) + 1; });
    FORNECEDORES.forEach(function (f) {
      if (contagem[f.id]) return;
      var doador = null, maior = 1;
      FORNECEDORES.forEach(function (g) {
        if ((contagem[g.id] || 0) > maior) { maior = contagem[g.id]; doador = g.id; }
      });
      if (!doador) return;
      var produto = produtos.find(function (p) { return p.fornecedorId === doador; });
      if (!produto) return;
      produto.fornecedorId = f.id;
      contagem[doador]--;
      contagem[f.id] = 1;
    });

    return produtos;
  }

  function simular(produtos) {
    var datas = new Array(DIAS);
    for (var i = 0; i < DIAS; i++) datas[i] = dataDeOffset(DIAS - 1 - i);

    produtos.forEach(function (p) {
      var estoque = p.estoqueInicial;
      var ultimaVenda = null;
      var diasSemVenda = 0;
      for (var d = 0; d < DIAS; d++) {
        var dt = datas[d];
        var fatorSemana = FATOR_DIA_SEMANA[dt.getDay()];
        var fatorSaz = sazonalidade(dt);
        var ruido = 0.78 + rng() * 0.46;
        var base = p.giroDia * fatorSemana * fatorSaz * ruido;
        // tendência leve de alta ao longo do período
        base *= 1 + (d / DIAS) * 0.12;
        var vendas = Math.max(0, Math.round(base + gauss(0, 0.7)));
        if (vendas > estoque) vendas = estoque;
        estoque -= vendas;
        if (vendas > 0) { ultimaVenda = dt; diasSemVenda = 0; }
        else diasSemVenda++;

        // reposição quando abaixo do mínimo
        if (estoque < p.estoqueMin) {
          var qtd = p.estoqueMax - estoque;
          estoque += qtd;
          p.entradasMes += qtd;
          p.custoReposicao += qtd * p.custo;
        }

        p.serieVendas[d] = vendas;
        p.serieReceita[d] = vendas * p.preco;
        p.serieEstoque[d] = estoque;
      }
      p.estoqueAtual = estoque;
      p.ultimaVenda = ultimaVenda;
      p.diasSemVenda = diasSemVenda;
      p.valorEmEstoque = estoque * p.custo;
      p.valorVendaPotencial = estoque * p.preco;
      p.coberturaDias = p.giroDia > 0 ? Math.round(estoque / p.giroDia) : 999;
    });
    return datas;
  }

  /* ------------------------------------------------------------------ *
   * 6. Geração das Ordens de Serviço                                   *
   * ------------------------------------------------------------------ */
  var TITULOS_OS = {
    refrigeracao: ['Freezer com temperatura alta', 'Balcão refrigerado não gela', 'Ar-condicionado da loja não resfria', 'Câmara fria com vazamento', 'Linha de congelados desliga'],
    eletrica: ['Lâmpadas queimadas no corredor', 'Quadro elétrico com disjuntor-tripulado', 'Tomadas sem energia no depósito', 'Painel de preços não acende', 'Disjuntor geral armando'],
    hidraulica: ['Vazamento na pia da mercearia', 'Descarga do banheiro entupida', 'Torneira do depósito pingando', 'Bebedouro com vazamento', 'Caixa d’água com obstrução'],
    pdv: ['PDV 2 travando na impressão', 'Caixa não sincroniza com o servidor', 'Impressora de cupom sem papel', 'Sistema de fidelidade fora do ar', 'Terminal de cartão recusando'],
    predial: ['Porta de vidro com dobradiça solta', 'Piso do corredor com infiltração', 'Telhado com goteira', 'Pintura descascando na entrada', 'Grade de proteção emperrada'],
    seguranca: ['Câmera 3 do estacionamento fora do ar', 'Sensor de porta sem leitura', 'Alarme dispara sem causa', 'Controle de acesso travado', 'Câmera 1 com imagem deformada'],
    preventiva: ['Preventiva trimestral das câmaras frias', 'Checklist elétrico mensal', 'Limpeza preventiva do condensador', 'Revisão de balanças e aferição', 'Manutenção preventiva do gerador'],
    higienizacao: ['Dedetização da área de alimentos', 'Higienização das câmaras frias', 'Limpeza profunda do depósito', 'Desinfecção de temperos e vitrines', 'Lavanderia industrial com vazamento']
  };

  var PECAS_POR_TIPO = {
    refrigeracao: ['Compressor 1/4 HP', 'Filtro secador', 'Termostato digital', 'Fluido refrigerante R-22', 'Ventoinha do condensador', 'Válvula de expansão'],
    eletrica: ['Lâmpada LED 18W', 'Disjuntor 40A', 'Cabo flexível 2,5mm', 'Tomada 2P+T', 'Filtro de linha', 'Contator 20A'],
    hidraulica: ['Veda rosca 1/2"', 'Reparo de caixa de descarga', 'Torneira de banco', 'Sifão 1"', 'Flexível 40cm', 'Registro de gaveta'],
    pdv: ['Cabo HDMI', 'Bateria de no-break', 'Rolete de impressora', 'Head de impressão', 'Nó de rede 1G', 'Fonte 12V'],
    predial: ['Dobradiça hidráulica', 'Selante silicone', 'Argamassa AC-II', 'Fechadura tubular', 'Lâmpada de emergência', 'Trinco de porta'],
    seguranca: ['Câmera IP66', 'Fonte 12V 5A', 'Cabo UTP Cat6', 'Bateria selada 12V 7Ah', 'Suporte de câmera', 'Controle de acesso'],
    preventiva: ['Filtro de ar', 'Óleo lubrificante', 'Parafusos de fixação', 'Fita isolante', 'Álcool 70%', 'Kit de limpeza'],
    higienizacao: ['Desinfetante concentrado', 'Saponete industrial', 'Papel toalha', 'Escova de nylon', 'Luvas de nitrílico', 'Saco de lixo industrial']
  };

  function gerarOS(produtos, datas) {
    var os = [];
    var total = 168;
    for (var i = 0; i < total; i++) {
      // distribuição: mais OS recentes (a loja cresce)
      var diasAtras = Math.floor(Math.pow(rand(), 1.55) * DIAS);
      var criada = new Date(HOJE.getTime());
      criada.setDate(criada.getDate() - diasAtras);
      criada.setHours(randInt(7, 19), randInt(0, 59), 0, 0);

      var tipoId = pickWeighted([16, 14, 11, 13, 12, 8, 18, 8]);
      var tipo = TIPOS_OS[tipoId];
      var prioId = PRIORIDADES[pickWeighted(PRIORIDADES.map(function (p) { return p.peso; }))].id;

      var statusId;
      if (diasAtras > 40) {
        statusId = pickWeighted([86, 8, 6]); // concluída / cancelada / aguardando
        statusId = ['concluida', 'cancelada', 'aguardando_peca'][statusId];
      } else if (diasAtras > 14) {
        statusId = pickWeighted([62, 22, 8, 8]);
        statusId = ['concluida', 'em_andamento', 'aguardando_peca', 'aberta'][statusId];
      } else {
        statusId = pickWeighted([46, 26, 12, 16]);
        statusId = ['concluida', 'em_andamento', 'aguardando_peca', 'aberta'][statusId];
      }

      var responsavel = TECNICOS.find(function (t) { return t.especialidade === tipo.id; }) || pick(TECNICOS);
      var horasDuracao = Math.max(1, Math.round(gauss(tipo.slaHoras * 1.4, tipo.slaHoras * 0.55)));
      var custoPecas = randInt(60, 420);
      var custoMaoObra = randInt(90, 460);
      var deslocamento = randInt(20, 90);

      var resolvida = null;
      if (statusId === 'concluida') {
        resolvida = new Date(criada.getTime());
        resolvida.setHours(resolvida.getHours() + horasDuracao);
        if (resolvida.getTime() > HOJE.getTime()) resolvida = new Date(HOJE.getTime());
      }

      var titulo = pick(TITULOS_OS[tipo.id]);
      var pecas = [];
      var qtdPecas = randInt(1, 3);
      for (var k = 0; k < qtdPecas; k++) {
        var nomePeca = pick(PECAS_POR_TIPO[tipo.id]);
        pecas.push({ nome: nomePeca, qtd: randInt(1, 3), custo: randInt(35, 260) });
      }

      os.push({
        id: 'OS-' + criada.getFullYear() + '-' + String(1000 + i),
        titulo: titulo,
        descricao: 'Chamado aberto pelo setor de ' + pick(SETORES) + '. ' + titulo + ' identificado durante a rotina de ' +
          (diasAtras > 40 ? 'fechamento mensal' : 'operação normal') + '.',
        tipoId: tipo.id,
        statusId: statusId,
        prioridadeId: prioId,
        responsavelId: responsavel.id,
        solicitante: pick(SOLICITANTES),
        setor: pick(SETORES),
        criadaEm: criada,
        resolvidaEm: resolvida,
        slaHoras: tipo.slaHoras,
        horasDuracao: statusId === 'concluida' ? horasDuracao : null,
        custoPecas: custoPecas,
        custoMaoObra: custoMaoObra,
        custoDeslocamento: deslocamento,
        pecas: pecas,
        historico: montarHistorico(criada, resolvida, responsavel, tipo, statusId)
      });
    }
    os.sort(function (a, b) { return b.criadaEm - a.criadaEm; });
    return os;
  }

  function montarHistorico(criada, resolvida, responsavel, tipo, statusId) {
    var h = [{
      em: criada,
      autor: 'Sistema',
      texto: 'Chamado registrado automaticamente pelo totem de atendimento.'
    }];
    h.push({
      em: new Date(criada.getTime() + 12 * 60000),
      autor: responsavel.nome,
      texto: 'Chamado atribuído e diagnóstico inicial iniciado.'
    });
    if (statusId !== 'aberta') {
      h.push({
        em: new Date(criada.getTime() + 90 * 60000),
        autor: responsavel.nome,
        texto: 'Peça reservada com o fornecedor — aguardando chegada.'
      });
    }
    if (statusId === 'concluida' && resolvida) {
      h.push({
        em: new Date(resolvida.getTime() - 45 * 60000),
        autor: responsavel.nome,
        texto: 'Peça instalada e equipamento testado com sucesso.'
      });
      h.push({
        em: resolvida,
        autor: 'Sistema',
        texto: 'Chamado encerrado. Garantia de 90 dias registrada.'
      });
    }
    return h;
  }

  /* ------------------------------------------------------------------ *
   * 7. Agregações e API pública                                        *
   * ------------------------------------------------------------------ */
  function janela(dias) {
    var ini = Math.max(0, DIAS - dias);
    return { ini: ini, fim: DIAS - 1, dias: dias };
  }

  function agregar(produtos, catFiltro, ini, fim) {
    var receita = 0, custo = 0, unidades = 0;
    var porCat = {};
    CATEGORIAS.forEach(function (c) { porCat[c.id] = { receita: 0, custo: 0, unidades: 0, skus: 0, valor: 0, baixo: 0 }; });

    produtos.forEach(function (p) {
      if (catFiltro && catFiltro !== 'todas' && p.catId !== catFiltro) return;
      var v = 0, r = 0, u = 0;
      for (var d = ini; d <= fim; d++) { u += p.serieVendas[d]; r += p.serieReceita[d]; }
      receita += r; custo += u * p.custo; unidades += u;
      var bucket = porCat[p.catId];
      bucket.receita += r; bucket.custo += u * p.custo; bucket.unidades += u;
      bucket.skus++; bucket.valor += p.valorEmEstoque;
      if (p.coberturaDias <= 7) bucket.baixo++;
    });

    return {
      receita: receita,
      custo: custo,
      lucro: receita - custo,
      unidades: unidades,
      porCat: porCat
    };
  }

  function serieDiaria(produtos, catFiltro, ini, fim) {
    var n = fim - ini + 1;
    var receita = new Array(n).fill(0);
    var custo = new Array(n).fill(0);
    var unidades = new Array(n).fill(0);
    var clientes = new Array(n).fill(0);

    produtos.forEach(function (p) {
      if (catFiltro && catFiltro !== 'todas' && p.catId !== catFiltro) return;
      for (var d = ini; d <= fim; d++) {
        var i = d - ini;
        unidades[i] += p.serieVendas[d];
        receita[i] += p.serieReceita[d];
        custo[i] += p.serieVendas[d] * p.custo;
      }
    });
    for (var k = 0; k < n; k++) {
      clientes[k] = Math.max(1, Math.round(unidades[k] / 2.8));
    }
    return { receita: receita, custo: custo, unidades: unidades, clientes: clientes };
  }

  function serieMensal(produtos, catFiltro) {
    var meses = [];
    for (var m = 11; m >= 0; m--) {
      var d = new Date(HOJE.getFullYear(), HOJE.getMonth() - m, 1);
      meses.push({ chave: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), rotulo: rotuloMes(d), inicio: d });
    }
    var buckets = meses.map(function () { return { receita: 0, custo: 0, unidades: 0, lucro: 0 }; });

    // pré-calcula o índice do mês de cada dia (evita O(DIAS × 12) por produto)
    var indiceMesPorDia = new Array(DIAS);
    for (var d = 0; d < DIAS; d++) {
      var dt = dataDeOffset(DIAS - 1 - d);
      var idx = -1;
      for (var i = 0; i < meses.length; i++) {
        if (dt.getFullYear() === meses[i].inicio.getFullYear() && dt.getMonth() === meses[i].inicio.getMonth()) { idx = i; break; }
      }
      indiceMesPorDia[d] = idx;
    }

    produtos.forEach(function (p) {
      if (catFiltro && catFiltro !== 'todas' && p.catId !== catFiltro) return;
      for (var d = 0; d < DIAS; d++) {
        var idx = indiceMesPorDia[d];
        if (idx < 0) continue;
        buckets[idx].unidades += p.serieVendas[d];
        buckets[idx].receita += p.serieReceita[d];
        buckets[idx].custo += p.serieVendas[d] * p.custo;
      }
    });
    buckets.forEach(function (b) { b.lucro = b.receita - b.custo; });
    return { meses: meses, dados: buckets };
  }

  function rotuloMes(d) {
    var m = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return m[d.getMonth()] + '/' + String(d.getFullYear()).slice(2);
  }

  /* --- Execução da simulação ------------------------------------------ */
  var PRODUTOS = gerarProdutos();
  var DATAS = simular(PRODUTOS);
  var OS = gerarOS(PRODUTOS, DATAS);

  // índice OS por dia (para séries de OS)
  var OS_POR_DIA = (function () {
    var mapa = {};
    for (var i = 0; i < DIAS; i++) mapa[i] = { abertas: 0, fechadas: 0, custo: 0 };
    OS.forEach(function (o) {
      var idx = DIAS - 1 - Math.floor((HOJE.getTime() - o.criadaEm.getTime()) / 86400000);
      if (idx >= 0 && idx < DIAS) mapa[idx].abertas++;
      if (o.resolvidaEm) {
        var idx2 = DIAS - 1 - Math.floor((HOJE.getTime() - o.resolvidaEm.getTime()) / 86400000);
        if (idx2 >= 0 && idx2 < DIAS) { mapa[idx2].fechadas++; mapa[idx2].custo += o.custoPecas + o.custoMaoObra + o.custoDeslocamento; }
      }
    });
    return mapa;
  })();

  /* ------------------------------------------------------------------ *
   * 8. API pública                                                     *
   * ------------------------------------------------------------------ */
  global.DADOS = {
    SEED: SEED,
    HOJE: HOJE,
    DIAS: DIAS,
    CATEGORIAS: CATEGORIAS,
    FORNECEDORES: FORNECEDORES,
    TIPOS_OS: TIPOS_OS,
    STATUS_OS: STATUS_OS,
    PRIORIDADES: PRIORIDADES,
    TECNICOS: TECNICOS,
    PRODUTOS: PRODUTOS,
    OS: OS,
    OS_POR_DIA: OS_POR_DIA,
    DATAS: DATAS,

    categoria: function (id) { return CATEGORIA_POR_ID[id]; },
    fornecedor: function (id) { return FORNECEDOR_POR_ID[id]; },
    tipoOS: function (id) { return TIPO_OS_POR_ID[id]; },
    statusOS: function (id) { return STATUS_OS_POR_ID[id]; },
    prioridade: function (id) { return PRIORIDADES.find(function (p) { return p.id === id; }); },
    tecnico: function (id) { return TECNICOS.find(function (t) { return t.id === id; }); },

    janela: janela,
    agregar: agregar,
    serieDiaria: serieDiaria,
    serieMensal: serieMensal,
    rotuloMes: rotuloMes,

    /** Filtra OS por período / status / tipo / prioridade / texto. */
    filtrarOS: function (opts) {
      opts = opts || {};
      var dias = opts.dias || 30;
      var inicio = HOJE.getTime() - (dias - 1) * 86400000;
      return OS.filter(function (o) {
        if (o.criadaEm.getTime() < inicio) return false;
        if (opts.status && opts.status !== 'todas' && o.statusId !== opts.status) return false;
        if (opts.tipo && opts.tipo !== 'todas' && o.tipoId !== opts.tipo) return false;
        if (opts.prioridade && opts.prioridade !== 'todas' && o.prioridadeId !== opts.prioridade) return false;
        if (opts.responsavel && opts.responsavel !== 'todas' && o.responsavelId !== opts.responsavel) return false;
        if (opts.texto) {
          var t = opts.texto.toLowerCase();
          var alvo = (o.id + ' ' + o.titulo + ' ' + o.solicitante + ' ' + o.setor + ' ' + DADOS.tipoOS(o.tipoId).nome).toLowerCase();
          if (alvo.indexOf(t) === -1) return false;
        }
        return true;
      });
    },

    /** Resumo operacional das OS em um período. */
    resumoOS: function (lista) {
      var r = { total: lista.length, aberta: 0, em_andamento: 0, aguardando_peca: 0, concluida: 0, cancelada: 0, custo: 0, prazoTotal: 0, concluidasCount: 0, slaEstourado: 0, slaEmRisco: 0 };
      lista.forEach(function (o) {
        r[o.statusId] = (r[o.statusId] || 0) + 1;
        if (o.statusId === 'concluida') {
          r.custo += o.custoPecas + o.custoMaoObra + o.custoDeslocamento;
          r.concluidasCount++;
          r.prazoTotal += o.horasDuracao || 0;
        }
        if (o.statusId !== 'concluida' && o.statusId !== 'cancelada') {
          var horas = (HOJE.getTime() - o.criadaEm.getTime()) / 3600000;
          if (horas > o.slaHoras) r.slaEstourado++;
          else if (horas > o.slaHoras * 0.7) r.slaEmRisco++;
        }
      });
      r.custoMedio = r.concluidasCount ? r.custo / r.concluidasCount : 0;
      r.prazoMedio = r.concluidasCount ? r.prazoTotal / r.concluidasCount : 0;
      r.taxaConclusao = lista.length ? r.concluidasCount / lista.length : 0;
      return r;
    }
  };
})(window);
