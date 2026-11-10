"use client";

import { useRef, useState } from "react";
import "./import.css";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const encoder = new TextEncoder();
const formats = new Set(["zip", "rar", "7z", "yft", "ytd", "ydr", "ydd", "ybn", "ymap", "ytyp", "meta", "xml", "obj", "fbx", "gltf", "glb", "png", "jpg", "jpeg", "dds", "tga"]);
const archiveMimeTypes = new Set(["application/zip", "application/x-zip-compressed", "application/x-compressed", "application/octet-stream", "application/vnd.rar", "application/x-7z-compressed"]);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function write16(view, offset, value) { view.setUint16(offset, value, true); }
function write32(view, offset, value) { view.setUint32(offset, value, true); }

// Browser-native STORE ZIP writer. The uploaded source archive is retained as-is inside the output bundle.
function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(entry.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    write32(lv, 0, 0x04034b50); write16(lv, 4, 20); write16(lv, 6, 0x0800); write16(lv, 8, 0);
    write16(lv, 10, dosTime); write16(lv, 12, dosDate); write32(lv, 14, crc);
    write32(lv, 18, data.length); write32(lv, 22, data.length); write16(lv, 26, name.length); write16(lv, 28, 0);
    local.set(name, 30); localParts.push(local, data);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    write32(cv, 0, 0x02014b50); write16(cv, 4, 20); write16(cv, 6, 20); write16(cv, 8, 0x0800);
    write16(cv, 10, 0); write16(cv, 12, dosTime); write16(cv, 14, dosDate); write32(cv, 16, crc);
    write32(cv, 20, data.length); write32(cv, 24, data.length); write16(cv, 28, name.length); write16(cv, 30, 0);
    write16(cv, 32, 0); write16(cv, 34, 0); write16(cv, 36, 0); write32(cv, 38, 0); write32(cv, 42, offset);
    central.set(name, 46); centralParts.push(central); offset += local.length + data.length;
  }
  const directorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  write32(ev, 0, 0x06054b50); write16(ev, 4, 0); write16(ev, 6, 0);
  write16(ev, 8, entries.length); write16(ev, 10, entries.length); write32(ev, 12, directorySize);
  write32(ev, 16, offset); write16(ev, 20, 0);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}
function slug(value) { return value.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "FarmMod"; }
function sizeLabel(bytes) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function Icon({ children, className = "" }) { return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{children}</span>; }
function isAccepted(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  // Some Windows/browser combinations report ZIPs as application/octet-stream (or no MIME at all).
  return formats.has(ext) || archiveMimeTypes.has(file.type);
}

