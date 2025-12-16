import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const GaugeChart = ({ title, value, max, unit, color, icon: Icon, msg }) => {
  // Asegurar que no se rompa la gráfica si max es 0 o value > max
  const cleanVal = Math.min(Math.max(0, value), max);
  const data = [{ val: cleanVal }, { val: max - cleanVal }];
  
  return (
    <div style={{ background: '#f8f9fa', borderRadius: '16px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ fontSize: '0.8rem', color: '#788575', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {Icon && <Icon size={12} />} {title}
      </div>
      
      <div style={{ width: '100%', height: '80px', position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} cx="50%" cy="70%" startAngle={180} endAngle={0} innerRadius={30} outerRadius={40} paddingAngle={0} dataKey="val" stroke="none">
              <Cell fill={color} />
              <Cell fill="#e0e0e0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', bottom: '0', width: '100%', textAlign: 'center', lineHeight: '1' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#3d4c3d' }}>{Math.round(value)}</span>
          <span style={{ fontSize: '0.7rem', color: '#999' }}>{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default GaugeChart;