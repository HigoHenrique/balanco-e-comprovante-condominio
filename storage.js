'use strict';

/**
 * Camada de abstração sobre localStorage.
 * Centraliza toda persistência de dados do app.
 */
const Storage = {
  KEYS: {
    LANCAMENTOS: 'cjp_lancamentos',
    CATEGORIAS_CUSTOM: 'cjp_categorias_custom',
  },

  /** Versão do formato de backup — incrementar em quebras de compatibilidade */
  BACKUP_VERSION: 1,

  /**
   * Salva um dado no localStorage como JSON.
   * @param {string} key
   * @param {*} data
   * @returns {boolean} sucesso
   */
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('[Storage] Erro ao salvar:', key, e);
      return false;
    }
  },

  /**
   * Carrega e faz parse de um dado do localStorage.
   * @param {string} key
   * @param {*} defaultValue valor retornado se não existir
   * @returns {*}
   */
  load(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.warn('[Storage] Erro ao carregar:', key, e);
      return defaultValue;
    }
  },

  /**
   * Remove um item do localStorage.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[Storage] Erro ao remover:', key, e);
    }
  },

  /**
   * Exporta todos os dados do app em um objeto JSON estruturado.
   * @returns {{ version: number, exportedAt: string, data: object }}
   */
  exportAll() {
    return {
      version: this.BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'cjp-gestao-condominial',
      data: {
        [this.KEYS.LANCAMENTOS]:      this.load(this.KEYS.LANCAMENTOS, []),
        [this.KEYS.CATEGORIAS_CUSTOM]: this.load(this.KEYS.CATEGORIAS_CUSTOM, []),
      },
    };
  },

  /**
   * Importa um backup previamente gerado por exportAll().
   * Sobrescreve os dados atuais após validação básica.
   * @param {{ version: number, app: string, data: object }} backup
   * @returns {{ ok: boolean, error?: string }}
   */
  importAll(backup) {
    if (!backup || typeof backup !== 'object') {
      return { ok: false, error: 'Arquivo inválido.' };
    }
    if (backup.app !== 'cjp-gestao-condominial') {
      return { ok: false, error: 'Este arquivo não é um backup deste sistema.' };
    }
    if (typeof backup.version !== 'number' || backup.version > this.BACKUP_VERSION) {
      return { ok: false, error: 'Versão do backup incompatível. Atualize o sistema.' };
    }
    if (!backup.data || typeof backup.data !== 'object') {
      return { ok: false, error: 'Estrutura de dados ausente no arquivo.' };
    }

    const lancamentos = backup.data[this.KEYS.LANCAMENTOS];
    const categoriasCustom = backup.data[this.KEYS.CATEGORIAS_CUSTOM];

    if (!Array.isArray(lancamentos) || !Array.isArray(categoriasCustom)) {
      return { ok: false, error: 'Dados corrompidos no arquivo de backup.' };
    }

    this.save(this.KEYS.LANCAMENTOS, lancamentos);
    this.save(this.KEYS.CATEGORIAS_CUSTOM, categoriasCustom);

    return { ok: true };
  }
};
