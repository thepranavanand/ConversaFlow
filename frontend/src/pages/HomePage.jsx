import { useChatStore } from "../store/useChatStore";
import { useEffect, useState, useRef } from "react";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import ExecutionGraphPanel from "../components/ExecutionGraphPanel";

const HomePage = () => {
  const { selectedUser, getMessages } = useChatStore();
  const [showExecutionGraph, setShowExecutionGraph] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [executionGraphWidth, setExecutionGraphWidth] = useState(350);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingGraph, setIsResizingGraph] = useState(false);
  
  const containerRef = useRef(null);

  // Load messages for selected user from localStorage
  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  // Handle sidebar resize
  const handleSidebarMouseDown = (e) => {
    setIsResizingSidebar(true);
    e.preventDefault();
  };

  // Handle execution graph resize
  const handleGraphMouseDown = (e) => {
    setIsResizingGraph(true);
    e.preventDefault();
  };

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      
      if (isResizingSidebar) {
        const newWidth = e.clientX - containerRect.left;
        const minWidth = 200;
        const maxWidth = containerRect.width * 0.4;
        setSidebarWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
      }
      
      if (isResizingGraph && showExecutionGraph) {
        const newWidth = containerRect.right - e.clientX;
        const minWidth = 250;
        const maxWidth = containerRect.width * 0.4;
        setExecutionGraphWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingGraph(false);
    };

    if (isResizingSidebar || isResizingGraph) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, isResizingGraph, showExecutionGraph]);

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-full h-[calc(100vh-8rem)]">
          <div ref={containerRef} className="flex h-full rounded-lg overflow-hidden relative">
            {/* Sidebar */}
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="flex-shrink-0 min-w-0 overflow-hidden"
            >
              <Sidebar />
            </div>

            {/* Sidebar Resize Handle */}
            <div
              className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors"
              onMouseDown={handleSidebarMouseDown}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {!selectedUser ? (
                <NoChatSelected />
              ) : (
                <ChatContainer 
                  showExecutionGraph={showExecutionGraph}
                  setShowExecutionGraph={setShowExecutionGraph}
                />
              )}
            </div>

            {/* Execution Graph Resize Handle */}
            {showExecutionGraph && (
              <div
                className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors"
                onMouseDown={handleGraphMouseDown}
              />
            )}

            {/* Execution Graph Panel */}
            {showExecutionGraph && (
              <div 
                style={{ width: `${executionGraphWidth}px` }}
                className="flex-shrink-0"
              >
                <ExecutionGraphPanel setShowExecutionGraph={setShowExecutionGraph} />
              </div>
            )}

            {/* Execution Graph Toggle - Vertical Bar */}
            {!showExecutionGraph && (
              <div className="w-8 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                <button
                  onClick={() => setShowExecutionGraph(true)}
                  className="w-6 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-l-lg flex items-center justify-center transition-colors"
                  title="Show Execution Graph"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;
