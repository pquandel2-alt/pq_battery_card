// =====================================================================
//  Battery Card v1.0.0
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

  setConfig(config) {
    if (!config) throw new Error('Keine Konfiguration');
    this._config = {
      title: 'Batterien',
      show_header: true,
      show_bar: true,
      auto_add: true,
      columns: 1,
      sort: 'asc',
      max_height: 0,
      min_level_filter: null,
      border_radius: 16,
      icon_size: 22,
      entities: [],
      exclude: [],
      ...config,
    };
    delete this._lastKey;
  }

  set hass(hass) { this._hass = hass; this._render(); }

  _getBatteries() {
    if (!this._hass) return [];

    const excluded = this._config.exclude || [];
    const entityIds = this._config.auto_add
      ? getAllBatteryEntities(this._hass).filter(id => !excluded.includes(id))
      : (this._config.entities || []).map(e => typeof e === 'string' ? e : e.entity).filter(Boolean);

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

    // Filter unter bestimmtem Level
    const minFilter = this._config.min_level_filter;
    const filtered = batteries.filter(b => {
      if (b.unavailable || b.level === null) return true;
      if (minFilter !== null && minFilter !== '' && minFilter !== undefined) {
        return b.level <= parseFloat(minFilter);
      }
      return true;
    });

    // Sortierung
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
    return { auto_add: true, show_header: true, columns: 1, sort: 'asc', title: 'Batterien' };
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
              ${critical > 0 ? `⚠ ${critical} kritisch` : `${total} Geräte`}
            </span>
          </div>
        ` : ''}
        ${batteries.length === 0
          ? `<div class="empty">Keine Batterie-Entitäten gefunden</div>`
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
                      ${b.unavailable ? '–' : b.level !== null ? `${b.level}%` : '?'}
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
    this._config = {};
    this._rendered = false;
  }

  setConfig(config) {
    this._config = {
      title: 'Batterien', show_header: true, show_bar: true,
      auto_add: true, columns: 1, sort: 'asc',
      max_height: 0, min_level_filter: null,
      border_radius: 16, icon_size: 22, entities: [], exclude: [],
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
    else this._renderEntityList();
  }

  _emit() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config }, bubbles: true, composed: true,
    }));
  }

  // ---- Hilfsfunktion: Batterie-Zeile bauen ----
  _buildRow(entityId, actionIcon, actionTitle, actionColor, onAction) {
    const st    = this._hass?.states[entityId];
    const fn    = st?.attributes.friendly_name || entityId;
    const level = parseFloat(st?.state);
    const color = getBatteryColor(isNaN(level) ? null : level);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:var(--secondary-background-color,#f5f5f5);';

    const ic = document.createElement('ha-icon');
    ic.icon = getBatteryIcon(isNaN(level) ? null : level);
    ic.style.cssText = `--mdc-icon-size:18px;color:${color};flex-shrink:0;`;

    const name = document.createElement('span');
    name.textContent = fn;
    name.style.cssText = 'flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    const lvl = document.createElement('span');
    lvl.textContent = isNaN(level) ? '?' : `${Math.round(level)}%`;
    lvl.style.cssText = `font-size:12px;font-weight:600;color:${color};min-width:32px;text-align:right;`;

    const btn = document.createElement('button');
    btn.textContent = actionIcon;
    btn.title = actionTitle;
    btn.style.cssText = `background:none;border:none;cursor:pointer;color:${actionColor};font-size:17px;padding:0 3px;line-height:1;flex-shrink:0;`;
    btn.addEventListener('click', onAction);

    row.appendChild(ic);
    row.appendChild(name);
    row.appendChild(lvl);
    row.appendChild(btn);
    return row;
  }

  _renderEntityList() {
    const root = this.shadowRoot;
    const list = root.getElementById('entityList');
    if (!list) return;
    list.innerHTML = '';

    if (this._config.auto_add) {
      // AUTO-MODUS: alle erkannten Batterien zeigen, ausgeschlossene separat
      const allBatteries = this._hass ? getAllBatteryEntities(this._hass) : [];
      const excluded = this._config.exclude || [];
      const visible  = allBatteries.filter(id => !excluded.includes(id));
      const hidden   = allBatteries.filter(id =>  excluded.includes(id));

      if (allBatteries.length === 0) {
        list.innerHTML = '<div style="font-size:11px;color:var(--secondary-text-color,#888);">Keine Batterie-Sensoren gefunden.</div>';
        return;
      }

      // Aktive Geräte
      const visLabel = document.createElement('div');
      visLabel.style.cssText = 'font-size:11px;font-weight:600;color:var(--secondary-text-color,#727272);margin-bottom:4px;';
      visLabel.textContent = `Sichtbar (${visible.length})`;
      list.appendChild(visLabel);

      if (visible.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:11px;color:var(--secondary-text-color,#aaa);padding:4px 0;';
        empty.textContent = 'Alle ausgeblendet.';
        list.appendChild(empty);
      }
      visible.forEach(id => {
        list.appendChild(this._buildRow(id, '×', 'Ausblenden', 'var(--error-color,#f44336)', () => {
          this._config = { ...this._config, exclude: [...(this._config.exclude || []), id] };
          this._emit();
          this._renderEntityList();
        }));
      });

      // Ausgeblendete Geräte
      if (hidden.length > 0) {
        const hidLabel = document.createElement('div');
        hidLabel.style.cssText = 'font-size:11px;font-weight:600;color:var(--secondary-text-color,#727272);margin:10px 0 4px;';
        hidLabel.textContent = `Ausgeblendet (${hidden.length})`;
        list.appendChild(hidLabel);

        hidden.forEach(id => {
          list.appendChild(this._buildRow(id, '↩', 'Wieder einblenden', 'var(--primary-color,#03a9f4)', () => {
            this._config = { ...this._config, exclude: (this._config.exclude || []).filter(e => e !== id) };
            this._emit();
            this._renderEntityList();
          }));
        });
      }

    } else {
      // MANUELLER MODUS: nur hinzugefügte Entitäten zeigen
      if (this._config.entities.length === 0) {
        list.innerHTML = '<div style="font-size:11px;color:var(--secondary-text-color,#888);">Noch keine Entitäten hinzugefügt.</div>';
        return;
      }
      this._config.entities.forEach((raw, i) => {
        const entityId = typeof raw === 'string' ? raw : raw.entity;
        list.appendChild(this._buildRow(entityId, '×', 'Entfernen', 'var(--error-color,#f44336)', () => {
          const ents = [...this._config.entities];
          ents.splice(i, 1);
          this._config = { ...this._config, entities: ents };
          this._emit();
          this._renderEntityList();
        }));
      });
    }
  }

  _buildBatteryPicker(container) {
    container.innerHTML = '';
    const hass = this._hass;
    const batteryEntities = hass
      ? Object.keys(hass.states)
          .filter(id => hass.states[id]?.attributes?.device_class === 'battery'
            && !this._config.entities.some(e => (typeof e === 'string' ? e : e.entity) === id))
          .sort((a, b) => parseFloat(hass.states[a].state) - parseFloat(hass.states[b].state))
      : [];

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;margin-top:8px;';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;border:1px dashed var(--divider-color,#ccc);border-radius:8px;background:var(--card-background-color,#fff);padding:6px 10px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `+ Batterie-Sensor hinzufügen… (${batteryEntities.length} verfügbar)`;
    input.style.cssText = 'flex:1;border:none;outline:none;background:transparent;color:var(--primary-text-color,#212121);font-size:13px;';
    row.appendChild(input);

    const dropdown = document.createElement('div');
    dropdown.style.cssText = 'position:absolute;top:100%;left:0;right:0;max-height:220px;overflow-y:auto;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#e0e0e0);border-radius:8px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.15);display:none;margin-top:2px;';

    const showDropdown = (filter = '') => {
      dropdown.innerHTML = '';
      const lower = filter.toLowerCase().trim();
      const filtered = batteryEntities.filter(e => {
        const fn = (hass?.states[e]?.attributes.friendly_name || '').toLowerCase();
        return !lower || fn.includes(lower) || e.toLowerCase().includes(lower);
      });
      if (filtered.length === 0) {
        dropdown.innerHTML = '<div style="padding:10px;font-size:12px;color:#888;">Keine weiteren Batterie-Sensoren.</div>';
        dropdown.style.display = 'block';
        return;
      }
      filtered.forEach(e => {
        const fn    = hass?.states[e]?.attributes.friendly_name || '';
        const level = parseFloat(hass?.states[e]?.state);
        const color = getBatteryColor(isNaN(level) ? null : level);
        const item  = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:7px 10px;cursor:pointer;border-bottom:1px solid var(--divider-color,#f0f0f0);';

        const ic = document.createElement('ha-icon');
        ic.icon = getBatteryIcon(isNaN(level) ? null : level);
        ic.style.cssText = `--mdc-icon-size:18px;color:${color};flex-shrink:0;`;

        const txt = document.createElement('div');
        txt.style.cssText = 'flex:1;min-width:0;';
        txt.innerHTML = `<div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${fn||e}</div><div style="font-size:10px;color:var(--secondary-text-color,#727272)">${e}</div>`;

        const lvl = document.createElement('span');
        lvl.textContent = isNaN(level) ? '?' : `${Math.round(level)}%`;
        lvl.style.cssText = `font-size:12px;font-weight:600;color:${color};`;

        item.appendChild(ic); item.appendChild(txt); item.appendChild(lvl);
        item.addEventListener('mousedown', ev => {
          ev.preventDefault();
          input.value = '';
          dropdown.style.display = 'none';
          this._config = { ...this._config, entities: [...this._config.entities, { entity: e }] };
          this._emit();
          this._renderEntityList();
          this._buildBatteryPicker(container);
        });
        item.addEventListener('mouseover', () => item.style.background = 'var(--secondary-background-color,#f5f5f5)');
        item.addEventListener('mouseout',  () => item.style.background = '');
        dropdown.appendChild(item);
      });
      dropdown.style.display = 'block';
    };

    input.addEventListener('focus', () => showDropdown(input.value));
    input.addEventListener('input', () => showDropdown(input.value));
    input.addEventListener('blur',  () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));

    wrapper.appendChild(row);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);
  }

  _render() {
    this._rendered = true;
    const root = this.shadowRoot;
    const c = this._config;

    root.innerHTML = `
      <style>
        .editor{display:flex;flex-direction:column;gap:14px;padding:8px 0;}
        .field{display:flex;flex-direction:column;gap:5px;}
        .row{display:flex;gap:12px;} .row .field{flex:1;}
        label{font-size:13px;font-weight:500;color:var(--primary-text-color,#212121);}
        .hint{font-size:11px;color:var(--secondary-text-color,#727272);}
        input[type=text],input[type=number],select{
          padding:9px 11px;border-radius:8px;border:1px solid var(--divider-color,#e0e0e0);
          background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121);
          font-size:13px;outline:none;box-sizing:border-box;width:100%;}
        input[type=text]:focus,input[type=number]:focus,select:focus{border-color:var(--primary-color,#03a9f4);}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:4px 0;}
        .toggle-row label{flex:1;}
        .section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;
          color:var(--secondary-text-color,#727272);margin-top:6px;
          border-bottom:1px solid var(--divider-color,#e0e0e0);padding-bottom:4px;}
        #entityList{display:flex;flex-direction:column;gap:5px;}
        #pickerContainer{}
      </style>
      <div class="editor">

        <div class="section">Entitäten</div>
        <div class="toggle-row">
          <label>Alle Batterien automatisch erkennen</label>
          <input type="checkbox" id="auto_add" ${c.auto_add ? 'checked' : ''} />
        </div>
        <div class="hint" id="modeHint">
          ${c.auto_add
            ? 'Alle Sensoren mit device_class: battery werden automatisch angezeigt. Einzelne können ausgeblendet werden.'
            : 'Nur manuell hinzugefügte Sensoren werden angezeigt.'}
        </div>
        <div id="entityList"></div>
        <div id="pickerContainer"></div>

        <div class="section">Filter & Sortierung</div>
        <div class="row">
          <div class="field">
            <label>Nur anzeigen unter (%)</label>
            <input type="number" id="min_level_filter" value="${c.min_level_filter ?? ''}" min="0" max="100" placeholder="Alle anzeigen" />
          </div>
          <div class="field">
            <label>Sortierung</label>
            <select id="sort">
              <option value="asc"  ${c.sort==='asc'  ?'selected':''}>Niedrigster zuerst</option>
              <option value="desc" ${c.sort==='desc' ?'selected':''}>Höchster zuerst</option>
              <option value="name" ${c.sort==='name' ?'selected':''}>Alphabetisch</option>
            </select>
          </div>
        </div>

        <div class="section">Darstellung</div>
        <div class="toggle-row">
          <label>Kopfzeile anzeigen (Titel + Zähler)</label>
          <input type="checkbox" id="show_header" ${c.show_header ? 'checked' : ''} />
        </div>
        <div id="titleField" style="${c.show_header ? '' : 'display:none'}">
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
              <option value="1" ${c.columns===1?'selected':''}>1 Spalte</option>
              <option value="2" ${c.columns===2?'selected':''}>2 Spalten</option>
              <option value="3" ${c.columns===3?'selected':''}>3 Spalten</option>
            </select>
          </div>
          <div class="field">
            <label>Max. Höhe (px, 0 = unbegrenzt)</label>
            <input type="number" id="max_height" value="${c.max_height || 0}" min="0" step="10" />
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Eckenradius (px)</label>
            <input type="number" id="border_radius" value="${c.border_radius}" min="0" max="40" />
          </div>
          <div class="field">
            <label>Icon-Größe (px)</label>
            <input type="number" id="icon_size" value="${c.icon_size}" min="14" max="40" />
          </div>
        </div>

      </div>
    `;

    this._renderEntityList();
    if (!c.auto_add) this._buildBatteryPicker(root.getElementById('pickerContainer'));

    root.getElementById('auto_add').addEventListener('change', e => {
      this._config = { ...this._config, auto_add: e.target.checked };
      this._emit();
      root.getElementById('modeHint').textContent = e.target.checked
        ? 'Alle Sensoren mit device_class: battery werden automatisch angezeigt. Einzelne können ausgeblendet werden.'
        : 'Nur manuell hinzugefügte Sensoren werden angezeigt.';
      root.getElementById('pickerContainer').innerHTML = '';
      if (!e.target.checked) this._buildBatteryPicker(root.getElementById('pickerContainer'));
      this._renderEntityList();
    });

    root.getElementById('show_header').addEventListener('change', e => {
      this._config = { ...this._config, show_header: e.target.checked };
      this._emit();
      root.getElementById('titleField').style.display = e.target.checked ? '' : 'none';
    });

    root.getElementById('title')?.addEventListener('change', e => {
      this._config = { ...this._config, title: e.target.value }; this._emit();
    });
    root.getElementById('show_bar').addEventListener('change', e => {
      this._config = { ...this._config, show_bar: e.target.checked }; this._emit();
    });
    root.getElementById('sort').addEventListener('change', e => {
      this._config = { ...this._config, sort: e.target.value }; this._emit();
    });
    root.getElementById('columns').addEventListener('change', e => {
      this._config = { ...this._config, columns: parseInt(e.target.value) }; this._emit();
    });
    [['border_radius', parseInt], ['icon_size', parseInt], ['max_height', parseInt]].forEach(([id, fn]) => {
      root.getElementById(id)?.addEventListener('change', e => {
        this._config = { ...this._config, [id]: fn(e.target.value) }; this._emit();
      });
    });
    root.getElementById('min_level_filter')?.addEventListener('change', e => {
      const v = e.target.value.trim();
      const cfg = { ...this._config };
      cfg.min_level_filter = v === '' ? null : parseFloat(v);
      this._config = cfg; this._emit();
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
