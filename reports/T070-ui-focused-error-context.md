# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: task-workspace.spec.ts >> T071 four views retain authoritative dates/null dates after edit and actual application restart
- Location: tests/browser/task-workspace.spec.ts:343:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'งานในโปรเจกต์ · Task project', exact: true }).getByRole('region', { name: 'งานไม่มีวันส่ง', exact: true }).getByText('Across views no dates', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('dialog', { name: 'งานในโปรเจกต์ · Task project', exact: true }).getByRole('region', { name: 'งานไม่มีวันส่ง', exact: true }).getByText('Across views no dates', { exact: true }) with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'งานในโปรเจกต์ · Task project', exact: true }).getByRole('region', { name: 'งานไม่มีวันส่ง', exact: true }).getByText('Across views no dates', { exact: true })

```

```yaml
- link "ข้ามไปเนื้อหา":
  - /url: "#main-content"
- complementary:
  - link "FRIDAY MANAGEMENT":
    - /url: /
  - paragraph: Workspace fixture
  - navigation "เมนูหลัก":
    - link "หน้าแรก":
      - /url: /
    - link "งานของฉัน":
      - /url: /my-tasks
    - link "โปรเจกต์":
      - /url: /projects
    - link "ปฏิทิน":
      - /url: /calendar
    - link "รายงาน":
      - /url: /reports
    - link "การแจ้งเตือน ยังไม่อ่าน 0 รายการ":
      - /url: /notifications
      - text: การแจ้งเตือน 0
    - link "ทีม":
      - /url: /teams
    - link "ถังขยะ":
      - /url: /trash
    - link "จัดการผู้ใช้":
      - /url: /users
    - link "โปรไฟล์และการตั้งค่า":
      - /url: /settings
  - button "วิธีใช้งาน"
- main:
  - paragraph: พื้นที่ทำงานร่วมกัน
  - heading "โปรเจกต์" [level=1]
  - paragraph: Workspace Admin
  - button "ออกจากระบบ"
  - complementary "เปิดเป็นแอป":
    - group: ติดตั้งหรือเพิ่มไปยังหน้าจอหลัก
  - region "เนื้อหาหน้า":
    - heading "โปรเจกต์" [level=2]
    - paragraph: จัดการโปรเจกต์และสิทธิ์ Editor / Viewer
    - button "สร้างโปรเจกต์"
    - checkbox "รวมที่เก็บแล้ว"
    - text: รวมที่เก็บแล้ว
    - button "โหลดรายการใหม่"
    - region "รายการโปรเจกต์":
      - table "รายการโปรเจกต์":
        - caption: รายการโปรเจกต์
        - rowgroup:
          - row "ชื่อ ทีมเจ้าของ สถานะ การจัดการ":
            - columnheader "ชื่อ"
            - columnheader "ทีมเจ้าของ"
            - columnheader "สถานะ"
            - columnheader "การจัดการ"
        - rowgroup:
          - 'row "Task project Task team สิทธิ์: admin ใช้งาน งาน แก้ไข เก็บ สมาชิก"':
            - cell "Task project":
              - strong: Task project
              - paragraph
            - 'cell "Task team สิทธิ์: admin"':
              - text: Task team
              - paragraph: "สิทธิ์: admin"
            - cell "ใช้งาน"
            - cell "งาน แก้ไข เก็บ สมาชิก":
              - button "งาน"
              - button "แก้ไข"
              - button "เก็บ"
              - button "สมาชิก"
    - button "หน้าก่อน" [disabled]
    - text: หน้า 1 · รวม 1 รายการ
    - button "หน้าถัดไป" [disabled]
    - dialog "งานในโปรเจกต์ · Task project":
      - heading "งานในโปรเจกต์ · Task project" [level=2]
      - region "รายการงานโปรเจกต์":
        - text: WORKSPACE / Task team
        - heading "Task project" [level=2]
        - paragraph
        - button "สร้างงาน"
        - region "มุมมองงาน":
          - button "Table"
          - button "Gantt"
          - button "Calendar" [pressed]
          - button "Kanban"
        - text: ค้นหางาน
        - textbox "ค้นหางาน"
        - button "ค้นหา"
        - group: ตัวกรองงาน
        - text: เรียงตาม
        - combobox "เรียงตาม":
          - option "วันส่งใกล้สุด" [selected]
          - option "วันส่งไกลสุด"
          - option "สร้างล่าสุด"
          - option "สร้างก่อน"
          - option "แก้ไขล่าสุด"
          - option "ความสำคัญ"
          - option "ชื่องาน"
        - button "โหลดงานใหม่"
        - region "Calendar":
          - button "เดือนก่อน"
          - button "วันนี้"
          - button "เดือนถัดไป"
          - strong: 2026-10 · Asia/Bangkok
          - paragraph: วางงานตามวันส่ง · ไม่มีการลากย้ายวัน
          - strong: จ.
          - strong: อ.
          - strong: พ.
          - strong: พฤ.
          - strong: ศ.
          - strong: ส.
          - strong: อา.
          - time: "28"
          - time: "29"
          - time: "30"
          - time: "1"
          - time: "2"
          - time: "3"
          - time: "4"
          - time: "5"
          - time: "6"
          - time: "7"
          - button "#1 Across views dated"
          - time: "8"
          - time: "9"
          - time: "10"
          - time: "11"
          - time: "12"
          - time: "13"
          - time: "14"
          - time: "15"
          - time: "16"
          - time: "17"
          - time: "18"
          - time: "19"
          - time: "20"
          - time: "21"
          - time: "22"
          - time: "23"
          - time: "24"
          - time: "25"
          - time: "26"
          - time: "27"
          - time: "28"
          - time: "29"
          - time: "30"
          - time: "31"
          - time: "1"
          - time: "2"
          - time: "3"
          - time: "4"
          - time: "5"
          - time: "6"
          - time: "7"
          - time: "8"
          - region "งานมีวันส่งในช่วงปฏิทินนี้":
            - heading "งานมีวันส่งในช่วงปฏิทินนี้ · 1 งาน" [level=3]
            - list:
              - listitem:
                - button "#1 Across views dated"
                - text: 2026-10-07 → 2026-10-07
          - region "งานไม่มีวันส่ง":
            - heading "งานไม่มีวันส่ง · 1 งาน" [level=3]
            - list:
              - listitem:
                - button "#2 Across views no dates"
                - text: ไม่มีวันเริ่ม → ไม่มีวันส่ง
      - button "ปิดหน้าต่าง"
