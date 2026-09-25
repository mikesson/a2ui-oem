/**
 * Apex Mobility "Aria" Assistant — A2UI (Agent-to-User Interface) v0.9.1 Reference Demo
 * Official Specification: https://a2ui.org/specification/v0.9.1-a2ui/
 * Public Open-Source Packages: @a2ui/web_core (0.9.2) & @a2ui/lit (0.9.3)
 */

(function () {
  "use strict";

  // ============================================================================
  // 1. GENERIC AUTOMOTIVE FLEET & DEALERSHIP DOMAIN CATALOG DATA
  // ============================================================================
  const VEHICLE_FLEET = {
    aero_gt: {
      id: "aero_gt",
      name: "Apex Aero GT Coupé",
      tagline: "All-Electric Performance SUV Coupé • Slate Blue Metallic",
      powertrain: "BEV • 85 kWh Dual-Motor AWD",
      powerKw: "250 kW (340 HP)",
      rangeWltp: "552 km WLTP",
      priceEur: 61900,
      imageUrl: "assets/aero_gt_ev.jpg",
      availableTrims: ["GT Performance 250 kW AWD", "Aero Sportline AWD", "Executive Touring 210 kW"]
    },
    urban_ev: {
      id: "urban_ev",
      name: "Apex Urban Crossover EV",
      tagline: "Compact All-Electric Urban SUV • Satin Titanium Silver",
      powertrain: "BEV • 77 kWh Rear-Wheel Drive",
      powerKw: "210 kW (286 HP)",
      rangeWltp: "580 km WLTP",
      priceEur: 43900,
      imageUrl: "assets/urban_crossover_ev.jpg",
      availableTrims: ["Urban Launch Edition 210 kW", "Urban Sportline RWD", "City Loft 150 kW"]
    },
    horizon_phev: {
      id: "horizon_phev",
      name: "Apex Horizon 7-Seater PHEV",
      tagline: "Spacious 7-Seater Family SUV • Champagne Bronze Metallic",
      powertrain: "Plug-in Hybrid • 25.7 kWh Battery + Turbo Hybrid",
      powerKw: "165 kW (224 HP)",
      rangeWltp: "125 km EV + 820 km Total",
      priceEur: 49800,
      imageUrl: "assets/horizon_suv_phev.jpg",
      availableTrims: ["Horizon Selection PHEV", "Horizon Sportline AWD", "Grand Family 7-Seat"]
    },
    touring_phev: {
      id: "touring_phev",
      name: "Apex Touring Estate PHEV",
      tagline: "Flagship Executive Touring Wagon • Pearl Glacier White",
      powertrain: "Plug-in Hybrid • 25.7 kWh DC Fast-Charge",
      powerKw: "165 kW (224 HP)",
      rangeWltp: "135 km Pure EV Range",
      priceEur: 52400,
      imageUrl: "assets/touring_estate_phev.jpg",
      availableTrims: ["Executive Lounge Combi PHEV", "Touring Sportline PHEV", "Long-Range AWD"]
    }
  };

  const DEALERSHIP_LOCATIONS = [
    { id: "downtown_hub", label: "Apex Flagship Experience Center — Downtown (2.4 km — 4 slots open)" },
    { id: "northside_ev", label: "Apex Northside EV & Performance Hub (4.1 km — GT & EV Specialist)" },
    { id: "westgate_center", label: "Apex Westgate Mobility Center (6.8 km — 6 slots open)" },
    { id: "airport_lounge", label: "Apex Airport Executive Test Drive Lounge (11.2 km — Express Fleet)" }
  ];

  // ============================================================================
  // 2. A2UI v0.9.1 CLIENT STATE, REAL @a2ui/web_core ENGINE & TURN TRACKER
  // ============================================================================
  const surfaces = new Map();
  const envelopeHistory = [];
  let activeSurfaceId = null;
  let currentTurn = 0;

  // Initialize the REAL Open-Source @a2ui/web_core v0.9 MessageProcessor + @a2ui/lit v0.9 basicCatalog
  let realA2uiProcessor = null;
  if (window.RealA2UI && window.RealA2UI.MessageProcessor && window.RealA2UI.basicCatalog) {
    try {
      const basicCat = window.RealA2UI.basicCatalog;
      const permissiveComponents = Array.from(basicCat.components.values()).map((compApi) => ({
        ...compApi,
        schema: {
          ...compApi.schema,
          safeParse: (props) => ({ success: true, data: props })
        }
      }));
      const modernSolidCat = new window.RealA2UI.Catalog(
        'https://apex-mobility.example.com/a2ui/v0_9/catalogs/automotive_retail.json',
        permissiveComponents,
        Array.from(basicCat.functions.values())
      );
      const ApexCat = new window.RealA2UI.Catalog(
        'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
        permissiveComponents,
        Array.from(basicCat.functions.values())
      );
      realA2uiProcessor = new window.RealA2UI.MessageProcessor([modernSolidCat, ApexCat, basicCat], (actionEvt) => {
        console.log('[Real @a2ui/web_core Action Dispatched]', actionEvt);
      });
      window.__realA2uiProcessor = realA2uiProcessor;
    } catch (err) {
      console.warn('[RealA2UI Init Warning]', err);
    }
  }

  // ============================================================================
  // 3. JSON POINTER & REACTIVE DATA BINDING ENGINE
  // ============================================================================
  function getByPointer(obj, pointer) {
    if (!pointer || pointer === '/') return obj;
    const clean = pointer.startsWith('/') ? pointer.slice(1) : pointer;
    const parts = clean.split('/');
    let cur = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function setByPointer(obj, pointer, value) {
    if (!pointer || pointer === '/') {
      Object.assign(obj, value);
      return;
    }
    const clean = pointer.startsWith('/') ? pointer.slice(1) : pointer;
    const parts = clean.split('/');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (cur[p] == null || typeof cur[p] !== 'object') {
        cur[p] = {};
      }
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function evaluateDynamic(val, surface) {
    if (val == null) return '';
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
    if (Array.isArray(val)) return val.map((item) => evaluateDynamic(item, surface));
    if (typeof val === 'object') {
      if (typeof val.path === 'string') {
        const resolved = getByPointer(surface.dataModel, val.path);
        return resolved !== undefined ? resolved : '';
      }
      if (typeof val.call === 'string') {
        return executeCatalogFunction(val.call, val.args || {}, surface);
      }
    }
    return val;
  }

  function executeCatalogFunction(fnName, rawArgs, surface) {
    switch (fnName) {
      case 'formatString': {
        const template = rawArgs.value || '';
        return template.replace(/\$\{([^}]+)\}/g, (_, expr) => {
          const trimmed = expr.trim();
          if (trimmed.startsWith('/')) {
            const v = getByPointer(surface.dataModel, trimmed);
            return v !== undefined && v !== null ? String(v) : '';
          }
          return trimmed;
        });
      }
      case 'formatCurrency': {
        const num = Number(evaluateDynamic(rawArgs.value, surface) || 0);
        const currency = rawArgs.currency || 'EUR';
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0
        }).format(num);
      }
      case 'required': {
        const v = evaluateDynamic(rawArgs.value, surface);
        if (v === null || v === undefined) return false;
        if (typeof v === 'string') return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'boolean') return v === true;
        return true;
      }
      case 'email': {
        const v = String(evaluateDynamic(rawArgs.value, surface) || '').trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      }
      case 'regex': {
        const v = String(evaluateDynamic(rawArgs.value, surface) || '').trim();
        const pattern = rawArgs.pattern || '.*';
        try {
          return new RegExp(pattern).test(v);
        } catch (e) {
          return false;
        }
      }
      case 'and': {
        const values = rawArgs.values || [];
        return values.every((item) => Boolean(evaluateDynamic(item, surface)));
      }
      default:
        return '';
    }
  }

  // ============================================================================
  // 4. A2UI v0.9.1 ENVELOPE PROCESSOR
  // ============================================================================
  function normalizeEnvelopeForStockLit(envelope) {
    const clone = JSON.parse(JSON.stringify(envelope));
    if (clone.createSurface) {
      clone.createSurface.catalogId = 'https://apex-mobility.example.com/a2ui/v0_9/catalogs/automotive_retail.json';
    }
    if (clone.updateComponents && Array.isArray(clone.updateComponents.components)) {
      const expanded = [];
      for (const comp of clone.updateComponents.components) {
        if (comp.component === 'VehicleComparisonGrid') {
          const cardIds = [];
          Object.values(VEHICLE_FLEET).forEach((veh) => {
            const cId = `stock_card_${veh.id}`;
            const colId = `stock_col_${veh.id}`;
            const imgId = `stock_img_${veh.id}`;
            const titleId = `stock_title_${veh.id}`;
            const specId = `stock_spec_${veh.id}`;
            cardIds.push(cId);
            expanded.push(
              { id: cId, component: 'Card', child: colId },
              { id: colId, component: 'Column', children: [imgId, titleId, specId] },
              { id: imgId, component: 'Image', url: veh.imageUrl, variant: 'mediumFeature' },
              { id: titleId, component: 'Text', text: `${veh.name} — €${veh.priceEur.toLocaleString('de-DE')}`, variant: 'h4' },
              { id: specId, component: 'Text', text: `${veh.powertrain} | ${veh.powerKw} | ${veh.rangeWltp}`, variant: 'caption' }
            );
          });
          expanded.push({
            id: comp.id,
            component: 'Column',
            children: cardIds
          });
        } else {
          if (comp.component === 'Text' && comp.variant === 'badge') {
            comp.variant = 'caption';
          }
          expanded.push(comp);
        }
      }
      clone.updateComponents.components = expanded;
    }
    return clone;
  }

  function processA2uiEnvelope(envelope, options = { animateMutation: false, mutationBannerText: '' }) {
    envelopeHistory.unshift({
      timestamp: new Date().toISOString().slice(11, 19),
      envelope
    });

    // Feed into REAL Open-Source @a2ui/web_core v0.9 MessageProcessor
    if (realA2uiProcessor) {
      try {
        if (envelope.createSurface && realA2uiProcessor.model.getSurface(envelope.createSurface.surfaceId)) {
          realA2uiProcessor.processMessages([{ deleteSurface: { surfaceId: envelope.createSurface.surfaceId } }]);
        }
        const normalizedForStock = normalizeEnvelopeForStockLit(envelope);
        realA2uiProcessor.processMessages([normalizedForStock]);
      } catch (sdkErr) {
        console.warn('[Real @a2ui/web_core schema notice]', sdkErr.message || sdkErr);
      }
    }

    if (envelope.createSurface) {
      const cs = envelope.createSurface;
      surfaces.set(cs.surfaceId, {
        surfaceId: cs.surfaceId,
        catalogId: cs.catalogId,
        theme: cs.theme || {},
        sendDataModel: Boolean(cs.sendDataModel),
        components: new Map(),
        dataModel: {},
        lastMutationNote: '',
        useStockLitSurface: false
      });
      activeSurfaceId = cs.surfaceId;
    } else if (envelope.updateComponents) {
      const uc = envelope.updateComponents;
      const surface = surfaces.get(uc.surfaceId);
      if (surface) {
        (uc.components || []).forEach((comp) => {
          surface.components.set(comp.id, comp);
        });
        activeSurfaceId = uc.surfaceId;
        renderSurfaceInDOM(surface, false);
      }
    } else if (envelope.updateDataModel) {
      const udm = envelope.updateDataModel;
      const surface = surfaces.get(udm.surfaceId);
      if (surface) {
        const targetPath = udm.path || '/';
        if (targetPath === '/' && typeof udm.value === 'object') {
          surface.dataModel = JSON.parse(JSON.stringify(udm.value));
        } else {
          setByPointer(surface.dataModel, targetPath, JSON.parse(JSON.stringify(udm.value)));
        }
        if (options.mutationBannerText) {
          surface.lastMutationNote = options.mutationBannerText;
        }
        activeSurfaceId = udm.surfaceId;
        renderSurfaceInDOM(surface, options.animateMutation);
      }
    }

    refreshBehindTheCurtainsUI();
  }

  // ============================================================================
  // 5. NATIVE A2UI RENDERER WITH X-RAY TAGS & BIDIRECTIONAL HIGHLIGHTING
  // ============================================================================
  function attachXrayAttributes(el, comp) {
    if (!el || !comp) return;
    el.setAttribute('data-a2ui-comp-id', comp.id);
    el.setAttribute('data-a2ui-comp-type', comp.component);

    const pathStr = comp.value && comp.value.path ? ` • ${comp.value.path}` : '';
    const pill = document.createElement('span');
    pill.className = 'xray-tag-pill';
    pill.textContent = `<${comp.component} id="${comp.id}"${pathStr}>`;
    el.appendChild(pill);
  }

  function renderSurfaceInDOM(surface, flashPulse) {
    const hostEl = document.getElementById(`a2ui-host-${surface.surfaceId}`);
    if (!hostEl) return;

    const rootComp = surface.components.get('root');
    if (!rootComp) return;

    hostEl.innerHTML = '';

    // Top A2UI Surface Metadata Bar + Real @a2ui/lit <a2ui-surface> Toggle
    const badgeBar = document.createElement('div');
    badgeBar.className = 'a2ui-surface-badge-bar';
    badgeBar.innerHTML = `
      <div class="surface-meta">
        <span class="a2ui-live-dot"></span>
        <span>A2UI v0.9 Surface: <strong>${surface.surfaceId}</strong></span>
        <span style="opacity:0.6;">|</span>
        <span>@a2ui/web_core + @a2ui/lit Active (${surface.components.size} nodes)</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="toggle-lit-btn" style="background:${
          surface.useStockLitSurface ? '#38bdf8' : 'rgba(120,250,174,0.16)'
        };border:1px solid #38bdf8;color:${
          surface.useStockLitSurface ? '#0f172a' : '#ffffff'
        };font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;cursor:pointer;transition:all 0.15s;">
          ${surface.useStockLitSurface ? '🎨 Switch Back to Apex Mobility Branded Catalog' : '🔬 Inspect Stock <a2ui-surface> Web Component'}
        </button>
      </div>
    `;
    const toggleBtn = badgeBar.querySelector('.toggle-lit-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        surface.useStockLitSurface = !surface.useStockLitSurface;
        renderSurfaceInDOM(surface, false);
      });
    }
    hostEl.appendChild(badgeBar);

    if (surface.useStockLitSurface && realA2uiProcessor) {
      const realSurfaceModel = realA2uiProcessor.model.getSurface(surface.surfaceId);
      if (realSurfaceModel) {
        const compMapSize =
          realSurfaceModel.componentsModel && realSurfaceModel.componentsModel.components
            ? realSurfaceModel.componentsModel.components.size
            : surface.components.size;
        const litWrapper = document.createElement('div');
        litWrapper.style.cssText = 'padding:18px;background:#f8fafc;border-top:3px solid #38bdf8;color:#0f172a;';
        const litNote = document.createElement('div');
        litNote.style.cssText = 'margin-bottom:14px;padding:10px 14px;background:#0f172a;color:#ffffff;border-radius:8px;font-size:12px;line-height:1.5;';
        litNote.innerHTML = `
          <div style="font-weight:700;color:#38bdf8;margin-bottom:4px;">🔬 Live Unstyled Open-Source <code>&lt;a2ui-surface&gt;</code> Web Component (<code>@a2ui/lit/v0_9</code>)</div>
          <div>Below is the <strong>raw, unstyled open-source reference Lit renderer</strong> rendering the exact same <code>SurfaceModel</code> (<code>${compMapSize}</code> components in <code>realA2uiProcessor.model</code>). Notice why A2UI separates the <strong>JSON Protocol</strong> from the <strong>Brand Catalog</strong>: the same JSON payload renders unstyled HTML primitives here, or Apex Mobility's Emerald/Electric Green Design System when switched back!</div>
        `;
        litWrapper.appendChild(litNote);

        const litCanvas = document.createElement('div');
        litCanvas.style.cssText = 'padding:16px;background:#ffffff;border:2px dashed #94a3b8;border-radius:10px;';
        const litSurfaceEl = document.createElement('a2ui-surface');
        litSurfaceEl.surface = realSurfaceModel;
        litCanvas.appendChild(litSurfaceEl);
        litWrapper.appendChild(litCanvas);
        hostEl.appendChild(litWrapper);
        return;
      }
    }

    const renderedRoot = renderComponentNode('root', surface);
    if (renderedRoot) {
      if (surface.lastMutationNote) {
        const banner = document.createElement('div');
        banner.className = 'a2ui-mutation-banner';
        banner.innerHTML = `
          <span>⚡ <strong>Live A2UI <code>updateDataModel</code> Applied In-Place:</strong> ${surface.lastMutationNote}</span>
          <span style="font-family:var(--font-mono);font-size:11px;">Zero Form Reload</span>
        `;
        renderedRoot.insertBefore(banner, renderedRoot.firstChild);
      }
      if (flashPulse && renderedRoot.classList) {
        renderedRoot.classList.add('flash-mutation');
      }
      hostEl.appendChild(renderedRoot);
    }
  }

  function notifyTwoWayBindingChange(surface, path, newValue, compId) {
    // Also update the real @a2ui/web_core SurfaceModel.dataModel so both stay 100% synchronized
    if (realA2uiProcessor) {
      try {
        const realSurf = realA2uiProcessor.model.getSurface(surface.surfaceId);
        if (realSurf && realSurf.dataModel) {
          realSurf.dataModel.set(path, newValue);
        }
      } catch (e) {
        // ignore
      }
    }
    const banner = document.getElementById('last-binding-change-banner');
    if (banner) {
      banner.style.display = 'block';
      banner.innerHTML = `⚡ <strong>2-Way Binding Sync (Left UI &rarr; Right Data Model):</strong> <code>${path}</code> = <code>${JSON.stringify(
        newValue
      )}</code>`;
    }
    updateBehindTheCurtainsPipeline(
      `Customer interacted with <${compId}> on Left UI`,
      `Two-Way Data Binding updated JSON path "${path}"`,
      `a2uiClientDataModel synced in @a2ui/web_core SurfaceModel`,
      `Client validation checks re-evaluated automatically`
    );
    refreshBehindTheCurtainsUI();
  }

  function renderComponentNode(compId, surface) {
    const comp = surface.components.get(compId);
    if (!comp) return null;

    let el = null;

    switch (comp.component) {
      case 'Card': {
        el = document.createElement('div');
        el.className = 'a2ui-card';
        if (comp.child) {
          const childEl = renderComponentNode(comp.child, surface);
          if (childEl) el.appendChild(childEl);
        }
        break;
      }

      case 'Column': {
        el = document.createElement('div');
        el.className = `a2ui-column ${comp.align ? 'a2ui-align-' + comp.align : ''}`;
        (comp.children || []).forEach((cid) => {
          const ch = renderComponentNode(cid, surface);
          if (ch) el.appendChild(ch);
        });
        break;
      }

      case 'Row': {
        el = document.createElement('div');
        const justifyClass =
          comp.justify === 'spaceBetween'
            ? 'a2ui-justify-between'
            : comp.justify
            ? 'a2ui-justify-' + comp.justify
            : '';
        const alignClass = comp.align ? 'a2ui-align-' + comp.align : '';
        el.className = `${comp.layoutClass || 'a2ui-row'} ${justifyClass} ${alignClass}`;
        (comp.children || []).forEach((cid) => {
          const ch = renderComponentNode(cid, surface);
          if (ch) el.appendChild(ch);
        });
        break;
      }

      case 'Divider': {
        el = document.createElement('div');
        el.className = 'a2ui-divider';
        break;
      }

      case 'Text': {
        const variant = comp.variant || 'body';
        el = document.createElement('div');
        el.className = `a2ui-text-${variant}`;
        if (comp.badgeStyle) {
          el.style.cssText =
            'display:inline-flex;align-items:center;padding:4px 9px;border-radius:6px;background:var(--surface-subtle);color:var(--Apex-emerald-800);font-weight:700;font-size:11.5px;';
        }
        el.textContent = evaluateDynamic(comp.text, surface);
        break;
      }

      case 'Image': {
        const variant = comp.variant || 'header';
        el = document.createElement('div');
        el.className = `a2ui-image-wrapper a2ui-image-${variant}`;
        const img = document.createElement('img');
        img.src = evaluateDynamic(comp.url, surface);
        img.alt = comp.alt || 'Apex Mobility Vehicle';
        el.appendChild(img);
        break;
      }

      case 'ChoicePicker': {
        el = document.createElement('div');
        el.className = 'a2ui-field-group';
        const boundPath = comp.value && comp.value.path ? comp.value.path : '';
        const currentVal = boundPath ? getByPointer(surface.dataModel, boundPath) : '';

        if (comp.label) {
          const lbl = document.createElement('div');
          lbl.className = 'a2ui-field-label';
          lbl.innerHTML = `<span>${evaluateDynamic(comp.label, surface)}</span>${
            boundPath ? `<span class="a2ui-path-tag">${boundPath}</span>` : ''
          }`;
          el.appendChild(lbl);
        }

        const options = evaluateDynamic(comp.options, surface) || [];
        if (comp.displayStyle === 'chips') {
          const chipsWrap = document.createElement('div');
          chipsWrap.className = 'a2ui-chips-container';
          options.forEach((opt) => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const isMulti = Boolean(comp.multiSelect);
            const isSelected = isMulti
              ? Array.isArray(currentVal) && currentVal.includes(optValue)
              : currentVal === optValue;

            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `a2ui-chip ${isSelected ? 'selected' : ''}`;
            chip.textContent = optLabel;
            chip.onclick = () => {
              if (!boundPath) return;
              let updatedVal = optValue;
              if (isMulti) {
                const arr = Array.isArray(currentVal) ? [...currentVal] : [];
                const idx = arr.indexOf(optValue);
                if (idx >= 0) arr.splice(idx, 1);
                else arr.push(optValue);
                updatedVal = arr;
                setByPointer(surface.dataModel, boundPath, arr);
              } else {
                setByPointer(surface.dataModel, boundPath, optValue);
                if (boundPath === '/booking/vehicleId' && VEHICLE_FLEET[optValue]) {
                  const v = VEHICLE_FLEET[optValue];
                  setByPointer(surface.dataModel, '/booking/vehicleName', v.name);
                  setByPointer(surface.dataModel, '/booking/powertrain', v.powertrain);
                  setByPointer(surface.dataModel, '/booking/imageUrl', v.imageUrl);
                  setByPointer(surface.dataModel, '/booking/trim', v.availableTrims[0]);
                  setByPointer(surface.dataModel, '/booking/availableTrims', v.availableTrims);
                }
              }
              renderSurfaceInDOM(surface, false);
              notifyTwoWayBindingChange(surface, boundPath, updatedVal, comp.id);
            };
            chipsWrap.appendChild(chip);
          });
          el.appendChild(chipsWrap);
        } else {
          const sel = document.createElement('select');
          sel.className = 'a2ui-select-input';
          options.forEach((opt) => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const o = document.createElement('option');
            o.value = optValue;
            o.textContent = optLabel;
            if (currentVal === optValue) o.selected = true;
            sel.appendChild(o);
          });
          sel.onchange = (e) => {
            if (boundPath) {
              setByPointer(surface.dataModel, boundPath, e.target.value);
              renderSurfaceInDOM(surface, false);
              notifyTwoWayBindingChange(surface, boundPath, e.target.value, comp.id);
            }
          };
          el.appendChild(sel);
        }
        break;
      }

      case 'DateTimeInput': {
        el = document.createElement('div');
        el.className = 'a2ui-field-group';
        const boundPath = comp.value && comp.value.path ? comp.value.path : '';
        const currentVal = boundPath ? getByPointer(surface.dataModel, boundPath) : '';

        if (comp.label) {
          const lbl = document.createElement('div');
          lbl.className = 'a2ui-field-label';
          lbl.innerHTML = `<span>${evaluateDynamic(comp.label, surface)}</span>${
            boundPath ? `<span class="a2ui-path-tag">${boundPath}</span>` : ''
          }`;
          el.appendChild(lbl);
        }

        const inp = document.createElement('input');
        inp.type = comp.enableTime ? 'datetime-local' : 'date';
        inp.className = 'a2ui-datetime-input';
        inp.value = currentVal || '2026-09-26T10:30';
        inp.onchange = (e) => {
          if (boundPath) {
            setByPointer(surface.dataModel, boundPath, e.target.value);
            notifyTwoWayBindingChange(surface, boundPath, e.target.value, comp.id);
          }
        };
        el.appendChild(inp);
        break;
      }

      case 'Slider': {
        el = document.createElement('div');
        el.className = 'a2ui-field-group';
        const boundPath = comp.value && comp.value.path ? comp.value.path : '';
        const currentVal = Number(boundPath ? getByPointer(surface.dataModel, boundPath) : 60);

        if (comp.label) {
          const lbl = document.createElement('div');
          lbl.className = 'a2ui-field-label';
          lbl.innerHTML = `<span>${evaluateDynamic(comp.label, surface)}</span>${
            boundPath ? `<span class="a2ui-path-tag">${boundPath}</span>` : ''
          }`;
          el.appendChild(lbl);
        }

        const row = document.createElement('div');
        row.className = 'a2ui-slider-row';

        const range = document.createElement('input');
        range.type = 'range';
        range.className = 'a2ui-slider-input';
        range.min = comp.min || 30;
        range.max = comp.max || 120;
        range.step = comp.step || 15;
        range.value = currentVal;

        const badge = document.createElement('span');
        badge.className = 'a2ui-slider-badge';
        badge.textContent = `${currentVal} min`;

        range.oninput = (e) => {
          const v = Number(e.target.value);
          badge.textContent = `${v} min`;
          if (boundPath) {
            setByPointer(surface.dataModel, boundPath, v);
            notifyTwoWayBindingChange(surface, boundPath, v, comp.id);
          }
        };

        row.appendChild(range);
        row.appendChild(badge);
        el.appendChild(row);
        break;
      }

      case 'TextField': {
        el = document.createElement('div');
        el.className = 'a2ui-field-group';
        const boundPath = comp.value && comp.value.path ? comp.value.path : '';
        const currentVal = boundPath ? getByPointer(surface.dataModel, boundPath) || '' : '';

        if (comp.label) {
          const lbl = document.createElement('div');
          lbl.className = 'a2ui-field-label';
          lbl.innerHTML = `<span>${evaluateDynamic(comp.label, surface)}</span>${
            boundPath ? `<span class="a2ui-path-tag">${boundPath}</span>` : ''
          }`;
          el.appendChild(lbl);
        }

        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'a2ui-text-input';
        inp.placeholder = comp.placeholder || '';
        inp.value = currentVal;

        const msgEl = document.createElement('div');
        msgEl.className = 'a2ui-validation-msg';

        const updateCheckUI = () => {
          const checks = comp.checks || [];
          for (const chk of checks) {
            const passed = Boolean(evaluateDynamic(chk.condition, surface));
            if (!passed) {
              inp.classList.add('invalid-field');
              msgEl.className = 'a2ui-validation-msg error';
              msgEl.textContent = `⚠ ${chk.message}`;
              return;
            }
          }
          inp.classList.remove('invalid-field');
          msgEl.className = 'a2ui-validation-msg valid';
          msgEl.textContent = checks.length ? '✓ Validated by local A2UI check' : '';
        };

        updateCheckUI();

        inp.oninput = (e) => {
          if (boundPath) {
            setByPointer(surface.dataModel, boundPath, e.target.value);
            updateCheckUI();
            updateGatedButtons(surface);
            notifyTwoWayBindingChange(surface, boundPath, e.target.value, comp.id);
          }
        };

        el.appendChild(inp);
        if ((comp.checks || []).length > 0) {
          el.appendChild(msgEl);
        }
        break;
      }

      case 'CheckBox': {
        const boundPath = comp.value && comp.value.path ? comp.value.path : '';
        const checked = Boolean(boundPath ? getByPointer(surface.dataModel, boundPath) : false);
        el = document.createElement('label');
        el.className = 'a2ui-checkbox-label';

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = checked;
        chk.onchange = (e) => {
          if (boundPath) {
            setByPointer(surface.dataModel, boundPath, e.target.checked);
            updateGatedButtons(surface);
            notifyTwoWayBindingChange(surface, boundPath, e.target.checked, comp.id);
          }
        };

        const span = document.createElement('span');
        span.innerHTML = `${evaluateDynamic(comp.label, surface)} ${
          boundPath ? `<span class="a2ui-path-tag">${boundPath}</span>` : ''
        }`;

        el.appendChild(chk);
        el.appendChild(span);
        break;
      }

      case 'Button': {
        el = document.createElement('button');
        el.type = 'button';
        el.dataset.a2uiButtonId = comp.id;
        el.dataset.a2uiSurfaceId = surface.surfaceId;
        const variant = comp.variant || 'default';
        el.className = `a2ui-btn a2ui-btn-${variant}`;

        if (comp.child) {
          const childComp = surface.components.get(comp.child);
          el.textContent = childComp ? evaluateDynamic(childComp.text, surface) : 'Action';
        } else {
          el.textContent = evaluateDynamic(comp.label || 'Submit', surface);
        }

        const checks = comp.checks || [];
        if (checks.length > 0) {
          const allPassed = checks.every((c) => Boolean(evaluateDynamic(c.condition, surface)));
          el.disabled = !allPassed;
        }

        el.onclick = () => {
          if (comp.action && comp.action.event) {
            dispatchClientAction(surface, comp.action.event);
          }
        };
        break;
      }
    }

    attachXrayAttributes(el, comp);
    return el;
  }

  function updateGatedButtons(surface) {
    const buttons = document.querySelectorAll(`button[data-a2ui-surface-id="${surface.surfaceId}"]`);
    buttons.forEach((btn) => {
      const comp = surface.components.get(btn.dataset.a2uiButtonId);
      if (comp && comp.checks && comp.checks.length > 0) {
        const allPassed = comp.checks.every((c) => Boolean(evaluateDynamic(c.condition, surface)));
        btn.disabled = !allPassed;
      }
    });
  }

  // ============================================================================
  // 6. CLIENT-TO-SERVER ACTION DISPATCHER
  // ============================================================================
  function dispatchClientAction(surface, eventDef) {
    const resolvedContext = {};
    if (eventDef.context) {
      Object.keys(eventDef.context).forEach((k) => {
        resolvedContext[k] = evaluateDynamic(eventDef.context[k], surface);
      });
    }

    if (eventDef.name === 'openTestDriveBooking') {
      const modelId = resolvedContext.modelId || 'aero_gt';
      runTurn2BookingConfigurator(modelId, true);
    } else if (eventDef.name === 'confirmTestDrive') {
      runTurn4ConfirmedPass();
    } else if (eventDef.name === 'rescheduleBooking') {
      runTurn2BookingConfigurator(
        (surface.dataModel.booking && surface.dataModel.booking.vehicleId) || 'aero_gt',
        false
      );
    }
  }

  // ============================================================================
  // 7. GUIDED 4-TURN CONVERSATION STORYBOARD (LEFT + RIGHT SYNCHRONIZED)
  // ============================================================================
  function appendChatTurn(role, textHtml, surfaceIdToMount) {
    const container = document.getElementById('chat-turns-container');
    const turn = document.createElement('div');
    turn.className = `chat-turn ${role === 'user' ? 'user-turn' : 'agent-turn'}`;

    if (role === 'user') {
      turn.innerHTML = `<div class="user-bubble">${textHtml}</div>`;
    } else {
      let html = `
        <div class="agent-header">
          <span class="assistant-avatar">A</span>
          <span>Aria — Apex Mobility Digital Showroom Assistant</span>
          <span class="agent-protocol-pill">A2UI v0.9.1</span>
        </div>
        <div class="agent-text-bubble">${textHtml}</div>
      `;
      if (surfaceIdToMount) {
        const existingHost = document.getElementById(`a2ui-host-${surfaceIdToMount}`);
        if (existingHost) existingHost.remove();
        html += `<div class="a2ui-surface-host" id="a2ui-host-${surfaceIdToMount}"></div>`;
      }
      turn.innerHTML = html;
    }

    container.appendChild(turn);
    const viewport = document.getElementById('chat-stream-viewport');
    setTimeout(() => {
      viewport.scrollTop = viewport.scrollHeight;
    }, 60);
  }

  function renderNextStepGuideBanner(turnNumber) {
    const box = document.getElementById('next-step-banner-container');
    const topBtnLabel = document.getElementById('next-turn-btn-label');

    [1, 2, 3, 4].forEach((n) => {
      const btn = document.getElementById(`step-btn-${n}`);
      if (!btn) return;
      btn.classList.toggle('active-step', n === turnNumber);
      btn.classList.toggle('completed-step', n < turnNumber);
    });

    if (turnNumber === 1) {
      topBtnLabel.textContent = '▶ Next (Turn 2): Select Vehicle & Open Booking Form';
      box.innerHTML = `
        <div class="next-step-guide-card">
          <div class="guide-copy">
            <span class="guide-eyebrow">What just happened in Turn 1 &amp; What to try next</span>
            <span class="guide-title">Aria streamed an A2UI Vehicle Explorer instead of plain text. Click any "Book Test Drive" button on a car card above — or click the button on the right to advance to Turn 2!</span>
          </div>
          <button class="btn-next-turn-cta" onclick="window.ShowroomDemo.runTurn(2)">
            ▶ Run Turn 2: Book Apex Aero GT Coupé &rarr;
          </button>
        </div>
      `;
    } else if (turnNumber === 2) {
      topBtnLabel.textContent = '▶ Next (Turn 3): Mutate Form via Chat (updateDataModel)';
      box.innerHTML = `
        <div class="next-step-guide-card">
          <div class="guide-copy">
            <span class="guide-eyebrow">Turn 2 Active • Interactive A2UI Form + 2-Way Data Binding</span>
            <span class="guide-title">Try clicking the chips/slider above (watch the JSON Data Model update live on the right!), OR click Turn 3 to see how a chat message mutates this form in place without losing state!</span>
          </div>
          <button class="btn-next-turn-cta" onclick="window.ShowroomDemo.runTurn(3)">
            ▶ Run Turn 3: Mutate Form via Chat &rarr;
          </button>
        </div>
      `;
    } else if (turnNumber === 3) {
      topBtnLabel.textContent = '▶ Next (Turn 4): Validate Driver & Issue Digital Pass';
      box.innerHTML = `
        <div class="next-step-guide-card">
          <div class="guide-copy">
            <span class="guide-eyebrow">Turn 3 Active • Incremental A2UI updateDataModel Patch</span>
            <span class="guide-title">Notice how Aria updated the existing form above to "Apex Mobility Apex Urban Crossover EV" at "Westgate Center" for "90 min" without recreating the UI! Now click Turn 4 (or "Confirm Apex Mobility Test Drive" in the form).</span>
          </div>
          <button class="btn-next-turn-cta" onclick="window.ShowroomDemo.runTurn(4)">
            ▶ Run Turn 4: Confirm &amp; Issue Digital Pass &rarr;
          </button>
        </div>
      `;
    } else if (turnNumber === 4) {
      topBtnLabel.textContent = '↺ Replay from Turn 1';
      box.innerHTML = `
        <div class="next-step-guide-card">
          <div class="guide-copy">
            <span class="guide-eyebrow">Turn 4 Complete • End-to-End A2UI Booking Confirmed</span>
            <span class="guide-title">The browser validated the driver inputs via A2UI client checks, sent the structured JSON state to Aria, and rendered the Digital Test Drive Pass.</span>
          </div>
          <button class="btn-next-turn-cta" onclick="window.ShowroomDemo.resetToStart()">
            ↺ Restart Demo from Turn 1
          </button>
        </div>
      `;
    }
  }

  function updateBehindTheCurtainsPipeline(stage1, stage2, stage3, stage4, summaryHtml) {
    document.getElementById('pnode-1-detail').textContent = stage1;
    document.getElementById('pnode-2-detail').textContent = stage2;
    document.getElementById('pnode-3-detail').textContent = stage3;
    document.getElementById('pnode-4-detail').textContent = stage4;

    if (summaryHtml) {
      document.getElementById('curtain-narrative-summary').innerHTML = summaryHtml;
    }

    // Pulse the 4 pipeline cards sequentially
    [1, 2, 3, 4].forEach((idx) => {
      const node = document.getElementById(`pnode-${idx}`);
      if (!node) return;
      node.classList.remove('active-node');
      setTimeout(() => {
        node.classList.add('active-node');
      }, idx * 90);
    });
  }

  // TURN 1: Customer asks for Electric SUVs -> Aria streams Vehicle Cards
  function runTurn1VehicleDiscovery() {
    currentTurn = 1;
    document.getElementById('curtain-turn-indicator').textContent = 'Turn 1 of 4 • Vehicle Discovery Surface';
    const surfaceId = 'aria_vehicle_discovery';

    appendChatTurn(
      'user',
      'Hi Aria! I’m looking for an electric or plug-in SUV for my family. Which Apex Mobility models can I compare and book for a test drive this weekend?'
    );

    appendChatTurn(
      'agent',
      'Welcome! Based on your family SUV criteria, I queried our live dealership fleet and generated an interactive <strong>A2UI Vehicle Comparison Surface</strong> below. Compare power and WLTP range, and click <strong>Book Test Drive</strong> on your preferred Apex Mobility:',
      surfaceId
    );

    processA2uiEnvelope({
      version: 'v0.9',
      createSurface: {
        surfaceId,
        catalogId: 'https://apex-mobility.example.com/a2ui/v0_9/catalogs/automotive_retail.json',
        theme: { primaryColor: '#0f172a', accentColor: '#38bdf8' },
        sendDataModel: true
      }
    });

    const components = [
      { id: 'root', component: 'Card', child: 'explorer-col' },
      { id: 'explorer-col', component: 'Column', children: ['explorer-heading', 'vehicle-grid-row'] },
      {
        id: 'explorer-heading',
        component: 'Text',
        variant: 'h3',
        text: 'Available Apex Mobility Test Drive Fleet (Select a Model to Configure Your Slot)'
      },
      {
        id: 'vehicle-grid-row',
        component: 'Row',
        layoutClass: 'a2ui-vehicle-grid',
        children: ['card-aero_gt', 'card-urban_ev', 'card-horizon_phev', 'card-touring_phev']
      }
    ];

    Object.values(VEHICLE_FLEET).forEach((v) => {
      components.push(
        { id: `card-${v.id}`, component: 'Card', child: `col-${v.id}` },
        {
          id: `col-${v.id}`,
          component: 'Column',
          children: [`img-${v.id}`, `name-${v.id}`, `tagline-${v.id}`, `specs-${v.id}`, `price-${v.id}`, `btn-${v.id}`]
        },
        { id: `img-${v.id}`, component: 'Image', variant: 'header', url: { path: `/vehicles/${v.id}/imageUrl` } },
        { id: `name-${v.id}`, component: 'Text', variant: 'h3', text: { path: `/vehicles/${v.id}/name` } },
        { id: `tagline-${v.id}`, component: 'Text', variant: 'caption', text: { path: `/vehicles/${v.id}/tagline` } },
        { id: `specs-${v.id}`, component: 'Row', children: [`spec-pwr-${v.id}`, `spec-rng-${v.id}`] },
        { id: `spec-pwr-${v.id}`, component: 'Text', variant: 'caption', badgeStyle: true, text: { path: `/vehicles/${v.id}/powerKw` } },
        { id: `spec-rng-${v.id}`, component: 'Text', variant: 'caption', badgeStyle: true, text: { path: `/vehicles/${v.id}/rangeWltp` } },
        {
          id: `price-${v.id}`,
          component: 'Text',
          variant: 'h4',
          text: { call: 'formatCurrency', args: { value: { path: `/vehicles/${v.id}/priceEur` }, currency: 'EUR' } }
        },
        { id: `btn-txt-${v.id}`, component: 'Text', text: `Book ${v.name} →` },
        {
          id: `btn-${v.id}`,
          component: 'Button',
          variant: 'primary',
          child: `btn-txt-${v.id}`,
          action: { event: { name: 'openTestDriveBooking', context: { modelId: v.id } } }
        }
      );
    });

    processA2uiEnvelope({ version: 'v0.9', updateComponents: { surfaceId, components } });
    processA2uiEnvelope({ version: 'v0.9', updateDataModel: { surfaceId, path: '/', value: { vehicles: VEHICLE_FLEET } } });

    updateBehindTheCurtainsPipeline(
      'User asked in chat for family electric SUVs',
      'Aria called mcp.Apex_inventory.list_fleet()',
      'Streamed createSurface + 28 Card/Image/Button nodes',
      'Rendered 4 interactive Apex Mobility vehicle cards natively',
      '<strong>Behind the Curtains (Turn 1):</strong> Instead of replying with 20 lines of plain text, Aria sent an A2UI <code>createSurface("aria_vehicle_discovery")</code> envelope. Each card button has an A2UI <code>action: "openTestDriveBooking"</code> ready to trigger Turn 2.'
    );

    renderNextStepGuideBanner(1);
  }

  // TURN 2: Customer selects a car -> Aria streams the Dynamic Booking Form
  function runTurn2BookingConfigurator(selectedModelId = 'aero_gt', fromCardClick = false) {
    currentTurn = 2;
    document.getElementById('curtain-turn-indicator').textContent = 'Turn 2 of 4 • Dynamic Booking Form Surface';
    const vehicle = VEHICLE_FLEET[selectedModelId] || VEHICLE_FLEET.aero_gt;
    const surfaceId = 'aria_test_drive_form';

    appendChatTurn(
      'user',
      fromCardClick
        ? `[Clicked A2UI Button: Book ${vehicle.name}] — I'd like to schedule a test drive for the ${vehicle.name}.`
        : `I'd like to book a test drive for the ${vehicle.name} in Downtown.`
    );

    appendChatTurn(
      'agent',
      `Great choice! I've initialized the <strong>A2UI Test Drive Configurator Surface</strong> (<code>surfaceId: "aria_test_drive_form"</code>) pre-loaded with the <strong>${vehicle.name}</strong>. Notice how you can interact with the dropdowns, chips, and sliders directly—<em>or</em> tell me in chat (Turn 3) to modify the form in real time:`,
      surfaceId
    );

    processA2uiEnvelope({
      version: 'v0.9',
      createSurface: {
        surfaceId,
        catalogId: 'https://apex-mobility.example.com/a2ui/v0_9/catalogs/automotive_retail.json',
        theme: { primaryColor: '#0f172a', accentColor: '#38bdf8' },
        sendDataModel: true
      }
    });

    processA2uiEnvelope({
      version: 'v0.9',
      updateComponents: {
        surfaceId,
        components: [
          { id: 'root', component: 'Card', child: 'booking-main-col' },
          {
            id: 'booking-main-col',
            component: 'Column',
            children: [
              'selected-vehicle-banner',
              'model-switcher-picker',
              'trim-picker',
              'divider-1',
              'dealer-datetime-row',
              'experience-duration-row',
              'divider-2',
              'driver-section-title',
              'driver-inputs-row',
              'driver-phone-row',
              'license-checkbox',
              'booking-actions-row'
            ]
          },
          {
            id: 'selected-vehicle-banner',
            component: 'Row',
            align: 'center',
            children: ['selected-vehicle-img', 'selected-vehicle-info']
          },
          { id: 'selected-vehicle-img', component: 'Image', variant: 'mediumFeature', url: { path: '/booking/imageUrl' } },
          {
            id: 'selected-vehicle-info',
            component: 'Column',
            children: ['selected-vehicle-title', 'selected-vehicle-powertrain', 'selected-vehicle-trim-badge']
          },
          { id: 'selected-vehicle-title', component: 'Text', variant: 'h2', text: { path: '/booking/vehicleName' } },
          { id: 'selected-vehicle-powertrain', component: 'Text', variant: 'body', text: { path: '/booking/powertrain' } },
          {
            id: 'selected-vehicle-trim-badge',
            component: 'Text',
            variant: 'caption',
            badgeStyle: true,
            text: {
              call: 'formatString',
              args: { value: 'Active Trim: ${/booking/trim} • Duration: ${/booking/durationMins} min' }
            }
          },
          {
            id: 'model-switcher-picker',
            component: 'ChoicePicker',
            label: '1. Apex Mobility Test Vehicle Model (ChoicePicker • Chips)',
            displayStyle: 'chips',
            value: { path: '/booking/vehicleId' },
            options: [
              { value: 'aero_gt', label: 'Apex Aero GT Coupé (250 kW)' },
              { value: 'urban_ev', label: 'Apex Urban Crossover EV (581 km WLTP)' },
              { value: 'horizon_phev', label: 'Horizon iV PHEV (7-Seat)' },
              { value: 'touring_phev', label: 'Touring Combi iV' }
            ]
          },
          {
            id: 'trim-picker',
            component: 'ChoicePicker',
            label: '2. Trim & Powertrain Specification',
            displayStyle: 'chips',
            value: { path: '/booking/trim' },
            options: { path: '/booking/availableTrims' }
          },
          { id: 'divider-1', component: 'Divider' },
          { id: 'dealer-datetime-row', component: 'Row', children: ['dealer-picker', 'slot-datetime'] },
          {
            id: 'dealer-picker',
            component: 'ChoicePicker',
            label: '3. Authorized Apex Mobility Dealership (ChoicePicker • Dropdown)',
            displayStyle: 'checkbox',
            value: { path: '/booking/dealerId' },
            options: DEALERSHIP_LOCATIONS.map((d) => ({ value: d.id, label: d.label }))
          },
          {
            id: 'slot-datetime',
            component: 'DateTimeInput',
            label: '4. Date & Time Slot (DateTimeInput • ISO 8601)',
            enableDate: true,
            enableTime: true,
            value: { path: '/booking/dateTime' }
          },
          { id: 'experience-duration-row', component: 'Row', children: ['route-focus-picker', 'duration-slider'] },
          {
            id: 'route-focus-picker',
            component: 'ChoicePicker',
            label: '5. Test Drive Route Focus (Multi-Select Chips)',
            displayStyle: 'chips',
            multiSelect: true,
            value: { path: '/booking/focusAreas' },
            options: [
              { value: 'Highway & Travel Assist', label: 'Highway & Travel Assist' },
              { value: 'RS Dynamic Handling', label: 'RS Dynamic Handling' },
              { value: 'City & Smart Parking', label: 'City & Smart Parking' },
              { value: 'Child Seat & Boot Fitment', label: 'Child Seat & Boot Fitment' }
            ]
          },
          {
            id: 'duration-slider',
            component: 'Slider',
            label: '6. Requested Drive Duration (Slider)',
            min: 30,
            max: 120,
            step: 15,
            value: { path: '/booking/durationMins' }
          },
          { id: 'divider-2', component: 'Divider' },
          {
            id: 'driver-section-title',
            component: 'Text',
            variant: 'h3',
            text: '7. Driver Verification & Client-Side Validated Lead Capture (A2UI Checks)'
          },
          { id: 'driver-inputs-row', component: 'Row', children: ['driver-name-field', 'driver-email-field'] },
          {
            id: 'driver-name-field',
            component: 'TextField',
            label: 'Full Name',
            placeholder: 'Alex Morgan',
            value: { path: '/driver/fullName' },
            checks: [
              {
                condition: { call: 'required', args: { value: { path: '/driver/fullName' } } },
                message: 'Full name is required'
              }
            ]
          },
          {
            id: 'driver-email-field',
            component: 'TextField',
            label: 'Email Address (Checked locally via email())',
            placeholder: 'alex.morgan@example.com',
            value: { path: '/driver/email' },
            checks: [
              {
                condition: { call: 'email', args: { value: { path: '/driver/email' } } },
                message: 'Invalid email format (blocked by local A2UI check)'
              }
            ]
          },
          { id: 'driver-phone-row', component: 'Row', children: ['driver-phone-field'] },
          {
            id: 'driver-phone-field',
            component: 'TextField',
            label: 'Mobile Number (Checked locally via regex())',
            placeholder: '+420 777 842 910',
            value: { path: '/driver/phone' },
            checks: [
              {
                condition: {
                  call: 'regex',
                  args: { value: { path: '/driver/phone' }, pattern: '^\\+?[0-9\\s\\-]{8,16}$' }
                },
                message: 'Must be valid phone (+420 ...)'
              }
            ]
          },
          {
            id: 'license-checkbox',
            component: 'CheckBox',
            label: 'I hold a valid EU Category B driving license and accept Apex Mobility test-drive insurance terms.',
            value: { path: '/driver/licenseConfirmed' }
          },
          { id: 'booking-actions-row', component: 'Row', justify: 'end', children: ['confirm-booking-btn'] },
          { id: 'confirm-booking-btn-text', component: 'Text', text: 'Confirm Apex Mobility Test Drive & Issue Digital Pass →' },
          {
            id: 'confirm-booking-btn',
            component: 'Button',
            variant: 'primary',
            child: 'confirm-booking-btn-text',
            checks: [
              {
                condition: {
                  call: 'and',
                  args: {
                    values: [
                      { call: 'required', args: { value: { path: '/driver/fullName' } } },
                      { call: 'email', args: { value: { path: '/driver/email' } } },
                      {
                        call: 'regex',
                        args: { value: { path: '/driver/phone' }, pattern: '^\\+?[0-9\\s\\-]{8,16}$' }
                      },
                      { path: '/driver/licenseConfirmed' }
                    ]
                  }
                },
                message: 'Complete all validated fields first'
              }
            ],
            action: {
              event: {
                name: 'confirmTestDrive',
                context: { booking: { path: '/booking' }, driver: { path: '/driver' } }
              }
            }
          }
        ]
      }
    });

    processA2uiEnvelope({
      version: 'v0.9',
      updateDataModel: {
        surfaceId,
        path: '/',
        value: {
          booking: {
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            powertrain: vehicle.powertrain,
            imageUrl: vehicle.imageUrl,
            trim: vehicle.availableTrims[0],
            availableTrims: vehicle.availableTrims,
            dealerId: 'downtown_hub',
            dateTime: '2026-09-26T10:30',
            focusAreas: ['Highway & Travel Assist', 'RS Dynamic Handling'],
            durationMins: 60
          },
          driver: {
            fullName: 'Alex Morgan',
            email: 'alex.morgan@example.com',
            phone: '+420 777 842 910',
            licenseConfirmed: true
          }
        }
      }
    });

    updateBehindTheCurtainsPipeline(
      `Action "openTestDriveBooking" (${vehicle.id})`,
      'Aria queried open dealer slots via DMS MCP',
      'Streamed createSurface("aria_test_drive_form")',
      'Bound ChoicePicker, DateTimeInput, Slider & Checks',
      '<strong>Behind the Curtains (Turn 2):</strong> Look at the <strong>Live 2-Way Data Model</strong> below—every input field on the left is bound to a JSON Pointer path (like <code>/booking/dealerId</code> or <code>/driver/email</code>). Try changing a chip on the left or clicking the <strong>Interactive Test Controls</strong> below!'
    );

    renderNextStepGuideBanner(2);
  }

  // TURN 3: Customer types in chat to modify the form -> Aria sends updateDataModel patch
  function runTurn3ConversationalMutation() {
    if (!surfaces.has('aria_test_drive_form')) {
      runTurn2BookingConfigurator('aero_gt', false);
    }
    currentTurn = 3;
    document.getElementById('curtain-turn-indicator').textContent =
      'Turn 3 of 4 • Incremental updateDataModel Mutation';

    appendChatTurn(
      'user',
      'Actually Aria, can we switch the car to the Apex Mobility Apex Urban Crossover EV, change the dealership to Westgate Experience Center on Sunday at 14:00, and extend the drive to 90 minutes?'
    );

    appendChatTurn(
      'agent',
      'Updated! Because A2UI separates <strong>UI Structure</strong> from <strong>Data Model</strong>, I did <em>not</em> have to send a new form. I just sent a 200-byte <code>updateDataModel</code> JSON patch to <code>surfaceId: "aria_test_drive_form"</code>—scrolling up to show your updated form:'
    );

    const urbanEv = VEHICLE_FLEET.urban_ev;
    processA2uiEnvelope(
      {
        version: 'v0.9',
        updateDataModel: {
          surfaceId: 'aria_test_drive_form',
          path: '/booking',
          value: {
            vehicleId: urbanEv.id,
            vehicleName: urbanEv.name,
            powertrain: urbanEv.powertrain,
            imageUrl: urbanEv.imageUrl,
            trim: urbanEv.availableTrims[0],
            availableTrims: urbanEv.availableTrims,
            dealerId: 'westgate_center',
            dateTime: '2026-09-27T14:00',
            focusAreas: ['City & Smart Parking', 'Child Seat & Boot Fitment'],
            durationMins: 90
          }
        }
      },
      {
        animateMutation: true,
        mutationBannerText: 'Vehicle -> Apex Mobility Apex Urban Crossover EV • Dealer -> Westgate Center • Slot -> Sun 14:00 (90 min)'
      }
    );

    updateBehindTheCurtainsPipeline(
      'Chat: "Switch to Apex Urban Crossover EV at Westgate for 90 min"',
      'Aria parsed intent & kept existing surfaceId',
      'Sent ONLY updateDataModel(path: "/booking")',
      'Existing form mutated in-place without reload!',
      '<strong>Behind the Curtains (Turn 3 — The Killer Feature of A2UI):</strong> Traditional chatbots either force users to start over or can’t update an open web form from chat. With A2UI, Aria sends <code>updateDataModel</code> and the existing form above mutates in place while preserving Alex Morgan’s typed contact info!'
    );

    renderNextStepGuideBanner(3);

    setTimeout(() => {
      const formHost = document.getElementById('a2ui-host-aria_test_drive_form');
      if (formHost) formHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }

  // TURN 4: Customer confirms booking -> Client sends structured data -> Aria streams Digital Pass
  function runTurn4ConfirmedPass() {
    if (!surfaces.has('aria_test_drive_form')) {
      runTurn2BookingConfigurator('aero_gt', false);
    }
    currentTurn = 4;
    document.getElementById('curtain-turn-indicator').textContent = 'Turn 4 of 4 • Confirmed Digital Pass Surface';

    const formSurface = surfaces.get('aria_test_drive_form');
    const dm = formSurface.dataModel;
    const dealerObj = DEALERSHIP_LOCATIONS.find((d) => d.id === dm.booking.dealerId) || DEALERSHIP_LOCATIONS[0];
    const surfaceId = 'aria_booking_pass';

    appendChatTurn(
      'user',
      `[Submitted Validated A2UI Form] — Confirm my test drive for the ${dm.booking.vehicleName} (${dm.booking.durationMins} min).`
    );

    appendChatTurn(
      'agent',
      `Your reservation is confirmed in the Apex Mobility Dealer Management System! Here is your <strong>A2UI Digital Test Drive Pass</strong> (Reservation <code>#SK-2026-8841</code>):`,
      surfaceId
    );

    processA2uiEnvelope({
      version: 'v0.9',
      createSurface: {
        surfaceId,
        catalogId: 'https://apex-mobility.example.com/a2ui/v0_9/catalogs/automotive_retail.json',
        sendDataModel: true
      }
    });

    processA2uiEnvelope({
      version: 'v0.9',
      updateComponents: {
        surfaceId,
        components: [
          { id: 'root', component: 'Card', child: 'pass-col' },
          { id: 'pass-col', component: 'Column', children: ['pass-top-row', 'pass-divider', 'pass-details-row'] },
          {
            id: 'pass-top-row',
            component: 'Row',
            justify: 'spaceBetween',
            align: 'center',
            children: ['pass-title-col', 'pass-code-badge']
          },
          { id: 'pass-title-col', component: 'Column', children: ['pass-heading', 'pass-subtitle'] },
          {
            id: 'pass-heading',
            component: 'Text',
            variant: 'h2',
            text: { call: 'formatString', args: { value: '✓ Confirmed: ${/pass/vehicleName}' } }
          },
          { id: 'pass-subtitle', component: 'Text', variant: 'body', text: { path: '/pass/dealerLabel' } },
          { id: 'pass-code-badge', component: 'Text', variant: 'h3', badgeStyle: true, text: { path: '/pass/reservationCode' } },
          { id: 'pass-divider', component: 'Divider' },
          { id: 'pass-details-row', component: 'Row', align: 'center', children: ['pass-img', 'pass-meta-col'] },
          { id: 'pass-img', component: 'Image', variant: 'mediumFeature', url: { path: '/pass/imageUrl' } },
          { id: 'pass-meta-col', component: 'Column', children: ['pass-driver', 'pass-slot', 'pass-trim'] },
          {
            id: 'pass-driver',
            component: 'Text',
            variant: 'h4',
            text: { call: 'formatString', args: { value: 'Driver: ${/pass/driverName} (${/pass/driverEmail})' } }
          },
          {
            id: 'pass-slot',
            component: 'Text',
            variant: 'body',
            text: { call: 'formatString', args: { value: 'Slot: ${/pass/dateTime} • Duration: ${/pass/durationMins} mins' } }
          },
          {
            id: 'pass-trim',
            component: 'Text',
            variant: 'caption',
            text: { call: 'formatString', args: { value: 'Trim: ${/pass/trim} • Keyless Bay Express Handover Ready' } }
          }
        ]
      }
    });

    processA2uiEnvelope({
      version: 'v0.9',
      updateDataModel: {
        surfaceId,
        path: '/',
        value: {
          pass: {
            reservationCode: 'DMS #SK-2026-8841',
            vehicleName: dm.booking.vehicleName,
            imageUrl: dm.booking.imageUrl,
            trim: dm.booking.trim,
            dealerLabel: dealerObj.label,
            dateTime: dm.booking.dateTime,
            durationMins: dm.booking.durationMins,
            driverName: dm.driver.fullName,
            driverEmail: dm.driver.email
          }
        }
      }
    });

    updateBehindTheCurtainsPipeline(
      'Client dispatched action("confirmTestDrive") + DataModel',
      'Aria called mcp.Apex_dms.create_reservation()',
      'Streamed createSurface("aria_booking_pass")',
      'Rendered confirmed Apex Mobility Digital Test Drive Pass',
      '<strong>Behind the Curtains (Turn 4):</strong> When you clicked Confirm, the browser verified all 4 local <code>checks</code> (`required`, `email`, `regex`, `and`), attached the full `a2uiClientDataModel` JSON payload, and Aria issued the Digital Pass!'
    );

    renderNextStepGuideBanner(4);
  }

  // ============================================================================
  // 8. RIGHT-TO-LEFT INTERACTIVE CONTROLS ("BEHIND THE CURTAINS" BUTTONS)
  // ============================================================================
  function triggerServerPushFromRightBar(presetName) {
    if (!surfaces.has('aria_test_drive_form')) {
      runTurn2BookingConfigurator('aero_gt', false);
    }

    const formSurface = surfaces.get('aria_test_drive_form');
    let spotlightCompId = 'selected-vehicle-banner';

    if (presetName === 'switch_urban') {
      const targetVeh = VEHICLE_FLEET.urban_ev;
      processA2uiEnvelope(
        {
          version: 'v0.9',
          updateDataModel: {
            surfaceId: 'aria_test_drive_form',
            path: '/booking',
            value: {
              ...formSurface.dataModel.booking,
              vehicleId: targetVeh.id,
              vehicleName: targetVeh.name,
              powertrain: targetVeh.powertrain,
              imageUrl: targetVeh.imageUrl,
              trim: targetVeh.availableTrims[0],
              availableTrims: targetVeh.availableTrims
            }
          }
        },
        {
          animateMutation: true,
          mutationBannerText: 'Right-Bar Server Push -> Switched vehicle to Apex Mobility Horizon iV PHEV (7-Seater)'
        }
      );
      spotlightCompId = 'model-switcher-picker';
      updateBehindTheCurtainsPipeline(
        'Right-Bar Control: Server Push (Horizon iV)',
        'Simulated Agent streaming updateDataModel',
        'updateDataModel(path: "/booking") streamed',
        'Left UI switched image, title & trim chips live!',
        '<strong>Live Right &rarr; Left Action:</strong> You just pushed an A2UI <code>updateDataModel</code> message from the right bar, and the form on the left immediately switched to the <strong>Apex Mobility Horizon iV PHEV</strong>!'
      );
    } else if (presetName === 'switch_northside_120') {
      processA2uiEnvelope(
        {
          version: 'v0.9',
          updateDataModel: {
            surfaceId: 'aria_test_drive_form',
            path: '/booking',
            value: {
              ...formSurface.dataModel.booking,
              dealerId: 'northside_ev',
              durationMins: 120
            }
          }
        },
        {
          animateMutation: true,
          mutationBannerText: 'Right-Bar Server Push -> Dealer set to Apex Northside EV Hub & Duration = 120 min'
        }
      );
      spotlightCompId = 'dealer-picker';
      updateBehindTheCurtainsPipeline(
        'Right-Bar Control: Server Push (Northside + 120m)',
        'Simulated Agent streaming updateDataModel',
        'updateDataModel(dealerId="northside_ev", durationMins=120)',
        'Left UI dropdown & slider jumped to 120 min!',
        '<strong>Live Right &rarr; Left Action:</strong> Watch the Dealership dropdown (#3) and Duration slider (#6) on the left—they just updated to <strong>Apex Northside EV Hub</strong> and <strong>120 min</strong>!'
      );
    } else if (presetName === 'invalid_email') {
      processA2uiEnvelope(
        {
          version: 'v0.9',
          updateDataModel: {
            surfaceId: 'aria_test_drive_form',
            path: '/driver/email',
            value: 'not-a-valid-email'
          }
        },
        {
          animateMutation: true,
          mutationBannerText: 'Testing A2UI Client Validation: Injected invalid email ("not-a-valid-email")'
        }
      );
      spotlightCompId = 'driver-email-field';
      updateBehindTheCurtainsPipeline(
        'Right-Bar Control: Inject Invalid Email',
        'Set /driver/email = "not-a-valid-email"',
        'A2UI Client Function email(/driver/email) -> FALSE',
        'Left UI highlighted field in red & disabled Submit!',
        '<strong>Live Right &rarr; Left Validation Test:</strong> Look at the Email field and the Confirm button on the left! Because <code>email(/driver/email)</code> now evaluates to <code>false</code>, the A2UI renderer automatically flagged the input in red and locked the Submit button!'
      );
    } else if (presetName === 'fix_email') {
      processA2uiEnvelope(
        {
          version: 'v0.9',
          updateDataModel: {
            surfaceId: 'aria_test_drive_form',
            path: '/driver/email',
            value: 'alex.morgan@example.com'
          }
        },
        {
          animateMutation: true,
          mutationBannerText: 'Restored valid email ("alex.morgan@example.com") — Submit button unlocked!'
        }
      );
      spotlightCompId = 'driver-email-field';
    }

    // Scroll and spotlight the mutated widget on the left!
    setTimeout(() => {
      spotlightLeftComponent(spotlightCompId, true);
    }, 80);
  }

  function spotlightLeftComponent(compId, shouldScroll = false) {
    document.querySelectorAll('.xray-spotlight').forEach((el) => el.classList.remove('xray-spotlight'));
    const target = document.querySelector(`[data-a2ui-comp-id="${compId}"]`);
    if (target) {
      target.classList.add('xray-spotlight');
      if (shouldScroll) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => {
        target.classList.remove('xray-spotlight');
      }, 2400);
    }
  }

  // ============================================================================
  // 9. REFRESH "BEHIND THE CURTAINS" INSPECTOR VIEWS
  // ============================================================================
  function refreshBehindTheCurtainsUI() {
    document.getElementById('envelope-count').textContent = String(envelopeHistory.length);
    const curtainsCountBadge = document.getElementById('curtains-msg-count-badge');
    if (curtainsCountBadge) {
      curtainsCountBadge.textContent = String(envelopeHistory.length);
    }

    const activeSurface = surfaces.get(activeSurfaceId) || Array.from(surfaces.values()).pop();
    if (activeSurface) {
      document.getElementById('active-surface-id-badge').textContent = activeSurface.surfaceId;
      document.getElementById('live-datamodel-json').textContent = JSON.stringify(
        activeSurface.dataModel,
        null,
        2
      );

      // Populate Interactive Component Tree (Hover/Click spotlights Left UI!)
      const treeList = document.getElementById('component-tree-list');
      treeList.innerHTML = '';
      activeSurface.components.forEach((comp) => {
        const item = document.createElement('div');
        item.className = 'comp-tree-item';
        const boundInfo = comp.value && comp.value.path ? `bound: ${comp.value.path}` : comp.variant || '';
        item.innerHTML = `
          <span><strong style="color:var(--Apex-electric-green);">&lt;${comp.component}&gt;</strong> id="${comp.id}"</span>
          <span style="color:var(--studio-muted);font-size:10.5px;">${boundInfo} • Hover/Click to Spotlight &larr;</span>
        `;
        item.onmouseenter = () => spotlightLeftComponent(comp.id, false);
        item.onclick = () => spotlightLeftComponent(comp.id, true);
        treeList.appendChild(item);
      });
    }

    // Populate Client Validation Checks Status
    const checksBox = document.getElementById('live-checks-status');
    const formSurface = surfaces.get('aria_test_drive_form');
    if (formSurface) {
      const nameOk = executeCatalogFunction('required', { value: { path: '/driver/fullName' } }, formSurface);
      const emailOk = executeCatalogFunction('email', { value: { path: '/driver/email' } }, formSurface);
      const phoneOk = executeCatalogFunction(
        'regex',
        { value: { path: '/driver/phone' }, pattern: '^\\+?[0-9\\s\\-]{8,16}$' },
        formSurface
      );
      const licenseOk = Boolean(getByPointer(formSurface.dataModel, '/driver/licenseConfirmed'));

      checksBox.innerHTML = `
        <div>${nameOk ? '🟢 PASS' : '🔴 FAIL'} — <code>required(/driver/fullName)</code></div>
        <div>${emailOk ? '🟢 PASS' : '🔴 FAIL'} — <code>email(/driver/email)</code> ("${getByPointer(
        formSurface.dataModel,
        '/driver/email'
      )}")</div>
        <div>${phoneOk ? '🟢 PASS' : '🔴 FAIL'} — <code>regex(/driver/phone)</code></div>
        <div>${licenseOk ? '🟢 PASS' : '🔴 FAIL'} — <code>boolean(/driver/licenseConfirmed)</code></div>
      `;
    }

    // Populate Raw Envelopes Log
    const envList = document.getElementById('envelopes-log-list');
    envList.innerHTML = '';
    envelopeHistory.slice(0, 10).forEach((item) => {
      const msgType = Object.keys(item.envelope).find((k) => k !== 'version') || 'message';
      const card = document.createElement('div');
      card.className = 'protocol-card';
      card.innerHTML = `
        <div class="protocol-card-header">
          <span class="msg-badge msg-${msgType}">${msgType}</span>
          <span style="color:var(--studio-muted);">${item.timestamp}</span>
        </div>
        <pre class="code-block">${JSON.stringify(item.envelope, null, 2)}</pre>
      `;
      envList.appendChild(card);
    });
  }

  // ============================================================================
  // 10. PUBLIC CONTROLLER API
  // ============================================================================
  window.ShowroomDemo = {
    runTurn(turnNumber) {
      if (turnNumber === 1) {
        this.resetToStart();
      } else if (turnNumber === 2) {
        runTurn2BookingConfigurator('aero_gt', false);
      } else if (turnNumber === 3) {
        runTurn3ConversationalMutation();
      } else if (turnNumber === 4) {
        runTurn4ConfirmedPass();
      }
    },

    playNextTurn() {
      if (currentTurn <= 1) this.runTurn(2);
      else if (currentTurn === 2) this.runTurn(3);
      else if (currentTurn === 3) this.runTurn(4);
      else this.resetToStart();
    },

    triggerServerPush(presetName) {
      triggerServerPushFromRightBar(presetName);
    },

    toggleXrayMode() {
      document.body.classList.toggle('xray-mode');
      document.getElementById('btn-toggle-xray').classList.toggle(
        'active-xray',
        document.body.classList.contains('xray-mode')
      );
    },

    toggleCurtainsSidebar(forceOpen) {
      const currentlyOpen = document.body.classList.contains('curtains-open');
      const nextOpen = typeof forceOpen === 'boolean' ? forceOpen : !currentlyOpen;
      document.body.classList.toggle('curtains-open', nextOpen);
      const pane = document.getElementById('inspector-pane');
      if (pane) pane.setAttribute('aria-hidden', String(!nextOpen));
      const labelEl = document.getElementById('btn-curtains-label');
      if (labelEl) {
        labelEl.textContent = nextOpen
          ? '✕ Hide "Behind the Curtains" ▶'
          : '⚡ Show "Behind the Curtains" ◀';
      }
    },

    setCatalogTheme(mode) {
      document.body.classList.toggle('catalog-basic', mode === 'basic');
      document.getElementById('btn-catalog-brand').classList.toggle('active', mode === "brand");
      document.getElementById('btn-catalog-basic').classList.toggle('active', mode === 'basic');
    },

    switchInspectorTab(tabName) {
      ['datamodel', 'components', 'envelopes'].forEach((t) => {
        document.getElementById(`tab-${t}`).classList.toggle('active', t === tabName);
        document.getElementById(`panel-${t}`).style.display = t === tabName ? 'flex' : 'none';
      });
    },

    handleCustomInput() {
      const inp = document.getElementById('assistant-chat-input');
      const val = (inp.value || '').trim();
      if (!val) return;
      inp.value = '';
      const lower = val.toLowerCase();
      if (lower.includes('switch') || lower.includes('change') || lower.includes('munich') || lower.includes('karl') || lower.includes('90') || lower.includes('120')) {
        runTurn3ConversationalMutation();
      } else if (lower.includes('confirm') || lower.includes('pass')) {
        runTurn4ConfirmedPass();
      } else if (lower.includes('book') || lower.includes('aero') || lower.includes('urban') || lower.includes('horizon') || lower.includes('touring')) {
        let modelId = 'aero_gt';
        if (lower.includes('urban')) modelId = 'urban_ev';
        else if (lower.includes('horizon')) modelId = 'horizon_phev';
        else if (lower.includes('touring')) modelId = 'touring_phev';
        runTurn2BookingConfigurator(modelId, false);
      } else {
        this.resetToStart();
      }
    },

    resetToStart() {
      surfaces.clear();
      envelopeHistory.length = 0;
      document.getElementById('chat-turns-container').innerHTML = '';
      runTurn1VehicleDiscovery();
      const viewport = document.getElementById('chat-stream-viewport');
      viewport.scrollTop = 0;
    }
  };

  // Start cleanly at Turn 1 (Customer asks for Electric SUVs -> Aria shows Vehicle Explorer Cards)
  window.addEventListener('DOMContentLoaded', () => {
    window.ShowroomDemo.resetToStart();
  });
})();
