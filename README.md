# react-amazing-proxy
The npm package **[react-amazing proxy](https://www.npmjs.com/package/react-amazing-proxy)** is an amazing proxy for use with **[create-react-app](create-react-app
)**. It:
* lets you use your own **api server**, together with React. development server on *one single port* (avoiding **[CORS problems](https://levelup.gitconnected.com/overview-of-proxy-server-and-how-we-use-them-in-react-bf67c062b929)**).
* handles **[Server Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)** and **[web sockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)** correctly.
* watches your backend api source code for changes.
* can be switched to serve your production build easily.

## Why is the built in proxy in create-react-app a problem?
The [built in proxy](https://create-react-app.dev/docs/proxying-api-requests-in-development) in **create-react-app** does not let **Server Sent Events** and **web sockets** through by default - and *[it is very problematic/impossible to get this to work](https://github.com/facebook/create-react-app/issues/3391)* even if you change its settings.

Here is a schematic of how it works. It opens a "hole" through the **react-dev-server** for whatever api routes you specify, so that requests can reach your **api server**: 

![Image description](https://raw.githubusercontent.com/ironboy/react-amazing-proxy/master/images/unamazing.gif)

This means you have *two* servers running but yours frontend code only talks to the **react-dev-server** that proxies the api routes to your  **api server**.


### Why does SSE and web sockets not work?
Unfortunately the built in proxy  buffers and compresses data in a way that makes **Server Sent Events** not work and it does not listen to the *protocol upgrade requests* a **web socket** needs to make in order to work.

### No built in strategy for switching to production
There is *no set strategy* for how to switch from development to production and serve a production build of your React app:
* Should you set up another proxying system for serving the production build? 
* Should you add an option in your **api server** to serve the static file from the build when in production?

Both solutions are possible, but there is no easy *"switch to production"* flag built in.

### No built in command for starting both servers at the same time
This is not a big issue, but you will have to start the **react-dev-server** and your **api-server** from separate windows in your terminal, or add an npm script using **[concurrently](https://www.npmjs.com/package/concurrently)**
 or a similar tool in order to start both servers with one command.

## How does react-amazing-proxy work?

React-amazing-proxy starts a server *devoted to one thing* - to be a really good proxy that can handle all types of requests including **Server Sent Events** and **web sockets**.

![Image description](https://raw.githubusercontent.com/ironboy/react-amazing-proxy/master/images/amazing.gif)

### npm start &ndash; all servers at once
It automatically starts up your **api server** and the **react-development-server**. You run *three* servers, but with on simple command - **npm start**.

### npm start build &ndash; build and serve
By writing **npm start build** you switch to *perform a production build* and serve this build instead of using the dev server, *it still proxies your **api server*** - thus no code versioning is needed on your server when yo go to production.

### restarts your api server automatically on code changes
It automatically watches your  **api server** source code and restarts it on changes, much like **[nodemon](https://www.npmjs.com/package/nodemon)**.

## How do I install and use it?

### Installation

**Important:** **react-amazing-proxy** is meant for use in a **create-react-app** project so if you haven't done so already create your project:

```
npx create-react-app name-of-my-new-project
```

Then install **react-amazing-proxy**:


```
npm i react-amazing-proxy
```

A file called **proxy-settings.js** is created in your project root folder:

```js
module.exports = {
  // run react-dev-server (true) or serve build (false)
  dev: true,
  // whether to open the react site in a browser at start
  openInBrowser: true,
  // path to your own backend api
  pathToAPI: './api/index',
  // the ports
  ports: {
    // where you want to run the 'joint' proxied server
    main: 3000,
    // where you want to run the react-dev-server
    react: 3456,
    // where you serve your api (make sure to serve it on that port)
    api: 3001
  },
  // a function that should return true if the backend-api 
  // is to handle the request (add your own logic here as needed)
  handleWithAPI(url) {
    return url.indexOf('/api/') === 0;
  }
};
```

### Basic setup
If you don't want to edit the settings you:
1. *Make sure* that a folder called **api** exists in your root folder and that it contains a **index.js**. (This should be the main file that that starts your **api server**.)
2. *Make sure* to start your **api server** on **port 3001**.
3. *Make sure* that the **api server** listens to routes that begin with **/api/**.

### Configure it to meet your needs
The **react-amazing-proxy** server is highly configurable. By changing the **proxy-settings.js** file you can: 
* make the server serve the production build by default.
* decide if it should open a browser window on start.
* change the path to where your **api server** is located
* decide on which ports that should be used.
* write your own logic for which routes that are proxied to your **api server**.

### Usage
The server updates the **npm start** command, so now you can write:

* **npm start dev** - runs your *api server* and the *react-dev-server*.
* **npm start build** - performs a build, runs your *api server* and serves the build.
* **npm start** - looks at the **dev** property in *proxy-settings.js*. Behaves like *npm start dev* if this property is true and otherwise like *npm start build*.

**Happy proxying!**
