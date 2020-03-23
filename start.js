const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const chokidar = require('chokidar');
const action = process.argv.slice(2)[0];

// Children
let apiServer;
let devServer;

// Hoisted here used in functions
let mainServerStarted = false;
let reactStarted = false;
let killed;

// Logs
const chalk = require('chalk');
let lastFromDev;
let ignoreBuildToolForASecond = 0;
function log(...args) {
  let setLastFromDev = false;
  let x = args.pop();
  if (x !== 'from-dev-server' && x !== 'from-build-tool') {
    args.push(x);
    console.log(chalk.black.bold('\nreact-amazing-proxy:'));
    if (x.includes('Bye now!')) { log = () => { } };
  }
  if ((args[0] + '').includes('Compiled')) {
    setTimeout(() => startMainServer(), 200);
  }
  if (x === 'from-dev-server') {
    args[0] = args[0].trim();
    let org = args[0];
    args[0] = args[0].split(`:${ports.react}`).join(`:${ports.main}`);
    !lastFromDev && console.log(chalk.black.bold('\nreact-dev-server:'));
    setLastFromDev = true;
  }
  if (x === 'from-build-tool') {
    if (Date.now() - ignoreBuildToolForASecond < 1000) {
      return;
    }
    args[0] = args[0].trim();
    if (args[0].includes('The build folder is read')) {
      ignoreBuildToolForASecond = Date.now();
      args[0] = args[0].split('deployed.')[0] + 'deployed.\n';
      setTimeout(() => log('Serving the production build...'), 0);
      startMainServer();
    }
    !lastFromDev && console.log(chalk.black.bold('\nreact-build-tool:'));
    setLastFromDev = true;
  }
  console.log(chalk.blue.bold(...args));
  lastFromDev = setLastFromDev;
}

// Calculate paths
const projectPath = __dirname.split('node_modules')[0];
const settingsPath = path.resolve(projectPath, './proxy-settings.js');
const defaultSettingsPath = path.resolve(__dirname, './settings.js');
const reactStartScriptPath = path.resolve(projectPath, 'node_modules/react-scripts/scripts/start');
const reactBuildScriptPath = path.resolve(projectPath, 'node_modules/react-scripts/scripts/build');
const packageJsonPath = path.resolve(projectPath, './package.json');
const reactOpenBrowserPath = path.resolve(projectPath, 'node_modules/react-dev-utils/openBrowser');
const openBrowser = require(reactOpenBrowserPath);

// Create a settings file for the project if it doesn't exist
if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(
    settingsPath,
    fs.readFileSync(defaultSettingsPath, 'utf-8'), 'utf-8'
  );
}

// Add the correct npm start command to package.json if not done
let pjson = require(packageJsonPath);
function writeToPackageJson(correct) {
  if (typeof pjson === 'object') {
    pjson.scripts = pjson.scripts || {};
    if (pjson.scripts.start !== correct) {
      pjson.scripts.start = correct;
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(pjson, null, '  ') + '\n',
        'utf-8'
      );
    }
  }
}
writeToPackageJson('node node_modules/react-amazing-proxy/start');

// If postinstall exit now
if (action === 'postinstall') {
  log('Created a proxy-settings.js file\n' +
    'and updated the npm start command...\n');
  process.exit();
}

// If preuninstall
if (action === 'preuninstall') {
  writeToPackageJson('react-scripts start');
  //log('Removed the proxy-settings.js file\n' +
  //  'and updated the npm start command...\n');
  //fs.unlinkSync(settingsPath);
  process.exit();
}

// Read settings
const settings = Object.assign(
  require(defaultSettingsPath),
  require(settingsPath),
  global.__reactAmazingProxySettings
);
let { dev, ports, handleWithAPI, openInBrowser, pathToAPI, hostForAPI, postBuildScript } = settings;
pathToAPI = pathToAPI ? path.resolve(projectPath, pathToAPI) : '';

// Override dev settings with command line argumenst dev and build
action === 'dev' && (dev = true);
action === 'build' && (dev = false);

// Require http module + http-proxy and create a proxy server
const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer();

