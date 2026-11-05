import React from 'react';
import { render } from '@testing-library/react';
import DataTable from '../src/components/DataTable';

const columns = [
  { header: 'ID', accessor: 'id', pinned: true, left: 0 },
  { header: 'Name', accessor: 'name' }
];
const data = [{ id: 1, name: 'Test' }];

test('renders sticky headers and pinned columns', () => {
  const { container } = render(<DataTable columns={columns} data={data} />);
  const pinnedCell = container.querySelector('.pinned');
  expect(pinnedCell).toBeInTheDocument();
  expect(pinnedCell.style.position).toBe('sticky');
});