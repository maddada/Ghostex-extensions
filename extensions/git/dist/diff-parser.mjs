const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

function cleanPath(path) {
  const trimmed = path.trim();
  if (trimmed === '/dev/null') return trimmed;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/^[ab]\//, '');
}

function makeFile(header = '') {
  return {
    header,
    oldPath: '',
    newPath: '',
    hunks: [],
    metadata: [],
  };
}

function makeHunk(match, header) {
  return {
    header,
    oldStart: Number(match[1]),
    oldCount: match[2] === undefined ? 1 : Number(match[2]),
    newStart: Number(match[3]),
    newCount: match[4] === undefined ? 1 : Number(match[4]),
    heading: match[5].trim(),
    lines: [],
  };
}

export function parseUnifiedDiff(source) {
  if (typeof source !== 'string') {
    throw new TypeError('Unified diff source must be a string.');
  }

  const lines = source.replaceAll('\r\n', '\n').split('\n');
  if (source.endsWith('\n')) lines.pop();

  const files = [];
  let file = null;
  let hunk = null;
  let oldLine = 0;
  let newLine = 0;

  const ensureFile = () => {
    if (!file) {
      file = makeFile();
      files.push(file);
    }
    return file;
  };

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      file = makeFile(line);
      files.push(file);
      hunk = null;
      continue;
    }

    if (line.startsWith('--- ')) {
      ensureFile().oldPath = cleanPath(line.slice(4));
      continue;
    }

    if (line.startsWith('+++ ')) {
      ensureFile().newPath = cleanPath(line.slice(4));
      continue;
    }

    const hunkMatch = HUNK_HEADER.exec(line);
    if (hunkMatch) {
      hunk = makeHunk(hunkMatch, line);
      ensureFile().hunks.push(hunk);
      oldLine = hunk.oldStart;
      newLine = hunk.newStart;
      continue;
    }

    if (!hunk) {
      ensureFile().metadata.push(line);
      continue;
    }

    if (line.startsWith('+')) {
      hunk.lines.push({
        type: 'addition',
        oldNumber: null,
        newNumber: newLine,
        content: line.slice(1),
      });
      newLine += 1;
      continue;
    }

    if (line.startsWith('-')) {
      hunk.lines.push({
        type: 'deletion',
        oldNumber: oldLine,
        newNumber: null,
        content: line.slice(1),
      });
      oldLine += 1;
      continue;
    }

    if (line.startsWith(' ')) {
      hunk.lines.push({
        type: 'context',
        oldNumber: oldLine,
        newNumber: newLine,
        content: line.slice(1),
      });
      oldLine += 1;
      newLine += 1;
      continue;
    }

    hunk.lines.push({
      type: 'meta',
      oldNumber: null,
      newNumber: null,
      content: line,
    });
  }

  return files.filter(
    (entry) => entry.header || entry.oldPath || entry.newPath || entry.hunks.length > 0 || entry.metadata.some(Boolean)
  );
}

export function summarizeDiff(files) {
  let additions = 0;
  let deletions = 0;
  let hunks = 0;

  for (const file of files) {
    hunks += file.hunks.length;
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'addition') additions += 1;
        if (line.type === 'deletion') deletions += 1;
      }
    }
  }

  return {
    files: files.length,
    hunks,
    additions,
    deletions,
  };
}
