// this file contains code that is common to both the full build and the development test server
require('@colors/colors')
const fs = require('fs')
const path = require('path')

// the --fast-mode cli flag builds only the current version of each module's docs, skipping the old versions, which are the large majority of the pages on the site
// it's meant for development; the old versions of the docs that are already in the docs folder are left alone rather than rebuilt or deleted, so the site remains browsable
const fastMode = process.argv.includes('--fast-mode')

// matches the folders that hold an old version of a module's docs; roosevelt's own docs are in docs/[version] while the other modules' docs are in docs/[repo-name]/[version]
const oldVersionPages = ['docs/[0-9]*.[0-9]*.[0-9]*/**', 'docs/*/[0-9]*.[0-9]*.[0-9]*/**']

// markdown files to convert to html
const repos = {
  'check-if-css-is-disabled': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html'
  },
  'crossplatform-killport': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html'
  },
  'express-browser-reload': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  'express-html-validator': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  'fallback-dependencies': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  'minify-html-attributes': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  'multi-db-driver': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  'node-php-runner': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  'progressively-enhance-web-components': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  roosevelt: {
    'CHANGELOG.md': 'changelog.html',
    'GET-STARTED.md': 'get-started.html',
    'CODING-APPS.md': 'coding-apps.html',
    'CONFIGURATION.md': 'configuration.html',
    'DEPLOYMENT.md': 'deployment.html'
    // roosevelt's configuration params are split across a set of CONFIG-*.md files; those are added below rather than listed here
  },
  'roosevelt-logger': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  'semantic-forms': {
    'CHANGELOG.md': 'changelog.html'
  },
  'single-page-express': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  'source-configs': {
    'README.md': 'index.html',
    'CHANGELOG.md': 'changelog.html',
    'USAGE.md': 'usage.html',
    'CONFIGURATION.md': 'configuration.html'
  },
  teddy: {
    'CHANGELOG.md': 'changelog.html'
  }
}

// roosevelt's configuration docs are an index page plus a set of subpages, and the details element in CONFIGURATION.md is the list of them
// reading that list rather than repeating it here means adding, renaming, or reordering a configuration page in roosevelt needs no change to this site
// versions of roosevelt from before the docs were split have no such element, which is what leaves configSubpages empty and keeps their pages building the way they always did
// a few of the labels in that list are too long to sit comfortably in the navigation
// only the navigation uses these: the page's own title and the table of contents keep the fuller wording, which is more descriptive in search results and matches how the docs read on github
const shortNavLabels = {
  'Isomorphic (single page app)': 'SPA support',
  'Events and Express variables': 'Events & Express vars',
  'Environment variables and command line usage': 'Env vars & CLI usage'
}

function harvestConfigSubpages () {
  let index
  try {
    index = fs.readFileSync(path.join('node_modules', 'docs-roosevelt', 'CONFIGURATION.md'), 'utf8')
  } catch {
    return [] // no configuration docs to read, so there are no subpages to build
  }

  const details = index.match(/<details[^>]*>[\s\S]*?<\/details>/i)
  if (!details) return []

  return [...details[0].matchAll(/<a href="\.\/([^"]+\.md)"[^>]*>([^<]+)<\/a>/g)].map(match => ({
    file: match[1],
    label: match[2],
    navLabel: shortNavLabels[match[2]] || match[2],
    // the file name decides the url, so CONFIG-FILE-PATHS.md is served at config-file-paths
    page: match[1].toLowerCase().replace(/\.md$/, '')
  }))
}

const configSubpages = harvestConfigSubpages()
for (const subpage of configSubpages) repos.roosevelt[subpage.file] = `${subpage.page}.html`

