const { exec } = require('child_process');
//@param commend    {string}   bash command
//@param opt        {Object}   opt
//@param opt.onData {Function} called when script writes new line
//
//@returns {Object}
//  resultCode {int}
//  command    {string}
//  lines      {Array of string}
function run(command, opt) {
  return new Promise(function(resolve, reject){
    if (!command || typeof command != 'string') {
      reject({
        resultCode:-1,
        command:command,
        lines:["ERROR NO_COMMAND"]
      });
    }

    const result = {resultCode:0, command:command, lines:[]}    

    try{
//      const cmd_args = command.split(" ");
//      const cmd = cmd_args[0];
//      cmd_args.shift();
//      const proc = spawn(cmd, cmd_args);    
      const proc = exec(command);

      proc.stdout.on('data', function (data) {
//console.log("run proc.stdout.data");
        const s = data.toString('utf8');
        result.lines.push(s);
        if (opt && opt.onData) {
          if (typeof opt.onData == 'function'){
            opt.onData(s);
          } else {
            result.lines.push('ERROR opt.onData is not a function');
          }
        }
      });

      proc.stderr.on('data', function (data) {
//console.log("run proc.stderr.data");
        const s = data.toString('utf8');
        result.lines.push(s);
        if (opt && opt.onData) {
          if (typeof opt.onData == 'function'){
            opt.onData(s);
          } else {
            result.lines.push('ERROR opt.onData is not a function');
          }
        }
      });

      proc.on('exit', function (code) {
//console.log("run proc.exit");
        result.lines.push('EXIT '+ code);
        if (code == 0) { 
          resolve(result);
        } else {
          result.resultCode = code;
          reject(result);
        }
      });

      proc.on('error', function (data) {
//console.log("run proc.error", data);
        result.lines.push('ERROR '+ data.toString('utf8'));
        reject(result);
      });

    } catch (err) {
//console.log("run catch");
      result.resultCode = -1;
      result.lines.push('ERROR '+ err.stack);
      reject(result);
    }
  })
}

module.exports = {runScript:run};