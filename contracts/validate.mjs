import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const contract = JSON.parse(readFileSync(new URL('./openapi.json', import.meta.url), 'utf8'));
const bundleId = 'urn:friday:contract:1';
const rewrite = (value) => {
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === '$ref' ? item.replace('#/components/schemas/', `${bundleId}#/$defs/`) : rewrite(item)]));
  return value;
};
export const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
addFormats(ajv);
// JSON Schema maxLength counts Unicode scalars; NVARCHAR(n) capacity is UTF16 code units.
ajv.addKeyword({ keyword: 'x-utf16MaxLength', type: 'string', schemaType: 'number', validate: (max, data) => data.length <= max });
ajv.addFormat('binary', { type: 'string', validate: () => true });
ajv.addSchema({ $id: bundleId, $schema: contract.jsonSchemaDialect, $defs: rewrite(contract.components.schemas) });
// Runtime schemas have equivalent transient copies (query/body/UUID checks).
// Ajv caches by object identity; rewriting a new object per call retained every
// compilation. Own a bounded content cache and release Ajv's transient root.
const validators = new Map();
const validatorLimit = 128;
export function validator(schema) {
  const key = JSON.stringify(schema);
  let validate = validators.get(key);
  if (validate) {
    validators.delete(key);
    validators.set(key, validate);
    return validate;
  }
  const compiledSchema = rewrite(schema);
  validate = ajv.compile(compiledSchema);
  if (compiledSchema && typeof compiledSchema === 'object') ajv.removeSchema(compiledSchema);
  validators.set(key, validate);
  if (validators.size > validatorLimit) validators.delete(validators.keys().next().value);
  return validate;
}
export function operation(method, path) {
  const op = contract.paths[path]?.[method.toLowerCase()];
  if (!op) throw new Error(`Unknown contract operation: ${method} ${path}`);
  return op;
}
export function schemaValidator(name) { return ajv.getSchema(`${bundleId}#/$defs/${name}`); }

// Validate JSON body shape and pure cross-field rules. Database-dependent checks are NOT performed here.
export function validateRequest(method, path, body, currentTask = null) {
  const op = operation(method, path);
  const media = op.requestBody?.content;
  if (!media) return { valid: body === undefined, errors: body === undefined ? [] : [{ message: 'This operation does not accept a body' }] };
  const schema = (media['application/json'] ?? media['multipart/form-data']).schema;
  const validate = validator(schema);
  if (!validate(body)) return { valid: false, errors: validate.errors };
  const errors = [];
  if (path === '/api/tasks' && method.toUpperCase() === 'POST' || path === '/api/tasks/{id}' && method.toUpperCase() === 'PATCH') {
    if (method.toUpperCase() === 'PATCH' && !currentTask) return { valid: false, errors: [{ message: 'Merged-state validation requires the current authorized task' }] };
    const task = { ...(currentTask ?? { recurrence: 'none', start_date: null, due_date: null }), ...body };
    if (task.start_date && task.due_date && task.start_date > task.due_date) errors.push({ field: 'start_date', message: 'start_date must not exceed due_date' });
    if (task.recurrence !== 'none' && !task.due_date) errors.push({ field: 'due_date', message: 'recurrence requires due_date' });
  }
  if (path.endsWith('/board/move')) {
    if (body.before_task_id === body.task_id) errors.push({ field: 'before_task_id', message: 'Anchor must not be the task itself' });
    if (body.from_status === body.to_status && body.source_column_version !== body.target_column_version) errors.push({ field: 'target_column_version', message: 'Same column requires the same version' });
  }
  return { valid: errors.length === 0, errors };
}

// HTTP adapters must decode this exact wire representation before schema validation; never coerce JSON bodies.
export function decodeQuery(method, path, searchParams) {
  const schema = operation(method, path)['x-query-schema'];
  const resolved = schema.$ref ? contract.components.schemas[schema.$ref.split('/').at(-1)] : schema;
  const properties = resolved.properties;
  const query = {};
  for (const key of new Set(searchParams.keys())) {
    if (!Object.hasOwn(properties, key)) throw new Error(`Unknown query parameter: ${key}`);
    const shape = properties[key];
    const values = searchParams.getAll(key);
    const decode = (raw, definition) => {
      const def = definition.$ref ? contract.components.schemas[definition.$ref.split('/').at(-1)] : definition;
      if (def.anyOf) {
        if (raw === 'null' && def.anyOf.some((item) => item.type === 'null')) return null;
        return decode(raw, def.anyOf.find((item) => item.type !== 'null'));
      }
      if (def.type === 'integer') {
        if (!/^(0|[1-9][0-9]*)$/.test(raw)) throw new Error(`Invalid integer query parameter: ${key}`);
        return Number(raw);
      }
      if (def.type === 'boolean') {
        if (!['true', 'false'].includes(raw)) throw new Error(`Invalid boolean query parameter: ${key}`);
        return raw === 'true';
      }
      return raw;
    };
    if (shape.type === 'array') query[key] = values.map((raw) => decode(raw, shape.items));
    else {
      if (values.length !== 1) throw new Error(`Repeated scalar query parameter: ${key}`);
      query[key] = decode(values[0], shape);
    }
  }
  const validate = validator(schema);
  if (!validate(query)) throw new Error('Query does not match schema');
  for (const [from, to] of [['due_from', 'due_to'], ['date_from', 'date_to']]) if (query[from] && query[to] && query[from] > query[to]) throw new Error(`Reversed date range: ${from}`);
  if (query.has_due === false && (query.due_from || query.due_to || query.date_basis === 'due' && (query.date_from || query.date_to))) throw new Error('No-due filter conflicts with a due-date range');
  return query;
}