// Setup a proxy
const reactProxy = new httpProxy.createProxyServer();

// Create the main server
const mainServer = http.createServer(function (req, res) {
  let isAPI = handleWithAPI(req.url);
  let port = isAPI ? ports.api : ports.react;
  let host = isAPI ? hostForAPI : 'localhost';
  reactProxy.web(req, res, { target: `http://${host}:${port}` }, e => {
    log(e + '', '(non-fatal...)');
  });
});

// Make it able to handle socket requests
mainServer.on('upgrade', function (req, socket, head) {
  let isAPI = handleWithAPI(req.url);
  let port = isAPI ? ports.api : ports.react;
  let host = isAPI ? hostForAPI : 'localhost';
  proxy.ws(req, socket, head, { target: `ws://${host}:${port}` }, e => {
    log(e + '', '(non-fatal...)');
  });
});

// Start the main server
function startMainServer() {
  if (mainServerStarted) { return; }
  mainServerStarted = true;
  !dev && postBuildScript && runPostBuildScript();
  log(`Starting the main server on port ${ports.main}`);
  mainServer.listen(
    ports.main
  );
  setTimeout(() => openInBrowser && browserOpen(), 2000);
}

// Run the post build script
function runPostBuildScript() {
  let scriptPath = path.resolve(projectPath, postBuildScript);
  if (fs.existsSync(scriptPath)) {
    require(scriptPath);
    log('Ran post build script', scriptPath);
  }
}

// Start backend api server
// and restart on file changes in its directory
if (pathToAPI) {
  if (!fs.existsSync(pathToAPI) && !fs.existsSync(pathToAPI + '.js')) {
    log('Could not find your api server at ', pathToAPI + '\n' +
      "If you don't want me to start it then set pathToAPI = '' " +
      'in proxy - settings.js');
    process.exit();
  }
  else {
    let chokiTimeout;
    log('Starting the API server');
    chokidar.watch(path.dirname(pathToAPI)).on('all', () => {
      clearTimeout(chokiTimeout);
      chokiTimeout = setTimeout(() => {
        apiServer && log('Restarting the API server');
        apiServer && apiServer.kill();
        apiServer = cp.fork(pathToAPI);
        startReact();
      }, 1000);
    });
  }
}
else {
  startReact();
}

// Start the react-dev-server or serve the production build using Express
function startReact() {
  if (reactStarted) { return; }
  reactStarted = true;
  if (dev) {
    // start the react server
    // log('Starting the react-dev-server...');
    devServer = cp.fork(reactStartScriptPath, {
      env: { PORT: ports.react + '', BROWSER: 'none' }, silent: true
    });
    devServer.stdout.on('data', (x) => log(x.toString(), 'from-dev-server'));
    devServer.stderr.on('data', (x) => log(x.toString(), 'from-dev-server'));
  }
  else {
    // run build script
    const buildTool = cp.fork(reactBuildScriptPath, { silent: true });
    buildTool.stdout.on('data', (x) => log(x.toString(), 'from-build-tool'));
    buildTool.stderr.on('data', (x) => log(x.toString(), 'from-build-tool'));
    // serve the static react production build using express
    const express = require('express');
    const compression = require('compression');
    const app = express();
    app.use(compression());
    let buildPath = path.resolve(projectPath, './build');
    let indexPath = path.resolve(buildPath, './index.html');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(indexPath);
    })
    app.listen(ports.react);
  }
}

// Open in browser
let openTimeout;
function browserOpen() {
  clearTimeout(openTimeout);
  openTimeout = setTimeout(
    () => openBrowser(`http://localhost:${ports.main}`),
    1000
  );
}

// Close child processes
function killChildren() {
  if (killed) { return; }
  killed = true;
  apiServer && apiServer.disconnect();
  devServer && devServer.disconnect();
  apiServer && apiServer.kill();
  devServer && devServer.kill();
  log('Bye now!\n');
  process.exit();
}
process.on('SIGINT', killChildren);
process.on('exit', e => {
  if (killed) { return; }
  log('Exit', e);
  killChildren();
});