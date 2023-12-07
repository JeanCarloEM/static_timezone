const { find } = require('geo-tz');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const os = require('os');
const { fork } = require('child_process');

const precision = 2;
const decimals = Math.pow(10, precision);
const inc = 1 / decimals;
const min = -90;
const max = 90;
const cores = os.cpus().length / 2;
const builds = (max - min) * Math.pow(Math.pow(10, (precision)), 2);
const segs = (max - min) / cores;


/**
 *
 */
process.on('message', (msg) => {
  if (!(msg && (typeof msg === 'object') && (msg.hasOwnProperty('start')))) {
    console.log(">>> Mensagem INVALIDA.", msg);
    return;
  }


  if (min + msg.start > max) {
    console.log(`>>> Segmento '${msg.start}' FORA do range`);
    return;
  }

  const fromto = min + msg.start;

  console.log(`\nChild '${msg.start}' start at '${fromto}'`);


  // from: min * (1 / inc)
  // to: max * (1 / inc)
  for (var lat = fromto; lat == fromto; lat += inc) {
    let lt = Math.round((lat / (1 / inc)) * decimals) / decimals;
    let ltpath = String(Math.trunc(Math.abs(lt))).padStart(precision, '0') + "/" + String(Math.abs(Math.round((lt % 1)) * decimals)).padStart(precision, '0');
    let ltsignal = lt >= 0 ? "+" : "-";
    let _dir = path.join(__dirname, `from/coordinate/4-digit/latitude/${ltsignal}/${ltpath}`);

    try {
      fs.mkdirSync(_dir, { recursive: true });

      for (var long = min * (1 / inc); long <= max * (1 / inc); long += inc) {
        let lg = Math.round((long / (1 / inc)) * decimals) / decimals;
        let lgpath = [
          String(Math.abs(Math.trunc(lg))).padStart(precision, '0'),
          String(Math.abs(Math.round((lg % 1) * decimals))).padStart(precision, '0')
        ];
        let zone = find(lt, lg);
        let lgsignal = lg >= 0 ? "+" : "-";

        const __dir = `${_dir}/longitude/${lgsignal}/${lgpath[0]}`;

        fs.mkdirSync(__dir, { recursive: true });

        fs.writeFileSync(`${__dir}/${lgpath[1]}.json`, JSON.stringify({ timezone: `${zone}` }, null, 2), 'utf8');
        fs.writeFileSync(`${__dir}/${lgpath[1]}.text`, `${zone}`, 'utf8');

        process.send({ makes: 1 });
      }
    } catch (e) {
      console.log(e);
      return;
    }
  }


  if ((min + (segs * (msg.start + cores))) <= max) {
    const nested = fork('build.js');

    nested.on('message', (msg) => {
      if (msg && (typeof msg === 'object') && (msg.hasOwnProperty('makes'))) {
        process.send({ makes: 1 });
      }
    });

    nested.send({ start: msg.start + cores });
  }
});

/**
 *
 */
if ((process.argv.length >= 3)) {
  var __counter = 0;
  const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  console.log("");
  console.log("Inicializando.");
  console.log("");
  console.log("Total.................: " + builds * (max - min));
  console.log("Incrementos...........: " + inc);
  console.log("CPUs..................: " + cores);
  console.log("Segmentos por processo: " + segs);
  console.log("");

  var forks = [];
  bar1.start(builds * (max - min), 0);

  for (var i = 0; i < cores; i++) {
    fork('build.js')

      .on('message', (msg) => {
        if (msg && (typeof msg === 'object') && (msg.hasOwnProperty('makes'))) {

          if ((++__counter % cores) == 0) {
            bar1.update(__counter);
          }
        }
      })


      .send({ start: i });
  }

  console.log("");
}


setTimeout(() => { }, 1000);