
import * as path from 'path';
import * as cliProgress from 'cli-progress';
import * as os from 'os';
import { fork } from 'child_process';
import colors from 'ansi-colors';
import { triggerMessage, readSavedProcessingPos, triggerError, localNumberFormat, minlength, maxlength, fexists, fread, writedata, getCMDParam, has, mergeDeep } from './.maker/commom.js';
import { makeLatitudes } from "./.maker/makeLatitudes.js"
import { all_tz_continents, TZs } from "./.maker/TZs.js"

import {
  adress_isocean
  , adress_isforced_ignore
  , adress_isinvalid_tz
  , adress_unacceptable_tz
  , adress_unchanged
} from "./.maker/writeAdress.js";

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
  , destPath: path.join(`${___pre_4.root}/gcs/${(___pre_4.precision_lt)}-${(___pre_4.precision_lg)}-digit`)
  , pad_adress: 1 + 3 + 1 + ___pre_4.precision
}, ___pre_4);

const options = mergeDeep({
  padstr_total_by_process: localNumberFormat(___pre_5.qtd_by_process, 2).length,
  padstr_total_all: localNumberFormat(___pre_5.qtd_all, 2).length,
}, ___pre_5);

process.log = (msg, funcName, code, data) => {
  triggerMessage(
    'log'
    , has(process, "custom") && has(process.custom, "start") ? process.custom.start : -1
    , msg
    , funcName
    , code
    , data
  );
}

process.warn = (msg, funcName, code, data) => {
  triggerMessage(
    'warn'
    , has(process, "custom") && has(process.custom, "start") ? process.custom.start : -1
    , msg
    , funcName
    , code
    , data
  );
}

