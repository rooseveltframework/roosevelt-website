// this file starts a development server that rebuilds the site as you edit it

// roosevelt writes the mode it resolved into NODE_ENV, and it reads NODE_ENV at a higher priority than the params it is constructed with
// so whichever roosevelt runs first in a process decides the mode for every one after it, which is why this is set before anything else rather than passed to the server below
// a --production-mode flag still wins, because roosevelt reads command line flags at a higher priority again
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

;(async () => {
  const common = require('./common')

  // the whole site has to exist before there is anything to serve
  await common.prebuild()
  await common.build()

  // this serves the built site out of the docs folder and builds nothing itself
  // in development mode roosevelt injects its browser reload script into any html it serves, static files included, so the page refreshes itself once a rebuild finishes
  await require('roosevelt')({
    logging: {
      methods: {
        http: true,
        info: true,
        warn: false, // this prevents the makeBuildArtifacts warning from appearing
        error: true,
        verbose: false
      }
    },
    makeBuildArtifacts: false
  }).startServer()

  // rebuild whenever anything under statics is edited
  // every kind of change is listened for, not just edits to existing files, because adding or deleting a page has to be picked up too
  const { default: Watcher } = await import('watcher')
  const watcher = new Watcher('statics', { recursive: true, ignoreInitial: true })
  watcher.on('error', error => console.error(error))

  // edits are collected rather than acted on one at a time, because saving a file often reports more than one change and a rebuild takes long enough that more edits usually arrive while one is running
  const edited = new Set()
  let rebuilding = false
  let debounce = null

  watcher.on('all', (event, file) => {
    if (!file || event === 'ready') return
    edited.add(file)
    clearTimeout(debounce)
    debounce = setTimeout(rebuild, 100) // let a burst of changes finish arriving before acting on it
  })

  async function rebuild () {
    if (rebuilding || !edited.size) return
    rebuilding = true
    const files = [...edited]
    edited.clear() // anything edited from here on is picked up by the next pass rather than dropped
    console.log(`🧸  Rebuilding for ${files.length === 1 ? files[0] : `${files.length} changed files`}`.cyan)
    const started = Date.now()
    try {
      await common.rebuild(files)
      console.log(`🧸  Rebuilt in ${((Date.now() - started) / 1000).toFixed(2)}s`.green)
    } catch (error) {
      console.error(error) // a build that fails should leave the server up so the next save can fix it
    }
    rebuilding = false
    if (edited.size) rebuild() // more arrived while that was running
  }
})()
