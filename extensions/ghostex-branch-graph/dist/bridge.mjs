import helperSource from './helper-source.mjs';

const quote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
export async function readRepository(input, path) {
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(input))));
  const result = await window.ghostex.exec(
    `node --input-type=module -e ${quote(helperSource)} ${quote(encoded)}`, { cwd: path },
  );
  let data;
  try { data = JSON.parse(result.stdout); }
  catch {
    throw new Error(/node.*(?:not found|command not found)/i.test(result.stderr || '')
      ? 'Node.js is needed. Install it from Ghostex Settings → Integrations → Tools.'
      : 'Git did not return a result. Refresh and try again.');
  }
  if (data.kind === 'error') throw new Error(data.message);
  if (result.exitCode !== 0) throw new Error('Git could not complete this action.');
  return data;
}
