"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  }, __copyProps = (to, from, except, desc) => {
    if (from && typeof from == "object" || typeof from == "function")
      for (let key of __getOwnPropNames(from))
        !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
    mod
  ));

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/can-promise.js
  var require_can_promise = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/can-promise.js"(exports, module) {
      module.exports = function() {
        return typeof Promise == "function" && Promise.prototype && Promise.prototype.then;
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/utils.js
  var require_utils = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/utils.js"(exports) {
      var toSJISFunction, CODEWORDS_COUNT = [
        0,
        // Not used
        26,
        44,
        70,
        100,
        134,
        172,
        196,
        242,
        292,
        346,
        404,
        466,
        532,
        581,
        655,
        733,
        815,
        901,
        991,
        1085,
        1156,
        1258,
        1364,
        1474,
        1588,
        1706,
        1828,
        1921,
        2051,
        2185,
        2323,
        2465,
        2611,
        2761,
        2876,
        3034,
        3196,
        3362,
        3532,
        3706
      ];
      exports.getSymbolSize = function(version) {
        if (!version) throw new Error('"version" cannot be null or undefined');
        if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
        return version * 4 + 17;
      };
      exports.getSymbolTotalCodewords = function(version) {
        return CODEWORDS_COUNT[version];
      };
      exports.getBCHDigit = function(data) {
        let digit = 0;
        for (; data !== 0; )
          digit++, data >>>= 1;
        return digit;
      };
      exports.setToSJISFunction = function(f) {
        if (typeof f != "function")
          throw new Error('"toSJISFunc" is not a valid function.');
        toSJISFunction = f;
      };
      exports.isKanjiModeEnabled = function() {
        return typeof toSJISFunction < "u";
      };
      exports.toSJIS = function(kanji) {
        return toSJISFunction(kanji);
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-level.js
  var require_error_correction_level = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
      exports.L = { bit: 1 };
      exports.M = { bit: 0 };
      exports.Q = { bit: 3 };
      exports.H = { bit: 2 };
      function fromString(string) {
        if (typeof string != "string")
          throw new Error("Param is not a string");
        switch (string.toLowerCase()) {
          case "l":
          case "low":
            return exports.L;
          case "m":
          case "medium":
            return exports.M;
          case "q":
          case "quartile":
            return exports.Q;
          case "h":
          case "high":
            return exports.H;
          default:
            throw new Error("Unknown EC Level: " + string);
        }
      }
      exports.isValid = function(level) {
        return level && typeof level.bit < "u" && level.bit >= 0 && level.bit < 4;
      };
      exports.from = function(value, defaultValue) {
        if (exports.isValid(value))
          return value;
        try {
          return fromString(value);
        } catch {
          return defaultValue;
        }
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-buffer.js
  var require_bit_buffer = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-buffer.js"(exports, module) {
      function BitBuffer() {
        this.buffer = [], this.length = 0;
      }
      BitBuffer.prototype = {
        get: function(index) {
          let bufIndex = Math.floor(index / 8);
          return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
        },
        put: function(num, length) {
          for (let i = 0; i < length; i++)
            this.putBit((num >>> length - i - 1 & 1) === 1);
        },
        getLengthInBits: function() {
          return this.length;
        },
        putBit: function(bit) {
          let bufIndex = Math.floor(this.length / 8);
          this.buffer.length <= bufIndex && this.buffer.push(0), bit && (this.buffer[bufIndex] |= 128 >>> this.length % 8), this.length++;
        }
      };
      module.exports = BitBuffer;
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-matrix.js
  var require_bit_matrix = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-matrix.js"(exports, module) {
      function BitMatrix(size) {
        if (!size || size < 1)
          throw new Error("BitMatrix size must be defined and greater than 0");
        this.size = size, this.data = new Uint8Array(size * size), this.reservedBit = new Uint8Array(size * size);
      }
      BitMatrix.prototype.set = function(row, col, value, reserved) {
        let index = row * this.size + col;
        this.data[index] = value, reserved && (this.reservedBit[index] = !0);
      };
      BitMatrix.prototype.get = function(row, col) {
        return this.data[row * this.size + col];
      };
      BitMatrix.prototype.xor = function(row, col, value) {
        this.data[row * this.size + col] ^= value;
      };
      BitMatrix.prototype.isReserved = function(row, col) {
        return this.reservedBit[row * this.size + col];
      };
      module.exports = BitMatrix;
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alignment-pattern.js
  var require_alignment_pattern = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
      var getSymbolSize = require_utils().getSymbolSize;
      exports.getRowColCoords = function(version) {
        if (version === 1) return [];
        let posCount = Math.floor(version / 7) + 2, size = getSymbolSize(version), intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2, positions = [size - 7];
        for (let i = 1; i < posCount - 1; i++)
          positions[i] = positions[i - 1] - intervals;
        return positions.push(6), positions.reverse();
      };
      exports.getPositions = function(version) {
        let coords = [], pos = exports.getRowColCoords(version), posLength = pos.length;
        for (let i = 0; i < posLength; i++)
          for (let j = 0; j < posLength; j++)
            i === 0 && j === 0 || // top-left
            i === 0 && j === posLength - 1 || // bottom-left
            i === posLength - 1 && j === 0 || coords.push([pos[i], pos[j]]);
        return coords;
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/finder-pattern.js
  var require_finder_pattern = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
      var getSymbolSize = require_utils().getSymbolSize, FINDER_PATTERN_SIZE = 7;
      exports.getPositions = function(version) {
        let size = getSymbolSize(version);
        return [
          // top-left
          [0, 0],
          // top-right
          [size - FINDER_PATTERN_SIZE, 0],
          // bottom-left
          [0, size - FINDER_PATTERN_SIZE]
        ];
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mask-pattern.js
  var require_mask_pattern = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
      exports.Patterns = {
        PATTERN000: 0,
        PATTERN001: 1,
        PATTERN010: 2,
        PATTERN011: 3,
        PATTERN100: 4,
        PATTERN101: 5,
        PATTERN110: 6,
        PATTERN111: 7
      };
      var PenaltyScores = {
        N1: 3,
        N2: 3,
        N3: 40,
        N4: 10
      };
      exports.isValid = function(mask) {
        return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
      };
      exports.from = function(value) {
        return exports.isValid(value) ? parseInt(value, 10) : void 0;
      };
      exports.getPenaltyN1 = function(data) {
        let size = data.size, points = 0, sameCountCol = 0, sameCountRow = 0, lastCol = null, lastRow = null;
        for (let row = 0; row < size; row++) {
          sameCountCol = sameCountRow = 0, lastCol = lastRow = null;
          for (let col = 0; col < size; col++) {
            let module2 = data.get(row, col);
            module2 === lastCol ? sameCountCol++ : (sameCountCol >= 5 && (points += PenaltyScores.N1 + (sameCountCol - 5)), lastCol = module2, sameCountCol = 1), module2 = data.get(col, row), module2 === lastRow ? sameCountRow++ : (sameCountRow >= 5 && (points += PenaltyScores.N1 + (sameCountRow - 5)), lastRow = module2, sameCountRow = 1);
          }
          sameCountCol >= 5 && (points += PenaltyScores.N1 + (sameCountCol - 5)), sameCountRow >= 5 && (points += PenaltyScores.N1 + (sameCountRow - 5));
        }
        return points;
      };
      exports.getPenaltyN2 = function(data) {
        let size = data.size, points = 0;
        for (let row = 0; row < size - 1; row++)
          for (let col = 0; col < size - 1; col++) {
            let last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
            (last === 4 || last === 0) && points++;
          }
        return points * PenaltyScores.N2;
      };
      exports.getPenaltyN3 = function(data) {
        let size = data.size, points = 0, bitsCol = 0, bitsRow = 0;
        for (let row = 0; row < size; row++) {
          bitsCol = bitsRow = 0;
          for (let col = 0; col < size; col++)
            bitsCol = bitsCol << 1 & 2047 | data.get(row, col), col >= 10 && (bitsCol === 1488 || bitsCol === 93) && points++, bitsRow = bitsRow << 1 & 2047 | data.get(col, row), col >= 10 && (bitsRow === 1488 || bitsRow === 93) && points++;
        }
        return points * PenaltyScores.N3;
      };
      exports.getPenaltyN4 = function(data) {
        let darkCount = 0, modulesCount = data.data.length;
        for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
        return Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10) * PenaltyScores.N4;
      };
      function getMaskAt(maskPattern, i, j) {
        switch (maskPattern) {
          case exports.Patterns.PATTERN000:
            return (i + j) % 2 === 0;
          case exports.Patterns.PATTERN001:
            return i % 2 === 0;
          case exports.Patterns.PATTERN010:
            return j % 3 === 0;
          case exports.Patterns.PATTERN011:
            return (i + j) % 3 === 0;
          case exports.Patterns.PATTERN100:
            return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
          case exports.Patterns.PATTERN101:
            return i * j % 2 + i * j % 3 === 0;
          case exports.Patterns.PATTERN110:
            return (i * j % 2 + i * j % 3) % 2 === 0;
          case exports.Patterns.PATTERN111:
            return (i * j % 3 + (i + j) % 2) % 2 === 0;
          default:
            throw new Error("bad maskPattern:" + maskPattern);
        }
      }
      exports.applyMask = function(pattern, data) {
        let size = data.size;
        for (let col = 0; col < size; col++)
          for (let row = 0; row < size; row++)
            data.isReserved(row, col) || data.xor(row, col, getMaskAt(pattern, row, col));
      };
      exports.getBestMask = function(data, setupFormatFunc) {
        let numPatterns = Object.keys(exports.Patterns).length, bestPattern = 0, lowerPenalty = 1 / 0;
        for (let p = 0; p < numPatterns; p++) {
          setupFormatFunc(p), exports.applyMask(p, data);
          let penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
          exports.applyMask(p, data), penalty < lowerPenalty && (lowerPenalty = penalty, bestPattern = p);
        }
        return bestPattern;
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-code.js
  var require_error_correction_code = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
      var ECLevel = require_error_correction_level(), EC_BLOCKS_TABLE = [
        // L  M  Q  H
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        1,
        2,
        2,
        4,
        1,
        2,
        4,
        4,
        2,
        4,
        4,
        4,
        2,
        4,
        6,
        5,
        2,
        4,
        6,
        6,
        2,
        5,
        8,
        8,
        4,
        5,
        8,
        8,
        4,
        5,
        8,
        11,
        4,
        8,
        10,
        11,
        4,
        9,
        12,
        16,
        4,
        9,
        16,
        16,
        6,
        10,
        12,
        18,
        6,
        10,
        17,
        16,
        6,
        11,
        16,
        19,
        6,
        13,
        18,
        21,
        7,
        14,
        21,
        25,
        8,
        16,
        20,
        25,
        8,
        17,
        23,
        25,
        9,
        17,
        23,
        34,
        9,
        18,
        25,
        30,
        10,
        20,
        27,
        32,
        12,
        21,
        29,
        35,
        12,
        23,
        34,
        37,
        12,
        25,
        34,
        40,
        13,
        26,
        35,
        42,
        14,
        28,
        38,
        45,
        15,
        29,
        40,
        48,
        16,
        31,
        43,
        51,
        17,
        33,
        45,
        54,
        18,
        35,
        48,
        57,
        19,
        37,
        51,
        60,
        19,
        38,
        53,
        63,
        20,
        40,
        56,
        66,
        21,
        43,
        59,
        70,
        22,
        45,
        62,
        74,
        24,
        47,
        65,
        77,
        25,
        49,
        68,
        81
      ], EC_CODEWORDS_TABLE = [
        // L  M  Q  H
        7,
        10,
        13,
        17,
        10,
        16,
        22,
        28,
        15,
        26,
        36,
        44,
        20,
        36,
        52,
        64,
        26,
        48,
        72,
        88,
        36,
        64,
        96,
        112,
        40,
        72,
        108,
        130,
        48,
        88,
        132,
        156,
        60,
        110,
        160,
        192,
        72,
        130,
        192,
        224,
        80,
        150,
        224,
        264,
        96,
        176,
        260,
        308,
        104,
        198,
        288,
        352,
        120,
        216,
        320,
        384,
        132,
        240,
        360,
        432,
        144,
        280,
        408,
        480,
        168,
        308,
        448,
        532,
        180,
        338,
        504,
        588,
        196,
        364,
        546,
        650,
        224,
        416,
        600,
        700,
        224,
        442,
        644,
        750,
        252,
        476,
        690,
        816,
        270,
        504,
        750,
        900,
        300,
        560,
        810,
        960,
        312,
        588,
        870,
        1050,
        336,
        644,
        952,
        1110,
        360,
        700,
        1020,
        1200,
        390,
        728,
        1050,
        1260,
        420,
        784,
        1140,
        1350,
        450,
        812,
        1200,
        1440,
        480,
        868,
        1290,
        1530,
        510,
        924,
        1350,
        1620,
        540,
        980,
        1440,
        1710,
        570,
        1036,
        1530,
        1800,
        570,
        1064,
        1590,
        1890,
        600,
        1120,
        1680,
        1980,
        630,
        1204,
        1770,
        2100,
        660,
        1260,
        1860,
        2220,
        720,
        1316,
        1950,
        2310,
        750,
        1372,
        2040,
        2430
      ];
      exports.getBlocksCount = function(version, errorCorrectionLevel) {
        switch (errorCorrectionLevel) {
          case ECLevel.L:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
          case ECLevel.M:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
          case ECLevel.Q:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
          case ECLevel.H:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
          default:
            return;
        }
      };
      exports.getTotalCodewordsCount = function(version, errorCorrectionLevel) {
        switch (errorCorrectionLevel) {
          case ECLevel.L:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
          case ECLevel.M:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
          case ECLevel.Q:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
          case ECLevel.H:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
          default:
            return;
        }
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/galois-field.js
  var require_galois_field = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/galois-field.js"(exports) {
      var EXP_TABLE = new Uint8Array(512), LOG_TABLE = new Uint8Array(256);
      (function() {
        let x = 1;
        for (let i = 0; i < 255; i++)
          EXP_TABLE[i] = x, LOG_TABLE[x] = i, x <<= 1, x & 256 && (x ^= 285);
        for (let i = 255; i < 512; i++)
          EXP_TABLE[i] = EXP_TABLE[i - 255];
      })();
      exports.log = function(n) {
        if (n < 1) throw new Error("log(" + n + ")");
        return LOG_TABLE[n];
      };
      exports.exp = function(n) {
        return EXP_TABLE[n];
      };
      exports.mul = function(x, y) {
        return x === 0 || y === 0 ? 0 : EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/polynomial.js
  var require_polynomial = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/polynomial.js"(exports) {
      var GF = require_galois_field();
      exports.mul = function(p1, p2) {
        let coeff = new Uint8Array(p1.length + p2.length - 1);
        for (let i = 0; i < p1.length; i++)
          for (let j = 0; j < p2.length; j++)
            coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        return coeff;
      };
      exports.mod = function(divident, divisor) {
        let result = new Uint8Array(divident);
        for (; result.length - divisor.length >= 0; ) {
          let coeff = result[0];
          for (let i = 0; i < divisor.length; i++)
            result[i] ^= GF.mul(divisor[i], coeff);
          let offset = 0;
          for (; offset < result.length && result[offset] === 0; ) offset++;
          result = result.slice(offset);
        }
        return result;
      };
      exports.generateECPolynomial = function(degree) {
        let poly = new Uint8Array([1]);
        for (let i = 0; i < degree; i++)
          poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
        return poly;
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/reed-solomon-encoder.js
  var require_reed_solomon_encoder = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module) {
      var Polynomial = require_polynomial();
      function ReedSolomonEncoder(degree) {
        this.genPoly = void 0, this.degree = degree, this.degree && this.initialize(this.degree);
      }
      ReedSolomonEncoder.prototype.initialize = function(degree) {
        this.degree = degree, this.genPoly = Polynomial.generateECPolynomial(this.degree);
      };
      ReedSolomonEncoder.prototype.encode = function(data) {
        if (!this.genPoly)
          throw new Error("Encoder not initialized");
        let paddedData = new Uint8Array(data.length + this.degree);
        paddedData.set(data);
        let remainder = Polynomial.mod(paddedData, this.genPoly), start = this.degree - remainder.length;
        if (start > 0) {
          let buff = new Uint8Array(this.degree);
          return buff.set(remainder, start), buff;
        }
        return remainder;
      };
      module.exports = ReedSolomonEncoder;
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version-check.js
  var require_version_check = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version-check.js"(exports) {
      exports.isValid = function(version) {
        return !isNaN(version) && version >= 1 && version <= 40;
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/regex.js
  var require_regex = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/regex.js"(exports) {
      var numeric = "[0-9]+", alphanumeric = "[A-Z $%*+\\-./:]+", kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
      kanji = kanji.replace(/u/g, "\\u");
      var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + `)(?:.|[\r
]))+`;
      exports.KANJI = new RegExp(kanji, "g");
      exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
      exports.BYTE = new RegExp(byte, "g");
      exports.NUMERIC = new RegExp(numeric, "g");
      exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
      var TEST_KANJI = new RegExp("^" + kanji + "$"), TEST_NUMERIC = new RegExp("^" + numeric + "$"), TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
      exports.testKanji = function(str) {
        return TEST_KANJI.test(str);
      };
      exports.testNumeric = function(str) {
        return TEST_NUMERIC.test(str);
      };
      exports.testAlphanumeric = function(str) {
        return TEST_ALPHANUMERIC.test(str);
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mode.js
  var require_mode = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mode.js"(exports) {
      var VersionCheck = require_version_check(), Regex = require_regex();
      exports.NUMERIC = {
        id: "Numeric",
        bit: 1,
        ccBits: [10, 12, 14]
      };
      exports.ALPHANUMERIC = {
        id: "Alphanumeric",
        bit: 2,
        ccBits: [9, 11, 13]
      };
      exports.BYTE = {
        id: "Byte",
        bit: 4,
        ccBits: [8, 16, 16]
      };
      exports.KANJI = {
        id: "Kanji",
        bit: 8,
        ccBits: [8, 10, 12]
      };
      exports.MIXED = {
        bit: -1
      };
      exports.getCharCountIndicator = function(mode, version) {
        if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
        if (!VersionCheck.isValid(version))
          throw new Error("Invalid version: " + version);
        return version >= 1 && version < 10 ? mode.ccBits[0] : version < 27 ? mode.ccBits[1] : mode.ccBits[2];
      };
      exports.getBestModeForData = function(dataStr) {
        return Regex.testNumeric(dataStr) ? exports.NUMERIC : Regex.testAlphanumeric(dataStr) ? exports.ALPHANUMERIC : Regex.testKanji(dataStr) ? exports.KANJI : exports.BYTE;
      };
      exports.toString = function(mode) {
        if (mode && mode.id) return mode.id;
        throw new Error("Invalid mode");
      };
      exports.isValid = function(mode) {
        return mode && mode.bit && mode.ccBits;
      };
      function fromString(string) {
        if (typeof string != "string")
          throw new Error("Param is not a string");
        switch (string.toLowerCase()) {
          case "numeric":
            return exports.NUMERIC;
          case "alphanumeric":
            return exports.ALPHANUMERIC;
          case "kanji":
            return exports.KANJI;
          case "byte":
            return exports.BYTE;
          default:
            throw new Error("Unknown mode: " + string);
        }
      }
      exports.from = function(value, defaultValue) {
        if (exports.isValid(value))
          return value;
        try {
          return fromString(value);
        } catch {
          return defaultValue;
        }
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version.js
  var require_version = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version.js"(exports) {
      var Utils = require_utils(), ECCode = require_error_correction_code(), ECLevel = require_error_correction_level(), Mode = require_mode(), VersionCheck = require_version_check(), G18 = 7973, G18_BCH = Utils.getBCHDigit(G18);
      function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
        for (let currentVersion = 1; currentVersion <= 40; currentVersion++)
          if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode))
            return currentVersion;
      }
      function getReservedBitsCount(mode, version) {
        return Mode.getCharCountIndicator(mode, version) + 4;
      }
      function getTotalBitsFromDataArray(segments, version) {
        let totalBits = 0;
        return segments.forEach(function(data) {
          let reservedBits = getReservedBitsCount(data.mode, version);
          totalBits += reservedBits + data.getBitsLength();
        }), totalBits;
      }
      function getBestVersionForMixedData(segments, errorCorrectionLevel) {
        for (let currentVersion = 1; currentVersion <= 40; currentVersion++)
          if (getTotalBitsFromDataArray(segments, currentVersion) <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED))
            return currentVersion;
      }
      exports.from = function(value, defaultValue) {
        return VersionCheck.isValid(value) ? parseInt(value, 10) : defaultValue;
      };
      exports.getCapacity = function(version, errorCorrectionLevel, mode) {
        if (!VersionCheck.isValid(version))
          throw new Error("Invalid QR Code version");
        typeof mode > "u" && (mode = Mode.BYTE);
        let totalCodewords = Utils.getSymbolTotalCodewords(version), ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel), dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
        if (mode === Mode.MIXED) return dataTotalCodewordsBits;
        let usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
        switch (mode) {
          case Mode.NUMERIC:
            return Math.floor(usableBits / 10 * 3);
          case Mode.ALPHANUMERIC:
            return Math.floor(usableBits / 11 * 2);
          case Mode.KANJI:
            return Math.floor(usableBits / 13);
          case Mode.BYTE:
          default:
            return Math.floor(usableBits / 8);
        }
      };
      exports.getBestVersionForData = function(data, errorCorrectionLevel) {
        let seg, ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
        if (Array.isArray(data)) {
          if (data.length > 1)
            return getBestVersionForMixedData(data, ecl);
          if (data.length === 0)
            return 1;
          seg = data[0];
        } else
          seg = data;
        return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
      };
      exports.getEncodedBits = function(version) {
        if (!VersionCheck.isValid(version) || version < 7)
          throw new Error("Invalid QR Code version");
        let d = version << 12;
        for (; Utils.getBCHDigit(d) - G18_BCH >= 0; )
          d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
        return version << 12 | d;
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/format-info.js
  var require_format_info = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/format-info.js"(exports) {
      var Utils = require_utils(), G15 = 1335, G15_MASK = 21522, G15_BCH = Utils.getBCHDigit(G15);
      exports.getEncodedBits = function(errorCorrectionLevel, mask) {
        let data = errorCorrectionLevel.bit << 3 | mask, d = data << 10;
        for (; Utils.getBCHDigit(d) - G15_BCH >= 0; )
          d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
        return (data << 10 | d) ^ G15_MASK;
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/numeric-data.js
  var require_numeric_data = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/numeric-data.js"(exports, module) {
      var Mode = require_mode();
      function NumericData(data) {
        this.mode = Mode.NUMERIC, this.data = data.toString();
      }
      NumericData.getBitsLength = function(length) {
        return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
      };
      NumericData.prototype.getLength = function() {
        return this.data.length;
      };
      NumericData.prototype.getBitsLength = function() {
        return NumericData.getBitsLength(this.data.length);
      };
      NumericData.prototype.write = function(bitBuffer) {
        let i, group, value;
        for (i = 0; i + 3 <= this.data.length; i += 3)
          group = this.data.substr(i, 3), value = parseInt(group, 10), bitBuffer.put(value, 10);
        let remainingNum = this.data.length - i;
        remainingNum > 0 && (group = this.data.substr(i), value = parseInt(group, 10), bitBuffer.put(value, remainingNum * 3 + 1));
      };
      module.exports = NumericData;
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alphanumeric-data.js
  var require_alphanumeric_data = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module) {
      var Mode = require_mode(), ALPHA_NUM_CHARS = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        " ",
        "$",
        "%",
        "*",
        "+",
        "-",
        ".",
        "/",
        ":"
      ];
      function AlphanumericData(data) {
        this.mode = Mode.ALPHANUMERIC, this.data = data;
      }
      AlphanumericData.getBitsLength = function(length) {
        return 11 * Math.floor(length / 2) + 6 * (length % 2);
      };
      AlphanumericData.prototype.getLength = function() {
        return this.data.length;
      };
      AlphanumericData.prototype.getBitsLength = function() {
        return AlphanumericData.getBitsLength(this.data.length);
      };
      AlphanumericData.prototype.write = function(bitBuffer) {
        let i;
        for (i = 0; i + 2 <= this.data.length; i += 2) {
          let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
          value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]), bitBuffer.put(value, 11);
        }
        this.data.length % 2 && bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      };
      module.exports = AlphanumericData;
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/byte-data.js
  var require_byte_data = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/byte-data.js"(exports, module) {
      var Mode = require_mode();
      function ByteData(data) {
        this.mode = Mode.BYTE, typeof data == "string" ? this.data = new TextEncoder().encode(data) : this.data = new Uint8Array(data);
      }
      ByteData.getBitsLength = function(length) {
        return length * 8;
      };
      ByteData.prototype.getLength = function() {
        return this.data.length;
      };
      ByteData.prototype.getBitsLength = function() {
        return ByteData.getBitsLength(this.data.length);
      };
      ByteData.prototype.write = function(bitBuffer) {
        for (let i = 0, l = this.data.length; i < l; i++)
          bitBuffer.put(this.data[i], 8);
      };
      module.exports = ByteData;
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/kanji-data.js
  var require_kanji_data = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/kanji-data.js"(exports, module) {
      var Mode = require_mode(), Utils = require_utils();
      function KanjiData(data) {
        this.mode = Mode.KANJI, this.data = data;
      }
      KanjiData.getBitsLength = function(length) {
        return length * 13;
      };
      KanjiData.prototype.getLength = function() {
        return this.data.length;
      };
      KanjiData.prototype.getBitsLength = function() {
        return KanjiData.getBitsLength(this.data.length);
      };
      KanjiData.prototype.write = function(bitBuffer) {
        let i;
        for (i = 0; i < this.data.length; i++) {
          let value = Utils.toSJIS(this.data[i]);
          if (value >= 33088 && value <= 40956)
            value -= 33088;
          else if (value >= 57408 && value <= 60351)
            value -= 49472;
          else
            throw new Error(
              "Invalid SJIS character: " + this.data[i] + `
Make sure your charset is UTF-8`
            );
          value = (value >>> 8 & 255) * 192 + (value & 255), bitBuffer.put(value, 13);
        }
      };
      module.exports = KanjiData;
    }
  });

  // ../../node_modules/.pnpm/dijkstrajs@1.0.3/node_modules/dijkstrajs/dijkstra.js
  var require_dijkstra = __commonJS({
    "../../node_modules/.pnpm/dijkstrajs@1.0.3/node_modules/dijkstrajs/dijkstra.js"(exports, module) {
      "use strict";
      var dijkstra = {
        single_source_shortest_paths: function(graph, s, d) {
          var predecessors = {}, costs = {};
          costs[s] = 0;
          var open = dijkstra.PriorityQueue.make();
          open.push(s, 0);
          for (var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit; !open.empty(); ) {
            closest = open.pop(), u = closest.value, cost_of_s_to_u = closest.cost, adjacent_nodes = graph[u] || {};
            for (v in adjacent_nodes)
              adjacent_nodes.hasOwnProperty(v) && (cost_of_e = adjacent_nodes[v], cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e, cost_of_s_to_v = costs[v], first_visit = typeof costs[v] > "u", (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) && (costs[v] = cost_of_s_to_u_plus_cost_of_e, open.push(v, cost_of_s_to_u_plus_cost_of_e), predecessors[v] = u));
          }
          if (typeof d < "u" && typeof costs[d] > "u") {
            var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
            throw new Error(msg);
          }
          return predecessors;
        },
        extract_shortest_path_from_predecessor_list: function(predecessors, d) {
          for (var nodes = [], u = d, predecessor; u; )
            nodes.push(u), predecessor = predecessors[u], u = predecessors[u];
          return nodes.reverse(), nodes;
        },
        find_path: function(graph, s, d) {
          var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
          return dijkstra.extract_shortest_path_from_predecessor_list(
            predecessors,
            d
          );
        },
        /**
         * A very naive priority queue implementation.
         */
        PriorityQueue: {
          make: function(opts) {
            var T = dijkstra.PriorityQueue, t = {}, key;
            opts = opts || {};
            for (key in T)
              T.hasOwnProperty(key) && (t[key] = T[key]);
            return t.queue = [], t.sorter = opts.sorter || T.default_sorter, t;
          },
          default_sorter: function(a, b) {
            return a.cost - b.cost;
          },
          /**
           * Add a new item to the queue and ensure the highest priority element
           * is at the front of the queue.
           */
          push: function(value, cost) {
            var item = { value, cost };
            this.queue.push(item), this.queue.sort(this.sorter);
          },
          /**
           * Return the highest priority element in the queue.
           */
          pop: function() {
            return this.queue.shift();
          },
          empty: function() {
            return this.queue.length === 0;
          }
        }
      };
      typeof module < "u" && (module.exports = dijkstra);
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/segments.js
  var require_segments = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/segments.js"(exports) {
      var Mode = require_mode(), NumericData = require_numeric_data(), AlphanumericData = require_alphanumeric_data(), ByteData = require_byte_data(), KanjiData = require_kanji_data(), Regex = require_regex(), Utils = require_utils(), dijkstra = require_dijkstra();
      function getStringByteLength(str) {
        return unescape(encodeURIComponent(str)).length;
      }
      function getSegments(regex, mode, str) {
        let segments = [], result;
        for (; (result = regex.exec(str)) !== null; )
          segments.push({
            data: result[0],
            index: result.index,
            mode,
            length: result[0].length
          });
        return segments;
      }
      function getSegmentsFromString(dataStr) {
        let numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr), alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr), byteSegs, kanjiSegs;
        return Utils.isKanjiModeEnabled() ? (byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr), kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr)) : (byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr), kanjiSegs = []), numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs).sort(function(s1, s2) {
          return s1.index - s2.index;
        }).map(function(obj) {
          return {
            data: obj.data,
            mode: obj.mode,
            length: obj.length
          };
        });
      }
      function getSegmentBitsLength(length, mode) {
        switch (mode) {
          case Mode.NUMERIC:
            return NumericData.getBitsLength(length);
          case Mode.ALPHANUMERIC:
            return AlphanumericData.getBitsLength(length);
          case Mode.KANJI:
            return KanjiData.getBitsLength(length);
          case Mode.BYTE:
            return ByteData.getBitsLength(length);
        }
      }
      function mergeSegments(segs) {
        return segs.reduce(function(acc, curr) {
          let prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
          return prevSeg && prevSeg.mode === curr.mode ? (acc[acc.length - 1].data += curr.data, acc) : (acc.push(curr), acc);
        }, []);
      }
      function buildNodes(segs) {
        let nodes = [];
        for (let i = 0; i < segs.length; i++) {
          let seg = segs[i];
          switch (seg.mode) {
            case Mode.NUMERIC:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
                { data: seg.data, mode: Mode.BYTE, length: seg.length }
              ]);
              break;
            case Mode.ALPHANUMERIC:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.BYTE, length: seg.length }
              ]);
              break;
            case Mode.KANJI:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
              ]);
              break;
            case Mode.BYTE:
              nodes.push([
                { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
              ]);
          }
        }
        return nodes;
      }
      function buildGraph(nodes, version) {
        let table = {}, graph = { start: {} }, prevNodeIds = ["start"];
        for (let i = 0; i < nodes.length; i++) {
          let nodeGroup = nodes[i], currentNodeIds = [];
          for (let j = 0; j < nodeGroup.length; j++) {
            let node = nodeGroup[j], key = "" + i + j;
            currentNodeIds.push(key), table[key] = { node, lastCount: 0 }, graph[key] = {};
            for (let n = 0; n < prevNodeIds.length; n++) {
              let prevNodeId = prevNodeIds[n];
              table[prevNodeId] && table[prevNodeId].node.mode === node.mode ? (graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode), table[prevNodeId].lastCount += node.length) : (table[prevNodeId] && (table[prevNodeId].lastCount = node.length), graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version));
            }
          }
          prevNodeIds = currentNodeIds;
        }
        for (let n = 0; n < prevNodeIds.length; n++)
          graph[prevNodeIds[n]].end = 0;
        return { map: graph, table };
      }
      function buildSingleSegment(data, modesHint) {
        let mode, bestMode = Mode.getBestModeForData(data);
        if (mode = Mode.from(modesHint, bestMode), mode !== Mode.BYTE && mode.bit < bestMode.bit)
          throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + `.
 Suggested mode is: ` + Mode.toString(bestMode));
        switch (mode === Mode.KANJI && !Utils.isKanjiModeEnabled() && (mode = Mode.BYTE), mode) {
          case Mode.NUMERIC:
            return new NumericData(data);
          case Mode.ALPHANUMERIC:
            return new AlphanumericData(data);
          case Mode.KANJI:
            return new KanjiData(data);
          case Mode.BYTE:
            return new ByteData(data);
        }
      }
      exports.fromArray = function(array) {
        return array.reduce(function(acc, seg) {
          return typeof seg == "string" ? acc.push(buildSingleSegment(seg, null)) : seg.data && acc.push(buildSingleSegment(seg.data, seg.mode)), acc;
        }, []);
      };
      exports.fromString = function(data, version) {
        let segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled()), nodes = buildNodes(segs), graph = buildGraph(nodes, version), path = dijkstra.find_path(graph.map, "start", "end"), optimizedSegs = [];
        for (let i = 1; i < path.length - 1; i++)
          optimizedSegs.push(graph.table[path[i]].node);
        return exports.fromArray(mergeSegments(optimizedSegs));
      };
      exports.rawSplit = function(data) {
        return exports.fromArray(
          getSegmentsFromString(data, Utils.isKanjiModeEnabled())
        );
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/qrcode.js
  var require_qrcode = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/qrcode.js"(exports) {
      var Utils = require_utils(), ECLevel = require_error_correction_level(), BitBuffer = require_bit_buffer(), BitMatrix = require_bit_matrix(), AlignmentPattern = require_alignment_pattern(), FinderPattern = require_finder_pattern(), MaskPattern = require_mask_pattern(), ECCode = require_error_correction_code(), ReedSolomonEncoder = require_reed_solomon_encoder(), Version = require_version(), FormatInfo = require_format_info(), Mode = require_mode(), Segments = require_segments();
      function setupFinderPattern(matrix, version) {
        let size = matrix.size, pos = FinderPattern.getPositions(version);
        for (let i = 0; i < pos.length; i++) {
          let row = pos[i][0], col = pos[i][1];
          for (let r = -1; r <= 7; r++)
            if (!(row + r <= -1 || size <= row + r))
              for (let c = -1; c <= 7; c++)
                col + c <= -1 || size <= col + c || (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4 ? matrix.set(row + r, col + c, !0, !0) : matrix.set(row + r, col + c, !1, !0));
        }
      }
      function setupTimingPattern(matrix) {
        let size = matrix.size;
        for (let r = 8; r < size - 8; r++) {
          let value = r % 2 === 0;
          matrix.set(r, 6, value, !0), matrix.set(6, r, value, !0);
        }
      }
      function setupAlignmentPattern(matrix, version) {
        let pos = AlignmentPattern.getPositions(version);
        for (let i = 0; i < pos.length; i++) {
          let row = pos[i][0], col = pos[i][1];
          for (let r = -2; r <= 2; r++)
            for (let c = -2; c <= 2; c++)
              r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0 ? matrix.set(row + r, col + c, !0, !0) : matrix.set(row + r, col + c, !1, !0);
        }
      }
      function setupVersionInfo(matrix, version) {
        let size = matrix.size, bits = Version.getEncodedBits(version), row, col, mod;
        for (let i = 0; i < 18; i++)
          row = Math.floor(i / 3), col = i % 3 + size - 8 - 3, mod = (bits >> i & 1) === 1, matrix.set(row, col, mod, !0), matrix.set(col, row, mod, !0);
      }
      function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
        let size = matrix.size, bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern), i, mod;
        for (i = 0; i < 15; i++)
          mod = (bits >> i & 1) === 1, i < 6 ? matrix.set(i, 8, mod, !0) : i < 8 ? matrix.set(i + 1, 8, mod, !0) : matrix.set(size - 15 + i, 8, mod, !0), i < 8 ? matrix.set(8, size - i - 1, mod, !0) : i < 9 ? matrix.set(8, 15 - i - 1 + 1, mod, !0) : matrix.set(8, 15 - i - 1, mod, !0);
        matrix.set(size - 8, 8, 1, !0);
      }
      function setupData(matrix, data) {
        let size = matrix.size, inc = -1, row = size - 1, bitIndex = 7, byteIndex = 0;
        for (let col = size - 1; col > 0; col -= 2)
          for (col === 6 && col--; ; ) {
            for (let c = 0; c < 2; c++)
              if (!matrix.isReserved(row, col - c)) {
                let dark = !1;
                byteIndex < data.length && (dark = (data[byteIndex] >>> bitIndex & 1) === 1), matrix.set(row, col - c, dark), bitIndex--, bitIndex === -1 && (byteIndex++, bitIndex = 7);
              }
            if (row += inc, row < 0 || size <= row) {
              row -= inc, inc = -inc;
              break;
            }
          }
      }
      function createData(version, errorCorrectionLevel, segments) {
        let buffer = new BitBuffer();
        segments.forEach(function(data) {
          buffer.put(data.mode.bit, 4), buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version)), data.write(buffer);
        });
        let totalCodewords = Utils.getSymbolTotalCodewords(version), ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel), dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
        for (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits && buffer.put(0, 4); buffer.getLengthInBits() % 8 !== 0; )
          buffer.putBit(0);
        let remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
        for (let i = 0; i < remainingByte; i++)
          buffer.put(i % 2 ? 17 : 236, 8);
        return createCodewords(buffer, version, errorCorrectionLevel);
      }
      function createCodewords(bitBuffer, version, errorCorrectionLevel) {
        let totalCodewords = Utils.getSymbolTotalCodewords(version), ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel), dataTotalCodewords = totalCodewords - ecTotalCodewords, ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel), blocksInGroup2 = totalCodewords % ecTotalBlocks, blocksInGroup1 = ecTotalBlocks - blocksInGroup2, totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks), dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks), dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1, ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1, rs = new ReedSolomonEncoder(ecCount), offset = 0, dcData = new Array(ecTotalBlocks), ecData = new Array(ecTotalBlocks), maxDataSize = 0, buffer = new Uint8Array(bitBuffer.buffer);
        for (let b = 0; b < ecTotalBlocks; b++) {
          let dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
          dcData[b] = buffer.slice(offset, offset + dataSize), ecData[b] = rs.encode(dcData[b]), offset += dataSize, maxDataSize = Math.max(maxDataSize, dataSize);
        }
        let data = new Uint8Array(totalCodewords), index = 0, i, r;
        for (i = 0; i < maxDataSize; i++)
          for (r = 0; r < ecTotalBlocks; r++)
            i < dcData[r].length && (data[index++] = dcData[r][i]);
        for (i = 0; i < ecCount; i++)
          for (r = 0; r < ecTotalBlocks; r++)
            data[index++] = ecData[r][i];
        return data;
      }
      function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
        let segments;
        if (Array.isArray(data))
          segments = Segments.fromArray(data);
        else if (typeof data == "string") {
          let estimatedVersion = version;
          if (!estimatedVersion) {
            let rawSegments = Segments.rawSplit(data);
            estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
          }
          segments = Segments.fromString(data, estimatedVersion || 40);
        } else
          throw new Error("Invalid data");
        let bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
        if (!bestVersion)
          throw new Error("The amount of data is too big to be stored in a QR Code");
        if (!version)
          version = bestVersion;
        else if (version < bestVersion)
          throw new Error(
            `
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: ` + bestVersion + `.
`
          );
        let dataBits = createData(version, errorCorrectionLevel, segments), moduleCount = Utils.getSymbolSize(version), modules = new BitMatrix(moduleCount);
        return setupFinderPattern(modules, version), setupTimingPattern(modules), setupAlignmentPattern(modules, version), setupFormatInfo(modules, errorCorrectionLevel, 0), version >= 7 && setupVersionInfo(modules, version), setupData(modules, dataBits), isNaN(maskPattern) && (maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        )), MaskPattern.applyMask(maskPattern, modules), setupFormatInfo(modules, errorCorrectionLevel, maskPattern), {
          modules,
          version,
          errorCorrectionLevel,
          maskPattern,
          segments
        };
      }
      exports.create = function(data, options) {
        if (typeof data > "u" || data === "")
          throw new Error("No input text");
        let errorCorrectionLevel = ECLevel.M, version, mask;
        return typeof options < "u" && (errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M), version = Version.from(options.version), mask = MaskPattern.from(options.maskPattern), options.toSJISFunc && Utils.setToSJISFunction(options.toSJISFunc)), createSymbol(data, version, errorCorrectionLevel, mask);
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/utils.js
  var require_utils2 = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/utils.js"(exports) {
      function hex2rgba(hex) {
        if (typeof hex == "number" && (hex = hex.toString()), typeof hex != "string")
          throw new Error("Color should be defined as hex string");
        let hexCode = hex.slice().replace("#", "").split("");
        if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8)
          throw new Error("Invalid hex color: " + hex);
        (hexCode.length === 3 || hexCode.length === 4) && (hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }))), hexCode.length === 6 && hexCode.push("F", "F");
        let hexValue = parseInt(hexCode.join(""), 16);
        return {
          r: hexValue >> 24 & 255,
          g: hexValue >> 16 & 255,
          b: hexValue >> 8 & 255,
          a: hexValue & 255,
          hex: "#" + hexCode.slice(0, 6).join("")
        };
      }
      exports.getOptions = function(options) {
        options || (options = {}), options.color || (options.color = {});
        let margin = typeof options.margin > "u" || options.margin === null || options.margin < 0 ? 4 : options.margin, width = options.width && options.width >= 21 ? options.width : void 0, scale = options.scale || 4;
        return {
          width,
          scale: width ? 4 : scale,
          margin,
          color: {
            dark: hex2rgba(options.color.dark || "#000000ff"),
            light: hex2rgba(options.color.light || "#ffffffff")
          },
          type: options.type,
          rendererOpts: options.rendererOpts || {}
        };
      };
      exports.getScale = function(qrSize, opts) {
        return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
      };
      exports.getImageWidth = function(qrSize, opts) {
        let scale = exports.getScale(qrSize, opts);
        return Math.floor((qrSize + opts.margin * 2) * scale);
      };
      exports.qrToImageData = function(imgData, qr, opts) {
        let size = qr.modules.size, data = qr.modules.data, scale = exports.getScale(size, opts), symbolSize = Math.floor((size + opts.margin * 2) * scale), scaledMargin = opts.margin * scale, palette = [opts.color.light, opts.color.dark];
        for (let i = 0; i < symbolSize; i++)
          for (let j = 0; j < symbolSize; j++) {
            let posDst = (i * symbolSize + j) * 4, pxColor = opts.color.light;
            if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
              let iSrc = Math.floor((i - scaledMargin) / scale), jSrc = Math.floor((j - scaledMargin) / scale);
              pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
            }
            imgData[posDst++] = pxColor.r, imgData[posDst++] = pxColor.g, imgData[posDst++] = pxColor.b, imgData[posDst] = pxColor.a;
          }
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/canvas.js
  var require_canvas = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/canvas.js"(exports) {
      var Utils = require_utils2();
      function clearCanvas(ctx, canvas, size) {
        ctx.clearRect(0, 0, canvas.width, canvas.height), canvas.style || (canvas.style = {}), canvas.height = size, canvas.width = size, canvas.style.height = size + "px", canvas.style.width = size + "px";
      }
      function getCanvasElement() {
        try {
          return document.createElement("canvas");
        } catch {
          throw new Error("You need to specify a canvas element");
        }
      }
      exports.render = function(qrData, canvas, options) {
        let opts = options, canvasEl = canvas;
        typeof opts > "u" && (!canvas || !canvas.getContext) && (opts = canvas, canvas = void 0), canvas || (canvasEl = getCanvasElement()), opts = Utils.getOptions(opts);
        let size = Utils.getImageWidth(qrData.modules.size, opts), ctx = canvasEl.getContext("2d"), image = ctx.createImageData(size, size);
        return Utils.qrToImageData(image.data, qrData, opts), clearCanvas(ctx, canvasEl, size), ctx.putImageData(image, 0, 0), canvasEl;
      };
      exports.renderToDataURL = function(qrData, canvas, options) {
        let opts = options;
        typeof opts > "u" && (!canvas || !canvas.getContext) && (opts = canvas, canvas = void 0), opts || (opts = {});
        let canvasEl = exports.render(qrData, canvas, opts), type = opts.type || "image/png", rendererOpts = opts.rendererOpts || {};
        return canvasEl.toDataURL(type, rendererOpts.quality);
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/svg-tag.js
  var require_svg_tag = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
      var Utils = require_utils2();
      function getColorAttrib(color, attrib) {
        let alpha = color.a / 255, str = attrib + '="' + color.hex + '"';
        return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
      }
      function svgCmd(cmd, x, y) {
        let str = cmd + x;
        return typeof y < "u" && (str += " " + y), str;
      }
      function qrToPath(data, size, margin) {
        let path = "", moveBy = 0, newRow = !1, lineLength = 0;
        for (let i = 0; i < data.length; i++) {
          let col = Math.floor(i % size), row = Math.floor(i / size);
          !col && !newRow && (newRow = !0), data[i] ? (lineLength++, i > 0 && col > 0 && data[i - 1] || (path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0), moveBy = 0, newRow = !1), col + 1 < size && data[i + 1] || (path += svgCmd("h", lineLength), lineLength = 0)) : moveBy++;
        }
        return path;
      }
      exports.render = function(qrData, options, cb) {
        let opts = Utils.getOptions(options), size = qrData.modules.size, data = qrData.modules.data, qrcodesize = size + opts.margin * 2, bg = opts.color.light.a ? "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>' : "", path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>', viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"', svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + (opts.width ? 'width="' + opts.width + '" height="' + opts.width + '" ' : "") + viewBox + ' shape-rendering="crispEdges">' + bg + path + `</svg>
`;
        return typeof cb == "function" && cb(null, svgTag), svgTag;
      };
    }
  });

  // ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/browser.js
  var require_browser = __commonJS({
    "../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/browser.js"(exports) {
      var canPromise = require_can_promise(), QRCode2 = require_qrcode(), CanvasRenderer = require_canvas(), SvgRenderer = require_svg_tag();
      function renderCanvas(renderFunc, canvas, text, opts, cb) {
        let args = [].slice.call(arguments, 1), argsNum = args.length, isLastArgCb = typeof args[argsNum - 1] == "function";
        if (!isLastArgCb && !canPromise())
          throw new Error("Callback required as last argument");
        if (isLastArgCb) {
          if (argsNum < 2)
            throw new Error("Too few arguments provided");
          argsNum === 2 ? (cb = text, text = canvas, canvas = opts = void 0) : argsNum === 3 && (canvas.getContext && typeof cb > "u" ? (cb = opts, opts = void 0) : (cb = opts, opts = text, text = canvas, canvas = void 0));
        } else {
          if (argsNum < 1)
            throw new Error("Too few arguments provided");
          return argsNum === 1 ? (text = canvas, canvas = opts = void 0) : argsNum === 2 && !canvas.getContext && (opts = text, text = canvas, canvas = void 0), new Promise(function(resolve, reject) {
            try {
              let data = QRCode2.create(text, opts);
              resolve(renderFunc(data, canvas, opts));
            } catch (e) {
              reject(e);
            }
          });
        }
        try {
          let data = QRCode2.create(text, opts);
          cb(null, renderFunc(data, canvas, opts));
        } catch (e) {
          cb(e);
        }
      }
      exports.create = QRCode2.create;
      exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
      exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
      exports.toString = renderCanvas.bind(null, function(data, _, opts) {
        return SvgRenderer.render(data, opts);
      });
    }
  });

  // src/client.ts
  var import_qrcode = __toESM(require_browser(), 1);

  // ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
  var external_exports = {};
  __export(external_exports, {
    BRAND: () => BRAND,
    DIRTY: () => DIRTY,
    EMPTY_PATH: () => EMPTY_PATH,
    INVALID: () => INVALID,
    NEVER: () => NEVER,
    OK: () => OK,
    ParseStatus: () => ParseStatus,
    Schema: () => ZodType,
    ZodAny: () => ZodAny,
    ZodArray: () => ZodArray,
    ZodBigInt: () => ZodBigInt,
    ZodBoolean: () => ZodBoolean,
    ZodBranded: () => ZodBranded,
    ZodCatch: () => ZodCatch,
    ZodDate: () => ZodDate,
    ZodDefault: () => ZodDefault,
    ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
    ZodEffects: () => ZodEffects,
    ZodEnum: () => ZodEnum,
    ZodError: () => ZodError,
    ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
    ZodFunction: () => ZodFunction,
    ZodIntersection: () => ZodIntersection,
    ZodIssueCode: () => ZodIssueCode,
    ZodLazy: () => ZodLazy,
    ZodLiteral: () => ZodLiteral,
    ZodMap: () => ZodMap,
    ZodNaN: () => ZodNaN,
    ZodNativeEnum: () => ZodNativeEnum,
    ZodNever: () => ZodNever,
    ZodNull: () => ZodNull,
    ZodNullable: () => ZodNullable,
    ZodNumber: () => ZodNumber,
    ZodObject: () => ZodObject,
    ZodOptional: () => ZodOptional,
    ZodParsedType: () => ZodParsedType,
    ZodPipeline: () => ZodPipeline,
    ZodPromise: () => ZodPromise,
    ZodReadonly: () => ZodReadonly,
    ZodRecord: () => ZodRecord,
    ZodSchema: () => ZodType,
    ZodSet: () => ZodSet,
    ZodString: () => ZodString,
    ZodSymbol: () => ZodSymbol,
    ZodTransformer: () => ZodEffects,
    ZodTuple: () => ZodTuple,
    ZodType: () => ZodType,
    ZodUndefined: () => ZodUndefined,
    ZodUnion: () => ZodUnion,
    ZodUnknown: () => ZodUnknown,
    ZodVoid: () => ZodVoid,
    addIssueToContext: () => addIssueToContext,
    any: () => anyType,
    array: () => arrayType,
    bigint: () => bigIntType,
    boolean: () => booleanType,
    coerce: () => coerce,
    custom: () => custom,
    date: () => dateType,
    datetimeRegex: () => datetimeRegex,
    defaultErrorMap: () => en_default,
    discriminatedUnion: () => discriminatedUnionType,
    effect: () => effectsType,
    enum: () => enumType,
    function: () => functionType,
    getErrorMap: () => getErrorMap,
    getParsedType: () => getParsedType,
    instanceof: () => instanceOfType,
    intersection: () => intersectionType,
    isAborted: () => isAborted,
    isAsync: () => isAsync,
    isDirty: () => isDirty,
    isValid: () => isValid,
    late: () => late,
    lazy: () => lazyType,
    literal: () => literalType,
    makeIssue: () => makeIssue,
    map: () => mapType,
    nan: () => nanType,
    nativeEnum: () => nativeEnumType,
    never: () => neverType,
    null: () => nullType,
    nullable: () => nullableType,
    number: () => numberType,
    object: () => objectType,
    objectUtil: () => objectUtil,
    oboolean: () => oboolean,
    onumber: () => onumber,
    optional: () => optionalType,
    ostring: () => ostring,
    pipeline: () => pipelineType,
    preprocess: () => preprocessType,
    promise: () => promiseType,
    quotelessJson: () => quotelessJson,
    record: () => recordType,
    set: () => setType,
    setErrorMap: () => setErrorMap,
    strictObject: () => strictObjectType,
    string: () => stringType,
    symbol: () => symbolType,
    transformer: () => effectsType,
    tuple: () => tupleType,
    undefined: () => undefinedType,
    union: () => unionType,
    unknown: () => unknownType,
    util: () => util,
    void: () => voidType
  });

  // ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
  var util;
  (function(util2) {
    util2.assertEqual = (_) => {
    };
    function assertIs(_arg) {
    }
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error();
    }
    util2.assertNever = assertNever, util2.arrayToEnum = (items) => {
      let obj = {};
      for (let item of items)
        obj[item] = item;
      return obj;
    }, util2.getValidEnumValues = (obj) => {
      let validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] != "number"), filtered = {};
      for (let k of validKeys)
        filtered[k] = obj[k];
      return util2.objectValues(filtered);
    }, util2.objectValues = (obj) => util2.objectKeys(obj).map(function(e) {
      return obj[e];
    }), util2.objectKeys = typeof Object.keys == "function" ? (obj) => Object.keys(obj) : (object) => {
      let keys = [];
      for (let key in object)
        Object.prototype.hasOwnProperty.call(object, key) && keys.push(key);
      return keys;
    }, util2.find = (arr, checker) => {
      for (let item of arr)
        if (checker(item))
          return item;
    }, util2.isInteger = typeof Number.isInteger == "function" ? (val) => Number.isInteger(val) : (val) => typeof val == "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
      return array.map((val) => typeof val == "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues, util2.jsonStringifyReplacer = (_, value) => typeof value == "bigint" ? value.toString() : value;
  })(util || (util = {}));
  var objectUtil;
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => ({
      ...first,
      ...second
      // second overwrites first
    });
  })(objectUtil || (objectUtil = {}));
  var ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]), getParsedType = (data) => {
    switch (typeof data) {
      case "undefined":
        return ZodParsedType.undefined;
      case "string":
        return ZodParsedType.string;
      case "number":
        return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
      case "boolean":
        return ZodParsedType.boolean;
      case "function":
        return ZodParsedType.function;
      case "bigint":
        return ZodParsedType.bigint;
      case "symbol":
        return ZodParsedType.symbol;
      case "object":
        return Array.isArray(data) ? ZodParsedType.array : data === null ? ZodParsedType.null : data.then && typeof data.then == "function" && data.catch && typeof data.catch == "function" ? ZodParsedType.promise : typeof Map < "u" && data instanceof Map ? ZodParsedType.map : typeof Set < "u" && data instanceof Set ? ZodParsedType.set : typeof Date < "u" && data instanceof Date ? ZodParsedType.date : ZodParsedType.object;
      default:
        return ZodParsedType.unknown;
    }
  };

  // ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
  var ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]), quotelessJson = (obj) => JSON.stringify(obj, null, 2).replace(/"([^"]+)":/g, "$1:"), ZodError = class _ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super(), this.issues = [], this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      }, this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      let actualProto = new.target.prototype;
      Object.setPrototypeOf ? Object.setPrototypeOf(this, actualProto) : this.__proto__ = actualProto, this.name = "ZodError", this.issues = issues;
    }
    format(_mapper) {
      let mapper = _mapper || function(issue) {
        return issue.message;
      }, fieldErrors = { _errors: [] }, processError = (error) => {
        for (let issue of error.issues)
          if (issue.code === "invalid_union")
            issue.unionErrors.map(processError);
          else if (issue.code === "invalid_return_type")
            processError(issue.returnTypeError);
          else if (issue.code === "invalid_arguments")
            processError(issue.argumentsError);
          else if (issue.path.length === 0)
            fieldErrors._errors.push(mapper(issue));
          else {
            let curr = fieldErrors, i = 0;
            for (; i < issue.path.length; ) {
              let el = issue.path[i];
              i === issue.path.length - 1 ? (curr[el] = curr[el] || { _errors: [] }, curr[el]._errors.push(mapper(issue))) : curr[el] = curr[el] || { _errors: [] }, curr = curr[el], i++;
            }
          }
      };
      return processError(this), fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof _ZodError))
        throw new Error(`Not a ZodError: ${value}`);
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
      let fieldErrors = {}, formErrors = [];
      for (let sub of this.issues)
        if (sub.path.length > 0) {
          let firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [], fieldErrors[firstEl].push(mapper(sub));
        } else
          formErrors.push(mapper(sub));
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ZodError.create = (issues) => new ZodError(issues);

  // ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
  var errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        issue.received === ZodParsedType.undefined ? message = "Required" : message = `Expected ${issue.expected}, received ${issue.received}`;
        break;
      case ZodIssueCode.invalid_literal:
        message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
        break;
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
        break;
      case ZodIssueCode.invalid_union:
        message = "Invalid input";
        break;
      case ZodIssueCode.invalid_union_discriminator:
        message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
        break;
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
        break;
      case ZodIssueCode.invalid_arguments:
        message = "Invalid function arguments";
        break;
      case ZodIssueCode.invalid_return_type:
        message = "Invalid function return type";
        break;
      case ZodIssueCode.invalid_date:
        message = "Invalid date";
        break;
      case ZodIssueCode.invalid_string:
        typeof issue.validation == "object" ? "includes" in issue.validation ? (message = `Invalid input: must include "${issue.validation.includes}"`, typeof issue.validation.position == "number" && (message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`)) : "startsWith" in issue.validation ? message = `Invalid input: must start with "${issue.validation.startsWith}"` : "endsWith" in issue.validation ? message = `Invalid input: must end with "${issue.validation.endsWith}"` : util.assertNever(issue.validation) : issue.validation !== "regex" ? message = `Invalid ${issue.validation}` : message = "Invalid";
        break;
      case ZodIssueCode.too_small:
        issue.type === "array" ? message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? "at least" : "more than"} ${issue.minimum} element(s)` : issue.type === "string" ? message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? "at least" : "over"} ${issue.minimum} character(s)` : issue.type === "number" ? message = `Number must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${issue.minimum}` : issue.type === "bigint" ? message = `Number must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${issue.minimum}` : issue.type === "date" ? message = `Date must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(issue.minimum))}` : message = "Invalid input";
        break;
      case ZodIssueCode.too_big:
        issue.type === "array" ? message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? "at most" : "less than"} ${issue.maximum} element(s)` : issue.type === "string" ? message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? "at most" : "under"} ${issue.maximum} character(s)` : issue.type === "number" ? message = `Number must be ${issue.exact ? "exactly" : issue.inclusive ? "less than or equal to" : "less than"} ${issue.maximum}` : issue.type === "bigint" ? message = `BigInt must be ${issue.exact ? "exactly" : issue.inclusive ? "less than or equal to" : "less than"} ${issue.maximum}` : issue.type === "date" ? message = `Date must be ${issue.exact ? "exactly" : issue.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(issue.maximum))}` : message = "Invalid input";
        break;
      case ZodIssueCode.custom:
        message = "Invalid input";
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = "Intersection results could not be merged";
        break;
      case ZodIssueCode.not_multiple_of:
        message = `Number must be a multiple of ${issue.multipleOf}`;
        break;
      case ZodIssueCode.not_finite:
        message = "Number must be finite";
        break;
      default:
        message = _ctx.defaultError, util.assertNever(issue);
    }
    return { message };
  }, en_default = errorMap;

  // ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
  var overrideErrorMap = en_default;
  function setErrorMap(map) {
    overrideErrorMap = map;
  }
  function getErrorMap() {
    return overrideErrorMap;
  }

  // ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
  var makeIssue = (params) => {
    let { data, path, errorMaps, issueData } = params, fullPath = [...path, ...issueData.path || []], fullIssue = {
      ...issueData,
      path: fullPath
    };
    if (issueData.message !== void 0)
      return {
        ...issueData,
        path: fullPath,
        message: issueData.message
      };
    let errorMessage = "", maps = errorMaps.filter((m) => !!m).slice().reverse();
    for (let map of maps)
      errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    return {
      ...issueData,
      path: fullPath,
      message: errorMessage
    };
  }, EMPTY_PATH = [];
  function addIssueToContext(ctx, issueData) {
    let overrideMap = getErrorMap(), issue = makeIssue({
      issueData,
      data: ctx.data,
      path: ctx.path,
      errorMaps: [
        ctx.common.contextualErrorMap,
        // contextual error map is first priority
        ctx.schemaErrorMap,
        // then schema-bound map if available
        overrideMap,
        // then global override map
        overrideMap === en_default ? void 0 : en_default
        // then global default map
      ].filter((x) => !!x)
    });
    ctx.common.issues.push(issue);
  }
  var ParseStatus = class _ParseStatus {
    constructor() {
      this.value = "valid";
    }
    dirty() {
      this.value === "valid" && (this.value = "dirty");
    }
    abort() {
      this.value !== "aborted" && (this.value = "aborted");
    }
    static mergeArray(status, results) {
      let arrayValue = [];
      for (let s of results) {
        if (s.status === "aborted")
          return INVALID;
        s.status === "dirty" && status.dirty(), arrayValue.push(s.value);
      }
      return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
      let syncPairs = [];
      for (let pair of pairs) {
        let key = await pair.key, value = await pair.value;
        syncPairs.push({
          key,
          value
        });
      }
      return _ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
      let finalObject = {};
      for (let pair of pairs) {
        let { key, value } = pair;
        if (key.status === "aborted" || value.status === "aborted")
          return INVALID;
        key.status === "dirty" && status.dirty(), value.status === "dirty" && status.dirty(), key.value !== "__proto__" && (typeof value.value < "u" || pair.alwaysSet) && (finalObject[key.value] = value.value);
      }
      return { status: status.value, value: finalObject };
    }
  }, INVALID = Object.freeze({
    status: "aborted"
  }), DIRTY = (value) => ({ status: "dirty", value }), OK = (value) => ({ status: "valid", value }), isAborted = (x) => x.status === "aborted", isDirty = (x) => x.status === "dirty", isValid = (x) => x.status === "valid", isAsync = (x) => typeof Promise < "u" && x instanceof Promise;

  // ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
  var errorUtil;
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message == "string" ? { message } : message || {}, errorUtil2.toString = (message) => typeof message == "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));

  // ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
  var ParseInputLazyPath = class {
    constructor(parent, value, path, key) {
      this._cachedPath = [], this.parent = parent, this.data = value, this._path = path, this._key = key;
    }
    get path() {
      return this._cachedPath.length || (Array.isArray(this._key) ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
    }
  }, handleResult = (ctx, result) => {
    if (isValid(result))
      return { success: !0, data: result.value };
    if (!ctx.common.issues.length)
      throw new Error("Validation failed but no issues detected.");
    return {
      success: !1,
      get error() {
        if (this._error)
          return this._error;
        let error = new ZodError(ctx.common.issues);
        return this._error = error, this._error;
      }
    };
  };
  function processCreateParams(params) {
    if (!params)
      return {};
    let { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
    if (errorMap2 && (invalid_type_error || required_error))
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    return errorMap2 ? { errorMap: errorMap2, description } : { errorMap: (iss, ctx) => {
      let { message } = params;
      return iss.code === "invalid_enum_value" ? { message: message ?? ctx.defaultError } : typeof ctx.data > "u" ? { message: message ?? required_error ?? ctx.defaultError } : iss.code !== "invalid_type" ? { message: ctx.defaultError } : { message: message ?? invalid_type_error ?? ctx.defaultError };
    }, description };
  }
  var ZodType = class {
    get description() {
      return this._def.description;
    }
    _getType(input) {
      return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
      return ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      };
    }
    _processInputParams(input) {
      return {
        status: new ParseStatus(),
        ctx: {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        }
      };
    }
    _parseSync(input) {
      let result = this._parse(input);
      if (isAsync(result))
        throw new Error("Synchronous parse encountered promise.");
      return result;
    }
    _parseAsync(input) {
      let result = this._parse(input);
      return Promise.resolve(result);
    }
    parse(data, params) {
      let result = this.safeParse(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    safeParse(data, params) {
      let ctx = {
        common: {
          issues: [],
          async: params?.async ?? !1,
          contextualErrorMap: params?.errorMap
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      }, result = this._parseSync({ data, path: ctx.path, parent: ctx });
      return handleResult(ctx, result);
    }
    "~validate"(data) {
      let ctx = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      if (!this["~standard"].async)
        try {
          let result = this._parseSync({ data, path: [], parent: ctx });
          return isValid(result) ? {
            value: result.value
          } : {
            issues: ctx.common.issues
          };
        } catch (err) {
          err?.message?.toLowerCase()?.includes("encountered") && (this["~standard"].async = !0), ctx.common = {
            issues: [],
            async: !0
          };
        }
      return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
        value: result.value
      } : {
        issues: ctx.common.issues
      });
    }
    async parseAsync(data, params) {
      let result = await this.safeParseAsync(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    async safeParseAsync(data, params) {
      let ctx = {
        common: {
          issues: [],
          contextualErrorMap: params?.errorMap,
          async: !0
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      }, maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx }), result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
      return handleResult(ctx, result);
    }
    refine(check, message) {
      let getIssueProperties = (val) => typeof message == "string" || typeof message > "u" ? { message } : typeof message == "function" ? message(val) : message;
      return this._refinement((val, ctx) => {
        let result = check(val), setError = () => ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val)
        });
        return typeof Promise < "u" && result instanceof Promise ? result.then((data) => data ? !0 : (setError(), !1)) : result ? !0 : (setError(), !1);
      });
    }
    refinement(check, refinementData) {
      return this._refinement((val, ctx) => check(val) ? !0 : (ctx.addIssue(typeof refinementData == "function" ? refinementData(val, ctx) : refinementData), !1));
    }
    _refinement(refinement) {
      return new ZodEffects({
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "refinement", refinement }
      });
    }
    superRefine(refinement) {
      return this._refinement(refinement);
    }
    constructor(def) {
      this.spa = this.safeParseAsync, this._def = def, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: (data) => this["~validate"](data)
      };
    }
    optional() {
      return ZodOptional.create(this, this._def);
    }
    nullable() {
      return ZodNullable.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return ZodArray.create(this);
    }
    promise() {
      return ZodPromise.create(this, this._def);
    }
    or(option) {
      return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
      return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
      return new ZodEffects({
        ...processCreateParams(this._def),
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "transform", transform }
      });
    }
    default(def) {
      let defaultValueFunc = typeof def == "function" ? def : () => def;
      return new ZodDefault({
        ...processCreateParams(this._def),
        innerType: this,
        defaultValue: defaultValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodDefault
      });
    }
    brand() {
      return new ZodBranded({
        typeName: ZodFirstPartyTypeKind.ZodBranded,
        type: this,
        ...processCreateParams(this._def)
      });
    }
    catch(def) {
      let catchValueFunc = typeof def == "function" ? def : () => def;
      return new ZodCatch({
        ...processCreateParams(this._def),
        innerType: this,
        catchValue: catchValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodCatch
      });
    }
    describe(description) {
      let This = this.constructor;
      return new This({
        ...this._def,
        description
      });
    }
    pipe(target) {
      return ZodPipeline.create(this, target);
    }
    readonly() {
      return ZodReadonly.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  }, cuidRegex = /^c[^\s-]{8,}$/i, cuid2Regex = /^[0-9a-z]+$/, ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i, uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, nanoidRegex = /^[a-z0-9_-]{21}$/i, jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, _emojiRegex = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", emojiRegex, ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/, ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/, ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/, dateRegexSource = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", dateRegex = new RegExp(`^${dateRegexSource}$`);
  function timeRegexSource(args) {
    let secondsRegexSource = "[0-5]\\d";
    args.precision ? secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}` : args.precision == null && (secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`);
    let secondsQuantifier = args.precision ? "+" : "?";
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
  }
  function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
  }
  function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`, opts = [];
    return opts.push(args.local ? "Z?" : "Z"), args.offset && opts.push("([+-]\\d{2}:?\\d{2})"), regex = `${regex}(${opts.join("|")})`, new RegExp(`^${regex}$`);
  }
  function isValidIP(ip, version) {
    return !!((version === "v4" || !version) && ipv4Regex.test(ip) || (version === "v6" || !version) && ipv6Regex.test(ip));
  }
  function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
      return !1;
    try {
      let [header] = jwt.split(".");
      if (!header)
        return !1;
      let base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "="), decoded = JSON.parse(atob(base64));
      return !(typeof decoded != "object" || decoded === null || "typ" in decoded && decoded?.typ !== "JWT" || !decoded.alg || alg && decoded.alg !== alg);
    } catch {
      return !1;
    }
  }
  function isValidCidr(ip, version) {
    return !!((version === "v4" || !version) && ipv4CidrRegex.test(ip) || (version === "v6" || !version) && ipv6CidrRegex.test(ip));
  }
  var ZodString = class _ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce && (input.data = String(input.data)), this._getType(input) !== ZodParsedType.string) {
        let ctx2 = this._getOrReturnCtx(input);
        return addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        }), INVALID;
      }
      let status = new ParseStatus(), ctx;
      for (let check of this._def.checks)
        if (check.kind === "min")
          input.data.length < check.value && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: !0,
            exact: !1,
            message: check.message
          }), status.dirty());
        else if (check.kind === "max")
          input.data.length > check.value && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: !0,
            exact: !1,
            message: check.message
          }), status.dirty());
        else if (check.kind === "length") {
          let tooBig = input.data.length > check.value, tooSmall = input.data.length < check.value;
          (tooBig || tooSmall) && (ctx = this._getOrReturnCtx(input, ctx), tooBig ? addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: !0,
            exact: !0,
            message: check.message
          }) : tooSmall && addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: !0,
            exact: !0,
            message: check.message
          }), status.dirty());
        } else if (check.kind === "email")
          emailRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          }), status.dirty());
        else if (check.kind === "emoji")
          emojiRegex || (emojiRegex = new RegExp(_emojiRegex, "u")), emojiRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          }), status.dirty());
        else if (check.kind === "uuid")
          uuidRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          }), status.dirty());
        else if (check.kind === "nanoid")
          nanoidRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          }), status.dirty());
        else if (check.kind === "cuid")
          cuidRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          }), status.dirty());
        else if (check.kind === "cuid2")
          cuid2Regex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          }), status.dirty());
        else if (check.kind === "ulid")
          ulidRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          }), status.dirty());
        else if (check.kind === "url")
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            }), status.dirty();
          }
        else check.kind === "regex" ? (check.regex.lastIndex = 0, check.regex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "regex",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty())) : check.kind === "trim" ? input.data = input.data.trim() : check.kind === "includes" ? input.data.includes(check.value, check.position) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: { includes: check.value, position: check.position },
          message: check.message
        }), status.dirty()) : check.kind === "toLowerCase" ? input.data = input.data.toLowerCase() : check.kind === "toUpperCase" ? input.data = input.data.toUpperCase() : check.kind === "startsWith" ? input.data.startsWith(check.value) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: { startsWith: check.value },
          message: check.message
        }), status.dirty()) : check.kind === "endsWith" ? input.data.endsWith(check.value) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: { endsWith: check.value },
          message: check.message
        }), status.dirty()) : check.kind === "datetime" ? datetimeRegex(check).test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: "datetime",
          message: check.message
        }), status.dirty()) : check.kind === "date" ? dateRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: "date",
          message: check.message
        }), status.dirty()) : check.kind === "time" ? timeRegex(check).test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: "time",
          message: check.message
        }), status.dirty()) : check.kind === "duration" ? durationRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "duration",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "ip" ? isValidIP(input.data, check.version) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "ip",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "jwt" ? isValidJWT(input.data, check.alg) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "jwt",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "cidr" ? isValidCidr(input.data, check.version) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "cidr",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "base64" ? base64Regex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "base64",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "base64url" ? base64urlRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "base64url",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : util.assertNever(check);
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check) {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      return typeof options == "string" ? this._addCheck({
        kind: "datetime",
        precision: null,
        offset: !1,
        local: !1,
        message: options
      }) : this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision > "u" ? null : options?.precision,
        offset: options?.offset ?? !1,
        local: options?.local ?? !1,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      return typeof options == "string" ? this._addCheck({
        kind: "time",
        precision: null,
        message: options
      }) : this._addCheck({
        kind: "time",
        precision: typeof options?.precision > "u" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (let ch of this._def.checks)
        ch.kind === "min" && (min === null || ch.value > min) && (min = ch.value);
      return min;
    }
    get maxLength() {
      let max = null;
      for (let ch of this._def.checks)
        ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
      return max;
    }
  };
  ZodString.create = (params) => new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? !1,
    ...processCreateParams(params)
  });
  function floatSafeRemainder(val, step) {
    let valDecCount = (val.toString().split(".")[1] || "").length, stepDecCount = (step.toString().split(".")[1] || "").length, decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount, valInt = Number.parseInt(val.toFixed(decCount).replace(".", "")), stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  var ZodNumber = class _ZodNumber extends ZodType {
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce && (input.data = Number(input.data)), this._getType(input) !== ZodParsedType.number) {
        let ctx2 = this._getOrReturnCtx(input);
        return addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        }), INVALID;
      }
      let ctx, status = new ParseStatus();
      for (let check of this._def.checks)
        check.kind === "int" ? util.isInteger(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: "integer",
          received: "float",
          message: check.message
        }), status.dirty()) : check.kind === "min" ? (check.inclusive ? input.data < check.value : input.data <= check.value) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: check.value,
          type: "number",
          inclusive: check.inclusive,
          exact: !1,
          message: check.message
        }), status.dirty()) : check.kind === "max" ? (check.inclusive ? input.data > check.value : input.data >= check.value) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: check.value,
          type: "number",
          inclusive: check.inclusive,
          exact: !1,
          message: check.message
        }), status.dirty()) : check.kind === "multipleOf" ? floatSafeRemainder(input.data, check.value) !== 0 && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.not_multiple_of,
          multipleOf: check.value,
          message: check.message
        }), status.dirty()) : check.kind === "finite" ? Number.isFinite(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.not_finite,
          message: check.message
        }), status.dirty()) : util.assertNever(check);
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, !0, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, !1, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, !0, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, !1, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: !1,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: !1,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: !0,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: !0,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: !0,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: !0,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (let ch of this._def.checks)
        ch.kind === "min" && (min === null || ch.value > min) && (min = ch.value);
      return min;
    }
    get maxValue() {
      let max = null;
      for (let ch of this._def.checks)
        ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
      return max;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max = null, min = null;
      for (let ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf")
          return !0;
        ch.kind === "min" ? (min === null || ch.value > min) && (min = ch.value) : ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
      }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  };
  ZodNumber.create = (params) => new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || !1,
    ...processCreateParams(params)
  });
  var ZodBigInt = class _ZodBigInt extends ZodType {
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce)
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      if (this._getType(input) !== ZodParsedType.bigint)
        return this._getInvalidInput(input);
      let ctx, status = new ParseStatus();
      for (let check of this._def.checks)
        check.kind === "min" ? (check.inclusive ? input.data < check.value : input.data <= check.value) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          type: "bigint",
          minimum: check.value,
          inclusive: check.inclusive,
          message: check.message
        }), status.dirty()) : check.kind === "max" ? (check.inclusive ? input.data > check.value : input.data >= check.value) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          type: "bigint",
          maximum: check.value,
          inclusive: check.inclusive,
          message: check.message
        }), status.dirty()) : check.kind === "multipleOf" ? input.data % check.value !== BigInt(0) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.not_multiple_of,
          multipleOf: check.value,
          message: check.message
        }), status.dirty()) : util.assertNever(check);
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      }), INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, !0, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, !1, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, !0, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, !1, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: !1,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: !1,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: !0,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: !0,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (let ch of this._def.checks)
        ch.kind === "min" && (min === null || ch.value > min) && (min = ch.value);
      return min;
    }
    get maxValue() {
      let max = null;
      for (let ch of this._def.checks)
        ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
      return max;
    }
  };
  ZodBigInt.create = (params) => new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? !1,
    ...processCreateParams(params)
  });
  var ZodBoolean = class extends ZodType {
    _parse(input) {
      if (this._def.coerce && (input.data = !!input.data), this._getType(input) !== ZodParsedType.boolean) {
        let ctx = this._getOrReturnCtx(input);
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        }), INVALID;
      }
      return OK(input.data);
    }
  };
  ZodBoolean.create = (params) => new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || !1,
    ...processCreateParams(params)
  });
  var ZodDate = class _ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce && (input.data = new Date(input.data)), this._getType(input) !== ZodParsedType.date) {
        let ctx2 = this._getOrReturnCtx(input);
        return addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        }), INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        let ctx2 = this._getOrReturnCtx(input);
        return addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        }), INVALID;
      }
      let status = new ParseStatus(), ctx;
      for (let check of this._def.checks)
        check.kind === "min" ? input.data.getTime() < check.value && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          message: check.message,
          inclusive: !0,
          exact: !1,
          minimum: check.value,
          type: "date"
        }), status.dirty()) : check.kind === "max" ? input.data.getTime() > check.value && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          message: check.message,
          inclusive: !0,
          exact: !1,
          maximum: check.value,
          type: "date"
        }), status.dirty()) : util.assertNever(check);
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check) {
      return new _ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min = null;
      for (let ch of this._def.checks)
        ch.kind === "min" && (min === null || ch.value > min) && (min = ch.value);
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (let ch of this._def.checks)
        ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
      return max != null ? new Date(max) : null;
    }
  };
  ZodDate.create = (params) => new ZodDate({
    checks: [],
    coerce: params?.coerce || !1,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
  var ZodSymbol = class extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.symbol) {
        let ctx = this._getOrReturnCtx(input);
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        }), INVALID;
      }
      return OK(input.data);
    }
  };
  ZodSymbol.create = (params) => new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
  var ZodUndefined = class extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.undefined) {
        let ctx = this._getOrReturnCtx(input);
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        }), INVALID;
      }
      return OK(input.data);
    }
  };
  ZodUndefined.create = (params) => new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
  var ZodNull = class extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.null) {
        let ctx = this._getOrReturnCtx(input);
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        }), INVALID;
      }
      return OK(input.data);
    }
  };
  ZodNull.create = (params) => new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
  var ZodAny = class extends ZodType {
    constructor() {
      super(...arguments), this._any = !0;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodAny.create = (params) => new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
  var ZodUnknown = class extends ZodType {
    constructor() {
      super(...arguments), this._unknown = !0;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodUnknown.create = (params) => new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
  var ZodNever = class extends ZodType {
    _parse(input) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      }), INVALID;
    }
  };
  ZodNever.create = (params) => new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
  var ZodVoid = class extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.undefined) {
        let ctx = this._getOrReturnCtx(input);
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        }), INVALID;
      }
      return OK(input.data);
    }
  };
  ZodVoid.create = (params) => new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
  var ZodArray = class _ZodArray extends ZodType {
    _parse(input) {
      let { ctx, status } = this._processInputParams(input), def = this._def;
      if (ctx.parsedType !== ZodParsedType.array)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        }), INVALID;
      if (def.exactLength !== null) {
        let tooBig = ctx.data.length > def.exactLength.value, tooSmall = ctx.data.length < def.exactLength.value;
        (tooBig || tooSmall) && (addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: !0,
          exact: !0,
          message: def.exactLength.message
        }), status.dirty());
      }
      if (def.minLength !== null && ctx.data.length < def.minLength.value && (addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: def.minLength.value,
        type: "array",
        inclusive: !0,
        exact: !1,
        message: def.minLength.message
      }), status.dirty()), def.maxLength !== null && ctx.data.length > def.maxLength.value && (addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: def.maxLength.value,
        type: "array",
        inclusive: !0,
        exact: !1,
        message: def.maxLength.message
      }), status.dirty()), ctx.common.async)
        return Promise.all([...ctx.data].map((item, i) => def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i)))).then((result2) => ParseStatus.mergeArray(status, result2));
      let result = [...ctx.data].map((item, i) => def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new _ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new _ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new _ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodArray.create = (schema, params) => new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
  function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
      let newShape = {};
      for (let key in schema.shape) {
        let fieldSchema = schema.shape[key];
        newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
      }
      return new ZodObject({
        ...schema._def,
        shape: () => newShape
      });
    } else return schema instanceof ZodArray ? new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    }) : schema instanceof ZodOptional ? ZodOptional.create(deepPartialify(schema.unwrap())) : schema instanceof ZodNullable ? ZodNullable.create(deepPartialify(schema.unwrap())) : schema instanceof ZodTuple ? ZodTuple.create(schema.items.map((item) => deepPartialify(item))) : schema;
  }
  var ZodObject = class _ZodObject extends ZodType {
    constructor() {
      super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      let shape = this._def.shape(), keys = util.objectKeys(shape);
      return this._cached = { shape, keys }, this._cached;
    }
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.object) {
        let ctx2 = this._getOrReturnCtx(input);
        return addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        }), INVALID;
      }
      let { status, ctx } = this._processInputParams(input), { shape, keys: shapeKeys } = this._getCached(), extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip"))
        for (let key in ctx.data)
          shapeKeys.includes(key) || extraKeys.push(key);
      let pairs = [];
      for (let key of shapeKeys) {
        let keyValidator = shape[key], value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        let unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough")
          for (let key of extraKeys)
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
        else if (unknownKeys === "strict")
          extraKeys.length > 0 && (addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          }), status.dirty());
        else if (unknownKeys !== "strip")
          throw new Error("Internal ZodObject error: invalid unknownKeys value.");
      } else {
        let catchall = this._def.catchall;
        for (let key of extraKeys) {
          let value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(
              new ParseInputLazyPath(ctx, value, ctx.path, key)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: key in ctx.data
          });
        }
      }
      return ctx.common.async ? Promise.resolve().then(async () => {
        let syncPairs = [];
        for (let pair of pairs) {
          let key = await pair.key, value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => ParseStatus.mergeObjectSync(status, syncPairs)) : ParseStatus.mergeObjectSync(status, pairs);
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      return errorUtil.errToObj, new _ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== void 0 ? {
          errorMap: (issue, ctx) => {
            let defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
            return issue.code === "unrecognized_keys" ? {
              message: errorUtil.errToObj(message).message ?? defaultError
            } : {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
      return new _ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
      return new _ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
      return new _ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      let shape = {};
      for (let key of util.objectKeys(mask))
        mask[key] && this.shape[key] && (shape[key] = this.shape[key]);
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      let shape = {};
      for (let key of util.objectKeys(this.shape))
        mask[key] || (shape[key] = this.shape[key]);
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      let newShape = {};
      for (let key of util.objectKeys(this.shape)) {
        let fieldSchema = this.shape[key];
        mask && !mask[key] ? newShape[key] = fieldSchema : newShape[key] = fieldSchema.optional();
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      let newShape = {};
      for (let key of util.objectKeys(this.shape))
        if (mask && !mask[key])
          newShape[key] = this.shape[key];
        else {
          let newField = this.shape[key];
          for (; newField instanceof ZodOptional; )
            newField = newField._def.innerType;
          newShape[key] = newField;
        }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
  ZodObject.create = (shape, params) => new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
  ZodObject.strictCreate = (shape, params) => new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
  ZodObject.lazycreate = (shape, params) => new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
  var ZodUnion = class extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input), options = this._def.options;
      function handleResults(results) {
        for (let result of results)
          if (result.result.status === "valid")
            return result.result;
        for (let result of results)
          if (result.result.status === "dirty")
            return ctx.common.issues.push(...result.ctx.common.issues), result.result;
        let unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        }), INVALID;
      }
      if (ctx.common.async)
        return Promise.all(options.map(async (option) => {
          let childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      {
        let dirty, issues = [];
        for (let option of options) {
          let childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          }, result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result.status === "valid")
            return result;
          result.status === "dirty" && !dirty && (dirty = { result, ctx: childCtx }), childCtx.common.issues.length && issues.push(childCtx.common.issues);
        }
        if (dirty)
          return ctx.common.issues.push(...dirty.ctx.common.issues), dirty.result;
        let unionErrors = issues.map((issues2) => new ZodError(issues2));
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        }), INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ZodUnion.create = (types, params) => new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
  var getDiscriminator = (type) => type instanceof ZodLazy ? getDiscriminator(type.schema) : type instanceof ZodEffects ? getDiscriminator(type.innerType()) : type instanceof ZodLiteral ? [type.value] : type instanceof ZodEnum ? type.options : type instanceof ZodNativeEnum ? util.objectValues(type.enum) : type instanceof ZodDefault ? getDiscriminator(type._def.innerType) : type instanceof ZodUndefined ? [void 0] : type instanceof ZodNull ? [null] : type instanceof ZodOptional ? [void 0, ...getDiscriminator(type.unwrap())] : type instanceof ZodNullable ? [null, ...getDiscriminator(type.unwrap())] : type instanceof ZodBranded || type instanceof ZodReadonly ? getDiscriminator(type.unwrap()) : type instanceof ZodCatch ? getDiscriminator(type._def.innerType) : [], ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        }), INVALID;
      let discriminator = this.discriminator, discriminatorValue = ctx.data[discriminator], option = this.optionsMap.get(discriminatorValue);
      return option ? ctx.common.async ? option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }) : option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }) : (addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      }), INVALID);
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator, options, params) {
      let optionsMap = /* @__PURE__ */ new Map();
      for (let type of options) {
        let discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length)
          throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
        for (let value of discriminatorValues) {
          if (optionsMap.has(value))
            throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
          optionsMap.set(value, type);
        }
      }
      return new _ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  };
  function mergeValues(a, b) {
    let aType = getParsedType(a), bType = getParsedType(b);
    if (a === b)
      return { valid: !0, data: a };
    if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
      let bKeys = util.objectKeys(b), sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1), newObj = { ...a, ...b };
      for (let key of sharedKeys) {
        let sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid)
          return { valid: !1 };
        newObj[key] = sharedValue.data;
      }
      return { valid: !0, data: newObj };
    } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
      if (a.length !== b.length)
        return { valid: !1 };
      let newArray = [];
      for (let index = 0; index < a.length; index++) {
        let itemA = a[index], itemB = b[index], sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid)
          return { valid: !1 };
        newArray.push(sharedValue.data);
      }
      return { valid: !0, data: newArray };
    } else return aType === ZodParsedType.date && bType === ZodParsedType.date && +a == +b ? { valid: !0, data: a } : { valid: !1 };
  }
  var ZodIntersection = class extends ZodType {
    _parse(input) {
      let { status, ctx } = this._processInputParams(input), handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight))
          return INVALID;
        let merged = mergeValues(parsedLeft.value, parsedRight.value);
        return merged.valid ? ((isDirty(parsedLeft) || isDirty(parsedRight)) && status.dirty(), { status: status.value, value: merged.data }) : (addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        }), INVALID);
      };
      return ctx.common.async ? Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right)) : handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  };
  ZodIntersection.create = (left, right, params) => new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
  var ZodTuple = class _ZodTuple extends ZodType {
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        }), INVALID;
      if (ctx.data.length < this._def.items.length)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: !0,
          exact: !1,
          type: "array"
        }), INVALID;
      !this._def.rest && ctx.data.length > this._def.items.length && (addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), status.dirty());
      let items = [...ctx.data].map((item, itemIndex) => {
        let schema = this._def.items[itemIndex] || this._def.rest;
        return schema ? schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex)) : null;
      }).filter((x) => !!x);
      return ctx.common.async ? Promise.all(items).then((results) => ParseStatus.mergeArray(status, results)) : ParseStatus.mergeArray(status, items);
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new _ZodTuple({
        ...this._def,
        rest
      });
    }
  };
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas))
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  var ZodRecord = class _ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        }), INVALID;
      let pairs = [], keyType = this._def.keyType, valueType = this._def.valueType;
      for (let key in ctx.data)
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      return ctx.common.async ? ParseStatus.mergeObjectAsync(status, pairs) : ParseStatus.mergeObjectSync(status, pairs);
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      return second instanceof ZodType ? new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      }) : new _ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  }, ZodMap = class extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        }), INVALID;
      let keyType = this._def.keyType, valueType = this._def.valueType, pairs = [...ctx.data.entries()].map(([key, value], index) => ({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      }));
      if (ctx.common.async) {
        let finalMap = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (let pair of pairs) {
            let key = await pair.key, value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted")
              return INVALID;
            (key.status === "dirty" || value.status === "dirty") && status.dirty(), finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        let finalMap = /* @__PURE__ */ new Map();
        for (let pair of pairs) {
          let key = pair.key, value = pair.value;
          if (key.status === "aborted" || value.status === "aborted")
            return INVALID;
          (key.status === "dirty" || value.status === "dirty") && status.dirty(), finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  };
  ZodMap.create = (keyType, valueType, params) => new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
  var ZodSet = class _ZodSet extends ZodType {
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        }), INVALID;
      let def = this._def;
      def.minSize !== null && ctx.data.size < def.minSize.value && (addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: def.minSize.value,
        type: "set",
        inclusive: !0,
        exact: !1,
        message: def.minSize.message
      }), status.dirty()), def.maxSize !== null && ctx.data.size > def.maxSize.value && (addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: def.maxSize.value,
        type: "set",
        inclusive: !0,
        exact: !1,
        message: def.maxSize.message
      }), status.dirty());
      let valueType = this._def.valueType;
      function finalizeSet(elements2) {
        let parsedSet = /* @__PURE__ */ new Set();
        for (let element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          element.status === "dirty" && status.dirty(), parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      let elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      return ctx.common.async ? Promise.all(elements).then((elements2) => finalizeSet(elements2)) : finalizeSet(elements);
    }
    min(minSize, message) {
      return new _ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new _ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodSet.create = (valueType, params) => new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
  var ZodFunction = class _ZodFunction extends ZodType {
    constructor() {
      super(...arguments), this.validate = this.implement;
    }
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        }), INVALID;
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      let params = { errorMap: ctx.common.contextualErrorMap }, fn = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        let me = this;
        return OK(async function(...args) {
          let error = new ZodError([]), parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            throw error.addIssue(makeArgsIssue(args, e)), error;
          }), result = await Reflect.apply(fn, this, parsedArgs);
          return await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            throw error.addIssue(makeReturnsIssue(result, e)), error;
          });
        });
      } else {
        let me = this;
        return OK(function(...args) {
          let parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success)
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          let result = Reflect.apply(fn, this, parsedArgs.data), parsedReturns = me._def.returns.safeParse(result, params);
          if (!parsedReturns.success)
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new _ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new _ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      return this.parse(func);
    }
    strictImplement(func) {
      return this.parse(func);
    }
    static create(args, returns, params) {
      return new _ZodFunction({
        args: args || ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  }, ZodLazy = class extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      return this._def.getter()._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  };
  ZodLazy.create = (getter, params) => new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
  var ZodLiteral = class extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        let ctx = this._getOrReturnCtx(input);
        return addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        }), INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  };
  ZodLiteral.create = (value, params) => new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
  function createZodEnum(values, params) {
    return new ZodEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodEnum,
      ...processCreateParams(params)
    });
  }
  var ZodEnum = class _ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data != "string") {
        let ctx = this._getOrReturnCtx(input), expectedValues = this._def.values;
        return addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        }), INVALID;
      }
      if (this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(input.data)) {
        let ctx = this._getOrReturnCtx(input), expectedValues = this._def.values;
        return addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        }), INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      let enumValues = {};
      for (let val of this._def.values)
        enumValues[val] = val;
      return enumValues;
    }
    get Values() {
      let enumValues = {};
      for (let val of this._def.values)
        enumValues[val] = val;
      return enumValues;
    }
    get Enum() {
      let enumValues = {};
      for (let val of this._def.values)
        enumValues[val] = val;
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return _ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  };
  ZodEnum.create = createZodEnum;
  var ZodNativeEnum = class extends ZodType {
    _parse(input) {
      let nativeEnumValues = util.getValidEnumValues(this._def.values), ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        let expectedValues = util.objectValues(nativeEnumValues);
        return addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        }), INVALID;
      }
      if (this._cache || (this._cache = new Set(util.getValidEnumValues(this._def.values))), !this._cache.has(input.data)) {
        let expectedValues = util.objectValues(nativeEnumValues);
        return addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        }), INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  ZodNativeEnum.create = (values, params) => new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
  var ZodPromise = class extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      let { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === !1)
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        }), INVALID;
      let promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      })));
    }
  };
  ZodPromise.create = (schema, params) => new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
  var ZodEffects = class extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      let { status, ctx } = this._processInputParams(input), effect = this._def.effect || null, checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg), arg.fatal ? status.abort() : status.dirty();
        },
        get path() {
          return ctx.path;
        }
      };
      if (checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx), effect.type === "preprocess") {
        let processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async)
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            let result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            return result.status === "aborted" ? INVALID : result.status === "dirty" ? DIRTY(result.value) : status.value === "dirty" ? DIRTY(result.value) : result;
          });
        {
          if (status.value === "aborted")
            return INVALID;
          let result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          return result.status === "aborted" ? INVALID : result.status === "dirty" ? DIRTY(result.value) : status.value === "dirty" ? DIRTY(result.value) : result;
        }
      }
      if (effect.type === "refinement") {
        let executeRefinement = (acc) => {
          let result = effect.refinement(acc, checkCtx);
          if (ctx.common.async)
            return Promise.resolve(result);
          if (result instanceof Promise)
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          return acc;
        };
        if (ctx.common.async === !1) {
          let inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          return inner.status === "aborted" ? INVALID : (inner.status === "dirty" && status.dirty(), executeRefinement(inner.value), { status: status.value, value: inner.value });
        } else
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => inner.status === "aborted" ? INVALID : (inner.status === "dirty" && status.dirty(), executeRefinement(inner.value).then(() => ({ status: status.value, value: inner.value }))));
      }
      if (effect.type === "transform")
        if (ctx.common.async === !1) {
          let base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          let result = effect.transform(base.value, checkCtx);
          if (result instanceof Promise)
            throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
          return { status: status.value, value: result };
        } else
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => isValid(base) ? Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          })) : INVALID);
      util.assertNever(effect);
    }
  };
  ZodEffects.create = (schema, effect, params) => new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
  var ZodOptional = class extends ZodType {
    _parse(input) {
      return this._getType(input) === ZodParsedType.undefined ? OK(void 0) : this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodOptional.create = (type, params) => new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
  var ZodNullable = class extends ZodType {
    _parse(input) {
      return this._getType(input) === ZodParsedType.null ? OK(null) : this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodNullable.create = (type, params) => new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
  var ZodDefault = class extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input), data = ctx.data;
      return ctx.parsedType === ZodParsedType.undefined && (data = this._def.defaultValue()), this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  ZodDefault.create = (type, params) => new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default == "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
  var ZodCatch = class extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input), newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      }, result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      return isAsync(result) ? result.then((result2) => ({
        status: "valid",
        value: result2.status === "valid" ? result2.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      })) : {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ZodCatch.create = (type, params) => new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch == "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
  var ZodNaN = class extends ZodType {
    _parse(input) {
      if (this._getType(input) !== ZodParsedType.nan) {
        let ctx = this._getOrReturnCtx(input);
        return addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        }), INVALID;
      }
      return { status: "valid", value: input.data };
    }
  };
  ZodNaN.create = (params) => new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
  var BRAND = Symbol("zod_brand"), ZodBranded = class extends ZodType {
    _parse(input) {
      let { ctx } = this._processInputParams(input), data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  }, ZodPipeline = class _ZodPipeline extends ZodType {
    _parse(input) {
      let { status, ctx } = this._processInputParams(input);
      if (ctx.common.async)
        return (async () => {
          let inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          return inResult.status === "aborted" ? INVALID : inResult.status === "dirty" ? (status.dirty(), DIRTY(inResult.value)) : this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        })();
      {
        let inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        return inResult.status === "aborted" ? INVALID : inResult.status === "dirty" ? (status.dirty(), {
          status: "dirty",
          value: inResult.value
        }) : this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
    static create(a, b) {
      return new _ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  }, ZodReadonly = class extends ZodType {
    _parse(input) {
      let result = this._def.innerType._parse(input), freeze = (data) => (isValid(data) && (data.value = Object.freeze(data.value)), data);
      return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodReadonly.create = (type, params) => new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
  function cleanParams(params, data) {
    let p = typeof params == "function" ? params(data) : typeof params == "string" ? { message: params } : params;
    return typeof p == "string" ? { message: p } : p;
  }
  function custom(check, _params = {}, fatal) {
    return check ? ZodAny.create().superRefine((data, ctx) => {
      let r = check(data);
      if (r instanceof Promise)
        return r.then((r2) => {
          if (!r2) {
            let params = cleanParams(_params, data), _fatal = params.fatal ?? fatal ?? !0;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      if (!r) {
        let params = cleanParams(_params, data), _fatal = params.fatal ?? fatal ?? !0;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
    }) : ZodAny.create();
  }
  var late = {
    object: ZodObject.lazycreate
  }, ZodFirstPartyTypeKind;
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2.ZodString = "ZodString", ZodFirstPartyTypeKind2.ZodNumber = "ZodNumber", ZodFirstPartyTypeKind2.ZodNaN = "ZodNaN", ZodFirstPartyTypeKind2.ZodBigInt = "ZodBigInt", ZodFirstPartyTypeKind2.ZodBoolean = "ZodBoolean", ZodFirstPartyTypeKind2.ZodDate = "ZodDate", ZodFirstPartyTypeKind2.ZodSymbol = "ZodSymbol", ZodFirstPartyTypeKind2.ZodUndefined = "ZodUndefined", ZodFirstPartyTypeKind2.ZodNull = "ZodNull", ZodFirstPartyTypeKind2.ZodAny = "ZodAny", ZodFirstPartyTypeKind2.ZodUnknown = "ZodUnknown", ZodFirstPartyTypeKind2.ZodNever = "ZodNever", ZodFirstPartyTypeKind2.ZodVoid = "ZodVoid", ZodFirstPartyTypeKind2.ZodArray = "ZodArray", ZodFirstPartyTypeKind2.ZodObject = "ZodObject", ZodFirstPartyTypeKind2.ZodUnion = "ZodUnion", ZodFirstPartyTypeKind2.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", ZodFirstPartyTypeKind2.ZodIntersection = "ZodIntersection", ZodFirstPartyTypeKind2.ZodTuple = "ZodTuple", ZodFirstPartyTypeKind2.ZodRecord = "ZodRecord", ZodFirstPartyTypeKind2.ZodMap = "ZodMap", ZodFirstPartyTypeKind2.ZodSet = "ZodSet", ZodFirstPartyTypeKind2.ZodFunction = "ZodFunction", ZodFirstPartyTypeKind2.ZodLazy = "ZodLazy", ZodFirstPartyTypeKind2.ZodLiteral = "ZodLiteral", ZodFirstPartyTypeKind2.ZodEnum = "ZodEnum", ZodFirstPartyTypeKind2.ZodEffects = "ZodEffects", ZodFirstPartyTypeKind2.ZodNativeEnum = "ZodNativeEnum", ZodFirstPartyTypeKind2.ZodOptional = "ZodOptional", ZodFirstPartyTypeKind2.ZodNullable = "ZodNullable", ZodFirstPartyTypeKind2.ZodDefault = "ZodDefault", ZodFirstPartyTypeKind2.ZodCatch = "ZodCatch", ZodFirstPartyTypeKind2.ZodPromise = "ZodPromise", ZodFirstPartyTypeKind2.ZodBranded = "ZodBranded", ZodFirstPartyTypeKind2.ZodPipeline = "ZodPipeline", ZodFirstPartyTypeKind2.ZodReadonly = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  var instanceOfType = (cls, params = {
    message: `Input not instance of ${cls.name}`
  }) => custom((data) => data instanceof cls, params), stringType = ZodString.create, numberType = ZodNumber.create, nanType = ZodNaN.create, bigIntType = ZodBigInt.create, booleanType = ZodBoolean.create, dateType = ZodDate.create, symbolType = ZodSymbol.create, undefinedType = ZodUndefined.create, nullType = ZodNull.create, anyType = ZodAny.create, unknownType = ZodUnknown.create, neverType = ZodNever.create, voidType = ZodVoid.create, arrayType = ZodArray.create, objectType = ZodObject.create, strictObjectType = ZodObject.strictCreate, unionType = ZodUnion.create, discriminatedUnionType = ZodDiscriminatedUnion.create, intersectionType = ZodIntersection.create, tupleType = ZodTuple.create, recordType = ZodRecord.create, mapType = ZodMap.create, setType = ZodSet.create, functionType = ZodFunction.create, lazyType = ZodLazy.create, literalType = ZodLiteral.create, enumType = ZodEnum.create, nativeEnumType = ZodNativeEnum.create, promiseType = ZodPromise.create, effectsType = ZodEffects.create, optionalType = ZodOptional.create, nullableType = ZodNullable.create, preprocessType = ZodEffects.createWithPreprocess, pipelineType = ZodPipeline.create, ostring = () => stringType().optional(), onumber = () => numberType().optional(), oboolean = () => booleanType().optional(), coerce = {
    string: ((arg) => ZodString.create({ ...arg, coerce: !0 })),
    number: ((arg) => ZodNumber.create({ ...arg, coerce: !0 })),
    boolean: ((arg) => ZodBoolean.create({
      ...arg,
      coerce: !0
    })),
    bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: !0 })),
    date: ((arg) => ZodDate.create({ ...arg, coerce: !0 }))
  };
  var NEVER = INVALID;

  // ../protocol/dist/index.js
  var PROTOCOL_VERSION = 1, MAX_CONTROL_FRAME_BYTES = 64 * 1024, MAX_RELAY_FRAME_BYTES = 1024 * 1024, SECURE_FRAGMENT_CHUNK_BYTES = 48 * 1024, MAX_SECURE_MESSAGE_BYTES = 4 * 1024 * 1024, HARNESS_API_TRANSFER_CHUNK_BYTES = 512 * 1024, CODEX_APP_TRANSFER_CHUNK_BYTES = 512 * 1024, MAX_HARNESS_API_TRANSFER_BYTES = 288 * 1024 * 1024, MAX_CODEX_APP_TRANSFER_BYTES = 288 * 1024 * 1024, SECURE_FRAGMENT_MAGIC = new Uint8Array([68, 83, 72, 70]);
  var messageTypes = [
    "rpc.request",
    "rpc.response",
    "rpc.error",
    "event"
  ], controlFrameTypes = [
    "hello",
    "hello.ack",
    "connect.request",
    "connect.incoming",
    "connect.accepted",
    "connect.rejected",
    "secure.handshake",
    "relay",
    "signal.offer",
    "signal.answer",
    "signal.ice",
    "transport.selected",
    "ping",
    "pong",
    "error"
  ], rpcMethods = [
    "harness.transport.describe",
    "harness.api.call",
    "harness.api.transfer.open",
    "harness.api.transfer.chunk",
    "harness.api.transfer.commit",
    "harness.api.transfer.read",
    "harness.api.transfer.close",
    "harness.api.respond",
    "harness.api.stream.open",
    "harness.api.stream.close",
    "harness.remote.call",
    "harness.remote.transfer.open",
    "harness.remote.transfer.chunk",
    "harness.remote.transfer.commit",
    "harness.remote.transfer.read",
    "harness.remote.transfer.close",
    "harness.remote.stream.open",
    "harness.remote.stream.close",
    "fileviewer.call",
    "codex.app.call",
    "codex.app.respond",
    "codex.app.stream.open",
    "codex.app.stream.close",
    "codex.app.transfer.open",
    "codex.app.transfer.chunk",
    "codex.app.transfer.commit",
    "codex.app.transfer.read",
    "codex.app.transfer.close"
  ];
  var selectedTransports = ["lan", "p2p", "turn", "relay"];
  function normalizeSdpMLineIndex(value) {
    if (value !== void 0)
      return value === null || typeof value != "number" || !Number.isInteger(value) || value < 0 ? null : value;
  }
  var rpcMethodSchema = external_exports.enum(rpcMethods), messageTypeSchema = external_exports.enum(messageTypes), controlFrameTypeSchema = external_exports.enum(controlFrameTypes), uniqueStrings = (values) => new Set(values).size === values.length, uniqueNumbers = (values) => new Set(values).size === values.length, remoteMessageSchema = external_exports.object({
    v: external_exports.literal(PROTOCOL_VERSION),
    id: external_exports.string().min(1),
    type: messageTypeSchema,
    timestamp: external_exports.number().int().positive(),
    payload: external_exports.unknown()
  }), controlFrameSchema = external_exports.object({
    v: external_exports.literal(PROTOCOL_VERSION),
    id: external_exports.string().min(1),
    type: controlFrameTypeSchema,
    timestamp: external_exports.number().int().positive(),
    payload: external_exports.unknown()
  }).strict(), transportEnum = external_exports.enum(["lan", "p2p", "turn", "relay"]), selectedTransportEnum = external_exports.enum(selectedTransports), helloPayloadSchema = external_exports.object({
    role: external_exports.enum(["host", "client"]),
    deviceId: external_exports.string().min(1),
    accessToken: external_exports.string().min(1),
    protocols: external_exports.array(external_exports.number().int().nonnegative().safe()).min(1).refine(uniqueNumbers),
    capabilities: external_exports.array(external_exports.string().min(1)).refine(uniqueStrings),
    clientVersion: external_exports.string().optional(),
    harnessVersion: external_exports.string().optional()
  }), helloAckPayloadSchema = external_exports.object({
    protocol: external_exports.literal(PROTOCOL_VERSION),
    serverVersion: external_exports.string().min(1),
    connectionSessionId: external_exports.string().min(1),
    heartbeatIntervalMs: external_exports.number().int().positive(),
    maxControlFrameBytes: external_exports.number().int().positive().max(MAX_CONTROL_FRAME_BYTES),
    maxRelayFrameBytes: external_exports.number().int().positive().max(MAX_RELAY_FRAME_BYTES),
    capabilities: external_exports.array(external_exports.string().min(1)).refine(uniqueStrings).optional(),
    webrtcEnabled: external_exports.boolean().optional(),
    webrtcFallbackTimeoutMs: external_exports.number().int().positive().optional()
  }), connectRequestPayloadSchema = external_exports.object({
    hostDeviceId: external_exports.string().min(1),
    preferredTransports: external_exports.array(transportEnum).min(1)
  }), connectIncomingPayloadSchema = external_exports.object({
    connectionId: external_exports.string().min(1),
    clientDeviceId: external_exports.string().min(1),
    clientIdentityKey: external_exports.string().min(1),
    authorization: external_exports.literal("account"),
    preferredTransports: external_exports.array(transportEnum).min(1)
  }), connectAcceptedPayloadSchema = external_exports.object({
    connectionId: external_exports.string().min(1)
  }), connectRejectedPayloadSchema = external_exports.object({
    connectionId: external_exports.string().min(1),
    code: external_exports.string().optional(),
    message: external_exports.string().optional()
  }), secureHandshakePayloadSchema = external_exports.object({
    connectionId: external_exports.string().min(1),
    targetDeviceId: external_exports.string().min(1),
    step: external_exports.number().int().positive(),
    data: external_exports.string().min(1)
  }), relayPayloadSchema = external_exports.object({
    connectionId: external_exports.string().min(1),
    targetDeviceId: external_exports.string().min(1),
    counter: external_exports.number().int().nonnegative().safe(),
    ciphertext: external_exports.string().min(1)
  }), signalPayloadSchema = external_exports.object({
    connectionId: external_exports.string().min(1),
    targetDeviceId: external_exports.string().min(1),
    sdp: external_exports.string().min(1)
  }), signalIcePayloadSchema = external_exports.object({
    connectionId: external_exports.string().min(1),
    targetDeviceId: external_exports.string().min(1),
    candidate: external_exports.object({
      candidate: external_exports.string().optional(),
      sdpMid: external_exports.string().nullable().optional(),
      sdpMLineIndex: external_exports.preprocess(normalizeSdpMLineIndex, external_exports.number().int().nonnegative().nullable().optional()),
      usernameFragment: external_exports.string().nullable().optional()
    })
  }), transportSelectedPayloadSchema = external_exports.object({
    connectionId: external_exports.string().min(1),
    targetDeviceId: external_exports.string().min(1),
    transport: selectedTransportEnum
  }), pingPongPayloadSchema = external_exports.object({
    nonce: external_exports.string().min(1)
  }), controlErrorPayloadSchema = external_exports.object({
    code: external_exports.string().min(1),
    message: external_exports.string().min(1),
    retryable: external_exports.boolean().optional(),
    connectionId: external_exports.string().min(1).optional()
  });
  var rpcRequestPayloadSchema = external_exports.object({
    method: rpcMethodSchema,
    params: external_exports.unknown()
  }), rpcResponsePayloadSchema = external_exports.object({
    requestId: external_exports.string().min(1),
    result: external_exports.unknown()
  }), rpcErrorPayloadSchema = external_exports.object({
    requestId: external_exports.string().min(1),
    code: external_exports.string().min(1),
    message: external_exports.string().min(1),
    retryable: external_exports.boolean().optional(),
    details: external_exports.unknown().optional()
  });

  // ../client-core/dist/remote-gateway.js
  var DIRECT_REMOTE_CALL_BYTES = 2 * 1024 * 1024;

  // ../client-core/dist/codex-client.js
  var MAX_DISPLAY_ITEM_TEXT = 256 * 1024;
  function projectCodexThread(value) {
    if (!isRecord(value) || typeof value.id != "string")
      return;
    let createdAt = normalizeTimestamp(value.createdAt), updatedAt = normalizeTimestamp(value.updatedAt) || createdAt;
    return {
      id: `codex:${value.id}`,
      backend: "codex",
      nativeId: value.id,
      ...typeof value.sessionId == "string" ? { sessionTreeId: value.sessionId } : {},
      ...typeof value.name == "string" && value.name.length > 0 ? { title: value.name } : {},
      ...typeof value.preview == "string" && value.preview.length > 0 ? { preview: value.preview } : {},
      ...typeof value.cwd == "string" ? { cwd: value.cwd } : {},
      createdAt,
      updatedAt,
      status: projectThreadStatus(value.status),
      ...typeof value.archived == "boolean" ? { archived: value.archived } : {},
      ...typeof value.isPinned == "boolean" ? { pinned: value.isPinned } : {}
    };
  }
  function projectCodexHistory(thread) {
    if (!isRecord(thread) || typeof thread.id != "string" || !Array.isArray(thread.turns))
      return [];
    let sessionId = `codex:${thread.id}`, output = [];
    for (let turn of thread.turns)
      if (!(!isRecord(turn) || typeof turn.id != "string" || !Array.isArray(turn.items)))
        for (let index = 0; index < turn.items.length; index += 1) {
          let item = turn.items[index];
          output.push(projectCodexItem(item, thread.id, turn.id, sessionId, index));
        }
    return output;
  }
  function createCodexTimelineState(thread) {
    let session = projectCodexThread(thread);
    if (session === void 0)
      return;
    let record = isRecord(thread) ? thread : {}, activeTurnId = findActiveTurnId(record.turns);
    return {
      session,
      items: projectCodexHistory(thread),
      ...activeTurnId === void 0 ? {} : { activeTurnId }
    };
  }
  function reduceCodexTimelineFrame(state, frame) {
    let params = isRecord(frame.params) ? frame.params : {};
    if (frame.method === "thread/status/changed")
      return { ...state, session: { ...state.session, status: projectThreadStatus(params.status) } };
    if (frame.method === "thread/name/updated" && typeof params.name == "string")
      return { ...state, session: { ...state.session, title: params.name } };
    if (frame.method === "thread/archived")
      return { ...state, session: { ...state.session, archived: !0 } };
    if (frame.method === "thread/unarchived")
      return { ...state, session: { ...state.session, archived: !1 } };
    if (frame.method === "turn/started") {
      let turn = isRecord(params.turn) ? params.turn : void 0, turnId = typeof turn?.id == "string" ? turn.id : void 0;
      return {
        ...state,
        items: turn === void 0 ? state.items : upsertItems(state.items, projectTurn(turn, state.session.nativeId)),
        ...turnId === void 0 ? {} : { activeTurnId: turnId },
        session: { ...state.session, status: "running" }
      };
    }
    if (frame.method === "item/started" || frame.method === "item/completed") {
      let item = params.item, turnId = extractNotificationTurnId(params);
      return turnId === void 0 ? state : {
        ...state,
        items: upsertItems(state.items, [projectCodexItem(item, state.session.nativeId, turnId, state.session.id, state.items.length)])
      };
    }
    if (frame.method === "item/agentMessage/delta" && typeof params.itemId == "string" && typeof params.delta == "string") {
      let turnId = extractNotificationTurnId(params) ?? state.activeTurnId ?? "active", itemId = params.itemId, id = `codex:${state.session.nativeId}:${turnId}:${itemId}`, index = state.items.findIndex((item) => item.id === id || item.nativeRef.itemId === itemId);
      if (index < 0)
        return {
          ...state,
          items: [...state.items, {
            id,
            sessionId: state.session.id,
            backend: "codex",
            kind: "message",
            role: "assistant",
            text: params.delta,
            status: "running",
            nativeRef: { threadId: state.session.nativeId, turnId, itemId }
          }]
        };
      let next = [...state.items], current = next[index];
      return next[index] = { ...current, text: `${current.text ?? ""}${params.delta}`, status: "running" }, { ...state, items: next };
    }
    if ((frame.method === "item/commandExecution/outputDelta" || frame.method === "item/fileChange/outputDelta") && typeof params.itemId == "string" && typeof params.delta == "string")
      return appendItemText(state, params.itemId, params.delta);
    if (frame.method === "item/mcpToolCall/progress" && typeof params.itemId == "string" && typeof params.message == "string")
      return appendItemText(state, params.itemId, `
