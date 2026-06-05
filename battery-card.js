// @ts-check
// =====================================================================
//  Battery Card v1.0.4
// =====================================================================

function getBatteryIcon(level) {
  if (level === null || level === undefined) return 'mdi:battery-unknown';
  if (level <= 0)  return 'mdi:battery-outline';
  if (level < 15)  return 'mdi:battery-alert';
  if (level < 25)  return 'mdi:battery-10';
  if (level < 35)  return 'mdi:battery-20';
  if (level < 45)  return 'mdi:battery-30';
  if (level < 55)  return 'mdi:battery-40';
  if (level < 65)  return 'mdi:battery-50';
  if (level < 75)  return 'mdi:battery-60';
  if (level < 85)  return 'mdi:battery-70';
  if (level < 95)  return 'mdi:battery-80';
  if (level < 100) return 'mdi:battery-90';
  return 'mdi:battery';
}

function getBatteryColor(level) {
  if (level === null) return 'rgba(255,255,255,0.35)';
  if (level <= 20)    return '#F44336';
  if (level <= 40)    return '#FF9800';
  if (level <= 60)    return '#FFC107';
  return '#4CAF50';
}

function getAllBatteryEntities(hass) {
  return Object.keys(hass.states)
    .filter(id => hass.states[id]?.attributes?.device_class === 'battery');
}

