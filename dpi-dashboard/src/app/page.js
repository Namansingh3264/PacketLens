'use client';

import { useState, useCallback } from 'react';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (selectedFile) => {
    if (selectedFile && (selectedFile.name.endsWith('.pcap') || selectedFile.name.endsWith('.pcapng'))) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please select a valid .pcap or .pcapng file.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process file');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert apps object to array and sort by count
  const sortedApps = result 
    ? Object.entries(result.apps).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="container">
      <header className="header">
        <h1>PacketLens Dashboard</h1>
        <p>Deep Packet Inspection & Network Traffic Analysis</p>
      </header>

      {!result && (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Upload Capture</h2>
          
          <div 
            className={`upload-area ${isDragging ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept=".pcap,.pcapng" 
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
            />
            {isProcessing ? (
              <div>
                <div className="spinner"></div>
                <h3>Processing Packets...</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Extracting SNIs and analyzing flows</p>
              </div>
            ) : (
              <div>
                <div className="upload-icon">📁</div>
                <h3>{file ? file.name : 'Drag & Drop PCAP File'}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>or click to browse</p>
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--danger)', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}

          <div style={{ textAlign: 'center' }}>
            <button 
              className="btn" 
              onClick={handleUpload} 
              disabled={!file || isProcessing}
            >
              Analyze Traffic
            </button>
          </div>
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Analysis Report</h2>
            <button className="btn" onClick={() => { setResult(null); setFile(null); }}>
              Analyze New File
            </button>
          </div>

          <div className="dashboard-grid">
            {/* Top Stats */}
            <div className="glass-panel stat-card">
              <div className="stat-label">Total Packets</div>
              <div className="stat-value">{result.total_packets.toLocaleString()}</div>
            </div>
            
            <div className="glass-panel stat-card">
              <div className="stat-label">Total Bytes</div>
              <div className="stat-value">{(result.total_bytes / 1024).toFixed(1)} KB</div>
            </div>
            
            <div className="glass-panel stat-card">
              <div className="stat-label">TCP Packets</div>
              <div className="stat-value">{result.tcp_packets.toLocaleString()}</div>
            </div>
            
            <div className="glass-panel stat-card">
              <div className="stat-label">UDP Packets</div>
              <div className="stat-value">{result.udp_packets.toLocaleString()}</div>
            </div>

            {/* Application Breakdown */}
            <div className="glass-panel chart-card">
              <h3>Application Breakdown</h3>
              <div className="bar-chart">
                {sortedApps.map(([app, count]) => {
                  const percentage = ((count / result.total_packets) * 100).toFixed(1);
                  return (
                    <div className="bar-item" key={app}>
                      <div className="bar-label">{app}</div>
                      <div className="bar-track">
                        <div 
                          className="bar-fill" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="bar-value">{percentage}%</div>
                    </div>
                  );
                })}
                {sortedApps.length === 0 && <p style={{ color: 'var(--text-secondary)', marginTop: '2rem' }}>No apps detected.</p>}
              </div>
            </div>

            {/* Detected Domains */}
            <div className="glass-panel snis-card">
              <h3>Detected Domains (SNIs)</h3>
              <table className="sni-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.snis).map(([domain, app]) => (
                    <tr key={domain}>
                      <td>{domain}</td>
                      <td><span className="app-badge">{app}</span></td>
                    </tr>
                  ))}
                  {Object.keys(result.snis).length === 0 && (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No SNIs extracted.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
