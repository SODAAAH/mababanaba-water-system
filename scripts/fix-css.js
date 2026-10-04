const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'public', 'css', 'tailwind.css');
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');

  // 1. button appearance
  css = css.replace(
    'button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;',
    'button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;appearance:button;'
  );

  // 2. search appearance
  css = css.replace(
    '[type=search]{-webkit-appearance:textfield;',
    '[type=search]{-webkit-appearance:textfield;appearance:textfield;'
  );

  // 3. display: block with vertical-align: middle on media elements
  css = css.replace(
    'audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}',
    'audio,canvas,embed,iframe,img,object,svg,video{display:block}'
  );

  // 4. line-clamp-2 standard property
  css = css.replace(
    '-webkit-line-clamp:2}',
    '-webkit-line-clamp:2;line-clamp:2}'
  );

  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Successfully patched tailwind.css for CSS compatibility warnings.');
}