// =====================================================================
//  Haupt-Card
// =====================================================================
class BatteryCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._lastKey = null;
  }

  /** @param {LovelaceCardConfig} config */
  setConfig(config) {
    if (!config) throw new Error('Keine Konfiguration');
    this._config = {
      title: 'Batterien',
      show_header: true,
      show_bar: true,
      columns: 1,
      sort: 'asc',
      max_height: 0,
      min_level_filter: null,
      border_radius: 16,
      icon_size: 22,
      ...config,
    };
    // Sicherstellen dass entities immer ein Array ist
    if (!Array.isArray(this._config.entities)) this._config.entities = [];
    delete this._lastKey;
  }

  /** @param {HomeAssistant} hass */
  /** @param {HomeAssistant} hass */
  set hass(hass) { this._hass = hass; this._render(); }

  _getBatteries() {
    if (!this._hass) return [];

    // Rückwärtskompatibilität: auto_add:true ohne entities → alle erkennen
    let entityIds;
    if (this._config.auto_add && this._config.entities.length === 0) {
      entityIds = getAllBatteryEntities(this._hass);
    } else {
      entityIds = this._config.entities
        .map(e => (typeof e === 'string' ? e : e?.entity))
        .filter(Boolean);
    }

    const batteries = entityIds.map(id => {
      const st = this._hass.states[id];
      if (!st) return null;
      const raw   = parseFloat(st.state);
      const level = isNaN(raw) ? null : Math.min(100, Math.max(0, Math.round(raw)));
      return {
        id,
        name: st.attributes.friendly_name || id,
        level,
        unavailable: st.state === 'unavailable' || st.state === 'unknown',
      };
    }).filter(Boolean);

    const minFilter = this._config.min_level_filter;
    const filtered = batteries.filter(b => {
      if (b.unavailable || b.level === null) return true;
      if (minFilter !== null && minFilter !== '' && minFilter !== undefined) {
        return b.level <= parseFloat(minFilter);
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (this._config.sort === 'name') return a.name.localeCompare(b.name);
      const la = a.level ?? (this._config.sort === 'asc' ? 999 : -1);
      const lb = b.level ?? (this._config.sort === 'asc' ? 999 : -1);
      return this._config.sort === 'desc' ? lb - la : la - lb;
    });
  }

  getCardSize() {
    const rows = Math.ceil(this._getBatteries().length / (this._config.columns || 1));
    return Math.max(2, Math.ceil(rows * 0.7) + 1);
  }

  static getConfigElement() { return document.createElement('battery-card-editor'); }
  static getStubConfig() {
    return { entities: [], show_header: true, columns: 1, sort: 'asc', title: 'Batterien' };
  }

  _render() {
    if (!this._hass) return;

    const batteries = this._getBatteries();
    const critical  = batteries.filter(b => !b.unavailable && b.level !== null && b.level <= 20).length;
    const total     = batteries.length;

    const key = batteries.map(b => `${b.id}:${b.level}`).join('|') + JSON.stringify(this._config);
    if (key === this._lastKey) return;
    this._lastKey = key;

    const br   = this._config.border_radius;
    const cols = Math.max(1, this._config.columns || 1);
    const maxH = this._config.max_height;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; box-sizing: border-box; }
        .card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: ${br}px;
          padding: 14px;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.3px;
        }
        .badge {
          font-size: 11px;
          padding: 2px 9px;
          border-radius: 10px;
          font-weight: 500;
        }
        .badge-critical {
          background: rgba(244,67,54,0.18);
          color: #F44336;
          border: 1px solid rgba(244,67,54,0.35);
        }
        .badge-ok {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.45);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: 6px;
          ${maxH ? `max-height:${maxH}px; overflow-y:auto; padding-right:2px;` : ''}
        }
        .battery-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 8px;
          border-radius: ${Math.max(6, br - 8)}px;
          background: rgba(255,255,255,0.03);
          transition: background 0.2s;
        }
        .battery-row:hover { background: rgba(255,255,255,0.07); }
        .unavailable { opacity: 0.4; }
        ha-icon {
          --mdc-icon-size: ${this._config.icon_size}px;
          flex-shrink: 0;
          transition: color 0.3s;
        }
        .info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .name {
          font-size: 12px;
          color: rgba(255,255,255,0.75);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1;
        }
        .bar-bg {
          height: 3px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.6s ease, background-color 0.3s ease;
        }
        .level {
          font-size: 12px;
          font-weight: 600;
          min-width: 36px;
          text-align: right;
          flex-shrink: 0;
          line-height: 1;
        }
        .empty {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          padding: 16px 0;
        }
      </style>
      <div class="card">
        ${this._config.show_header ? `
          <div class="header">
            <span class="title">${this._config.title || 'Batterien'}</span>
            <span class="badge ${critical > 0 ? 'badge-critical' : 'badge-ok'}">
              ${critical > 0 ? `&#9888; ${critical} kritisch` : `${total} Ger&auml;te`}
            </span>
          </div>
        ` : ''}
        ${batteries.length === 0
          ? `<div class="empty">Keine Batterie-Entit&auml;ten konfiguriert</div>`
          : `<div class="grid">
              ${batteries.map(b => {
                const color = getBatteryColor(b.level);
                const icon  = getBatteryIcon(b.level);
                return `
                  <div class="battery-row ${b.unavailable ? 'unavailable' : ''}">
                    <ha-icon icon="${icon}" style="color:${color};
                      ${b.level !== null && b.level <= 20 ? `filter:drop-shadow(0 0 4px ${color}88);` : ''}">
                    </ha-icon>
                    <div class="info">
                      <span class="name" title="${b.name}">${b.name}</span>
                      ${this._config.show_bar && b.level !== null ? `
                        <div class="bar-bg">
                          <div class="bar-fill" style="width:${b.level}%; background:${color};"></div>
                        </div>
                      ` : ''}
                    </div>
                    <span class="level" style="color:${color};">
                      ${b.unavailable ? '&ndash;' : b.level !== null ? `${b.level}%` : '?'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>`
        }
      </div>
    `;
  }
}

customElements.define('battery-card', BatteryCard);

// =====================================================================
//  Visueller Editor
// =====================================================================
class BatteryCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = { entities: [] };
    this._hass = null;
    this._rendered = false;
  }

  /** @param {LovelaceCardConfig} config */
  setConfig(config) {
    this._config = { entities: [], ...config };
    if (!Array.isArray(this._config.entities)) this._config.entities = [];
    if (this._rendered) {
      this._updateEntityList();
      this._updatePicker();
    } else {
      this._render();
    }
  }

  /** @param {HomeAssistant} hass */
  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._render();
    } else {
      this._updateEntityList();
      this._updatePicker();
    }
  }

  _emit() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: { ...this._config } },
      bubbles: true,
      composed: true,
    }));
  }

  _getEntities() {
    return (this._config.entities || [])
      .map(e => (typeof e === 'string' ? e : e?.entity))
      .filter(Boolean);
  }

  _updateEntityList() {
    const list = this.shadowRoot.getElementById('entityList');
    if (!list) return;
    list.innerHTML = '';

    const entities = this._getEntities();
    if (entities.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:var(--secondary-text-color,#888);padding:4px 0;';
      empty.textContent = 'Noch keine Geräte hinzugefügt.';
      list.appendChild(empty);
      return;
    }

    entities.forEach((entityId, i) => {
      const st    = this._hass?.states[entityId];
      const fn    = st?.attributes?.friendly_name || entityId;
      const raw   = parseFloat(st?.state);
      const level = isNaN(raw) ? null : Math.round(raw);
      const color = getBatteryColor(level);

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:var(--secondary-background-color,#f5f5f5);margin-bottom:4px;';

      const ic = document.createElement('ha-icon');
      ic.setAttribute('icon', getBatteryIcon(level));
      ic.style.cssText = `--mdc-icon-size:18px;color:${color};flex-shrink:0;`;

      const nameEl = document.createElement('span');
      nameEl.textContent = fn;
      nameEl.style.cssText = 'flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

      const lvlEl = document.createElement('span');
      lvlEl.textContent = level !== null ? `${level}%` : '?';
      lvlEl.style.cssText = `font-size:12px;font-weight:600;color:${color};min-width:32px;text-align:right;flex-shrink:0;`;

      const btn = document.createElement('button');
      btn.textContent = '×';
      btn.title = 'Entfernen';
      btn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--error-color,#f44336);font-size:18px;padding:0 2px;line-height:1;flex-shrink:0;';
      btn.addEventListener('click', () => {
        const ents = this._getEntities();
        ents.splice(i, 1);
        this._config = { ...this._config, entities: ents };
        this._emit();
        this._updateEntityList();
        this._updatePicker();
      });

      row.appendChild(ic);
      row.appendChild(nameEl);
      row.appendChild(lvlEl);
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  _updatePicker() {
    const container = this.shadowRoot.getElementById('pickerContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!this._hass) return;

    const current = this._getEntities();
    const available = getAllBatteryEntities(this._hass)
      .filter(id => !current.includes(id))
      .sort((a, b) => {
        const la = parseFloat(this._hass.states[a]?.state);
        const lb = parseFloat(this._hass.states[b]?.state);
        return (isNaN(la) ? 999 : la) - (isNaN(lb) ? 999 : lb);
      });

    const picker = /** @type {HaEntityPicker} */ (document.createElement('ha-entity-picker'));
    picker.hass = this._hass;
    picker.value = '';
    picker.setAttribute('allow-custom-entity', '');
    picker.style.cssText = 'display:block;width:100%;';
    picker.entityFilter = stateObj =>
      stateObj.attributes.device_class === 'battery' && !current.includes(stateObj.entity_id);
    picker.addEventListener('value-changed', e => {
      const id = (/** @type {CustomEvent} */ (e)).detail.value;
      if (!id) return;
      picker.value = '';
      this._config = { ...this._config, entities: [...this._getEntities(), id] };
      this._emit();
      this._updateEntityList();
      this._updatePicker();
    });
    container.appendChild(picker);
  }

  _render() {
    this._rendered = true;
    const root = this.shadowRoot;
    const c = this._config;

    root.innerHTML = `
      <style>
        .editor { display:flex; flex-direction:column; gap:14px; padding:8px 0; }
        .section { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px;
          color:var(--secondary-text-color,#727272); margin-top:6px;
          border-bottom:1px solid var(--divider-color,#e0e0e0); padding-bottom:4px; }
        .field { display:flex; flex-direction:column; gap:5px; }
        .row { display:flex; gap:12px; }
        .row .field { flex:1; }
        label { font-size:13px; font-weight:500; color:var(--primary-text-color,#212121); }
        .hint { font-size:11px; color:var(--secondary-text-color,#727272); }
        input[type=text], input[type=number], select {
          padding:9px 11px; border-radius:8px; border:1px solid var(--divider-color,#e0e0e0);
          background:var(--card-background-color,#fff); color:var(--primary-text-color,#212121);
          font-size:13px; outline:none; box-sizing:border-box; width:100%; }
        input[type=text]:focus, input[type=number]:focus, select:focus {
          border-color:var(--primary-color,#03a9f4); }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:4px 0; }
        .toggle-row label { flex:1; }
        .load-btn {
          width:100%; padding:9px 14px; border-radius:8px; border:none; cursor:pointer;
          background:var(--primary-color,#03a9f4); color:#fff; font-size:13px; font-weight:500;
          text-align:left; display:flex; align-items:center; gap:8px; }
        .load-btn:hover { opacity:0.9; }
        #entityList { display:flex; flex-direction:column; }
        #pickerContainer { margin-top:4px; }
      </style>
      <div class="editor">

        <div class="section">Ger&auml;te</div>

        <button class="load-btn" id="loadAllBtn">
          <ha-icon icon="mdi:battery-sync" style="--mdc-icon-size:18px;"></ha-icon>
          <span id="loadAllLabel">Alle Batterien automatisch laden</span>
        </button>
        <div class="hint">L&auml;dt alle Sensoren mit device_class: battery in die Liste.</div>

        <div id="entityList"></div>
        <div id="pickerContainer"></div>

        <div class="section">Filter &amp; Sortierung</div>
        <div class="row">
          <div class="field">
            <label>Nur anzeigen unter (%)</label>
            <input type="number" id="min_level_filter" value="${c.min_level_filter ?? ''}" min="0" max="100" placeholder="Alle anzeigen" />
          </div>
          <div class="field">
            <label>Sortierung</label>
            <select id="sort">
              <option value="asc"  ${(c.sort||'asc')==='asc'  ?'selected':''}>Niedrigster zuerst</option>
              <option value="desc" ${(c.sort||'asc')==='desc' ?'selected':''}>H&ouml;chster zuerst</option>
              <option value="name" ${(c.sort||'asc')==='name' ?'selected':''}>Alphabetisch</option>
            </select>
          </div>
        </div>

        <div class="section">Darstellung</div>
        <div class="toggle-row">
          <label>Kopfzeile anzeigen (Titel + Z&auml;hler)</label>
          <input type="checkbox" id="show_header" ${c.show_header !== false ? 'checked' : ''} />
        </div>
        <div id="titleField" style="${c.show_header !== false ? '' : 'display:none'}">
          <div class="field" style="margin-top:4px;">
            <label>Titel</label>
            <input type="text" id="title" value="${c.title || 'Batterien'}" placeholder="Batterien" />
          </div>
        </div>
        <div class="toggle-row">
          <label>Ladebalken anzeigen</label>
          <input type="checkbox" id="show_bar" ${c.show_bar !== false ? 'checked' : ''} />
        </div>
        <div class="row">
          <div class="field">
            <label>Spalten</label>
            <select id="columns">
              <option value="1" ${(c.columns||1)===1?'selected':''}>1 Spalte</option>
              <option value="2" ${(c.columns||1)===2?'selected':''}>2 Spalten</option>
              <option value="3" ${(c.columns||1)===3?'selected':''}>3 Spalten</option>
            </select>
          </div>
          <div class="field">
            <label>Max. H&ouml;he (px, 0 = unbegrenzt)</label>
            <input type="number" id="max_height" value="${c.max_height || 0}" min="0" step="10" />
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Eckenradius (px)</label>
            <input type="number" id="border_radius" value="${c.border_radius ?? 16}" min="0" max="40" />
          </div>
          <div class="field">
            <label>Icon-Gr&ouml;&szlig;e (px)</label>
            <input type="number" id="icon_size" value="${c.icon_size ?? 22}" min="14" max="40" />
          </div>
        </div>

      </div>
    `;

    this._updateEntityList();
    this._updatePicker();

    // "Alle laden"-Button
    root.getElementById('loadAllBtn').addEventListener('click', () => {
      if (!this._hass) return;
      const allIds = getAllBatteryEntities(this._hass);
      this._config = { ...this._config, entities: allIds, auto_add: false };
      this._emit();
      this._updateEntityList();
      this._updatePicker();
    });

    root.getElementById('show_header').addEventListener('change', e => {
      this._config = { ...this._config, show_header: (/** @type {HTMLInputElement} */ (e.target)).checked };
      this._emit();
      root.getElementById('titleField').style.display = (/** @type {HTMLInputElement} */ (e.target)).checked ? '' : 'none';
    });
    root.getElementById('title').addEventListener('change', e => {
      this._config = { ...this._config, title: (/** @type {HTMLInputElement} */ (e.target)).value };
      this._emit();
    });
    root.getElementById('show_bar').addEventListener('change', e => {
      this._config = { ...this._config, show_bar: (/** @type {HTMLInputElement} */ (e.target)).checked };
      this._emit();
    });
    root.getElementById('sort').addEventListener('change', e => {
      this._config = { ...this._config, sort: (/** @type {HTMLInputElement} */ (e.target)).value };
      this._emit();
    });
    root.getElementById('columns').addEventListener('change', e => {
      this._config = { ...this._config, columns: parseInt((/** @type {HTMLInputElement} */ (e.target)).value) };
      this._emit();
    });
    root.getElementById('max_height').addEventListener('change', e => {
      this._config = { ...this._config, max_height: parseInt((/** @type {HTMLInputElement} */ (e.target)).value) || 0 };
      this._emit();
    });
    root.getElementById('border_radius').addEventListener('change', e => {
      this._config = { ...this._config, border_radius: parseInt((/** @type {HTMLInputElement} */ (e.target)).value) };
      this._emit();
    });
    root.getElementById('icon_size').addEventListener('change', e => {
      this._config = { ...this._config, icon_size: parseInt((/** @type {HTMLInputElement} */ (e.target)).value) };
      this._emit();
    });
    root.getElementById('min_level_filter').addEventListener('change', e => {
      const v = (/** @type {HTMLInputElement} */ (e.target)).value.trim();
      this._config = { ...this._config, min_level_filter: v === '' ? null : parseFloat(v) };
      this._emit();
    });
  }
}

customElements.define('battery-card-editor', BatteryCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'battery-card',
  name: 'Battery Card',
  description: 'Zeigt alle Batterie-Sensoren auf einen Blick mit dynamischem Icon und Ladebalken',
  preview: true,
});
