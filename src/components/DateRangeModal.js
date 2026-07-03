import React, { useState } from 'react';

const DateRangeModal = ({ reportType, onClose, onGenerate }) => {
  const [dates, setDates] = useState({ from: '', to: '' });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '350px' }}>
        <h3>{reportType.toUpperCase()} Report</h3>
        <input type="date" onChange={(e) => setDates({...dates, from: e.target.value})} style={{ width: '100%', margin: '10px 0' }} />
        <input type="date" onChange={(e) => setDates({...dates, to: e.target.value})} style={{ width: '100%', margin: '10px 0' }} />
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => onGenerate(dates)} style={{ flex: 1, padding: '10px' }}>OK & View</button>
          <button onClick={onClose} style={{ flex: 1, padding: '10px' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeModal;