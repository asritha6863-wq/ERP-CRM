import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { TabProvider } from './context/TabContext.jsx';
import AppRoutes from './routes/index.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TabProvider>
          <AppRoutes />
        </TabProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
