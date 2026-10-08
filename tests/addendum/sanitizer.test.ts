import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../../src/security/html-sanitizer.js';
// T-084 / SRS §9.7 XSS corpus for the server allowlist (AT-35, NFR-02).
const allow = { imageAllowed: (kind: string, id: number) => kind === 'project-file' && id === 7 };
const clean = (html: string) => sanitizeHtml(html, allow).html;
// Anything executable or able to load remote content must never survive serialization.
const forbidden =
  /<\s*(script|style|iframe|object|embed|svg|math|template|form|base|meta|link|frame|video|audio|textarea)\b|\son[a-z]+\s*=|javascript:|vbscript:|data:|srcdoc|formaction|xlink|expression\(|<!--|style\s*=/i;
const corpus = [
  '<script>alert(1)</script>',
  '<SCRIPT SRC=//x.example/x.js></SCRIPT>',
  '<scr<script>ipt>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<img src="/api/project-files/7/download" onerror="alert(1)">',
  '<img src="/api/project-files/8/download">',
  '<img src="/api/project-files/7/download?x=1">',
  '<img src="https://evil.example/a.png">',
  '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
  '<a href="javascript:alert(1)">x</a>',
  '<a href="JaVaScRiPt:alert(1)">x</a>',
  '<a href="java\tscript:alert(1)">x</a>',
  '<a href="&#106;avascript:alert(1)">x</a>',
  '<a href="&#x6A;avascript&colon;alert(1)">x</a>',
  '<a href=" \u0001javascript:alert(1)">x</a>',
  '<a href="vbscript:msgbox(1)">x</a>',
  '<a href="data:text/html,<script>alert(1)</script>">x</a>',
  '<a href="https://ok.example" onclick="alert(1)" target="_blank">ok</a>',
  '<p onclick="x" style="background:url(javascript:alert(1))">p</p>',
  '<div style="width:expression(alert(1))">d</div>',
  '<svg><script>alert(1)</script></svg>',
  '<svg onload=alert(1)>',
  '<math><mi xlink:href="javascript:alert(1)">m</mi></math>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<object data="x.swf"></object><embed src="x.swf">',
  '<form action="https://evil.example"><button formaction="javascript:alert(1)">b</button></form>',
  '<base href="https://evil.example/"><meta http-equiv="refresh" content="0;url=x"><link rel=stylesheet href=x>',
  '<style>@import "https://evil.example/x.css";</style>',
  '<template><img src=x onerror=alert(1)></template>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  '<textarea><img src=x onerror=alert(1)></textarea>',
  '<!--<img src=x onerror=alert(1)>-->',
  '<!--><img src=x onerror=alert(1)>-->',
  '<![CDATA[<img src=x onerror=alert(1)>]]>',
  '<p title="a&quot; onmouseover=&quot;alert(1)">t</p>',
  '<p/onmouseover=alert(1)>t</p>',
  '<img/src=x/onerror=alert(1)>',
  '"><img src=x onerror=alert(1)>',
  '&lt;script&gt;alert(1)&lt;/script&gt;',
  '<a href="https://ok.example/?q=&quot;><script>alert(1)</script>">q</a>',
  '<td colspan="2 onmouseover=alert(1)">c</td>',
  '<ul data-type="checklist" onclick="x"><li data-checked="true\\" onclick=\\"x">c</li></ul>',
  '<video><source onerror="alert(1)"></video><audio src=x onerror=alert(1)>',
  '<isindex action=javascript:alert(1) type=image>',
  '<details open ontoggle=alert(1)>',
  '<marquee onstart=alert(1)>',
  '<xss id=x tabindex=1 onfocus=alert(1)></xss>',
];
test('XSS corpus: no executable tag, handler, scheme or style survives', () => {
  for (const input of corpus) {
    const out = clean(input);
    assert.doesNotMatch(out, forbidden, `${input} → ${out}`);
    // Re-sanitizing the output is a fixed point: nothing re-parses into new markup.
    assert.equal(clean(out), out, input);
  }
});
test('Allowlist keeps the FR-48 formatting with safe, normalized attributes', () => {
  assert.equal(
    clean(
      '<h1>A</h1><h2>B</h2><h3>C</h3><p><b>b</b> <i>i</i> <u>u</u> <del>s</del><br></p>' +
        '<ul data-type="checklist"><li data-checked="true">done</li><li data-checked="false">todo</li></ul>' +
        '<ol><li>1</li></ol><pre><code>x &lt; y</code></pre><blockquote>q</blockquote>' +
        '<table><tbody><tr><th colspan="2">h</th></tr><tr><td>1</td><td rowspan="99">2</td></tr></tbody></table>' +
        '<a href="mailto:a@example.com">m</a><img src="/api/project-files/7/download" alt="ภาพ">',
    ),
    '<h1>A</h1><h2>B</h2><h3>C</h3><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s><br></p>' +
      '<ul data-type="checklist"><li data-checked="true">done</li><li data-checked="false">todo</li></ul>' +
      '<ol><li>1</li></ol><pre><code>x &lt; y</code></pre><blockquote>q</blockquote>' +
      '<table><tbody><tr><th colspan="2">h</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>' +
      '<a href="mailto:a@example.com" rel="noopener noreferrer nofollow">m</a><img src="/api/project-files/7/download" alt="ภาพ">',
  );
  assert.equal(
    clean('<a href="https://ok.example" onclick="x" target="_blank">ok</a>'),
    '<a href="https://ok.example" rel="noopener noreferrer nofollow">ok</a>',
  );
});
test('Text length counts decoded Thai/emoji text only; nesting and size stay bounded', () => {
  const r = sanitizeHtml('<p>ไทย&amp;<b>😀</b><script>ignored</script></p>');
  assert.equal(r.textLength, 'ไทย&😀'.length);
  assert.equal(r.html, '<p>ไทย&amp;<strong>😀</strong></p>');
  assert.throws(() => sanitizeHtml('<blockquote>'.repeat(65)), /DOC_TOO_DEEP/);
  const big = '<p>' + 'x<b>y</b>'.repeat(100000) + '</p>';
  const started = performance.now();
  assert.equal(sanitizeHtml(big).textLength, 200000);
  assert.ok(performance.now() - started < 2000, 'linear time on ~1 MB input');
});
