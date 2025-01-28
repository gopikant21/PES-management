import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import SeatingPlanner from './components/SeatingPlanner';
import { Settings } from './components/Settings';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className='flex-1'>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/seating" element={<SeatingPlanner />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;