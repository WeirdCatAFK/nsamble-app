import { useState, useCallback, useEffect } from "react";
import { getToken, auth, setToken, files as filesApi, parts as partsApi } from "./api/client";
import Homepage from "./components/Homepage";
import Chat from "./components/Chat";
import FileTree from "./components/FileTree";
import Viewport from "./components/Viewport";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [scannedNames, setScannedNames] = useState(new Set());

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
    setScannedNames(new Set());
    filesApi.list(project.id).then(setProjectFiles).catch(() => {});
    partsApi.list(project.id).then((pts) => {
      setScannedNames(new Set(pts.filter((p) => p.manufacturingMethod === "scanned").map((p) => p.name)));
    }).catch(() => {});
  }, []);

  const backToHome = useCallback(() => {
    setActiveProject(null);
    setProjectFiles([]);
    setViewFile(null);
  }, []);

  const onFilesUpdated = useCallback((files) => {
    setProjectFiles(files);
  }, []);

  const onViewFileFromAI = useCallback((file) => {
    setViewFile(file);
  }, []);

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
          onViewFile={onViewFileFromAI}
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
            onSelect={setViewFile}
            activeFileId={viewFile?.id}
            onFilesUpdated={onFilesUpdated}
          />
        </div>
        <div className="panel panel-viewport">
          <Viewport file={viewFile} allFiles={projectFiles} projectId={activeProject.id} scannedNames={scannedNames} />
        </div>
      </div>
    </div>
  );
}
