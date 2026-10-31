import { useState, useRef } from "react";
import { files as filesApi } from "../api/client";
import { ext, buildTree, groupByStem, formatSize, formatTime } from "../utils/file-tree.js";
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

function FileRow({ file, projectId, active, onSelect }) {
  return (
    <button
      className={`file-row ${active ? "active" : ""}`}
      onClick={() => onSelect(file)}
      title={file.name}
    >
      <span
        className="file-icon"
        dangerouslySetInnerHTML={{
          __html: ICONS[ext(file.base ?? file.name)] || ICONS.default,
        }}
      />
      <span className="file-name">{file.base ?? file.name}</span>
      <span className="file-time" title={file.createdAt || ""}>{formatTime(file.createdAt)}</span>
      <span className="file-size">{formatSize(file.size)}</span>
      <span
        className="file-download"
        role="button"
        onClick={(e) => {
          e.stopPropagation();
          filesApi.contentBlob(projectId, file.id).then((url) => {
            const a = document.createElement("a");
            a.href = url;
            a.download = file.base ?? file.name;
            a.click();
            URL.revokeObjectURL(url);
          }).catch(() => {});
        }}
        title="Download"
      >
        &#x21E3;
      </span>
    </button>
  );
}

function StemGroup({ stem, files, projectId, activeFileId, onSelect }) {
  return (
    <div className="file-group">
      <div className="file-group-label">{stem}</div>
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          projectId={projectId}
          active={file.id === activeFileId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function FolderNode({ name, node, depth, projectId, activeFileId, onSelect }) {
  const [open, setOpen] = useState(true);
  const count = node.files.length + node.folders.size;

  return (
    <div className="file-group">
      <div
        className="folder-row"
        style={{ paddingLeft: 12 + depth * 12 }}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setOpen(!open); }}
      >
        <span className="folder-toggle">{open ? "\u25BE" : "\u25B6"}</span>
        <span className="folder-name">{name}</span>
        <span className="folder-count">{count}</span>
      </div>
      {open && (
        <>
          {[...node.folders.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([childName, child]) => (
              <FolderNode
                key={childName}
                name={childName}
                node={child}
                depth={depth + 1}
                projectId={projectId}
                activeFileId={activeFileId}
                onSelect={onSelect}
              />
            ))}
          <div style={{ paddingLeft: (depth + 1) * 12 }}>
            {groupByStem(node.files).map((group) => (
              <StemGroup
                key={group.stem.toLowerCase()}
                stem={group.stem}
                files={group.files}
                projectId={projectId}
                activeFileId={activeFileId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
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

  const tree = buildTree(files);

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
        {[...tree.folders.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, node]) => (
            <FolderNode
              key={name}
              name={name}
              node={node}
              depth={0}
              projectId={projectId}
              activeFileId={activeFileId}
              onSelect={onSelect}
            />
          ))}
        {groupByStem(tree.files).map((group) => (
          <StemGroup
            key={group.stem.toLowerCase()}
            stem={group.stem}
            files={group.files}
            projectId={projectId}
            activeFileId={activeFileId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}
