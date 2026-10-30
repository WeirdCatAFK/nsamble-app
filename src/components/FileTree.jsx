import { useState, useRef } from "react";
import { files as filesApi } from "../api/client";
import "./FileTree.css";

const ICONS = {
  stl: "&#x25B3;",
  scad: "&#x2B21;",
  png: "&#x25A3;",
  svg: "&#x25C7;",
  json: "&#x007B;",
  kicad_sch: "&#x2393;",
  kicad_pcb: "&#x25A6;",
  gbr: "&#x25CE;",
  drl: "&#x25CE;",
  ino: "&#x2699;",
  ini: "&#x2699;",
  cpp: "&#x2699;",
  default: "&#x25A1;",
};

function ext(filename) {
  if (!filename) return "";
  const dot = filename.lastIndexOf(".");
  return dot > -1 ? filename.slice(dot + 1).toLowerCase() : "";
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function FileTree({ files, onSelect, activeFileId, projectId, onFilesUpdated }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setUploading(true);
    try {
      const isStl = file.name.toLowerCase().endsWith(".stl");
      await filesApi.upload(projectId, file, { createPart: isStl });
      const list = await filesApi.list(projectId);
      onFilesUpdated?.(list);
    } catch {
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const grouped = {};
  for (const file of files) {
    const e = ext(file.name) || "other";
    if (!grouped[e]) grouped[e] = [];
    grouped[e].push(file);
  }

  return (
    <>
      <div className="panel-header">
        <span className="label">Files</span>
        <div className="file-header-right">
          {files.length > 0 && <span className="file-count">{files.length}</span>}
          {projectId && (
            <label className="upload-btn" title="Upload file">
              {uploading ? "..." : "⇡"}
              <input
                ref={inputRef}
                type="file"
                accept=".stl,.obj,.scad,.kicad_sch,.kicad_pcb,.gbr,.ino"
                onChange={handleUpload}
                hidden
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>
      <div className="panel-body file-tree">
        {!projectId && (
          <div className="file-empty">No project yet. Start a conversation.</div>
        )}
        {projectId && files.length === 0 && (
          <div className="file-empty">No files generated yet.</div>
        )}
        {Object.entries(grouped).map(([type, group]) => (
          <div key={type} className="file-group">
            <div className="file-group-label">{type.toUpperCase()}</div>
            {group.map((file) => (
              <button
                key={file.id}
                className={`file-row ${file.id === activeFileId ? "active" : ""}`}
                onClick={() => onSelect(file)}
              >
                <span
                  className="file-icon"
                  dangerouslySetInnerHTML={{
                    __html: ICONS[ext(file.name)] || ICONS.default,
                  }}
                />
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatSize(file.size)}</span>
                <span
                  className="file-download"
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    filesApi.contentBlob(projectId, file.id).then((url) => {
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = file.name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }).catch(() => {});
                  }}
                  title="Download"
                >
                  &#x21E3;
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
