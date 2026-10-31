const VIEW_SUFFIX_RE = /_(front|right|top|isometric)$/i;

export function ext(filename) {
  if (!filename) return "";
  const dot = filename.lastIndexOf(".");
  return dot > -1 ? filename.slice(dot + 1).toLowerCase() : "";
}

export function splitPath(name) {
  const parts = (name || "").split("/").filter(Boolean);
  if (parts.length <= 1) return { folders: [], base: name || "" };
  return { folders: parts.slice(0, -1), base: parts[parts.length - 1] };
}

export function stemOf(name) {
  const { base } = splitPath(name);
  const dot = base.lastIndexOf(".");
  const stem = dot > -1 ? base.slice(0, dot) : base;
  if (dot > -1 && base.slice(dot + 1).toLowerCase() === "png") {
    return stem.replace(VIEW_SUFFIX_RE, "");
  }
  return stem;
}

export function buildTree(files) {
  const root = { folders: new Map(), files: [] };
  for (const file of files) {
    const { folders, base } = splitPath(file.name);
    let node = root;
    for (const part of folders) {
      if (!node.folders.has(part)) {
        node.folders.set(part, { folders: new Map(), files: [] });
      }
      node = node.folders.get(part);
    }
    node.files.push({ ...file, base });
  }
  const sortNode = (node) => {
    node.files.sort((a, b) => a.base.localeCompare(b.base));
    for (const child of node.folders.values()) sortNode(child);
  };
  sortNode(root);
  return root;
}

export function groupByStem(files) {
  const groups = [];
  const index = new Map();
  for (const file of files) {
    const stem = stemOf(file.base ?? file.name);
    const key = stem.toLowerCase();
    if (!index.has(key)) {
      index.set(key, groups.length);
      groups.push({ stem, files: [] });
    }
    groups[index.get(key)].files.push(file);
  }
  return groups;
}

export function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function formatTime(isoString, nowMs = Date.now()) {
  if (!isoString) return "";
  const time = Date.parse(isoString);
  if (Number.isNaN(time)) return "";
  const diffMs = Math.max(0, nowMs - time);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(time).toISOString().slice(0, 10);
}
