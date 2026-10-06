import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import store from './app/store'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(14,20,36,.94)',
              color: '#e8edfb',
              border: '1px solid rgba(148,163,214,.16)',
              borderRadius: '14px',
              backdropFilter: 'blur(14px)',
              fontSize: '13px',
              padding: '10px 14px',
              boxShadow: '0 22px 60px -26px rgba(0,0,0,.9)',
            },
            success: { iconTheme: { primary: '#4ade80', secondary: '#0a0e1a' } },
            error: { iconTheme: { primary: '#fb7185', secondary: '#0a0e1a' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)
