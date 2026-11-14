import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import TabBar from '../components/layout/TabBar.jsx';

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f8fb' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 print:block">
        <Topbar />
        <TabBar />
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
