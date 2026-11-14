import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTabs } from '../../context/TabContext.jsx';

export default function TabBar() {
  const { tabs, activeId, setActiveId, closeTab, closeAll } = useTabs();
  const navigate = useNavigate();

  if (tabs.length === 0) return null;

  return (
    <div className="no-print flex items-center bg-white border-b border-gray-100 overflow-x-auto shrink-0 px-4 gap-1"
      style={{ minHeight: 40 }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => { setActiveId(tab.id); navigate(tab.path); }}
            className={`group inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg shrink-0 max-w-[160px] transition-all ${
              isActive
                ? 'text-brand-600 bg-brand-50 border border-brand-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
            <span className="truncate">{tab.label}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id, navigate); }}
              onKeyDown={(e) => e.key === 'Enter' && closeTab(tab.id, navigate)}
              className="ml-0.5 rounded p-0.5 hover:bg-brand-100 text-gray-400 hover:text-brand-600 shrink-0"
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        );
      })}
      {tabs.length > 1 && (
        <button
          onClick={() => closeAll(navigate)}
          className="ml-auto text-[10px] text-gray-400 hover:text-brand-500 px-2 py-1 rounded-lg hover:bg-brand-50 shrink-0 transition-colors"
        >
          Close All
        </button>
      )}
    </div>
  );
}
