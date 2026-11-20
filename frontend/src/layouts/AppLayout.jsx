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
        <main className="flex-1 min-h-0 overflow-y-auto print:overflow-visible page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
