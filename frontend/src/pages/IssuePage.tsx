import React from 'react';
import { issueCredential } from '../api/client';

export default function IssuePage() {
  const [text, setText] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const body = JSON.parse(text);
      const json = await issueCredential(body);
      setResult({ status: 'ok', body: json });
    } catch (err: any) {
      setResult({ error: err.message || String(err) });
    } finally { setLoading(false); }
  }

  return (
    <section>
      <h2 className="text-lg font-medium mb-3">Issue Credential</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="w-full border rounded-md p-3" placeholder='{ "name": "Alice" }' />
      <div className="mt-3">
        <button onClick={submit} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded-md disabled:opacity-60">Issue</button>
      </div>
      <div className="mt-4">
        {result ? (
          <div className="bg-slate-100 p-3 rounded-md">
            {result.error ? (
              <pre className="text-red-600">{String(result.error)}</pre>
            ) : (
              <div>
                <div className="mb-2"><strong>Message:</strong> {result.body?.message || JSON.stringify(result.body)}</div>
                {result.body?.credentialId && <div><strong>Credential ID:</strong> {result.body.credentialId}</div>}
                {result.body?.issuedBy && <div><strong>Issued By:</strong> {result.body.issuedBy}</div>}
                {result.body?.issuedAt && <div><strong>Issued At:</strong> {result.body.issuedAt}</div>}
                <pre className="mt-2 text-sm">{JSON.stringify(result.body, null, 2)}</pre>
              </div>
            )}
          </div>
        ) : (
          <pre className="bg-slate-100 p-3 rounded-md">Result will appear here</pre>
        )}
      </div>
    </section>
  );
}
