import { useState, useCallback, useEffect } from "react";
import { getToken, auth, setToken, files as filesApi, parts as partsApi } from "./api/client";
import Homepage from "./components/Homepage";
import Chat from "./components/Chat";
import FileTree from "./components/FileTree";
import Viewport from "./components/Viewport";
import { isPreviewable } from "./utils/preview";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [openTabs, setOpenTabs] = useState([]);
  const [projectFiles, setProjectFiles] = useState([]);
  const [scannedNames, setScannedNames] = useState(new Set());
  const [partsData, setPartsData] = useState([]);
  const [assemblyManifest, setAssemblyManifest] = useState(null);

  useEffect(() => {
    if (!getToken()) return setReady(true);
    auth.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    setUser(null);
    setActiveProject(null);
    setProjectFiles([]);
    setViewFile(null);
  }, []);

  const openProject = useCallback((project) => {
    setActiveProject(project);
    setProjectFiles([]);
    setViewFile(null);
    setOpenTabs([]);
    setScannedNames(new Set());
    filesApi.list(project.id).then(setProjectFiles).catch(() => {});
    partsApi.list(project.id).then((pts) => {
      setPartsData(pts);
      setScannedNames(new Set(pts.filter((p) => p.manufacturingMethod === "scanned").map((p) => p.name)));
    }).catch(() => {});
  }, []);

  const backToHome = useCallback(() => {
    setActiveProject(null);
    setProjectFiles([]);
    setViewFile(null);
    setOpenTabs([]);
  }, []);

  const selectFile = useCallback((file) => {
    if (!file) {
      setViewFile(null);
      return;
    }
    setOpenTabs((prev) => (prev.some((t) => t.id === file.id) ? prev : [...prev, file]));
    setViewFile(file);
  }, []);

  const closeTab = useCallback((id) => {
    setOpenTabs((prev) => prev.filter((t) => t.id !== id));
    setViewFile((current) => {
      if (!current || current.id !== id) return current;
      const rest = openTabs.filter((t) => t.id !== id);
      return rest.length > 0 ? rest[rest.length - 1] : null;
    });
  }, [openTabs]);

  const onFilesUpdated = useCallback((files) => {
    setProjectFiles((prev) => {
      const known = new Set(prev.map((f) => f.id));
      const fresh = files.filter((f) => !known.has(f.id));
      if (fresh.length > 0) {
        const next = fresh.find((f) => isPreviewable(f.name)) || fresh[0];
        setOpenTabs((tabs) => (tabs.some((t) => t.id === next.id) ? tabs : [...tabs, next]));
        setViewFile(next);
      }
      return files;
    });
    const manifest = files.find(
      (f) => f.name === "assembly-manifest.json" || f.name?.endsWith("/assembly-manifest.json"),
    );
    if (manifest && activeProject) {
      filesApi.contentText(activeProject.id, manifest.id)
        .then((text) => setAssemblyManifest(JSON.parse(text)))
        .catch(() => setAssemblyManifest(null));
    } else {
      setAssemblyManifest(null);
    }
  }, [activeProject]);

  if (!ready) return null;

  if (!activeProject) {
    return (
      <Homepage
        user={user}
        onAuth={setUser}
        onLogout={logout}
        onOpenProject={openProject}
      />
    );
  }

  return (
    <div className="layout">
      <div className="panel panel-chat">
        <Chat
          projectId={activeProject.id}
          onProjectCreated={(id) => setActiveProject((p) => ({ ...p, id }))}
          onFilesUpdated={onFilesUpdated}
          user={user}
          onLogout={logout}
          onBack={backToHome}
        />
      </div>
      <div className="panel-right">
        <div className="panel panel-files">
          <FileTree
            projectId={activeProject.id}
            files={projectFiles}
            onSelect={selectFile}
            activeFileId={viewFile?.id}
            onFilesUpdated={onFilesUpdated}
          />
        </div>
        <div className="panel panel-viewport">
          <Viewport file={viewFile} allFiles={projectFiles} projectId={activeProject.id} scannedNames={scannedNames} parts={partsData} assemblyManifest={assemblyManifest} tabs={openTabs} onTabSelect={selectFile} onTabClose={closeTab} />
        </div>
      </div>
    </div>
  );
}
