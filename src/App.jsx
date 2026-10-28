import { useState, useCallback } from "react";
import Chat from "./components/Chat";
import FileTree from "./components/FileTree";
import Viewport from "./components/Viewport";
import "./App.css";

export default function App() {
  const [viewFile, setViewFile] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [projectId, setProjectId] = useState(null);

  const onFilesUpdated = useCallback((files) => {
    setProjectFiles(files);
  }, []);

  const onViewFileFromAI = useCallback((file) => {
    setViewFile(file);
  }, []);

  return (
    <div className="layout">
      <div className="panel panel-chat">
        <Chat
          projectId={projectId}
          onProjectCreated={setProjectId}
          onFilesUpdated={onFilesUpdated}
          onViewFile={onViewFileFromAI}
        />
      </div>
      <div className="panel-right">
        <div className="panel panel-files">
          <FileTree
            projectId={projectId}
            files={projectFiles}
            onSelect={setViewFile}
            activeFileId={viewFile?.id}
          />
        </div>
        <div className="panel panel-viewport">
          <Viewport file={viewFile} />
        </div>
      </div>
    </div>
  );
}