```

# Test source

```ts
  263 |       d.getByRole('button', { name: 'โหลดล่าสุดและเทียบร่าง', exact: true }),
  264 |     ).toBeVisible();
  265 |     await expect(d.getByLabel('ชื่องาน', { exact: true })).toHaveValue('My draft');
  266 |     await d.getByRole('button', { name: 'โหลดล่าสุดและเทียบร่าง', exact: true }).click();
  267 |     await expect(d.getByText('ข้อมูลล่าสุด: Remote changed', { exact: false })).toBeVisible();
  268 |     expect((await mutate(other, '/api/tasks/1/comments', { body: 'Remote comment' })).status).toBe(
  269 |       201,
  270 |     );
  271 |     await expect(d.getByText('Remote comment', { exact: true })).toBeVisible({ timeout: 10000 });
  272 |     await expect(
  273 |       d.getByText('ความคิดเห็น ไฟล์ หรือประวัติมีข้อมูลเปลี่ยนแปลง', { exact: false }),
  274 |     ).toBeVisible({ timeout: 10000 });
  275 |     await expect(d.getByLabel('เขียนความคิดเห็น', { exact: true })).toHaveValue('My comment draft');
  276 |     await other.close();
  277 |   } finally {
  278 |     await f.close();
  279 |   }
  280 | });
  281 | test('T047 focus immediate refresh, hidden/offline pause, GET polling leaves idle unchanged, logout clears private view', async ({
  282 |   page,
  283 | }) => {
  284 |   test.setTimeout(60000);
  285 |   const f = await projectFixture(page);
  286 |   let db: SqliteDatabase | undefined;
  287 |   try {
  288 |     await create(page, 'Session task', { assignee_id: 1 });
  289 |     await page.getByRole('link', { name: 'งานของฉัน', exact: true }).click();
  290 |     await expect(page.getByRole('button', { name: 'เปิดงาน #1', exact: true })).toBeVisible();
  291 |     await page.waitForTimeout(300);
  292 |     db = new SqliteDatabase(f.path);
  293 |     const seen = await db.transaction((tx) =>
  294 |       tx.query(sql('SELECT last_seen_at FROM dbo.sessions')),
  295 |     );
  296 |     await page.waitForTimeout(6000);
  297 |     expect(
  298 |       await db.transaction((tx) => tx.query(sql('SELECT last_seen_at FROM dbo.sessions'))),
  299 |     ).toEqual(seen);
  300 |     let calls = 0;
  301 |     page.on('request', (r) => {
  302 |       if (r.url().includes('/api/tasks?')) calls++;
  303 |     });
  304 |     await page.evaluate(() => {
  305 |       Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  306 |       document.dispatchEvent(new Event('visibilitychange'));
  307 |     });
  308 |     calls = 0;
  309 |     await page.waitForTimeout(5500);
  310 |     expect(calls).toBe(0);
  311 |     await page.evaluate(() => {
  312 |       Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  313 |       document.dispatchEvent(new Event('visibilitychange'));
  314 |     });
  315 |     await expect.poll(() => calls, { timeout: 1500 }).toBeGreaterThan(0);
  316 |     await page.context().setOffline(true);
  317 |     await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  318 |     await page.waitForTimeout(300);
  319 |     calls = 0;
  320 |     await page.waitForTimeout(5500);
  321 |     expect(calls).toBe(0);
  322 |     await page.context().setOffline(false);
  323 |     await page.evaluate(() => window.dispatchEvent(new Event('online')));
  324 |     await expect.poll(() => calls, { timeout: 1500 }).toBeGreaterThan(0);
  325 |     await expect(page.getByRole('button', { name: 'ออกจากระบบ', exact: true })).toBeEnabled({
  326 |       timeout: 15000,
  327 |     });
  328 |     calls = 0;
  329 |     await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  330 |     await expect.poll(() => calls, { timeout: 1500 }).toBeGreaterThan(0);
  331 |     await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  332 |     await expect(page.getByLabel('ชื่อผู้ใช้', { exact: true })).toBeVisible();
  333 |     calls = 0;
  334 |     await page.waitForTimeout(5500);
  335 |     expect(calls).toBe(0);
  336 |     await expect(page.getByText('Session task', { exact: false })).toHaveCount(0);
  337 |   } finally {
  338 |     await db?.close();
  339 |     await f.close();
  340 |   }
  341 | });
  342 | 
  343 | test('T071 four views retain authoritative dates/null dates after edit and actual application restart', async ({
  344 |   page,
  345 | }, testInfo) => {
  346 |   const f = await projectFixture(page);
  347 |   try {
  348 |     const d = await today(page);
  349 |     const dated = await create(page, 'Across views dated', { start_date: d, due_date: d });
  350 |     const noDates = await create(page, 'Across views no dates');
  351 |     let jobs = await tasks(page);
  352 |     await expect(
  353 |       jobs.getByRole('cell', { name: `#${dated.id} Across views dated`, exact: true }),
  354 |     ).toBeVisible();
  355 |     await jobs.getByRole('button', { name: 'Gantt', exact: true }).click();
  356 |     await expect(jobs.locator('.gantt-bar')).toHaveCount(1);
  357 |     await jobs.getByRole('button', { name: 'Calendar', exact: true }).click();
  358 |     await expect(jobs.locator('.calendar-event')).toHaveCount(1);
  359 |     await expect(
  360 |       jobs
  361 |         .getByRole('region', { name: 'งานไม่มีวันส่ง', exact: true })
  362 |         .getByText('Across views no dates', { exact: true }),
> 363 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  364 |     await jobs.getByRole('button', { name: 'Kanban', exact: true }).click();
  365 |     await expect(jobs.locator('.kanban-card')).toHaveCount(2);
  366 |     await jobs.getByRole('button', { name: `เปิดงาน #${noDates.id}`, exact: true }).click();
  367 |     await expect(detail(page).getByLabel('วันเริ่ม', { exact: true })).toHaveValue('');
  368 |     await expect(detail(page).getByLabel('วันส่ง', { exact: true })).toHaveValue('');
  369 |     await detail(page).getByLabel('ชื่องาน', { exact: true }).fill('Across views revised');
  370 |     await detail(page).getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
  371 |     await expect(detail(page).getByText('บันทึกงานแล้ว', { exact: true })).toBeVisible();
  372 |     await closeDetail(page);
  373 |     await f.restart();
  374 |     await page.reload();
  375 |     await expect(page.getByRole('button', { name: 'ออกจากระบบ', exact: true })).toBeEnabled();
  376 |     jobs = await tasks(page);
  377 |     await expect(
  378 |       jobs.getByRole('cell', { name: `#${noDates.id} Across views revised`, exact: true }),
  379 |     ).toBeVisible();
  380 |     await jobs.getByRole('button', { name: 'Calendar', exact: true }).click();
  381 |     await expect(jobs.locator('.calendar-event')).toHaveCount(1);
  382 |     await expect(
  383 |       jobs
  384 |         .getByRole('region', { name: 'งานไม่มีวันส่ง', exact: true })
  385 |         .getByText('Across views revised', { exact: true }),
  386 |     ).toBeVisible();
  387 |     await page.screenshot({
  388 |       path: testInfo.outputPath('T071-four-view-restart.png'),
  389 |       fullPage: true,
  390 |     });
  391 |   } finally {
  392 |     await f.close();
  393 |   }
  394 | });
  395 | 
```