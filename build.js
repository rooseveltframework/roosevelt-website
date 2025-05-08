// this file does a full build of the static site

async function build () {
  await require('./common').prebuild()
  await require('./common').build()
}

build()
