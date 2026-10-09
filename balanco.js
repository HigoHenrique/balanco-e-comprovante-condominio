'use strict';

/**
 * Balanco — Módulo da Tela 2.
 * Gerencia lançamentos (receitas/despesas), categorias e exportação do balanço.
 */
const Balanco = (() => {

  // ── Fixed Categories ───────────────────────────────────────
  const CATEGORIAS_FIXAS = [
    { id: 'agua',    nome: 'Água',    emoji: '💧' },
    { id: 'energia', nome: 'Energia', emoji: '⚡' },
    { id: 'limpeza', nome: 'Limpeza', emoji: '🧹' },
  ];

  // ── State ──────────────────────────────────────────────────
  let lancamentos      = [];
  let categoriasCustom = [];
  let editingId        = null;

  // ── Init ───────────────────────────────────────────────────
  function init() {
    _loadData();
    _buildFilters();
    _buildCategorySelect();
    _bindEvents();
    _render();
  }

  // ── Persistence ────────────────────────────────────────────
  function _loadData() {
    lancamentos      = Storage.load(Storage.KEYS.LANCAMENTOS, []);
    categoriasCustom = Storage.load(Storage.KEYS.CATEGORIAS_CUSTOM, []);
  }

  function _saveData() {
    Storage.save(Storage.KEYS.LANCAMENTOS, lancamentos);
    Storage.save(Storage.KEYS.CATEGORIAS_CUSTOM, categoriasCustom);
  }

  // ── Build Filters ──────────────────────────────────────────
  function _buildFilters() {
    _populateMonthSelect('filter-mes', true);
    _populateYearSelect('filter-ano', true);
  }

  function _populateMonthSelect(id, includeAll = false) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';

    if (includeAll) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Todos os meses';
      sel.appendChild(opt);
    }

    App.getMeses().forEach((nome, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = nome;
      sel.appendChild(opt);
    });
  }

  function _populateYearSelect(id, includeAll = false) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';

    if (includeAll) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Todos os anos';
      sel.appendChild(opt);
    }

    const currentYear = App.getCurrentYear();
    for (let y = currentYear + 1; y >= 2020; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  // ── Build Category Select ──────────────────────────────────
  function _buildCategorySelect() {
    const sel = document.getElementById('input-categoria');
    if (!sel) return;

    sel.innerHTML = '';

    // Fixed categories
    CATEGORIAS_FIXAS.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.nome;
      opt.textContent = `${cat.emoji} ${cat.nome}`;
      sel.appendChild(opt);
    });

    // Custom categories
    if (categoriasCustom.length > 0) {
      const divider = document.createElement('option');
      divider.disabled = true;
      divider.textContent = '── Minhas categorias ──';
      sel.appendChild(divider);

      categoriasCustom.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = `📁 ${cat}`;
        sel.appendChild(opt);
      });
    }

    // Add new category option
    const addOpt = document.createElement('option');
    addOpt.value = '_nova';
    addOpt.textContent = '➕ Nova categoria...';
    sel.appendChild(addOpt);
  }

  // ── Bind Events ────────────────────────────────────────────
  function _bindEvents() {
    // Show/hide add form
    document.getElementById('btn-add-lancamento')
      ?.addEventListener('click', () => _openForm(null));

    document.getElementById('btn-cancel-lancamento')
      ?.addEventListener('click', _closeForm);

    // Form submit
    document.getElementById('form-lancamento')
      ?.addEventListener('submit', e => {
        e.preventDefault();
        _saveLancamento();
      });

    // Category change — show custom input if needed
    document.getElementById('input-categoria')
      ?.addEventListener('change', _onCategoryChange);

    // Filters
    document.getElementById('filter-mes')
      ?.addEventListener('change', _render);
    document.getElementById('filter-ano')
      ?.addEventListener('change', _render);

    // Export balance PDF
    document.getElementById('btn-export-balanco-pdf')
      ?.addEventListener('click', _exportBalancoPdf);

    // Backup: export JSON
    document.getElementById('btn-backup-exportar')
      ?.addEventListener('click', _exportDados);

    // Backup: import JSON (click proxy do input hidden)
    document.getElementById('btn-backup-importar')
      ?.addEventListener('click', () => {
        document.getElementById('input-backup-file')?.click();
      });

    document.getElementById('input-backup-file')
      ?.addEventListener('change', _importDados);
  }

  // ── Category Change Handler ─────────────────────────────────
  function _onCategoryChange() {
    const sel = document.getElementById('input-categoria');
    const customGroup = document.getElementById('custom-cat-group');
    if (!sel || !customGroup) return;

    if (sel.value === '_nova') {
      customGroup.classList.remove('hidden');
      document.getElementById('input-categoria-custom')?.focus();
    } else {
      customGroup.classList.add('hidden');
    }
  }

  // ── Open / Close Form ──────────────────────────────────────
  function _openForm(lancamento = null) {
    editingId = lancamento ? lancamento.id : null;

    const wrapper = document.getElementById('form-lancamento-wrapper');
    const title   = document.getElementById('form-lancamento-title');
    if (!wrapper) return;

    // Reset form
    document.getElementById('form-lancamento')?.reset();
    document.getElementById('custom-cat-group')?.classList.add('hidden');

    // Set defaults
    const mesInput = document.getElementById('input-lancamento-mes');
    const anoInput = document.getElementById('input-lancamento-ano');

    // Clear and rebuild month select in form
    _populateMonthSelect('input-lancamento-mes', false);

    if (anoInput) anoInput.value = App.getCurrentYear();

    if (lancamento) {
      // Fill form with existing data for editing
      if (title) title.textContent = 'Editar Lançamento';
      _fillFormForEdit(lancamento);
    } else {
      if (title) title.textContent = 'Novo Lançamento';
      // Default to current month
      if (mesInput) mesInput.value = App.getCurrentMonth();
    }

    wrapper.classList.remove('hidden');
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function _fillFormForEdit(l) {
    // Category
    const sel = document.getElementById('input-categoria');
    if (sel) {
      // Check if value exists in select
      const exists = Array.from(sel.options).some(o => o.value === l.categoria);
      if (exists) {
        sel.value = l.categoria;
      } else {
        // It's a custom category not in list yet — add it
        sel.value = '_nova';
        const customInput = document.getElementById('input-categoria-custom');
        if (customInput) customInput.value = l.categoria;
        document.getElementById('custom-cat-group')?.classList.remove('hidden');
      }
    }

    // Tipo
    const tipoRadios = document.querySelectorAll('input[name="tipo"]');
    tipoRadios.forEach(r => { r.checked = r.value === l.tipo; });

    // Valor
    const valorInput = document.getElementById('input-lancamento-valor');
    if (valorInput) valorInput.value = l.valor;

    // Mês
    const mesInput = document.getElementById('input-lancamento-mes');
    if (mesInput) mesInput.value = l.mes;

    // Ano
    const anoInput = document.getElementById('input-lancamento-ano');
    if (anoInput) anoInput.value = l.ano;
  }

  function _closeForm() {
    const wrapper = document.getElementById('form-lancamento-wrapper');
    if (wrapper) wrapper.classList.add('hidden');
    editingId = null;
  }

  // ── Save Lancamento ────────────────────────────────────────
  function _saveLancamento() {
    // Read values
    let categoria = document.getElementById('input-categoria')?.value || '';
    const categoriaCustomVal = (document.getElementById('input-categoria-custom')?.value || '').trim();

    // If custom category selected
    if (categoria === '_nova') {
      if (!categoriaCustomVal) {
        App.showToast('Digite o nome da nova categoria.', 'warning');
        return;
      }
      categoria = categoriaCustomVal;

      // Save to custom categories if not already there
      if (!categoriasCustom.includes(categoria)) {
        categoriasCustom.push(categoria);
        _buildCategorySelect(); // rebuild select with new category
      }
    }

    const tipoEl = document.querySelector('input[name="tipo"]:checked');
    const tipo   = tipoEl ? tipoEl.value : 'despesa';

    const valorRaw = parseFloat(document.getElementById('input-lancamento-valor')?.value || '0');
    const mes      = parseInt(document.getElementById('input-lancamento-mes')?.value || '0');
    const ano      = parseInt(document.getElementById('input-lancamento-ano')?.value || '0');

    // Validation
    if (!categoria)       { App.showToast('Selecione ou informe a categoria.', 'warning'); return; }
    if (valorRaw <= 0)    { App.showToast('Informe um valor maior que zero.', 'warning'); return; }
    if (!mes)             { App.showToast('Selecione o mês de referência.', 'warning'); return; }
    if (!ano || ano < 2020) { App.showToast('Informe o ano corretamente (mínimo 2020).', 'warning'); return; }

    if (editingId) {
      // Update existing
      const idx = lancamentos.findIndex(l => l.id === editingId);
      if (idx !== -1) {
        lancamentos[idx] = { ...lancamentos[idx], categoria, tipo, valor: valorRaw, mes, ano };
        App.showToast('Lançamento atualizado com sucesso! ✅', 'success');
      }
    } else {
      // Create new
      lancamentos.push({
        id: App.generateId(),
        categoria,
        tipo,
        valor: valorRaw,
        mes,
        ano,
        criadoEm: Date.now(),
      });
      App.showToast('Lançamento adicionado! ✅', 'success');
    }

    _saveData();
    _closeForm();
    _render();
  }

  // ── Delete Lancamento ──────────────────────────────────────
  function _deleteLancamento(id) {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    lancamentos = lancamentos.filter(l => l.id !== id);
    _saveData();
    _render();
    App.showToast('Lançamento removido.', 'default');
  }

  // ── Get Filtered Lancamentos ───────────────────────────────
  function _getFiltered() {
    const filterMes = parseInt(document.getElementById('filter-mes')?.value || '0');
    const filterAno = parseInt(document.getElementById('filter-ano')?.value || '0');

    return lancamentos.filter(l => {
      if (filterMes && l.mes !== filterMes) return false;
      if (filterAno && l.ano !== filterAno) return false;
      return true;
    });
  }

  // ── Render ─────────────────────────────────────────────────
  function _render() {
    const filtered = _getFiltered();
    _renderSummary(filtered);
    _renderTable(filtered);
  }

  // ── Render Summary Cards ───────────────────────────────────
  function _renderSummary(items) {
    const totalReceitas = items
      .filter(l => l.tipo === 'receita')
      .reduce((s, l) => s + l.valor, 0);

    const totalDespesas = items
      .filter(l => l.tipo === 'despesa')
      .reduce((s, l) => s + l.valor, 0);

    const saldo = totalReceitas - totalDespesas;

    const elReceitas = document.getElementById('total-receitas');
    const elDespesas = document.getElementById('total-despesas');
    const elSaldo    = document.getElementById('saldo-total');

    if (elReceitas) elReceitas.textContent = App.formatCurrency(totalReceitas);
    if (elDespesas) elDespesas.textContent = App.formatCurrency(totalDespesas);

    if (elSaldo) {
      elSaldo.textContent = App.formatCurrency(saldo);
      elSaldo.style.color = saldo >= 0
        ? 'var(--success)'
        : 'var(--danger)';
    }

    // Show saldo card color
    const saldoCard = document.querySelector('.summary-card.balance');
    if (saldoCard) {
      saldoCard.classList.toggle('negative', saldo < 0);
    }
  }

  // ── Render Table ───────────────────────────────────────────
  function _renderTable(items) {
    const tbody    = document.getElementById('lancamentos-tbody');
    const empty    = document.getElementById('lancamentos-empty');
    const totals   = document.getElementById('lancamentos-totals');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (items.length === 0) {
      if (empty)  empty.classList.remove('hidden');
      if (totals) totals.classList.add('hidden');
      return;
    }

    if (empty)  empty.classList.add('hidden');
    if (totals) totals.classList.remove('hidden');

    const meses = App.getMeses();

    // Sort by year desc, month desc, then by type (receitas first)
    const sorted = [...items].sort((a, b) => {
      if (b.ano !== a.ano) return b.ano - a.ano;
      if (b.mes !== a.mes) return b.mes - a.mes;
      return a.tipo.localeCompare(b.tipo);
    });

    sorted.forEach(l => {
      const tr = document.createElement('tr');

      const tipoLabel = l.tipo === 'receita'
        ? '<span class="badge badge-success">↑ Receita</span>'
        : '<span class="badge badge-danger">↓ Despesa</span>';

      const mesNome = meses[l.mes - 1] || '-';
      const refText = `${mesNome}/${l.ano}`;

      tr.innerHTML = `
        <td class="td-desc">${_escapeHtml(l.categoria)}</td>
        <td>${tipoLabel}</td>
        <td style="white-space:nowrap; color:var(--text-secondary); font-size:.85rem;">${refText}</td>
        <td style="font-weight:700; color:${l.tipo === 'receita' ? 'var(--success)' : 'var(--danger)'}; white-space:nowrap;">
          ${l.tipo === 'despesa' ? '−' : '+'} ${App.formatCurrency(l.valor)}
        </td>
        <td class="td-actions">
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${l.id}" title="Editar">✏️</button>
          <button class="btn btn-danger btn-sm"  data-action="delete" data-id="${l.id}" title="Excluir">🗑️</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Event delegation for action buttons
    tbody.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id     = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'delete') {
          _deleteLancamento(id);
        } else if (action === 'edit') {
          const l = lancamentos.find(x => x.id === id);
          if (l) _openForm(l);
        }
      });
    });

    // Update totals row
    if (totals) {
      const totalReceitas = items.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
      const totalDespesas = items.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
      const saldo = totalReceitas - totalDespesas;

      document.getElementById('totals-receitas').textContent = App.formatCurrency(totalReceitas);
      document.getElementById('totals-despesas').textContent = App.formatCurrency(totalDespesas);

      const saldoEl = document.getElementById('totals-saldo');
      if (saldoEl) {
        saldoEl.textContent = App.formatCurrency(saldo);
        saldoEl.style.color = saldo >= 0 ? 'var(--success)' : 'var(--danger)';
      }
    }
  }

  // ── Backup: Export JSON ────────────────────────────────────
  function _exportDados() {
    try {
      const backup  = Storage.exportAll();
      const json    = JSON.stringify(backup, null, 2);
      const blob    = new Blob([json], { type: 'application/json' });
      const url     = URL.createObjectURL(blob);
      const date    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const a  = document.createElement('a');
      a.href   = url;
      a.download = `backup-condominio-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      App.showToast('Backup exportado com sucesso! 💾', 'success');
    } catch (err) {
      console.error('[Balanco] Erro ao exportar backup:', err);
      App.showToast('Erro ao gerar arquivo de backup.', 'error');
    }
  }

  // ── Backup: Import JSON ────────────────────────────────────
  function _importDados(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset o input para permitir re-importar o mesmo arquivo
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);

        // Validação básica ANTES de qualquer escrita
        if (!backup || typeof backup !== 'object' || backup.app !== 'cjp-gestao-condominial') {
          App.showToast('Este arquivo não é um backup válido deste sistema.', 'error');
          return;
        }
        if (!Array.isArray(backup.data?.[Storage.KEYS.LANCAMENTOS])) {
          App.showToast('Arquivo de backup corrompido ou incompleto.', 'error');
          return;
        }

        const totalLanc = backup.data[Storage.KEYS.LANCAMENTOS].length;
        const dataStr   = backup.exportedAt
          ? new Date(backup.exportedAt).toLocaleString('pt-BR')
          : 'data desconhecida';

        const confirmMsg =
          `Backup gerado em: ${dataStr}\n` +
          `Contém ${totalLanc} lançamento(s).\n\n` +
          `⚠️ Isso irá SUBSTITUIR todos os dados atuais.\nDeseja continuar?`;

        if (!confirm(confirmMsg)) {
          App.showToast('Importação cancelada.', 'default');
          return;
        }

        // Persiste somente após a confirmação do usuário
        const result = Storage.importAll(backup);
        if (!result.ok) {
          App.showToast(`Falha ao importar: ${result.error}`, 'error');
          return;
        }

        // Recarrega módulo internamente
        _loadData();
        _buildCategorySelect();
        _render();

        App.showToast(`${totalLanc} lançamento(s) importados com sucesso! ✅`, 'success');
      } catch {
        App.showToast('Arquivo inválido ou corrompido.', 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ── Export Balance PDF ──────────────────────────────────────
  async function _exportBalancoPdf() {
    // html-to-image tenta ler cssRules das folhas do Google Fonts e falha por
    // CORS. O html2canvas é local e renderiza a árvore já aplicada pelo browser.
    if (!window.jspdf || typeof html2canvas === 'undefined') {
      App.showToast('Bibliotecas de exportação não carregadas. Recarregue a página.', 'error');
      return;
    }

    const btn = document.getElementById('btn-export-balanco-pdf');
    if (btn) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<div class="spinner"></div> Gerando PDF...'; }

    try {
      const filtered = _getFiltered();
      const printEl  = document.getElementById('print-balanco');
      if (!printEl) throw new Error('Print element not found');

      _buildPrintView(printEl, filtered);

      // O elemento precisa permanecer renderizável para a biblioteca de captura.
      // `z-index:-1` faz com que ele seja pintado atrás do documento e gera um
      // canvas branco em alguns navegadores. Mantê-lo fora da tela é suficiente.
      printEl.style.cssText =
        'display:block; position:absolute; top:0; left:-9999px;' +
        'width:800px; background:#ffffff;';

      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 250)); // aguarda renderização completa

      const canvas = await html2canvas(printEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        logging: false,
        width: 800,
      });

      if (!_canvasHasContent(canvas)) {
        throw new Error('A captura do balanço resultou em uma imagem vazia');
      }

      // Oculta o elemento de impressão
      printEl.style.cssText = 'display:none; position:absolute; left:-9999px; top:0; width:800px;';

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 30;
      const imgW = pdfW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      const pageH = pdfH - margin * 2;

      // Handle single or multi-page cleanly without image distortion
      if (imgH <= pageH) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
      } else {
        const pxPerPt = canvas.width / imgW;
        const pageHPx = Math.floor(pageH * pxPerPt);
        let srcY = 0;
        let pageNum = 0;

        while (srcY < canvas.height) {
          if (pageNum > 0) pdf.addPage();
          const sliceHPx = Math.min(pageHPx, canvas.height - srcY);
          const sliceH = sliceHPx / pxPerPt;

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHPx;
          const sCtx = sliceCanvas.getContext('2d');
          sCtx.drawImage(canvas, 0, srcY, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);

          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, sliceH);
          srcY += sliceHPx;
          pageNum++;
        }
      }

      const filterAno = document.getElementById('filter-ano')?.value || App.getCurrentYear();
      pdf.save(`balanco-${filterAno}.pdf`);
      App.showToast('Balanço exportado em PDF! ✅', 'success');
    } catch (err) {
      console.error('[Balanco] Erro ao exportar PDF:', err);
      App.showToast('Erro ao gerar PDF. Tente novamente.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.orig || btn.innerHTML; }
    }
  }

  // ── Build Print View ───────────────────────────────────────
  // Evita gerar um PDF aparentemente válido, porém totalmente em branco.
  function _canvasHasContent(canvas) {
    if (!canvas || canvas.width < 2 || canvas.height < 2) return false;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;

    // Amostra o canvas inteiro. A versão anterior olhava só o canto superior
    // esquerdo, que é propositalmente branco por causa do espaçamento do layout.
    const stepX = Math.max(1, Math.floor(canvas.width / 40));
    const stepY = Math.max(1, Math.floor(canvas.height / 40));

    for (let y = 0; y < canvas.height; y += stepY) {
      for (let x = 0; x < canvas.width; x += stepX) {
        const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
        if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) return true;
      }
    }

    return false;
  }

  function _buildPrintView(el, items) {
    const meses = App.getMeses();
    const filterMes = parseInt(document.getElementById('filter-mes')?.value || '0');
    const filterAno = document.getElementById('filter-ano')?.value || '';

    let periodoText = 'Todos os períodos';
    if (filterMes && filterAno) periodoText = `${meses[filterMes - 1]} de ${filterAno}`;
    else if (filterAno) periodoText = `Ano de ${filterAno}`;
    else if (filterMes) periodoText = meses[filterMes - 1];

    const totalReceitas = items.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const totalDespesas = items.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    const saldo = totalReceitas - totalDespesas;

    const rows = [...items]
      .sort((a, b) => b.ano - a.ano || b.mes - a.mes)
      .map(l => `
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0;">${_escapeHtml(l.categoria)}</td>
          <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; color:${l.tipo === 'receita' ? '#16a34a' : '#dc2626'}; font-weight:700;">
            ${l.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
          </td>
          <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; color:#64748b;">${meses[l.mes - 1]}/${l.ano}</td>
          <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; font-weight:700; text-align:right; color:${l.tipo === 'receita' ? '#16a34a' : '#dc2626'};">
            ${l.tipo === 'despesa' ? '−' : '+'} ${App.formatCurrency(l.valor)}
          </td>
        </tr>
      `).join('');

    el.innerHTML = `
      <div style="padding:40px; font-family:'Inter',Arial,sans-serif; color:#1e293b;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8); color:#fff; padding:28px 32px; border-radius:12px; margin-bottom:24px; text-align:center;">
          <div style="font-size:1.1rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
            🏢 Condomínio Jardim Petrópolis
          </div>
          <div style="opacity:.8; font-size:.85rem;">Quadra 34 • Bloco L</div>
          <div style="margin-top:16px; background:rgba(255,255,255,.15); border-radius:8px; padding:10px 0; font-size:.85rem; font-weight:700; letter-spacing:2px; text-transform:uppercase;">
            BALANÇO FINANCEIRO
          </div>
          <div style="margin-top:8px; opacity:.75; font-size:.8rem;">${periodoText}</div>
        </div>

        <!-- Summary boxes (Tabela compatível 100% com html2canvas) -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:24px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:32%; padding-right:8px; vertical-align:top;">
              <div style="border:2px solid #dcfce7; border-radius:10px; padding:16px; background:#f0fdf4; text-align:center;">
                <div style="font-size:.7rem; text-transform:uppercase; letter-spacing:.5px; color:#16a34a; font-weight:700; margin-bottom:4px;">Total Receitas</div>
                <div style="font-size:1.1rem; font-weight:800; color:#16a34a;">${App.formatCurrency(totalReceitas)}</div>
              </div>
            </td>
            <td style="width:36%; padding:0 4px; vertical-align:top;">
              <div style="border:2px solid #fee2e2; border-radius:10px; padding:16px; background:#fff7f7; text-align:center;">
                <div style="font-size:.7rem; text-transform:uppercase; letter-spacing:.5px; color:#dc2626; font-weight:700; margin-bottom:4px;">Total Despesas</div>
                <div style="font-size:1.1rem; font-weight:800; color:#dc2626;">${App.formatCurrency(totalDespesas)}</div>
              </div>
            </td>
            <td style="width:32%; padding-left:8px; vertical-align:top;">
              <div style="border:2px solid #bfdbfe; border-radius:10px; padding:16px; background:#eff6ff; text-align:center;">
                <div style="font-size:.7rem; text-transform:uppercase; letter-spacing:.5px; color:#1d4ed8; font-weight:700; margin-bottom:4px;">Saldo Disponível</div>
                <div style="font-size:1.1rem; font-weight:800; color:${saldo >= 0 ? '#16a34a' : '#dc2626'};">${App.formatCurrency(saldo)}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Table -->
        ${items.length > 0 ? `
        <table style="width:100%; border-collapse:collapse; font-size:.875rem;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:12px 14px; text-align:left; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #e2e8f0;">Categoria</th>
              <th style="padding:12px 14px; text-align:left; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #e2e8f0;">Tipo</th>
              <th style="padding:12px 14px; text-align:left; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #e2e8f0;">Referência</th>
              <th style="padding:12px 14px; text-align:right; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #e2e8f0;">Valor</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:700;">
              <td colspan="3" style="padding:14px; border-top:2px solid #e2e8f0; font-size:.85rem; color:#1e293b;">SALDO DO PERÍODO</td>
              <td style="padding:14px; border-top:2px solid #e2e8f0; font-size:1rem; text-align:right; color:${saldo >= 0 ? '#16a34a' : '#dc2626'};">${App.formatCurrency(saldo)}</td>
            </tr>
          </tfoot>
        </table>` : '<p style="text-align:center; color:#94a3b8; padding:24px;">Nenhum lançamento no período selecionado.</p>'}

        <!-- Footer -->
        <table style="width:100%; margin-top:32px; border-top:1px solid #e2e8f0; font-size:.75rem; color:#94a3b8;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:left; padding-top:16px;">Emitido em: ${App.formatDate()}</td>
            <td style="text-align:right; padding-top:16px;">Condomínio Jardim Petrópolis — Sistema de Gestão</td>
          </tr>
        </table>
      </div>
    `;
  }

  // ── XSS Protection ─────────────────────────────────────────
  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Expose ─────────────────────────────────────────────────
  return { init };
})();