${params.message}`);
    if (frame.method === "item/fileChange/patchUpdated" && typeof params.itemId == "string" && Array.isArray(params.changes))
      return replaceItemText(state, params.itemId, fileChangeText(params.changes));
    if (frame.method === "serverRequest/resolved" && state.approval !== void 0) {
      let requestHandle = state.approval.requestHandle;
      return {
        ...state,
        approval: void 0,
        items: state.items.map((item) => item.nativeRef.requestHandle === requestHandle ? { ...item, status: "completed" } : item),
        session: { ...state.session, status: state.activeTurnId === void 0 ? "idle" : "running" }
      };
    }
    if (frame.method === "turn/completed") {
      let turn = isRecord(params.turn) ? params.turn : void 0, failed = turn?.status === "failed" || turn?.error !== null && turn?.error !== void 0, next = {
        ...state,
        session: { ...state.session, status: failed ? "failed" : "idle" },
        items: turn === void 0 ? state.items : upsertItems(state.items, projectTurn(turn, state.session.nativeId)),
        approval: void 0
      };
      return delete next.activeTurnId, next;
    }
    if ((frame.method === "item/commandExecution/requestApproval" || frame.method === "item/fileChange/requestApproval") && typeof params.requestHandle == "string") {
      let command = commandText(params.command), approval = {
        requestHandle: params.requestHandle,
        kind: frame.method === "item/commandExecution/requestApproval" ? "command" : "file-change",
        ...command === void 0 ? {} : { command },
        ...typeof params.reason == "string" ? { reason: params.reason } : {}
      }, turnId = extractNotificationTurnId(params), approvalItem = {
        id: `codex:${state.session.nativeId}:${turnId ?? "approval"}:${params.requestHandle}`,
        sessionId: state.session.id,
        backend: "codex",
        kind: "approval",
        text: command ?? (approval.kind === "file-change" ? "File change approval" : "Command approval"),
        status: "running",
        nativeRef: {
          threadId: state.session.nativeId,
          ...turnId === void 0 ? {} : { turnId },
          requestHandle: params.requestHandle
        }
      };
      return { ...state, approval, items: upsertItems(state.items, [approvalItem]), session: { ...state.session, status: "waiting" } };
    }
    return state;
  }
  function projectCodexItem(value, threadId, turnId, sessionId, index) {
    let item = isRecord(value) ? value : {}, itemId = typeof item.id == "string" ? item.id : `${turnId}:${index}`, type = typeof item.type == "string" ? item.type : "unknown", base = {
      id: `codex:${threadId}:${turnId}:${itemId}`,
      sessionId,
      backend: "codex",
      nativeRef: { threadId, turnId, ...typeof item.id == "string" ? { itemId: item.id } : {} },
      ...normalizeTimestamp(item.createdAt) > 0 ? { createdAt: normalizeTimestamp(item.createdAt) } : {}
    };
    return type === "userMessage" ? { ...base, kind: "message", role: "user", text: itemText(item) } : type === "agentMessage" ? { ...base, kind: "message", role: "assistant", text: itemText(item), status: projectItemStatus(item.status) } : type === "commandExecution" ? { ...base, kind: "tool", text: commandExecutionText(item), status: projectItemStatus(item.status), details: { type } } : type === "mcpToolCall" || type === "dynamicToolCall" ? { ...base, kind: "tool", text: toolCallText(item), status: projectItemStatus(item.status), details: { type } } : type === "fileChange" ? { ...base, kind: "file-change", text: fileChangeText(item.changes), status: projectItemStatus(item.status), details: { type } } : type === "plan" || type === "reasoning" ? { ...base, kind: "status", text: itemText(item) ?? textArray(item.summary) ?? type, details: { type } } : type === "error" ? { ...base, kind: "error", text: itemText(item), status: "failed", details: { type } } : { ...base, kind: "unknown", text: `Unsupported Codex item: ${type}`, details: { type } };
  }
  function projectTurn(turn, threadId) {
    if (typeof turn.id != "string" || !Array.isArray(turn.items))
      return [];
    let sessionId = `codex:${threadId}`;
    return turn.items.map((item, index) => projectCodexItem(item, threadId, turn.id, sessionId, index));
  }
  function upsertItems(current, incoming) {
    if (incoming.length === 0)
      return current;
    let next = [...current];
    for (let item of incoming) {
      let index = next.findIndex((value) => value.id === item.id);
      index < 0 ? next.push(item) : next[index] = item;
    }
    return next;
  }
  function appendItemText(state, itemId, delta) {
    let index = state.items.findIndex((item) => item.nativeRef.itemId === itemId);
    if (index < 0)
      return state;
    let items = [...state.items], current = items[index];
    return items[index] = { ...current, text: boundedText(`${current.text ?? ""}${delta}`), status: "running" }, { ...state, items };
  }
  function replaceItemText(state, itemId, text) {
    let index = state.items.findIndex((item) => item.nativeRef.itemId === itemId);
    if (index < 0)
      return state;
    let items = [...state.items];
    return items[index] = { ...items[index], text: boundedText(text), status: "running" }, { ...state, items };
  }
  function findActiveTurnId(value) {
    if (Array.isArray(value))
      for (let index = value.length - 1; index >= 0; index -= 1) {
        let turn = isRecord(value[index]) ? value[index] : void 0;
        if (typeof turn?.id == "string" && (turn.status === "inProgress" || turn.status === "running"))
          return turn.id;
      }
  }
  function extractNotificationTurnId(params) {
    if (typeof params.turnId == "string")
      return params.turnId;
    if (isRecord(params.turn) && typeof params.turn.id == "string")
      return params.turn.id;
  }
  function commandText(value) {
    if (typeof value == "string")
      return value;
    if (Array.isArray(value) && value.every((part) => typeof part == "string"))
      return value.join(" ");
  }
  function projectThreadStatus(value) {
    return !isRecord(value) || typeof value.type != "string" ? "idle" : value.type === "systemError" ? "failed" : value.type !== "active" ? "idle" : Array.isArray(value.activeFlags) && value.activeFlags.includes("waitingOnApproval") ? "waiting" : "running";
  }
  function projectItemStatus(value) {
    return value === "inProgress" ? "running" : value === "failed" ? "failed" : value === "declined" ? "declined" : "completed";
  }
  function itemText(item) {
    if (typeof item.text == "string")
      return boundedText(item.text);
    if (!Array.isArray(item.content))
      return;
    let parts = item.content.flatMap((value) => isRecord(value) && value.type === "text" && typeof value.text == "string" ? [value.text] : []);
    return parts.length > 0 ? boundedText(parts.join(`
