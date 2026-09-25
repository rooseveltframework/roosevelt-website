const { describe, it, before } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const { docsDir, builtSite, pages, read } = require('./support/site')

// a link is checked by looking for the file it points at, the way github pages would serve it
function resolves (link, fromPage) {
  const target = link.startsWith('/')
    ? link.slice(1)
    : path.posix.join(path.posix.dirname(fromPage), link)
  if (target === '' || target === '.') return true

  const full = path.join(docsDir, target)
  if (fs.existsSync(full)) {
    // a directory is served by the index.html inside it
    return !fs.statSync(full).isDirectory() || fs.existsSync(path.join(full, 'index.html'))
  }
  return false
}

// the links a page points at, with the ones that leave the site or only move within a page dropped
function internalLinks (html) {
  const $ = cheerio.load(html)
  const links = []
  $('a[href], link[href], script[src], img[src]').each((index, element) => {
    const raw = $(element).attr('href') || $(element).attr('src')
    if (!raw) return
    if (/^(https?:)?\/\//.test(raw) || raw.startsWith('mailto:') || raw.startsWith('data:') || raw.startsWith('#')) return
    links.push(raw.split('#')[0].split('?')[0])
  })
  return links.filter(Boolean)
}

describe('the built site', () => {
  let allPages

  before(() => {
    builtSite()
    allPages = pages()
  })

  it('should have built the pages the site is made of', () => {
    assert.ok(allPages.length > 100, `expected the whole site, found ${allPages.length} pages`)
    for (const page of ['index.html', 'design-philosophy/index.html', 'contributors/index.html']) {
      assert.ok(allPages.includes(page), `${page} should have been built`)
    }
  })

  it('should have a CNAME so github pages serves the site from its own domain', () => {
    assert.strictEqual(read('CNAME').trim(), 'rooseveltframework.org')
  })

  it('should give every page a title', () => {
    // the search index skips a page with no title, so a page missing one silently drops out of search
    const untitled = allPages.filter(page => !cheerio.load(read(page))('title').text().trim())

    assert.deepStrictEqual(untitled, [], 'these pages have no title')
  })

  // a renamed or deleted page leaves links to it behind, and nothing else in a build fails when that happens
  function brokenLinksIn (somePages) {
    const broken = []
    for (const page of somePages) {
      for (const link of internalLinks(read(page))) {
        if (!resolves(link, page)) broken.push(`${page} -> ${link}`)
      }
    }
    return broken
  }

  it('should not link to anything it did not build from the pages this repo writes', () => {
    // the pages under docs/ are markdown imported from each module's own repo, so this covers the ones authored here
    const own = allPages.filter(page => !page.startsWith('docs/'))
    assert.ok(own.length > 2, `expected this repo's own pages, found ${own.join(', ')}`)

    assert.deepStrictEqual(brokenLinksIn(own), [], 'these links point at files that were not built')
  })

  // the pages under docs/ are markdown imported from each module's own repo, and some of that markdown links to files in the repo that the site does not publish, such as a readme or a demo page, plus a placeholder in the sample app docs
  //
  // those are the module's own text and cannot be fixed from here
  //
  // links the site generates are deliberately not on this list: the version picker used to produce hundreds of dead links and now produces none, so any that come back are a regression rather than something to tolerate
  const arrivesBroken = [
    /(^|\/)(README|MIGRATION_GUIDE)\.md$/,
    /(^|\/)fullDemo\.html$/,
    /^\/somewhere$/
  ]

  it('should not link to anything it did not build, beyond what the imported markdown arrives with', () => {
    const unexpected = brokenLinksIn(allPages).filter(entry => {
      const target = entry.slice(entry.indexOf(' -> ') + 4)
      return !arrivesBroken.some(pattern => pattern.test(target))
    })

    // only the first few are shown, since a regression here can run to hundreds of links across every version of the docs
    assert.deepStrictEqual(unexpected.slice(0, 10), [], `${unexpected.length} broken link(s) of a kind that is not already known about`)
  })

  // the markdown's anchor links are written against the ids github gives its headings, so a page whose headings were given ids some other way leaves every one of them pointing at nothing, and nothing else in a build notices
  //
  // an anchor is checked against the page it lands on, whether that is the page it sits on or another one on the site; a link to a page that was not built is the test above's to report
  const anchorsArriveBroken = [
    // roosevelt's configuration docs linked to a csrf protection section before they had one
    /^docs\/0\.31\.\d+\/configuration\/index\.html -> #csrf-protection$/
  ]

  it('should not link to a part of a page that is not there, beyond what the imported markdown arrives with', () => {
    const idsOn = {}
    function ids (page) {
      if (!idsOn[page]) {
        const $ = cheerio.load(read(page))
        idsOn[page] = new Set($('[id]').map((index, element) => $(element).attr('id')).get())
      }
      return idsOn[page]
    }

    const broken = []
    for (const page of allPages) {
      const $ = cheerio.load(read(page))
      $('a[href*="#"]').each((index, element) => {
        const href = $(element).attr('href')
        if (/^(https?:)?\/\//.test(href) || href.startsWith('mailto:')) return
        const [link, anchor] = href.split('#')
        if (!anchor) return

        let target = page
        if (link) {
          const file = (link.startsWith('/') ? link.slice(1) : path.posix.join(path.posix.dirname(page), link)).replace(/\/$/, '')
          target = [file, `${file}/index.html`, file || 'index.html'].find(candidate => allPages.includes(candidate))
          if (!target) return
        }

        const entry = `${page} -> ${href}`
        if (!ids(target).has(decodeURIComponent(anchor)) && !anchorsArriveBroken.some(pattern => pattern.test(entry))) broken.push(entry)
      })
    }

    // only the first few are shown, since a change to how headings get their ids breaks these on every version of the docs at once
    assert.deepStrictEqual(broken.slice(0, 10), [], `${broken.length} anchor link(s) name an id their page does not have`)
  })

  it('should not carry a docs folder that no longer belongs to any module it builds', () => {
    // a folder left behind by a renamed module keeps being rendered, and its pages get the wrong module's version list, which is how one stale folder produced hundreds of dead links
    const { repos } = require('../test-server')
    const known = new Set(Object.keys(repos))
    const orphans = fs.readdirSync(path.join(__dirname, '..', 'statics/pages/docs'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => !known.has(name) && !/^(\d+\.\d+\.\d+|latest)$/.test(name))

    assert.deepStrictEqual(orphans, [], 'these folders under statics/pages/docs match no module the site builds')
  })

  describe('the search index', () => {
    let latest

    before(() => {
      latest = JSON.parse(read('js/search/latest.json'))
    })

    it('should cover the current pages', () => {
      assert.ok(latest.length > 20, `expected the current pages to be indexed, found ${latest.length}`)
      for (const entry of latest) {
        assert.ok(entry.file, 'every entry needs the page it came from')
        assert.ok(entry.title, `${entry.file} was indexed without a title`)
        assert.ok(typeof entry.text === 'string', `${entry.file} was indexed without any text`)
      }
    })

    it('should only index pages that exist', () => {
      const missing = latest.filter(entry => !fs.existsSync(path.join(docsDir, entry.file)))

      assert.deepStrictEqual(missing.map(entry => entry.file), [], 'these indexed pages were not built')
    })

    it('should drop the site name from titles so results are told apart by the rest', () => {
      const notTrimmed = latest.filter(entry => entry.title.startsWith('Roosevelt Web Framework — '))

      assert.deepStrictEqual(notTrimmed.map(entry => entry.file), [])
    })

    it('should point an unchanged page in an older version at the current one rather than copying its text', () => {
      // this is most of what keeps the index small, so it is worth knowing if it stops happening
      const shards = fs.readdirSync(path.join(docsDir, 'js/search'), { recursive: true })
        .map(file => file.split(path.sep).join('/'))
        .filter(file => file.endsWith('.json') && file !== 'latest.json')
      assert.ok(shards.length > 0, 'expected an index shard per older version of each module\'s docs')

      const byFile = new Set(latest.map(entry => entry.file))
      let pointers = 0
      for (const shard of shards) {
        for (const entry of JSON.parse(read(path.posix.join('js/search', shard)))) {
          if (!entry.sameAs) continue
          pointers++
          assert.ok(byFile.has(entry.sameAs), `${shard} points at ${entry.sameAs}, which is not in the current index`)
          assert.strictEqual(entry.text, undefined, `${shard} stores both a pointer and a copy of the text for ${entry.file}`)
        }
      }

      assert.ok(pointers > 0, 'expected at least one older page to be stored as a pointer')
    })
  })
})
