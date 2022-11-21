module.exports = (app) => {
  let model = {}
  model.version = app.get('package').version
  return model
}
