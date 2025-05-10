import { useState } from 'react'
import './App.css'
import Authorization from './components/Authorization'
import './components/Authorization.css'

function App() {
  const [activeTab, setActiveTab] = useState('authorization')

  return (
    <div className="app-container">
      <nav className="top-bar">
        <div className="nav-item" onClick={() => setActiveTab('authorization')}>
          Authorization
        </div>
        <div className="nav-item" onClick={() => setActiveTab('parameters')}>
          Parameters
        </div>
      </nav>

      <main className="content">
        {activeTab === 'authorization' && <Authorization />}
        {activeTab === 'parameters' && (
          <div className="parameters-container">
            <h2>Parameters</h2>
            <p>Parameters configuration coming soon...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
