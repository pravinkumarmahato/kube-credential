import React from 'react';
import IssuePage from './pages/IssuePage';
import VerifyPage from './pages/VerifyPage';

export default function App() {
  const [route, setRoute] = React.useState<'issue'|'verify'>('issue');
  return (
    <div className="min-h-screen p-8 bg-slate-50 text-slate-900">
      <header className="max-w-3xl mx-auto mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kube Credential</h1>
        <nav>
          <button onClick={() => setRoute('issue')} className="px-3 py-1 mr-2 rounded-md border" aria-pressed={route==='issue'}>Issue</button>
          <button onClick={() => setRoute('verify')} className="px-3 py-1 rounded-md border">Verify</button>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto">
        <div className="card">
          {route === 'issue' ? <h1>Issue Page</h1> : <h1>Verify Page</h1>}

          {route === 'issue' ? <IssuePage /> : <VerifyPage />}
        </div>
      </main>
    </div>
  );
}