`)) : void 0;
  }
  function toolLabel(item) {
    return typeof item.tool == "string" ? item.tool : typeof item.server == "string" && typeof item.name == "string" ? `${item.server}: ${item.name}` : typeof item.command == "string" ? item.command : Array.isArray(item.command) && item.command.every((value) => typeof value == "string") ? item.command.join(" ") : typeof item.type == "string" ? item.type : void 0;
  }
  function commandExecutionText(item) {
    let command = toolLabel(item), output = typeof item.aggregatedOutput == "string" ? item.aggregatedOutput : void 0;
    return command === void 0 ? output === void 0 ? void 0 : boundedText(output) : boundedText(output === void 0 || output === "" ? command : `${command}

${output}`);
  }
  function toolCallText(item) {
    let label = toolLabel(item), error = compactUnknown(item.error), result = compactUnknown(item.result ?? item.contentItems);
    return boundedText([label, error, result].filter((value) => value !== void 0 && value !== "").join(`

`)) || void 0;
  }
  function fileChangeText(value) {
    if (!Array.isArray(value))
      return "File changes";
    let changes = value.flatMap((change) => !isRecord(change) || typeof change.path != "string" ? [] : [`[${typeof change.kind == "string" ? change.kind : "update"}] ${change.path}`]);
    return boundedText(changes.length === 0 ? "File changes" : changes.join(`
