// src/components/TopBar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useStore, useDispatch } from '../lib/store.jsx';
import { LAYOUTS } from '../layouts/index.js';
import { THEMES } from '../lib/themes.js';
import { downloadPNG } from '../lib/exportImage.js';
import { downloadPDF } from '../lib/exportPdf.js';
import ProjectSettings from './ProjectSettings.jsx';
import ExportPage from './ExportPage.jsx';
import logo from '../logo.png';
import { DEFAULT_RAINBOW } from '../lib/constants.js';

// helpers for listing devices and themes, building palettes, and sanitising titles
function listDevices() {
  if (Array.isArray(LAYOUTS)) return LAYOUTS.map(l => ({ id: l.id || l.name, name: l.name || l.id }));
  return Object.keys(LAYOUTS || {}).map(k => ({ id: k, name: LAYOUTS[k]?.name || k }));
}
function listThemes() { return (THEMES || []).map(t => ({ id: t.id, name: t.name || t.id })); }
function paletteFromThemeId(themeId) { const t = (THEMES || []).find(t => t.id === themeId); return t?.keys ? t.keys.split(',').map(s=>s.trim()) : null; }
function getActivePalette(themeId) { return paletteFromThemeId(themeId) || DEFAULT_RAINBOW; }
function safeTitle(t='Untitled') { return String(t).trim().replace(/[^\w\-]+/g,'_').slice(0,80) || 'Untitled'; }
const coalesce = (a, b) => (a !== undefined ? a : b);

/* export support */
async function waitForFonts() {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}
}
async function waitForImages(rootEl) {
  const imgs = Array.from(rootEl.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise(res => {
      const done = () => res();
      img.addEventListener('load', done, { once:true });
      img.addEventListener('error', done, { once:true });
    });
  }));
}
async function waitForNode(container, selector, timeoutMs=2000) {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    function tick() {
      const el = container.querySelector(selector);
      if (el) return resolve(el);
      if (performance.now() - start > timeoutMs) return reject(new Error('timeout'));
      requestAnimationFrame(tick);
    }
    tick();
  });
}

