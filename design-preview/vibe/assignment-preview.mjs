// Owner-requested assignment proposal, isolated from production contracts.
export function assignmentPreview(html) {
  html = html.replace('initialTasks.forEach((t) => {', `initialTasks.forEach((t) => {
            t.assignees = t.assignee ? [t.assignee] : [];
            t.checks.forEach(c => c.assignee ??= null);`);
  html = html.replace("function filtered() {", `
        const assigneeIds = t => t.assignees ?? (t.assignee ? [t.assignee] : []);
        const assigneeNames = t => assigneeIds(t).length ? assigneeIds(t).map(personName).join(', ') : 'Unassigned';
        const assigneeAvatars = t => '<span class="task-assignee-avatars">' + (assigneeIds(t).length ? assigneeIds(t).map(avatar).join('') : avatar(null)) + '</span>';
        const eligiblePeople = () => people.filter(p => users.some(u => u.id === p.id && u.active));
        function filtered() {`);
  html = html.replaceAll('t.assignee === 1', 'assigneeIds(t).includes(1)')
    .replaceAll('t.assignee === person.id', 'assigneeIds(t).includes(person.id)')
    .replaceAll('draft.assignee !== 1', '!assigneeIds(draft).includes(1)')
    .replaceAll("String(t.assignee ?? 'none') === personFilter", "(personFilter === 'none' ? !assigneeIds(t).length : assigneeIds(t).includes(Number(personFilter)))")
    .replaceAll('!t.assignee &&', '!assigneeIds(t).length &&')
    .replaceAll('personName(t.assignee)', 'assigneeNames(t)')
    .replaceAll('avatar(t.assignee)', 'assigneeAvatars(t)');
  html = html.replace('assignee: null,\n                priority:', 'assignee: null,\n                assignees: [],\n                priority:');
  html = html.replace("if (f.has('assignee'))\n              draft.assignee = f.get('assignee') ? Number(f.get('assignee')) : null;", `if (form.querySelector('select[name="assignee"]') && !form.querySelector('select[name="assignee"]').disabled) {
              draft.assignees = [...new Set(f.getAll('assignee').filter(Boolean).map(Number))];
              draft.assignee = draft.assignees[0] ?? null;
            }`);
  html = html.replace(/<select name="assignee"[\s\S]*?<\/select>/, "<select name=\"assignee\" multiple aria-label=\"Assignees\" ${!writable ? 'disabled' : ''}>${eligiblePeople().map((p) => `<option value=\"${p.id}\" ${assigneeIds(draft).includes(p.id) ? 'selected' : ''}>${p.name}</option>`).join('')}</select><span class=\"hint\">Select one or more people · Clear all to leave unassigned</span>");
  html = html.replace('<span>Assignee</span><select name="assignee"', '<span>Assignees</span><select name="assignee"');
  html = html.replace(/<label class="check-row \u0024\{c.done[\s\S]*?<\/label>/, "<div class=\"check-item\"><label class=\"check-row ${c.done ? 'completed' : ''}\"><input type=\"checkbox\" data-check=\"${i}\" ${c.done ? 'checked' : ''} ${!writable || original.status === 'done' ? 'disabled' : ''}><span>${esc(c.title)}</span></label><label class=\"field checklist-assignee\"><span class=\"sr-only\">Assign checklist: ${esc(c.title)}</span><select data-check-assignee=\"${i}\" aria-label=\"Assign checklist: ${esc(c.title)}\" ${!writable || original.status === 'done' ? 'disabled' : ''}><option value=\"\">Unassigned</option>${eligiblePeople().map(p => `<option value=\"${p.id}\" ${c.assignee === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}</select></label></div>");
  html = html.replace("if (target.dataset.check !== undefined &&", `if (target.dataset.checkAssignee !== undefined) {
            if (writeAllowed() && original.status !== 'done') {
              const id = Number(target.value) || null;
              if (id && !eligiblePeople().some(p => p.id === id)) return;
              draft.checks[Number(target.dataset.checkAssignee)].assignee = id;
              dirty = true;
              $('#draft-label').textContent = 'Unsaved changes';
            }
            return;
          }
          if (target.dataset.check !== undefined &&`);
  if (!html.includes('data-check-assignee=') || !html.includes('name="assignee" multiple'))
    throw new Error('Assignment preview hook targets missing');
  html = html.replace(/<button class="status \$\{t.status\}"[\s\S]*?\$\{statuses\[t.status\].label\}<\/button>/,
    '<select data-status-picker data-card-status="${t.id}" aria-label="Status ${esc(t.title)}" ${!writeAllowed() ? \'disabled\' : \'\'}>${Object.entries(statuses).map(([value,meta]) => `<option value="${value}" ${t.status === value ? \'selected\' : \'\'}>${meta.label}</option>`).join(\'\')}</select>');
  return html;
}