// compares two version numbers the way semver does, e.g. 1.2.10 is newer than 1.2.9 rather than older than it like a default alphabetical sort would conclude
function compareVersions (a, b) {
  // split the version number away from its prerelease tag, e.g. the "-beta.1" in "1.0.0-beta.1"
  const [aVersion, ...aPrerelease] = a.split('-')
  const [bVersion, ...bPrerelease] = b.split('-')

  // compare the major, then minor, then patch numbers numerically
  const aNumbers = aVersion.split('.').map(number => parseInt(number, 10) || 0)
  const bNumbers = bVersion.split('.').map(number => parseInt(number, 10) || 0)
  for (let i = 0; i < Math.max(aNumbers.length, bNumbers.length); i++) {
    const difference = (aNumbers[i] || 0) - (bNumbers[i] || 0)
    if (difference) return difference
  }

  // the numbers are identical, so a prerelease of a version is older than the release of that same version
  if (aPrerelease.length && !bPrerelease.length) return -1
  if (!aPrerelease.length && bPrerelease.length) return 1
  return aPrerelease.join('-').localeCompare(bPrerelease.join('-'), undefined, { numeric: true })
}

// this function executes before the roosevelt static site generator does its things
// its main purpose is to create teddy templates from markdown files and import templates from other repos to assemble the full list of pages to run through the static site generator
function onBeforeStatics (app) {
  app.get('teddy').clearTemplates()

  // count how many versions of the documentation there are for each module
  const versions = {}
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  for (const repo in repos) {
    // get the preexisting docs
    let files
    if (repo === 'roosevelt') files = fs.readdirSync('statics/pages/docs') // roosevelt's docs are in the docs folder
    else files = fs.readdirSync(`statics/pages/docs/${repo}`) // the other modules' docs are in docs/[repo-name]

    // see if the file is a folder named for a version number
    for (const file of files) {
      if (!numbers.includes(file.charAt(0))) continue // it's not a version folder
      if (!versions[repo]) versions[repo] = []
      versions[repo].push(file) // add this version to the list
    }
    versions[repo].sort(compareVersions).reverse() // sort the list so that the most recent version is at the start of the array
    versions[repo][0] = versions[repo][0] + ' (latest)' // append ' (latest)' to the most recent version
    versions[repo].push('Older...') // this will redirect to github commit history
  }

  // make an object with the same keys as `versions` and values set to 'latest' by default; will be overridden below for files derived from old versions of the docs
  const currentVersion = Object.keys(versions).reduce((acc, key) => {
    acc[key] = 'latest'
    return acc
  }, {})

  // create models for specific pages based on which repo it is derived from so we can include that repo's version history in the model
  const fileList = fs.readdirSync('statics/pages/docs', { recursive: true })
  for (const file of fileList) {
    if (!fs.lstatSync(path.join('statics/pages/docs', file)).isDirectory()) {
      const parts = file.split('/')
      let thisRepo
      if (versions[parts[0]]) thisRepo = parts[0]
      else thisRepo = 'roosevelt'
      const thisReposVersions = versions[thisRepo]

      // make links to each version of the docs
      const versionLinks = {}
      for (const version of thisReposVersions) {
        const isLatest = version.includes('latest')
        const versionWithoutLatest = version.split(' ')[0]
        const fileParts = file.split('/')
        const lastPart = fileParts.pop()
        fileParts.pop()
        let newUrl = ('/docs/' + fileParts.join('/') + '/' + (isLatest ? 'latest' : versionWithoutLatest) + '/' + lastPart).replace('//', '/')
        newUrl = newUrl.slice(0, -5)
        if (newUrl.endsWith('/index')) newUrl = newUrl.slice(0, -6)

        // the configuration subpages only exist from 0.32.0 onward, so picking an older version from one of them lands on the single configuration page those docs had rather than on a page that was never built
        if (thisRepo === 'roosevelt' && lastPart.startsWith('config-') && compareVersions(versionWithoutLatest, '0.32.0') < 0) newUrl = newUrl.replace(/\/config-[^/]*$/, '/configuration')

        if (version === 'Older...') newUrl = `https://github.com/rooseveltframework/${thisRepo}/commits/main/README.md`
        versionLinks[version] = newUrl
      }

      // set the currentVersion object for the template
      const localCurrentVersion = { ...currentVersion }
      localCurrentVersion[thisRepo] = file.split('/')
      localCurrentVersion[thisRepo] = localCurrentVersion[thisRepo][localCurrentVersion[thisRepo].length - 2]
      if (versions[thisRepo][0].replace(' (latest)', '') === localCurrentVersion[thisRepo]) localCurrentVersion[thisRepo] = 'latest'

      // set currentPage
      let currentPage = `/docs/${file.slice(0, -5)}`
      if (currentPage.endsWith('/index')) currentPage = currentPage.slice(0, -6)

      // the roosevelt version whose docs this page's navigation links to, which is the page's own version on a roosevelt page and the newest one everywhere else
      // the redirect pages that sit above the version folders have no version of their own, so they are treated as the newest one too
      const newestRoosevelt = versions.roosevelt[0].replace(' (latest)', '')
      const rooseveltVersion = !localCurrentVersion.roosevelt || localCurrentVersion.roosevelt === 'latest' ? newestRoosevelt : localCurrentVersion.roosevelt

      // set the model for this file
      const model = {
        currentPage,
        currentRepo: thisRepo,
        currentVersion: localCurrentVersion,
        versions: versionLinks,

        // roosevelt 0.32.0 split its configuration docs into an index plus a page per group of params
        // pages that link to an older version have to keep the navigation those docs had, which was a single configuration link, or they would offer subpages that do not exist for that version
        splitConfigDocs: compareVersions(rooseveltVersion, '0.32.0') >= 0,

        // the navigation builds its configuration subpage links from this, so it stays in step with whatever the index page lists
        configSubpages,

        // the configuration section of the navigation stays open while the visitor is somewhere inside it, the same way each module's section opens on its own pages
        // it is limited to roosevelt's own pages because several other modules have a configuration page of their own, and being on one of those is no reason to open this section
        currentPageIsConfig: thisRepo === 'roosevelt' && /^(configuration|config-)/.test(path.basename(file, '.html'))
      }

      /*
        if the number of doc files changed between versions (e.g. we added a new page like USAGE.md that wasn't there before or removed an old page), then extra work will need to be done here to account for that so that switching to older versions of the documentation doesn't create bugs related to missing pages or missing links

        to account for that, when the time comes that we are in a situation like that, do if statement callouts here if a version is above or below a certain number then set a boolean to display a certain link to be true or false

        e.g.

        if ([version below a certain version]) {
          model.displayRepoNameLink = [true/false]
        }

        then in nav.html, add a check for that boolean to display certain links
      */

      // instruct roosevelt to use this model for that page
      app.get('htmlModels')[`docs/${file}`] = model
    }
  }

  // the * model will apply to all pages and will be overridden by a more specific model if one exists for that page when the static site is built
  // the pages outside the docs tree, such as the splash page and the contributors list, link to the newest docs, so their navigation is built the way those docs' own pages build theirs
  app.get('htmlModels')['*'] = {
    currentVersion,
    splitConfigDocs: compareVersions(versions.roosevelt[0].replace(' (latest)', ''), '0.32.0') >= 0,
    configSubpages
  }
}

