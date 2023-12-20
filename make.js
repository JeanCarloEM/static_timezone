
import * as path from 'path';
import * as cliProgress from 'cli-progress';
import * as os from 'os';
import { fork } from 'child_process';
import colors from 'ansi-colors';
import { minlength, maxlength, fexists, fread, writedata, getCMDParam, has, mergeDeep } from './.maker/commom.js';
import { makeLatitudes } from "./.maker/makeLatitudes.js"
import { TZs } from "./.maker/TZs.js"

const startedTime = Date.now();

const ___pre_ = {
  timezones: TZs
  , maxlenTZ: maxlength(...TZs)
  , minlenTZ: minlength(...TZs)
  , precision: getCMDParam('p', 'precision', 2)
  , update_count: getCMDParam('u', 'update', 100)
  , isFreezeSeconds: getCMDParam('u', 'update', 15)
  , root: getCMDParam('r', 'root', 'from').trim().replace(/["']/g, "").trim()

  , save_json: getCMDParam('j', 'save-json', false)
  , save_raw: getCMDParam('s', 'save-raw', true)
  , qtd_process: getCMDParam('t', 'threads', Math.ceil(os.cpus().length))
  , inc_multiply: getCMDParam('m', 'multiply', 1)

  , lat_min: -58
  , lat_max: 84
  , long_min: -180
  , long_max: 180

  , save_merged_json: true
};

const ___pre_2 = mergeDeep({
  decimal_lt_size: Math.pow(10, ___pre_.precision)
  , decimal_lg_size: Math.pow(10, ___pre_.precision)
  , lat_range: (___pre_.lat_max - ___pre_.lat_min)
  , long_range: (___pre_.long_max - ___pre_.long_min)
  , inc_lg_multiply: ___pre_.inc_multiply
  , inc_lt_multiply: ___pre_.inc_multiply
  , precision_lt: ___pre_.precision
  , precision_lg: ___pre_.precision
}, ___pre_);

const ___pre_3 = mergeDeep({
  segs: Math.ceil(___pre_2.lat_range / ___pre_2.qtd_process)
  , qtd_longitudes: ___pre_2.long_range * ___pre_2.decimal_lg_size
}, ___pre_2);

const ___pre_4 = mergeDeep({
  qtd_decpart_latitudes: ___pre_3.decimal_lt_size * ___pre_3.qtd_longitudes
}, ___pre_3);

const ___pre_5 = mergeDeep({
  qtd_longitudes: ___pre_4.long_range * ___pre_4.decimal_lg_size
  , qtd_all: ___pre_4.lat_range * ___pre_4.qtd_decpart_latitudes
  , qtd_by_process: ___pre_4.segs * ___pre_4.qtd_decpart_latitudes
  , destPath: path.join(`${___pre_4.root}/gcs/${(___pre_4.precision)}-digit`)
  , pad_adress: 1 + 3 + 1 + ___pre_4.precision
}, ___pre_4);

const options = mergeDeep({
  padstr_total_by_process: (___pre_5.qtd_all)
    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    .length,
  padstr_total_all: (___pre_5.qtd_all)
    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    .length,
}, ___pre_5);








/**
 *
 */
process.on('message', (msg) => {
  if (!(msg && (typeof msg === 'object') && (has(msg, 'start')))) {
    console.error(">>> Mensagem INVALIDA.", msg);
    return;
  }

  if ((options.lat_min + msg.start) > options.lat_max) {
    console.error(`>>> Segmento '${msg.start}' FORA do range`);
    return;
  }

  makeLatitudes(
    options,
    msg.start,
    options.destPath,
    (_msg, funcName, code) => {
      process.send({
        error: {
          funcName: funcName,
          code: code,
          msg: msg
        }
      });

      throw new Error(`${colors.bgBlueBright(` Process ${msg.start} `)} -> ${colors.yellow(`[${code}]`)} | ${colors.bgRed(" " + funcName + " ")}: ${colors.redBright(_msg)}\n` + JSON.stringify(msg));
    },
    (id, first_lat, latitude, long_int_part, write_return_status, dont_increaseOrFinished) => {
      let send = {
        id: id,
        first_lat: first_lat,
        latitude: latitude.toFixed(options.precision),
        longitude: long_int_part,
        write_return_status: write_return_status
      };

      if (
        typeof dont_increaseOrFinished === 'object' &&
        has(dont_increaseOrFinished, 'finished') &&
        (typeof dont_increaseOrFinished.finished === "object")
      ) {
        send = mergeDeep(send, dont_increaseOrFinished);
      } else {
        send.increase = dont_increaseOrFinished;
      }

      process.send(send);
    }
  );
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
  if (typeof s !== 'number' || !isFinite(s)) {
    throw new Error(`[secondsFormated] Invalid seconds is passed: '${s}'`);
  }

  const d = Math.floor(s / 86400);
  s = s % 86400;
  const h = Math.floor(s / 3600);
  s = s % 3600;
  const m = Math.round(s / 60);
  s = s % 60;

  let dd = d ? `${d}d, ` : '';
  let hh = (String(h).padStart(2, "0"));
  let mm = (String(m).padStart(2, "0"));
  let ss = (String(s).padStart(2, "0"));

  return `${dd}${hh}:${mm}:${ss}`;
}

function listOptions() {
  const keys = Object.keys(options).sort();
  let maxlen = 0;
  let maxlen_content = 0;

  keys.reduce(
    (accumulator, currentValue) => {
      maxlen = currentValue.length > maxlen ? currentValue.length : maxlen;
      maxlen_content = options[currentValue].length > maxlen_content ? options[currentValue].length : maxlen_content;

    }
  );

  console.log("\nOPTIONS:\n");

  keys.reduce(
    (a, atual) => {
      const isbols = (typeof options[atual] == "boolean");
      const isstr = (typeof options[atual] == "string");

      console.log(" - " + atual.padEnd(maxlen, ".") + ": " +
        (
          (
            isbols
              ? (
                options[atual]
                  ? colors.greenBright
                  : colors.redBright
              )
              : (
                isstr
                  ? colors.yellowBright
                  : colors.cyanBright
              )
          )(
            (
              (typeof options[atual] == "number")
                ? options[atual].toLocaleString("pt-BR")
                : (
                  isbols
                    ? (options[atual] ? "TRUE" : "FALSE")
                    : `'${options[atual]}'`
                )
            )
              .padStart((maxlen_content > 16 ? 16 : maxlen_content) + 1, " ")
          )
        )
      );
    }
  );

  console.log("\n");
}

/**
 *
 */
function main() {
  var __total = { complete: 0, forced: 0 };
  var makes = {};
  var isStopedSeconds_bars = (Array(options.qtd_process + 1)).fill(0);
  var progressbars = (Array(options.qtd_process)).fill(0);
  var processStarted = (Array(options.qtd_process)).fill(false);
  var totalPerProcess = [];

  if (options.save_merged_json && fexists(`${options.destPath}/full.temp.json`)) {
    makes = JSON.parse(fread(`${options.destPath}/full.temp.json`));
  }

  listOptions();

  console.log(`Estimated disk occupancy for cluster=512b: ` + (((options.qtd_all * 512) / (1024 * 1024 * 1024))).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + "Gb");
  console.log(`Estimated disk occupancy for cluster=1K..: ` + (((options.qtd_all * 1024) / (1024 * 1024 * 1024))).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + "Gb\n");
  console.log(`Estimated disk occupancy for cluster=2K..: ` + (((options.qtd_all * 2 * 1024) / (1024 * 1024 * 1024))).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + "Gb\n");
  console.log(`Estimated disk occupancy for cluster=4K..: ` + (((options.qtd_all * 4 * 1024) / (1024 * 1024 * 1024))).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + "Gb\n");

  const progress_keys_padstr = {
    first: "000.".length + options.precision_lt
    , total: (isMain) => (isMain ? options.padstr_total_all : options.padstr_total_by_process)
    , completed: (isMain) => (isMain ? options.padstr_total_all : options.padstr_total_by_process)
    , percent: (isMain) => "000.".length + (isMain ? 4 : 2)
    , ms: "00.000".length
    , elapsed: "00d, 00:00:00".length
    , Remaining: "00d, 00:00:00".length
    , id: 3
    , lat: "000.".length + options.precision_lt
    , long: "000.".length + options.precision_lg
    , p_percent: "000.00".length
    , p_total: options.qtd_longitudes
      .toLocaleString("pt-BR")
      .length
    , p_completed: options.qtd_longitudes
      .toLocaleString("pt-BR")
      .length
  };

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    autopadding: true,
    autopaddingChar: " ",
    emptyOnZero: true,
    forceRedraw: false,
    barsize: 20,

    format: function (OPT, params, values) {
      function getVal(x) {
        if (has(values, x)) {
          return values[x];
        }

        return "";
      }

      function isfreeze(index) {
        return (typeof isStopedSeconds_bars[index] !== "boolean") ||
          (isStopedSeconds_bars[index] > isFreezeSeconds);
      }

      function newBar(isMain, index, percent, size, ok, unok) {
        ok = (typeof ok === 'string' && ok.length === 1) ? ok : OPT.barCompleteString;
        unok = (typeof unok === 'string' && unok.length === 1) ? unok : '\u2500';
        const completed = Math.floor(percent * size);
        return (
          (isfreeze(index)
            ? colors.redBright
            : (
              isMain
                ? colors.greenBright
                : colors.cyan
            )
          )("".padStart(completed, ok))
        ) + colors.gray(unok.padStart(size - completed, unok));
      }

      function progressText(isMain, ctts) {
        if (has(ctts, 'total') && has(ctts, 'complected') && ctts.comleted > ctts.total) {
          throw new Error(`[progressText] in process '${ctts.id}': completed > total`);
        }

        if (has(ctts, 'p_total') && has(ctts, 'p_complected') && ctts.comleted > ctts.total) {
          throw new Error(`[progressText] in process '${ctts.id}': p_completed > p_total`);
        }

        return (
          ((r) => isMain ? colors.bgYellow(colors.black(r)) : (
            has(ctts, 'id', 'number')
              ? (
                (ctts.id % 2 === 1)
                  ? colors.bgBlackBright(colors.black(r))
                  : r
              )
              : r
          ))(
            (
              isMain
                ? "---: |{gbar}| {percent}% \u2192 {completed}/{total} ▐ {ms} s/item, Elapsed: {elapsed}, Remaining: {remaining}"
                : "{id}: |{gbar}| {percent}% \u2192 {completed}/{total}, first: {first} ▐ {lat} x {long} |{pbar}| {p_percent}% \u2192 {p_completed}/{p_total}"
            )
              .replace(
                /\{([^\}\{ ]+)\}/g,
                (s, key) => {
                  key = key.toLowerCase();

                  return ((() => {
                    if (!has(ctts, key)) {
                      if (key == "gbar") {
                        return newBar(
                          false,
                          (
                            has(ctts, 'total')
                              ? ctts.completed / ctts.total
                              : "???"
                          ),
                          0,
                          OPT.barsize
                        );
                      }

                      if (key == "pbar") {
                        return newBar(
                          false,
                          (
                            has(ctts, 'p_total')
                              ? ctts.p_completed / ctts.p_total
                              : "???"
                          ),
                          0,
                          Math.round(OPT.barsize / 2)
                        );
                      }

                      if (key == "percent") {
                        return (
                          has(ctts, 'total')
                            ? ctts.completed / ctts.total * 100
                            : 0
                        )
                          .toLocaleString("pt-BR", { minimumFractionDigits: isMain ? 4 : 2 })
                      }

                      if (key == "p_percent") {
                        return (
                          has(ctts, 'p_total')
                            ? ctts.p_completed / ctts.p_total * 100
                            : 0
                        )
                          .toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                      }

                      return "???";
                    }

                    if (["p_total", "total", "p_completed", "completed"].indexOf(key) >= 0) {
                      ctts[key] = ctts[key].toLocaleString('pt-BR');
                    }


                    return ctts[key];
                  })() + "")
                    .padStart(
                      (
                        has(progress_keys_padstr, key)
                          ? (
                            (
                              (typeof progress_keys_padstr[key] === 'function')
                                ? progress_keys_padstr[key]
                                : (r) => progress_keys_padstr[r]
                            )(key)
                          )
                          : 0
                      ),
                      " ");
                }
              )
          )
        )
      };

      if (!values || JSON.stringify(values) == "{}") {
        values = this.latest_values;
      }

      this.latest_values = values;

      if (!values) return progressText(false, {});

      const id = getVal('id');

      const isMain = id < 0;

      let lapse = "00:00:00";
      let remaining = lapse;
      let ms_by_item = 0;

      if (isMain) {
        let runtime = Date.now() - startedTime;
        lapse = secondsFormated(Math.floor(runtime / 1000));

        const runtime_byitem_calcs = params.value > 0 ? runtime / params.value / 1000 : 0;

        remaining = secondsFormated(Math.round(runtime_byitem_calcs * (params.total - params.value)));
        ms_by_item = String(runtime_byitem_calcs.toLocaleString('pt-BR', { minimumFractionDigits: 3 })).padStart(7, " ");
      }

      return progressText(isMain, {
        id: id,
        first: values.first_lat,
        lapse: lapse,
        ms: ms_by_item,
        elapsed: lapse,
        remaining: remaining,
        p_completed: params.value,
        p_total: options.qtd_longitudes,
        completed: isMain ? params.value : (values.global_makes ? values.global_makes : params.value),
        total: isMain ? options.qtd_all : options.qtd_by_process,
      });
    }

  }, cliProgress.Presets.shades_grey);

  /**
   * CREATE PROGRESSBAR
   */
  (Array(options.qtd_process).fill('0')).forEach((e, k) => {
    var __counter = { comleted: { part_val: 0, global_val: 0 }, forced: { part_val: 0, global_val: 0 } };
    const bar = multibar.create(options.qtd_by_process, 0);
    progressbars[k] = bar;

    fork(process.argv[1], (() => {
      const nn = process.argv;
      nn[nn.indexOf('start')] = '';
      return nn;
    })())
      .on('message', (msg) => {
        ((progress) => {
          if (
            (typeof msg !== 'object') ||
            (!has(msg, 'id'))
          ) {
            return;
          }

          if (has(msg, "error")) {
            console.error("Child '", k, "' exited with data:", msg.error);
            return terminate();
          }

          isStopedSeconds_bars[k] = 0;

          let part_val = 0, global_val = 0;

          if (has(msg, "increase") && msg.increase) {
            if (!processStarted[k]) {
              processStarted[k] = true;
              totalPerProcess.push(msg.segs * options.qtd_decpart_latitudes);
            }

            if (typeof msg.increase === "numeric") {
              __counter.forced.part_val += msg.increase;
              __counter.forced.global_val += msg.increase;
              __total.forced += msg.increase;
            } else {
              __counter.comleted.part_val += options.decimal_lg_size;
              __counter.comleted.global_val += options.decimal_lg_size;
              __total.completed += options.decimal_lg_size;
            }

            __counter.forced.part_val = (
              (__counter.forced.part_val > (__counter.comleted.part_val + options.decimal_lg_size))
            )
              ? (__counter.comleted.part_val + options.decimal_lg_size)
              : __counter.forced.part_val;

            __counter.forced.global_val = (
              (__counter.forced.global_val > (__counter.comleted.global_val + options.decimal_lg_size))
            )
              ? (__counter.comleted.part_val + options.decimal_lg_size)
              : __counter.forced.global_val;

            part_val = __counter.comleted.part_val > __counter.forced.part_val
              ? __counter.comleted.part_val
              : __counter.forced.part_val;

            global_val = __counter.comleted.global_val > __counter.forced.global_val
              ? __counter.comleted.global_val
              : __counter.forced.global_val;

            if ((part_val % options.qtd_longitudes) === 0) {
              if (__counter.comleted.part_val > __counter.forced.part_val) {
                __counter.comleted.part_val = 0;
              } else {
                __counter.forced.part_val = 0;
              }
            }
          }

          if (has(msg, "finished") && (typeof msg.finished === "object")) {
            isStopedSeconds_bars[k] === true;
            progress(msg, [options.qtd_longitudes, options.qtd_by_process]);
            bar.stop();
            makes = mergeDeep(makes, msg.finished);
          }

          progress(msg, [part_val, global_val]);
        })((msg, val) => {
          bar.update(
            val[0],
            {
              global_makes: val[1],
              id: k,
              first_lat: msg.first_lat,
              latitude: msg.latitude,
              longitude: msg.longitude,
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
      if (totalPerProcess.length == options.qtd_process) {
        bar_total = multibar.create(options.qtd_all, 0);
      }
    }

    if (!bar_total) {
      return;
    }

    const tot = __total.completed.part_val > __total.forced.part_val
      ? __total.completed.part_val
      : __total.forced.part_val

    bar_total.update(tot, {
      id: -1
    });

    if (tot >= options.qtd_all) {
      bar_total.stop();
      console.log("");
      save_merged_json &&
        writedata(`${destPath} /full.json`, JSON.stringify(makes, null, 0)) &&
        delfile(`${destPath}/full.temp.json`);
      clearInterval(intervalo);
      return;
    }

    isStopedSeconds_bars[isStopedSeconds_bars.length - 1] = 0;

    for (var k = 0; k < progressbars.length; k++) {
      if (typeof isStopedSeconds_bars[k] !== 'boolean') {
        isStopedSeconds_bars[k]++;

        if (isStopedSeconds_bars[k] > options.isFreezeSeconds) {
          isStopedSeconds_bars[isStopedSeconds_bars.length - 1] = options.isFreezeSeconds + 1;
          progressbars[k].update(null);
        }
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