`));
  }
  function textArray(value) {
    return Array.isArray(value) && value.every((part) => typeof part == "string") ? boundedText(value.join(`
`)) : void 0;
  }
  function compactUnknown(value) {
    if (value != null) {
      if (typeof value == "string")
        return boundedText(value);
      try {
        return boundedText(JSON.stringify(value, void 0, 2));
      } catch {
        return;
      }
    }
  }
  function boundedText(value) {
    return value.length <= MAX_DISPLAY_ITEM_TEXT ? value : `${value.slice(0, MAX_DISPLAY_ITEM_TEXT)}
\u2026`;
  }
  function normalizeTimestamp(value) {
    return typeof value != "number" || !Number.isFinite(value) || value <= 0 ? 0 : value < 1e10 ? value * 1e3 : value;
  }
  function isRecord(value) {
    return typeof value == "object" && value !== null && !Array.isArray(value);
  }

  // src/remote-file-content-provider.ts
  function shouldUseRemoteFileViewer(status) {
    return status.mode === "remote" && status.remoteFeatures?.fileViewer === !0;
  }
  var REMOTE_FILE_SAVE_AS_MAX_BYTES = 100 * 1024 * 1024, REMOTE_FILE_FAST_SAVE_AS_MAX_BYTES = 1024 * 1024 * 1024;
  function shouldAllowRemoteFileSaveAs(status) {
    return shouldUseRemoteFileViewer(status) && (status.transport === "LAN" || status.transport === "P2P" || status.transport === "TURN");
  }
  function remoteFileSaveAsMaxBytes(status) {
    return status.transport === "LAN" || status.transport === "P2P" ? REMOTE_FILE_FAST_SAVE_AS_MAX_BYTES : REMOTE_FILE_SAVE_AS_MAX_BYTES;
  }
  function createRemoteFileContentProvider(call, options = {}) {
    return {
      id: "dsh-remote-files",
      priority: 1e4,
      supports: () => !0,
      saveAsAllowed: () => ({
        allowed: currentSaveAsAllowed(options.saveAsAllowed),
        maxBytes: currentSaveAsMaxBytes(options.saveAsMaxBytes)
      }),
      async stat(locator, signal) {
        let value = await call("fileviewer.stat", { path: locator }, signal);
        if (value.exists)
          return {
            name: value.name,
            size: value.isDirectory ? 0 : value.size,
            mime: value.mime,
            mtimeMs: value.mtimeMs,
            isDirectory: value.isDirectory
          };
      },
      async read(locator, request) {
        if (!Number.isInteger(request.offset) || request.offset < 0) throw new Error("A non-negative integer offset is required.");
        if (!Number.isInteger(request.length) || request.length <= 0) throw new Error("A positive integer length is required.");
        let chunks = [], received = 0;
        for (; received < request.length; ) {
          request.signal.throwIfAborted();
          let length = Math.min(524288, request.length - received), offset = request.offset + received, range = await call("fileviewer.readRange", { path: locator, offset, length }, request.signal);
          if (range.offset !== offset) throw new Error("The Remote Host returned a mismatched file range.");
          let bytes = decodeBase64(range.data);
          if (bytes.byteLength > length) throw new Error("The Remote Host returned more file bytes than requested.");
          if (chunks.push(bytes), received += bytes.byteLength, range.eof || bytes.byteLength === 0) break;
        }
        let merged = new Uint8Array(received), cursor = 0;
        for (let chunk of chunks)
          merged.set(chunk, cursor), cursor += chunk.byteLength;
        return merged;
      },
      async list(locator, signal) {
        return (await call("fileviewer.list", { path: locator }, signal)).entries.map((entry) => ({
          locator: entry.path,
          name: entry.name,
          size: entry.isDirectory ? 0 : entry.size ?? 0,
          mtimeMs: entry.mtimeMs,
          isDirectory: entry.isDirectory
        }));
      }
    };
  }
  function currentSaveAsAllowed(value) {
    return typeof value == "function" ? value() : value === !0;
  }
  function currentSaveAsMaxBytes(value) {
    return typeof value == "function" ? value() : value ?? REMOTE_FILE_SAVE_AS_MAX_BYTES;
  }
  function decodeBase64(value) {
    let binary = atob(value), bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  // src/control-route.ts
  var CONTROL_RPC_PREFIX = "/ds-harness-remote";

  // src/client.ts
  var clientModuleId = "ds-harness-remote", localeNamespace = "ds-harness-remote", en = {
    pluginTitle: "DeepSeek Remote",
    pluginDescription: "Connect once. Available anytime.",
    expandSettings: "Show settings: {name}",
    collapseSettings: "Hide settings: {name}",
    unsaved: "Unsaved",
    associated: "Authorized",
    authorizationComplete: "Authorization complete",
    loadingSettings: "Loading DeepSeek Remote settings\u2026",
    mode: "Mode",
    pluginMode: "Plugin mode",
    host: "Host",
    client: "Client",
    authorization: "Authorization",
    account: "Account",
    hostRegistrationCode: "One-time device authorization code",
    ownedDeviceAuthorization: "Owned device",
    authorizedOn: "{role} is authorized on {serverUrl}.",
    readOnly: "This DSH profile does not provide writable user settings.",
    discard: "Discard",
    save: "Save",
    saving: "Saving\u2026",
    signOut: "Sign out",
    signingOut: "Signing out\u2026",
    serverUrl: "Server URL",
    serverUrlHint: "HTTPS origin used for account authorization and encrypted relay.",
    serverSaved: "Server address saved. Restart DSH to apply it.",
    authorizeFromRemote: "Sign in from the Remote entry in the sidebar, then return here to manage this device.",
    authorizationMethod: "Authorization method",
    accountPassword: "Account password",
    registrationCode: "Device authorization code",
    registrationCodeHint: "Generate it after signing in on the Server website. Use it once to connect this device.",
    accountHint: "The account must belong to the selected Server.",
    password: "Password",
    passwordHint: "Used only for this HTTPS authorization request and never saved.",
    modeSavedNeedsAuthorization: "Mode saved. Authorize {role} before connecting. Existing registrations were kept.",
    modeSavedReused: "Mode saved. Existing registration reused. Restart Harness to apply.",
    modeSavedOwnedRole: "Mode saved. This owned device was authorized automatically. Restart Harness to apply.",
    enterRegistrationCode: "Enter the device authorization code.",
    enterAccountPassword: "Enter the Server account and password.",
    associationSaved: "Associated. Restart Harness to apply.",
    signedOut: "Signed out. Restart Harness to disconnect this mode.",
    remoteRequestFailed: "Remote mode request failed.",
    switchTarget: "Switch Local / Remote Harness target",
    harnessTarget: "Harness target",
    close: "Close",
    refreshRemote: "Refresh remote hosts",
    refreshRemoteShort: "Refresh",
    local: "Local",
    remoteTarget: "Remote \xB7 {name}",
    thisMachineLocal: "This machine (Local)",
    currentDevice: "Current device",
    noRemoteHosts: "No authorized remote Host for this account.",
    online: "Online",
    offline: "Offline",
    thisMachineHost: "This machine as Remote Host",
    connected: "Connected",
    connectedAs: "Connected as {account}",
    connection: "Connection",
    checkingConnection: "Checking connection\u2026",
    connecting: "Connecting",
    reconnecting: "Reconnecting",
    lastActive: "Last active: {time}",
    neverConnected: "No successful connection yet.",
    reconnect: "Reconnect",
    reconnectingAction: "Reconnecting\u2026",
    reconnectStarted: "Reconnect requested.",
    connectionAuthorizationExpired: "Authorization expired. Sign out and authorize this Host again.",
    connectionDeviceRevoked: "This Host was revoked on the Server. Sign out and authorize it again.",
    connectionOwnershipRequired: "The Server no longer recognizes this Host as an owned device.",
    connectionRateLimited: "The Server is receiving too many requests. Automatic retry will continue.",
    connectionVersionMismatch: "The Plugin and Server protocol versions are incompatible.",
    connectionInvalidResponse: "The Server returned an invalid control message.",
    connectionReachability: "Cannot reach the Server. Check the network and Server address.",
    connectionUnexpected: "The connection stopped unexpectedly. Automatic retry will continue.",
    hostSignInHint: "Sign in to authorize this Host on the selected Server.",
    checkingHost: "Checking Host registration\u2026",
    hostUnavailable: "Host unavailable: {error}",
    serverAccountEmail: "Server account email",
    serverAccountPassword: "Server account password",
    signInRegisterHost: "Sign in and register Host",
    signingIn: "Signing in\u2026",
    useRegistrationCode: "Use connection code",
    registering: "Registering\u2026",
    remoteEntry: "Remote",
    remoteTitle: "Open a remote workspace",
    remoteDescription: "Choose one of your Hosts, then select a working directory. The Harness interface stays on this device.",
    chooseHost: "Host",
    chooseDirectory: "Working directory",
    selectHostHint: "Select an online Host to browse its directories.",
    emptyDirectory: "This directory has no visible subdirectories.",
    openWorkspace: "Open workspace",
    openingWorkspace: "Opening\u2026",
    loadingDirectory: "Loading directories\u2026",
    remoteProgressCheckingHost: "Checking Host",
    remoteProgressCheckingHostDetail: "Finding the selected device and checking whether it is online.",
    remoteProgressAuthorizingPeer: "Verifying authorization",
    remoteProgressAuthorizingPeerDetail: "Confirming account membership and pinned Host identity.",
    remoteProgressOpeningChannel: "Opening encrypted channel",
    remoteProgressOpeningChannelDetail: "Trying LAN, P2P, TURN, then Relay if needed.",
    remoteProgressProbeLan: "Probing LAN",
    remoteProgressProbeLanDetail: "Checking whether the Host is reachable on the local network.",
    remoteProgressProbeP2p: "Probing P2P",
    remoteProgressProbeP2pDetail: "Checking direct internet candidates between this device and the Host.",
    remoteProgressProbeTurn: "Probing TURN",
    remoteProgressProbeTurnDetail: "Checking the TURN relay path for restricted networks.",
    remoteProgressProbeRelay: "Preparing Relay",
    remoteProgressProbeRelayDetail: "Preparing the encrypted Server Relay fallback if direct paths do not open.",
    remoteProgressTryingPrefix: "Trying ",
    remoteProgressUsingPrefix: "Using ",
    remoteProgressLoadingWorkspaces: "Loading workspaces",
    remoteProgressLoadingWorkspacesDetail: "Reading the remote Harness workspace list through the tunnel.",
    remoteProgressOpeningWorkspace: "Opening workspace",
    remoteProgressOpeningWorkspaceDetail: "Asking the Host to prepare the selected working directory.",
    remoteProgressSwitchingWorkspace: "Switching interface",
    remoteProgressSwitchingWorkspaceDetail: "Handing the remote workspace to the local Harness UI.",
    remoteProgressReady: "Ready",
    remoteProgressReadyDetail: "The remote Host is connected and encrypted.",
    backToHosts: "Choose another Host",
    currentDirectory: "Selected directory",
    directoryTruncated: "Only part of this directory could be shown.",
    pluginVersion: "Plugin {version}",
    harnessVersion: "Harness {version}",
    existingWorkspaces: "Existing workspaces",
    remotePathPlaceholder: "/home/user/project",
    remotePathHint: "Enter an absolute directory path on the selected Host.",
    noRemoteWorkspaces: "No remote workspaces yet. Use + to add one.",
    activeRemote: "{name}",
    exitRemote: "Exit",
    addRemoteWorkspace: "Add remote workspace",
    remoteModeLabel: "Remote mode \xB7 {name}",
    remoteNetworkP2p: "P2P",
    remoteNetworkTurn: "TURN",
    remoteNetworkRelay: "Relay",
    remoteNetworkLan: "LAN",
    remoteNetworkOffline: "Disconnected",
    remoteLinkEncrypted: "End-to-end encrypted",
    connectionRouteTitle: "Connection route",
    connectionRouteFrom: "From",
    connectionRouteVia: "Via",
    connectionRouteTo: "To",
    connectionRouteCurrentDevice: "This device",
    connectionRouteLan: "Local network",
    connectionRouteP2p: "Direct internet path",
    connectionRouteTurn: "TURN relay service",
    connectionRouteRelay: "Remote Server",
    connectionRouteHost: "Work computer running Harness",
    connectionRouteLanDetail: "Direct transfer over the local network",
    connectionRouteP2pDetail: "Direct transfer over the internet",
    connectionRouteTurnDetail: "Encrypted transfer through the TURN service",
    connectionRouteRelayDetail: "Encrypted transfer through the Remote Server",
    connectionRouteEncrypted: "Application data remains end-to-end encrypted along this route.",
    connectionDetailsConnection: "Connection",
    connectionDetailsWebRtc: "Network details \xB7 WebRTC / ICE",
    connectionId: "Connection ID",
    connectedAt: "Established",
    preferredTransports: "Attempt order",
    controlChannel: "Control channel",
    controlAddress: "Control address",
    controlStateConnecting: "Connecting",
    controlStateOpen: "Connected",
    controlStateClosing: "Closing",
    controlStateClosed: "Closed",
    peerState: "Peer connection",
    dataChannel: "DataChannel",
    localCandidate: "Local candidate",
    remoteCandidate: "Remote candidate",
    localAddress: "Local address",
    remoteAddress: "Remote address",
    networkProtocol: "Network protocol",
    relayProtocol: "TURN protocol",
    roundTripTime: "Round-trip time",
    availableBitrate: "Available outgoing bitrate",
    bytesSent: "WebRTC bytes sent",
    bytesReceived: "WebRTC bytes received",
    notProvided: "Not provided",
    candidateHost: "Local address \xB7 host",
    candidateSrflx: "Public address \xB7 srflx",
    candidatePrflx: "Peer address \xB7 prflx",
    candidateRelay: "TURN address \xB7 relay",
    openLocalWorkspaces: "Open local workspaces",
    clientSignInHint: "Sign in to this Server to list your remote Hosts.",
    signInClient: "DeepSeek Harness Remote",
    signInClientDescription: "Connect once. Available anytime.",
    startSignIn: "Start sign-in",
    allowControlCurrentDevice: "Allow control of this device",
    exitRemoteAccount: "Sign out",
    githubLogin: "GitHub QR",
    zhihuLogin: "Zhihu QR",
    scanWithGitHub: "Scan to continue with GitHub",
    scanWithZhihu: "Scan to continue with Zhihu",
    openInBrowser: "Continue in browser",
    scanLoginHint: "Authorize on your phone. This window will continue automatically.",
    currentServiceAddress: "Current service address:",
    accountPasswordLogin: "Password",
    qrLoginExpired: "This QR code expired. Refresh it to continue.",
    refreshQrCode: "Refresh QR code",
    codexEntry: "CodeX",
    codexTitle: "CodeX",
    codexVirtualWorkspace: "CodeX virtual workspace",
    codexVirtualSessions: "Sessions",
    codexWorkspaceTitle: "Workspaces",
    codexWorkspaceMode: "Workspace source",
    codexHarnessMode: "Harness",
    codexSwitchToCodex: "Switch workspace source to CodeX",
    codexSwitchToHarness: "Return to Harness workspaces",
    codexDescription: "Threads on the connected Host. Data stays in Codex and is shown here as a separate view.",
    codexLoading: "Loading Codex sessions\u2026",
    codexEmpty: "No Codex threads are available in the Host allowed roots.",
    codexBack: "Back to sessions",
    codexRefresh: "Refresh",
    codexLoadMore: "Load more",
    codexNewThread: "New thread",
    codexNewPath: "Absolute Host project path",
    codexRename: "Rename",
    codexRenamePrompt: "New Codex thread name",
    codexFork: "Fork",
    codexArchive: "Archive",
    codexActions: "Session actions",
    codexUnarchive: "Restore",
    codexShowArchived: "Archived",
    codexShowActive: "Active",
    codexPromptPlaceholder: "Continue this Codex session\u2026",
    codexSend: "Send",
    codexSending: "Sending\u2026",
    codexStop: "Stop",
    codexLive: "Live",
    codexReconnecting: "Reconnecting to Codex\u2026",
    codexApproval: "Codex needs a one-time approval",
    codexAllowOnce: "Allow once",
    codexDeny: "Deny",
    codexUnknownItem: "Unsupported Codex item: {type}",
    codexNoMessages: "This thread has no displayable history yet.",
    codexUnavailable: "Codex is disabled or unavailable on the connected Host.",
    codexImagesUnsupported: "CodeX image attachments are not supported in this bridge yet.",
    codexFileOpenUnavailable: "Opening CodeX-produced files from this view is not available yet.",
    codexRequestCancelled: "CodeX request was cancelled.",
    codexYou: "You",
    codexCommand: "Command",
    codexFiles: "Files",
    codexTool: "Tool",
    codexStatus: "Status",
    codexRunning: "Running",
    codexWaiting: "Waiting for approval",
    codexFailed: "Failed",
    codexIdle: "Idle",
    codexPinned: "Pinned"
  }, zh = {
    pluginTitle: "DeepSeek \u8FDC\u7A0B\u8FDE\u63A5",
    pluginDescription: "\u4E00\u6B21\u8FDE\u63A5\uFF0C\u968F\u65F6\u53EF\u7528\u3002",
    expandSettings: "\u5C55\u5F00\u8BBE\u7F6E\uFF1A{name}",
    collapseSettings: "\u6536\u8D77\u8BBE\u7F6E\uFF1A{name}",
    unsaved: "\u672A\u4FDD\u5B58",
    associated: "\u5DF2\u6388\u6743",
    authorizationComplete: "\u5DF2\u5B8C\u6210\u6388\u6743",
    loadingSettings: "\u6B63\u5728\u52A0\u8F7D DeepSeek \u8FDC\u7A0B\u8FDE\u63A5\u8BBE\u7F6E\u2026",
    mode: "\u6A21\u5F0F",
    pluginMode: "\u63D2\u4EF6\u6A21\u5F0F",
    host: "\u4E3B\u673A",
    client: "Client",
    authorization: "\u6388\u6743",
    account: "\u8D26\u53F7",
    hostRegistrationCode: "\u4E00\u6B21\u6027\u8BBE\u5907\u6388\u6743\u7801",
    ownedDeviceAuthorization: "\u81EA\u6709\u8BBE\u5907",
    authorizedOn: "{role}\u5DF2\u7ECF\u5728 {serverUrl} \u5B8C\u6210\u6388\u6743\u3002",
    readOnly: "\u6B64 DSH profile \u4E0D\u63D0\u4F9B\u53EF\u5199\u7684\u7528\u6237\u8BBE\u7F6E\u3002",
    discard: "\u653E\u5F03\u4FEE\u6539",
    save: "\u4FDD\u5B58",
    saving: "\u4FDD\u5B58\u4E2D\u2026",
    signOut: "\u9000\u51FA\u6388\u6743",
    signingOut: "\u6B63\u5728\u9000\u51FA\u2026",
    serverUrl: "Server \u5730\u5740",
    serverUrlHint: "\u7528\u4E8E\u8D26\u53F7\u6388\u6743\u548C\u52A0\u5BC6\u4E2D\u7EE7\u7684 HTTPS \u5730\u5740\u3002",
    serverSaved: "Server \u5730\u5740\u5DF2\u4FDD\u5B58\uFF0C\u91CD\u542F DSH \u540E\u751F\u6548\u3002",
    authorizeFromRemote: "\u8BF7\u4ECE\u4FA7\u680F Remote \u5165\u53E3\u767B\u5F55\uFF0C\u767B\u5F55\u540E\u53EF\u5728\u8FD9\u91CC\u7BA1\u7406\u5F53\u524D\u8BBE\u5907\u3002",
    authorizationMethod: "\u6388\u6743\u65B9\u5F0F",
    accountPassword: "\u8D26\u53F7\u5BC6\u7801",
    registrationCode: "\u8BBE\u5907\u6388\u6743\u7801",
    registrationCodeHint: "\u767B\u5F55 Server \u7F51\u9875\u540E\u751F\u6210\uFF0C\u7528\u4E00\u6B21\u5373\u53EF\u8FDE\u63A5\u8FD9\u53F0\u8BBE\u5907\u3002",
    accountHint: "\u8D26\u53F7\u5FC5\u987B\u5C5E\u4E8E\u6240\u9009 Server\u3002",
    password: "\u5BC6\u7801",
    passwordHint: "\u4EC5\u7528\u4E8E\u672C\u6B21 HTTPS \u6388\u6743\u8BF7\u6C42\uFF0C\u4E0D\u4F1A\u4FDD\u5B58\u3002",
    modeSavedNeedsAuthorization: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\u3002\u8FDE\u63A5\u524D\u8BF7\u5148\u6388\u6743 {role}\uFF1B\u5DF2\u6709\u6CE8\u518C\u4FE1\u606F\u5DF2\u4FDD\u7559\u3002",
    modeSavedReused: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\u5E76\u590D\u7528\u5DF2\u6709\u6CE8\u518C\u4FE1\u606F\u3002\u91CD\u542F Harness \u540E\u751F\u6548\u3002",
    modeSavedOwnedRole: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\uFF0C\u5E76\u5DF2\u81EA\u52A8\u6388\u6743\u6B64\u81EA\u6709\u8BBE\u5907\u3002\u91CD\u542F Harness \u540E\u751F\u6548\u3002",
    enterRegistrationCode: "\u8BF7\u8F93\u5165\u8BBE\u5907\u6388\u6743\u7801\u3002",
    enterAccountPassword: "\u8BF7\u8F93\u5165 Server \u8D26\u53F7\u548C\u5BC6\u7801\u3002",
    associationSaved: "\u5173\u8054\u6210\u529F\u3002\u91CD\u542F Harness \u540E\u751F\u6548\u3002",
    signedOut: "\u5DF2\u9000\u51FA\u6388\u6743\u3002\u91CD\u542F Harness \u540E\u5C06\u65AD\u5F00\u6B64\u6A21\u5F0F\u3002",
    remoteRequestFailed: "\u8FDC\u7A0B\u6A21\u5F0F\u8BF7\u6C42\u5931\u8D25\u3002",
    switchTarget: "\u5207\u6362\u672C\u5730\u6216\u8FDC\u7A0B Harness",
    harnessTarget: "Harness \u76EE\u6807",
    close: "\u5173\u95ED",
    refreshRemote: "\u5237\u65B0\u8FDC\u7A0B\u4E3B\u673A",
    refreshRemoteShort: "\u5237\u65B0",
    local: "\u672C\u5730",
    remoteTarget: "\u8FDC\u7A0B \xB7 {name}",
    thisMachineLocal: "\u6B64\u8BBE\u5907\uFF08\u672C\u5730\uFF09",
    currentDevice: "\u5F53\u524D\u8BBE\u5907",
    noRemoteHosts: "\u6B64\u8D26\u53F7\u6CA1\u6709\u5DF2\u6388\u6743\u7684\u8FDC\u7A0B Host\u3002",
    online: "\u5728\u7EBF",
    offline: "\u79BB\u7EBF",
    thisMachineHost: "\u5C06\u6B64\u8BBE\u5907\u4F5C\u4E3A\u8FDC\u7A0B Host",
    connected: "\u5DF2\u8FDE\u63A5",
    connectedAs: "\u5DF2\u4F7F\u7528 {account} \u8FDE\u63A5",
    connection: "\u8FDE\u63A5\u72B6\u6001",
    checkingConnection: "\u6B63\u5728\u68C0\u67E5\u8FDE\u63A5\u2026",
    connecting: "\u6B63\u5728\u8FDE\u63A5",
    reconnecting: "\u6B63\u5728\u91CD\u8FDE",
    lastActive: "\u6700\u540E\u6D3B\u8DC3\uFF1A{time}",
    neverConnected: "\u5C1A\u672A\u6210\u529F\u8FDE\u63A5\u8FC7\u3002",
    reconnect: "\u624B\u52A8\u91CD\u8FDE",
    reconnectingAction: "\u6B63\u5728\u91CD\u8FDE\u2026",
    reconnectStarted: "\u5DF2\u53D1\u8D77\u91CD\u8FDE\u3002",
    connectionAuthorizationExpired: "\u6388\u6743\u5DF2\u5931\u6548\uFF0C\u8BF7\u9000\u51FA\u6388\u6743\u540E\u91CD\u65B0\u8FDE\u63A5\u6B64 Host\u3002",
    connectionDeviceRevoked: "\u6B64 Host \u5DF2\u5728 Server \u4E0A\u88AB\u64A4\u9500\uFF0C\u8BF7\u9000\u51FA\u6388\u6743\u540E\u91CD\u65B0\u8FDE\u63A5\u3002",
    connectionOwnershipRequired: "Server \u5DF2\u4E0D\u518D\u5C06\u6B64 Host \u8BC6\u522B\u4E3A\u5F53\u524D\u8D26\u53F7\u7684\u8BBE\u5907\u3002",
    connectionRateLimited: "Server \u8BF7\u6C42\u8FC7\u591A\uFF0C\u63D2\u4EF6\u5C06\u7EE7\u7EED\u81EA\u52A8\u91CD\u8BD5\u3002",
    connectionVersionMismatch: "Plugin \u4E0E Server \u7684\u534F\u8BAE\u7248\u672C\u4E0D\u517C\u5BB9\u3002",
    connectionInvalidResponse: "Server \u8FD4\u56DE\u4E86\u65E0\u6548\u7684\u63A7\u5236\u6D88\u606F\u3002",
    connectionReachability: "\u65E0\u6CD5\u8FDE\u63A5 Server\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u548C Server \u5730\u5740\u3002",
    connectionUnexpected: "\u8FDE\u63A5\u610F\u5916\u4E2D\u65AD\uFF0C\u63D2\u4EF6\u5C06\u7EE7\u7EED\u81EA\u52A8\u91CD\u8BD5\u3002",
    hostSignInHint: "\u767B\u5F55\u540E\u5728\u6240\u9009 Server \u4E0A\u6388\u6743\u6B64 Host\u3002",
    checkingHost: "\u6B63\u5728\u68C0\u67E5 Host \u6CE8\u518C\u72B6\u6001\u2026",
    hostUnavailable: "Host \u4E0D\u53EF\u7528\uFF1A{error}",
    serverAccountEmail: "Server \u8D26\u53F7\u90AE\u7BB1",
    serverAccountPassword: "Server \u8D26\u53F7\u5BC6\u7801",
    signInRegisterHost: "\u767B\u5F55\u5E76\u6CE8\u518C Host",
    signingIn: "\u6B63\u5728\u767B\u5F55\u2026",
    useRegistrationCode: "\u4F7F\u7528\u8FDE\u63A5\u7801",
    registering: "\u6B63\u5728\u6CE8\u518C\u2026",
    remoteEntry: "Remote",
    remoteTitle: "\u6253\u5F00\u8FDC\u7AEF\u5DE5\u4F5C\u533A",
    remoteDescription: "\u9009\u62E9\u60F3\u8981\u8FDE\u63A5\u4E3B\u673A\u548C\u5DE5\u4F5C\u76EE\u5F55\u3002",
    chooseHost: "\u4E3B\u673A",
    chooseDirectory: "\u5DE5\u4F5C\u76EE\u5F55",
    selectHostHint: "\u9009\u62E9\u4E00\u53F0\u5728\u7EBF\u4E3B\u673A\u4EE5\u6D4F\u89C8\u5176\u76EE\u5F55\u3002",
    emptyDirectory: "\u8FD9\u4E2A\u76EE\u5F55\u4E0B\u6CA1\u6709\u53EF\u89C1\u7684\u5B50\u76EE\u5F55\u3002",
    openWorkspace: "\u6253\u5F00\u5DE5\u4F5C\u533A",
    openingWorkspace: "\u6B63\u5728\u6253\u5F00\u2026",
    loadingDirectory: "\u6B63\u5728\u52A0\u8F7D\u76EE\u5F55\u2026",
    remoteProgressCheckingHost: "\u6B63\u5728\u68C0\u67E5 Host",
    remoteProgressCheckingHostDetail: "\u6B63\u5728\u67E5\u627E\u6240\u9009\u8BBE\u5907\u5E76\u786E\u8BA4\u662F\u5426\u5728\u7EBF\u3002",
    remoteProgressAuthorizingPeer: "\u6B63\u5728\u9A8C\u8BC1\u6388\u6743",
    remoteProgressAuthorizingPeerDetail: "\u6B63\u5728\u786E\u8BA4\u8D26\u53F7\u6210\u5458\u5173\u7CFB\u548C\u5DF2\u56FA\u5B9A\u7684 Host \u8EAB\u4EFD\u3002",
    remoteProgressOpeningChannel: "\u6B63\u5728\u5EFA\u7ACB\u52A0\u5BC6\u901A\u9053",
    remoteProgressOpeningChannelDetail: "\u4F9D\u6B21\u5C1D\u8BD5\u5C40\u57DF\u7F51\u3001P2P\u3001TURN\uFF0C\u5FC5\u8981\u65F6\u56DE\u843D\u5230 Relay\u3002",
    remoteProgressProbeLan: "\u6B63\u5728\u63A2\u6D4B\u5C40\u57DF\u7F51",
    remoteProgressProbeLanDetail: "\u68C0\u67E5\u5F53\u524D\u8BBE\u5907\u662F\u5426\u80FD\u901A\u8FC7\u672C\u5730\u7F51\u7EDC\u76F4\u8FDE Host\u3002",
    remoteProgressProbeP2p: "\u6B63\u5728\u63A2\u6D4B P2P",
    remoteProgressProbeP2pDetail: "\u68C0\u67E5\u5F53\u524D\u8BBE\u5907\u548C Host \u4E4B\u95F4\u7684\u4E92\u8054\u7F51\u76F4\u8FDE\u5019\u9009\u8DEF\u5F84\u3002",
    remoteProgressProbeTurn: "\u6B63\u5728\u63A2\u6D4B TURN",
    remoteProgressProbeTurnDetail: "\u68C0\u67E5\u53D7\u9650\u7F51\u7EDC\u4E0B\u53EF\u7528\u7684 TURN \u4E2D\u7EE7\u8DEF\u5F84\u3002",
    remoteProgressProbeRelay: "\u6B63\u5728\u51C6\u5907 Relay",
    remoteProgressProbeRelayDetail: "\u5982\u679C\u76F4\u8FDE\u8DEF\u5F84\u672A\u6253\u5F00\uFF0C\u5C06\u56DE\u843D\u5230\u52A0\u5BC6\u7684 Server Relay\u3002",
    remoteProgressTryingPrefix: "\u6B63\u5728\u5C1D\u8BD5 ",
    remoteProgressUsingPrefix: "\u5DF2\u8FDE\u63A5 ",
    remoteProgressLoadingWorkspaces: "\u6B63\u5728\u52A0\u8F7D\u5DE5\u4F5C\u533A",
    remoteProgressLoadingWorkspacesDetail: "\u901A\u8FC7\u96A7\u9053\u8BFB\u53D6\u8FDC\u7AEF Harness \u5DE5\u4F5C\u533A\u5217\u8868\u3002",
    remoteProgressOpeningWorkspace: "\u6B63\u5728\u6253\u5F00\u5DE5\u4F5C\u533A",
    remoteProgressOpeningWorkspaceDetail: "\u6B63\u5728\u8BF7\u6C42 Host \u51C6\u5907\u6240\u9009\u5DE5\u4F5C\u76EE\u5F55\u3002",
    remoteProgressSwitchingWorkspace: "\u6B63\u5728\u5207\u6362\u754C\u9762",
    remoteProgressSwitchingWorkspaceDetail: "\u6B63\u5728\u628A\u8FDC\u7AEF\u5DE5\u4F5C\u533A\u4EA4\u7ED9\u672C\u5730 Harness UI\u3002",
    remoteProgressReady: "\u5DF2\u5C31\u7EEA",
    remoteProgressReadyDetail: "\u8FDC\u7AEF Host \u5DF2\u8FDE\u63A5\uFF0C\u7AEF\u5230\u7AEF\u52A0\u5BC6\u5DF2\u5EFA\u7ACB\u3002",
    backToHosts: "\u9009\u62E9\u5176\u4ED6\u4E3B\u673A",
    currentDirectory: "\u5DF2\u9009\u76EE\u5F55",
    directoryTruncated: "\u76EE\u5F55\u5185\u5BB9\u8F83\u591A\uFF0C\u76EE\u524D\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206\u3002",
    pluginVersion: "\u63D2\u4EF6 {version}",
    harnessVersion: "Harness {version}",
    existingWorkspaces: "\u5DF2\u6709\u5DE5\u4F5C\u533A",
    remotePathPlaceholder: "/home/user/project",
    remotePathHint: "\u8F93\u5165\u6240\u9009\u4E3B\u673A\u4E0A\u7684\u7EDD\u5BF9\u76EE\u5F55\u8DEF\u5F84\u3002",
    noRemoteWorkspaces: "\u8FD9\u53F0\u4E3B\u673A\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\uFF0C\u70B9\u51FB + \u6DFB\u52A0\u3002",
    activeRemote: "{name}",
    exitRemote: "\u9000\u51FA",
    addRemoteWorkspace: "\u6DFB\u52A0\u8FDC\u7A0B\u5DE5\u4F5C\u533A",
    remoteModeLabel: "\u8FDC\u7A0B\u6A21\u5F0F \xB7 {name}",
    remoteNetworkP2p: "P2P",
    remoteNetworkTurn: "TURN",
    remoteNetworkRelay: "\u4E2D\u7EE7",
    remoteNetworkLan: "\u5C40\u57DF\u7F51",
    remoteNetworkOffline: "\u5DF2\u65AD\u5F00",
    remoteLinkEncrypted: "\u7AEF\u5230\u7AEF\u52A0\u5BC6",
    connectionRouteTitle: "\u8FDE\u63A5\u7EBF\u8DEF",
    connectionRouteFrom: "\u8D77\u70B9",
    connectionRouteVia: "\u7ECF\u8FC7",
    connectionRouteTo: "\u7EC8\u70B9",
    connectionRouteCurrentDevice: "\u5F53\u524D\u8BBE\u5907",
    connectionRouteLan: "\u540C\u4E00\u5C40\u57DF\u7F51",
    connectionRouteP2p: "\u4E92\u8054\u7F51\u76F4\u8FDE",
    connectionRouteTurn: "TURN \u4E2D\u7EE7\u670D\u52A1",
    connectionRouteRelay: "Remote Server",
    connectionRouteHost: "\u8FD0\u884C Harness \u7684\u5DE5\u4F5C\u7535\u8111",
    connectionRouteLanDetail: "\u5728\u672C\u5730\u7F51\u7EDC\u4E2D\u76F4\u63A5\u4F20\u8F93",
    connectionRouteP2pDetail: "\u901A\u8FC7\u4E92\u8054\u7F51\u76F4\u63A5\u4F20\u8F93",
    connectionRouteTurnDetail: "\u901A\u8FC7 TURN \u670D\u52A1\u8F6C\u53D1\u52A0\u5BC6\u6570\u636E",
    connectionRouteRelayDetail: "\u901A\u8FC7 Remote Server \u8F6C\u53D1\u52A0\u5BC6\u6570\u636E",
    connectionRouteEncrypted: "\u7EBF\u8DEF\u4E0A\u7684\u4E1A\u52A1\u6570\u636E\u4FDD\u6301\u7AEF\u5230\u7AEF\u52A0\u5BC6\u3002",
    connectionDetailsConnection: "\u8FDE\u63A5",
    connectionDetailsWebRtc: "\u7F51\u7EDC\u8BE6\u60C5 \xB7 WebRTC / ICE",
    connectionId: "\u8FDE\u63A5\u7F16\u53F7",
    connectedAt: "\u5EFA\u7ACB\u65F6\u95F4",
    preferredTransports: "\u5C1D\u8BD5\u987A\u5E8F",
    controlChannel: "\u63A7\u5236\u901A\u9053",
    controlAddress: "\u63A7\u5236\u5730\u5740",
    controlStateConnecting: "\u8FDE\u63A5\u4E2D",
    controlStateOpen: "\u5DF2\u8FDE\u63A5",
    controlStateClosing: "\u6B63\u5728\u5173\u95ED",
    controlStateClosed: "\u5DF2\u5173\u95ED",
    peerState: "\u8FDE\u63A5\u72B6\u6001",
    dataChannel: "DataChannel",
    localCandidate: "\u672C\u5730\u5019\u9009",
    remoteCandidate: "\u8FDC\u7AEF\u5019\u9009",
    localAddress: "\u672C\u5730\u5730\u5740",
    remoteAddress: "\u8FDC\u7AEF\u5730\u5740",
    networkProtocol: "\u4F20\u8F93\u534F\u8BAE",
    relayProtocol: "TURN \u534F\u8BAE",
    roundTripTime: "\u5F80\u8FD4\u65F6\u5EF6",
    availableBitrate: "\u53EF\u7528\u4E0A\u884C\u5E26\u5BBD",
    bytesSent: "WebRTC \u5DF2\u53D1\u9001",
    bytesReceived: "WebRTC \u5DF2\u63A5\u6536",
    notProvided: "\u672A\u63D0\u4F9B",
    candidateHost: "\u672C\u5730\u5730\u5740 \xB7 host",
    candidateSrflx: "\u516C\u7F51\u5730\u5740 \xB7 srflx",
    candidatePrflx: "\u5BF9\u7AEF\u5730\u5740 \xB7 prflx",
    candidateRelay: "TURN \u5730\u5740 \xB7 relay",
    openLocalWorkspaces: "\u6253\u5F00\u672C\u5730\u5DE5\u4F5C\u533A",
    clientSignInHint: "\u767B\u5F55 Server \u540E\u5373\u53EF\u67E5\u770B\u81EA\u5DF1\u7684\u8FDC\u7AEF\u4E3B\u673A\u3002",
    signInClient: "DeepSeek Harness Remote",
    signInClientDescription: "\u4E00\u6B21\u8FDE\u63A5\uFF0C\u968F\u65F6\u53EF\u7528\u3002",
    startSignIn: "\u5F00\u59CB\u767B\u5F55",
    allowControlCurrentDevice: "\u5141\u8BB8\u63A7\u5236\u5F53\u524D\u8BBE\u5907",
    exitRemoteAccount: "\u9000\u51FA\u8D26\u53F7",
    githubLogin: "GitHub \u626B\u7801",
    zhihuLogin: "\u77E5\u4E4E\u626B\u7801",
    scanWithGitHub: "\u4F7F\u7528 GitHub \u626B\u7801\u767B\u5F55",
    scanWithZhihu: "\u4F7F\u7528\u77E5\u4E4E\u626B\u7801\u767B\u5F55",
    openInBrowser: "\u5728\u6D4F\u89C8\u5668\u4E2D\u7EE7\u7EED",
    scanLoginHint: "\u8BF7\u5728\u624B\u673A\u4E0A\u5B8C\u6210\u6388\u6743\uFF0C\u6B64\u7A97\u53E3\u4F1A\u81EA\u52A8\u7EE7\u7EED\u3002",
    currentServiceAddress: "\u5F53\u524D\u670D\u52A1\u5730\u5740\uFF1A",
    accountPasswordLogin: "\u8D26\u53F7\u5BC6\u7801",
    qrLoginExpired: "\u4E8C\u7EF4\u7801\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5\u3002",
    refreshQrCode: "\u5237\u65B0\u4E8C\u7EF4\u7801",
    codexEntry: "CodeX",
    codexTitle: "CodeX",
    codexVirtualWorkspace: "CodeX \u865A\u62DF\u5DE5\u4F5C\u533A",
    codexVirtualSessions: "Sessions",
    codexWorkspaceTitle: "\u5DE5\u4F5C\u533A",
    codexWorkspaceMode: "\u5DE5\u4F5C\u533A\u6765\u6E90",
    codexHarnessMode: "Harness",
    codexSwitchToCodex: "\u5207\u6362\u5230 CodeX \u5DE5\u4F5C\u533A",
    codexSwitchToHarness: "\u8FD4\u56DE Harness \u5DE5\u4F5C\u533A",
    codexDescription: "\u5C55\u793A\u5DF2\u8FDE\u63A5 Host \u4E0A\u7684 Codex Thread\u3002\u6570\u636E\u4ECD\u7531 Codex \u4FDD\u5B58\uFF0C\u5E76\u5728\u8FD9\u91CC\u4F5C\u4E3A\u72EC\u7ACB\u89C6\u56FE\u5448\u73B0\u3002",
    codexLoading: "\u6B63\u5728\u52A0\u8F7D Codex \u4F1A\u8BDD\u2026",
    codexEmpty: "Host \u5141\u8BB8\u7684\u6839\u76EE\u5F55\u4E2D\u6CA1\u6709\u53EF\u5C55\u793A\u7684 Codex Thread\u3002",
    codexBack: "\u8FD4\u56DE\u4F1A\u8BDD\u5217\u8868",
    codexRefresh: "\u5237\u65B0",
    codexLoadMore: "\u52A0\u8F7D\u66F4\u591A",
    codexNewThread: "\u65B0\u5EFA Thread",
    codexNewPath: "Host \u4E0A\u7684\u9879\u76EE\u7EDD\u5BF9\u8DEF\u5F84",
    codexRename: "\u6539\u540D",
    codexRenamePrompt: "\u65B0\u7684 Codex Thread \u540D\u79F0",
    codexFork: "\u6D3E\u751F",
    codexArchive: "\u5F52\u6863",
    codexActions: "\u4F1A\u8BDD\u64CD\u4F5C",
    codexUnarchive: "\u6062\u590D",
    codexShowArchived: "\u5DF2\u5F52\u6863",
    codexShowActive: "\u8FDB\u884C\u4E2D",
    codexPromptPlaceholder: "\u7EE7\u7EED\u8FD9\u4E2A Codex \u4F1A\u8BDD\u2026",
    codexSend: "\u53D1\u9001",
    codexSending: "\u6B63\u5728\u53D1\u9001\u2026",
    codexStop: "\u505C\u6B62",
    codexLive: "\u5B9E\u65F6",
    codexReconnecting: "\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5 Codex\u2026",
    codexApproval: "Codex \u9700\u8981\u4E00\u6B21\u6027\u6388\u6743",
    codexAllowOnce: "\u4EC5\u5141\u8BB8\u4E00\u6B21",
    codexDeny: "\u62D2\u7EDD",
    codexUnknownItem: "\u6682\u4E0D\u652F\u6301\u7684 Codex \u9879\u76EE\uFF1A{type}",
    codexNoMessages: "\u8FD9\u4E2A Thread \u8FD8\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u5386\u53F2\u3002",
    codexUnavailable: "\u5DF2\u8FDE\u63A5\u7684 Host \u672A\u542F\u7528 Codex\uFF0C\u6216 Codex \u5F53\u524D\u4E0D\u53EF\u7528\u3002",
    codexImagesUnsupported: "\u8FD9\u4E2A\u6865\u63A5\u89C6\u56FE\u6682\u4E0D\u652F\u6301 CodeX \u56FE\u7247\u9644\u4EF6\u3002",
    codexFileOpenUnavailable: "\u6682\u4E0D\u80FD\u4ECE\u8FD9\u4E2A\u89C6\u56FE\u76F4\u63A5\u6253\u5F00 CodeX \u4EA7\u51FA\u7684\u6587\u4EF6\u3002",
    codexRequestCancelled: "CodeX \u8BF7\u6C42\u5DF2\u53D6\u6D88\u3002",
    codexYou: "\u4F60",
    codexCommand: "\u547D\u4EE4",
    codexFiles: "\u6587\u4EF6",
    codexTool: "\u5DE5\u5177",
    codexStatus: "\u72B6\u6001",
    codexRunning: "\u8FD0\u884C\u4E2D",
    codexWaiting: "\u7B49\u5F85\u6388\u6743",
    codexFailed: "\u5931\u8D25",
    codexIdle: "\u7A7A\u95F2",
    codexPinned: "\u5DF2\u7F6E\u9876"
  }, defaultPreferredTransports = ["lan", "p2p", "turn", "relay"];
  function normalizedPreferredTransports(value) {
    return value === void 0 || value.length === 0 ? [...defaultPreferredTransports] : [...value];
  }
  function initialProbeTransports(value) {
    let transports = normalizedPreferredTransports(value);
    if (transports.length === 1) return transports;
    let directTransports = transports.filter((transport) => transport === "lan" || transport === "p2p");
    return directTransports.length > 0 ? directTransports : transports.includes("turn") ? ["turn"] : ["relay"];
  }
  function formatLocalTime(value) {
    let date = new Date(value);
    return Number.isNaN(date.getTime()) ? "\u2014" : date.toLocaleString();
  }
  function formatByteSize(value) {
    if (value < 1024) return `${value.toLocaleString()} B`;
    let units = ["KiB", "MiB", "GiB"], amount = value, unit = "B";
    for (let nextUnit of units)
      if (amount /= 1024, unit = nextUnit, amount < 1024) break;
    return `${amount.toLocaleString(void 0, { maximumFractionDigits: 1 })} ${unit}`;
  }
  function formatBitrate(value) {
    let units = ["bit/s", "Kbit/s", "Mbit/s", "Gbit/s"], amount = value, unitIndex = 0;
    for (; amount >= 1e3 && unitIndex < units.length - 1; )
      amount /= 1e3, unitIndex += 1;
    return `${amount.toLocaleString(void 0, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
  }
  function shortDeviceId(value) {
    return value.length <= 14 ? value : `${value.slice(0, 8)}\u2026${value.slice(-4)}`;
  }
  function transportLabel(value, t) {
    return t(value === "lan" ? "remoteNetworkLan" : value === "p2p" ? "remoteNetworkP2p" : value === "turn" ? "remoteNetworkTurn" : "remoteNetworkRelay");
  }
  function transportDiagnosticLabel(value) {
    return value === "lan" ? "LAN" : value === "p2p" ? "P2P" : value === "turn" ? "TURN" : "Relay";
  }
  function transportProgressCopy(value) {
    return value === "lan" ? { label: "remoteProgressProbeLan", detail: "remoteProgressProbeLanDetail" } : value === "p2p" ? { label: "remoteProgressProbeP2p", detail: "remoteProgressProbeP2pDetail" } : value === "turn" ? { label: "remoteProgressProbeTurn", detail: "remoteProgressProbeTurnDetail" } : { label: "remoteProgressProbeRelay", detail: "remoteProgressProbeRelayDetail" };
  }
  function connectHostProgressSteps(preferredTransports) {
    let transports = normalizedPreferredTransports(preferredTransports), probeTransports = initialProbeTransports(preferredTransports);
    return [
      { label: "remoteProgressCheckingHost", detail: "remoteProgressCheckingHostDetail", percent: 12 },
      { label: "remoteProgressAuthorizingPeer", detail: "remoteProgressAuthorizingPeerDetail", percent: 30, delayMs: 280 },
      ...probeTransports.map((transport, index) => ({
        ...transportProgressCopy(transport),
        percent: Math.min(76, 42 + index * 10),
        delayMs: 680 + index * 360,
        transports: probeTransports,
        activeTransport: transport,
        routeVerb: "trying"
      })),
      { label: "remoteProgressLoadingWorkspaces", detail: "remoteProgressLoadingWorkspacesDetail", percent: 84, delayMs: 1520, transports }
    ];
  }
  function statusTransportPreference(status) {
    if (status?.transport === "LAN") return "lan";
    if (status?.transport === "P2P") return "p2p";
    if (status?.transport === "TURN") return "turn";
    if (status?.transport === "Relay") return "relay";
  }
  function connectedProgress(status) {
    let activeTransport = statusTransportPreference(status);
    if (activeTransport !== void 0)
      return {
        label: "remoteProgressReady",
        detail: "remoteProgressReadyDetail",
        percent: 100,
        transports: [activeTransport],
        activeTransport,
        routeVerb: "using"
      };
  }
  function connectionErrorMessage(code, t) {
    return t(code === "ACCOUNT_AUTH_REQUIRED" || code === "AUTH_INVALID" || code === "TOKEN_EXPIRED" ? "connectionAuthorizationExpired" : code === "DEVICE_REVOKED" ? "connectionDeviceRevoked" : code === "DEVICE_OWNERSHIP_REQUIRED" ? "connectionOwnershipRequired" : code === "RATE_LIMITED" ? "connectionRateLimited" : code === "UNSUPPORTED_VERSION" ? "connectionVersionMismatch" : code === "INVALID_MESSAGE" ? "connectionInvalidResponse" : code === "CONNECTION_FAILED" || code === "SERVER_NOT_CONFIGURED" ? "connectionReachability" : "connectionUnexpected");
  }
  function connectionStatusLabel(status, t) {
    return status === void 0 ? t("checkingConnection") : status.online ? t("online") : status.reconnecting ? t(status.lastActiveAt === void 0 && status.error === void 0 ? "connecting" : "reconnecting") : t("offline");
  }
  function connectionStatusClass(status) {
    return status?.online ? " isOnline" : status?.reconnecting ? " isReconnecting" : status === void 0 ? "" : " isOffline";
  }
  window.__ModuleLoader__.load({
    id: clientModuleId,
    factory: (require2) => {
      let module = { exports: {} }, React = require2("react"), inject = [
        "connection",
        "slots",
        "locale",
        "workspaces",
        "sessions"
      ];
      function RemoteProgressView(props) {
        let progress = props.progress;
        if (progress === void 0) return null;
        let percent = Math.max(0, Math.min(100, Math.round(progress.percent))), activeTransportIndex = progress.transports?.findIndex((transport) => transport === progress.activeTransport) ?? -1, detail = progress.transports !== void 0 && progress.activeTransport !== void 0 && activeTransportIndex > -1 ? React.createElement(
          "span",
          { className: "dshRemoteProgressRoute" },
          props.t(progress.routeVerb === "using" ? "remoteProgressUsingPrefix" : "remoteProgressTryingPrefix"),
          progress.transports.map((transport, index) => React.createElement(
            React.Fragment,
            { key: `${transport}:${index}` },
            index === 0 ? null : React.createElement("span", { className: "dshRemoteProgressRouteArrow", "aria-hidden": !0 }, " -> "),
            React.createElement("span", {
              className: index === activeTransportIndex ? "isActive" : void 0
            }, transportDiagnosticLabel(transport))
          ))
        ) : props.t(progress.detail);
        return React.createElement(
          "div",
          {
            className: "dshRemoteProgress",
            role: "status",
            "aria-live": "polite"
          },
          React.createElement(
            "div",
            { className: "dshRemoteProgressHeader" },
            React.createElement("strong", null, props.t(progress.label)),
            React.createElement("span", null, `${percent}%`)
          ),
          React.createElement("p", null, detail),
          React.createElement("div", {
            className: "dshRemoteProgressBar",
            role: "progressbar",
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": percent,
            "aria-label": props.t(progress.label)
          }, React.createElement("span", { style: { width: `${percent}%` } }))
        );
      }
      async function runRemoteProgress(steps, setProgress, progressRun, action, readyProgress) {
        let runId = progressRun.current + 1;
        progressRun.current = runId;
        let apply2 = (next) => {
          progressRun.current === runId && setProgress(next);
        }, [first, ...rest] = steps;
        first !== void 0 && apply2(first);
        let timers = rest.map((step) => window.setTimeout(() => apply2(step), step.delayMs ?? 0));
        try {
          let result = await action();
          return apply2(readyProgress?.(result) ?? { label: "remoteProgressReady", detail: "remoteProgressReadyDetail", percent: 100 }), await new Promise((resolve) => window.setTimeout(resolve, 520)), result;
        } finally {
          timers.forEach((timer) => window.clearTimeout(timer)), progressRun.current === runId && setProgress(void 0);
        }
      }
      let openWorkspaceProgressSteps = [
        { label: "remoteProgressOpeningWorkspace", detail: "remoteProgressOpeningWorkspaceDetail", percent: 30 },
        { label: "remoteProgressSwitchingWorkspace", detail: "remoteProgressSwitchingWorkspaceDetail", percent: 74, delayMs: 520 }
      ];
      function RemotePluginOptions(props) {
        let { t } = props, [open, setOpen] = React.useState(!1), [serverUrl, setServerUrl] = React.useState(""), role = "host", [registrationCode, setRegistrationCode] = React.useState(""), [associations, setAssociations] = React.useState({}), [loaded, setLoaded] = React.useState(!1), [writable, setWritable] = React.useState(!1), [busy, setBusy] = React.useState(!1), [reconnectBusy, setReconnectBusy] = React.useState(!1), [hostStatus, setHostStatus] = React.useState(void 0), [notice, setNotice] = React.useState(void 0), [error, setError] = React.useState(void 0), [settingsView, setSettingsView] = React.useState(void 0), persistedServerUrl = settingsView?.config.serverUrl ?? "https://dsh.r2049.cn", association = associations.client ?? associations.host, serverDirty = settingsView !== void 0 && serverUrl !== persistedServerUrl, draftDirty = serverDirty, applyView = (view) => {
          setSettingsView(view), setServerUrl(view.config.serverUrl ?? "https://dsh.r2049.cn"), setAssociations(view.associations ?? (view.association === void 0 ? {} : { host: view.association })), setWritable(view.writable), setLoaded(!0);
        }, load = async () => {
          let [view, status] = await Promise.all([
            props.control("settings.get"),
            props.control("status").catch(() => {
            })
          ]);
          applyView(view), setHostStatus(status?.host);
        }, refreshHostStatus = async () => {
          setHostStatus((await props.control("status")).host);
        };
        React.useEffect(() => {
          load().catch((reason) => setError(messageOf(reason)));
        }, []), React.useEffect(() => {
          if (association === void 0) return;
          refreshHostStatus().catch(() => {
          });
          let timer = window.setInterval(() => {
            refreshHostStatus().catch(() => {
            });
          }, 3e4);
          return () => window.clearInterval(timer);
        }, [association !== void 0]);
        let save = async (event) => {
          if (event?.preventDefault(), !(!writable || !serverDirty)) {
            setBusy(!0), setNotice(void 0), setError(void 0);
            try {
              let view = await props.control("settings.server.set", {
                serverUrl
              });
              applyView(view), setNotice({ key: "serverSaved" });
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, logout = async () => {
          setBusy(!0), setError(void 0), setNotice(void 0);
          try {
            let view = await props.control("settings.logout");
            applyView(view), setRegistrationCode(""), setNotice({ key: "signedOut" });
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, reconnectHost = async () => {
          setReconnectBusy(!0), setError(void 0), setNotice(void 0);
          try {
            let status = await props.control("host.reconnect");
            setHostStatus(status.host), setNotice({ key: "reconnectStarted" });
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setReconnectBusy(!1);
          }
        }, setCurrentDeviceControl = async (enabled) => {
          setBusy(!0), setError(void 0), setNotice(void 0);
          try {
            let status = await props.control("host.authorization.set", { enabled });
            setHostStatus(status.host);
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, discard = () => {
          settingsView !== void 0 && applyView(settingsView), setRegistrationCode(""), setNotice(void 0), setError(void 0);
        };
        return React.createElement(
          "li",
          { className: `dshRemotePluginCard${open ? " isOpen" : ""}` },
          React.createElement(
            "div",
            { className: "dshRemotePluginCardHeader" },
            React.createElement(
              "button",
              {
                type: "button",
                className: "dshRemotePluginCardToggle",
                "aria-expanded": open,
                "aria-label": t(open ? "collapseSettings" : "expandSettings", { name: t("pluginTitle") }),
                onClick: () => setOpen((current) => !current)
              },
              React.createElement(
                "span",
                { className: "dshRemotePluginCardHeading" },
                React.createElement("strong", null, t("pluginTitle")),
                React.createElement("span", null, t("pluginDescription"))
              ),
              draftDirty ? React.createElement("span", { className: "dshRemotePluginCardStatus" }, t("unsaved")) : association === void 0 ? null : React.createElement("span", {
                className: `dshRemotePluginCardStatus${connectionStatusClass(hostStatus)}`
              }, hostStatus === void 0 ? t("associated") : connectionStatusLabel(hostStatus, t)),
              React.createElement("span", { className: "dshRemotePluginCardChevron", "aria-hidden": !0 }, "\u2304")
            )
          ),
          open ? React.createElement(
            "div",
            { className: "dshRemotePluginCardBody" },
            loaded ? association !== void 0 ? React.createElement(
              "div",
              { className: "dshRemoteSettings" },
              React.createElement(
                "div",
                { className: "dshRemoteSettingsTop" },
                React.createElement(
                  "div",
                  { className: "dshRemoteAssociation" },
                  React.createElement("span", null, t(association.account === void 0 ? "authorization" : "account")),
                  React.createElement("strong", null, association.account ?? t("authorizationComplete")),
                  React.createElement("p", null, association.account === void 0 ? serverUrl : t("authorizedOn", { role: "Remote", serverUrl }))
                )
              ),
              React.createElement(
                "div",
                { className: "dshRemoteField" },
                React.createElement("label", { htmlFor: "dsh-remote-server-url-authorized" }, t("serverUrl")),
                React.createElement("input", {
                  id: "dsh-remote-server-url-authorized",
                  type: "url",
                  value: serverUrl,
                  disabled: !0,
                  required: !0,
                  placeholder: "https://dsh.r2049.cn",
                  onChange: (event) => {
                    setServerUrl(event.target.value), setNotice(void 0);
                  }
                }),
                React.createElement("p", null, t("serverUrlHint"))
              ),
              React.createElement(
                "div",
                { className: "dshRemoteAuthorizationSetting" },
                React.createElement(
                  "div",
                  null,
                  React.createElement("strong", null, t("allowControlCurrentDevice")),
                  React.createElement("p", null, t("thisMachineHost"))
                ),
                React.createElement("input", {
                  type: "checkbox",
                  role: "switch",
                  disabled: busy,
                  "aria-label": t("allowControlCurrentDevice"),
                  checked: hostStatus?.authorized === !0,
                  onChange: (event) => void setCurrentDeviceControl(event.target.checked)
                })
              ),
              React.createElement(
                "div",
                { className: "dshRemoteConnection", "aria-live": "polite" },
                React.createElement(
                  "div",
                  { className: "dshRemoteConnectionSummary" },
                  React.createElement("span", null, t("connection")),
                  React.createElement(
                    "strong",
                    null,
                    React.createElement("span", {
                      className: `dshRemoteConnectionDot${connectionStatusClass(hostStatus)}`,
                      "aria-hidden": !0
                    }),
                    connectionStatusLabel(hostStatus, t)
                  ),
                  React.createElement("p", null, hostStatus === void 0 ? t("checkingConnection") : hostStatus.lastActiveAt === void 0 ? t("neverConnected") : t("lastActive", { time: formatLocalTime(hostStatus.lastActiveAt) }))
                ),
                React.createElement("button", {
                  type: "button",
                  className: "dshRemoteReconnect",
                  disabled: reconnectBusy || hostStatus?.configured === !1,
                  onClick: () => void reconnectHost()
                }, t(reconnectBusy ? "reconnectingAction" : "reconnect"))
              ),
              hostStatus?.error === void 0 || hostStatus.online ? null : React.createElement("p", { className: "dshRemoteConnectionIssue", role: "status" }, connectionErrorMessage(hostStatus.error, t)),
              writable ? null : React.createElement("p", { className: "dshRemoteError" }, t("readOnly")),
              React.createElement(
                "div",
                { className: "dshRemoteSettingsFooter" },
                error !== void 0 ? React.createElement("p", { className: "dshRemoteError", role: "alert" }, error) : notice === void 0 ? null : React.createElement("p", { className: "dshRemoteNotice", role: "status" }, t(notice.key, notice.params)),
                draftDirty ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement("button", { type: "button", className: "dshRemoteDiscard", disabled: busy, onClick: discard }, t("discard")),
                  React.createElement("button", { type: "button", className: "dshRemoteSave", disabled: busy || !writable, onClick: () => void save() }, t(busy ? "saving" : "save"))
                ) : React.createElement("button", {
                  type: "button",
                  className: "dshRemoteDiscard",
                  disabled: busy || !writable,
                  onClick: () => void logout()
                }, t(busy ? "signingOut" : "signOut"))
              )
            ) : React.createElement(
              "form",
              { className: "dshRemoteSettings", noValidate: !0, onSubmit: (event) => void save(event) },
              React.createElement(
                "div",
                { className: "dshRemoteField" },
                React.createElement("label", { htmlFor: "dsh-remote-server-url" }, t("serverUrl")),
                React.createElement("input", {
                  id: "dsh-remote-server-url",
                  type: "url",
                  value: serverUrl,
                  disabled: busy || !writable,
                  required: !0,
                  placeholder: "https://dsh.r2049.cn",
                  onChange: (event) => {
                    setServerUrl(event.target.value), setNotice(void 0);
                  }
                }),
                React.createElement("p", null, t("serverUrlHint"))
              ),
              React.createElement("p", { className: "dshRemoteSettingsState" }, t("authorizeFromRemote")),
              writable ? null : React.createElement("p", { className: "dshRemoteError" }, t("readOnly")),
              React.createElement(
                "div",
                { className: "dshRemoteSettingsFooter" },
                error !== void 0 ? React.createElement("p", { className: "dshRemoteError", role: "alert" }, error) : notice === void 0 ? null : React.createElement("p", { className: "dshRemoteNotice", role: "status" }, t(notice.key, notice.params)),
                React.createElement("button", { type: "button", className: "dshRemoteDiscard", disabled: busy || !draftDirty, onClick: discard }, t("discard")),
                React.createElement("button", { type: "submit", className: "dshRemoteSave", disabled: busy || !writable || !serverDirty }, t(busy ? "saving" : "save"))
              )
            ) : React.createElement("p", { className: "dshRemoteSettingsState" }, error ?? t("loadingSettings"))
          ) : null
        );
      }
      function RemoteWorkspaceAction(props) {
        let { t } = props, [open, setOpen] = React.useState(!1), [status, setStatus] = React.useState(void 0), [devices, setDevices] = React.useState([]), [selectedHost, setSelectedHost] = React.useState(void 0), [workspaces, setWorkspaces] = React.useState([]), [directory, setDirectory] = React.useState(void 0), [path, setPath] = React.useState(""), [addingWorkspace, setAddingWorkspace] = React.useState(!1), [busy, setBusy] = React.useState(!1), [needsAuthorization, setNeedsAuthorization] = React.useState(!1), [email, setEmail] = React.useState(""), [password, setPassword] = React.useState(""), [loginMethod, setLoginMethod] = React.useState(props.preferredQrProvider), [loginMethodManuallySelected, setLoginMethodManuallySelected] = React.useState(!1), [qrSession, setQrSession] = React.useState(void 0), [qrImage, setQrImage] = React.useState(void 0), [qrExpired, setQrExpired] = React.useState(!1), [progress, setProgress] = React.useState(void 0), progressRun = React.useRef(0), qrFlowRun = React.useRef(0), [notice, setNotice] = React.useState(void 0), [error, setError] = React.useState(void 0);
        React.useEffect(() => {
          if (!open) return;
          let closeOnEscape = (event) => {
            event.key === "Escape" && setOpen(!1);
          };
          return window.addEventListener("keydown", closeOnEscape), () => window.removeEventListener("keydown", closeOnEscape);
        }, [open]), React.useEffect(() => {
          props.control("status").then(setStatus).catch(() => {
          });
        }, []), React.useEffect(() => {
          let remoteActive = status?.mode === "remote";
          return document.documentElement.classList.toggle("dshRemoteTargetActive", remoteActive), () => {
            remoteActive && document.documentElement.classList.remove("dshRemoteTargetActive");
          };
        }, [status?.mode]);
        let startQrLogin = async (provider) => {
          let run = ++qrFlowRun.current;
          setBusy(!0), setError(void 0), setQrExpired(!1);
          try {
            let session = await props.control("client.account.qr.start", { provider }), image = await import_qrcode.default.toDataURL(session.scanUrl, {
              width: 184,
              margin: 1,
              errorCorrectionLevel: "L"
            });
            if (run !== qrFlowRun.current) return;
            setQrSession(session), setQrImage(image);
          } catch (reason) {
            run === qrFlowRun.current && setError(messageOf(reason));
          } finally {
            run === qrFlowRun.current && setBusy(!1);
          }
        };
        React.useEffect(() => {
          !open || !needsAuthorization || loginMethod === "password" || qrSession !== void 0 || qrExpired || startQrLogin(loginMethod);
        }, [open, needsAuthorization, loginMethod, qrSession, qrExpired]), React.useEffect(() => {
          if (!open || loginMethod === "password" || qrSession === void 0) return;
          let active = !0, polling = !1, settled = !1, run = qrFlowRun.current, timer, poll = () => {
            polling || settled || (polling = !0, props.control("client.account.qr.poll", { qrId: qrSession.qrId }).then(async (result) => {
              if (!(!active || settled || run !== qrFlowRun.current))
                if (result.status === "complete") {
                  settled = !0, timer !== void 0 && window.clearInterval(timer), setBusy(!0), setError(void 0), setQrExpired(!1), setNeedsAuthorization(!1);
                  try {
                    let [nextDevices, nextStatus] = await Promise.all([
                      props.control("devices"),
                      props.control("status")
                    ]);
                    active && run === qrFlowRun.current && (setDevices(nextDevices), setStatus(nextStatus));
                  } catch (reason) {
                    active && run === qrFlowRun.current && setError(messageOf(reason));
                  } finally {
                    run === qrFlowRun.current && (setQrSession(void 0), setQrImage(void 0), setBusy(!1));
                  }
                } else result.status === "expired" && (settled = !0, timer !== void 0 && window.clearInterval(timer), setQrExpired(!0), setQrSession(void 0), setQrImage(void 0));
            }).catch((reason) => {
              active && !settled && run === qrFlowRun.current && setError(messageOf(reason));
            }).finally(() => {
              polling = !1;
            }));
          };
          return poll(), timer = window.setInterval(poll, 1500), () => {
            active = !1, timer !== void 0 && window.clearInterval(timer);
          };
        }, [open, loginMethod, qrSession]), React.useEffect(() => {
          loginMethodManuallySelected || loginMethod === props.preferredQrProvider || (qrFlowRun.current += 1, setLoginMethod(props.preferredQrProvider), setQrSession(void 0), setQrImage(void 0), setQrExpired(!1), setError(void 0));
        }, [props.preferredQrProvider, loginMethodManuallySelected]);
        let selectLoginMethod = (method) => {
          setLoginMethodManuallySelected(!0), method !== loginMethod && (qrFlowRun.current += 1, setLoginMethod(method), setQrSession(void 0), setQrImage(void 0), setQrExpired(!1), setError(void 0));
        }, orderedQrProviders = props.preferredQrProvider === "zhihu" ? ["zhihu", "github"] : ["github", "zhihu"], qrLoginTab = (provider) => React.createElement("button", {
          key: provider,
          type: "button",
          role: "tab",
          id: `dsh-remote-${provider}-tab`,
          "aria-selected": loginMethod === provider,
          "aria-controls": `dsh-remote-${provider}-panel`,
          className: loginMethod === provider ? "isActive" : "",
          disabled: busy,
          onClick: () => selectLoginMethod(provider)
        }, t(provider === "github" ? "githubLogin" : "zhihuLogin")), selectHost = async (host) => {
          setBusy(!0), setError(void 0);
          try {
            let result = await runRemoteProgress(
              connectHostProgressSteps(status?.preferredTransports),
              setProgress,
              progressRun,
              async () => {
                let nextWorkspaces = await props.control("workspaces.list", { targetDeviceId: host.deviceId }), nextStatus = await props.control("status").catch(() => {
                });
                return nextStatus !== void 0 && setStatus(nextStatus), { workspaces: nextWorkspaces, status: nextStatus };
              },
              (result2) => connectedProgress(result2.status)
            );
            setWorkspaces(result.workspaces), setSelectedHost(host), setPath(""), setAddingWorkspace(!1), setDirectory(void 0);
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, browseDirectory = async (nextPath) => {
          if (selectedHost !== void 0) {
            setBusy(!0), setError(void 0);
            try {
              let listing = await props.control("directory.list", {
                targetDeviceId: selectedHost.deviceId,
                ...nextPath === void 0 ? {} : { path: nextPath }
              });
              setDirectory(listing), setPath(listing.path);
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, refreshRemote = async () => {
          setBusy(!0), setNotice(void 0), setError(void 0);
          try {
            let nextStatus = await props.control("status");
            if (setStatus(nextStatus), !nextStatus.available) {
              setDevices([]), setNeedsAuthorization(!1), setSelectedHost(void 0), setWorkspaces([]), setPath(""), setAddingWorkspace(!1), setDirectory(void 0);
              return;
            }
            try {
              let nextDevices = await props.control("devices");
              if (setDevices(nextDevices), setNeedsAuthorization(!1), selectedHost !== void 0) {
                let nextSelectedHost = nextDevices.find((device) => device.deviceId === selectedHost.deviceId);
                nextSelectedHost === void 0 ? (setSelectedHost(void 0), setWorkspaces([]), setPath(""), setAddingWorkspace(!1), setDirectory(void 0)) : setSelectedHost(nextSelectedHost);
              }
            } catch {
              setDevices([]), setNeedsAuthorization(!0), setSelectedHost(void 0), setWorkspaces([]), setPath(""), setAddingWorkspace(!1), setDirectory(void 0);
            }
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, show = async () => {
          setOpen(!0), await refreshRemote();
        }, signInClient = async () => {
          if (!(email.trim() === "" || password === "")) {
            setBusy(!0), setError(void 0);
            try {
              await props.control("client.account.login", { email: email.trim(), password }), setDevices(await props.control("devices")), setStatus(await props.control("status")), setNeedsAuthorization(!1), setPassword("");
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, openLocalWorkspaces = async () => {
          setBusy(!0), setError(void 0);
          try {
            await props.control("mode.set", { mode: "local" }), window.location.reload();
          } catch (reason) {
            setError(messageOf(reason)), setBusy(!1);
          }
        }, setCurrentDeviceControl = async (enabled) => {
          setBusy(!0), setError(void 0);
          try {
            setStatus(await props.control("host.authorization.set", { enabled }));
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, logoutRemote = async () => {
          setBusy(!0), setError(void 0);
          try {
            await props.control("settings.logout"), setDevices([]), setNeedsAuthorization(!0), setQrSession(void 0), setQrImage(void 0), setQrExpired(!1), setStatus(await props.control("status"));
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, openWorkspace = async () => {
          if (!(selectedHost === void 0 || path.trim() === "")) {
            setBusy(!0), setError(void 0);
            try {
              let nextStatus = await runRemoteProgress(
                openWorkspaceProgressSteps,
                setProgress,
                progressRun,
                () => props.control("workspace.open", {
                  targetDeviceId: selectedHost.deviceId,
                  path: path.trim()
                }),
                connectedProgress
              );
              setStatus(nextStatus), window.location.reload();
            } catch (reason) {
              setError(messageOf(reason)), setBusy(!1);
            }
          }
        }, remoteLabel = status?.mode === "remote" ? t("activeRemote", { name: status.target?.name ?? t("host") }) : t("remoteEntry");
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            { className: `dshRemoteSidebarEntry${status?.mode === "remote" ? " isActive" : ""}${props.wide ? " isWide" : " isRail"}` },
            React.createElement(status?.mode === "remote" ? "div" : "button", {
              ...status?.mode === "remote" ? {} : { type: "button", onClick: () => void show() },
              className: "dshRemoteModeButton",
              title: remoteLabel,
              "aria-label": remoteLabel
            }, React.createElement(
              "svg",
              {
                className: "dshRemoteComputerIcon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 1.7,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": !0
              },
              React.createElement("rect", { x: 3, y: 4, width: 18, height: 13, rx: 2 }),
              React.createElement("path", { d: "M8 21h8M12 17v4" })
            ), props.wide ? React.createElement("span", { className: "dshRemoteSidebarLabel" }, remoteLabel) : null),
            status?.mode === "remote" && props.wide ? React.createElement("button", {
              type: "button",
              className: "dshRemoteExitLink",
              disabled: busy,
              onClick: () => void openLocalWorkspaces()
            }, t("exitRemote")) : null
          ),
          open ? React.createElement("div", {
            className: "dshRemoteBackdrop",
            role: "presentation",
            onMouseDown: (event) => {
              event.target === event.currentTarget && setOpen(!1);
            }
          }, React.createElement(
            "section",
            { className: "dshRemotePage", role: "dialog", "aria-modal": !0, "aria-label": t("remoteTitle") },
            React.createElement(
              "header",
              { className: "dshRemotePageHeader" },
              React.createElement(
                "div",
                { className: "dshRemotePageIntro" },
                React.createElement("strong", null, t("remoteTitle")),
                React.createElement("p", null, t("remoteDescription"))
              ),
              React.createElement(
                "div",
                { className: "dshRemotePageActions" },
                React.createElement("button", {
                  type: "button",
                  className: "dshRemotePageRefresh",
                  disabled: busy,
                  title: t("refreshRemote"),
                  "aria-label": t("refreshRemote"),
                  onClick: () => void refreshRemote()
                }, t("refreshRemoteShort")),
                React.createElement("button", { type: "button", onClick: () => setOpen(!1), "aria-label": t("close") }, "\xD7")
              )
            ),
            React.createElement(
              "main",
              { className: "dshRemotePageBody" },
              status?.mode === "remote" ? React.createElement("button", {
                type: "button",
                className: "dshRemoteLocalLink",
                disabled: busy,
                onClick: () => void openLocalWorkspaces()
              }, t("openLocalWorkspaces")) : null,
              React.createElement(
                React.Fragment,
                null,
                needsAuthorization ? React.createElement(
                  "section",
                  { className: "dshRemoteEnable" },
                  React.createElement(
                    "div",
                    { className: "dshRemoteLoginHeading" },
                    React.createElement("strong", { className: "dshRemoteLoginTitle" }, t("signInClient")),
                    React.createElement("span", null, t("signInClientDescription"))
                  ),
                  React.createElement(
                    "div",
                    { className: "dshRemoteLoginTabs", role: "tablist" },
                    ...orderedQrProviders.map(qrLoginTab),
                    React.createElement("button", {
                      type: "button",
                      role: "tab",
                      id: "dsh-remote-password-tab",
                      "aria-selected": loginMethod === "password",
                      "aria-controls": "dsh-remote-password-panel",
                      className: loginMethod === "password" ? "isActive" : "",
                      disabled: busy,
                      onClick: () => selectLoginMethod("password")
                    }, t("accountPasswordLogin"))
                  ),
                  loginMethod !== "password" ? React.createElement(
                    "div",
                    {
                      className: "dshRemoteQrLogin",
                      role: "tabpanel",
                      id: `dsh-remote-${loginMethod}-panel`,
                      "aria-labelledby": `dsh-remote-${loginMethod}-tab`
                    },
                    qrImage === void 0 ? React.createElement(
                      "div",
                      { className: "dshRemoteQrPlaceholder", "aria-busy": busy },
                      qrExpired ? React.createElement("p", null, t("qrLoginExpired")) : React.createElement("span", null, t("checkingConnection"))
                    ) : qrSession !== void 0 ? React.createElement(
                      "a",
                      {
                        className: "dshRemoteQrOpen",
                        href: qrSession.scanUrl,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        "aria-label": t("openInBrowser")
                      },
                      React.createElement("img", {
                        src: qrImage,
                        width: 184,
                        height: 184,
                        alt: t(loginMethod === "github" ? "scanWithGitHub" : "scanWithZhihu")
                      }),
                      React.createElement("span", null, t("openInBrowser"), " \u2197")
                    ) : null,
                    React.createElement("strong", null, t(loginMethod === "github" ? "scanWithGitHub" : "scanWithZhihu")),
                    React.createElement("p", null, t("scanLoginHint")),
                    status?.serverUrl === void 0 ? null : React.createElement(
                      "p",
                      { className: "dshRemoteServiceAddress" },
                      t("currentServiceAddress"),
                      " ",
                      React.createElement("a", {
                        href: status.serverUrl,
                        target: "_blank",
                        rel: "noreferrer"
                      }, status.serverUrl)
                    ),
                    qrExpired ? React.createElement("button", {
                      type: "button",
                      disabled: busy,
                      onClick: () => setQrExpired(!1)
                    }, t("refreshQrCode")) : null
                  ) : React.createElement(
                    "div",
                    {
                      className: "dshRemoteClientLogin",
                      role: "tabpanel",
                      id: "dsh-remote-password-panel",
                      "aria-labelledby": "dsh-remote-password-tab"
                    },
                    React.createElement("input", {
                      type: "email",
                      value: email,
                      disabled: busy,
                      autoComplete: "username",
                      placeholder: t("account"),
                      "aria-label": t("account"),
                      onChange: (event) => setEmail(event.target.value)
                    }),
                    React.createElement("input", {
                      type: "password",
                      value: password,
                      disabled: busy,
                      autoComplete: "current-password",
                      placeholder: t("password"),
                      "aria-label": t("password"),
                      onChange: (event) => setPassword(event.target.value)
                    }),
                    React.createElement("button", { type: "button", disabled: busy || email.trim() === "" || password === "", onClick: () => void signInClient() }, t(busy ? "signingIn" : "startSignIn"))
                  )
                ) : null,
                needsAuthorization ? null : React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "section",
                    { className: "dshRemoteHosts", "aria-label": t("chooseHost") },
                    React.createElement(
                      "div",
                      { className: "dshRemoteSectionHeading" },
                      React.createElement(
                        "div",
                        { className: "dshRemoteSectionTitle" },
                        React.createElement("strong", null, t("chooseHost")),
                        status?.hostAuthorizationAvailable ? React.createElement(
                          "div",
                          { className: "dshRemoteHostControlToggle" },
                          React.createElement("span", null, t("allowControlCurrentDevice")),
                          React.createElement("input", {
                            type: "checkbox",
                            role: "switch",
                            disabled: busy,
                            "aria-label": t("allowControlCurrentDevice"),
                            checked: status.host?.authorized === !0,
                            onChange: (event) => void setCurrentDeviceControl(event.target.checked)
                          })
                        ) : null,
                        React.createElement("button", {
                          type: "button",
                          className: "dshRemoteAccountExit",
                          disabled: busy,
                          onClick: () => void logoutRemote()
                        }, t("exitRemoteAccount"))
                      ),
                      selectedHost === void 0 ? null : React.createElement(
                        "div",
                        { className: "dshRemoteSectionActions" },
                        React.createElement("button", {
                          type: "button",
                          onClick: () => {
                            setSelectedHost(void 0), setWorkspaces([]), setDirectory(void 0), setPath(""), setAddingWorkspace(!1), setError(void 0);
                          }
                        }, t("backToHosts"))
                      )
                    ),
                    selectedHost === void 0 ? React.createElement("div", { className: "dshRemoteHostList" }, devices.length === 0 ? React.createElement("p", null, t(busy ? "checkingConnection" : "noRemoteHosts")) : devices.map((device) => React.createElement(
                      "button",
                      {
                        type: "button",
                        key: device.deviceId,
                        disabled: busy || !device.online,
                        onClick: () => void selectHost(device)
                      },
                      React.createElement(
                        "span",
                        null,
                        React.createElement("strong", null, device.name),
                        React.createElement("small", null, [
                          formatPlatform(device.platform),
                          device.harnessVersion === void 0 ? void 0 : t("harnessVersion", { version: device.harnessVersion }),
                          device.clientVersion === void 0 ? void 0 : t("pluginVersion", { version: device.clientVersion })
                        ].filter(Boolean).join(" \xB7 "))
                      ),
                      React.createElement("small", null, t(device.online ? "online" : "offline"))
                    ))) : React.createElement(
                      "div",
                      { className: "dshRemoteSelectedHost" },
                      React.createElement("span", null, selectedHost.name),
                      React.createElement("small", null, [formatPlatform(selectedHost.platform), t("online")].join(" \xB7 "))
                    )
                  ),
                  React.createElement(RemoteProgressView, { progress, t }),
                  selectedHost === void 0 ? React.createElement("p", { className: "dshRemoteHint" }, t("selectHostHint")) : React.createElement(
                    "section",
                    { className: "dshRemoteBrowser", "aria-label": t("chooseDirectory") },
                    React.createElement(
                      "div",
                      { className: "dshRemoteSectionHeading" },
                      React.createElement("strong", null, t("existingWorkspaces")),
                      React.createElement("button", {
                        type: "button",
                        className: "dshRemoteAddWorkspace",
                        title: t("addRemoteWorkspace"),
                        "aria-label": t("addRemoteWorkspace"),
                        "aria-expanded": addingWorkspace,
                        onClick: () => {
                          if (addingWorkspace) {
                            setAddingWorkspace(!1), setDirectory(void 0), setPath("");
                            return;
                          }
                          setAddingWorkspace(!0), browseDirectory();
                        }
                      }, "+")
                    ),
                    React.createElement("div", { className: "dshRemoteDirectoryList" }, workspaces.length === 0 ? React.createElement("p", null, t("noRemoteWorkspaces")) : workspaces.map((workspace) => React.createElement(
                      "button",
                      {
                        type: "button",
                        key: workspace.workspaceId,
                        disabled: busy,
                        className: !addingWorkspace && path === workspace.path ? "isSelected" : "",
                        "aria-pressed": !addingWorkspace && path === workspace.path,
                        onClick: () => {
                          setAddingWorkspace(!1), setPath(workspace.path);
                        }
                      },
                      React.createElement("span", { "aria-hidden": !0 }, "\u25B1"),
                      React.createElement("span", null, workspace.title),
                      React.createElement("small", null, workspace.path)
                    ))),
                    addingWorkspace ? React.createElement(
                      "div",
                      { className: "dshRemoteFolderBrowser" },
                      directory === void 0 ? React.createElement("p", null, t("loadingDirectory")) : React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                          "nav",
                          { className: "dshRemoteCrumbs", "aria-label": t("currentDirectory") },
                          directory.crumbs.map((crumb) => React.createElement("button", {
                            type: "button",
                            key: crumb.path,
                            disabled: busy || crumb.path === directory.path,
                            onClick: () => void browseDirectory(crumb.path)
                          }, crumb.path === directory.home ? "\u2302" : crumb.name))
                        ),
                        React.createElement("div", { className: "dshRemoteFolderList" }, directory.entries.filter((entry) => !entry.hidden).length === 0 ? React.createElement("p", null, t("emptyDirectory")) : directory.entries.filter((entry) => !entry.hidden).map((entry) => React.createElement("button", {
                          type: "button",
                          key: entry.path,
                          disabled: busy,
                          onClick: () => void browseDirectory(entry.path)
                        }, React.createElement("span", { "aria-hidden": !0 }, "\u25B1"), React.createElement("span", null, entry.name)))),
                        directory.truncated ? React.createElement("small", null, t("directoryTruncated")) : null
                      )
                    ) : null,
                    React.createElement(
                      "footer",
                      { className: "dshRemoteOpenBar" },
                      React.createElement("div", null, React.createElement("span", null, t("currentDirectory")), React.createElement("strong", null, path || "\u2014")),
                      React.createElement("button", { type: "button", disabled: busy || path.trim() === "", onClick: () => void openWorkspace() }, t(busy ? "openingWorkspace" : "openWorkspace"))
                    )
                  )
                )
              ),
              notice === void 0 ? null : React.createElement("p", { className: "dshRemoteNotice", role: "status" }, notice),
              error === void 0 ? null : React.createElement("p", { className: "dshRemoteError", role: "alert" }, error)
            )
          )) : null
        );
      }
      let codexSidebar = createCodexSidebarStore();
      function CodexModeIcon(props = {}) {
        let size = props.size ?? 16;
        return React.createElement(
          "svg",
          {
            width: size,
            height: size,
            viewBox: "0 0 16 16",
            fill: "none",
            "aria-hidden": !0
          },
          React.createElement("path", {
            d: "M11.6 4.25A4.75 4.75 0 1 0 11.6 11.75",
            stroke: "currentColor",
            strokeWidth: 1.45,
            strokeLinecap: "round"
          }),
          React.createElement("path", {
            d: "M10.1 4.25h1.5v1.5",
            stroke: "currentColor",
            strokeWidth: 1.45,
            strokeLinecap: "round",
            strokeLinejoin: "round"
          })
        );
      }
      function CodexChevronIcon(props) {
        return React.createElement("svg", {
          width: 14,
          height: 14,
          viewBox: "0 0 16 16",
          fill: "none",
          "aria-hidden": !0
        }, React.createElement("path", {
          d: props.expanded ? "m4.75 6.25 3.25 3.5 3.25-3.5" : "m6.25 4.75 3.5 3.25-3.5 3.25",
          stroke: "currentColor",
          strokeWidth: 1.35,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }));
      }
      function CodexRefreshIcon() {
        return React.createElement("svg", {
          width: 15,
          height: 15,
          viewBox: "0 0 16 16",
          fill: "none",
          "aria-hidden": !0
        }, React.createElement("path", {
          d: "M12.65 5.45A5.15 5.15 0 1 0 13 9.85M12.65 5.45V2.7m0 2.75H9.9",
          stroke: "currentColor",
          strokeWidth: 1.35,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }));
      }
      function CodexAddIcon() {
        return React.createElement("svg", {
          width: 15,
          height: 15,
          viewBox: "0 0 16 16",
          fill: "none",
          "aria-hidden": !0
        }, React.createElement("path", {
          d: "M8 3.25v9.5M3.25 8h9.5",
          stroke: "currentColor",
          strokeWidth: 1.35,
          strokeLinecap: "round"
        }));
      }
      function CodexMoreIcon() {
        return React.createElement(
          "svg",
          {
            width: 15,
            height: 15,
            viewBox: "0 0 16 16",
            fill: "currentColor",
            "aria-hidden": !0
          },
          React.createElement("circle", { cx: 3.25, cy: 8, r: 1 }),
          React.createElement("circle", { cx: 8, cy: 8, r: 1 }),
          React.createElement("circle", { cx: 12.75, cy: 8, r: 1 })
        );
      }
      function CodexWorkspaceGroup(props) {
        let { t } = props, [supported, setSupported] = React.useState(!1), [threads, setThreads] = React.useState([]), [busy, setBusy] = React.useState(!1), [actionThreadId, setActionThreadId] = React.useState(void 0), nav = useCodexSource(codexSidebar, (snapshot) => snapshot), syncSupport = async () => {
          try {
            let result = await props.control("codex.probe");
            setSupported(result.supported), result.supported && codexSidebar.getSnapshot().expanded && await loadThreads();
          } catch {
            setSupported(!1);
          }
        }, loadThreads = async () => {
          setBusy(!0);
          try {
            let result = await props.control("codex.call", {
              method: "thread/list",
              params: {
                limit: 50,
                sortKey: "updated_at",
                sortDirection: "desc",
                sourceKinds: ["cli", "vscode", "exec", "appServer", "unknown"],
                archived: !1
              }
            });
            setThreads(codexThreadPage(result, !1).rows);
          } catch (reason) {
            console.warn("[ds-harness-remote] failed to load Codex threads:", reason);
          } finally {
            setBusy(!1);
          }
        };
        if (React.useEffect(() => {
          let active = !0, sync = async () => {
            active && await syncSupport();
          };
          sync();
          let timer = window.setInterval(() => {
            sync();
          }, 3e3);
          return () => {
            active = !1, window.clearInterval(timer);
          };
        }, []), React.useEffect(() => {
          !supported || !nav.expanded || threads.length > 0 || busy || loadThreads();
        }, [supported, nav.expanded, threads.length, busy]), !supported)
          return React.createElement("div", { className: "dshCodexWorkspaceUnavailable" }, t("codexUnavailable"));
        let openThread = (thread) => {
          codexSidebar.selectThread(thread), codexSidebar.setExpanded(!0);
        }, renameThread = async (thread) => {
          let name = window.prompt(t("codexRenamePrompt"), thread.name ?? thread.preview ?? "")?.trim();
          if (!(name === void 0 || name === "")) {
            setBusy(!0);
            try {
              await props.control("codex.call", { method: "thread/name/set", params: { threadId: thread.id, name } });
              let renamed = { ...thread, name };
              setThreads((previous) => previous.map((item) => item.id === thread.id ? renamed : item)), codexSidebar.getSnapshot().selectedThread?.id === thread.id && codexSidebar.selectThread(renamed);
            } catch (reason) {
              console.warn("[ds-harness-remote] failed to rename Codex thread:", reason);
            } finally {
              setBusy(!1);
            }
          }
        }, forkThread = async (thread) => {
          setBusy(!0);
          try {
            let result = await props.control("codex.call", {
              method: "thread/fork",
              params: { threadId: thread.id }
            }), forked = codexResultThread(result);
            if (forked === void 0) throw new Error("The Host returned an invalid Codex thread.");
            setThreads((previous) => mergeCodexThreads([forked], previous)), openThread(forked);
          } catch (reason) {
            console.warn("[ds-harness-remote] failed to fork Codex thread:", reason);
          } finally {
            setBusy(!1);
          }
        }, archiveThread = async (thread) => {
          setBusy(!0);
          try {
            await props.control("codex.call", { method: "thread/archive", params: { threadId: thread.id } }), setThreads((previous) => previous.filter((item) => item.id !== thread.id)), codexSidebar.getSnapshot().selectedThread?.id === thread.id && codexSidebar.selectThread(void 0);
          } catch (reason) {
            console.warn("[ds-harness-remote] failed to archive Codex thread:", reason);
          } finally {
            setBusy(!1);
          }
        }, createThread = async () => {
          let seedPath = threads.find((thread) => typeof thread.cwd == "string")?.cwd ?? "", cwd = window.prompt(t("codexNewPath"), seedPath)?.trim();
          if (!(cwd === void 0 || cwd === "")) {
            setBusy(!0);
            try {
              let result = await props.control("codex.call", { method: "thread/start", params: { cwd } }), thread = codexResultThread(result);
              if (thread === void 0) throw new Error("The Host returned an invalid Codex thread.");
              setThreads((previous) => mergeCodexThreads([thread], previous)), openThread(thread);
            } catch (reason) {
              console.warn("[ds-harness-remote] failed to create Codex thread:", reason);
            } finally {
              setBusy(!1);
            }
          }
        };
        return React.createElement(
          "div",
          { className: "dshCodexTree", role: "tree", "aria-label": t("codexVirtualWorkspace") },
          React.createElement(
            "div",
            {
              className: "dshCodexWorkspaceNode",
              role: "treeitem",
              "aria-expanded": nav.expanded
            },
            React.createElement(
              "div",
              { className: "dshCodexWorkspaceNodeRow" },
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "dshCodexWorkspaceNodeToggle",
                  "aria-expanded": nav.expanded,
                  onClick: () => {
                    let expanded = !codexSidebar.getSnapshot().expanded;
                    codexSidebar.setExpanded(expanded), expanded && loadThreads();
                  }
                },
                React.createElement(CodexChevronIcon, { expanded: nav.expanded }),
                React.createElement(CodexModeIcon, null),
                React.createElement("span", null, t("codexEntry"))
              ),
              React.createElement(
                "div",
                { className: "dshCodexWorkspaceNodeActions" },
                React.createElement("button", {
                  type: "button",
                  disabled: busy,
                  title: t("codexRefresh"),
                  "aria-label": t("codexRefresh"),
                  onClick: () => {
                    loadThreads();
                  }
                }, React.createElement(CodexRefreshIcon, null)),
                React.createElement("button", {
                  type: "button",
                  disabled: busy,
                  title: t("codexNewThread"),
                  "aria-label": t("codexNewThread"),
                  onClick: () => {
                    createThread();
                  }
                }, React.createElement(CodexAddIcon, null))
              )
            ),
            nav.expanded ? React.createElement(
              "div",
              { className: "dshCodexSessionList", role: "group" },
              busy && threads.length === 0 ? React.createElement("p", { className: "dshCodexTreeState" }, t("codexLoading")) : threads.length === 0 ? React.createElement("p", { className: "dshCodexTreeState" }, t("codexEmpty")) : threads.map((thread) => {
                let selected = nav.selectedThread?.id === thread.id, title = `${thread.isPinned ? "\u2605 " : ""}${thread.name ?? thread.preview ?? thread.id}`, actionOpen = actionThreadId === thread.id;
                return React.createElement(
                  "div",
                  {
                    className: `dshCodexSessionRow${selected ? " isSelected" : ""}`,
                    key: codexSidebarSessionId(thread.id),
                    role: "treeitem",
                    "aria-selected": selected
                  },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "dshCodexSessionOpen",
                      onClick: () => {
                        setActionThreadId(void 0), openThread(thread);
                      }
                    },
                    React.createElement("span", { className: "dshCodexSessionTitle" }, title),
                    React.createElement(
                      "span",
                      { className: "dshCodexSessionMeta" },
                      codexThreadWaitingOnApproval(thread.status) ? t("codexApproval") : codexThreadRunning(thread.status) ? t("codexLive") : formatCodexTime(thread.updatedAt ?? thread.createdAt)
                    )
                  ),
                  React.createElement("button", {
                    type: "button",
                    className: "dshCodexSessionMore",
                    disabled: busy,
                    "aria-expanded": actionOpen,
                    "aria-label": `${title}: ${t("codexActions")}`,
                    title: t("codexActions"),
                    onClick: () => {
                      setActionThreadId(actionOpen ? void 0 : thread.id);
                    }
                  }, React.createElement(CodexMoreIcon, null)),
                  actionOpen ? React.createElement(
                    "div",
                    { className: "dshCodexSessionMenu" },
                    React.createElement("button", {
                      type: "button",
                      disabled: busy,
                      onClick: () => {
                        setActionThreadId(void 0), renameThread(thread);
                      }
                    }, t("codexRename")),
                    React.createElement("button", {
                      type: "button",
                      disabled: busy,
                      onClick: () => {
                        setActionThreadId(void 0), forkThread(thread);
                      }
                    }, t("codexFork")),
                    React.createElement("button", {
                      type: "button",
                      disabled: busy,
                      onClick: () => {
                        setActionThreadId(void 0), archiveThread(thread);
                      }
                    }, t("codexArchive"))
                  ) : null
                );
              })
            ) : null
          )
        );
      }
      function CodexWorkspaceBrowser(props) {
        let { t } = props;
        return props.wide ? React.createElement(
          "section",
          { className: "dshCodexWorkspaceBrowser", "aria-label": t("codexVirtualWorkspace") },
          React.createElement(
            "header",
            { className: "dshCodexWorkspaceBrowserHeader" },
            React.createElement("span", null, t("codexWorkspaceTitle")),
            React.createElement("button", {
              type: "button",
              className: "dshCodexWorkspaceModeButton isActive",
              title: t("codexSwitchToHarness"),
              "aria-label": t("codexSwitchToHarness"),
              "aria-pressed": !0,
              onClick: () => codexSidebar.setMode("harness")
            }, React.createElement(CodexModeIcon, null))
          ),
          React.createElement(
            "div",
            { className: "dshCodexWorkspaceBrowserBody" },
            React.createElement(CodexWorkspaceGroup, { control: props.control, t })
          )
        ) : React.createElement(
          "div",
          { className: "dshCodexWorkspaceRail" },
          React.createElement("button", {
            type: "button",
            title: t("codexVirtualWorkspace"),
            "aria-label": t("codexVirtualWorkspace"),
            onClick: props.expandSidebar
          }, React.createElement("span", { className: "dshCodexSidebarMark", "aria-hidden": !0 }, "C"))
        );
      }
      function CodexConversationSurface(props) {
        let { t } = props, requestedThread = useCodexSource(codexSidebar, (snapshot) => snapshot.selectedThread), [selected, setSelected] = React.useState(void 0), [timelineState, setTimelineState] = React.useState(void 0), [busy, setBusy] = React.useState(!1), [loading, setLoading] = React.useState(!1), [reconnecting, setReconnecting] = React.useState(!1), [prompt, setPrompt] = React.useState(""), [error, setError] = React.useState(void 0), streamRef = React.useRef(void 0), runRef = React.useRef(0), selectedRef = React.useRef(void 0);
        selectedRef.current = selected;
        let closeActiveStream = async () => {
          runRef.current += 1;
          let stream = streamRef.current;
          streamRef.current = void 0, stream !== void 0 && await props.control("codex.stream.close", { streamId: stream.id }).catch(() => {
          });
        };
        React.useEffect(() => () => {
          closeActiveStream();
        }, []);
        let loadHistory = async (threadId) => {
          let result = await props.control("codex.call", {
            method: "thread/read",
            params: { threadId, includeTurns: !0 }
          }), thread = codexResultThread(result);
          if (thread === void 0) throw new Error("The Host returned an invalid Codex thread.");
          let baseline = createCodexTimelineState(thread);
          if (baseline === void 0) throw new Error("The Host returned an invalid Codex history baseline.");
          return setTimelineState(baseline), setSelected((previous) => previous?.id === threadId ? { ...previous, ...thread } : previous), baseline;
        }, poll = async (streamId, threadId, run) => {
          for (; runRef.current === run; ) {
            let batch = await props.control("codex.stream.next", { streamId });
            if (runRef.current !== run || !codexFrameBatch(batch)) return;
            let completed = !1;
            for (let frame of batch.frames)
              setTimelineState((previous) => previous === void 0 ? previous : reduceCodexTimelineFrame(previous, frame)), frame.method === "turn/completed" && (completed = !0);
            if (completed && await loadHistory(threadId), batch.closed) return;
          }
        }, runThreadSession = async (threadId, run) => {
          let attempt = 0;
          for (; runRef.current === run; ) {
            let streamId = `codex-web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            try {
              if (await props.control("codex.stream.open", { streamId, threadId }), runRef.current !== run) {
                await props.control("codex.stream.close", { streamId }).catch(() => {
                });
                return;
              }
              streamRef.current = { id: streamId, run, threadId }, await loadHistory(threadId), setLoading(!1), setReconnecting(!1), setError(void 0), attempt = 0, await poll(streamId, threadId, run);
            } catch (reason) {
              runRef.current === run && setError(messageOf(reason));
            } finally {
              streamRef.current?.id === streamId && (streamRef.current = void 0), await props.control("codex.stream.close", { streamId }).catch(() => {
              });
            }
            if (runRef.current !== run) return;
            attempt += 1, setReconnecting(!0), await waitForCodexReconnect(Math.min(1e4, 500 * 2 ** Math.min(attempt - 1, 5)));
          }
        }, openThread = async (thread) => {
          setLoading(!0), setError(void 0), setSelected(thread), setTimelineState(void 0), setReconnecting(!1), await closeActiveStream();
          let run = runRef.current + 1;
          runRef.current = run, runThreadSession(thread.id, run).finally(() => setLoading(!1));
        };
        React.useEffect(() => {
          if (requestedThread === void 0) {
            setSelected(void 0), setTimelineState(void 0), setReconnecting(!1), closeActiveStream();
            return;
          }
          if (selectedRef.current?.id === requestedThread.id) {
            setSelected((previous) => previous === void 0 ? requestedThread : { ...previous, ...requestedThread });
            return;
          }
          openThread(requestedThread);
        }, [requestedThread]);
        let send = async () => {
          let text = prompt.trim();
          if (!(selected === void 0 || selected.archived || text === "")) {
            setBusy(!0), setError(void 0);
            try {
              await props.control("codex.call", {
                method: "thread/resume",
                params: { threadId: selected.id }
              });
              let activeTurnId = timelineState?.activeTurnId, method = activeTurnId === void 0 ? "turn/start" : "turn/steer", result = await props.control("codex.call", {
                method,
                params: method === "turn/steer" ? { threadId: selected.id, expectedTurnId: activeTurnId, input: [{ type: "text", text }] } : { threadId: selected.id, input: [{ type: "text", text }] }
              }), turn = codexRecord(codexRecord(result)?.turn);
              setTimelineState((previous) => previous === void 0 ? previous : {
                ...previous,
                ...typeof turn?.id == "string" ? { activeTurnId: turn.id } : {},
                session: { ...previous.session, status: "running" }
              }), setPrompt("");
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, interrupt = async () => {
          let activeTurnId = timelineState?.activeTurnId;
          if (!(selected === void 0 || activeTurnId === void 0)) {
            setBusy(!0);
            try {
              await props.control("codex.call", {
                method: "turn/interrupt",
                params: { threadId: selected.id, turnId: activeTurnId }
              });
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, respond = async (decision) => {
          let approval2 = timelineState?.approval;
          if (approval2 !== void 0) {
            setBusy(!0);
            try {
              await props.control("codex.respond", { requestHandle: approval2.requestHandle, decision }), setTimelineState((previous) => {
                if (previous === void 0) return previous;
                let items = previous.items.map((item) => item.nativeRef.requestHandle === approval2.requestHandle ? { ...item, status: decision === "accept" ? "completed" : "declined" } : item);
                return { ...previous, items, approval: void 0, session: { ...previous.session, status: "running" } };
              });
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, approval = timelineState?.approval, timeline = timelineState?.items ?? [];
        return selected === void 0 ? React.createElement(
          "section",
          {
            className: "dshCodexSurface dshCodexSurfaceEmpty",
            "aria-label": t("codexTitle")
          },
          React.createElement(
            "div",
            null,
            React.createElement("span", { className: "dshCodexEmptyMark" }, React.createElement(CodexModeIcon, { size: 28 })),
            React.createElement("strong", null, t("codexEntry")),
            React.createElement("p", null, t("codexDescription"))
          )
        ) : React.createElement(
          "section",
          { className: "dshCodexSurface", "aria-label": t("codexTitle") },
          React.createElement(
            "header",
            { className: "dshCodexSurfaceHeader" },
            React.createElement(
              "div",
              null,
              React.createElement("strong", null, selected.name ?? selected.preview ?? selected.id),
              React.createElement("span", null, selected.cwd ?? codexSidebarSessionId(selected.id))
            ),
            React.createElement("span", { className: "dshCodexVirtualBadge" }, t("codexVirtualSessions"))
          ),
          reconnecting ? React.createElement("div", { className: "dshCodexSurfaceStatus", role: "status" }, t("codexReconnecting")) : null,
          React.createElement(
            "div",
            { className: "dshCodexTimeline" },
            loading && timelineState === void 0 ? React.createElement("p", null, t("codexLoading")) : timeline.length === 0 ? React.createElement("p", null, t("codexNoMessages")) : timeline.map((item) => {
              let view = codexDisplayItem(item, t);
              return React.createElement(
                "article",
                {
                  key: item.id,
                  className: `dshCodexItem is${view.kind}`
                },
                React.createElement("small", null, view.label),
                React.createElement("pre", null, view.text)
              );
            })
          ),
          approval === void 0 ? null : React.createElement(
            "section",
            { className: "dshCodexApproval" },
            React.createElement("strong", null, t("codexApproval")),
            approval.command === void 0 ? null : React.createElement("code", null, approval.command),
            approval.reason === void 0 ? null : React.createElement("p", null, approval.reason),
            React.createElement(
              "div",
              null,
              React.createElement("button", { type: "button", disabled: busy, onClick: () => void respond("decline") }, t("codexDeny")),
              React.createElement("button", { type: "button", disabled: busy, onClick: () => void respond("accept") }, t("codexAllowOnce"))
            )
          ),
          selected.archived ? null : React.createElement(
            "footer",
            { className: "dshCodexComposer" },
            React.createElement("textarea", {
              value: prompt,
              rows: 3,
              disabled: busy || approval !== void 0,
              placeholder: t(approval === void 0 ? "codexPromptPlaceholder" : "codexApproval"),
              onChange: (event) => setPrompt(event.target.value),
              onKeyDown: (event) => {
                event.key === "Enter" && (event.metaKey || event.ctrlKey) && send();
              }
            }),
            timelineState?.activeTurnId === void 0 ? React.createElement("button", {
              type: "button",
              disabled: busy || approval !== void 0 || prompt.trim() === "",
              onClick: () => {
                send();
              }
            }, t(busy ? "codexSending" : "codexSend")) : React.createElement("button", {
              type: "button",
              disabled: busy,
              onClick: () => {
                interrupt();
              }
            }, t("codexStop"))
          ),
          error === void 0 ? null : React.createElement("p", { className: "dshRemoteError dshCodexSurfaceError", role: "alert" }, error)
        );
      }
      function createCodexSidebarStore() {
        let snapshot = { mode: "harness", expanded: !0 }, listeners = /* @__PURE__ */ new Set(), publish = () => {
          for (let listener of listeners) listener();
        }, replace = (next) => {
          snapshot.mode === next.mode && snapshot.expanded === next.expanded && snapshot.selectedThread?.id === next.selectedThread?.id && snapshot.selectedThread === next.selectedThread || (snapshot = next, publish());
        };
        return {
          getSnapshot: () => snapshot,
          subscribe: (listener) => (listeners.add(listener), () => {
            listeners.delete(listener);
          }),
          setMode: (mode) => {
            replace({ ...snapshot, mode });
          },
          setExpanded: (expanded) => {
            replace({ ...snapshot, expanded });
          },
          selectThread: (thread) => {
            if (thread === void 0) {
              let { selectedThread: _selectedThread, ...rest } = snapshot;
              replace(rest);
              return;
            }
            replace({ ...snapshot, expanded: !0, selectedThread: thread });
          }
        };
      }
      function codexSidebarSessionId(threadId) {
        return `codex:${threadId}`;
      }
      function codexTimestampMs(timestamp) {
        return timestamp === void 0 || !Number.isFinite(timestamp) ? Date.now() : timestamp < 1e11 ? timestamp * 1e3 : timestamp;
      }
      function formatCodexTime(timestamp) {
        return timestamp === void 0 || !Number.isFinite(timestamp) ? "" : new Date(codexTimestampMs(timestamp)).toLocaleString(void 0, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
      function codexThreadRunning(value) {
        return codexRecord(value)?.type === "active";
      }
      function codexThreadWaitingOnApproval(value) {
        let status = codexRecord(value);
        return status?.type === "active" && Array.isArray(status.activeFlags) && status.activeFlags.includes("waitingOnApproval");
      }
      function codexSameSelection(left, right) {
        return Object.is(left, right);
      }
      function useCodexSource(source, selector, equals = codexSameSelection) {
        let [selected, setSelected] = React.useState(() => selector(source.getSnapshot())), selectedRef = React.useRef(selected);
        return selectedRef.current = selected, React.useEffect(() => {
          let publish = () => {
            let next = selector(source.getSnapshot());
            equals(selectedRef.current, next) || (selectedRef.current = next, setSelected(next));
          };
          return publish(), source.subscribe(publish);
        }, [source, selector, equals]), selected;
      }
      function codexRecord(value) {
        return typeof value == "object" && value !== null && !Array.isArray(value) ? value : void 0;
      }
      function codexThreadPage(value, archivedView = !1) {
        let result = codexRecord(value);
        if (!Array.isArray(result?.data)) throw new Error("The Host returned an invalid Codex thread list.");
        return { rows: result.data.flatMap((item) => {
          let row = codexRecord(item);
          return typeof row?.id != "string" ? [] : [{
            id: row.id,
            ...typeof row.name == "string" ? { name: row.name } : {},
            ...typeof row.preview == "string" ? { preview: row.preview } : {},
            ...typeof row.cwd == "string" ? { cwd: row.cwd } : {},
            ...typeof row.createdAt == "number" ? { createdAt: row.createdAt } : {},
            ...typeof row.updatedAt == "number" ? { updatedAt: row.updatedAt } : {},
            archived: typeof row.archived == "boolean" ? row.archived : archivedView,
            ...typeof row.isPinned == "boolean" ? { isPinned: row.isPinned } : {},
            status: row.status
          }];
        }), ...typeof result.nextCursor == "string" ? { nextCursor: result.nextCursor } : {} };
      }
      function mergeCodexThreads(current, incoming) {
        let merged = [...current];
        for (let thread of incoming) {
          let index = merged.findIndex((value) => value.id === thread.id);
          index < 0 ? merged.push(thread) : merged[index] = thread;
        }
        return merged;
      }
      function codexResultThread(value) {
        let thread = codexRecord(codexRecord(value)?.thread);
        if (typeof thread?.id == "string")
          return thread;
      }
      function codexFrameBatch(value) {
        let batch = codexRecord(value);
        return Array.isArray(batch?.frames) && batch.frames.every((frame) => typeof codexRecord(frame)?.method == "string") && typeof batch.closed == "boolean";
      }
      function codexDisplayItem(item, t) {
        if (item.kind === "message")
          return {
            kind: item.role === "user" ? "User" : "Assistant",
            label: item.role === "user" ? t("codexYou") : "Codex",
            text: item.text ?? ""
          };
        if (item.kind === "file-change") return { kind: "Tool", label: t("codexFiles"), text: item.text ?? t("codexFiles") };
        if (item.kind === "tool")
          return {
            kind: "Tool",
            label: item.details?.type === "commandExecution" ? t("codexCommand") : t("codexTool"),
            text: item.text ?? t("codexTool")
          };
        if (item.kind === "approval") return { kind: "Tool", label: t("codexApproval"), text: item.text ?? t("codexApproval") };
        if (item.kind === "error") return { kind: "Unknown", label: t("codexStatus"), text: item.text ?? "Codex error" };
        if (item.kind === "status") return { kind: "Unknown", label: t("codexStatus"), text: item.text ?? "" };
        let type = typeof item.details?.type == "string" ? item.details.type : "unknown";
        return { kind: "Unknown", label: "Codex", text: item.text ?? t("codexUnknownItem", { type }) };
      }
      function waitForCodexReconnect(delayMs) {
        return new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }
      function codexStatusLabel(value, t) {
        let status = codexRecord(value);
        return status?.type === "active" ? Array.isArray(status.activeFlags) && status.activeFlags.includes("waitingOnApproval") ? t("codexWaiting") : t("codexRunning") : status?.type === "systemError" ? t("codexFailed") : t("codexIdle");
      }
      function codexTimestampLabel(timestamp) {
        if (timestamp === void 0 || !Number.isFinite(timestamp)) return "";
        let milliseconds = timestamp < 1e11 ? timestamp * 1e3 : timestamp;
        return new Date(milliseconds).toLocaleString(void 0, { dateStyle: "short", timeStyle: "short" });
      }
      function RemoteModeAction(props) {
        let { t } = props, [open, setOpen] = React.useState(!1), [status, setStatus] = React.useState(void 0), [devices, setDevices] = React.useState([]), [hostRegistrationCode, setHostRegistrationCode] = React.useState(""), [email, setEmail] = React.useState(""), [password, setPassword] = React.useState(""), [busy, setBusy] = React.useState(!1), [progress, setProgress] = React.useState(void 0), progressRun = React.useRef(0), [error, setError] = React.useState(void 0), [supported, setSupported] = React.useState(!0), refresh = async () => {
          let [nextStatus, nextDevices] = await Promise.all([
            props.control("status"),
            props.control("devices").catch(() => [])
          ]);
          setStatus(nextStatus), setDevices(nextDevices);
        }, refreshStatus = async () => {
          setStatus(await props.control("status"));
        };
        React.useEffect(() => {
          refresh().catch((reason) => {
            setError(messageOf(reason)), setSupported(!1);
          });
        }, []), React.useEffect(() => {
          if (!open) return;
          refreshStatus();
          let timer = window.setInterval(() => {
            refreshStatus();
          }, 1500);
          return () => window.clearInterval(timer);
        }, [open]);
        let switchMode = async (mode, targetDeviceId) => {
          setBusy(!0), setError(void 0);
          try {
            let action = () => props.control("mode.set", { mode, ...targetDeviceId === void 0 ? {} : { targetDeviceId } });
            setStatus(mode === "remote" ? await runRemoteProgress(
              connectHostProgressSteps(status?.preferredTransports),
              setProgress,
              progressRun,
              action,
              connectedProgress
            ) : await action()), window.location.reload();
          } catch (reason) {
            setError(messageOf(reason)), setBusy(!1);
          }
        }, loginHost = async () => {
          if (!(email.trim() === "" || password === "")) {
            setBusy(!0), setError(void 0);
            try {
              await props.control("host.account.login", { email: email.trim(), password }), await refreshStatus();
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setPassword(""), setBusy(!1);
            }
          }
        }, registerHostWithCode = async () => {
          if (hostRegistrationCode.trim() !== "") {
            setBusy(!0), setError(void 0);
            try {
              await props.control("host.registration-code.submit", { code: hostRegistrationCode.trim() }), setHostRegistrationCode(""), await refreshStatus();
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, label = status?.mode === "remote" ? t("remoteTarget", { name: status.target?.name ?? t("host") }) : t("local");
        return supported ? React.createElement(
          React.Fragment,
          null,
          React.createElement("button", {
            type: "button",
            className: "dshRemoteModeButton",
            title: t("switchTarget"),
            "aria-label": t("switchTarget"),
            onClick: () => setOpen(!0)
          }, React.createElement("span", { "aria-hidden": !0 }, "\u25CE"), props.wide ? React.createElement("span", null, label) : null),
          open ? React.createElement(
            "div",
            { className: "dshRemoteBackdrop", role: "presentation" },
            React.createElement(
              "section",
              {
                className: "dshRemoteDialog",
                role: "dialog",
                "aria-modal": !0,
                "aria-label": t("harnessTarget")
              },
              React.createElement(
                "div",
                { className: "dshRemoteHeader" },
                React.createElement("strong", null, t("harnessTarget")),
                React.createElement("button", { type: "button", onClick: () => setOpen(!1), "aria-label": t("close") }, "\xD7")
              ),
              React.createElement("button", {
                type: "button",
                disabled: busy || status?.mode === "local",
                onClick: () => void switchMode("local")
              }, t("thisMachineLocal")),
              React.createElement("div", { className: "dshRemoteDevices" }, devices.length === 0 ? React.createElement("p", null, t("noRemoteHosts")) : devices.map((device) => React.createElement("button", {
                type: "button",
                key: device.deviceId,
                disabled: busy || !device.online || status?.target?.deviceId === device.deviceId,
                onClick: () => void switchMode("remote", device.deviceId)
              }, `${device.name} \xB7 ${t(device.online ? "online" : "offline")}`))),
              React.createElement(RemoteProgressView, { progress, t }),
              status?.hostAuthorizationAvailable && status.host !== void 0 ? React.createElement(
                "div",
                { className: "dshRemoteHostAccount" },
                React.createElement("strong", null, t("thisMachineHost")),
                React.createElement("p", null, status.host.online ? status.host.account === void 0 ? t("connected") : t("connectedAs", { account: status.host.account }) : status.host.accountRequired ? t("hostSignInHint") : status.host.error === void 0 ? t("checkingHost") : t("hostUnavailable", { error: connectionErrorMessage(status.host.error, t) })),
                status.host.accountRequired ? React.createElement(
                  "div",
                  { className: "dshRemoteLogin" },
                  React.createElement("input", {
                    type: "email",
                    value: email,
                    disabled: busy,
                    autoComplete: "username",
                    placeholder: t("serverAccountEmail"),
                    "aria-label": t("serverAccountEmail"),
                    onChange: (event) => setEmail(event.target.value)
                  }),
                  React.createElement("input", {
                    type: "password",
                    value: password,
                    disabled: busy,
                    autoComplete: "current-password",
                    placeholder: t("password"),
                    "aria-label": t("serverAccountPassword"),
                    onChange: (event) => setPassword(event.target.value)
                  }),
                  React.createElement("button", {
                    type: "button",
                    disabled: busy || email.trim() === "" || password === "",
                    onClick: () => void loginHost()
                  }, t(busy ? "signingIn" : "signInRegisterHost")),
                  React.createElement("input", {
                    value: hostRegistrationCode,
                    disabled: busy,
                    autoComplete: "one-time-code",
                    placeholder: t("hostRegistrationCode"),
                    "aria-label": t("hostRegistrationCode"),
                    onChange: (event) => setHostRegistrationCode(event.target.value)
                  }),
                  React.createElement("button", {
                    type: "button",
                    disabled: busy || hostRegistrationCode.trim() === "",
                    onClick: () => void registerHostWithCode()
                  }, t(busy ? "registering" : "useRegistrationCode"))
                ) : null
              ) : null,
              error === void 0 ? null : React.createElement("p", { className: "dshRemoteError", role: "alert" }, error)
            )
          ) : null
        ) : null;
      }
      function RemoteSessionHeaderAction(props) {
        let { t } = props, [status, setStatus] = React.useState(void 0), [busy, setBusy] = React.useState(!1), [routeOpen, setRouteOpen] = React.useState(!1);
        if (React.useEffect(() => {
          let active = !0, refresh = () => {
            props.control("status").then((next) => {
              active && setStatus(next);
            }).catch(() => {
            });
          };
          refresh();
          let timer = window.setInterval(refresh, 1500);
          return () => {
            active = !1, window.clearInterval(timer);
          };
        }, []), React.useEffect(() => {
          if (status?.mode === "remote")
            return hideLocalSessionActions();
        }, [status?.mode]), React.useEffect(() => {
          if (!routeOpen) return;
          let closeOnEscape = (event) => {
            event.key === "Escape" && setRouteOpen(!1);
          };
          return document.addEventListener("keydown", closeOnEscape), () => document.removeEventListener("keydown", closeOnEscape);
        }, [routeOpen]), status?.mode !== "remote") return null;
        let exit = async () => {
          setBusy(!0);
          try {
            await props.control("mode.set", { mode: "local" }), window.location.reload();
          } finally {
            setBusy(!1);
          }
        }, transport = status.network?.webRtc?.mode ?? status.transport ?? "Disconnected", networkLabel = t(transport === "P2P" ? "remoteNetworkP2p" : transport === "TURN" ? "remoteNetworkTurn" : transport === "Relay" ? "remoteNetworkRelay" : transport === "LAN" ? "remoteNetworkLan" : "remoteNetworkOffline"), networkOnline = status.connected === !0 && transport !== "Disconnected", routeVia = t(transport === "P2P" ? "connectionRouteP2p" : transport === "TURN" ? "connectionRouteTurn" : transport === "Relay" ? "connectionRouteRelay" : "connectionRouteLan"), routeViaDetail = t(transport === "P2P" ? "connectionRouteP2pDetail" : transport === "TURN" ? "connectionRouteTurnDetail" : transport === "Relay" ? "connectionRouteRelayDetail" : "connectionRouteLanDetail"), network = status.network, webRtc = network?.webRtc, controlStateLabel = network?.controlChannelState === "connecting" ? t("controlStateConnecting") : network?.controlChannelState === "open" ? t("controlStateOpen") : network?.controlChannelState === "closing" ? t("controlStateClosing") : t("controlStateClosed"), detailValue = (value) => value === void 0 || value === "" ? t("notProvided") : String(value), candidateLabel = (value) => value === "host" ? t("candidateHost") : value === "srflx" ? t("candidateSrflx") : value === "prflx" ? t("candidatePrflx") : value === "relay" ? t("candidateRelay") : detailValue(value), fact = (label, value, mono = !1) => React.createElement(
          "div",
          null,
          React.createElement("dt", null, label),
          React.createElement("dd", { className: mono ? "isMono" : void 0, title: mono ? value : void 0 }, value)
        );
        return React.createElement(
          "div",
          { className: "dshRemoteSessionHeader", role: "status" },
          React.createElement("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.7,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            "aria-hidden": !0
          }, React.createElement("rect", { x: 3, y: 4, width: 18, height: 13, rx: 2 }), React.createElement("path", { d: "M8 21h8M12 17v4" })),
          React.createElement("span", { className: "dshRemoteSessionTarget" }, t("remoteModeLabel", { name: status.target?.name ?? t("host") })),
          React.createElement("button", {
            type: "button",
            className: `dshRemoteNetwork${networkOnline ? " isOnline" : " isOffline"}`,
            title: networkLabel,
            disabled: !networkOnline,
            "aria-haspopup": "dialog",
            "aria-expanded": routeOpen,
            onClick: () => setRouteOpen((value) => !value)
          }, React.createElement("i", { "aria-hidden": !0 }), networkLabel),
          networkOnline ? React.createElement("span", { className: "dshRemoteEncrypted" }, t("remoteLinkEncrypted")) : null,
          React.createElement("button", { type: "button", className: "dshRemoteHeaderExitLink", disabled: busy, onClick: () => void exit() }, t("exitRemote")),
          routeOpen ? React.createElement("div", {
            className: "dshRemoteRouteBackdrop",
            role: "presentation",
            onMouseDown: (event) => {
              event.target === event.currentTarget && setRouteOpen(!1);
            }
          }, React.createElement(
            "section",
            {
              className: "dshRemoteRoutePanel",
              role: "dialog",
              "aria-label": t("connectionRouteTitle")
            },
            React.createElement(
              "header",
              null,
              React.createElement("strong", null, t("connectionRouteTitle")),
              React.createElement("button", { type: "button", "aria-label": t("close"), onClick: () => setRouteOpen(!1) }, "\xD7")
            ),
            React.createElement(
              "ol",
              null,
              React.createElement(
                "li",
                null,
                React.createElement("small", null, t("connectionRouteFrom")),
                React.createElement("strong", null, network?.local.name ?? t("connectionRouteCurrentDevice")),
                network === void 0 ? null : React.createElement("span", null, `${network.local.platform} \xB7 ${shortDeviceId(network.local.deviceId)}`)
              ),
              React.createElement(
                "li",
                null,
                React.createElement("small", null, t("connectionRouteVia")),
                React.createElement("strong", null, routeVia),
                React.createElement("span", null, routeViaDetail)
              ),
              React.createElement(
                "li",
                null,
                React.createElement("small", null, t("connectionRouteTo")),
                React.createElement("strong", null, network?.remote.name ?? status.target?.name ?? t("host")),
                React.createElement("span", null, network === void 0 ? t("connectionRouteHost") : `${network.remote.platform} \xB7 ${shortDeviceId(network.remote.deviceId)}`)
              )
            ),
            network === void 0 ? null : React.createElement(
              "section",
              { className: "dshRemoteRouteSection" },
              React.createElement("h3", null, t("connectionDetailsConnection")),
              React.createElement(
                "dl",
                null,
                fact(t("connectionId"), detailValue(network.connectionId), !0),
                fact(t("connectedAt"), network.connectedAt === void 0 ? t("notProvided") : formatLocalTime(network.connectedAt)),
                fact(t("preferredTransports"), network.preferredTransports.map((value) => transportLabel(value, t)).join(" \u2192 ")),
                fact(t("controlChannel"), `WebSocket \xB7 ${controlStateLabel}`),
                fact(t("controlAddress"), network.controlChannelUrl, !0)
              )
            ),
            webRtc === void 0 ? null : React.createElement(
              "section",
              { className: "dshRemoteRouteSection" },
              React.createElement("h3", null, t("connectionDetailsWebRtc")),
              React.createElement(
                "dl",
                null,
                fact(t("peerState"), `${webRtc.connectionState} \xB7 ICE ${webRtc.iceConnectionState}`),
                fact(t("dataChannel"), detailValue(webRtc.dataChannelState)),
                fact(t("localCandidate"), candidateLabel(webRtc.localCandidateType)),
                fact(t("remoteCandidate"), candidateLabel(webRtc.remoteCandidateType)),
                fact(t("localAddress"), detailValue(webRtc.localAddress), !0),
                fact(t("remoteAddress"), detailValue(webRtc.remoteAddress), !0),
                fact(t("networkProtocol"), detailValue(webRtc.protocol?.toUpperCase())),
                fact(t("relayProtocol"), detailValue(webRtc.relayProtocol?.toUpperCase())),
                fact(t("roundTripTime"), webRtc.currentRoundTripTimeMs === void 0 ? t("notProvided") : `${webRtc.currentRoundTripTimeMs.toLocaleString()} ms`),
                fact(t("availableBitrate"), webRtc.availableOutgoingBitrate === void 0 ? t("notProvided") : formatBitrate(webRtc.availableOutgoingBitrate)),
                fact(t("bytesSent"), webRtc.bytesSent === void 0 ? t("notProvided") : formatByteSize(webRtc.bytesSent)),
                fact(t("bytesReceived"), webRtc.bytesReceived === void 0 ? t("notProvided") : formatByteSize(webRtc.bytesReceived))
              )
            ),
            React.createElement("p", null, t("connectionRouteEncrypted"))
          )) : null
        );
      }
      function hideLocalSessionActions() {
        let selector = 'button,a,[role="button"]', hiddenAttribute = "data-dsh-remote-hidden-action", localAction = /(?:open|打开).{0,12}vs\s*code|vs\s*code.{0,12}(?:open|打开)|session\s*logs?|download.{0,12}session\s*logs?|会话日志|下载.{0,8}日志/i, inspect = (root) => {
          let candidates = root instanceof Element && root.matches(selector) ? [root, ...Array.from(root.querySelectorAll(selector))] : Array.from(root.querySelectorAll(selector));
          for (let candidate of candidates) {
            if (candidate.closest(".dshRemoteSessionHeader") !== null) continue;
            let label = [
              candidate.getAttribute("aria-label"),
              candidate.getAttribute("title"),
              candidate.getAttribute("data-tooltip"),
              candidate.textContent
            ].filter(Boolean).join(" ");
            localAction.test(label) && candidate.setAttribute(hiddenAttribute, "");
          }
        };
        inspect(document.body);
        let observer = new MutationObserver((records) => {
          for (let record of records) {
            record.type === "attributes" && inspect(record.target);
            for (let node of Array.from(record.addedNodes))
              node instanceof Element && inspect(node);
          }
        });
        return observer.observe(document.body, {
          subtree: !0,
          childList: !0,
          attributes: !0,
          attributeFilter: ["aria-label", "title", "data-tooltip"]
        }), () => {
          observer.disconnect(), document.querySelectorAll(`[${hiddenAttribute}]`).forEach((element) => element.removeAttribute(hiddenAttribute));
        };
      }
      function installCodexWorkspaceModeSwitch(control, t) {
        let switchAttribute = "data-dsh-codex-workspace-switch", addWorkspaceSelectors = [
          'button[aria-label="\u6DFB\u52A0\u5DE5\u4F5C\u533A"]',
          'button[aria-label="Add workspace"]',
          'button[title="\u6DFB\u52A0\u5DE5\u4F5C\u533A"]',
          'button[title="Add workspace"]'
        ], active = !0, supported = !1, remove = () => {
          document.querySelectorAll(`[${switchAttribute}]`).forEach((element) => element.remove());
        }, mount = () => {
          if (!active || !supported || codexSidebar.getSnapshot().mode !== "harness") {
            remove();
            return;
          }
          if (document.querySelector(`[${switchAttribute}]`) !== null) return;
          let anchor = addWorkspaceSelectors.map((selector) => document.querySelector(selector)).find((element) => element !== null);
          if (anchor === void 0) return;
          let actions = anchor.parentElement;
          if (actions === null) return;
          let button = document.createElement("button");
          button.type = "button", button.className = `${anchor.className} dshCodexWorkspaceSwitch`, button.setAttribute(switchAttribute, ""), button.setAttribute("aria-label", t("codexSwitchToCodex")), button.title = t("codexSwitchToCodex"), button.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11.6 4.25A4.75 4.75 0 1 0 11.6 11.75" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10.1 4.25h1.5v1.5" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>', button.addEventListener("click", () => {
            codexSidebar.setExpanded(!0), codexSidebar.setMode("codex");
          }), actions.insertBefore(button, actions.firstChild);
        }, probe = async () => {
          try {
            let result = await control("codex.probe");
            if (!active) return;
            supported = result.supported, !supported && codexSidebar.getSnapshot().mode === "codex" && codexSidebar.setMode("harness"), mount();
          } catch {
            if (!active) return;
            supported = !1, codexSidebar.getSnapshot().mode === "codex" && codexSidebar.setMode("harness"), remove();
          }
        }, observer = new MutationObserver(() => {
          mount();
        });
        observer.observe(document.body, { subtree: !0, childList: !0 });
        let unsubscribe = codexSidebar.subscribe(mount);
        probe();
        let timer = window.setInterval(() => {
          probe();
        }, 3e3);
        return () => {
          active = !1, window.clearInterval(timer), observer.disconnect(), unsubscribe(), remove();
        };
      }
      function asDisposer(value) {
        return typeof value == "function" ? value : () => {
        };
      }
      function installStyle() {
        let style = document.createElement("style");
        return style.dataset.pluginCss = "dsh-remote", style.textContent = [
          'html.dshRemoteTargetActive button[aria-label="\u6DFB\u52A0\u5DE5\u4F5C\u533A"],html.dshRemoteTargetActive button[aria-label="Add workspace"]{display:none!important}',
          "[data-dsh-remote-hidden-action]{display:none!important}",
          ".dshRemoteModeButton{min-height:36px;border:0;background:transparent;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px}.dshRemoteModeButton:is(button){cursor:pointer}",
          ".dshRemoteModeButton:is(button):hover{background:var(--dsw-alias-interactive-bg-hover)}",
          ".dshRemoteSidebarEntry{box-sizing:border-box;position:relative;min-width:0;display:block;overflow:hidden}.dshRemoteSidebarEntry .dshRemoteModeButton{box-sizing:border-box;width:100%;min-width:0}.dshRemoteSidebarEntry.isWide{width:calc(100% + 8px);height:34px;margin:4px -4px}.dshRemoteSidebarEntry.isWide .dshRemoteModeButton{height:34px;min-height:34px;padding:6px 48px 6px 10px;border-radius:12px}.dshRemoteSidebarEntry.isRail{width:36px;height:54px}.dshRemoteSidebarEntry.isRail .dshRemoteModeButton{width:36px;height:36px;min-height:36px;justify-content:center;gap:0;margin:8px 0 10px;padding:0;border-radius:50%}.dshRemoteSidebarEntry.isActive .dshRemoteModeButton{color:var(--dsw-alias-label-secondary);background:transparent}.dshRemoteSidebarLabel{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshRemoteExitLink{position:absolute;top:50%;right:10px;transform:translateY(-50%);white-space:nowrap;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:0;font:inherit;font-size:12px;line-height:20px;cursor:pointer}.dshRemoteExitLink:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteExitLink:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:2px}.dshRemoteExitLink:disabled{opacity:.45;cursor:default;text-decoration:none}",
          ".dshRemoteComputerIcon{box-sizing:border-box;width:18px;height:18px;flex:0 0 18px;color:var(--dsw-alias-label-secondary)}",
          '.dshRemoteSessionHeader{position:fixed;z-index:25;top:12px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 360px);height:28px;display:inline-flex;align-items:center;gap:7px;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}.dshRemoteSessionHeader>svg{width:15px;height:15px;flex:0 0 auto}.dshRemoteSessionTarget{min-width:0;max-width:260px;overflow:hidden;text-overflow:ellipsis}.dshRemoteNetwork{flex:0 0 auto;border:0;background:transparent;color:inherit;font:inherit;padding:3px 2px;display:inline-flex;align-items:center;gap:5px;cursor:pointer}.dshRemoteNetwork:hover:not(:disabled){color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteNetwork:disabled{cursor:default}.dshRemoteNetwork>i{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}.dshRemoteNetwork.isOnline>i{background:var(--dsw-alias-state-success-primary)}.dshRemoteNetwork.isOffline{color:var(--dsw-alias-state-error-primary)}.dshRemoteNetwork.isOffline>i{background:currentColor}.dshRemoteEncrypted{flex:0 0 auto;color:var(--dsw-alias-label-tertiary)}.dshRemoteHeaderExitLink{flex:0 0 auto;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:3px 2px;font:inherit;text-decoration:none;cursor:pointer}.dshRemoteHeaderExitLink:hover{text-decoration:underline;color:var(--dsw-alias-label-primary)}.dshRemoteHeaderExitLink:disabled{opacity:.45;cursor:default;text-decoration:none}.dshRemoteNetwork:focus-visible,.dshRemoteHeaderExitLink:focus-visible,.dshRemoteRoutePanel>header button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.dshRemoteRouteBackdrop{position:fixed;inset:0;z-index:26}.dshRemoteRoutePanel{box-sizing:border-box;position:absolute;top:48px;right:28px;width:min(680px,calc(100vw - 32px));max-height:calc(100vh - 72px);overflow:auto;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:16px;white-space:normal}.dshRemoteRoutePanel>header{position:sticky;top:-16px;z-index:1;display:flex;align-items:center;justify-content:space-between;margin:-16px -16px 0;padding:16px;background:var(--dsw-alias-bg-layer-1)}.dshRemoteRoutePanel>header strong{font-size:14px}.dshRemoteRoutePanel>header button{width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:inherit;font-size:20px;cursor:pointer}.dshRemoteRoutePanel>header button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteRoutePanel ol{display:flex;align-items:stretch;margin:12px 0 0;padding:0 0 16px;border-bottom:1px solid var(--dsw-alias-border-l2);list-style:none}.dshRemoteRoutePanel li{position:relative;min-width:0;flex:1;display:flex;flex-direction:column;gap:4px;padding-right:20px}.dshRemoteRoutePanel li:not(:last-child)::after{content:"\u2192";position:absolute;right:7px;top:21px;color:var(--dsw-alias-label-tertiary)}.dshRemoteRoutePanel li small{color:var(--dsw-alias-label-tertiary)}.dshRemoteRoutePanel li strong,.dshRemoteRoutePanel li span{overflow:hidden;text-overflow:ellipsis}.dshRemoteRoutePanel li strong{font-size:13px}.dshRemoteRoutePanel li span{color:var(--dsw-alias-label-secondary);font-size:11px}.dshRemoteRouteSection{padding-top:16px}.dshRemoteRouteSection h3{margin:0 0 10px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}.dshRemoteRouteSection dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;margin:0}.dshRemoteRouteSection dl>div{min-width:0;display:grid;grid-template-columns:minmax(104px,auto) minmax(0,1fr);gap:10px;padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px;line-height:1.45}.dshRemoteRouteSection dt{color:var(--dsw-alias-label-tertiary)}.dshRemoteRouteSection dd{min-width:0;margin:0;text-align:right;overflow-wrap:anywhere}.dshRemoteRouteSection dd.isMono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}.dshRemoteRoutePanel>p{margin:16px 0 0;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}@media(max-width:620px){.dshRemoteSessionHeader{top:8px;max-width:calc(100vw - 112px)}.dshRemoteSessionHeader>svg{display:none}.dshRemoteSessionTarget{max-width:130px}.dshRemoteEncrypted{display:none}.dshRemoteRoutePanel{top:42px;right:12px;max-height:calc(100vh - 56px)}.dshRemoteRoutePanel ol{flex-direction:column;gap:18px}.dshRemoteRoutePanel li:not(:last-child)::after{content:"\u2193";top:auto;right:auto;bottom:-16px;left:3px}.dshRemoteRouteSection dl{grid-template-columns:1fr}.dshRemoteRouteSection dl>div{grid-template-columns:1fr;gap:2px}.dshRemoteRouteSection dd{text-align:left}}',
          ".dshRemoteSessionHeader{left:auto;right:148px;transform:none;max-width:calc(100vw - 420px)}@media(max-width:760px){.dshRemoteSessionHeader{left:auto;right:104px;transform:none;max-width:calc(100vw - 124px)}}",
          ".dshRemoteModeButton:focus-visible,.dshRemotePage button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}",
          ".dshRemotePage{width:min(720px,100%);max-height:min(760px,calc(100vh - 40px));display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:14px;overflow:hidden;animation:dshRemotePageIn .18s cubic-bezier(.25,1,.5,1)}",
          ".dshRemotePageHeader{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 24px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshRemotePageIntro{min-width:0;flex:1}.dshRemotePageHeader strong{display:block;font-size:18px;line-height:1.4}.dshRemotePageHeader p{min-width:0;max-width:70ch;margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.5}.dshRemotePageActions{flex:0 0 auto;display:flex;align-items:center;gap:4px}.dshRemotePageActions>button{height:40px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;border:0;border-radius:8px;background:transparent;color:inherit;line-height:1;cursor:pointer}.dshRemotePageActions>button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.dshRemotePageActions>button:disabled{opacity:.45;cursor:default}.dshRemotePageRefresh{min-width:48px;padding:0 10px;font:inherit;font-size:13px}.dshRemotePageActions>button:not(.dshRemotePageRefresh){width:40px;padding:0;font-size:24px}",
          ".dshRemotePageBody{padding:24px;overflow:auto;display:flex;flex-direction:column;gap:24px}.dshRemotePageBody button{font:inherit;color:inherit}",
          ".dshCodexWorkspaceSwitch{box-sizing:border-box;min-width:48px;height:28px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);padding:0 7px;font:inherit;font-size:11px;cursor:pointer}.dshCodexWorkspaceSwitch:hover{border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dshCodexWorkspaceSwitch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.dshCodexWorkspaceBrowser{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary)}.dshCodexWorkspaceBrowserHeader{min-height:46px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshCodexWorkspaceBrowserHeader>strong{font-size:13px}.dshCodexWorkspaceModes{display:flex;align-items:center;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:2px}.dshCodexWorkspaceModes button{height:24px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);padding:0 7px;font:inherit;font-size:10px;cursor:pointer}.dshCodexWorkspaceModes button:hover{color:var(--dsw-alias-label-primary)}.dshCodexWorkspaceModes button.isActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}.dshCodexWorkspaceBrowserBody{flex:1;min-height:0;overflow:auto}.dshCodexWorkspaceRail{width:56px;display:flex;justify-content:center;padding-top:8px}.dshCodexWorkspaceRail>button{width:36px;height:36px;border:0;border-radius:50%;background:transparent;display:grid;place-items:center;cursor:pointer}.dshCodexWorkspaceRail>button:hover{background:var(--dsw-alias-interactive-bg-hover)}",
          ".dshCodexSidebarEntry{box-sizing:border-box;min-width:0}.dshCodexSidebarEntry.isWide{width:calc(100% + 8px);height:34px;margin:4px -4px}.dshCodexSidebarEntry.isRail{width:36px;height:54px}.dshCodexSidebarButton{box-sizing:border-box;width:100%;height:34px;border:0;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;padding:6px 10px;font:inherit;text-align:left;cursor:pointer}.dshCodexSidebarEntry.isRail .dshCodexSidebarButton{width:36px;height:36px;justify-content:center;margin:8px 0 10px;padding:0;border-radius:50%}.dshCodexSidebarButton:hover,.dshCodexSidebarEntry.isActive .dshCodexSidebarButton{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexSidebarButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.dshCodexSidebarMark,.dshCodexEmptyMark{box-sizing:border-box;width:20px;height:20px;flex:0 0 20px;border:1px solid currentColor;border-radius:6px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:700}",
          ".dshCodexVirtualBackdrop{position:fixed;inset:0;z-index:1001;background:var(--dsw-alias-bg-mask-3);display:grid;place-items:center;padding:20px}.dshCodexVirtualPage{box-sizing:border-box;width:min(1180px,100%);height:min(820px,calc(100vh - 40px));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv2);animation:dshRemotePageIn .18s cubic-bezier(.25,1,.5,1)}.dshCodexVirtualTopbar{min-height:62px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:10px 18px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshCodexVirtualTopbar>div{min-width:0;display:flex;flex-direction:column;gap:2px}.dshCodexVirtualTopbar strong{font-size:15px}.dshCodexVirtualTopbar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px}.dshCodexVirtualTopbar>button{width:36px;height:36px;flex:0 0 auto;border:0;border-radius:8px;background:transparent;color:inherit;font-size:24px;cursor:pointer}.dshCodexVirtualTopbar>button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexVirtualLayout{flex:1;min-height:0;display:grid;grid-template-columns:300px minmax(0,1fr)}.dshCodexVirtualSidebar{min-width:0;overflow:auto;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}.dshCodexVirtualConversation{min-width:0;min-height:0;overflow:auto;display:flex;background:var(--dsw-alias-bg-base)}",
          ".dshCodexVirtualWorkspace{padding:10px 8px}.dshCodexVirtualWorkspaceHeader{display:flex;align-items:center;gap:4px}.dshCodexVirtualWorkspaceToggle{min-width:0;flex:1;height:36px;border:0;border-radius:8px;background:transparent;color:inherit;display:flex;align-items:center;gap:8px;padding:0 8px;font:inherit;font-weight:600;text-align:left;cursor:pointer}.dshCodexVirtualWorkspaceToggle:hover,.dshCodexVirtualWorkspaceCreate:hover,.dshCodexVirtualSessionsLabel button:hover,.dshCodexVirtualSessionActions button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexVirtualWorkspaceToggle>span:first-child{width:12px;color:var(--dsw-alias-label-secondary)}.dshCodexVirtualWorkspaceCreate{width:30px;height:30px;flex:0 0 auto;border:0;border-radius:7px;background:transparent;color:inherit;font-size:20px;cursor:pointer}.dshCodexVirtualSessions{display:flex;flex-direction:column;gap:3px;padding:4px 0}.dshCodexVirtualSessionsLabel{height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;color:var(--dsw-alias-label-secondary);font-size:11px;text-transform:uppercase;letter-spacing:.04em}.dshCodexVirtualSessionsLabel button{border:0;border-radius:5px;background:transparent;color:inherit;padding:3px 5px;font:inherit;font-size:11px;text-transform:none;cursor:pointer}.dshCodexVirtualWorkspaceState{margin:8px;padding:10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}.dshCodexVirtualWorkspaceUnavailable{padding:18px 10px;color:var(--dsw-alias-label-secondary);font-size:12px}.dshCodexVirtualSession{border-radius:8px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center}.dshCodexVirtualSession:hover,.dshCodexVirtualSession.isSelected{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexVirtualSession.isSelected{box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}.dshCodexVirtualSessionOpen{min-width:0;border:0;background:transparent;color:inherit;display:flex;flex-direction:column;gap:3px;padding:8px;text-align:left;cursor:pointer}.dshCodexVirtualSessionTitle,.dshCodexVirtualSessionMeta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshCodexVirtualSessionTitle{font-size:13px}.dshCodexVirtualSessionMeta{color:var(--dsw-alias-label-secondary);font-size:11px}.dshCodexVirtualSessionActions{display:none;align-items:center;padding-right:4px}.dshCodexVirtualSession:hover .dshCodexVirtualSessionActions,.dshCodexVirtualSession:focus-within .dshCodexVirtualSessionActions{display:flex}.dshCodexVirtualSessionActions button{border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);padding:3px 4px;font:inherit;font-size:10px;cursor:pointer}",
          ".dshCodexSurfaceHeader{min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 20px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}.dshCodexSurfaceHeader>div{min-width:0;display:flex;flex-direction:column;gap:2px}.dshCodexSurfaceHeader strong,.dshCodexSurfaceHeader span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshCodexSurfaceHeader strong{font-size:14px}.dshCodexSurfaceHeader span{color:var(--dsw-alias-label-secondary);font-size:11px}.dshCodexVirtualBadge{flex:0 0 auto;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:2px 7px}.dshCodexSurfaceEmpty{flex:1;align-items:center;justify-content:center;padding:32px}.dshCodexSurfaceEmpty>div{max-width:440px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}.dshCodexSurfaceEmpty .dshCodexEmptyMark{width:38px;height:38px;border-radius:10px;font-size:16px}.dshCodexSurfaceEmpty strong{font-size:16px}.dshCodexSurfaceEmpty p{margin:0;color:var(--dsw-alias-label-secondary);line-height:1.6}@media(max-width:760px){.dshCodexVirtualBackdrop{padding:0}.dshCodexVirtualPage{width:100%;height:100vh;border:0;border-radius:0}.dshCodexVirtualLayout{grid-template-columns:220px minmax(0,1fr)}}@media(max-width:560px){.dshCodexVirtualLayout{display:flex;flex-direction:column}.dshCodexVirtualSidebar{max-height:42%;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshCodexVirtualConversation{flex:1}}",
          ".dshCodexTimeline{box-sizing:border-box;flex:1;min-height:220px;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:18px 24px}.dshCodexTimeline>p{margin:auto;color:var(--dsw-alias-label-secondary)}.dshCodexItem{max-width:86%;align-self:flex-start;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);padding:10px 12px}.dshCodexItem.isUser{align-self:flex-end;background:var(--dsw-alias-bg-layer-3)}.dshCodexItem.isUnknown{color:var(--dsw-alias-label-secondary)}.dshCodexItem>small{display:block;margin-bottom:5px;color:var(--dsw-alias-label-secondary);font-size:11px}.dshCodexItem>pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:13px;line-height:1.55}.dshCodexItem.isTool>pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}.dshCodexComposer{box-sizing:border-box;display:flex;align-items:flex-end;gap:10px;padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}.dshCodexComposer textarea{box-sizing:border-box;min-height:70px;flex:1;resize:vertical;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:10px 12px;font:inherit;line-height:1.5}.dshCodexComposer button{min-height:38px;border:0;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);padding:7px 14px;font:inherit;cursor:pointer}.dshCodexComposer button:disabled{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);cursor:default}@media(max-width:560px){.dshCodexTimeline{padding:14px}.dshCodexItem{max-width:96%}.dshCodexComposer{align-items:stretch;flex-direction:column;padding:10px 14px}.dshCodexComposer button{min-height:42px}}",
          ".dshCodexSurface{box-sizing:border-box;width:100%;height:100%;min-height:100%;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base)}.dshCodexSurface button,.dshCodexSurface input{font:inherit;color:inherit}.dshCodexNativeFlow{flex:1;min-height:0;display:flex;flex-direction:column}.dshCodexSurfaceStatus{padding:8px 24px;color:var(--dsw-alias-label-secondary);font-size:12px}.dshCodexComposerSeat{position:sticky;bottom:0;z-index:2;padding:10px 0 12px;background:var(--dsw-alias-bg-base)}.dshCodexApproval{display:grid;gap:10px;margin:0 24px 12px;border:1px solid var(--dsw-alias-state-warn-primary,var(--dsw-alias-border-l1));border-radius:8px;padding:12px 14px;background:var(--dsw-alias-bg-layer-2)}.dshCodexApproval code{white-space:pre-wrap;overflow-wrap:anywhere}.dshCodexApproval p{margin:0;color:var(--dsw-alias-label-secondary)}.dshCodexApproval>div{display:flex;justify-content:flex-end;gap:8px}.dshCodexApproval button{min-height:34px;border:0;border-radius:8px;padding:6px 12px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);cursor:pointer}.dshCodexApproval button:first-child{background:transparent;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2)}.dshCodexApproval button:disabled{opacity:.45;cursor:default}.dshCodexSurfaceError{margin:0 24px 12px}",
          ".dshCodexWorkspaceSwitch{width:28px!important;min-width:28px!important;height:28px!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;border:0!important;border-radius:50%!important;background:transparent!important;color:var(--dsw-alias-label-primary)!important}.dshCodexWorkspaceSwitch:hover{background:var(--dsw-alias-interactive-bg-hover)!important}.dshCodexWorkspaceSwitch:focus-visible,.dshCodexWorkspaceModeButton:focus-visible,.dshCodexTree button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.dshCodexWorkspaceBrowser{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary)}.dshCodexWorkspaceBrowserHeader{box-sizing:border-box;height:36px;flex:0 0 36px;display:flex;align-items:center;justify-content:space-between;gap:4px;padding:0 0 0 4px}.dshCodexWorkspaceBrowserHeader>span{color:var(--dsw-alias-label-secondary);font-size:14px;font-weight:400}.dshCodexWorkspaceModeButton{box-sizing:border-box;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-primary);padding:0;cursor:pointer}.dshCodexWorkspaceModeButton:hover,.dshCodexWorkspaceModeButton.isActive{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexWorkspaceBrowserBody{flex:1;min-height:0;overflow:auto}.dshCodexWorkspaceRail{width:56px;display:flex;justify-content:center;padding-top:8px}.dshCodexWorkspaceRail>button{width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);display:grid;place-items:center;cursor:pointer}.dshCodexWorkspaceRail>button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
          ".dshCodexTree{box-sizing:border-box;min-height:100%;padding:8px 4px 18px;color:var(--dsw-alias-label-primary)}.dshCodexWorkspaceNodeRow{height:34px;display:flex;align-items:center;gap:2px}.dshCodexWorkspaceNodeToggle{min-width:0;flex:1;height:34px;display:flex;align-items:center;gap:7px;border:0;border-radius:8px;background:transparent;color:inherit;padding:0 6px;text-align:left;font:inherit;font-size:13px;font-weight:500;cursor:pointer}.dshCodexWorkspaceNodeToggle>svg:first-child{flex:0 0 14px;color:var(--dsw-alias-label-tertiary)}.dshCodexWorkspaceNodeToggle>svg:nth-child(2){flex:0 0 16px;color:var(--dsw-alias-label-secondary)}.dshCodexWorkspaceNodeToggle>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshCodexWorkspaceNodeToggle:hover,.dshCodexWorkspaceNodeActions>button:hover,.dshCodexSessionMore:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexWorkspaceNodeActions{display:flex;align-items:center;gap:0}.dshCodexWorkspaceNodeActions>button,.dshCodexSessionMore{box-sizing:border-box;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);padding:0;cursor:pointer}.dshCodexWorkspaceNodeActions>button:disabled,.dshCodexSessionMore:disabled{opacity:.4;cursor:default}.dshCodexSessionList{display:flex;flex-direction:column;padding:2px 0 0 20px}.dshCodexSessionRow{position:relative;min-width:0;height:38px;display:grid;grid-template-columns:minmax(0,1fr) 28px;align-items:center;border-radius:8px}.dshCodexSessionRow:hover,.dshCodexSessionRow.isSelected{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexSessionOpen{min-width:0;height:38px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;border:0;background:transparent;color:inherit;padding:0 4px 0 8px;text-align:left;cursor:pointer}.dshCodexSessionTitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.dshCodexSessionMeta{color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums;white-space:nowrap}.dshCodexSessionMore{opacity:0}.dshCodexSessionRow:hover .dshCodexSessionMore,.dshCodexSessionRow:focus-within .dshCodexSessionMore,.dshCodexSessionMore[aria-expanded=true]{opacity:1}.dshCodexSessionMenu{position:absolute;z-index:8;top:34px;right:2px;min-width:108px;display:flex;flex-direction:column;padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-shadow-lv2)}.dshCodexSessionMenu>button{height:30px;border:0;border-radius:6px;background:transparent;color:inherit;padding:0 9px;text-align:left;font:inherit;font-size:12px;cursor:pointer}.dshCodexSessionMenu>button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexTreeState,.dshCodexWorkspaceUnavailable{margin:8px 10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}",
          ".dshCodexSurfaceEmpty{flex:1;align-items:center;justify-content:center;padding:32px}.dshCodexSurfaceEmpty>div{max-width:420px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}.dshCodexSurfaceEmpty .dshCodexEmptyMark{width:32px;height:32px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary)}.dshCodexSurfaceEmpty strong{font-size:16px;font-weight:600}.dshCodexSurfaceEmpty p{max-width:58ch;margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.55}.dshCodexSurfaceHeader{min-height:52px;padding:7px 20px}.dshCodexVirtualBadge{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);padding:0;font-size:11px}.dshCodexTimeline{gap:10px;padding:18px 24px 28px}.dshCodexItem{max-width:min(82%,720px);border:0;border-radius:8px;background:transparent;padding:8px 10px}.dshCodexItem.isUser{background:var(--dsw-alias-bg-layer-3)}.dshCodexItem.isTool{background:var(--dsw-alias-bg-layer-2)}.dshCodexItem>small{margin-bottom:4px}.dshCodexComposer{padding:12px 20px 16px;background:var(--dsw-alias-bg-base)}@media(max-width:560px){.dshCodexSessionMeta{display:none}.dshCodexSessionMore{opacity:1}.dshCodexTimeline{padding:14px}.dshCodexComposer{padding:10px 14px 14px}}",
          ".dshCodexPage{width:min(920px,100%)}.dshCodexBody{min-height:min(560px,calc(100vh - 180px));gap:14px}.dshCodexThreadList{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}.dshCodexListActions{display:flex;align-items:center;gap:8px;padding:10px 4px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshCodexNewThread{min-width:0;flex:1;display:flex;gap:8px}.dshCodexNewThread input{min-width:0;flex:1;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:8px 10px;font:inherit}.dshCodexNewThread button,.dshCodexArchiveView,.dshCodexThreadHeader button{min-height:34px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:inherit;padding:6px 10px;cursor:pointer}.dshCodexNewThread button:disabled,.dshCodexArchiveView:disabled,.dshCodexThreadHeader button:disabled{opacity:.45;cursor:default}.dshCodexThreadList>button{min-height:62px;display:flex;align-items:center;justify-content:space-between;gap:18px;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:10px 6px;text-align:left;cursor:pointer}.dshCodexThreadList>button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexThreadList>button>span{min-width:0;display:flex;flex-direction:column;gap:4px}.dshCodexThreadList>.dshCodexLoadMore{min-height:40px;justify-content:center;color:var(--dsw-alias-label-secondary);text-align:center}.dshCodexThreadList strong,.dshCodexThreadList small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshCodexThreadList small,.dshCodexThreadHeader span,.dshCodexThreadHeader small{color:var(--dsw-alias-label-secondary);font-size:12px}.dshCodexThreadHeader{display:flex;align-items:center;gap:8px;min-width:0}.dshCodexThreadHeader strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshCodexThreadHeader span{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshCodexTimeline{min-height:220px;display:flex;flex-direction:column;gap:12px;padding:2px 0}.dshCodexTimeline>p{color:var(--dsw-alias-label-secondary)}.dshCodexItem{max-width:86%;align-self:flex-start;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);padding:10px 12px}.dshCodexItem.isUser{align-self:flex-end;background:var(--dsw-alias-bg-layer-3)}.dshCodexItem.isUnknown{color:var(--dsw-alias-label-secondary)}.dshCodexItem>small{display:block;margin-bottom:5px;color:var(--dsw-alias-label-secondary)}.dshCodexItem>pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:13px;line-height:1.55}.dshCodexItem.isTool>pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}.dshCodexApproval{display:grid;gap:10px;border:1px solid var(--dsw-alias-state-warn-primary,var(--dsw-alias-border-l1));border-radius:10px;padding:12px 14px;background:var(--dsw-alias-bg-layer-2)}.dshCodexApproval code{white-space:pre-wrap;overflow-wrap:anywhere}.dshCodexApproval p{margin:0;color:var(--dsw-alias-label-secondary)}.dshCodexApproval>div{display:flex;justify-content:flex-end;gap:8px}.dshCodexApproval button,.dshCodexComposer button{min-height:38px;border:0;border-radius:8px;padding:7px 14px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);cursor:pointer}.dshCodexApproval button:first-child{background:transparent;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2)}.dshCodexComposer{position:sticky;bottom:-24px;display:flex;align-items:flex-end;gap:10px;margin-top:auto;padding:12px 0 0;background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l2)}.dshCodexComposer textarea{box-sizing:border-box;min-height:74px;flex:1;resize:vertical;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:10px 12px;font:inherit;line-height:1.5}.dshCodexComposer button:disabled,.dshCodexApproval button:disabled{opacity:.45;cursor:default}@media(max-width:620px){.dshCodexBody{min-height:calc(100vh - 150px)}.dshCodexListActions,.dshCodexNewThread{align-items:stretch;flex-direction:column}.dshCodexThreadHeader{align-items:stretch;flex-wrap:wrap}.dshCodexThreadHeader span{flex-basis:100%}.dshCodexItem{max-width:96%}.dshCodexComposer{bottom:-20px;flex-direction:column;align-items:stretch}.dshCodexComposer button{min-height:44px}}",
          ".dshCodexWorkspaceRow{box-sizing:border-box;flex:none;padding:0 4px}.dshCodexWorkspaceButton{box-sizing:border-box;width:100%;height:34px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;padding:6px 10px;font:inherit;text-align:left;cursor:pointer}.dshCodexWorkspaceButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexWorkspaceButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.dshCodexWorkspaceIcon{width:18px;height:18px;flex:0 0 18px;color:var(--dsw-alias-label-secondary)}.dshCodexWorkspaceLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshCodexSurface{box-sizing:border-box;min-height:100%;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1)}.dshCodexSurface button,.dshCodexSurface input{font:inherit;color:inherit}.dshCodexSurfaceHeader{position:sticky;top:0;z-index:2;min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 24px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}.dshCodexSurfaceTitle,.dshCodexThreadTitle{min-width:0;display:flex;flex-direction:column;gap:2px}.dshCodexSurfaceTitle strong,.dshCodexThreadTitle strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600}.dshCodexSurfaceTitle span,.dshCodexThreadTitle span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.45}.dshCodexHeaderBack{flex:0 0 auto;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:5px 0;cursor:pointer}.dshCodexHeaderBack:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}.dshCodexHeaderActions{flex:0 0 auto;display:flex;align-items:center;gap:6px}.dshCodexHeaderActions>span{color:var(--dsw-alias-label-secondary);font-size:12px}.dshCodexHeaderActions>button,.dshCodexNewThread button,.dshCodexThreadList>.dshCodexLoadMore{min-height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:inherit;padding:5px 10px;cursor:pointer}.dshCodexHeaderActions>button:hover:not(:disabled),.dshCodexNewThread button:hover:not(:disabled),.dshCodexThreadList>.dshCodexLoadMore:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-label-dimmed)}.dshCodexHeaderActions>button:disabled,.dshCodexNewThread button:disabled,.dshCodexThreadList>.dshCodexLoadMore:disabled,.dshCodexApproval button:disabled{opacity:.45;cursor:default}.dshCodexSurfaceBody{box-sizing:border-box;flex:1;min-height:0;display:flex;flex-direction:column;gap:12px;padding:14px 24px 18px}.dshCodexThreadList{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}.dshCodexListActions{display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshCodexNewThread{min-width:0;flex:1;display:flex;gap:8px}.dshCodexNewThread input{box-sizing:border-box;min-width:0;flex:1;height:34px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:0 10px}.dshCodexThreadList>button{min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:18px;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:10px 4px;text-align:left;cursor:pointer}.dshCodexThreadList>button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshCodexThreadList>button>span{min-width:0;display:flex;flex-direction:column;gap:4px}.dshCodexThreadList strong,.dshCodexThreadList small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshCodexThreadList small{color:var(--dsw-alias-label-secondary);font-size:12px}.dshCodexNativeFlow{flex:1;min-height:320px;display:flex;flex-direction:column}.dshCodexComposerSeat{position:sticky;bottom:0;z-index:2;padding:10px 0 12px;background:var(--dsw-alias-bg-layer-1)}.dshCodexApproval{display:grid;gap:10px;border:1px solid var(--dsw-alias-state-warn-primary,var(--dsw-alias-border-l1));border-radius:8px;padding:12px 14px;background:var(--dsw-alias-bg-layer-2)}.dshCodexApproval code{white-space:pre-wrap;overflow-wrap:anywhere}.dshCodexApproval p{margin:0;color:var(--dsw-alias-label-secondary)}.dshCodexApproval>div{display:flex;justify-content:flex-end;gap:8px}.dshCodexApproval button{min-height:34px;border:0;border-radius:8px;padding:6px 12px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);cursor:pointer}.dshCodexApproval button:first-child{background:transparent;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2)}.dshCodexSurfaceError{margin:0 0 12px}@media(max-width:620px){.dshCodexSurfaceHeader{align-items:flex-start;flex-direction:column;padding:10px 16px}.dshCodexHeaderActions{width:100%;flex-wrap:wrap}.dshCodexSurfaceBody{padding:12px 16px 16px}.dshCodexListActions,.dshCodexNewThread{align-items:stretch;flex-direction:column}.dshCodexThreadList>button{align-items:flex-start;flex-direction:column;gap:5px}.dshCodexNativeFlow{min-height:240px}}",
          ".dshRemoteSectionHeading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px}.dshRemoteSectionTitle{min-width:0;display:flex;align-items:center;gap:10px}.dshRemoteSectionTitle>strong{font-size:14px}.dshRemoteSectionActions{display:flex;align-items:center;gap:14px}.dshRemoteSectionActions>button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:5px 0;font-size:12px}.dshRemoteSectionActions>button:hover:not(:disabled){color:var(--dsw-alias-label-primary);text-decoration:underline}",
          ".dshRemoteSectionHeading>.dshRemoteAddWorkspace{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;border-radius:50%;font-size:20px;line-height:1}.dshRemoteSectionHeading>.dshRemoteAddWorkspace:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
          ".dshRemoteHostList{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteHostList>button{min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:left;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:10px 4px;cursor:pointer}.dshRemoteHostList>button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteHostList>button:disabled{opacity:.5;cursor:default}.dshRemoteHostList>button>span{min-width:0;display:flex;flex-direction:column;gap:3px}.dshRemoteHostList>button strong{font-size:14px;font-weight:500}.dshRemoteHostList small,.dshRemoteSelectedHost small{color:var(--dsw-alias-label-secondary);font-size:12px}",
          ".dshRemoteSelectedHost{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-2)}",
          ".dshRemoteProgress{display:flex;flex-direction:column;gap:8px;margin:12px 0;padding:12px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}.dshRemoteProgressHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.dshRemoteProgressHeader strong{font-size:13px;font-weight:600}.dshRemoteProgressHeader span{color:var(--dsw-alias-label-secondary);font-size:12px}.dshRemoteProgressBar{height:6px;overflow:hidden;border-radius:999px;background:var(--dsw-alias-bg-layer-3)}.dshRemoteProgressBar>span{display:block;height:100%;border-radius:inherit;background:var(--dsw-alias-brand-primary);transition:width .22s ease-out}.dshRemoteProgress p{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.45}.dshRemoteProgressRoute{font-weight:500}.dshRemoteProgressRoute .isActive{color:var(--dsw-alias-state-success-primary);font-weight:700}.dshRemoteProgressRouteArrow{color:var(--dsw-alias-label-tertiary)}@media(prefers-reduced-motion:reduce){.dshRemoteProgressBar>span{transition:none}}",
          '.dshRemoteBrowser{display:flex;flex-direction:column}.dshRemoteCrumbs{display:flex;align-items:center;gap:4px;overflow:auto;padding:2px 0 10px}.dshRemoteCrumbs>button{flex:0 0 auto;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:5px 7px;border-radius:6px;cursor:pointer}.dshRemoteCrumbs>button:not(:last-child)::after{content:" /";color:var(--dsw-alias-label-tertiary)}.dshRemoteCrumbs>button:disabled{color:var(--dsw-alias-label-primary);font-weight:600}',
          ".dshRemoteDirectoryList{min-height:72px;display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteDirectoryList>button{min-height:52px;display:grid;grid-template-columns:auto 1fr;column-gap:10px;text-align:left;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:8px 4px;cursor:pointer}.dshRemoteDirectoryList>button:hover,.dshRemoteDirectoryList>button.isSelected{background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteDirectoryList>button.isSelected{color:var(--dsw-alias-label-primary)}.dshRemoteDirectoryList>button>span:first-child{grid-row:1/3}.dshRemoteDirectoryList>button>small{grid-column:2;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis}.dshRemoteDirectoryList>p,.dshRemoteHint{margin:12px 0;color:var(--dsw-alias-label-secondary);font-size:13px}",
          ".dshRemoteFolderBrowser{margin-top:14px}.dshRemoteFolderBrowser>p,.dshRemoteFolderList>p{margin:12px 0;color:var(--dsw-alias-label-secondary);font-size:13px}.dshRemoteFolderList{max-height:260px;overflow:auto;border-block:1px solid var(--dsw-alias-border-l2)}.dshRemoteFolderList>button{width:100%;min-height:42px;display:flex;align-items:center;gap:9px;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:7px 6px;text-align:left;cursor:pointer}.dshRemoteFolderList>button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteFolderBrowser>small{display:block;margin-top:8px;color:var(--dsw-alias-state-warn-label)}",
          ".dshRemotePathField{display:flex;flex-direction:column;gap:6px;margin-top:20px}.dshRemotePathField>span{font-size:13px;font-weight:600}.dshRemotePathField>input{min-height:40px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:0 12px;font:inherit}.dshRemotePathField>small{color:var(--dsw-alias-label-secondary)}",
          ".dshRemoteOpenBar{position:sticky;bottom:-96px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:20px;padding:14px 0;background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteOpenBar>div{min-width:0;display:flex;flex-direction:column;gap:3px}.dshRemoteOpenBar span{color:var(--dsw-alias-label-secondary);font-size:12px}.dshRemoteOpenBar strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.dshRemoteOpenBar>button,.dshRemoteEnable>button{min-height:40px;flex:0 0 auto;border:0;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);padding:8px 16px;cursor:pointer}.dshRemoteOpenBar>button:disabled,.dshRemoteEnable>button:disabled{opacity:.5;cursor:default}",
          ".dshRemoteEnable{box-sizing:border-box;width:min(440px,100%);max-width:100%;min-height:388px;margin:0 auto;display:flex;flex-direction:column;align-items:stretch;gap:10px}.dshRemoteEnable p{margin:0;color:var(--dsw-alias-label-secondary);line-height:1.5}",
          '.dshRemoteLoginTabs{width:min(440px,100%);display:flex;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshRemoteLoginTabs>button{position:relative;min-height:38px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}.dshRemoteLoginTabs>button:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.dshRemoteLoginTabs>button.isActive{color:var(--dsw-alias-label-primary);font-weight:600}.dshRemoteLoginTabs>button.isActive::after{content:"";position:absolute;right:12px;bottom:-1px;left:12px;height:2px;border-radius:2px 2px 0 0;background:var(--dsw-alias-brand-primary)}.dshRemoteLoginTabs>button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;border-radius:6px}',
          ".dshRemoteClientLogin{width:min(440px,100%);display:flex;flex-direction:column;gap:8px}.dshRemoteClientLogin input{min-height:40px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:0 12px;font:inherit}.dshRemoteClientLogin button{align-self:flex-start;min-height:40px;border:0;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);padding:8px 16px;cursor:pointer}",
          ".dshRemoteQrLogin{width:min(440px,100%);display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 0 2px;text-align:center}.dshRemoteQrLogin img,.dshRemoteQrPlaceholder{box-sizing:border-box;width:200px;height:200px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:#fff;padding:8px}.dshRemoteQrOpen{display:flex;flex-direction:column;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);font-size:12px;text-decoration:none}.dshRemoteQrOpen:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteQrOpen:hover img{border-color:var(--dsw-alias-label-dimmed)}.dshRemoteQrOpen:focus-visible{border-radius:12px;outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}.dshRemoteQrPlaceholder{display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary)}.dshRemoteQrLogin>strong{font-size:14px}.dshRemoteQrLogin>p{max-width:48ch;margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}.dshRemoteQrLogin>.dshRemoteServiceAddress{margin-top:2px;color:var(--dsw-alias-label-tertiary)}.dshRemoteServiceAddress>a{color:var(--dsw-alias-label-secondary);text-decoration:none}.dshRemoteServiceAddress>a:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteQrLogin>button,.dshRemoteClientLogin>.dshRemoteLoginSwitch{min-height:32px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:4px 8px;font:inherit;font-size:12px;cursor:pointer}.dshRemoteQrLogin>button:hover,.dshRemoteClientLogin>.dshRemoteLoginSwitch:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteClientLogin>.dshRemoteLoginSwitch{align-self:flex-start;background:transparent;color:var(--dsw-alias-label-secondary);padding-left:0}",
          ".dshRemoteLoginHeading{box-sizing:border-box;width:100%;display:flex;align-items:baseline;gap:10px;overflow:hidden;white-space:nowrap}.dshRemoteLoginTitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshRemoteLoginHeading>span{flex:0 0 auto;color:var(--dsw-alias-label-secondary);font-size:13px;font-weight:400}.dshRemoteLoginTabs{box-sizing:border-box;width:100%}.dshRemoteLoginTabs>button{min-width:0;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}.dshRemoteLoginTabs>button.isActive::after{right:0;left:0;border-radius:0}.dshRemoteClientLogin,.dshRemoteQrLogin{box-sizing:border-box;width:100%;height:300px;min-height:300px}.dshRemoteClientLogin{align-items:stretch;padding-top:16px}.dshRemoteClientLogin>button{align-self:stretch;width:100%}.dshRemoteQrLogin{padding-top:12px}",
          '.dshRemoteHostControlToggle{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap;cursor:default}.dshRemoteHostControlToggle>input{appearance:none;box-sizing:border-box;position:relative;width:32px;height:18px;flex:0 0 auto;margin:0;border:1px solid var(--dsw-alias-label-secondary);border-radius:999px;background:var(--dsw-alias-bg-layer-3);cursor:pointer;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2);transition:background .16s ease-out,border-color .16s ease-out,box-shadow .16s ease-out}.dshRemoteHostControlToggle>input::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:transform .16s ease-out,background .16s ease-out}.dshRemoteHostControlToggle>input:checked{border-color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-primary);box-shadow:none}.dshRemoteHostControlToggle>input:checked::after{transform:translateX(14px);background:var(--dsw-alias-bg-layer-1)}.dshRemoteHostControlToggle>input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.dshRemoteHostControlToggle>input:disabled{opacity:.5;cursor:default}@media(prefers-reduced-motion:reduce){.dshRemoteHostControlToggle>input,.dshRemoteHostControlToggle>input::after{transition:none}}',
          ".dshRemoteAccountExit{flex:0 0 auto;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:5px 0;font-size:12px;line-height:1.5;white-space:nowrap}.dshRemoteAccountExit:hover:not(:disabled){color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteAccountExit:disabled{opacity:.5;cursor:default;text-decoration:none}",
          ".dshRemoteLocalLink{align-self:flex-start;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:4px 0;cursor:pointer}.dshRemoteLocalLink:hover{color:var(--dsw-alias-label-primary)}",
          "@keyframes dshRemotePageIn{from{opacity:0;transform:translateY(6px) scale(.99)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.dshRemotePage{animation:none}}@media(max-width:620px){.dshRemoteBackdrop{padding:12px}.dshRemotePage{max-height:calc(100vh - 24px)}.dshRemotePageHeader{padding:12px 16px}.dshRemoteSectionHeading{align-items:flex-start;flex-direction:column;gap:8px}.dshRemoteSectionActions{width:100%;justify-content:space-between}.dshRemotePageBody{padding:20px 16px}.dshRemoteOpenBar{align-items:flex-end}.dshRemoteOpenBar>button{min-height:48px}}",
          ".dshRemoteBackdrop{position:fixed;inset:0;z-index:1000;background:var(--dsw-alias-bg-mask-3);display:grid;place-items:center;padding:20px}",
          ".dshRemoteDialog{width:min(460px,100%);max-height:80vh;overflow:auto;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:18px;display:grid;gap:12px;box-shadow:var(--dsw-shadow-lv2)}",
          ".dshRemoteDialog button,.dshRemoteDialog input{font:inherit;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:9px 10px;background:transparent;color:inherit}",
          ".dshRemoteDialog button:not(:disabled){cursor:pointer}.dshRemoteDialog button:disabled{opacity:.5}",
          ".dshRemoteHeader{display:flex;align-items:center;justify-content:space-between}.dshRemoteHeader button{border:0;font-size:22px;padding:0 6px}",
          ".dshRemoteDevices{display:grid;gap:8px}.dshRemoteDevices p{margin:4px 0;color:var(--dsw-alias-label-secondary)}",
          ".dshRemoteError{margin:0;color:var(--dsw-alias-state-error-primary)}",
          ".dshRemoteHostAccount{display:grid;gap:8px;border-top:1px solid var(--dsw-alias-border-l3);padding-top:12px}.dshRemoteHostAccount p{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px}",
          ".dshRemoteLogin{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dshRemoteLogin button{grid-column:1/-1}",
          ".dshRemotePluginCard{list-style:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;transition:border-color .16s,background .16s}",
          ".dshRemotePluginCard:hover{border-color:var(--dsw-alias-label-dimmed)}.dshRemotePluginCard.isOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}",
          ".dshRemotePluginCardHeader{display:flex;align-items:center}.dshRemotePluginCardToggle{appearance:none;width:100%;min-width:0;font:inherit;color:inherit;text-align:left;cursor:pointer;background:transparent;border:0;border-radius:12px;display:flex;align-items:center;gap:12px;padding:14px 16px}.dshRemotePluginCardToggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}",
          ".dshRemotePluginCardHeading{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.dshRemotePluginCardHeading>strong{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.dshRemotePluginCardHeading>span{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.dshRemotePluginCardStatus{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.dshRemotePluginCardStatus.isOnline{color:var(--dsw-alias-state-success-primary)}.dshRemotePluginCardStatus.isReconnecting{color:var(--dsw-alias-state-warn-label)}.dshRemotePluginCardStatus.isOffline{color:var(--dsw-alias-state-error-primary)}.dshRemotePluginCardChevron{color:var(--dsw-alias-label-tertiary);font-size:18px;line-height:14px;transition:transform .16s}.dshRemotePluginCard.isOpen .dshRemotePluginCardChevron{transform:rotate(180deg)}",
          ".dshRemotePluginCardBody{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.dshRemoteSettings{display:flex;flex-direction:column;max-width:720px}.dshRemoteSettingsTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 0}.dshRemoteSettingsState{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}",
          ".dshRemoteField{display:flex;flex-direction:column;gap:6px;padding:12px 0}.dshRemoteField+.dshRemoteField{border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteField label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}.dshRemoteField input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.dshRemoteField input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.dshRemoteField input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.dshRemoteField p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}",
          '.dshRemoteAuthorizationSetting{border-top:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 0}.dshRemoteAuthorizationSetting>div{min-width:0}.dshRemoteAuthorizationSetting strong{font-size:13px;font-weight:500}.dshRemoteAuthorizationSetting p{margin:3px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px}.dshRemoteAuthorizationSetting>input{appearance:none;position:relative;width:38px;height:22px;flex:0 0 auto;margin:0;border:1px solid var(--dsw-alias-label-secondary);border-radius:999px;background:var(--dsw-alias-bg-layer-3);cursor:pointer;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2);transition:background .16s ease-out,border-color .16s ease-out,box-shadow .16s ease-out}.dshRemoteAuthorizationSetting>input::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:transform .16s ease-out,background .16s ease-out}.dshRemoteAuthorizationSetting>input:checked{border-color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-primary);box-shadow:none}.dshRemoteAuthorizationSetting>input:checked::after{transform:translateX(16px);background:var(--dsw-alias-bg-layer-1)}.dshRemoteAuthorizationSetting>input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.dshRemoteAuthorizationSetting>input:disabled{opacity:.5;cursor:default}@media(prefers-reduced-motion:reduce){.dshRemoteAuthorizationSetting>input,.dshRemoteAuthorizationSetting>input::after{transition:none}}',
          ".dshRemoteAssociation{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.dshRemoteAssociation>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dshRemoteAssociation strong{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:1.5}.dshRemoteAssociation p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}",
          ".dshRemoteConnection{border-top:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0}.dshRemoteConnectionSummary{min-width:0;display:flex;flex-direction:column;gap:4px}.dshRemoteConnectionSummary>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dshRemoteConnectionSummary strong{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:1.5}.dshRemoteConnectionSummary p,.dshRemoteConnectionIssue{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.dshRemoteConnectionDot{width:8px;height:8px;flex:0 0 auto;border-radius:999px;background:var(--dsw-alias-label-tertiary)}.dshRemoteConnectionDot.isOnline{background:var(--dsw-alias-state-success-primary)}.dshRemoteConnectionDot.isReconnecting{background:var(--dsw-alias-state-warn-primary)}.dshRemoteConnectionDot.isOffline{background:var(--dsw-alias-state-error-primary)}.dshRemoteConnectionIssue{color:var(--dsw-alias-state-error-primary);padding:0 0 12px}.dshRemoteReconnect{appearance:none;flex:0 0 auto;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);min-height:34px;padding:5px 14px;font-size:13px;line-height:1.5}.dshRemoteReconnect:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteReconnect:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.dshRemoteReconnect:disabled{opacity:.4;cursor:default}",
          ".dshRemoteSettingsFooter{border-top:1px solid var(--dsw-alias-border-l2);display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px}.dshRemoteSettingsFooter .dshRemoteError,.dshRemoteNotice{min-width:0;flex:1;margin:0;font-size:12px;line-height:1.5}.dshRemoteNotice{color:var(--dsw-alias-label-tertiary)}.dshRemoteDiscard,.dshRemoteSave{appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.dshRemoteDiscard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:transparent}.dshRemoteDiscard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.dshRemoteSave{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.dshRemoteDiscard:disabled,.dshRemoteSave:disabled{opacity:.4;cursor:default}.dshRemoteDiscard:focus-visible,.dshRemoteSave:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}",
          "@media(max-width:620px){.dshRemotePluginCardStatus{display:none}.dshRemoteSettingsTop{gap:10px}.dshRemoteConnection{align-items:flex-start}.dshRemoteReconnect{min-height:40px}}"
        ].filter((css) => !css.includes(".dshCodexPage") && !css.includes(".dshCodexWorkspaceRow")).join(""), document.head.append(style), () => style.remove();
      }
      function apply(ctx) {
        if (window.__DS_HARNESS_REMOTE_CLIENT_ACTIVE__) return;
        window.__DS_HARNESS_REMOTE_CLIENT_ACTIVE__ = !0, ctx.effect(() => () => {
          window.__DS_HARNESS_REMOTE_CLIENT_ACTIVE__ = !1;
        }, "ds-harness-remote: client singleton");
        let t = ctx.locale.bind(localeNamespace), control = async (endpoint, payload = {}) => {
          let result;
          for (let attempt = 0; ; attempt += 1)
            try {
              result = await ctx.connection.rpc.call(CONTROL_RPC_PREFIX, endpoint, payload);
              break;
            } catch (reason) {
              if (attempt >= 19 || !isPendingControlRoute(reason)) throw reason;
              await delay(100);
            }
          if (!result.ok) throw new Error(result.error?.message ?? t("remoteRequestFailed"));
          return result.value;
        };
        ctx.effect(() => {
          let disposed = !1, unsubscribe, selection, opening = !1, reconcile = () => {
            if (disposed || opening || selection === void 0) return;
            let pending = selection, snapshot = ctx.workspaces.list.getSnapshot();
            !snapshot.baselinesReady || !snapshot.items.some((workspace) => workspace.workspaceId === pending.workspaceId) || (opening = !0, unsubscribe?.(), unsubscribe = void 0, ctx.workspaces.connectWorkspace(pending.workspaceId).then(async (sessionId) => {
              disposed || (ctx.sessions.open(sessionId), await control("workspace.selection.consume", pending).catch(() => {
              }));
            }).catch((reason) => {
              disposed || console.warn("remote workspace selection failed:", reason);
            }));
          };
          return control("status").then((status) => {
            disposed || status.mode !== "remote" || status.workspaceSelection === void 0 || status.target?.deviceId !== status.workspaceSelection.targetDeviceId || (selection = status.workspaceSelection, unsubscribe = ctx.workspaces.list.subscribe(reconcile), reconcile());
          }).catch(() => {
          }), () => {
            disposed = !0, unsubscribe?.();
          };
        }, "ds-harness-remote: resume selected workspace"), ctx.inject(["fileViewer"], (fileViewerContext) => {
          let viewer = fileViewerContext.get("fileViewer");
          viewer !== void 0 && fileViewerContext.effect(() => {
            let active = !0, unregister, latestSaveAsAllowed = !1, latestSaveAsMaxBytes = REMOTE_FILE_SAVE_AS_MAX_BYTES, sync = async () => {
              try {
                let status = await control("status");
                if (!active) return;
                let supported = shouldUseRemoteFileViewer(status);
                latestSaveAsAllowed = shouldAllowRemoteFileSaveAs(status), latestSaveAsMaxBytes = remoteFileSaveAsMaxBytes(status), supported && unregister === void 0 ? unregister = viewer.registerContentProvider(createRemoteFileContentProvider(
                  (endpoint, payload) => control(endpoint, payload),
                  { saveAsAllowed: () => latestSaveAsAllowed, saveAsMaxBytes: () => latestSaveAsMaxBytes }
                )) : !supported && unregister !== void 0 && (unregister(), unregister = void 0, latestSaveAsAllowed = !1, latestSaveAsMaxBytes = REMOTE_FILE_SAVE_AS_MAX_BYTES);
              } catch {
              }
            };
            sync();
            let timer = window.setInterval(() => {
              sync();
            }, 1500);
            return () => {
              active = !1, window.clearInterval(timer), unregister?.();
            };
          }, "ds-harness-remote: remote file viewer provider");
        }), ctx.effect(() => ctx.locale.register(localeNamespace, { zh, en }), "ds-harness-remote: dictionaries"), ctx.effect(installStyle, "ds-harness-remote: client styles"), ctx.effect(
          () => installCodexWorkspaceModeSwitch(control, ctx.locale.bind(localeNamespace)),
          "ds-harness-remote: CodeX workspace mode switch"
        ), ctx.slots.inject("sidebar.workspaces", () => {
          let release, sync = () => {
            if (codexSidebar.getSnapshot().mode !== "codex") {
              release?.(), release = void 0;
              return;
            }
            release === void 0 && (release = asDisposer(ctx.slots.register({
              name: "sidebar.workspaces",
              priority: -100,
              locale: localeNamespace,
              inject: () => ({ control })
            }, CodexWorkspaceBrowser)));
          }, unsubscribe = codexSidebar.subscribe(sync);
          return sync(), () => {
            unsubscribe(), release?.();
          };
        }), ctx.slots.inject("conversation", () => {
          let release, sync = () => {
            if (codexSidebar.getSnapshot().mode !== "codex") {
              release?.(), release = void 0;
              return;
            }
            release === void 0 && (release = asDisposer(ctx.slots.register({
              name: "conversation",
              priority: -100,
              locale: localeNamespace,
              inject: () => ({ control })
            }, CodexConversationSurface)));
          }, unsubscribe = codexSidebar.subscribe(sync);
          return sync(), () => {
            unsubscribe(), release?.();
          };
        }), ctx.slots.inject("shell.overlay", () => ctx.slots.register({
          name: "shell.overlay",
          id: "ds-harness-remote-global-context",
          order: 20,
          locale: localeNamespace,
          inject: () => ({ control })
        }, RemoteSessionHeaderAction)), ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
          name: "sidebar.footer.action",
          id: "ds-harness-remote-workspace",
          order: -20,
          locale: localeNamespace,
          inject: () => ({
            control,
            preferredQrProvider: ctx.locale.getLocale().active === "zh" ? "zhihu" : "github"
          })
        }, RemoteWorkspaceAction)), ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
          name: "settings.plugin.item",
          key: "ds-harness-remote",
          id: "ds-harness-remote",
          order: 30,
          locale: localeNamespace,
          inject: () => ({ control })
        }, RemotePluginOptions));
      }
      function isPendingControlRoute(reason) {
        return reason instanceof Error && reason.message.startsWith(`transport failure for ${CONTROL_RPC_PREFIX}/`) && reason.message.endsWith(": HTTP 405");
      }
      function delay(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
      }
      function messageOf(reason) {
        return reason instanceof Error ? reason.message : String(reason);
      }
      function formatPlatform(value) {
        let normalized = value.toLowerCase();
        return normalized === "darwin" || normalized === "macos" ? "macOS" : normalized === "win32" || normalized === "windows" ? "Windows" : normalized === "linux" ? "Linux" : value;
      }
      return module.exports.apply = apply, module.exports.inject = inject, module.exports;
    }
  });
})();
