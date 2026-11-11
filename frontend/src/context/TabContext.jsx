import { createContext, useContext, useState, useCallback } from 'react';

const TabContext = createContext(null);

export function TabProvider({ children }) {
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // Open a tab (or focus it if already open)
  const openTab = useCallback(({ id, label, path, icon }) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.id === id);
      if (exists) return prev;
      return [...prev, { id, label, path, icon }];
    });
    setActiveId(id);
  }, []);

  const closeTab = useCallback((id, navigate) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id && next.length > 0) {
        const newActive = next[Math.max(0, idx - 1)];
        setActiveId(newActive.id);
        navigate(newActive.path);
      } else if (next.length === 0) {
        setActiveId(null);
        navigate('/dashboard');
      }
      return next;
    });
  }, [activeId]);

  const closeAll = useCallback((navigate) => {
    setTabs([]);
    setActiveId(null);
    navigate('/dashboard');
  }, []);

  return (
    <TabContext.Provider value={{ tabs, activeId, openTab, closeTab, closeAll, setActiveId }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTabs must be used within TabProvider');
  return ctx;
}
