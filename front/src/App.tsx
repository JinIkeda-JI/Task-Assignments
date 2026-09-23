import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState<string>('未確認')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status ?? '不明'))
      .catch(() => setApiStatus('接続エラー（backが起動しているか確認してください）'))
  }, [])

  return (
    <div className="app">
      <h1>Workload Manager</h1>
      <p>プロジェクト横断の負荷可視化・工数管理システム（開発中）</p>
      <p>API疎通確認: {apiStatus}</p>
    </div>
  )
}

export default App
