import { renderToStaticMarkup } from 'react-dom/server';
import { test, expect } from 'vitest';
import { Field, Form, DataTable, Loading, Toast, ErrorNotice } from './components';
import { ApiError } from '../api';
test('Shared form keeps draft, labels/errors and disables offline submission without clearing value', () => {
  const html = renderToStaticMarkup(
    <Form offline onSubmit={() => undefined}>
      <Field
        id="title"
        label="ชื่อเรื่อง"
        value="ร่างงานไทย"
        onChange={() => undefined}
        error="กรุณาตรวจชื่อเรื่อง"
      />
    </Form>,
  );
  expect(html).toContain('for="title"');
  expect(html).toContain('value="ร่างงานไทย"');
  expect(html).toContain('aria-describedby="title-detail"');
  expect(html).toContain('disabled');
  expect(html).toContain('aria-invalid="true"');
});
test('Table and shared feedback provide caption, column headers, persistent alert and live status', () => {
  const html = renderToStaticMarkup(
    <>
      <DataTable caption="รายการงาน" columns={['Name']} rows={[]} />
      <Loading />
      <Toast>แจ้งข้อมูล</Toast>
      <ErrorNotice error={new ApiError('conflict', 409)} />
    </>,
  );
  expect(html).toContain('<caption>รายการงาน</caption>');
  expect(html).toContain('scope="col"');
  expect(html).toContain('role="alert"');
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('Nothing here yet');
});
