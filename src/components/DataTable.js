import React from 'react';
import './DataTable.css';

const DataTable = ({ columns, data }) => {
  return (
    <div className="data-table-container">
      <table>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th 
                key={index} 
                className={col.pinned ? 'sticky-header pinned' : 'sticky-header'}
                style={{ left: col.pinned ? col.left : 'auto' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => (
                <td 
                  key={colIndex} 
                  className={col.pinned ? 'pinned' : ''}
                  style={{ left: col.pinned ? col.left : 'auto' }}
                >
                  {row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;