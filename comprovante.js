'use strict';

/**
 * Comprovante — Módulo da Tela 1.
 * Gerencia o formulário, a prévia ao vivo e a exportação.
 */
const Comprovante = (() => {

  // ── Constants ──────────────────────────────────────────────
  const CONDO_NAME = 'Condomínio Jardim Petrópolis';
  const CONDO_SUB  = 'Quadra 34 • Bloco L';

  // ── Init ───────────────────────────────────────────────────
  function init() {
    _buildForm();
    _bindInputs();
    _bindExportButtons();
    _scalePreview();
    _updatePreview(); // render with empty state
    window.addEventListener('resize', _scalePreview);
  }

  // ── Build Form ─────────────────────────────────────────────
  function _buildForm() {
    // Populate month select
    const mesSelect = document.getElementById('input-mes');
    if (!mesSelect) return;

    const meses = App.getMeses();
    const currentMes = App.getCurrentMonth();

    meses.forEach((nome, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = nome;
      if (i + 1 === currentMes) opt.selected = true;
      mesSelect.appendChild(opt);
    });

    // Default year
    const anoInput = document.getElementById('input-ano');
    if (anoInput) anoInput.value = App.getCurrentYear();
  }

  // ── Bind Inputs → Live Preview ─────────────────────────────
  function _bindInputs() {
    const ids = ['input-nome', 'input-apto', 'input-bloco', 'input-quadra',
                 'input-mes', 'input-ano', 'input-valor', 'input-descricao',
                 'input-tipo-custom'];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', _updatePreview);
    });

    // Dropdown de tipo de cobrança
    const tipoSelect = document.getElementById('input-tipo-cobranca');
    if (tipoSelect) {
      tipoSelect.addEventListener('change', () => {
        const isCustom = tipoSelect.value === '_custom';
        const customGroup = document.getElementById('group-tipo-custom');
        if (customGroup) {
          customGroup.classList.toggle('hidden', !isCustom);
          if (isCustom) {
            document.getElementById('input-tipo-custom')?.focus();
          }
        }
        _updatePreview();
      });
    }
  }

  // ── Scale Preview for Mobile / Desktop ─────────────────────
  function _scalePreview() {
    const wrapper  = document.querySelector('.preview-wrapper');
    const frame    = document.querySelector('.receipt-paper-frame');
    const preview  = document.getElementById('receipt-preview');
    if (!wrapper || !preview || !frame) return;

    const RECEIPT_WIDTH = 500;
    const available = (wrapper.clientWidth || 500) - 8; // 4px padding on each side
    const scale = Math.min(1, Math.max(0.35, available / RECEIPT_WIDTH));

    frame.style.transform       = `scale(${scale})`;
    frame.style.transformOrigin = 'top center';

    // Ajusta altura do wrapper para evitar corte vertical
    const naturalH = preview.scrollHeight || preview.offsetHeight;
    const scaledH  = Math.ceil(naturalH * scale) + 16;
    wrapper.style.height    = `${scaledH}px`;
    wrapper.style.minHeight = `${scaledH}px`;
  }

  // ── Read Form Values ───────────────────────────────────────
  function _getFormData() {
    const nome    = (document.getElementById('input-nome')?.value   || '').trim();
    const apto    = (document.getElementById('input-apto')?.value   || '').trim();
    const bloco   = (document.getElementById('input-bloco')?.value  || 'L').trim();
    const quadra  = (document.getElementById('input-quadra')?.value || '34').trim();
    const mesIdx  = parseInt(document.getElementById('input-mes')?.value || '0');
    const ano     = (document.getElementById('input-ano')?.value    || App.getCurrentYear()).toString().trim();
    const valorRaw= parseFloat(document.getElementById('input-valor')?.value || '0');
    const desc    = (document.getElementById('input-descricao')?.value || '').trim();

    // Tipo de cobrança
    const tipoSelect = document.getElementById('input-tipo-cobranca')?.value || 'Taxa Condominial Ordinária';
    const tipoCustom = (document.getElementById('input-tipo-custom')?.value || '').trim();
    let finalTipo = tipoSelect;
    if (tipoSelect === '_custom') {
      finalTipo = tipoCustom || 'Taxa Personalizada';
    }

    const meses = App.getMeses();
    const mesNome = mesIdx >= 1 && mesIdx <= 12 ? meses[mesIdx - 1] : null;

    return { nome, apto, bloco, quadra, mesNome, ano, valorRaw, desc, finalTipo, tipoSelect };
  }

  // ── Update Preview ─────────────────────────────────────────
  function _updatePreview() {
    const { nome, apto, bloco, quadra, mesNome, ano, valorRaw, desc, finalTipo, tipoSelect } = _getFormData();

    // Helper for inline-style fields (placeholder via color+style)
    const setInlineField = (id, value, placeholder) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (value) {
        el.textContent = value;
        el.style.color = '#0f172a';
        el.style.fontStyle = 'normal';
        el.style.fontWeight = '700';
      } else {
        el.textContent = placeholder;
        el.style.color = '#94a3b8';
        el.style.fontStyle = 'italic';
        el.style.fontWeight = '400';
      }
    };

    setInlineField('rv-nome',   nome,   'Nome do morador');
    setInlineField('rv-apto',   apto,   'Nº apto');

    // Bloco & Quadra always have values (defaults)
    const blocoEl = document.getElementById('rv-bloco');
    if (blocoEl) { blocoEl.textContent = bloco || 'L'; blocoEl.style.color = '#0f172a'; blocoEl.style.fontStyle = 'normal'; }
    const quadraEl = document.getElementById('rv-quadra');
    if (quadraEl) { quadraEl.textContent = quadra || '34'; quadraEl.style.color = '#0f172a'; quadraEl.style.fontStyle = 'normal'; }

    // Período
    const periodoEl = document.getElementById('rv-periodo');
    if (periodoEl) {
      if (mesNome && ano) {
        periodoEl.textContent = `${mesNome}/${ano}`;
        periodoEl.style.color = '#0f172a';
        periodoEl.style.fontStyle = 'normal';
      } else {
        periodoEl.textContent = 'Mês / Ano';
        periodoEl.style.color = '#94a3b8';
        periodoEl.style.fontStyle = 'italic';
      }
    }

    // Título e Descrição do Lançamento
    const itemDescEl = document.getElementById('rv-itemdesc');
    const itemCodeEl = document.getElementById('rv-itemcode');
    const docTitleEl = document.getElementById('rv-doctitle');

    if (itemDescEl) itemDescEl.textContent = finalTipo;
    if (itemCodeEl) {
      itemCodeEl.textContent = tipoSelect === 'Taxa Condominial Ordinária' ? '0101' : '0201';
    }

    if (docTitleEl) {
      if (tipoSelect === 'Taxa Condominial Ordinária') {
        docTitleEl.textContent = 'RECIBO DE QUITAÇÃO';
      } else if (tipoSelect.includes('Taxa Extra')) {
        docTitleEl.textContent = 'RECIBO - TAXA EXTRA';
      } else {
        docTitleEl.textContent = 'RECIBO DE QUITAÇÃO';
      }
    }

    // Valor Nominal & Valor Total
    const valorNominalEl = document.getElementById('rv-valornominal');
    const valorEl        = document.getElementById('rv-valor');

    const formattedVal = valorRaw > 0 ? App.formatCurrency(valorRaw) : 'R$ 0,00';

    if (valorNominalEl) valorNominalEl.textContent = formattedVal;

    if (valorEl) {
      valorEl.textContent = formattedVal;
      if (valorRaw > 0) {
        valorEl.style.color = '#1e3a8a'; // filled: dark blue
      } else {
        valorEl.style.color = '#93c5fd'; // placeholder: light blue
      }
    }

    // Observações
    const obsEl = document.getElementById('rv-obs');
    if (obsEl) {
      if (desc) {
        obsEl.textContent = desc;
      } else {
        if (tipoSelect === 'Taxa Condominial Ordinária') {
          obsEl.textContent = 'Taxa condominial ordinária referente à manutenção e despesas comuns das áreas coletivas.';
        } else {
          obsEl.textContent = `Pagamento referente a: ${finalTipo}. Quitação plena da referida obrigação.`;
        }
      }
    }

    // Receipt number (formal format)
    const recNumber = _getReceiptNumber(ano, apto);
    const numEl = document.getElementById('rv-number');
    if (numEl) numEl.textContent = recNumber;

    // Emission date & Stamp date
    const todayStr = App.formatDate();
    const dateEl  = document.getElementById('rv-date');
    const stampEl = document.getElementById('rv-stampdate');
    if (dateEl)  dateEl.textContent  = todayStr;
    if (stampEl) stampEl.textContent = todayStr;

    // Re-scale after content update
    requestAnimationFrame(_scalePreview);
  }

  function _getReceiptNumber(ano, apto) {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const unit = String(apto || '01').padStart(3, '0').slice(-3);
    return `${ano || d.getFullYear()}.${mm}-${unit}`;
  }

  // ── Validation ─────────────────────────────────────────────
  function _validate() {
    const { nome, apto, mesNome, ano, valorRaw } = _getFormData();
    const errors = [];

    if (!nome)   errors.push('Nome do morador é obrigatório');
    if (!apto)   errors.push('Número do apartamento é obrigatório');
    if (!mesNome) errors.push('Selecione o mês de referência');
    if (!ano || ano.length < 4) errors.push('Informe o ano corretamente');
    if (valorRaw <= 0) errors.push('Informe o valor pago (deve ser maior que zero)');

    return errors;
  }

  // ── Export Buttons ─────────────────────────────────────────
  function _bindExportButtons() {
    document.getElementById('btn-export-png')
      ?.addEventListener('click', () => _exportImage('png'));
    document.getElementById('btn-export-jpg')
      ?.addEventListener('click', () => _exportImage('jpg'));
    document.getElementById('btn-export-pdf')
      ?.addEventListener('click', _exportPdf);
  }

  // ── Capture Receipt Data URL ───────────────────────────────
  async function _captureReceiptDataUrl(format, quality = 0.95) {
    await document.fonts.ready;

    const preview = document.getElementById('receipt-preview');
    if (!preview) throw new Error('Elemento de prévia não encontrado');

    const frame = document.querySelector('.receipt-paper-frame');

    // Desfaz temporariamente a escala responsiva do frame para captura em resolução 1:1 nativa (500px)
    const prevTransform = frame ? frame.style.transform : '';
    if (frame) {
      frame.style.transform = 'none';
    }

    try {
      // 1ª Opção: htmlToImage (renderização SVG nativa do motor do browser: 100% perfeita em borders, paddings e alinhamentos)
      if (typeof htmlToImage !== 'undefined') {
        const isJpg = format === 'jpg' || format === 'jpeg';
        const options = {
          pixelRatio: 3, // 1500px de largura (~300 DPI, ultra-nítido para WhatsApp, impressão e PDF)
          backgroundColor: '#ffffff',
          width: 500,
          quality: isJpg ? quality : undefined,
        };

        if (isJpg) {
          return await htmlToImage.toJpeg(preview, options);
        } else {
          return await htmlToImage.toPng(preview, options);
        }
      }

      // Fallback: html2canvas
      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(preview, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          logging: false,
        });

        if (format === 'jpg' || format === 'jpeg') {
          const jpgCanvas = document.createElement('canvas');
          jpgCanvas.width = canvas.width;
          jpgCanvas.height = canvas.height;
          const ctx = jpgCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
          ctx.drawImage(canvas, 0, 0);
          return jpgCanvas.toDataURL('image/jpeg', quality);
        }
        return canvas.toDataURL('image/png');
      }

      throw new Error('Nenhuma biblioteca de renderização gráfica encontrada.');
    } finally {
      if (frame) {
        frame.style.transform = prevTransform;
      }
    }
  }

  // ── Export Image (PNG / JPEG) ──────────────────────────────
  async function _exportImage(format) {
    const errors = _validate();
    if (errors.length) {
      App.showToast(errors[0], 'warning');
      return;
    }

    if (typeof htmlToImage === 'undefined' && typeof html2canvas === 'undefined') {
      App.showToast('Bibliotecas de exportação não carregadas. Recarregue a página.', 'error');
      return;
    }

    const btn = document.getElementById(`btn-export-${format}`);
    _setBtnLoading(btn, true);

    try {
      const dataUrl = await _captureReceiptDataUrl(format, 0.95);
      const { nome, apto } = _getFormData();
      const filename = _sanitizeFilename(`comprovante-${nome || 'morador'}-${apto || 'apto'}.${format}`);

      _downloadFile(dataUrl, filename);
      App.showToast(`Comprovante exportado como ${format.toUpperCase()}! ✅`, 'success');
    } catch (err) {
      console.error('[Comprovante] Erro ao exportar imagem:', err);
      App.showToast('Erro ao gerar imagem. Tente novamente.', 'error');
    } finally {
      _setBtnLoading(btn, false);
    }
  }

  // ── Export PDF ─────────────────────────────────────────────
  async function _exportPdf() {
    const errors = _validate();
    if (errors.length) {
      App.showToast(errors[0], 'warning');
      return;
    }

    if (!window.jspdf || (typeof htmlToImage === 'undefined' && typeof html2canvas === 'undefined')) {
      App.showToast('Bibliotecas de exportação (htmlToImage/jsPDF) não carregadas. Recarregue a página.', 'error');
      return;
    }

    const btn = document.getElementById('btn-export-pdf');
    _setBtnLoading(btn, true);

    try {
      const preview = document.getElementById('receipt-preview');
      const dataUrl = await _captureReceiptDataUrl('png');

      // A4 portrait: 595.28 x 841.89 pt
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pdfWidth  = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Proporção de recibo formal centralizado na página A4
      const imgWidth  = 460;
      const naturalW  = preview ? (preview.offsetWidth || 500) : 500;
      const naturalH  = preview ? (preview.offsetHeight || 600) : 600;
      const imgHeight = (naturalH / naturalW) * imgWidth;
      const xPos = (pdfWidth - imgWidth) / 2;
      const yPos = Math.max(35, (pdfHeight - imgHeight) / 2);

      pdf.addImage(dataUrl, 'PNG', xPos, yPos, imgWidth, imgHeight);

      const { nome, apto } = _getFormData();
      const filename = _sanitizeFilename(`comprovante-${nome || 'morador'}-${apto || 'apto'}.pdf`);
      pdf.save(filename);

      App.showToast('Comprovante exportado em PDF! ✅', 'success');
    } catch (err) {
      console.error('[Comprovante] Erro ao exportar PDF:', err);
      App.showToast('Erro ao gerar PDF. Tente novamente.', 'error');
    } finally {
      _setBtnLoading(btn, false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  function _downloadFile(dataUrl, filename) {
    const link = document.createElement('a');
    link.href     = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function _sanitizeFilename(name) {
    return name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-zA-Z0-9.\-_]/g, '-')
      .toLowerCase();
  }

  function _setBtnLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = `<div class="spinner"></div> Gerando...`;
    } else {
      btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    }
  }

  // ── Expose ─────────────────────────────────────────────────
  return { init };
})();
