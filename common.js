// this file contains code that is common to both the full build and the development test server
require('@colors/colors')
const fs = require('fs')
const path = require('path')

// markdown files to convert to html
const repos = {
  'check-if-CSS-is-disabled': {
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
  'multi-db': {
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
    versions[repo].sort().reverse() // sort the list so that the most recent version is at the start of the array
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

      // set the model for this file
      const model = {
        currentPage,
        currentRepo: thisRepo,
        currentVersion: localCurrentVersion,
        versions: versionLinks
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
  app.get('htmlModels')['*'] = {
    currentVersion
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

  function markdownToHTML (text) {
    return showdownConverter.makeHtml(normalizeMarkdownIndentation(text))
  }

  // page titles for the main page for each of these projects
  const prettyNames = {
    'check-if-CSS-is-disabled': 'Check if CSS is disabled',
    'crossplatform-killport': 'Crossplatform killport',
    'express-browser-reload': 'Express browser reloader',
    'express-html-validator': 'Express HTML validator',
    'fallback-dependencies': 'Fallback dependencies',
    'minify-html-attributes': 'HTML attribute minifier',
    'multi-db': 'Multi-DB',
    'node-php-runner': 'Node.js PHP runner',
    roosevelt: 'web framework',
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
      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/index.html`), path.normalize(`statics/pages/docs/${repo}/latest/index.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/index.html`.green)
      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/index.html`), path.normalize(`statics/pages/docs/${repo}/${version}/index.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/index.html`.green)

      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/usage.html`), path.normalize(`statics/pages/docs/${repo}/latest/usage.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/usage.html`.green)
      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/usage.html`), path.normalize(`statics/pages/docs/${repo}/${version}/usage.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/usage.html`.green)
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
      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/index.html`), path.normalize(`statics/pages/docs/${repo}/latest/index.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/index.html`.green)
      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/index.html`), path.normalize(`statics/pages/docs/${repo}/${version}/index.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/index.html`.green)

      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/usage.html`), path.normalize(`statics/pages/docs/${repo}/latest/usage.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/usage.html`.green)
      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/usage.html`), path.normalize(`statics/pages/docs/${repo}/${version}/usage.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/${version}/usage.html`.green)

      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/configuration.html`), path.normalize(`statics/pages/docs/${repo}/latest/configuration.html`))
      logger.log('📝', `roosevelt-website writing new HTML file statics/pages/docs/${repo}/latest/configuration.html`.green)
      fs.copyFileSync(path.normalize(`./node_modules/docs-${repo}/docs/statics/pages/configuration.html`), path.normalize(`statics/pages/docs/${repo}/${version}/configuration.html`))
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
      let html = markdownToHTML(fileContents).replace(/<details[^>]*>.*?<\/details>/gis, '') // remove <details open> from resulting output — that content is exclusive to viewing the file on github

      // postprocess the generated html
      let pageTitle = fileToConvert.split('.md')[0]
      if (pageTitle === 'README') {
        pageTitle = prettyNames[repo] // so the page title is not README
        fileToWrite = 'index.html' // so the file is not README.html
      } else if (pageTitle === 'CHANGELOG') {
        pageTitle = 'changelog' // so the page title is not CHANGELOG
        fileToWrite = 'changelog.html' // so the file is not CHANGELOG.html
      } else if (pageTitle === 'USAGE') {
        pageTitle = 'usage' // so the page title is not USAGE
        fileToWrite = 'usage.html' // so the file is not USAGE.html
      } else if (pageTitle === 'CONFIGURATION') {
        pageTitle = 'configuration' // so the page title is not CONFIGURATION
        fileToWrite = 'configuration.html' // so the file is not CONFIGURATION.html
      } else if (pageTitle === 'GET-STARTED') {
        pageTitle = 'get started' // so the page title is not GET-STARTED
        fileToWrite = 'get-started.html' // so the file is not GET-STARTED.html
      } else if (pageTitle === 'CODING-APPS') {
        pageTitle = 'coding apps' // so the page title is not CODING-APPS
        fileToWrite = 'coding-apps.html' // so the file is not CODING-APPS.html
      } else if (pageTitle === 'DEPLOYMENT') {
        pageTitle = 'deployment' // so the page title is not DEPLOYMENT
        fileToWrite = 'deployment.html' // so the file is not DEPLOYMENT.html
      }
      let pageId = pageTitle.replaceAll(' ', '-').toLowerCase() // pageId is used to set CSS ids, so it can't have spaces and lowercase is preferred
      if (fileToWrite !== 'index.html') { // any page that is not the main landing page
        pageTitle = prettyNames[repo] + ' — ' + pageTitle // give the page a subtitle
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
  await require('roosevelt')({ onBeforeStatics }).init()

  // create CNAME for github pages
  fs.writeFileSync('docs/CNAME', 'rooseveltframework.org')

  // build siteTexts.js for client-side search
  const fileList = fs.readdirSync('docs', { recursive: true })

  // sort the fileList array so that strings with version numbers are moved to the end
  fileList.sort((a, b) => {
    const versionRegex = /\d+\.\d+\.\d+/ // matches version numbers like "1.0.0"

    const aHasVersion = versionRegex.test(a)
    const bHasVersion = versionRegex.test(b)

    if (aHasVersion && !bHasVersion) {
      return 1 // move `a` after `b`
    } else if (!aHasVersion && bHasVersion) {
      return -1 // move `a` before `b`
    } else {
      return 0 // keep the original order if both or neither have version numbers
    }
  })

  let siteTexts = 'window.siteTexts = []'
  for (const file of fileList) {
    if (file.endsWith('.html')) {
      const $ = cheerio.load(fs.readFileSync(path.join('docs/', file), 'utf8'))
      let title = $('title').html()
      if (title === 'Redirecting...') continue
      if (title.startsWith('Roosevelt web framework — ')) title = title.replace('Roosevelt web framework — ', '')
      if (title.startsWith('web framework — ')) title = title.replace('web framework — ', '')
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
      const text = $.text().replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', ' ')
      siteTexts += `\nwindow.siteTexts.push({file: "${file}", title: "${title}", text: "${text}"})`
    }
  }
  fs.writeFileSync('docs/js/siteTexts.js', siteTexts)
}

module.exports = {
  repos,
  onBeforeStatics,
  prebuild,
  build
}
