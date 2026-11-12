import { BrowserRouter } from 'react-router-dom';
import { AuthProvider }         from './context/AuthContext.jsx';
import { TabProvider }          from './context/TabContext.jsx';
import { GlobalFilterProvider } from './context/GlobalFilterContext.jsx';
import AppRoutes from './routes/index.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GlobalFilterProvider>
          <TabProvider>
            <AppRoutes />
          </TabProvider>
        </GlobalFilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
