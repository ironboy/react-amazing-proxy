
module.exports = (settings) => {
  if (typeof settings !== 'object') { settings = {}; }
  if (settings.dev === undefined) { settings.dev = false; }
  global.__reactAmazingProxySettings = settings;
  require('./start');
}