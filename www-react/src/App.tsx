import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Contexts
import { WalletProvider } from './contexts/WalletContext';

// Pages
import Home from './pages/Home';
import CreateMarket from './pages/CreateMarket';
import Market from './pages/Market';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateMarket />} />
            <Route path="/market/:marketId" element={<Market />} />
          </Routes>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;
