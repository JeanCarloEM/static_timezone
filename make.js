const { find } = require('geo-tz');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const os = require('os');
const { fork } = require('child_process');
const colors = require('ansi-colors');

const precision = 2;
const decimal_size = Math.pow(10, precision);
const inc = 1 / decimal_size;
const qtd_process = Math.ceil(os.cpus().length);
const lat_min = -90;
const lat_max = 90;
const long_min = -180;
const long_max = 180;
const lat_range = (lat_max - lat_min);
const long_range = (long_max - long_min);
const segs = Math.ceil(lat_range / qtd_process);
const qtd_longitudes = long_range * decimal_size;
const qtd_decpart_latitudes = decimal_size * qtd_longitudes;
const qtd_all = lat_range * qtd_decpart_latitudes;
const qtd_per_process = segs * qtd_decpart_latitudes;
const update_count = 100;
const destPath = path.join(__dirname, `from/gcs/${(precision)}-digit`);
const pad_adress = precision + 1 + 3 + 1;
const isFreezeSeconds = 3;

/**
 *
 * @param {*} spath
 */
function writedata(spath, ctt) {
  const dir = path.dirname(spath);
  !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${spath}`, ctt, 'ascii');
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 * https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 */
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  function isObject(x) {
    return typeof x === "object";
  }

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

/**
 *
 * @param {*} saved_pos_path
 * @param {*} fromto
 * @returns
 */
function readSavedPos(saved_pos_path, fromto) {
  var saved_pos_data__ = false;

  if (fs.existsSync(saved_pos_path)) {
    try {
      saved_pos_data__ = JSON.parse(fs.readFileSync(saved_pos_path, 'ascii'));
    } catch (error) {
      saved_pos_data__ = false;
    }
  }

  return saved_pos_data__ ? saved_pos_data__ : {
    lt: fromto,
    lt_dec: 0,
    lg: long_min,
    step: 1
  };
}

/**
 *
 * @param {*} start
 * @param {*} id
 * @returns
 */
function childs(start, id) {
  start = start ? start : 0;
  const fromto = lat_min + start;
  const saved_pos_path = `${destPath}/${id}.process.json`;
  const saved_pos_data = readSavedPos(saved_pos_path, fromto);

  var _step_lg_builts = 0;

  for (var lt = fromto; lt <= lat_max; lt += qtd_process) {
    let _dir_json = `${destPath}/lat/${lt}.json`;
    let group_items;

    try {
      group_items =
        (fs.existsSync(`${_dir_json}/tmp.json`))
          ? JSON.parse(fs.readFileSync(`${_dir_json}/tmp.json`, 'ascii'))
          : (
            (fs.existsSync(`${_dir_json}/finished.json`))
              ? JSON.parse(fs.readFileSync(`${_dir_json}/finished.json`, 'ascii'))
              : {}
          );
    } catch (error) {
      group_items = {};
    }

    for (var lt_dec = decimal_size - 1; lt_dec >= 0; lt_dec--) {
      _step_lg_builts = ((lt - fromto) / qtd_process) * lt_dec;

      const ltsignal = lt >= 0;
      var latitude = ((ltsignal ? 1 : - 1) * (Math.abs(parseFloat(lt)) + (lt_dec / decimal_size))).toFixed(precision);

      if ((latitude < lat_min) || (latitude > lat_max)) {
        continue;
      }

      let ltpath = String(latitude).replace(/[,\.]/, '/');
      let _dir = `${destPath}/lat/${ltpath}`;

      for (var lg = long_min; lg <= long_max; lg++) {
        const lgsignal = lt >= 0;

        const skipthis = (
          (lt < saved_pos_data.lt) ||
          (
            (lt === saved_pos_data.lt) &&
            (
              (lt_dec < saved_pos_data.lt_dec) ||
              (
                (lt_dec == saved_pos_data.lt_dec) &&
                (lg < saved_pos_data.lg)
              )
            )
          )
        );

        if (!skipthis) {
          writedata(saved_pos_path, JSON.stringify({
            lt: lt,
            lt_dec: lt_dec,
            lg: lg,

            step: _step_lg_builts,
            id: id
          }));
        }

        let last_items = {};
        var longitude;
        let localSkip = skipthis;

        for (var lg_dec = decimal_size - 1; lg_dec >= 0; lg_dec--) {
          longitude = ((lgsignal ? 1 : - 1) * (Math.abs((parseFloat(lg)) + (lg_dec / decimal_size)))).toFixed(precision);

          if ((longitude < long_min) || (longitude > long_max)) {
            continue;
          }

          let lgpath = String(longitude).replace(/[,\.]/, '/');
          let __dest = `${_dir}/long/${lgpath}`;

          let zone = (find(latitude, longitude) + "").trim();

          if (fs.existsSync(`${__dest}`)) {
            try {
              let content = fs.readFileSync(`${__dest}`, 'ascii').trim();
              if (content.length > 0) {
                if ((content + "").trim() !== zone) {
                  console.error("ERROR", "ZONE saved invalid.\n", `'${__dest}'\n`, `'${zone}'`, " !=", `'${content}'`);
                  process.send({ id: id, error: 2 });
                  return;
                }

                localSkip = true;
              } else {
                localSkip = false;
              }
            } catch (e) {
              console.error(id, __dest, e);
              process.send({ id: id, error: 3 });
              return;
            }
          }

          if (!localSkip) {
            try {
              //writedata(`${__dest}.json`, JSON.stringify({ tz: `${zone}` }, null, 0));
              writedata(`${__dest}`, `${zone}`);
            } catch (e) {
              console.error("ERROR", "writedata(__dest)", id, e);
              process.send({ id: id, error: 1 });
              return;
            }

            ltpath = ltpath.replace(/[\/]/, ',');
            lgpath = lgpath.replace(/[\/]/, ',');

            last_items[`${ltpath}`] = last_items[`${ltpath}`] ? last_items[`${ltpath}`] : {};
            last_items[`${ltpath}`][`${lgpath}`] = `${zone}`;

            group_items[`${ltpath}`] = last_items[`${ltpath}`] ? last_items[`${ltpath}`] : {};
            group_items[`${ltpath}`][`${lgpath}`] = `${zone}`;
          }
        }

        writedata(`${_dir_json}/tmp.json`, JSON.stringify(group_items, null, 0));
        process.send({
          skipped: skipthis || localSkip,
          step: _step_lg_builts,
          id: id,
          mymakes: decimal_size,
          lat: parseFloat(latitude).toFixed(2),
          long: parseFloat(longitude).toFixed(2),
          start: fromto,
          items: JSON.parse(JSON.stringify(last_items))
        });
      }
    }

    writedata(`${_dir_json}/finished.json`, JSON.stringify(group_items, null, 0));
    fs.unlinkSync(`${_dir_json}/tmp.json`);
  }
}



/**
 *
 */
function is_response_from_child(msg, full) {
  full = full === true ? true : false;

  return (
    (
      (typeof msg !== 'object') ||
      (!msg.hasOwnProperty('id'))
    )
      ? false
      : (!full)
        ? 1
        : (
          msg.hasOwnProperty('items') &&
          (typeof msg.items === 'object')
        )
  );
}

/**
 *
 */
process.on('message', (msg) => {
  if (!(msg && (typeof msg === 'object') && (msg.hasOwnProperty('start')))) {
    console.error(">>> Mensagem INVALIDA.", msg);
    return;
  }

  if ((lat_min + msg.start) > lat_max) {
    console.error(`>>> Segmento '${msg.start}' FORA do range`);
    return;
  }

  childs(msg.start, msg.start);
});

/**
 *
 */
function terminate() {
  process.exit();
}

/**
 *
 * @param {*} s
 * @returns
 */
function secondsFormated(s) {
  const d = Math.floor(s / 86400);
  s = s % 86400;
  const h = Math.floor(s / 3600);
  s = s % 3600;
  const m = Math.round(s / 60);
  s = s % 60;

  return `${d}, ${(String(h).padStart(2, "0"))}:${(String(m).padStart(2, "0"))}:${(String(s).padStart(2, "0"))}`;
}

/**
 *
 */
function main() {
  var __total = 0;
  var makes = {};
  var isStopedSeconds_bars = (Array(qtd_process + 1)).fill(0);
  var progressbars = (Array(qtd_process)).fill(0);

  if (fs.existsSync(`${destPath}/full.temp.json`)) {
    makes = JSON.parse(fs.readFileSync(`${destPath}/full.temp.json`, 'ascii'));
  }

  console.log("");
  console.log("Inicializando.");
  console.log("");
  console.log("Precisão..............: " + precision);
  console.log("Incrementos...........: " + inc);
  console.log("Processos.............: " + qtd_process);
  console.log("Latitudes por processo: " + segs);
  console.log("QTD Longitudes........: " + qtd_longitudes.toLocaleString("pt-BR"));
  console.log("QTD decimal Latitudes.: " + qtd_decpart_latitudes.toLocaleString("pt-BR"));
  console.log("QTD por processo......: " + qtd_per_process.toLocaleString("pt-BR"));
  console.log("QTD total.............: " + qtd_all.toLocaleString("pt-BR"));
  console.log("Progress update on....: " + update_count);
  console.log("");

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    autopadding: true,
    autopaddingChar: " ",
    emptyOnZero: true,
    forceRedraw: false,
    barsize: 20,
    /*
      parametros:
      {
        progress: 0.002777777777777778,
        eta: 115,
        startTime: 1702155963656,
        stopTime: null,
        total: 36000,
        value: 100,
        maxWidth: 134
      } {
        k: 39,
        percentage_all: '  0',
        start: '-51',
        skipped: 'Skipped',
        step: '   0',
        astep: ' 400',
        lat: ' -51.99',
        long: '-180.00',
        index: ' 39'
      }
    */
    format: (options, params, values) => {
      function getVal(x) {
        if (values.hasOwnProperty(x) && (typeof values[x] !== "undefined")) {
          return values[x];
        }

        return "";
      }

      function newBar(isMain, k, percent, size, ok, unok) {
        ok = (typeof ok === 'string' && ok.length === 1) ? ok : options.barCompleteString;
        unok = (typeof unok === 'string' && unok.length === 1) ? unok : ' ';
        const bar = ok.substr(0, Math.round(percent * size)).padEnd(size, unok);

        return (isStopedSeconds_bars[k] > isFreezeSeconds) ? colors.redBright(bar) : (isMain ? colors.greenBright : colors.grey)(bar);
      }

      if (params.value === 0) {
        return "";
      }

      let p_total = String(parseInt(params.total)).toLocaleString("pt-BR");
      let p_val = String(parseInt(params.value)).toLocaleString("pt-BR").padStart(p_total.length, " ");

      const k = (getVal('k') !== "" && getVal('k') >= 0)
        ? getVal('k')
        : isStopedSeconds_bars.length - 1;

      const isMain = (k === (isStopedSeconds_bars.length - 1));

      const main_p_size = (options.barsize + (isMain ? 16 : 1));
      const step_p_size = Math.round(options.barsize / 2);

      const pbar = newBar(isMain, k, params.progress, main_p_size, isMain ? "" : "■", '-');
      const pbar2 = isMain ? "" : newBar(isMain, k, parseFloat(values.step.trim()) / parseFloat(values.astep.trim()), step_p_size, "■", '-');

      let lapse = "0, 00:00:00";
      let remaining = lapse;

      if (isMain) {
        let runtime = Date.now() - params.startTime;
        lapse = secondsFormated(Math.floor(runtime / 1000));
        remaining = secondsFormated(Math.floor((runtime / params.value) * (params.total - params.value)));
      }

      return (isMain ? "\n" : "") + `${getVal('index')}: ${pbar} | ` + (
        isMain
          ? `${String(((params.progress) * 100).toFixed(4)).padStart(11, " ")}% | T: ${(String(lapse).padStart(12, " "))}, R: ${(String(remaining).padStart(12, " "))} | ${p_val}/${p_total}`
          : `${String(Math.round((params.progress) * 100)).padStart(2, " ")}% / ${getVal('percentage_all')}% | ${getVal('start')} => ${getVal('lat')}/${getVal('long')}, ${getVal('skipped')} | step: <${pbar2}> ${getVal('step')}/${getVal('astep')}: ${p_val}/${p_total}`
      ) + (isMain ? "\n" : "");
    }

  }, cliProgress.Presets.shades_grey);

  (Array(qtd_process).fill('0')).forEach((e, k) => {
    var __counter = 0;
    const bar = multibar.create(qtd_longitudes, 0);
    progressbars[k] = bar;

    fork('make.js')
      .on('message', (msg) => {
        ((progress) => {
          if (!is_response_from_child(msg, false)) {
            return;
          }

          if (msg.hasOwnProperty("error")) {
            console.error("Exited with code:", msg.error);
            return terminate();
          }

          isStopedSeconds_bars[k] = 0;

          if (is_response_from_child(msg, true)) {
            __counter += msg.mymakes;

            if ((__counter % qtd_longitudes) === 0) {
              __counter = 0;
            }

            __total += msg.mymakes;
          }

          makes = mergeDeep(makes, msg.items);
          progress(msg, __counter);

          if ((__total % qtd_longitudes) == 0) {
            writedata(`${destPath}/full.temp.json`, JSON.stringify(makes, null, 2));
          }

          if (__counter >= (segs * qtd_decpart_latitudes)) {
            bar.stop();
          }
        })((msg, val) => {
          bar.update(
            val,
            {
              k: k,
              percentage_all: String(((val + (msg.step * qtd_decpart_latitudes)) / (segs * qtd_decpart_latitudes)).toFixed(2)).padStart(5, " "),
              start: String(msg.start).padStart(3, " "),
              skipped: (msg.skipped ? "Skipped" : "Built").padStart(7, " "),
              step: String(msg.step).padStart(3, " "),
              astep: String((() => {
                var count = 0;
                for (var lt = lat_min + k; lt <= lat_max; lt += qtd_process) {
                  count++;
                }

                return count * decimal_size;
              })()).padStart(3, " "),
              lat: String(msg.lat).toLocaleString("pt-BR").padStart(pad_adress, ' '),
              long: String(msg.long).toLocaleString("pt-BR").padStart(pad_adress, ' '),
              index: String(k).padStart(3, ' ')
            }
          );
        });
      })
      .send({ start: k });
  });

  var bar_total = false;
  var intervalo;

  intervalo = setInterval(() => {
    if (!bar_total) {
      bar_total = multibar.create(qtd_all, 0);
    }

    bar_total.update(__total, {
      start: " ".padStart(3, " "),
      skipped: ("MAIN").padStart(7, " "),
      step: " ".padStart(4, " "),
      astep: " ".padStart(4, " "),
      seg: '  ',
      aseg: '  ',
      lat: "".padStart(pad_adress), long: "".padStart(pad_adress), index: ">>>"
    });

    if (__total >= qtd_all) {
      bar_total.stop();
      console.log("");
      writedata(`${destPath}/full.json`, JSON.stringify(makes, null, 0));
      fs.unlinkSync(`${destPath}/full.temp.json`);
      clearInterval(intervalo);
      return;
    }

    isStopedSeconds_bars[isStopedSeconds_bars.length - 1] = 0;

    for (var k = 0; k < progressbars.length; k++) {
      isStopedSeconds_bars[k]++;

      if (isStopedSeconds_bars[k] > isFreezeSeconds) {
        isStopedSeconds_bars[isStopedSeconds_bars.length - 1] = isFreezeSeconds + 1;
        progressbars[k].update(null);
      }
    }
  }, 1000);
}

/**
 *
 */
if ((process.argv.length >= 3)) {
  main();
}