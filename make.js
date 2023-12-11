const { find } = require('geo-tz');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const os = require('os');
const { fork } = require('child_process');
const colors = require('ansi-colors');
const _argv = require('minimist')(process.argv.slice(2))
const startedTime = Date.now();

/**
 *
 * @param {*} x
 * @returns
 */
function getCMDParam(abrev, fullname, defval) {
  const __get = (x) => {
    if (_argv.hasOwnProperty(x)) {
      return _argv[x];
    }

    if (_argv._.indexOf(x) >= 0) {
      return true;
    }

    return (typeof defval !== 'undefined') ? defval : false;
  }

  abrev = abrev.trim();
  fullname = (typeof fullname === 'string') ? fullname.trim() : "";

  let x = __get(abrev);

  return x !== false ? x : (
    (fullname.length > 0)
      ? __get(fullname)
      : false
  );
}

const precision = getCMDParam('p', 'precision', 2);
const update_count = getCMDParam('u', 'update', 100);
const isFreezeSeconds = getCMDParam('u', 'update', 20);
const root = getCMDParam('r', 'root', 'from').trim().replace(/["']/g, "").trim();

const save_json = getCMDParam('j', 'save-json', false);
const save_merged_json = getCMDParam('m', 'save-merged-json', false);
const save_raw = getCMDParam('s', 'save-raw', true);
const qtd_process = getCMDParam('t', 'threads', Math.ceil(os.cpus().length));

const decimal_size = Math.pow(10, precision);
const inc = 1 / decimal_size;
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
const destPath = path.join(`${root}/gcs/${(precision)}-digit`);
const pad_adress = 1 + 3 + 1 + precision;

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
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }

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
function readSavedProcessingPos(saved_pos_path, fromto) {
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
    step: 1,
    process: qtd_process,
    decimal_size: decimal_size,

    params: {
      precision: precision,
      update_count: update_count,
      isFreezeSeconds: isFreezeSeconds,

      save_json: save_json,
      save_raw: save_raw
    }
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
  const fromto = lat_min + start + 1;
  const saved_pos_path = `${destPath}/${id}.process.json`;
  const saved_pos_path_tmp = `${destPath}/${id}.tmp.data.json`;
  const saved_pos_path_finished = `${destPath}/${id}.finidhed.data.json`;
  const saved_pos_data = readSavedProcessingPos(saved_pos_path, fromto);

  /** BEFORE, check cmd parameter != last runtime */
  if (!(
    saved_pos_data.process == qtd_process &&
    saved_pos_data.params.precision == precision &&
    saved_pos_data.params.update_count == update_count &&
    saved_pos_data.params.isFreezeSeconds == isFreezeSeconds &&

    saved_pos_data.params.save_json == save_json &&
    saved_pos_data.params.save_raw == save_raw
  )) {
    console.error("ERROR, child id '", id, "':", "childs()", "saved cmd parameter != actual parameter.")
    process.send({ id: id, error: 4 });
    return;
  }

  // is inished
  if (fs.existsSync(saved_pos_path_finished)) {
    try {
      fs.unlinkSync(saved_pos_path_tmp);
      fs.unlinkSync(saved_pos_path);
    } catch (error) {

    }
    return;
  }

  var _step_lg_builts = 0;

  const max_steps = ((lat_max - fromto + 1) / qtd_process) * decimal_size;

  let group_items = {};

  try {
    group_items =
      fs.existsSync(saved_pos_path_tmp)
        ? JSON.parse(fs.readFileSync(saved_pos_path_tmp, 'ascii'))
        : {};
  } catch (e) {

  }

  for (var lt = fromto; lt < lat_max; lt += qtd_process) {
    for (var lt_dec = decimal_size - 1; lt_dec >= 0; lt_dec--) {
      _step_lg_builts = Math.abs(((lt - fromto) / qtd_process) * decimal_size) + ((decimal_size - lt_dec) - 1);

      const ltsignal = lt >= 0;
      var latitude = ((ltsignal ? 1 : - 1) * (Math.abs(parseFloat(lt)) + (lt_dec / decimal_size)));

      if ((latitude < lat_min) || (latitude > lat_max)) {
        continue;
      }

      let ltpath = String(latitude.toFixed(precision)).replace(/[,\.]/, '/');
      let _dir = `${destPath}/lat/${ltpath}`;

      for (var lg = long_min + 1; lg < long_max; lg++) {
        const lgsignal = lt >= 0;

        /** if skip, continue loop for check existing data */
        let skipthis = (
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

        let last_items = {};
        var longitude;
        let localSkip = skipthis;

        for (var lg_dec = decimal_size - 1; lg_dec >= 0; lg_dec--) {
          longitude = ((lgsignal ? 1 : - 1) * (Math.abs((parseFloat(lg)) + (lg_dec / decimal_size))));

          if ((longitude < long_min) || (longitude > long_max)) {
            continue;
          }

          let lgpath = String(longitude.toFixed(precision)).replace(/[,\.]/g, '/');
          let __dest = `${_dir}/long/${lgpath}`;

          let zone = false;

          if (group_items.hasOwnProperty(`${latitude}`) && group_items[`${latitude}`].hasOwnProperty(`${longitude}`)) {
            zone = group_items[`${latitude}`][`${longitude}`];

            localSkip = ((check) => {
              if (
                (save_raw && fs.existsSync(`${__dest}`) && !check(`${__dest}`)) ||
                (save_json && fs.existsSync(`${__dest}.json`) && !check(`${__dest}.json`, true))
              ) {
                return false;
              }

              return localSkip;
              /**
               * check file, and content
               */
            })((fp, json) => {
              try {
                if (fs.statSync(fp).size < 3) {
                  return false;
                }
              } catch (e) {
                console.error(id, fp, e);
                process.send({ id: id, error: 2 });
                terminate();
              }

              let content = "  ";

              try {
                content = (json ? JSON.parse : (r) => {
                  return r;
                })(fs.readFileSync(fp, 'ascii').trim());
              } catch (e) {
                console.error(id, fp, e);
                process.send({ id: id, error: 3 });
                terminate();
              }

              return (json)
                ? content.tz == zone
                : content == zone;
            });
          }

          if (!zone) {
            zone = (find(latitude, longitude) + "").trim();
            localSkip = false;
          }

          if (!localSkip) {
            try {
              if (save_json) {
                writedata(`${__dest}.json`, JSON.stringify({ tz: `${zone}` }, null, 0));
              }

              if (save_raw) {
                writedata(`${__dest}`, `${zone}`);
              }
            } catch (e) {
              console.error("ERROR", "writedata(__dest)", id, e);
              process.send({ id: id, error: 1 });
              terminate()
            }

            last_items[`${latitude}`] = last_items[`${latitude}`] ? last_items[`${latitude}`] : {};
            last_items[`${latitude}`][`${longitude}`] = `${zone}`;

            group_items[`${latitude}`] = group_items[`${latitude}`] ? group_items[`${latitude}`] : {};
            group_items[`${latitude}`][`${longitude}`] = `${zone}`;
          }
        }

        if (!skipthis || !localSkip) {
          writedata(saved_pos_path_tmp, JSON.stringify(group_items, null, 0));

          writedata(saved_pos_path, JSON.stringify({
            lt: lt,
            lt_dec: lt_dec,
            lg: lg,
            step: _step_lg_builts,
            id: id,
            process: qtd_process,
            decimal_size: decimal_size,

            params: {
              precision: precision,
              update_count: update_count,
              isFreezeSeconds: isFreezeSeconds,

              save_json: save_json,
              save_raw: save_raw
            }
          }));
        }

        process.send({
          skipped: skipthis || localSkip,
          step: _step_lg_builts,
          astep: max_steps,
          segs: (lat_max - fromto) / qtd_process,
          id: id,
          mymakes: decimal_size,
          lat: latitude,
          long: longitude,
          start: fromto,
          items: JSON.parse(JSON.stringify(last_items))
        });
      }
    }
  }

  writedata(saved_pos_path_finished, JSON.stringify(group_items, null, 0));
  fs.unlinkSync(saved_pos_path_tmp);
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
  var processStarted = (Array(qtd_process)).fill(false);
  var totalPerProcess = [];

  if (save_merged_json && fs.existsSync(`${destPath}/full.temp.json`)) {
    makes = JSON.parse(fs.readFileSync(`${destPath}/full.temp.json`, 'ascii'));
  }

  console.log("");
  console.log("Inicializando.");
  console.log("");
  console.log("Precisão...............: " + precision);
  console.log("Incrementos............: " + inc);
  console.log("Processos..............: " + qtd_process);
  console.log("Latitudes por processo.: " + segs);
  console.log("QTD Longitudes.........: " + qtd_longitudes.toLocaleString("pt-BR"));
  console.log("QTD decimal Latitudes..: " + qtd_decpart_latitudes.toLocaleString("pt-BR"));
  console.log("QTD por processo.......: " + qtd_per_process.toLocaleString("pt-BR"));
  console.log("QTD total estimada.....: " + qtd_all.toLocaleString("pt-BR"));
  console.log("Progress update on.....: " + update_count);
  console.log("Save Path..............: " + root);
  console.log("");

  let runtime_byitem_calcs = [];

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    autopadding: true,
    autopaddingChar: " ",
    emptyOnZero: true,
    forceRedraw: true,
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
        unok = (typeof unok === 'string' && unok.length === 1) ? unok : '\u2500';
        const completed = Math.floor(percent * size);
        return ((isStopedSeconds_bars[k] > isFreezeSeconds) ? colors.redBright : (isMain ? colors.greenBright : colors.cyan))("".padStart(completed, ok))
          + colors.gray(unok.padStart(size - completed, unok));
      }

      if (params.value === 0) {
        return "";
      }

      let p_total = "" + ((params.total)).toLocaleString("pt-BR");
      let p_val = "" + ((params.value)).toLocaleString("pt-BR").padStart(p_total.length, " ");

      const k = (getVal('k') !== "" && getVal('k') >= 0)
        ? getVal('k')
        : isStopedSeconds_bars.length - 1;

      const isMain = (k === (isStopedSeconds_bars.length - 1));

      const main_p_size = options.barsize;
      const step_p_size = options.barsize;

      const pbar = newBar(isMain, k, params.progress, main_p_size, '\u25A0');
      const stepbar = isMain ? "" : newBar(isMain, k, values.step / values.astep, step_p_size, "■");

      let lapse = "0, 00:00:00";
      let remaining = lapse;
      let process_p = 0;
      let ms_by_item = 0;

      const stepmax = getVal('astep') * params.total;

      if (isMain) {
        let runtime = Date.now() - startedTime;
        lapse = secondsFormated(Math.floor(runtime / 1000));

        runtime_byitem_calcs.push(runtime / params.value / 1000);

        while (runtime_byitem_calcs.length > qtd_process * 7) {
          runtime_byitem_calcs.shift();
        }

        for (let i = 0; i < runtime_byitem_calcs.length; i++) {
          ms_by_item += runtime_byitem_calcs[i];
        }

        ms_by_item = ms_by_item / runtime_byitem_calcs.length;
        remaining = secondsFormated(Math.round(ms_by_item * (params.total - params.value)));
        ms_by_item = String(ms_by_item.toFixed(3).toLocaleString('pt-BR')).padStart(7, " ");
      } else {
        const makestep = (getVal('step') * params.total) + params.value;
        process_p = String((makestep / stepmax * 100).toFixed(2)).padStart(6, " ");
      }

      let rr = `${getVal('index')}: |${pbar}| ` + (
        isMain
          ? `${String(((params.progress) * 100).toFixed(4)).padStart(9, " ")}% ▐ ${ms_by_item} s/item ▐ Elapsed: ${(String(lapse).padStart(12, " "))} | Remaining: ${(String(remaining).padStart(12, " "))} ▐ ${p_val}/${p_total}`
          : `${String(Math.round((params.progress) * 100)).padStart(3, " ")}% / ${process_p}% ▐ ${getVal('start')} → ${getVal('lat').padStart(1 + 3 + 1 + precision, " ")}/${getVal('long').padStart(1 + 3 + 1 + precision, " ")}, ${(((getVal('skipped') === "SKIPPED") ? colors.bgBlue : colors.bgBlack)(" " + getVal('skipped') + " "))} ▐ Segs: ${getVal('segs').toFixed(2)} ▐ step: |${stepbar}| ${String(getVal('step')).padStart(3, " ")}/${String(Math.round(getVal('astep'))).padStart(3, " ")} of ${p_val}/${p_total}: ${(stepmax.toLocaleString("pt-BR"))}`
      );

      return (isMain ? colors.bgBlack : colors.bgBlack)(rr);
    }

  }, cliProgress.Presets.shades_grey);

  /**
   * CREATE PROGRESSBAR
   */
  (Array(qtd_process).fill('0')).forEach((e, k) => {
    var __counter = 0;
    const bar = multibar.create(qtd_longitudes, 0);
    progressbars[k] = bar;

    fork(process.argv[1], (() => {
      const nn = process.argv;
      nn[nn.indexOf('start')] = '';
      return nn;
    })())
      .on('message', (msg) => {
        ((progress) => {
          if (!is_response_from_child(msg, false)) {
            return;
          }

          if (msg.hasOwnProperty("error")) {
            console.error("Child '", k, "' exited with code:", msg.error);
            return terminate();
          }

          isStopedSeconds_bars[k] = 0;

          if (is_response_from_child(msg, true)) {
            if (!processStarted[k]) {
              processStarted[k] = true;
              totalPerProcess.push(msg.segs * qtd_decpart_latitudes);
            }

            __counter += msg.mymakes;

            if ((__counter % qtd_longitudes) === 0) {
              __counter = 0;
            }

            __total += msg.mymakes;
          }

          makes = mergeDeep(makes, msg.items);

          if (save_merged_json && ((__total % qtd_longitudes) == 0)) {
            writedata(`${destPath}/full.temp.json`, JSON.stringify(makes, null, 2));
          }

          progress(msg, __counter);

          if (__counter >= (segs * qtd_decpart_latitudes)) {
            bar.stop();
          }
        })((msg, val) => {
          bar.update(
            val,
            {
              k: k,
              start: String(msg.start).padStart(3, " "),
              skipped: (msg.skipped ? "SKIPPED" : "Built").padStart(7, " "),
              step: msg.step,
              astep: msg.astep,
              segs: msg.segs,
              lat: String(msg.lat.toFixed(precision)).padStart(pad_adress, ' '),
              long: String(msg.long.toFixed(precision)).padStart(pad_adress, ' '),
              index: String(k).padStart(3, ' ')
            }
          );
        });
      })
      .send({ start: k });
  });

  var bar_total = false;
  var intervalo;

  /**
   * UPDATE GLOBAL PROGRESS BART
   */
  intervalo = setInterval(() => {
    if (!bar_total) {
      if (totalPerProcess.length == qtd_process) {
        let sum = 0;

        for (let i = 0; i < totalPerProcess.length; i++) {
          sum += totalPerProcess[i];
        }

        bar_total = multibar.create(sum, 0);
      }
    }

    if (!bar_total) {
      return;
    }

    bar_total.update(__total, {
      index: "---"
    });

    if (__total >= qtd_all) {
      bar_total.stop();
      console.log("");
      save_merged_json &&
        writedata(`${destPath}/full.json`, JSON.stringify(makes, null, 0)) &&
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
if (getCMDParam('start')) {
  main();
}