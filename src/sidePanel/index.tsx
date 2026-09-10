
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

console.log('[From the newtab override context] Hello regular page!')

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
)
