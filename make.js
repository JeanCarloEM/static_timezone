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
const update_count = 100;
const destPath = path.join(__dirname, `from/${(precision + 2)}-digit`);

var msg_from_child = {};

/**
 *
 * @param {*} start
 * @param {*} id
 * @returns
 */
function childs(start, id) {
  start = start ? start : 0;
  const fromto = min + start;
  var last_items = {};
  var __ctt = 0;

  for (var lat = fromto * decimals; lat == fromto * decimals; lat += 1) {
    let lt = Math.round((lat / (1 / inc)) * decimals) / decimals;
    let ltpath = String(Math.trunc(Math.abs(lt))) + "/" + String(Math.abs(Math.round((lt % 1)) * decimals)).padStart(precision, "0");
    let ltsignal = lt >= 0 ? "" : "-";
    let _dir = `${destPath}/lat/${ltsignal}${ltpath}`;

    try {
      fs.mkdirSync(_dir, { recursive: true });

      for (var long = min * (1 / inc); long <= max * (1 / inc); long += 1) {
        let lg = Math.round((long / (1 / inc)) * decimals) / decimals;

        let lgpath = [
          String(Math.abs(Math.trunc(lg))),
          String(Math.abs(Math.round((lg % 1) * decimals))).padStart(precision, "0")
        ];

        let zone = (find(lt, lg) + "").trim();
        let lgsignal = lg >= 0 ? "" : "-";

        const __dir = `${_dir}/long/${lgsignal}${lgpath[0]}`;

        fs.mkdirSync(__dir, { recursive: true });

        //fs.writeFileSync(`${__dir}/${lgpath[1]}.json`, JSON.stringify({ tz: `${zone}` }, null, 0), 'utf8');
        fs.writeFileSync(`${__dir}/${lgpath[1]}`, `${zone}`, 'utf8');

        last_items[`${ltsignal}${ltpath}`] = last_items[`${ltsignal}${ltpath}`] ? last_items[`${ltsignal}${ltpath}`] : {};
        last_items[`${ltsignal}${ltpath}`][`${lgsignal}${lgpath[0]}${lgpath[1]}`] = `${zone}`;

        if (((++__ctt) % update_count) == 0) {
          __ctt = 0;
          process.send({ id: id, start: fromto, items: JSON.parse(JSON.stringify(last_items)) });
          last_items = {};
        }
      }
    } catch (e) {
      console.error(id, e);
      return;
    }
  }

  if ((min + start + cores) <= max) {
    childs(start + cores, id);
  }
}


/**
 *
 */
function is_response_from_child(msg) {
  return (
    (typeof msg === 'object') &&
    (msg.hasOwnProperty('id')) &&
    (msg.hasOwnProperty('items')) &&
    (typeof msg.items === 'object')
  );
}

/**
 *
 */
process.on('message', (msg) => {
  if (is_response_from_child(msg)) {
    console.log('BBB');
    if (!msg_from_child.hasOwnProperty(`f${msg.id}`)) {
      return;
    }

    const ff = msg_from_child.hasOwnProperty(`f${msg.id}`);

    if (typeof ff !== 'function') {
      return;
    }

    ff(msg);

    return;
  }

  if (!(msg && (typeof msg === 'object') && (msg.hasOwnProperty('start')))) {
    console.error(">>> Mensagem INVALIDA.", msg);
    return;
  }

  if (min + msg.start > max) {
    console.error(`>>> Segmento '${msg.start}' FORA do range`);
    return;
  }

  childs(msg.start, msg.start);
});


/**
 *
 */
function main() {
  var __total = 0;
  var makes = {};
  const total = builds * (max - min);

  console.log("");
  console.log("Inicializando.");
  console.log("");
  console.log("Total.................: " + total.toLocaleString("pt-BR"));
  console.log("Precisão..............: " + precision);
  console.log("Incrementos...........: " + inc);
  console.log("Process...............: " + cores);
  console.log("Progress update on....: " + update_count);
  console.log("Segmentos por processo: " + segs);
  console.log("Items por processo....: " + (segs * builds).toLocaleString("pt-BR"));
  console.log("");

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    autopadding: true,
    autopaddingChar: " ",
    emptyOnZero: true,
    forceRedraw: true,
    format: '{index} | {bar} | {percentage}% | {value}/{total}',
  }, cliProgress.Presets.shades_grey);

  (Array(cores).fill('0')).forEach((e, k) => {
    var __counter = 0;
    const bar = multibar.create(segs * builds, 0);

    msg_from_child[`f${k}`] = (msg) => {
      if (!is_response_from_child(msg)) {
        return;
      }

      __counter += update_count;
      __total += update_count;

      makes = { ...makes, ...msg.items };

      bar.update(__counter, { index: String(k).padStart(3, ' ') });

      if (__counter >= (segs * builds)) {
        bar.stop();
      }
    };

    fork('make.js')
      .on('message', msg_from_child[`f${k}`])
      .send({ start: k });
  });

  var bar_total = false;
  var intervalo;

  intervalo = setInterval(() => {
    if (!bar_total) {
      bar_total = multibar.create(total, 0);
    }

    bar_total.update(__total, { index: ">>>" });

    if (__total >= total) {
      bar_total.stop();
      console.log("");
      fs.writeFileSync(`${destPath}/main.json`, JSON.stringify(makes, null, 2), 'utf8');
      clearInterval(intervalo);
    }

  }, 1000);
}

/**
 *
 */
if ((process.argv.length >= 3)) {
  main();
}