// this file starts a test server for development
(async () => {
  const { spawn } = require('child_process')

  // execute the full build script once
  await require('./common').prebuild()
  await require('./common').build()

  // start the dev server
  startDevServer()

  // monitor for files that have been edited and re-run the static site generator when something is edited (this only rebuilds the hand-coded files; it will not rebuild any files that are sourced from the other modules)
  const { default: Watcher } = await import('watcher')
  const watcher = new Watcher('statics', { recursive: true })
  watcher.on('error', error => console.error(error))
  let rebuilding = false
  watcher.on('change', async (file) => {
    if (!rebuilding) {
      rebuilding = true
      await require('./common').build()
      rebuilding = false
    }
  })

  // function to create a development server
  function startDevServer () {
    return spawn('node', ['-e', `
      require('roosevelt')({
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
    `], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    })
  }
})()
