// ═══════════════════════════════════════════════════════════════════
// ShellForge File Manager — Automated API Integration Tests
// Tests real filesystem operations through the C adapter.
// Run: node tests/api.test.js  (backend must be running on :3001)
// ═══════════════════════════════════════════════════════════════════

const BASE = 'http://127.0.0.1:3001/api'
let passed = 0, failed = 0

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  return res.json()
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}${detail ? ': ' + detail : ''}`)
    failed++
  }
}

async function run() {
  console.log('\n🧪 ShellForge API Integration Tests\n')

  /* 1. Health */
  console.log('1. Health check')
  const health = await req('GET', '/health')
  assert('health endpoint ok',     health.success === true)
  assert('adapter ready',          health.data?.adapterReady === true)

  /* 2. List workspace root */
  console.log('\n2. List workspace root')
  const list = await req('GET', '/files?path=')
  assert('list returns success',   list.success === true)
  assert('entries is array',       Array.isArray(list.data?.entries))

  /* 3. Create directory */
  console.log('\n3. Create directory')
  const mkdirRes = await req('POST', '/files', { path: '__test_dir__', type: 'directory' })
  assert('mkdir success',          mkdirRes.success === true)
  assert('result is directory',    mkdirRes.data?.isDir === true)

  /* 4. Create file inside directory */
  console.log('\n4. Create file')
  const touchRes = await req('POST', '/files', { path: '__test_dir__/hello.txt', type: 'file' })
  assert('touch success',          touchRes.success === true)
  assert('result is file',         touchRes.data?.isDir === false)

  /* 5. Write content */
  console.log('\n5. Write file content')
  const writeRes = await req('PUT', '/files/content', {
    path: '__test_dir__/hello.txt',
    content: 'Hello from ShellForge!\nLine 2\nLine 3\n',
  })
  assert('write success',          writeRes.success === true)
  assert('bytes written',          writeRes.data?.size > 0)

  /* 6. Read content */
  console.log('\n6. Read file content')
  const readRes = await req('GET', '/files/content?path=__test_dir__/hello.txt')
  assert('read success',           readRes.success === true)
  assert('content matches',        readRes.data?.content?.includes('Hello from ShellForge!'))

  /* 7. Metadata */
  console.log('\n7. File metadata')
  const meta = await req('GET', '/files/metadata?path=__test_dir__/hello.txt')
  assert('metadata success',       meta.success === true)
  assert('has permissions',        typeof meta.data?.permissions === 'string')
  assert('has mtime',              !!meta.data?.mtime)
  assert('has owner',              !!meta.data?.owner)
  assert('has inode',              typeof meta.data?.inode === 'number')

  /* 8. Copy */
  console.log('\n8. Copy file')
  const copyRes = await req('POST', '/files/copy', {
    src: '__test_dir__/hello.txt',
    dst: '__test_dir__/hello_copy.txt',
  })
  assert('copy success',           copyRes.success === true)

  const listDir = await req('GET', '/files?path=__test_dir__')
  const names = listDir.data?.entries?.map(e => e.name) || []
  assert('copy exists in dir',     names.includes('hello_copy.txt'))

  /* 9. Rename */
  console.log('\n9. Rename file')
  const renameRes = await req('POST', '/files/rename', {
    src: '__test_dir__/hello_copy.txt',
    newName: 'renamed.txt',
  })
  assert('rename success',         renameRes.success === true)
  assert('new name returned',      renameRes.data?.name === 'renamed.txt')

  /* 10. Permissions read */
  console.log('\n10. Permissions')
  const permsGet = await req('GET', '/files/permissions?path=__test_dir__/hello.txt')
  assert('get perms success',      permsGet.success === true)
  assert('has octalMode',          !!permsGet.data?.octalMode)

  /* 11. chmod */
  const permsSet = await req('PATCH', '/files/permissions', {
    path: '__test_dir__/hello.txt',
    mode: '600',
  })
  assert('chmod success',          permsSet.success === true)
  const permsAfter = await req('GET', '/files/permissions?path=__test_dir__/hello.txt')
  assert('mode changed to 600',    permsAfter.data?.octalMode?.endsWith('600'))

  /* 12. Search */
  console.log('\n12. Search')
  const searchRes = await req('GET', '/search?q=hello&path=')
  assert('search success',         searchRes.success === true)
  assert('found our file',         searchRes.data?.results?.some(r => r.name.includes('hello')))

  /* 13. Path traversal blocked */
  console.log('\n13. Security – path traversal')
  const trav1 = await req('GET', '/files?path=../../etc')
  assert('traversal blocked (list)',  trav1.success === false)

  const trav2 = await req('GET', '/files/content?path=../../../etc/passwd')
  assert('traversal blocked (read)',  trav2.success === false)

  const trav3 = await req('DELETE', '/files', { path: '../../etc/passwd' })
  assert('traversal blocked (delete)',trav3.success === false)

  /* 14. Invalid path characters */
  console.log('\n14. Invalid filenames')
  const inv1 = await req('POST', '/files/rename', { src: '__test_dir__/hello.txt', newName: '../escape' })
  assert('slash in name rejected',   inv1.success === false)

  /* 15. Move */
  console.log('\n15. Move / rename within workspace')
  const moveRes = await req('POST', '/files/move', {
    src: '__test_dir__/renamed.txt',
    dst: '__test_dir__/moved.txt',
  })
  assert('move success',           moveRes.success === true)

  /* 16. Delete single file */
  console.log('\n16. Delete file')
  const delFile = await req('DELETE', '/files', { path: '__test_dir__/moved.txt' })
  assert('delete file success',    delFile.success === true)

  /* 17. Delete directory */
  console.log('\n17. Delete directory (recursive)')
  const delDir = await req('DELETE', '/files', { path: '__test_dir__' })
  assert('delete dir success',     delDir.success === true)

  /* Verify gone */
  const listAfter = await req('GET', '/files?path=__test_dir__')
  assert('dir gone after delete',  listAfter.success === false)

  /* ── Summary ─────────────────────────────────────────── */
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`)
  if (failed === 0) console.log('✅ All tests passed!\n')
  else console.error(`❌ ${failed} test(s) failed.\n`)

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error('Fatal:', e); process.exit(1) })
