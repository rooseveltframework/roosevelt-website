// this file starts a test server for development
(async () => {
  const { spawn } = require('child_process')

  await require('./common').build() // execute the full build script once
  let devServerProcess = startDevServer() // start the dev server

  // monitor for files that have been edited and re-run the static site generator when something is edited (this only rebuilds the hand-coded files; it will not rebuild any files that are sourced from the other modules)
  const { default: Watcher } = await import('watcher')
  const watcher = new Watcher('statics', { recursive: true })
  watcher.on('error', error => console.error(error))
  watcher.on('change', async (file) => {
    await devServerProcess.kill('SIGKILL') // kill the dev server
    await require('roosevelt')({ onBeforeStatics: require('./common').onBeforeStatics }).init() // build the altered file
    devServerProcess = startDevServer() // restart the dev server
  })

  // function to create a development server
  function startDevServer () {
    // TODO: eliminate the dev mode child process — to do that, we need to fix some kind of infinite reload glitch in express-browser-reload or roosevelt when the roosevelt server is stopped and then started again without the process itself being killed and restarted
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

// TODO: restore direct call to roosevelt static site generator when the child process is eliminated
// const testApp = require('roosevelt')({
//   logging: {
//     methods: {
//       http: true,
//       info: true,
//       warn: false, // this prevents the makeBuildArtifacts warning from appearing
//       error: true,
//       verbose: false
//     }
//   },
//   makeBuildArtifacts: false
// })
// await testApp.startServer()

// // monitor for files that have been edited and re-run the static site generator when something is edited (this only rebuilds the hand-coded files; it will not rebuild any files that are sourced from the other modules)
// // TODO: rebuild only files that were edited
// const { default: Watcher } = await import('watcher')
// const watcher = new Watcher('statics', { recursive: true })
// watcher.on('error', error => console.error(error))
// watcher.on('change', async (file) => {
//   require('roosevelt')().init()
//   await testApp.stopServer({ persistProcess: true })
//   const serverClosed = setInterval(async () => {
//     if (testApp.expressApp.get('roosevelt:state') !== 'disconnecting') {
//       clearInterval(serverClosed)
//       await testApp.startServer()
//     }
//   }, 1000)
// })
