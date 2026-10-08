import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

test('Foundation shell does not offer writes or credential forms before auth exists', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(html).toContain('Loading…');
  expect(html).not.toContain('<form');
  expect(html).not.toContain('<input');
});
