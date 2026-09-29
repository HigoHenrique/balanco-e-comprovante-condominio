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
  }
};
