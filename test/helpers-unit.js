const { describe, it } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const { compareVersions, stripVersion } = require('../test-server')

describe('version helpers', () => {
  it('should order versions numerically rather than as strings', () => {
    // the string comparison this replaces put 0.10.0 before 0.9.0, which put the wrong version of the docs at the top of the version picker
    const sorted = ['0.10.0', '1.0.0', '0.9.0', '0.31.10', '0.31.5'].sort(compareVersions)

    assert.deepStrictEqual(sorted, ['0.9.0', '0.10.0', '0.31.5', '0.31.10', '1.0.0'])
  })

  it('should treat equal versions as equal', () => {
    assert.strictEqual(compareVersions('1.2.3', '1.2.3'), 0)
  })

  it('should treat a prerelease as older than the release it leads to', () => {
    assert.ok(compareVersions('1.0.0-beta.1', '1.0.0') < 0)
    assert.ok(compareVersions('1.0.0-beta.2', '1.0.0-beta.10') < 0, 'prerelease tags compare numerically too')
  })

  it('should reduce a versioned docs path to one that matches across versions', () => {
    // this is what lets the search index store an old version of a page as a pointer to the current one instead of another copy of the same text
    assert.strictEqual(stripVersion('docs/latest/get-started/index.html'), 'docs/*/get-started/index.html')
    assert.strictEqual(stripVersion('docs/0.31.5/get-started/index.html'), 'docs/*/get-started/index.html')
    assert.strictEqual(stripVersion('docs/teddy/1.1.4/index.html'), 'docs/teddy/*/index.html')
  })

  it('should leave a path with no version in it alone', () => {
    assert.strictEqual(stripVersion('design-philosophy/index.html'), 'design-philosophy/index.html')
  })

  it('should mark the templates that every page includes so roosevelt renders every page when one changes', () => {
    // roosevelt cannot ask a view engine which templates a page included, so this first line marker is how it knows a
    // template is a layout or a partial rather than a page; without it, editing one would rebuild only itself and leave
    // every page that includes it stale
    for (const template of ['nav.html', 'layouts/main.html']) {
      const file = path.join(__dirname, '..', 'statics/pages', template)
      assert.ok(fs.existsSync(file), `statics/pages/${template} should exist`)
      const firstLine = fs.readFileSync(file, 'utf8').trim().split('\n')[0]
      assert.ok(firstLine.includes('roosevelt-blocklist'), `statics/pages/${template} should carry the roosevelt-blocklist marker on its first line`)
    }
  })
})