export default function ImportPage() {
  const inputRef = useRef(null);
  const [tab, setTab] = useState("Cars");
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  function selectFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const invalid = incoming.find((file) => !isAccepted(file));
    if (invalid) {
      setMessage(`${invalid.name}: unsupported format. Try a .zip FiveM resource, .rar/.7z archive, GTA asset, model, or texture file.`);
      return;
    }
    setFiles((existing) => {
      const next = [...existing];
      for (const file of incoming) if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file);
      return next;
    });
    setMessage(""); setDownloadUrl(""); setCompleted(false);
  }

  async function createBundle() {
    if (!files.length || processing) return;
    setProcessing(true); setMessage("");
    try {
      const modName = slug(name || files[0].name.replace(/\.[^.]+$/, ""));
      const entries = [];
      for (const file of files) {
        const path = file.webkitRelativePath || file.name;
        const safePath = path.split(/[\\/]/).filter((part) => part && part !== "." && part !== "..").join("/");
        entries.push({ name: `source-files/${safePath}`, data: new Uint8Array(await file.arrayBuffer()) });
      }
      const manifest = {
        packageName: modName,
        packageType: "FiveM-to-FS25 conversion source bundle",
        status: "source_bundle_only_not_a_playable_fs25_mod",
        source: "GTA V / FiveM",
        target: "Farming Simulator 25",
        assetCategory: tab,
        inputFiles: files.map((file) => ({ name: file.webkitRelativePath || file.name, sizeBytes: file.size, archive: /\\.(zip|rar|7z)$/i.test(file.name) })),
        conversionNotes: "Uploaded archives are preserved intact in source-files/. This browser-only version does not extract RAR/7z or convert proprietary GTA model formats into Giants I3D. A compatible model conversion, FS25-specific rigging/configuration, and in-game validation are still required.",
      };
      const readme = `${modName} — FS25 CONVERSION SOURCE BUNDLE\n${"=".repeat(55)}\n\nAsset type: ${tab}\nSource: GTA V / FiveM\nTarget: Farming Simulator 25\n\nCONTENTS\n- source-files/ : uploaded files and resource archives, preserved in original format\n- conversion-manifest.json : bundle details and source file list\n\nARCHIVES\nZIP, RAR, and 7z files are accepted and copied into source-files/ intact. They are not extracted by this browser-only tool.\n\nIMPORTANT — THIS IS NOT A PLAYABLE FS25 MOD\nThis free tool organizes your files into a ZIP. It does not convert GTA proprietary model files into Giants I3D or install anything into the game. A real mod still needs model conversion, FS25-specific setup, and testing.\n\nOnly use source assets you own or have permission to modify and redistribute.\n`;
      entries.push({ name: "README-conversion.txt", data: readme });
      entries.push({ name: "conversion-manifest.json", data: JSON.stringify(manifest, null, 2) });
      const blob = makeZip(entries);
      setDownloadUrl(URL.createObjectURL(blob)); setCompleted(true);
    } catch (error) {
      setMessage(`Could not create ZIP: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally { setProcessing(false); }
  }

  const modName = slug(name || files[0]?.name?.replace(/\.[^.]+$/, "") || "My_Farm_Mod");

  return (
    <main className="xv-shell">
      <header className="xv-header">
        <a href="/import" className="xv-brand"><span className="brand-mark">FF</span><span className="brand-title">FIELD<span>FORGE</span><small>FREE COMMUNITY CONVERTER</small></span></a>
        <nav className="game-tabs" aria-label="Asset type">{["Cars", "Players", "Props"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <div className="header-status"><span className="ready-dot" /> LOCAL WORKSPACE <span className="header-menu"><Icon>settings</Icon></span></div>
      </header>
      <div className="xv-layout">
        <section className="converter-area">
          <div className="converter-title"><span className="eyebrow">OPEN SOURCE · NO SUBSCRIPTION</span><h1>GTA <span className="arrow">→</span> FARMING SIMULATOR 25</h1><p>Prepare your FiveM assets for a Farming Simulator modding workflow.</p></div>
          <div className={`drop-workspace ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFiles(event.dataTransfer.files); }}>
            <div className="drop-instructions"><div className="upload-icon"><Icon>drive_folder_upload</Icon></div><h2>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} added` : "Drop to prepare"}</h2><p>Drop a FiveM resource, GTA asset, or model files</p><small>.zip · .rar · .7z · .yft · .ytd · .fbx · .obj · .glb</small><button className="browse-button" onClick={() => inputRef.current?.click()}><Icon>folder_open</Icon> Browse files</button>
              <input ref={inputRef} className="visually-hidden" type="file" multiple accept=".zip,.rar,.7z,application/zip,application/x-zip-compressed,application/octet-stream,.yft,.ytd,.ydr,.ydd,.ybn,.ymap,.ytyp,.meta,.xml,.obj,.fbx,.gltf,.glb,.png,.jpg,.jpeg,.dds,.tga" onChange={(event) => { selectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
            </div>
            <div className="queue-area"><div className="queue-heading"><span>INPUT QUEUE</span><span>{files.length} FILES</span></div>
              {files.length ? <div className="queue-list">{files.map((file, index) => <div className="queue-item" key={`${file.name}-${file.size}-${index}`}><Icon>{/\.(zip|rar|7z)$/i.test(file.name) ? "folder_zip" : "description"}</Icon><span><b>{file.webkitRelativePath || file.name}</b><small>{sizeLabel(file.size)} · {/\.(zip|rar|7z)$/i.test(file.name) ? "archive accepted" : "source file"}</small></span><button aria-label={`Remove ${file.name}`} onClick={() => { setFiles((current) => current.filter((_, i) => i !== index)); setDownloadUrl(""); setCompleted(false); }}><Icon>close</Icon></button></div>)}</div> : <div className="queue-empty"><Icon>folder_open</Icon><span>Your selected files will appear here</span></div>}
              {message && <div className="queue-error" role="alert"><Icon>error</Icon>{message}</div>}
            </div>
          </div>
          <div className="asset-type-row"><span>ASSET TYPE</span>{["Vehicles", "Trucks", "Props", "Characters"].map((item) => <button key={item} className={`asset-chip ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>{item}</button>)}</div>
          <div className="prepare-row"><label className="mod-name-label">PACKAGE NAME<input value={name} onChange={(event) => { setName(event.target.value); setDownloadUrl(""); setCompleted(false); }} placeholder="My_Farm_Mod" maxLength={70} /></label><button className="convert-button" disabled={!files.length || processing} onClick={createBundle}><Icon>{processing ? "progress_activity" : "folder_zip"}</Icon>{processing ? "Building ZIP…" : "Build free source ZIP"}<Icon>arrow_forward</Icon></button></div>
          {completed && downloadUrl && <div className="result-card" role="status"><div className="result-icon"><Icon>check_circle</Icon></div><div><b>Source bundle ready</b><span>Your uploaded files—including ZIP archives—are included intact. This is not a playable FS25 mod.</span></div><a href={downloadUrl} download={`${modName}_FS25_source_bundle.zip`}><Icon>download</Icon> Download ZIP</a></div>}
          <div className="capability-note"><Icon>info</Icon><span><b>Free and transparent:</b> ZIP/RAR/7z archives are accepted and retained intact in your output bundle. This browser-only version does not unpack archives or convert GTA models to Giants I3D.</span></div>
        </section>
        <aside className="xv-guide"><div className="guide-title"><span>HOW IT WORKS</span><Icon>more_horiz</Icon></div><ol><li><b>Drop the asset</b><p>ZIP resource archives are accepted; drag one in or browse to select it.</p></li><li><b>Choose its type</b><p>Pick a vehicle, truck, character, or prop to label the bundle.</p></li><li><b>Build your ZIP</b><p>Download a local source bundle with the originals and a conversion checklist.</p></li></ol><div className="guide-rule" /><div className="guide-title"><span>WHAT'S IN THE ZIP</span></div><div className="zip-tree"><div><Icon>folder_zip</Icon><b>{modName}_FS25_source_bundle.zip</b></div><span>├─ source-files/ <small>originals + archives</small></span><span>├─ README-conversion.txt <small>next steps</small></span><span>└─ conversion-manifest.json <small>asset info</small></span></div><div className="guide-warning"><Icon>construction</Icon><p><b>Not playable yet</b>FS25 needs an I3D model, game-specific setup and testing. This free web build creates an organized source ZIP—not automatic model conversion.</p></div><div className="guide-footer">FILES STAY IN YOUR BROWSER <Icon>lock</Icon></div></aside>
      </div>
    </main>
  );
}
