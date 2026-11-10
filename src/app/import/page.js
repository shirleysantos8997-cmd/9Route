"use client";

import { useRef, useState } from "react";
import "./import.css";

const supportedExtensions = ["zip", "rar", "7z", "yft", "ydr", "ytd", "obj", "fbx", "gltf", "glb"];
const featureList = [
  { icon: "view_in_ar", title: "Vehicle model", detail: "Main body & materials" },
  { icon: "tire_repair", title: "Wheels & suspension", detail: "Separate wheel setup" },
  { icon: "chair", title: "Cabin & interior", detail: "Interior mesh detection" },
  { icon: "lightbulb", title: "Lights & doors", detail: "Animatable parts" },
  { icon: "speed", title: "Farm physics", detail: "Vehicle configuration" },
];

function Icon({ children, className = "" }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportPage() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("FiveM");
  const [checked, setChecked] = useState(false);
  const [engineNotice, setEngineNotice] = useState(false);

  function acceptFile(nextFile) {
    if (!nextFile) return;
    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (!supportedExtensions.includes(extension)) {
      setMessage("That file type isn’t supported yet. Try a vehicle archive or a 3D model file.");
      return;
    }
    setFile(nextFile);
    setChecked(false);
    setMessage("");
  }

  function runCheck() {
    if (!file) return;
    setChecked(true);
    setEngineNotice(true);
  }

  return (
    <main className="forge-shell">
      <aside className="forge-sidebar">
        <a className="forge-brand" href="/import" aria-label="FieldForge home">
          <span className="forge-brand-mark"><Icon>agriculture</Icon></span>
          <span>field<span>forge</span><small>VEHICLE WORKSHOP</small></span>
        </a>
        <div className="forge-nav-label">WORKSPACE</div>
        <nav className="forge-nav" aria-label="Workspace">
          <a className="forge-nav-item active" href="#converter"><Icon>add_box</Icon>New conversion</a>
          <a className="forge-nav-item" href="#library"><Icon>inventory_2</Icon>My conversions <span className="nav-count">0</span></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><span className="help-icon"><Icon>help</Icon></span><strong>First time here?</strong><p>Prep your vehicle files before bringing them into the workshop.</p><a href="#guide">Read the quick guide <Icon>arrow_forward</Icon></a></div>
          <div className="sidebar-profile"><div className="profile-avatar">F</div><div><strong>Local workspace</strong><small>Files stay on this device</small></div><Icon className="profile-more">more_horiz</Icon></div>
        </div>
      </aside>

      <section className="forge-main" id="converter">
        <header className="forge-topbar"><div className="breadcrumbs">Workspace <Icon>chevron_right</Icon> <strong>New conversion</strong></div><div className="topbar-right"><span className="prototype-pill"><span /> WORKSPACE PREVIEW</span><button className="icon-button" aria-label="Help"><Icon>help</Icon></button></div></header>
        <div className="forge-content">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE VEHICLE WORKSHOP</div><h1>Bring your ride<br className="mobile-break" /> <span>to the farm.</span></h1><p className="heading-copy">Turn a vehicle from GTA V or FiveM into a Farming Simulator 25 mod—starting with your source files.</p></div><div className="heading-stamp"><Icon>agriculture</Icon><span>BUILT FOR<br />THE BACKROADS</span></div></div>

          <div className="workflow" aria-label="Conversion workflow"><div className="workflow-step current"><span>01</span><div><b>Source files</b><small>Bring your vehicle</small></div></div><div className="workflow-connector" /><div className="workflow-step"><span>02</span><div><b>Configure</b><small>Choose your setup</small></div></div><div className="workflow-connector" /><div className="workflow-step"><span>03</span><div><b>Build your mod</b><small>Ready for the farm</small></div></div></div>

          <div className="work-grid">
            <section className="panel source-panel">
              <div className="panel-title-row"><div><div className="section-kicker">STEP 01 <span>·</span> SOURCE</div><h2>Start with your vehicle</h2><p className="panel-description">Choose where your vehicle came from, then add its files.</p></div><span className="step-number">01</span></div>
              <div className="source-select-label">VEHICLE SOURCE</div>
              <div className="source-options" role="group" aria-label="Vehicle source">
                {[{ name: "FiveM", icon: "deployed_code" }, { name: "GTA V", icon: "sports_esports" }, { name: "3D model", icon: "view_in_ar" }].map((item) => <button key={item.name} className={`source-option ${source === item.name ? "selected" : ""}`} onClick={() => setSource(item.name)} aria-pressed={source === item.name}><Icon>{item.icon}</Icon><span>{item.name}</span>{source === item.name && <Icon className="source-check">check_circle</Icon>}</button>)}
              </div>
              <input ref={inputRef} className="visually-hidden" type="file" accept=".zip,.rar,.7z,.yft,.ydr,.ytd,.obj,.fbx,.gltf,.glb" onChange={(event) => acceptFile(event.target.files?.[0])} />
              <div className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}>
                {file ? <div className="file-ready"><div className="file-icon"><Icon>inventory_2</Icon></div><div className="file-meta"><strong>{file.name}</strong><span>{formatSize(file.size)} <i /> {source} source</span></div><button className="remove-file" onClick={() => { setFile(null); setChecked(false); setMessage(""); }} aria-label="Remove file"><Icon>close</Icon></button></div> : <><div className="upload-symbol"><Icon>upload_file</Icon><span><Icon>add</Icon></span></div><strong className="drop-title">Drop your vehicle files here</strong><span className="drop-subtitle">or <button className="browse-link" onClick={() => inputRef.current?.click()}>browse files</button> on your computer</span><div className="file-types"><span>.ZIP</span><span>.YFT</span><span>.YDR</span><span>.FBX</span><span>.GLB</span><span>+5</span></div></>}
              </div>
              {message && <p className="upload-error" role="alert"><Icon>error</Icon>{message}</p>}
              <div className="privacy-note"><Icon>lock</Icon><span>Your files stay in this browser in this preview. Only upload assets you have permission to use.</span></div>
              <div className="panel-divider" />
              <div className="what-we-look-for"><div className="subhead">WHAT WE’LL LOOK FOR <span>5 checks</span></div><div className="feature-grid">{featureList.map((item) => <div className="feature-item" key={item.title}><Icon>{item.icon}</Icon><div><b>{item.title}</b><small>{item.detail}</small></div><Icon className="feature-status">{file && checked ? "check_circle" : "radio_button_unchecked"}</Icon></div>)}</div></div>
              <button className="check-button" onClick={runCheck} disabled={!file}><span>{checked ? "Check complete" : "Check my source files"}</span><Icon>{checked ? "check_circle" : "arrow_forward"}</Icon></button>
              {checked && <div className="check-result" role="status"><Icon>info</Icon><span><b>Source added.</b> This preview can verify the file type, but the conversion engine isn’t connected yet.</span></div>}
            </section>

            <aside className="side-column">
              <section className="panel destination-panel"><div className="section-kicker">YOUR DESTINATION</div><div className="destination-game"><div className="game-mark"><Icon>agriculture</Icon></div><div><h3>Farming Simulator 25</h3><span><i className="online-dot" /> MOD TARGET <b>·</b> PC</span></div><Icon className="verified-icon">verified</Icon></div><div className="destination-divider" /><div className="destination-foot"><Icon>storefront</Icon><span>Made for your garage<br /><b>Ready to find in the in-game shop</b></span></div></section>
              <section className="preview-card"><div className="preview-top"><span><i /> YOUR NEXT FARM RIDE</span><Icon>more_horiz</Icon></div><div className="vehicle-art" aria-label="Illustration of a farm pickup truck"><div className="sun-glow" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="road" /><svg viewBox="0 0 440 180" role="img" aria-label="Pickup truck illustration" className="pickup-svg"><ellipse cx="229" cy="150" rx="154" ry="13" fill="#13231d" opacity=".18"/><path d="M77 119h26l15-40c3-8 9-12 18-12h92l33 33h73c14 0 23 8 26 19l7 23H74z" fill="#bd6339"/><path d="M136 73h88l27 30H122l10-25c1-3 2-5 4-5" fill="#d68b53"/><path d="M146 78h34v20h-45l6-15c1-3 2-5 5-5m42 0h32l19 20h-51z" fill="#a8c4ba"/><path d="M224 68h24l33 32h-17z" fill="#e6aa6c"/><path d="M257 105h79c9 0 16 6 19 14l4 15h-96z" fill="#a75032"/><path d="M107 117h35v17h-42z" fill="#e6b36f"/><path d="M110 109h20v7h-20z" fill="#ffe3a3"/><path d="M354 115h17v8h-17z" fill="#f0926b"/><path d="M165 88h38v3h-38zm58 21h49v3h-49z" fill="#793d2b" opacity=".55"/><circle cx="145" cy="137" r="24" fill="#27342d"/><circle cx="145" cy="137" r="14" fill="#d5c6a5"/><circle cx="145" cy="137" r="7" fill="#63736a"/><circle cx="325" cy="137" r="24" fill="#27342d"/><circle cx="325" cy="137" r="14" fill="#d5c6a5"/><circle cx="325" cy="137" r="7" fill="#63736a"/><path d="M278 105v28m5-24h42" stroke="#e9b879" strokeWidth="2" opacity=".6"/></svg><div className="art-caption">YOUR BUILD STARTS HERE <span>✳</span></div></div><div className="preview-bottom"><span><Icon>tune</Icon> YOUR BUILD, YOUR RULES</span><small>MODEL · WHEELS · CABIN · LIGHTS</small></div></section>
              <div className="reality-note"><span className="note-icon"><Icon>tips_and_updates</Icon></span><p><b>A little workshop honesty</b>This is an early interface preview. Turning game assets into a working FS25 vehicle needs proper model conversion, rigging, testing, and asset permissions.</p></div>
            </aside>
          </div>
          <footer className="forge-footer"><span>FIELD<span>FORGE</span> <i>·</i> MADE FOR THE MODDING COMMUNITY</span><a id="guide" href="#converter">Need a hand? <Icon>arrow_outward</Icon></a></footer>
        </div>
      </section>

      {engineNotice && <div className="notice-backdrop" role="presentation" onClick={() => setEngineNotice(false)}><div className="notice-dialog" role="dialog" aria-modal="true" aria-labelledby="notice-title" onClick={(event) => event.stopPropagation()}><button className="notice-close" onClick={() => setEngineNotice(false)} aria-label="Close"><Icon>close</Icon></button><div className="notice-badge"><Icon>construction</Icon></div><div className="section-kicker">WORKSHOP PREVIEW</div><h2 id="notice-title">Your vehicle is in the bay.</h2><p><b>{file?.name}</b> is ready for the next step. The conversion and one-click installer are not available in this UI preview yet.</p><div className="notice-next"><Icon>checklist</Icon><span><b>Next up</b><small>Connect a 3D conversion pipeline, FS25 mod packaging, and a local game install helper.</small></span></div><button className="notice-action" onClick={() => setEngineNotice(false)}>Back to the workshop <Icon>arrow_forward</Icon></button></div></div>}
    </main>
  );
}
