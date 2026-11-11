import { useNavigate } from 'react-router-dom';
import { X, XSquare } from 'lucide-react';
import { useTabs } from '../../context/TabContext.jsx';

export default function TabBar() {
  const { tabs, activeId, setActiveId, closeTab, closeAll } = useTabs();
  const navigate = useNavigate();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center bg-gray-100 border-b border-gray-200 overflow-x-auto shrink-0">
      <div className="flex items-center flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveId(tab.id); navigate(tab.path); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-r border-gray-200 shrink-0 max-w-[180px] transition-colors ${
                isActive
                  ? 'bg-white text-indigo-600 font-medium border-t-2 border-t-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span
                role="button"
                tabIndex={0}
                aria-label={`Close ${tab.label}`}
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id, navigate); }}
                onKeyDown={(e) => e.key === 'Enter' && closeTab(tab.id, navigate)}
                className="ml-1 rounded hover:bg-gray-200 p-0.5 shrink-0"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>
      {tabs.length > 1 && (
        <button
          onClick={() => closeAll(navigate)}
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 shrink-0 transition-colors"
          title="Close all tabs"
        >
          <XSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Close all</span>
        </button>
      )}
    </div>
  );
}
