import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const helper=readFileSync(new URL('../src/repository.mjs',import.meta.url),'utf8');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function read(cwd,input={}) {
  return JSON.parse(execFileSync('node',['--input-type=module','-e',helper,Buffer.from(JSON.stringify(input)).toString('base64')],{cwd,encoding:'utf8'}));
}
test('repository helper handles empty repos, branches, merges, tags, worktrees, and unusual names',()=>{
  const root=mkdtempSync(join(tmpdir(),"ghostex-graph-ä'-$-"));
  try {
    git(root,'init','-b','main'); git(root,'config','user.name','Åuthor <script>'); git(root,'config','user.email','author@example.test');
    assert.equal(read(root).kind,'empty');
    writeFileSync(join(root,'file with spaces.txt'),'one'); git(root,'add','.'); git(root,'commit','-m','First <img src=x onerror=alert(1)>');
    git(root,'checkout','-b','feature'); writeFileSync(join(root,'ä-feature.txt'),'two'); git(root,'add','.'); git(root,'commit','-m','Änderung 🦊');
    git(root,'tag','-a','v1','-m','Version 1');
    git(root,'checkout','main'); writeFileSync(join(root,'main.txt'),'three'); git(root,'add','.'); git(root,'commit','-m','Main');
    git(root,'merge','--no-ff','feature','-m','Merge feature');
    const data=read(root);
    assert.equal(data.branch,'main'); assert.equal(data.commits.length,4);
    assert.equal(data.commits[0].parents.length,2);
    assert.equal(data.commits.find(c=>c.subject==='Änderung 🦊').author,'Åuthor script');
    assert.ok(data.refs.find(ref=>ref.name==='v1' && ref.hash===git(root,'rev-parse','v1^{}')));
    const details=read(root,{action:'details',hash:data.head});
    assert.ok(details.files.some(file=>file.path==='ä-feature.txt'));
    const worktree=join(root,'linked-worktree'); git(root,'worktree','add','-b','worktree-branch',worktree);
    assert.equal(read(worktree).branch,'worktree-branch');
    git(worktree,'checkout','--detach'); assert.equal(read(worktree).branch,'');
    assert.equal(read(tmpdir()).kind,'not-repository');
  } finally { rmSync(root,{recursive:true,force:true}); }
});