// build pages from the other modules first
async function prebuild () {
  require('@colors/colors')
  const fs = require('fs')
  const path = require('path')
  const Logger = require('roosevelt-logger')
  const logger = new Logger()

  // markdown to html converter
  const showdown = require('showdown')
  const showdownConverter = new showdown.Converter({
    omitExtraWLInCodeBlocks: true, // remove extra newline at the end of a code block
    simplifiedAutoLink: true, // parse links even if they're not enclosed in markdown syntax
    excludeTrailingPunctuationFromURLs: true, // another natural language link parsing option, e.g. www.example.com! doesn't add the excalamation point to the link
    strikethrough: true, // supports markdown strikethroughs
    tables: true // add support for tables
  })

  // fix bug in showdown related to disableForced4SpacesIndentedSublists not working correctly; this forces all lists to be 4 spaces per indentation level before running it through the markdown to html converter
  function normalizeMarkdownIndentation (inputMarkdown) {
    const lines = inputMarkdown.split('\n')
    const normalizedLines = lines.map(line => {
      // match lines that start with a bullet point (-) and have leading spaces
      return line.replace(/^(\s*)([-]\s)/, (match, spaces, bullet) => {
        const level = Math.floor(spaces.length / 2) // calculate nesting level based on 2-space increments
        const normalizedIndentation = '    '.repeat(level) // normalize to 4 spaces per level
        return normalizedIndentation + bullet
      })
    })
    return normalizedLines.join('\n')
  }

  // the templates some repos ship are copied in as they are, and they title their pages in lower case
  // rather than copying them byte for byte, the page title is capitalized on the way through so that every page on the site is titled the same way
  function copyTemplate (from, to) {
    const template = fs.readFileSync(from, 'utf8').replace(/(<arg pageTitle>)(.*?)(<\/arg>)/, (match, open, title, close) => {
      const parts = title.split(' — ')
      parts[parts.length - 1] = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
      return open + parts.join(' — ') + close
    })
    fs.writeFileSync(to, template)
  }

  function markdownToHTML (text) {
    return showdownConverter.makeHtml(normalizeMarkdownIndentation(text))
  }

  // markdown files link to each other by file name, which works when reading them on github and points at nothing here
  // each one is redirected to the page this site builds from it, with the version left as a teddy variable so the same html serves both the latest and the numbered copy of a page
  // a link to a file this site does not build is left alone, since a broken link that still says where it meant to go is better than one pointing at a page that was never made
  function rewriteDocLinks (html, repo) {
    return html.replace(/href="\.\/([A-Za-z0-9-]+\.md)(#[^"]*)?"/g, (match, file, anchor) => {
      const target = repos[repo][file]
      if (!target) return match
      const page = target === 'index.html' ? '' : target.replace(/\.html$/, '')
      const base = repo === 'roosevelt' ? '/docs/{currentVersion.roosevelt}' : `/docs/${repo}/{currentVersion.${repo}}`
      return `href="${base}/${page}${anchor || ''}"`
    })
  }

  // page titles for the main page for each of these projects
  const prettyNames = {
    'check-if-css-is-disabled': 'Check if CSS is disabled',
    'crossplatform-killport': 'Crossplatform killport',
    'express-browser-reload': 'Express browser reloader',
    'express-html-validator': 'Express HTML validator',
    'fallback-dependencies': 'Fallback dependencies',
    'minify-html-attributes': 'HTML attribute minifier',
    'multi-db-driver': 'Multi-DB Driver',
    'node-php-runner': 'Node.js PHP runner',
    roosevelt: 'Web Framework',
    'roosevelt-logger': 'Roosevelt logger',
    'progressively-enhance-web-components': 'SSR web components',
    'semantic-forms': 'Semantic Forms',
    'single-page-express': 'Single Page Express',
    'source-configs': 'Source Configs',
    teddy: 'Teddy'
  }

  // make the docs directory, which is where the pages for each project will be deposited and properly versioned
  if (!fs.existsSync('statics/pages/docs')) {
    fs.mkdirSync(path.normalize('statics/pages/docs'))
    logger.log('📁', 'roosevelt-website making new directory statics/pages/docs'.yellow)
  }

  // make the teddy templates for each repo
  for (const repo in repos) {
    const pkg = require(`./node_modules/docs-${repo}/package.json`)
    const version = pkg.version

    // copy preexisting templates from repos that already have some of their docs as teddy templates
    if (repo === 'semantic-forms') {
      if (!fs.existsSync(`statics/pages/docs/${repo}`)) {
        fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}`))
        logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}`.yellow)
      }
      if (!fs.existsSync(`statics/pages/docs/${repo}/latest`)) {
        fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}/latest`))
        logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}/latest`.yellow)
      }
      if (!fs.existsSync(`statics/pages/docs/${repo}/${version}`)) {
        fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}/${version}`))
        logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}/${version}`.yellow)
      }
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/index.html`), path.normalize(`statics/pages/docs/${repo}/latest/index.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/index.html`.green)
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/index.html`), path.normalize(`statics/pages/docs/${repo}/${version}/index.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/index.html`.green)

      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/usage.html`), path.normalize(`statics/pages/docs/${repo}/latest/usage.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/usage.html`.green)
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/usage.html`), path.normalize(`statics/pages/docs/${repo}/${version}/usage.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/usage.html`.green)

      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/fullDemo.html`), path.normalize(`statics/pages/docs/${repo}/latest/fullDemo.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/fullDemo.html`.green)
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/fullDemo.html`), path.normalize(`statics/pages/docs/${repo}/${version}/fullDemo.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/fullDemo.html`.green)

      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/reservedKeyboardShortcuts.html`), path.normalize(`statics/pages/docs/${repo}/latest/reservedKeyboardShortcuts.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/reservedKeyboardShortcuts.html`.green)
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/reservedKeyboardShortcuts.html`), path.normalize(`statics/pages/docs/${repo}/${version}/reservedKeyboardShortcuts.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/reservedKeyboardShortcuts.html`.green)
    } else if (repo === 'teddy') {
      if (!fs.existsSync(`statics/pages/docs/${repo}`)) {
        fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}`))
        logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}`.yellow)
      }
      if (!fs.existsSync(`statics/pages/docs/${repo}/latest`)) {
        fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}/latest`))
        logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}/latest`.yellow)
      }
      if (!fs.existsSync(`statics/pages/docs/${repo}/${version}`)) {
        fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}/${version}`))
        logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}/${version}`.yellow)
      }
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/index.html`), path.normalize(`statics/pages/docs/${repo}/latest/index.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/index.html`.green)
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/index.html`), path.normalize(`statics/pages/docs/${repo}/${version}/index.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/index.html`.green)

      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/usage.html`), path.normalize(`statics/pages/docs/${repo}/latest/usage.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/usage.html`.green)
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/usage.html`), path.normalize(`statics/pages/docs/${repo}/${version}/usage.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/usage.html`.green)

      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/configuration.html`), path.normalize(`statics/pages/docs/${repo}/latest/configuration.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/configuration.html`.green)
      copyTemplate(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/configuration.html`), path.normalize(`statics/pages/docs/${repo}/${version}/configuration.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/configuration.html`.green)
    }

    // convert markdown files in this repo to html
    for (const fileToConvert in repos[repo]) {
      let fileContents
      let fileToWrite = fileToConvert.split('.md')[0] + '.html'
      try {
        fileContents = fs.readFileSync(`./node_modules/docs-${repo}/${fileToConvert}`, 'utf8')
      } catch (err) {
        logger.error(`Could not load ./node_modules/docs-${repo}/${fileToConvert}`)
        continue
      }
      let html = markdownToHTML(fileContents)

      // the configuration index is the one page whose details element is worth keeping: everywhere else it exists only to give github a table of contents, but here it is the table of contents the page needs
      // so rather than being dropped it is rewritten to point at this site's own pages, with the version left as a teddy variable so the same html serves both the latest and the numbered copy of the page
      if (repo === 'roosevelt' && fileToConvert === 'CONFIGURATION.md' && configSubpages.length) {
        const links = configSubpages.map(subpage => `      <li><a href="/docs/{currentVersion.roosevelt}/${subpage.page}">${subpage.label}</a></li>`).join('\n')
        // showdown wraps the details element in a paragraph, and a nav inside a paragraph is not valid html, so the paragraph tags are replaced along with it
        html = html.replace(/(?:<p>\s*)?<details[^>]*>[\s\S]*?<\/details>(?:\s*<\/p>)?/i, `<nav class="toc">\n  <ul>\n${links}\n  </ul>\n</nav>`)
      }

      html = html.replace(/<details[^>]*>.*?<\/details>/gis, '') // remove <details open> from resulting output — that content is exclusive to viewing the file on github
      html = rewriteDocLinks(html, repo)

      // postprocess the generated html
      let pageTitle = fileToConvert.split('.md')[0]
      if (pageTitle === 'README') {
        pageTitle = prettyNames[repo] // so the page title is not README
        fileToWrite = 'index.html' // so the file is not README.html
      } else if (pageTitle === 'CHANGELOG') {
        pageTitle = 'Changelog' // so the page title is not CHANGELOG
        fileToWrite = 'changelog.html' // so the file is not CHANGELOG.html
      } else if (pageTitle === 'USAGE') {
        pageTitle = 'Usage' // so the page title is not USAGE
        fileToWrite = 'usage.html' // so the file is not USAGE.html
      } else if (pageTitle === 'CONFIGURATION') {
        pageTitle = 'Configuration' // so the page title is not CONFIGURATION
        fileToWrite = 'configuration.html' // so the file is not CONFIGURATION.html
      } else if (pageTitle === 'GET-STARTED') {
        pageTitle = 'Get started' // so the page title is not GET-STARTED
        fileToWrite = 'get-started.html' // so the file is not GET-STARTED.html
      } else if (pageTitle === 'CODING-APPS') {
        pageTitle = 'Coding apps' // so the page title is not CODING-APPS
        fileToWrite = 'coding-apps.html' // so the file is not CODING-APPS.html
      } else if (pageTitle === 'DEPLOYMENT') {
        pageTitle = 'Deployment' // so the page title is not DEPLOYMENT
        fileToWrite = 'deployment.html' // so the file is not DEPLOYMENT.html
      } else if (pageTitle.startsWith('CONFIG-')) {
        // a subpage of the configuration docs; the label comes from the index's details element so it reads the same here as it does there
        const subpage = configSubpages.find(candidate => candidate.file === fileToConvert)
        pageTitle = `Configuration — ${subpage.navLabel}` // the shorter label, since a tab or a search result has even less room for the long one than the navigation does
        // naming configuration too, since "file paths" alone gives no hint of what these are
        fileToWrite = `${subpage.page}.html`
      }
      let pageId = pageTitle.replaceAll(' ', '-').toLowerCase() // pageId is used to set CSS ids, so it can't have spaces and lowercase is preferred
      if (fileToWrite !== 'index.html') { // any page that is not the main landing page
        // roosevelt's own pages skip this, because the site name in the layout already says which project they belong to; every other module needs naming
        if (repo !== 'roosevelt') pageTitle = prettyNames[repo] + ' — ' + pageTitle // give the page a subtitle
        pageId = repo + '-' + pageTitle.replaceAll(' ', '-').toLowerCase() // pageId needs to include the subtitle too
      }
      html = `<include src="layouts/main">
<arg pageTitle>${pageTitle}</arg>
<arg pageId>${pageId}</arg>
<arg pageContent><article>${html}</article></arg></include>` // wrap the generated html in the static site's template layout

      // write templates to the statics/pages folder
      if (repo === 'roosevelt') { // roosevelt docs get deposited directly into statics/pages/docs
        const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <meta http-equiv="refresh" content="0;url=/docs/latest/get-started">
</head>
<body>
  <p id="redirecting">You are being redirected to <a href="/docs/latest/get-started">/docs/latest/get-started</a>. If the redirect does not happen automatically, click the link.</p>
</body>
</html>`
        if (!fs.existsSync('statics/pages/docs/index.html')) {
          fs.writeFileSync(path.normalize('statics/pages/docs/index.html'), redirectHtml)
          logger.log('📝', 'roosevelt-website writing new HTML file statics/pages/docs/index.html'.green)
        }
        if (!fs.existsSync('statics/pages/docs/latest')) {
          fs.mkdirSync(path.normalize('statics/pages/docs/latest'))
          logger.log('📁', 'roosevelt-website making new directory statics/pages/docs/latest'.yellow)
        }
        if (!fs.existsSync('statics/pages/docs/latest/index.html')) {
          fs.writeFileSync(path.normalize('statics/pages/docs/latest/index.html'), redirectHtml)
          logger.log('📝', 'roosevelt-website writing new HTML file statics/pages/docs/latest/index.html'.green)
        }
        if (!fs.existsSync(`statics/pages/docs/${version}`)) {
          fs.mkdirSync(path.normalize(`statics/pages/docs/${version}`))
          logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${version}`.yellow)
        }
        if (!fs.existsSync(`statics/pages/docs/${version}/index.html`)) {
          fs.writeFileSync(path.normalize(`statics/pages/docs/${version}/index.html`), redirectHtml)
          logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${version}/index.html`.green)
        }
        fs.writeFileSync(path.normalize(`statics/pages/docs/latest/${fileToWrite}`), html)
        logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/latest/${fileToWrite}`.green)
        fs.writeFileSync(path.normalize(`statics/pages/docs/${version}/${fileToWrite}`), html)
        logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${version}/${fileToWrite}`.green)
      } else { // the other projects' docs get deposited into statics/pages/docs/[repo-name]
        if (!fs.existsSync(`statics/pages/docs/${repo}`)) {
          fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}`))
          logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}`.yellow)
        }
        if (!fs.existsSync(`statics/pages/docs/${repo}/index.html`)) {
          fs.writeFileSync(path.normalize(`statics/pages/docs/${repo}/index.html`), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <meta http-equiv="refresh" content="0;url=/docs/${repo}/latest">
</head>
<body>
  <p id="redirecting">You are being redirected to <a href="/docs/${repo}/latest">/docs/${repo}/latest</a>. If the redirect does not happen automatically, click the link.</p>
</body>
</html>`)
          logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/index.html`.green)
        }
        if (!fs.existsSync(`statics/pages/docs/${repo}/latest`)) {
          fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}/latest`))
          logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}/latest`.yellow)
        }
        if (!fs.existsSync(`statics/pages/docs/${repo}/${version}`)) {
          fs.mkdirSync(path.normalize(`statics/pages/docs/${repo}/${version}`))
          logger.log('📁', `roosevelt-website making new directory statics/pages/docs/${repo}/${version}`.yellow)
        }
        fs.writeFileSync(path.normalize(`statics/pages/docs/${repo}/latest/${fileToWrite}`), html)
        logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/${fileToWrite}`.green)
        fs.writeFileSync(path.normalize(`statics/pages/docs/${repo}/${version}/${fileToWrite}`), html)
        logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/${fileToWrite}`.green)
      }
    }
  }
}

// build the static site
const cheerio = require('cheerio')
async function build () {
  const params = { onBeforeStatics }
  if (fastMode) {
    params.html = { blocklist: oldVersionPages } // skip rendering the old versions of each module's docs
    console.log('🧸  Fast mode: building only the current version of each module\'s docs. The old versions already in the docs folder are left as they are. Build without --fast-mode before committing.'.yellow)
  }
  await require('roosevelt')(params).init()

  // create CNAME for github pages
  fs.writeFileSync('docs/CNAME', 'rooseveltframework.org')

  buildSearchIndex()
}

// every page includes these two rather than them being pages of their own, so editing one means every page has to be rendered again
const sharedTemplates = ['nav.html', 'layouts/main.html']

// rebuilds only what the given edited files affect, which is what the dev server calls when it sees a file change
// rendering the pages is nearly the whole cost of a build, roughly 7 seconds against 2 for the css, js and images put together, so narrowing that down to the page that was actually edited is the only saving worth making
async function rebuild (changedFiles) {
  const pages = []
  let everyPage = false
  for (const file of changedFiles) {
    const edited = path.relative('statics', file).split(path.sep).join('/')
    if (!edited.startsWith('pages/')) continue // editing css, js or an image changes no page, so none need rendering again
    const page = edited.slice('pages/'.length)
    if (sharedTemplates.includes(page)) everyPage = true
    else pages.push(page)
  }

  const params = { onBeforeStatics }
  if (everyPage) {
    if (fastMode) params.html = { blocklist: oldVersionPages }
  } else if (pages.length) params.html = { allowlist: pages }
  else params.html = { blocklist: ['**'] } // nothing that any page is built from changed, so skip rendering them entirely
  await require('roosevelt')(params).init()

  // the index is derived from the rendered pages, so it only needs redoing when one of them changed
  // it is redone in full rather than patched, because editing one page can change whether pages in every older version of the docs are stored as pointers to it
  if (everyPage || pages.length) buildSearchIndex()
}

function buildSearchIndex () {
  // build the search index for client-side search
  // it is split into one file for the current docs plus one file per old version of each module so that visitors only download the pages they can actually search from wherever they are, rather than every version of every module's docs on every page load
  const searchIndexDir = path.join('docs', 'js', 'search')
  if (!fastMode) fs.rmSync(searchIndexDir, { recursive: true, force: true }) // wipe it first so that deleted versions don't leave stale index files behind; in fast mode the old versions weren't rebuilt, so their index files are left alone too
  fs.mkdirSync(searchIndexDir, { recursive: true })

  const latestPages = [] // the site's own pages plus the current version of each module's docs
  const versionedPages = {} // the old versions of each module's docs, keyed by repo and version, e.g. `semantic-forms/5.1.3`
  for (const fileName of fs.readdirSync('docs', { recursive: true })) {
    const file = fileName.split(path.sep).join('/') // the index is consumed by the browser, so the paths in it need to be urls regardless of what os the site was built on
    if (!file.endsWith('.html')) continue

    // file the page under the version of the docs it belongs to; roosevelt's own docs are in docs/[version] while the other modules' docs are in docs/[repo-name]/[version]
    const shardMatch = file.match(/^docs\/(?:([^/]+)\/)?(\d+\.\d+\.\d+)\//)
    if (fastMode && shardMatch) continue // the old versions weren't rebuilt in fast mode, so their existing index files are still accurate

    const $ = cheerio.load(fs.readFileSync(path.join('docs/', file), 'utf8'))
    let title = $('title').html()
    if (title === 'Redirecting...') continue
    // the site's own name is dropped from search results, since every page carries it and it crowds out the part that tells them apart
    if (title.startsWith('Roosevelt Web Framework — ')) title = title.replace('Roosevelt Web Framework — ', '')
    if (file.includes('/latest/')) {
      title += ' (latest)'
    } else {
      // detect version numbers in the file path
      const versionMatch = file.match(/\/(\d+\.\d+\.\d+)\//) // matches version numbers like "1.0.0"
      if (versionMatch) {
        const versionNumber = versionMatch[1] // extract the version number
        title += ` (${versionNumber})`
      }
    }
    $('head, script, style, main header, #pages, footer, #redirecting').remove()
    const page = { file, title, text: $.text().replaceAll('\n', ' ') }

    if (shardMatch) {
      const shard = `${shardMatch[1] || 'roosevelt'}/${shardMatch[2]}`
      if (!versionedPages[shard]) versionedPages[shard] = []
      versionedPages[shard].push(page)
    } else latestPages.push(page)
  }

  // most pages don't change from one version of a module to the next, so any page in an old version of the docs that is identical to its counterpart in the current docs is stored as a pointer to that counterpart rather than as another copy of the same text
  const currentPagesByPath = {}
  for (const page of latestPages) currentPagesByPath[stripVersion(page.file)] = page
  for (const [shard, pages] of Object.entries(versionedPages)) {
    const entries = pages.map(page => {
      const currentPage = currentPagesByPath[stripVersion(page.file)]
      if (currentPage && currentPage.text === page.text) return { file: page.file, title: page.title, sameAs: currentPage.file }
      return page
    })
    fs.mkdirSync(path.join(searchIndexDir, path.dirname(shard)), { recursive: true })
    fs.writeFileSync(path.join(searchIndexDir, `${shard}.json`), JSON.stringify(entries))
  }
  fs.writeFileSync(path.join(searchIndexDir, 'latest.json'), JSON.stringify(latestPages))
  fs.rmSync(path.join('docs', 'js', 'siteTexts.js'), { force: true }) // replaced by the search index above
}

// removes the version number from a docs path so that the same page can be found across versions, e.g. both docs/latest/get-started/index.html and docs/0.31.5/get-started/index.html become docs/*/get-started/index.html
function stripVersion (file) {
  return file.replace(/\/(?:latest|\d+\.\d+\.\d+)\//, '/*/')
}

module.exports = {
  repos,
  onBeforeStatics,
  prebuild,
  build,
  rebuild
}
