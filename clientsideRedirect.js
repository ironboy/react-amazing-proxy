// not used anymore
// implant redirect from react-dev-server to main server in index.html
// (so you don't use the react port by mistake and don't get your api)
let index = fs.readFileSync('./public/index.html', 'utf-8');
let orgIndex = index;
index = index.split('<script>//Redirect to main server...');
index = index.length < 2 ? index[0] :
  (index = index[0] + index[1].split('</script>')[1]);
if (autoRedirect) {
  index = index.replace(/<\/head>/i,
    `<script>//Redirect to main server...
      location.port == ${ports.react} 
        && location.replace(
          location.href.replace(/:${ports.react}/g, ':${ports.main}'))
       </script></head>`
  );
}
orgIndex !== index && fs.writeFileSync('./public/index.html', index, 'utf-8');