const os = require('os');
var clc = require("cli-color");


/**
 * Prints rotating loader at console
 * @methods on, off
 */
const loader = {
  frames : ['-', '\\', '|', '/'],
  index  : 0,
  timer  : 0,
  on : function() {
    loader.off();
    if (process.stdout.moveCursor) {
      process.stdout.write('\u001B[?25l'); //hide cursor
      loader.timer = setInterval( () => {
        const frame = loader.frames[loader.index = ++loader.index % loader.frames.length];
        process.stdout.write(` ${frame}`);
        process.stdout.moveCursor(-2, 0)
      }, 250);
    }
  },
  off: function() {
    clearInterval(loader.timer);
    loader.index = 0;
    loader.timer = undefined;
    if (process.stdout.moveCursor) process.stdout.write('\u001B[?25h'); //show cursor
  }
}


/**
 * Returns name of current operating system user
 */
let currentUser;
async function getCurrentUser() {
  if (!currentUser) { // memoization of current user
    currentUser = os.userInfo().username;
  } else {
  }
  return currentUser;
}


/**
 * Prints 'time ago' in human readable form
 * for instance, relativeTime(1673050022000) = '11h 45min' (if it was run at Jan 07 2023 14:54:08 GMT+0300)
 */
function relativeTime(timestamp) {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  let elapsed = Date.now() - timestamp;

  const sign = elapsed > 0 ? '' : '-';

  elapsed = Math.abs(elapsed);

  if (elapsed < msPerMinute) {
    return sign + Math.floor(elapsed / 1000) + "s";
  } else if (elapsed < msPerHour) {
    return sign + Math.floor(elapsed / msPerMinute) + "min";
  } else if (elapsed < msPerDay) {
    return sign + Math.floor(elapsed / msPerHour) + "h " + Math.floor(elapsed % msPerHour / msPerMinute) + 'min';
  } else if (elapsed < msPerMonth) {
    return sign + Math.floor(elapsed / msPerDay) + "D " + Math.floor(elapsed % msPerDay / msPerHour) + 'h';
  } else if (elapsed < msPerYear) {
    return sign + Math.floor(elapsed / msPerMonth) + "M " + Math.floor(elapsed % msPerMonth / msPerDay) + 'D';
  } else {
    return sign + Math.floor(elapsed / msPerYear) + "Y " + Math.floor(elapsed % msPerYear / msPerMonth) + 'M';
  }
}


/**
 * Prints warnings (grey color messages before result table)
 * @param {Array} warnings (array of String)
 */
function printWarnings(warnings) {
  if (warnings.length > 0)
    warnings.forEach( warning => console.warn(clc.blackBright('** '+warning + ' **')))
}


/**
 * Prints error from rs.run
 * @param err {String|Object} error
 */
function printError(err) {
    if (err && err.lines && err.lines[0] && 
        (   err.lines[0].indexOf('Failed to connect to bus')!==-1 // centos
         || err.lines[0].indexOf('Failed to get D-Bus connection')!==-1 //ubuntu
        )
    ) {
      console.log('\n' + clc.red('Failed to connect to D-Bus (systemd user service is not running).') + '\n');
    } else {
      console.error('ERROR', err)
    }
}


/**
 * Prints colored table of services
 * @param {Object} result [{name, active, enabled, uptime, pid, memory, user, cpu}, ...]
 */
function printLs(result) {
  let header = clc.blackBright(`┌──────────────────────┬──────────┬────────┬─────────────┬─────────────┬──────────┬──────────┬──────────┐\n`)+
               clc.blackBright(`│ `+clc.cyanBright(`name`)+`                 │ `+clc.cyanBright(`pid`)+`      │ `+clc.cyanBright(`uptime`)+` │ `+clc.cyanBright(`status`)+`      │ `+clc.cyanBright(`startup`)+`     │ `+clc.cyanBright(`%cpu`)+`     │ `+clc.cyanBright(`mem`)+`      │ `+clc.cyanBright(`user`)+`     │\n`)
  let header2= clc.blackBright(`├──────────────────────┼──────────┼────────┼─────────────┼─────────────┼──────────┼──────────┼──────────┤`);
  let footer = clc.blackBright(`└──────────────────────┴──────────┴────────┴─────────────┴─────────────┴──────────┴──────────┴──────────┘`);

  console.log(header + (result.length>0 ? header2 : '') + (result.length==0 ? footer : ''));

  result.map( line => {
    let { name='', pid='', uptime='', active='', enabled='', memory='', user='', cpu='' } = line;
    name = formatL( name, 20);
    pid  = formatL( pid, 8); 
    uptime  = formatL( uptime.replace(' days', 'D').replace(' day', 'D').replace('min', 'm').replace(' weeks', 'W').replace(' week', 'W').replace(' months', 'M').replace(' month', 'M').replace(' years', 'Y').replace(' year', 'Y'), 6);
    let status = ((active.startsWith('active') || active==='RUNNING') ? clc.green : clc.red)(formatL(active, 11));
    enabled = (enabled==='enabled' || enabled==='Auto') ? clc.green(formatL(enabled, 11)) : enabled.trim().length===0 ? clc.red(formatL('?', 11)) : clc.red(formatL(enabled, 11));
    let mem = formatL( memory.replace('M', 'mb'), 8);
    user = formatR(user, 8);
    cpu = formatL(memory && cpu ? Math.round(cpu*10)/10 : '', 8);

    if ( !active.startsWith('active') && active!=='RUNNING') pid = clc.red(pid);
    if ( !active.startsWith('active') && active!=='RUNNING' ) uptime = clc.red(uptime);

    let bb = clc.blackBright('│');
    console.log(`${bb} ${name} ${bb} ${pid} ${bb} ${uptime} ${bb} ${status} ${bb} ${enabled} ${bb} ${cpu} ${bb} ${mem} ${bb} ${user} ${bb}`);
  })
  if (result.length>0) console.log(footer);
}


