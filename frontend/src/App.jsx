import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RecordsList from './pages/RecordsList';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<RecordsList />} />
          <Route path="/record/:id" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;