process.erro = (msg, funcName, code, data) => {
  triggerMessage(
    'error'
    , has(process, "custom") && has(process.custom, "start") ? process.custom.start : -1
    , msg
    , funcName
    , code
    , data
  );
}

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

  process.custom = {
    start: msg.start
  };

  makeLatitudes(
    options,
    msg.start,
    /**
    * fail()
    *
    * @param {*} _msg
    * @param {*} funcName
    * @param {*} code
    */
    (idp, _msg, funcName, code, data) => {
      triggerError(
        msg.start,
        _msg,
        funcName,
        code,
        data ? data : msg
      );
    },
    /**
     * clback()
     *
     * @param {*} id
     * @param {*} first_lat
     * @param {*} latitude
     * @param {*} long_int_part
     * @param {*} write_return_status
     * @param {*} dont_increaseOrFinished
     */
    (id, first_lat, latitude, long_int_part, last_generated_value, builts_skippeds) => {
      //id === 2 && console.log("\n\n[[main]]-----------------------------------------", id, `'${latitude}'`, "\n\n");
      process.send({
        id: id,
        first_lat: first_lat,
        latitude: parseFloat(latitude).toFixed(options.precision_lt),
        longitude: long_int_part,
        last_generated_value: last_generated_value,
        builts_skippeds: builts_skippeds
      });
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
    throw new Error(`[secondsFormated] Invalid seconds. Is passed: '${s}'`);
  }

  const d = parseInt(s / 86400);
  s = s % 86400;
  const h = parseInt(s / 3600);
  s = s % 3600;
  const m = parseInt(s / 60);
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
                ? localNumberFormat(options[atual])
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
  const PROCESS = readSavedProcessingPos(options, 0, null, `main`);
  writedata(PROCESS.saved_process_path, JSON.stringify(PROCESS.data));

  var isFrezeeSeconds_bars = (Array(options.qtd_process + 1)).fill(0);
  var progressbars = (Array(options.qtd_process)).fill(0);
  var total_makes_by_process = (Array(options.qtd_process)).fill(0);

  listOptions();

  console.log(`Estimated disk occupancy for cluster=512b: ` + localNumberFormat((((options.qtd_all * 512) / (1024 * 1024 * 1024))), 2) + "Gb");
  console.log(`Estimated disk occupancy for cluster=1K..: ` + localNumberFormat((((options.qtd_all * 1024) / (1024 * 1024 * 1024))), 2) + "Gb");
  console.log(`Estimated disk occupancy for cluster=2K..: ` + localNumberFormat((((options.qtd_all * 2 * 1024) / (1024 * 1024 * 1024))), 2) + "Gb");
  console.log(`Estimated disk occupancy for cluster=4K..: ` + localNumberFormat((((options.qtd_all * 4 * 1024) / (1024 * 1024 * 1024))), 2) + "Gb\n");

  const progress_keys_padstr = {
    first: "+000.".length + options.precision_lt
    , builts: (isMain) => (isMain ? options.padstr_total_all : options.padstr_total_by_process)
    , skippeds: (isMain) => (isMain ? options.padstr_total_all : options.padstr_total_by_process)
    , total: (isMain) => (isMain ? options.padstr_total_all : options.padstr_total_by_process)
    , completed: (isMain) => (isMain ? options.padstr_total_all : options.padstr_total_by_process)
    , percent: (isMain) => "000.".length + (isMain ? 4 : 2)
    , ms: "00.000".length
    , elapsed: "00d, 00:00:00".length
    , Remaining: "00d, 00:00:00".length
    , id: 3
    , lat: "-000.".length + options.precision_lt
    , long: "-000".length
    , p_percent: "000.00".length
    , p_total: localNumberFormat(options.qtd_longitudes).length
    , p_completed: localNumberFormat(options.qtd_longitudes).length
    , pbuilts: 3
  };

  var builts_skippeds_status = (Array(options.qtd_process)).fill([0, 0]);

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
        return (
          (typeof isFrezeeSeconds_bars[index] === "number") &&
          (isFrezeeSeconds_bars[index] > options.isFreezeSeconds)
        );
      }

      function newBar(isMain, index, percent, size, ok, unok) {
        ok = (typeof ok === 'string' && ok.length === 1) ? ok : "\u25A0";
        unok = (typeof unok === 'string' && unok.length === 1) ? unok : '\u2500';
        const completed = Math.floor(percent * size);
        return (
          (isfreeze(index)
            ? colors.red
            : (
              isMain
                ? colors.green
                : colors.blue
            )
          )("".padStart(completed, ok))
        ) + colors.gray(unok.padStart(size - completed, unok));
      }

      function progressText(isMain, ctts) {
        return "---";
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
                ? "---: |{gbar}| {percent}% \u2192 {completed}/{total} ▐ Built: {builts} ({pbuilts}%) ▐ {ms} s/item, Elapsed: {elapsed}, Remaining: {remaining} "
                : "{id}: |{gbar}| {percent}% \u2192 {completed}/{total}, first: {first} ▐ {lat} x {long} |{pbar}| {p_percent}% \u2192 {p_completed}/{p_total} ▐ {status}"
            )
              .replace(
                /\{([^\}\{ ]+)\}/g,
                (s, key) => {
                  key = key.toLowerCase();

                  return ((() => {
                    if (!has(ctts, key)) {
                      if (key == "gbar") {
                        return newBar(
                          isMain,
                          has(ctts, 'id') ? ctts.id : 0,
                          (
                            has(ctts, 'total')
                              ? ctts.completed / ctts.total
                              : 0
                          ),
                          OPT.barsize
                        );
                      }

                      if (key == "pbar") {
                        return newBar(
                          isMain,
                          has(ctts, 'id') ? ctts.id : 0,
                          (
                            has(ctts, 'p_total')
                              ? ctts.p_completed / ctts.p_total
                              : .5
                          ),
                          Math.round(OPT.barsize / 2)
                        );
                      }

                      if (key == "percent") {
                        return localNumberFormat((
                          has(ctts, 'total')
                            ? ctts.completed / ctts.total * 100
                            : 0
                        ), isMain ? 4 : 2)
                      }

                      if (key == "p_percent") {
                        return localNumberFormat((
                          has(ctts, 'p_total')
                            ? ctts.p_completed / ctts.p_total * 100
                            : 0
                        ), 2)
                      }

                      return "???";
                    }

                    if (["p_total", "total", "p_completed", "completed", "builts", "skippeds"].indexOf(key) >= 0) {
                      ctts[key] = localNumberFormat(ctts[key]);
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
        console.log("\n???", runtime_byitem_calcs, params.total, params.value);

        remaining = secondsFormated(
          Math.round(
            runtime_byitem_calcs * (
              params.total - params.value
            )
          )
        );
        ms_by_item = localNumberFormat(runtime_byitem_calcs, 3, [7, " "]);
      }
      /**
       *
       *   {
              id: k,
              first_lat: msg.first_lat,
              latitude: msg.latitude,
              longitude: msg.longitude,
            }
       */
      return progressText(isMain, {
        id: id,
        first: values.first_lat,
        lapse: lapse,
        ms: ms_by_item,
        lat: values.latitude,
        long: values.longitude,
        builts: isMain ? values.builts : 0,
        pbuilts: isMain ? values.builts / options.qtd_all * 100 : 0,
        elapsed: lapse,
        remaining: remaining,
        p_completed: isMain ? 0 : (params.value % options.qtd_longitudes),
        p_total: options.qtd_longitudes,
        completed: params.value,
        total: isMain ? options.qtd_all : options.qtd_by_process,
        status: (
          (typeof values.lgv === "object")
            ? colors.bgGreenBright(colors.black(" OK "))
            : (
              ((typeof values.lgv === "number") && (isFinite(values.lgv)))
                ? (
                  /**
                   *  adress_isocean
                    , adress_isforced_ignore
                    , adress_isinvalid_tz
                    , adress_unacceptable_tz
                    , adress_skipped
                   */
                  (
                    values.lgv === adress_unchanged
                      ? colors.bgCyan(" UNCHANGED ")
                      : colors.bgBlue(" IGNORED ")
                  )
                )
                : colors.bgMagentaBright(" UNKNOW-STATUS ")
            )
        )
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
        if (has(msg, "error")) {
          "Child '", k, "' exited with data:" + msg.error;
          return terminate();
        }

        if (isFrezeeSeconds_bars[k] === true) {
          return;
        }

        if (
          (typeof msg !== 'object') ||
          (!has(msg, 'id'))
        ) {
          return;
        }

        builts_skippeds_status[k] = has(msg, 'builts_skippeds') ? msg.builts_skippeds : builts_skippeds_status[k];
        console.log(msg.builts_skippeds);
        //console.log(builts_skippeds_status[k]);

        //if (isFrezeeSeconds_bars[k] > 0) {
        isFrezeeSeconds_bars[k] = 0;

        total_makes_by_process[k] = builts_skippeds_status[k][0] + builts_skippeds_status[k][1];
        if (!isFinite(total_makes_by_process[k])) {
          console.log(builts_skippeds_status[k]);
          throw new Error(`[tot[k]] = '${total_makes_by_process[k]}'`, builts_skippeds_status[k]);
        }

        bar.update(
          total_makes_by_process[k],
          {
            id: k,
            first_lat: msg.first_lat,
            latitude: msg.latitude,
            longitude: msg.longitude,
            lgv: msg.last_generated_value
          }
        );

        if (has(msg, "finished") && (typeof msg.finished === "object")) {
          isFrezeeSeconds_bars[k] === true;
        }
        //}
      })
      .send({ start: k });
  });

  var bar_total = false;
  var intervalo;

  /**
   * UPDATE GLOBAL PROGRESS BART
   */
  intervalo = setInterval(() => {
    isFrezeeSeconds_bars[isFrezeeSeconds_bars.length - 1] = 0;
    let builts = 0;

    for (var k = 0; k < progressbars.length; k++) {
      builts += builts_skippeds_status[k][0];

      if (typeof isFrezeeSeconds_bars[k] !== 'boolean') {
        isFrezeeSeconds_bars[k]++;

        if (isFrezeeSeconds_bars[k] > options.isFreezeSeconds) {
          isFrezeeSeconds_bars[isFrezeeSeconds_bars.length - 1] = options.isFreezeSeconds + 1;
          progressbars[k].update(null);
        }
      }
    }

    if (!bar_total) {
      if (total_makes_by_process.length == options.qtd_process) {
        bar_total = multibar.create(options.qtd_all, 0);
      }
    }

    let tot = 0;
    for (let k = 0; k < total_makes_by_process.length; k++) {
      tot += total_makes_by_process[k];

      if (!isFinite(tot)) {
        throw new Error(`[tot sum] sum tot is invalid. um: '${total_makes_by_process[k]}'`);
      }
    }

    if (!bar_total) {
      return;
    }

    bar_total.update(
      tot, {
      id: -1,
      builts
    }
    );

    if (tot >= options.qtd_all) {
      bar_total.stop();
      console.log("");
      clearInterval(intervalo);
      return;
    }
  }, 1000);
}

/**
 *
 */
if (getCMDParam('start')) {
  main();
}