/**
 * Converts number of kilobytes to human readable form (using 1000-based reduction), with one digit after decimal point if needed
 * for instance, formatMem(1111) = '1.1mb'
 */
function formatMem( mem) {
  if (typeof mem === 'undefined') {
    return mem;
  }

  if (mem < 100) {
    return mem+'kb'
  } else if (mem < 1000000) {
    return Math.round(mem/100)/10+'mb'
  } else {
    return Math.round(mem/100000)/10+'gb'
  }
}


/**
 * Adds spaces after string if it is too short (or ellipsis as last symbol if it is longer),
 * for instance, formatL('1', 3) = '1  ' and formatL('1234', 3) = '12..'
 */
function formatL( s, len) {
  s = '' + (typeof s === 'undefined' ? '' : s);
  if (s.length > len) s = s.substring(0, len-1) +  '\u0324';
  if (s.length < len) s = s + Array(len+1-s.length).join(' ');
  return s;
}


/**
 * Adds spaces before string if it is too short (or ellipsis as first symbol if it is longer),
 * for instance, formatL('1', 3) = '  1' and formatL('1234', 3) = '..34'
 */
function formatR( s, len) {
  s = '' + (typeof s === 'undefined' ? '' : s);
  if (s.length > len) s = '\u0324' + s.substring(s.length-len+1, s.length);
  if (s.length < len) s = Array(len+1-s.length).join(' ') + s;
  return s;
}


/**
 * Process string to array like this: '  1     2erqr 3  ' => ['1', '2erqr', '3']
 */
function splitFormated(str) {
  let ret = ['']
  let index=0;
  for (let i=0; i<str.length; i++) {
    if (str[i] !== ' ') {
      ret[index] = ret[index]+str[i];
    } else if (ret[index] && ret[index].length!==0){
      index++;
      ret[index] = '';
    }
  }
  if (ret.length>0 && ret[ret.length-1].length===0) ret.pop();
  return ret;
}


/**
 * Converts array of lines of comma separated string (or after any other tokenizer given by splitFunc argument) to object, 
 * while first line should be name of columns 
 * @param lines {Array of String}
 * @param splitFunc {Function(String)} (optional) retuns tokinized string in array of string; `split(',')` by default
 *
 * For instance, parseOutputWithHeaders(['"pid","name"', '"123","xyz"', '"666","dev"']) = [{pid:'123',name:'xyz'},{pid:'666',name:'dev'}]
 * and parseOutputWithHeaders(['  id fullname', '    1      X', '3 D'], splitFormated) = [{id:'1',fullname:'X'},{id:'3',fullname:'D'}]
 */
function parseOutputWithHeaders(lines, splitFunc) {
  splitFunc = splitFunc || ((s)=>{return s.split(',')})
  let headers = splitFunc(lines[0]).map(i=>i.trim().replace(/^"/, '').replace(/"$/, ''));
  return lines
         .slice(1)
         .filter(l=>l.length>0)
         .map(s => {
           s = splitFunc(s).map(i=>i.trim().replace(/^"/, '').replace(/"$/, ''));
           let o = {}
           headers.forEach( (header, index) => o[header]=s[index]);
           return o;
         });
}


/**
 * Process response of runScript
 * 1. gets .lines (array of result string)
 * 2. gets rid of possibility of one line splitting into several due to buffering 
 * 3. removes last line with 'EXIT XXX'
 */
function getRunScriptLines(res) {
  return res.lines.join('').replace(/\r/g, '').split('\n').filter(l=>!l.startsWith('EXIT'));
}


module.exports = {
  loader,
  getCurrentUser,
  relativeTime,
  formatMem,
  formatL,
  formatR,
  splitFormated,
  parseOutputWithHeaders,
  getRunScriptLines,
  printLs,
  printWarnings,
  printError,
};