export default function TopBar({ isMobile=false }) {
  const dispatch = useDispatch();
  const s = useStore();

  const {
    device='cyro', themeId=null,
    lock=false, snap=true, grid=true,
    showGloss=true, showNumbers=true, invert=false
  } = s;

  const multiActive = (s.multiSelect ?? s.multi) || false;

  const barRef = useRef(null);
  const row2Ref = useRef(null);

  useEffect(() => {
    const update = () => {
      const row1H = barRef.current?.offsetHeight || 0;
      const row2H = isMobile ? 0 : (row2Ref.current?.offsetHeight || 0);
      document.documentElement.style.setProperty('--topbar-total-h', `${row1H + row2H}px`);
      useStore.setState({ topbarH: row1H + row2H });
    };
    update();
    const ro1 = new ResizeObserver(update);
    barRef.current && ro1.observe(barRef.current);
    const ro2 = new ResizeObserver(update);
    row2Ref.current && !isMobile && ro2.observe(row2Ref.current);
    window.addEventListener('resize', update);
    return () => { ro1.disconnect(); ro2.disconnect && ro2.disconnect(); window.removeEventListener('resize', update); };
  }, [isMobile]);

  const [openMenu, setOpenMenu] = useState(null); // 'device' | 'theme' | 'export' | null
  useEffect(() => {
    if (isMobile) return;
    const onDoc = (e) => { if (!e.target.closest('.dropdown, .dropdown-menu')) setOpenMenu(null); };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [isMobile]);

  useMemo(() => listDevices(), []);
  useMemo(() => listThemes(), []);

  const toggle = (key) => useStore.setState(prev => ({ [key]: !prev[key] }));
  const toggleMulti = () => {
    useStore.setState(prev => {
      const next = !((prev.multiSelect ?? prev.multi) || false);
      return { multiSelect: next, multi: next };
    });
  };

  const onPickDevice = (id) => {
    setOpenMenu(null);
    if (!id) return;
    useStore.setState({ device: id });
    window.dispatchEvent(new CustomEvent('device:changed', { detail: { device: id } }));
  };
  const onPickTheme  = (id) => {
    setOpenMenu(null);
    useStore.setState({ themeId: id || null, randomPalette: id ? null : getActivePalette(null) });
  };

  // keyboard shortcuts for undo/redo on desktop
  useEffect(() => {
    const onKey = (e) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type:'UNDO' }); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); dispatch({ type:'REDO' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  /* export */
  async function runExport(mode) {
    const variant = mode === 'export-print' ? 'print'
                  : mode === 'export-transparent' ? 'transparent'
                  : 'ui';

    const state = useStore.getState();
    const title = safeTitle(state.gameTitle || 'Untitled');
    const dev   = state.device || 'Device';
    const suffix = variant === 'print' ? 'print' : (variant === 'transparent' ? 'transparent' : 'ui');
    const fileName = `${title}_${dev}_${suffix}.png`;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-100000px';
    container.style.top = '0';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(
      <div id="export-mount">
        <ExportPage mode={variant} page="letter" orientation="landscape" />
      </div>
    );

    try {
      const pageEl = await waitForNode(container, '[data-export-page-root]');
      await waitForFonts();
      await waitForImages(pageEl);

      await downloadPNG(pageEl, {
        fileName,
        scale: 2,
        bg: variant === 'print' ? '#ffffff' : undefined
      });
    } catch (err) {
      console.error(err);
      alert('Export failed: page not rendered.');
    } finally {
      root.unmount();
      container.remove();
    }
  }

  /* PDF export */
  async function runExportPDF() {
    const state = useStore.getState();
    const title = safeTitle(state.gameTitle || 'Untitled');
    const dev   = state.device || 'Device';
    const fileName = `${title}_${dev}`;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-100000px';
    container.style.top = '0';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(
      <div id="export-mount">
        <ExportPage mode="ui" page="letter" orientation="landscape" />
      </div>
    );

    try {
      const pageEl = await waitForNode(container, '[data-export-page-root]');
      await waitForFonts();
      await waitForImages(pageEl);
      await downloadPDF(pageEl, fileName);
    } catch (err) {
      console.error(err);
      alert('PDF export failed.');
    } finally {
      root.unmount();
      container.remove();
    }
  }

  function exportJSON() {
    const state = useStore.getState();
    const data = {
      gameTitle: state.gameTitle,
      device: state.device,
      themeId: state.themeId,
      randomPalette: state.randomPalette,
      keyData: state.keyData || {},
      invert: state.invert,
      showNumbers: state.showNumbers,
      showGloss: state.showGloss,
      grid: state.grid,
      snap: state.snap,
      zones: state.zones || {}
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${safeTitle(state.gameTitle || 'Untitled')}_${state.device}_project.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // File input for importing/exporting project JSON
  const projectFileRef = useRef(null);
  const [pBusy, setPBusy] = useState(false);

  async function onPickProject(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      setPBusy(true);
      const text = await file.text();
      const data = JSON.parse(text);

      const kd = (data && typeof data === 'object') ? (data.keyData || data.keys || {}) : {};
      if (kd && typeof kd !== 'object') throw new Error('Invalid JSON: keyData must be an object');

      const zones = {};
      Object.entries(kd).forEach(([id, info]) => {
        const z = info?.zone ? String(info.zone).trim() : '';
        if (z) zones[z] = Array.from(new Set([...(zones[z] || []), id]));
      });

      useStore.setState(st => {
        const nextDevice = coalesce(data.device, st.device);
        return {
          device: nextDevice,
          themeId: coalesce(data.themeId, st.themeId),
          randomPalette: ('randomPalette' in data) ? data.randomPalette : st.randomPalette,

          invert:       ('invert' in data) ? !!data.invert : st.invert,
          grid:         ('grid' in data) ? !!data.grid : st.grid,
          snap:         ('snap' in data) ? !!data.snap : st.snap,
          showNumbers:  ('showNumbers' in data) ? !!data.showNumbers : st.showNumbers,
          showGloss:    ('showGloss' in data) ? !!data.showGloss : st.showGloss,

          keys: kd || {},
          keyData: { ...(kd || {}) },
          zones: Object.keys(data.zones || {}).length ? data.zones : zones,
          selection: [],
          history: [],
          future: [],
        };
      });

      if (data.device) {
        window.dispatchEvent(new CustomEvent('device:changed', { detail: { device: data.device } }));
      }
      window.dispatchEvent(new CustomEvent('layout:reset'));
      alert(`Imported ${Object.keys((useStore.getState().keyData)||{}).length} keys${Object.keys(useStore.getState().zones||{}).length ? ' • zones loaded' : ''}.`);
    } catch (err) {
      console.error(err);
      alert('Import failed: invalid or incompatible JSON.');
    } finally {
      setPBusy(false);
      if (projectFileRef.current) projectFileRef.current.value = '';
    }
  }

  /* sheets */
  const isControlsOpen = !!s.isControlsOpen;
  const isSaveOpen     = !!s.isSaveOpen;
  const isSettingsOpen = !!s.isSettingsOpen;
  const isHelpOpen     = !!s.isHelpOpen;

  const openControls   = () => useStore.setState({ isControlsOpen: true  });
  const closeControls  = () => useStore.setState({ isControlsOpen: false });
  const openSave       = () => useStore.setState({ isSaveOpen: true      });
  const closeSave      = () => useStore.setState({ isSaveOpen: false     });
  const openSettings   = () => useStore.setState({ isSettingsOpen: true  });
  const closeSettings  = () => useStore.setState({ isSettingsOpen: false });
  const openHelp       = () => useStore.setState({ isHelpOpen: true  });
  const closeHelp      = () => useStore.setState({ isHelpOpen: false });

  const toggleControls = () => { if (isControlsOpen) return closeControls(); useStore.setState({ isSaveOpen:false, isSettingsOpen:false }); openControls(); };
  const toggleSave     = () => { if (isSaveOpen)     return closeSave();     useStore.setState({ isControlsOpen:false, isSettingsOpen:false }); openSave(); };
  const toggleSettings = () => { if (isSettingsOpen) return closeSettings(); useStore.setState({ isControlsOpen:false, isSaveOpen:false }); openSettings(); };
  const toggleHelp     = () => {
    if (isHelpOpen) return closeHelp();
    useStore.setState({ isControlsOpen:false, isSaveOpen:false, isSettingsOpen:false });
    openHelp();
  };

  const Z = 10000;
  // Reusable inline bg for overlays (fixes “no background” regardless of CSS)
  const overlayBG = {
    background: 'linear-gradient(180deg, rgba(9,12,24,.55), rgba(9,12,24,.75))',
    backdropFilter: 'blur(4px)'
  };

  const ControlsDrawer = (
    <>
      <div
        className="overlay open"
        style={{ position:'fixed', inset:0, zIndex:Z, ...overlayBG }}
        onClick={closeControls}
      />
      <div className="drawer open" role="dialog" aria-label="Controls"
           style={{ position:'fixed', inset:0, zIndex:Z+1, overflow:'auto' }}>
        <header className="sheetHeader">
          <h3>Controls</h3>
          <button className="btn mini" onClick={closeControls}>Close</button>
        </header>

        <div className="group">
          <h3>Selection &amp; Movement</h3>
          {/* Stack the toggles vertically on mobile and shrink them using the mini button style. */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <label className="btn mini"><input type="checkbox" checked={!!lock} onChange={() => toggle('lock')} /> Lock</label>
            <label className="btn mini"><input type="checkbox" checked={!!multiActive} onChange={toggleMulti} /> Multi Select</label>
            <label className="btn mini"><input type="checkbox" checked={!!snap} onChange={() => toggle('snap')} /> Snap to grid</label>
            <label className="btn mini"><input type="checkbox" checked={!!invert} onChange={() => toggle('invert')} /> Invert layout</label>
          </div>
        </div>

        <div className="group">
          <h3>Visibility</h3>
          {/* Stack the visibility toggles vertically and use mini buttons for a more compact mobile layout. */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <label className="btn mini"><input type="checkbox" checked={!!grid} onChange={() => toggle('grid')} /> Grid</label>
            <label className="btn mini"><input type="checkbox" checked={!!showGloss} onChange={() => toggle('showGloss')} /> Gloss</label>
            <label className="btn mini"><input type="checkbox" checked={!!showNumbers} onChange={() => toggle('showNumbers')} /> Numbers</label>
            <label className="btn mini"><input type="checkbox" checked={!!s.showLegend} onChange={() => toggle('showLegend')} /> Zone legend</label>
          </div>
        </div>
      </div>
    </>
  );

  const SaveExportSheet = (
    <>
      <div
        className="sheetOverlay open"
        style={{ position:'fixed', inset:0, zIndex:Z, ...overlayBG }}
        onClick={closeSave}
      />
      <div className="sheet open" role="dialog" aria-label="Save & Export"
           style={{
             position:'fixed', inset:0, zIndex:Z+1,
             overflow:'auto',
             /* Add padding to keep the sheet away from screen edges on mobile */
             padding:'12px',
             paddingBottom:'env(safe-area-inset-bottom,12px)'
           }}>
        <header className="sheetHeader">
          <h3>Save & Export</h3>
          <button className="btn mini" onClick={closeSave}>Close</button>
        </header>

        <div className="group">
          <h3>PNG</h3>
          <div className="row">
            <button className="btn" onClick={() => runExport('export-transparent')}>Transparent PNG</button>
            <button className="btn" onClick={() => runExport('export-ui')}>UI PNG</button>
            <button className="btn" onClick={() => runExport('export-print')}>Print-safe PNG</button>
          </div>
        </div>
        <div className="group">
          <h3>PDF</h3>
          <div className="row">
            <button className="btn" onClick={runExportPDF}>Export PDF</button>
          </div>
        </div>
        <div className="group">
          <h3>Project</h3>
          <div className="row">
            <button className="btn" onClick={exportJSON}>Export Project JSON</button>
            <button className="btn" onClick={() => projectFileRef.current?.click()}>
              {pBusy ? 'Reading project…' : 'Import Project JSON…'}
            </button>
            <input
              ref={projectFileRef}
              type="file"
              accept="application/json,.json"
              onChange={onPickProject}
              style={{ display:'none' }}
            />
          </div>
        </div>
      </div>
    </>
  );

  const SettingsSheet = (
    <>
      <div
        className="sheetOverlay open"
        style={{ position:'fixed', inset:0, zIndex:Z, ...overlayBG }}
        onClick={closeSettings}
      />
      <div className="sheet open" role="dialog" aria-label="Project Settings"
           style={{
             position:'fixed', inset:0, zIndex:Z+1,
             overflow:'auto',
             padding:'12px',
             paddingBottom:'env(safe-area-inset-bottom,12px)'
           }}>
        <header className="sheetHeader">
          <h3>Project Settings</h3>
          <button className="btn mini" onClick={closeSettings}>Close</button>
        </header>
        <ProjectSettings isMobile={isMobile} />
      </div>
    </>
  );

  const HelpSheet = (
    <>
      <div
        className="sheetOverlay open"
        style={{ position:'fixed', inset:0, zIndex:Z, ...overlayBG }}
        onClick={closeHelp}
      />
      <div
        className="sheet open"
        role="dialog"
        aria-label="Help & Instructions"
        style={{
          position:'fixed', inset:0, zIndex:Z+1,
          overflow:'auto',
          padding:'12px',
          paddingBottom:'env(safe-area-inset-bottom,12px)'
        }}
      >
        <header className="sheetHeader">
          <h3>Help &amp; Instructions</h3>
          <button className="btn mini" onClick={closeHelp}>Close</button>
        </header>
        <div className="group" style={{ maxHeight:'calc(100vh - 160px)', overflowY:'auto', paddingRight:8 }}>
          <div style={{ whiteSpace:'normal', lineHeight:1.4 }}>
            <h4>Getting Started</h4>
            <p>This application lets you design and customize keymaps for various gaming devices. You can arrange keys, assign actions, set colors and icons, and export your layout as an image or project file.</p>

            <h4>Editing the Title and Layout</h4>
            <p>At the top of the screen you can enter a title for your project. Use the <strong>Device</strong> dropdown to choose a layout (e.g. Cyro or Cyborg) and the <strong>Theme</strong> dropdown to select a predefined color palette. You can also randomize the current palette using the <em>Randomize&nbsp;Colors</em> button.</p>

            <h4>Selecting and Moving Keys</h4>
            <p>Click on a key to select it. Hold <kbd>Shift</kbd> or enable <em>Multi&nbsp;Select</em> to select multiple keys. Drag selected keys to reposition them. Enable <em>Snap</em> to align keys to the grid. Toggle <em>Lock</em> to prevent accidental movement.</p>

            <h4>Editing Key Details</h4>
            <p>The panel on the right shows details for the selected key. You can set a <strong>Label</strong> (primary action), a <strong>Subtitle</strong> (secondary description), choose a <strong>Zone</strong> to group keys, pick a <strong>Color</strong>, and assign an <strong>Emoji</strong> or <strong>Icon</strong>. You can also upload an image and choose how it fits inside the key.</p>

            <h4>Copying and Pasting</h4>
            <p>Right-click a key (long-press on mobile) to open the context menu. Use <em>Copy</em> to store the selected key’s visual properties. You can then select other keys and choose <em>Paste&nbsp;Emoji</em>, <em>Paste&nbsp;Color</em>, <em>Paste&nbsp;Image</em>, <em>Paste&nbsp;Icon</em>, or <em>Paste&nbsp;All</em> to apply those attributes. Pasting labels and subtitles is currently under development. To apply the same title to multiple keys, enable <em>Multi&nbsp;Select</em>, type the title once, then turn off Multi&nbsp;Select and edit each key individually (e.g., type “attack” with multi select on, then untoggle and refine to “attack&nbsp;1,” “attack&nbsp;2,” etc.). You can clone an entire key’s appearance (except title and subtitle) by choosing <em>Paste&nbsp;All</em>.</p>

            <h4>Undo and Redo</h4>
            <p>Use the <em>Undo</em> and <em>Redo</em> buttons in the top bar (or bottom-left on mobile) to step backward or forward through your editing history.</p>

            <h4>Visibility Options</h4>
            <p>The second row of the top bar provides toggles for grid visibility, glossy shading, key numbers, and inverting the layout. You can also enable or disable the on-screen zone legend.</p>

            <h4>Importing and Exporting</h4>
            <p>Use the <em>Export&nbsp;/&nbsp;Project</em> dropdown to export your layout as a transparent image, a UI image, or a print-safe image. You can also export your work as a project JSON file and import it again later using <em>Import&nbsp;Project&nbsp;JSON…</em>. Project JSON files contain your key positions, colors and labels.</p>

            <h4>Zoom and Pan</h4>
            <p>Use the mouse wheel or pinch to zoom in and out of your layout. Click and drag with the middle mouse button (or press the spacebar and drag) to pan around the canvas. A small overlay shows your current zoom level.</p>

            <h4>Zones and Legend</h4>
            <p>Keys can be grouped into named <em>zones</em>. In the key details panel the Zone field shows a drop-down list of existing zones; selecting one will automatically apply the zone’s color to the key. You can also type a new zone name to create a new group. Enable the <em>Zone legend</em> toggle to display a color-coded legend that summarizes all zones.</p>

            <h4>Analog Stick</h4>
            <p>Layouts with an analog stick show a central circular control. You can assign directions (e.g., W/A/S/D) and adjust its appearance. Double-tap or long-press the analog directions to configure advanced options.</p>

            <h4>Mobile Tips</h4>
            <p>On small screens the toolbar collapses into a mobile header. Tap <em>Menu</em> for controls, <em>Save</em> to export your work or import a project, and <em>Settings</em> for project settings. Long-press a key to open the context menu for copy/paste operations.</p>

            <h4>General Tips</h4>
            <ul>
              <li>You can pan and zoom freely to fit the entire layout on screen or focus on specific keys.</li>
              <li>Use the <em>Invert</em> toggle to mirror the layout horizontally.</li>
              <li>Random palettes are stored in your project; export and import projects to share layouts with others.</li>
              <li>The application automatically tracks your edits, so feel free to experiment knowing you can undo.</li>
            </ul>

            <p style={{ marginTop:12 }}>We hope you enjoy creating your custom keymaps! If something isn’t working as expected, try refreshing the page or starting a new project.</p>
          </div>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div ref={barRef} className="topbarWrap">
        <div className="mobileHeader">
          {/* SVG icon buttons on mobile */}
          <button className="iconbtn" aria-label="Menu" title="Menu" onClick={toggleControls}>
            <SvgHamburger />
          </button>
          <input
            className="input titleInput"
            value={s.gameTitle || ''}
            onChange={(e) => useStore.setState({ gameTitle: e.target.value })}
            placeholder="Title"
            aria-label="Game title"
          />
          <button className="iconbtn" aria-label="Save / Export" title="Save / Export" onClick={toggleSave}>
            <SvgSave />
          </button>
          <button className="iconbtn" aria-label="Settings" title="Settings" onClick={toggleSettings}>
            <SvgGear />
          </button>
          <button className="iconbtn" aria-label="Help" title="Help" onClick={toggleHelp}>
            <SvgQuestion />
          </button>
        </div>

        {isControlsOpen && createPortal(ControlsDrawer, document.body)}
        {isSaveOpen && createPortal(SaveExportSheet, document.body)}
        {isSettingsOpen && createPortal(SettingsSheet, document.body)}
        {isHelpOpen && createPortal(HelpSheet, document.body)}
      </div>
    );
  }

  return (
    <div className="topbarWrap">
      <div ref={barRef} className="toolbar toolbar--absCenter">
        <div className="toolbarLeft">
          <img src={logo} alt="Logo" className="app-logo" />
        </div>

        <div className="toolbarCenterAbs">
          <input
            className="input title-input"
            value={s.gameTitle || ''}
            onChange={(e) => useStore.setState({ gameTitle: e.target.value })}
            placeholder="Title of your game"
            aria-label="Game title"
            style={{ flex: '1 1 560px', minWidth: 320, maxWidth: 960 }}
          />

          <DesktopDropdown
            label={`Device: ${ (Array.isArray(LAYOUTS) ? LAYOUTS : []).find(d => (d.id||d.name) === device)?.name || device }`}
            open={openMenu === 'device'}
            onToggle={() => setOpenMenu(openMenu === 'device' ? null : 'device')}
            minWidth={200}
          >
            {listDevices().map(d => (
              <MenuItem key={d.id} active={d.id === device} onClick={() => onPickDevice(d.id)}>{d.name}</MenuItem>
            ))}
          </DesktopDropdown>

          <DesktopDropdown
            label={`Theme: ${ (THEMES || []).find(t => t.id === themeId)?.name || themeId || 'Custom' }`}
            open={openMenu === 'theme'}
            onToggle={() => setOpenMenu(openMenu === 'theme' ? null : 'theme')}
            minWidth={220}
          >
            <MenuItem active={!themeId} onClick={() => onPickTheme(null)}>Custom</MenuItem>
            <hr />
            {(THEMES || []).map(t => {
              const swatches = t.keys ? t.keys.split(',').slice(0, 5).map(c => c.trim()) : [];
              return (
                <MenuItem key={t.id} active={t.id === themeId} onClick={() => onPickTheme(t.id)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <span style={{ display: 'flex', gap: 2 }}>
                      {swatches.map((color, i) => (
                        <span
                          key={i}
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: color,
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                        />
                      ))}
                    </span>
                    <span>{t.name}</span>
                  </span>
                </MenuItem>
              );
            })}
          </DesktopDropdown>

          <DesktopDropdown
            label="Export / Project"
            open={openMenu === 'export'}
            onToggle={() => setOpenMenu(openMenu === 'export' ? null : 'export')}
            minWidth={240}
          >
            <MenuItem onClick={() => runExport('export-transparent')}>Transparent PNG</MenuItem>
            <MenuItem onClick={() => runExport('export-ui')}>UI PNG</MenuItem>
            <MenuItem onClick={() => runExport('export-print')}>Print-safe PNG</MenuItem>
            <MenuItem onClick={runExportPDF}>Export PDF</MenuItem>
            <hr />
            <MenuItem onClick={exportJSON}>Export Project JSON</MenuItem>
            <MenuItem onClick={() => projectFileRef.current?.click()}>
              {pBusy ? 'Reading project…' : 'Import Project JSON…'}
            </MenuItem>
          </DesktopDropdown>
        </div>

        {/* Undo/Redo + Help on the far right (desktop) */}
        <div className="toolbarRight">
          <button
            className="btn mini"
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!(s.history && s.history.length)}
            title="Undo"
            aria-label="Undo"
          >
            Undo
          </button>
          <button
            className="btn mini"
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={!(s.future && s.future.length)}
            title="Redo"
            aria-label="Redo"
          >
            Redo
          </button>
          <button
            className="btn mini"
            onClick={toggleHelp}
            title="Help & Instructions"
            aria-label="Help"
          >
            <SvgQuestion />
          </button>
        </div>
      </div>

      <div ref={row2Ref} className="controlsStrip">
        <div className="controlsCenter" style={{ gap: 8 }}>
          <Toggle label="Lock"   checked={!!lock}        onChange={() => toggle('lock')} />
          <Toggle label="Multi Select" checked={!!multiActive} onChange={toggleMulti} />
          <Toggle label="Snap"   checked={!!snap}        onChange={() => toggle('snap')} />
          <Toggle label="Grid"   checked={!!grid}        onChange={() => toggle('grid')} />
          <Toggle label="Gloss"  checked={!!showGloss}   onChange={() => toggle('showGloss')} />
          <Toggle label="#"      checked={!!showNumbers} onChange={() => toggle('showNumbers')} />
          <Toggle label="Invert" checked={!!invert}      onChange={() => toggle('invert')} />

          <button
            className="btn"
            onClick={() => {
              const pal = getActivePalette(themeId);
              useStore.setState({
                randomPalette: pal.slice().sort(() => Math.random() - 0.5),
                themeId: null
              });
            }}
          >
            Randomize Colors
          </button>
        </div>
      </div>

      {/* Hidden project import input (desktop) */}
      <input
        ref={projectFileRef}
        type="file"
        accept="application/json,.json"
        onChange={onPickProject}
        style={{ display:'none' }}
      />

      {/* Help panel portal (desktop & mobile) */}
      {isHelpOpen && createPortal(HelpSheet, document.body)}
    </div>
  );
}

/* UI bits */
function Toggle({ label, checked, onChange }) {
  return (
    <label className="btn" style={{ display:'inline-flex', alignItems:'center', gap:8, cursor:'pointer', whiteSpace:'nowrap' }}>
      <input type="checkbox" checked={!!checked} onChange={onChange} style={{ width:16, height:16, accentColor:'#6aa8ff' }} />
      <span>{label}</span>
    </label>
  );
}
function DesktopDropdown({ label, open, onToggle, children, minWidth=200 }) {
  return (
    <div className="dropdown" style={{ whiteSpace:'nowrap' }}>
      <button className="btn" onClick={onToggle} style={{ minWidth, whiteSpace:'nowrap' }}>
        {label} <span className="chev">▾</span>
      </button>
      {open && <Menu onClose={onToggle}>{children}</Menu>}
    </div>
  );
}
function Menu({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="dropdown-menu" role="menu">{children}</div>;
}
function MenuItem({ children, active=false, onClick }) {
  const st = active ? { filter:'brightness(1.08)', outline:'1px solid rgba(138,107,255,.35)' } : null;
  return <button className="btn" style={{ width:'100%', justifyContent:'flex-start', ...st }} onClick={onClick}>{children}</button>;
}

/* ---------- SVG Icons (inherit currentColor) ---------- */
const iconProps = { width:20, height:20, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:2, strokeLinecap:"round", strokeLinejoin:"round" };

function SvgHamburger(){
  return (
    <svg {...iconProps} aria-hidden="true">
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function SvgSave(){
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}
function SvgGear(){
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.11.73 1.77.73h.09a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function SvgQuestion(){
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
