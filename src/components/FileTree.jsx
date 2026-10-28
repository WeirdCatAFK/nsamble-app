import "./FileTree.css";

const ICONS = {
  stl: "&#x25B3;",
  scad: "&#x2B21;",
  png: "&#x25A3;",
  svg: "&#x25C7;",
  json: "&#x007B;",
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

export default function FileTree({ files, onSelect, activeFileId, projectId }) {
  const grouped = {};
  for (const file of files) {
    const e = ext(file.filename) || "other";
    if (!grouped[e]) grouped[e] = [];
    grouped[e].push(file);
  }

  return (
    <>
      <div className="panel-header">
        <span className="label">Files</span>
        {files.length > 0 && <span className="file-count">{files.length}</span>}
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
                    __html: ICONS[ext(file.filename)] || ICONS.default,
                  }}
                />
                <span className="file-name">{file.filename}</span>
                <span className="file-size">{formatSize(file.size)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
