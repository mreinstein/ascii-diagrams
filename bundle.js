(function () {
    'use strict';

    /**
     * This code is an implementation of Alea algorithm; (C) 2010 Johannes Baagøe.
     * Alea is licensed according to the http://en.wikipedia.org/wiki/MIT_License.
     */
    const FRAC = 2.3283064365386963e-10; /* 2^-32 */
    class RNG {
        constructor() {
            this._seed = 0;
            this._s0 = 0;
            this._s1 = 0;
            this._s2 = 0;
            this._c = 0;
        }
        getSeed() { return this._seed; }
        /**
         * Seed the number generator
         */
        setSeed(seed) {
            seed = (seed < 1 ? 1 / seed : seed);
            this._seed = seed;
            this._s0 = (seed >>> 0) * FRAC;
            seed = (seed * 69069 + 1) >>> 0;
            this._s1 = seed * FRAC;
            seed = (seed * 69069 + 1) >>> 0;
            this._s2 = seed * FRAC;
            this._c = 1;
            return this;
        }
        /**
         * @returns Pseudorandom value [0,1), uniformly distributed
         */
        getUniform() {
            let t = 2091639 * this._s0 + this._c * FRAC;
            this._s0 = this._s1;
            this._s1 = this._s2;
            this._c = t | 0;
            this._s2 = t - this._c;
            return this._s2;
        }
        /**
         * @param lowerBound The lower end of the range to return a value from, inclusive
         * @param upperBound The upper end of the range to return a value from, inclusive
         * @returns Pseudorandom value [lowerBound, upperBound], using ROT.RNG.getUniform() to distribute the value
         */
        getUniformInt(lowerBound, upperBound) {
            let max = Math.max(lowerBound, upperBound);
            let min = Math.min(lowerBound, upperBound);
            return Math.floor(this.getUniform() * (max - min + 1)) + min;
        }
        /**
         * @param mean Mean value
         * @param stddev Standard deviation. ~95% of the absolute values will be lower than 2*stddev.
         * @returns A normally distributed pseudorandom value
         */
        getNormal(mean = 0, stddev = 1) {
            let u, v, r;
            do {
                u = 2 * this.getUniform() - 1;
                v = 2 * this.getUniform() - 1;
                r = u * u + v * v;
            } while (r > 1 || r == 0);
            let gauss = u * Math.sqrt(-2 * Math.log(r) / r);
            return mean + gauss * stddev;
        }
        /**
         * @returns Pseudorandom value [1,100] inclusive, uniformly distributed
         */
        getPercentage() {
            return 1 + Math.floor(this.getUniform() * 100);
        }
        /**
         * @returns Randomly picked item, null when length=0
         */
        getItem(array) {
            if (!array.length) {
                return null;
            }
            return array[Math.floor(this.getUniform() * array.length)];
        }
        /**
         * @returns New array with randomized items
         */
        shuffle(array) {
            let result = [];
            let clone = array.slice();
            while (clone.length) {
                let index = clone.indexOf(this.getItem(clone));
                result.push(clone.splice(index, 1)[0]);
            }
            return result;
        }
        /**
         * @param data key=whatever, value=weight (relative probability)
         * @returns whatever
         */
        getWeightedValue(data) {
            let total = 0;
            for (let id in data) {
                total += data[id];
            }
            let random = this.getUniform() * total;
            let id, part = 0;
            for (id in data) {
                part += data[id];
                if (random < part) {
                    return id;
                }
            }
            // If by some floating-point annoyance we have
            // random >= total, just return the last id.
            return id;
        }
        /**
         * Get RNG state. Useful for storing the state and re-setting it via setState.
         * @returns Internal state
         */
        getState() { return [this._s0, this._s1, this._s2, this._c]; }
        /**
         * Set a previously retrieved state.
         */
        setState(state) {
            this._s0 = state[0];
            this._s1 = state[1];
            this._s2 = state[2];
            this._c = state[3];
            return this;
        }
        /**
         * Returns a cloned RNG
         */
        clone() {
            let clone = new RNG();
            return clone.setState(this.getState());
        }
    }
    new RNG().setSeed(Date.now());

    /**
     * @class Abstract display backend module
     * @private
     */
    class Backend {
        getContainer() { return null; }
        setOptions(options) { this._options = options; }
    }

    class Canvas extends Backend {
        constructor() {
            super();
            this._ctx = document.createElement("canvas").getContext("2d");
        }
        schedule(cb) { requestAnimationFrame(cb); }
        getContainer() { return this._ctx.canvas; }
        setOptions(opts) {
            super.setOptions(opts);
            const style = (opts.fontStyle ? `${opts.fontStyle} ` : ``);
            const font = `${style} ${opts.fontSize}px ${opts.fontFamily}`;
            this._ctx.font = font;
            this._updateSize();
            this._ctx.font = font;
            this._ctx.textAlign = "center";
            this._ctx.textBaseline = "middle";
        }
        clear() {
            this._ctx.fillStyle = this._options.bg;
            this._ctx.fillRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.height);
        }
        eventToPosition(x, y) {
            let canvas = this._ctx.canvas;
            let rect = canvas.getBoundingClientRect();
            x -= rect.left;
            y -= rect.top;
            x *= canvas.width / rect.width;
            y *= canvas.height / rect.height;
            if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
                return [-1, -1];
            }
            return this._normalizedEventToPosition(x, y);
        }
    }

    /**
     * Always positive modulus
     * @param x Operand
     * @param n Modulus
     * @returns x modulo n
     */
    function mod(x, n) {
        return (x % n + n) % n;
    }

    /**
     * @class Hexagonal backend
     * @private
     */
    class Hex extends Canvas {
        constructor() {
            super();
            this._spacingX = 0;
            this._spacingY = 0;
            this._hexSize = 0;
        }
        draw(data, clearBefore) {
            let [x, y, ch, fg, bg] = data;
            let px = [
                (x + 1) * this._spacingX,
                y * this._spacingY + this._hexSize
            ];
            if (this._options.transpose) {
                px.reverse();
            }
            if (clearBefore) {
                this._ctx.fillStyle = bg;
                this._fill(px[0], px[1]);
            }
            if (!ch) {
                return;
            }
            this._ctx.fillStyle = fg;
            let chars = [].concat(ch);
            for (let i = 0; i < chars.length; i++) {
                this._ctx.fillText(chars[i], px[0], Math.ceil(px[1]));
            }
        }
        computeSize(availWidth, availHeight) {
            if (this._options.transpose) {
                availWidth += availHeight;
                availHeight = availWidth - availHeight;
                availWidth -= availHeight;
            }
            let width = Math.floor(availWidth / this._spacingX) - 1;
            let height = Math.floor((availHeight - 2 * this._hexSize) / this._spacingY + 1);
            return [width, height];
        }
        computeFontSize(availWidth, availHeight) {
            if (this._options.transpose) {
                availWidth += availHeight;
                availHeight = availWidth - availHeight;
                availWidth -= availHeight;
            }
            let hexSizeWidth = 2 * availWidth / ((this._options.width + 1) * Math.sqrt(3)) - 1;
            let hexSizeHeight = availHeight / (2 + 1.5 * (this._options.height - 1));
            let hexSize = Math.min(hexSizeWidth, hexSizeHeight);
            // compute char ratio
            let oldFont = this._ctx.font;
            this._ctx.font = "100px " + this._options.fontFamily;
            let width = Math.ceil(this._ctx.measureText("W").width);
            this._ctx.font = oldFont;
            let ratio = width / 100;
            hexSize = Math.floor(hexSize) + 1; // closest larger hexSize
            // FIXME char size computation does not respect transposed hexes
            let fontSize = 2 * hexSize / (this._options.spacing * (1 + ratio / Math.sqrt(3)));
            // closest smaller fontSize
            return Math.ceil(fontSize) - 1;
        }
        _normalizedEventToPosition(x, y) {
            let nodeSize;
            if (this._options.transpose) {
                x += y;
                y = x - y;
                x -= y;
                nodeSize = this._ctx.canvas.width;
            }
            else {
                nodeSize = this._ctx.canvas.height;
            }
            let size = nodeSize / this._options.height;
            y = Math.floor(y / size);
            if (mod(y, 2)) { /* odd row */
                x -= this._spacingX;
                x = 1 + 2 * Math.floor(x / (2 * this._spacingX));
            }
            else {
                x = 2 * Math.floor(x / (2 * this._spacingX));
            }
            return [x, y];
        }
        /**
         * Arguments are pixel values. If "transposed" mode is enabled, then these two are already swapped.
         */
        _fill(cx, cy) {
            let a = this._hexSize;
            let b = this._options.border;
            const ctx = this._ctx;
            ctx.beginPath();
            if (this._options.transpose) {
                ctx.moveTo(cx - a + b, cy);
                ctx.lineTo(cx - a / 2 + b, cy + this._spacingX - b);
                ctx.lineTo(cx + a / 2 - b, cy + this._spacingX - b);
                ctx.lineTo(cx + a - b, cy);
                ctx.lineTo(cx + a / 2 - b, cy - this._spacingX + b);
                ctx.lineTo(cx - a / 2 + b, cy - this._spacingX + b);
                ctx.lineTo(cx - a + b, cy);
            }
            else {
                ctx.moveTo(cx, cy - a + b);
                ctx.lineTo(cx + this._spacingX - b, cy - a / 2 + b);
                ctx.lineTo(cx + this._spacingX - b, cy + a / 2 - b);
                ctx.lineTo(cx, cy + a - b);
                ctx.lineTo(cx - this._spacingX + b, cy + a / 2 - b);
                ctx.lineTo(cx - this._spacingX + b, cy - a / 2 + b);
                ctx.lineTo(cx, cy - a + b);
            }
            ctx.fill();
        }
        _updateSize() {
            const opts = this._options;
            const charWidth = Math.ceil(this._ctx.measureText("W").width);
            this._hexSize = Math.floor(opts.spacing * (opts.fontSize + charWidth / Math.sqrt(3)) / 2);
            this._spacingX = this._hexSize * Math.sqrt(3) / 2;
            this._spacingY = this._hexSize * 1.5;
            let xprop;
            let yprop;
            if (opts.transpose) {
                xprop = "height";
                yprop = "width";
            }
            else {
                xprop = "width";
                yprop = "height";
            }
            this._ctx.canvas[xprop] = Math.ceil((opts.width + 1) * this._spacingX);
            this._ctx.canvas[yprop] = Math.ceil((opts.height - 1) * this._spacingY + 2 * this._hexSize);
        }
    }

    /**
     * @class Rectangular backend
     * @private
     */
    class Rect extends Canvas {
        constructor() {
            super();
            this._spacingX = 0;
            this._spacingY = 0;
            this._canvasCache = {};
        }
        setOptions(options) {
            super.setOptions(options);
            this._canvasCache = {};
        }
        draw(data, clearBefore) {
            if (Rect.cache) {
                this._drawWithCache(data);
            }
            else {
                this._drawNoCache(data, clearBefore);
            }
        }
        _drawWithCache(data) {
            let [x, y, ch, fg, bg] = data;
            let hash = "" + ch + fg + bg;
            let canvas;
            if (hash in this._canvasCache) {
                canvas = this._canvasCache[hash];
            }
            else {
                let b = this._options.border;
                canvas = document.createElement("canvas");
                let ctx = canvas.getContext("2d");
                canvas.width = this._spacingX;
                canvas.height = this._spacingY;
                ctx.fillStyle = bg;
                ctx.fillRect(b, b, canvas.width - b, canvas.height - b);
                if (ch) {
                    ctx.fillStyle = fg;
                    ctx.font = this._ctx.font;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    let chars = [].concat(ch);
                    for (let i = 0; i < chars.length; i++) {
                        ctx.fillText(chars[i], this._spacingX / 2, Math.ceil(this._spacingY / 2));
                    }
                }
                this._canvasCache[hash] = canvas;
            }
            this._ctx.drawImage(canvas, x * this._spacingX, y * this._spacingY);
        }
        _drawNoCache(data, clearBefore) {
            let [x, y, ch, fg, bg] = data;
            if (clearBefore) {
                let b = this._options.border;
                this._ctx.fillStyle = bg;
                this._ctx.fillRect(x * this._spacingX + b, y * this._spacingY + b, this._spacingX - b, this._spacingY - b);
            }
            if (!ch) {
                return;
            }
            this._ctx.fillStyle = fg;
            let chars = [].concat(ch);
            for (let i = 0; i < chars.length; i++) {
                this._ctx.fillText(chars[i], (x + 0.5) * this._spacingX, Math.ceil((y + 0.5) * this._spacingY));
            }
        }
        computeSize(availWidth, availHeight) {
            let width = Math.floor(availWidth / this._spacingX);
            let height = Math.floor(availHeight / this._spacingY);
            return [width, height];
        }
        computeFontSize(availWidth, availHeight) {
            let boxWidth = Math.floor(availWidth / this._options.width);
            let boxHeight = Math.floor(availHeight / this._options.height);
            /* compute char ratio */
            let oldFont = this._ctx.font;
            this._ctx.font = "100px " + this._options.fontFamily;
            let width = Math.ceil(this._ctx.measureText("W").width);
            this._ctx.font = oldFont;
            let ratio = width / 100;
            let widthFraction = ratio * boxHeight / boxWidth;
            if (widthFraction > 1) { /* too wide with current aspect ratio */
                boxHeight = Math.floor(boxHeight / widthFraction);
            }
            return Math.floor(boxHeight / this._options.spacing);
        }
        _normalizedEventToPosition(x, y) {
            return [Math.floor(x / this._spacingX), Math.floor(y / this._spacingY)];
        }
        _updateSize() {
            const opts = this._options;
            const charWidth = Math.ceil(this._ctx.measureText("W").width);
            this._spacingX = Math.ceil(opts.spacing * charWidth);
            this._spacingY = Math.ceil(opts.spacing * opts.fontSize);
            if (opts.forceSquareRatio) {
                this._spacingX = this._spacingY = Math.max(this._spacingX, this._spacingY);
            }
            this._ctx.canvas.width = opts.width * this._spacingX;
            this._ctx.canvas.height = opts.height * this._spacingY;
        }
    }
    Rect.cache = false;

    /**
     * @class Tile backend
     * @private
     */
    class Tile extends Canvas {
        constructor() {
            super();
            this._colorCanvas = document.createElement("canvas");
        }
        draw(data, clearBefore) {
            let [x, y, ch, fg, bg] = data;
            let tileWidth = this._options.tileWidth;
            let tileHeight = this._options.tileHeight;
            if (clearBefore) {
                if (this._options.tileColorize) {
                    this._ctx.clearRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
                }
                else {
                    this._ctx.fillStyle = bg;
                    this._ctx.fillRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
                }
            }
            if (!ch) {
                return;
            }
            let chars = [].concat(ch);
            let fgs = [].concat(fg);
            let bgs = [].concat(bg);
            for (let i = 0; i < chars.length; i++) {
                let tile = this._options.tileMap[chars[i]];
                if (!tile) {
                    throw new Error(`Char "${chars[i]}" not found in tileMap`);
                }
                if (this._options.tileColorize) { // apply colorization
                    let canvas = this._colorCanvas;
                    let context = canvas.getContext("2d");
                    context.globalCompositeOperation = "source-over";
                    context.clearRect(0, 0, tileWidth, tileHeight);
                    let fg = fgs[i];
                    let bg = bgs[i];
                    context.drawImage(this._options.tileSet, tile[0], tile[1], tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
                    if (fg != "transparent") {
                        context.fillStyle = fg;
                        context.globalCompositeOperation = "source-atop";
                        context.fillRect(0, 0, tileWidth, tileHeight);
                    }
                    if (bg != "transparent") {
                        context.fillStyle = bg;
                        context.globalCompositeOperation = "destination-over";
                        context.fillRect(0, 0, tileWidth, tileHeight);
                    }
                    this._ctx.drawImage(canvas, x * tileWidth, y * tileHeight, tileWidth, tileHeight);
                }
                else { // no colorizing, easy
                    this._ctx.drawImage(this._options.tileSet, tile[0], tile[1], tileWidth, tileHeight, x * tileWidth, y * tileHeight, tileWidth, tileHeight);
                }
            }
        }
        computeSize(availWidth, availHeight) {
            let width = Math.floor(availWidth / this._options.tileWidth);
            let height = Math.floor(availHeight / this._options.tileHeight);
            return [width, height];
        }
        computeFontSize() {
            throw new Error("Tile backend does not understand font size");
        }
        _normalizedEventToPosition(x, y) {
            return [Math.floor(x / this._options.tileWidth), Math.floor(y / this._options.tileHeight)];
        }
        _updateSize() {
            const opts = this._options;
            this._ctx.canvas.width = opts.width * opts.tileWidth;
            this._ctx.canvas.height = opts.height * opts.tileHeight;
            this._colorCanvas.width = opts.tileWidth;
            this._colorCanvas.height = opts.tileHeight;
        }
    }

    function fromString(str) {
        let cached, r;
        if (str in CACHE) {
            cached = CACHE[str];
        }
        else {
            if (str.charAt(0) == "#") { // hex rgb
                let matched = str.match(/[0-9a-f]/gi) || [];
                let values = matched.map((x) => parseInt(x, 16));
                if (values.length == 3) {
                    cached = values.map((x) => x * 17);
                }
                else {
                    for (let i = 0; i < 3; i++) {
                        values[i + 1] += 16 * values[i];
                        values.splice(i, 1);
                    }
                    cached = values;
                }
            }
            else if ((r = str.match(/rgb\(([0-9, ]+)\)/i))) { // decimal rgb
                cached = r[1].split(/\s*,\s*/).map((x) => parseInt(x));
            }
            else { // html name
                cached = [0, 0, 0];
            }
            CACHE[str] = cached;
        }
        return cached.slice();
    }
    const CACHE = {
        "black": [0, 0, 0],
        "navy": [0, 0, 128],
        "darkblue": [0, 0, 139],
        "mediumblue": [0, 0, 205],
        "blue": [0, 0, 255],
        "darkgreen": [0, 100, 0],
        "green": [0, 128, 0],
        "teal": [0, 128, 128],
        "darkcyan": [0, 139, 139],
        "deepskyblue": [0, 191, 255],
        "darkturquoise": [0, 206, 209],
        "mediumspringgreen": [0, 250, 154],
        "lime": [0, 255, 0],
        "springgreen": [0, 255, 127],
        "aqua": [0, 255, 255],
        "cyan": [0, 255, 255],
        "midnightblue": [25, 25, 112],
        "dodgerblue": [30, 144, 255],
        "forestgreen": [34, 139, 34],
        "seagreen": [46, 139, 87],
        "darkslategray": [47, 79, 79],
        "darkslategrey": [47, 79, 79],
        "limegreen": [50, 205, 50],
        "mediumseagreen": [60, 179, 113],
        "turquoise": [64, 224, 208],
        "royalblue": [65, 105, 225],
        "steelblue": [70, 130, 180],
        "darkslateblue": [72, 61, 139],
        "mediumturquoise": [72, 209, 204],
        "indigo": [75, 0, 130],
        "darkolivegreen": [85, 107, 47],
        "cadetblue": [95, 158, 160],
        "cornflowerblue": [100, 149, 237],
        "mediumaquamarine": [102, 205, 170],
        "dimgray": [105, 105, 105],
        "dimgrey": [105, 105, 105],
        "slateblue": [106, 90, 205],
        "olivedrab": [107, 142, 35],
        "slategray": [112, 128, 144],
        "slategrey": [112, 128, 144],
        "lightslategray": [119, 136, 153],
        "lightslategrey": [119, 136, 153],
        "mediumslateblue": [123, 104, 238],
        "lawngreen": [124, 252, 0],
        "chartreuse": [127, 255, 0],
        "aquamarine": [127, 255, 212],
        "maroon": [128, 0, 0],
        "purple": [128, 0, 128],
        "olive": [128, 128, 0],
        "gray": [128, 128, 128],
        "grey": [128, 128, 128],
        "skyblue": [135, 206, 235],
        "lightskyblue": [135, 206, 250],
        "blueviolet": [138, 43, 226],
        "darkred": [139, 0, 0],
        "darkmagenta": [139, 0, 139],
        "saddlebrown": [139, 69, 19],
        "darkseagreen": [143, 188, 143],
        "lightgreen": [144, 238, 144],
        "mediumpurple": [147, 112, 216],
        "darkviolet": [148, 0, 211],
        "palegreen": [152, 251, 152],
        "darkorchid": [153, 50, 204],
        "yellowgreen": [154, 205, 50],
        "sienna": [160, 82, 45],
        "brown": [165, 42, 42],
        "darkgray": [169, 169, 169],
        "darkgrey": [169, 169, 169],
        "lightblue": [173, 216, 230],
        "greenyellow": [173, 255, 47],
        "paleturquoise": [175, 238, 238],
        "lightsteelblue": [176, 196, 222],
        "powderblue": [176, 224, 230],
        "firebrick": [178, 34, 34],
        "darkgoldenrod": [184, 134, 11],
        "mediumorchid": [186, 85, 211],
        "rosybrown": [188, 143, 143],
        "darkkhaki": [189, 183, 107],
        "silver": [192, 192, 192],
        "mediumvioletred": [199, 21, 133],
        "indianred": [205, 92, 92],
        "peru": [205, 133, 63],
        "chocolate": [210, 105, 30],
        "tan": [210, 180, 140],
        "lightgray": [211, 211, 211],
        "lightgrey": [211, 211, 211],
        "palevioletred": [216, 112, 147],
        "thistle": [216, 191, 216],
        "orchid": [218, 112, 214],
        "goldenrod": [218, 165, 32],
        "crimson": [220, 20, 60],
        "gainsboro": [220, 220, 220],
        "plum": [221, 160, 221],
        "burlywood": [222, 184, 135],
        "lightcyan": [224, 255, 255],
        "lavender": [230, 230, 250],
        "darksalmon": [233, 150, 122],
        "violet": [238, 130, 238],
        "palegoldenrod": [238, 232, 170],
        "lightcoral": [240, 128, 128],
        "khaki": [240, 230, 140],
        "aliceblue": [240, 248, 255],
        "honeydew": [240, 255, 240],
        "azure": [240, 255, 255],
        "sandybrown": [244, 164, 96],
        "wheat": [245, 222, 179],
        "beige": [245, 245, 220],
        "whitesmoke": [245, 245, 245],
        "mintcream": [245, 255, 250],
        "ghostwhite": [248, 248, 255],
        "salmon": [250, 128, 114],
        "antiquewhite": [250, 235, 215],
        "linen": [250, 240, 230],
        "lightgoldenrodyellow": [250, 250, 210],
        "oldlace": [253, 245, 230],
        "red": [255, 0, 0],
        "fuchsia": [255, 0, 255],
        "magenta": [255, 0, 255],
        "deeppink": [255, 20, 147],
        "orangered": [255, 69, 0],
        "tomato": [255, 99, 71],
        "hotpink": [255, 105, 180],
        "coral": [255, 127, 80],
        "darkorange": [255, 140, 0],
        "lightsalmon": [255, 160, 122],
        "orange": [255, 165, 0],
        "lightpink": [255, 182, 193],
        "pink": [255, 192, 203],
        "gold": [255, 215, 0],
        "peachpuff": [255, 218, 185],
        "navajowhite": [255, 222, 173],
        "moccasin": [255, 228, 181],
        "bisque": [255, 228, 196],
        "mistyrose": [255, 228, 225],
        "blanchedalmond": [255, 235, 205],
        "papayawhip": [255, 239, 213],
        "lavenderblush": [255, 240, 245],
        "seashell": [255, 245, 238],
        "cornsilk": [255, 248, 220],
        "lemonchiffon": [255, 250, 205],
        "floralwhite": [255, 250, 240],
        "snow": [255, 250, 250],
        "yellow": [255, 255, 0],
        "lightyellow": [255, 255, 224],
        "ivory": [255, 255, 240],
        "white": [255, 255, 255]
    };

    /**
     * @class Tile backend
     * @private
     */
    class TileGL extends Backend {
        static isSupported() {
            return !!document.createElement("canvas").getContext("webgl2", { preserveDrawingBuffer: true });
        }
        constructor() {
            super();
            this._uniforms = {};
            try {
                this._gl = this._initWebGL();
            }
            catch (e) {
                alert(e.message);
            }
        }
        schedule(cb) { requestAnimationFrame(cb); }
        getContainer() { return this._gl.canvas; }
        setOptions(opts) {
            super.setOptions(opts);
            this._updateSize();
            let tileSet = this._options.tileSet;
            if (tileSet && "complete" in tileSet && !tileSet.complete) {
                tileSet.addEventListener("load", () => this._updateTexture(tileSet));
            }
            else {
                this._updateTexture(tileSet);
            }
        }
        draw(data, clearBefore) {
            const gl = this._gl;
            const opts = this._options;
            let [x, y, ch, fg, bg] = data;
            let scissorY = gl.canvas.height - (y + 1) * opts.tileHeight;
            gl.scissor(x * opts.tileWidth, scissorY, opts.tileWidth, opts.tileHeight);
            if (clearBefore) {
                if (opts.tileColorize) {
                    gl.clearColor(0, 0, 0, 0);
                }
                else {
                    gl.clearColor(...parseColor(bg));
                }
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            if (!ch) {
                return;
            }
            let chars = [].concat(ch);
            let bgs = [].concat(bg);
            let fgs = [].concat(fg);
            gl.uniform2fv(this._uniforms["targetPosRel"], [x, y]);
            for (let i = 0; i < chars.length; i++) {
                let tile = this._options.tileMap[chars[i]];
                if (!tile) {
                    throw new Error(`Char "${chars[i]}" not found in tileMap`);
                }
                gl.uniform1f(this._uniforms["colorize"], opts.tileColorize ? 1 : 0);
                gl.uniform2fv(this._uniforms["tilesetPosAbs"], tile);
                if (opts.tileColorize) {
                    gl.uniform4fv(this._uniforms["tint"], parseColor(fgs[i]));
                    gl.uniform4fv(this._uniforms["bg"], parseColor(bgs[i]));
                }
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            /*
            
            
                    for (let i=0;i<chars.length;i++) {
                        
                        if (this._options.tileColorize) { // apply colorization
                            let canvas = this._colorCanvas;
                            let context = canvas.getContext("2d") as CanvasRenderingContext2D;
                            context.globalCompositeOperation = "source-over";
                            context.clearRect(0, 0, tileWidth, tileHeight);
            
                            let fg = fgs[i];
                            let bg = bgs[i];
            
                            context.drawImage(
                                this._options.tileSet!,
                                tile[0], tile[1], tileWidth, tileHeight,
                                0, 0, tileWidth, tileHeight
                            );
            
                            if (fg != "transparent") {
                                context.fillStyle = fg;
                                context.globalCompositeOperation = "source-atop";
                                context.fillRect(0, 0, tileWidth, tileHeight);
                            }
            
                            if (bg != "transparent") {
                                context.fillStyle = bg;
                                context.globalCompositeOperation = "destination-over";
                                context.fillRect(0, 0, tileWidth, tileHeight);
                            }
            
                            this._ctx.drawImage(canvas, x*tileWidth, y*tileHeight, tileWidth, tileHeight);
                        } else { // no colorizing, easy
                            this._ctx.drawImage(
                                this._options.tileSet!,
                                tile[0], tile[1], tileWidth, tileHeight,
                                x*tileWidth, y*tileHeight, tileWidth, tileHeight
                            );
                        }
                    }
            
            */
        }
        clear() {
            const gl = this._gl;
            gl.clearColor(...parseColor(this._options.bg));
            gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        computeSize(availWidth, availHeight) {
            let width = Math.floor(availWidth / this._options.tileWidth);
            let height = Math.floor(availHeight / this._options.tileHeight);
            return [width, height];
        }
        computeFontSize() {
            throw new Error("Tile backend does not understand font size");
        }
        eventToPosition(x, y) {
            let canvas = this._gl.canvas;
            let rect = canvas.getBoundingClientRect();
            x -= rect.left;
            y -= rect.top;
            x *= canvas.width / rect.width;
            y *= canvas.height / rect.height;
            if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
                return [-1, -1];
            }
            return this._normalizedEventToPosition(x, y);
        }
        _initWebGL() {
            let gl = document.createElement("canvas").getContext("webgl2", { preserveDrawingBuffer: true });
            window.gl = gl;
            let program = createProgram(gl, VS, FS);
            gl.useProgram(program);
            createQuad(gl);
            UNIFORMS.forEach(name => this._uniforms[name] = gl.getUniformLocation(program, name));
            this._program = program;
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.SCISSOR_TEST);
            return gl;
        }
        _normalizedEventToPosition(x, y) {
            return [Math.floor(x / this._options.tileWidth), Math.floor(y / this._options.tileHeight)];
        }
        _updateSize() {
            const gl = this._gl;
            const opts = this._options;
            const canvasSize = [opts.width * opts.tileWidth, opts.height * opts.tileHeight];
            gl.canvas.width = canvasSize[0];
            gl.canvas.height = canvasSize[1];
            gl.viewport(0, 0, canvasSize[0], canvasSize[1]);
            gl.uniform2fv(this._uniforms["tileSize"], [opts.tileWidth, opts.tileHeight]);
            gl.uniform2fv(this._uniforms["targetSize"], canvasSize);
        }
        _updateTexture(tileSet) {
            createTexture(this._gl, tileSet);
        }
    }
    const UNIFORMS = ["targetPosRel", "tilesetPosAbs", "tileSize", "targetSize", "colorize", "bg", "tint"];
    const VS = `
#version 300 es

in vec2 tilePosRel;
out vec2 tilesetPosPx;

uniform vec2 tilesetPosAbs;
uniform vec2 tileSize;
uniform vec2 targetSize;
uniform vec2 targetPosRel;

void main() {
	vec2 targetPosPx = (targetPosRel + tilePosRel) * tileSize;
	vec2 targetPosNdc = ((targetPosPx / targetSize)-0.5)*2.0;
	targetPosNdc.y *= -1.0;

	gl_Position = vec4(targetPosNdc, 0.0, 1.0);
	tilesetPosPx = tilesetPosAbs + tilePosRel * tileSize;
}`.trim();
    const FS = `
#version 300 es
precision highp float;

in vec2 tilesetPosPx;
out vec4 fragColor;
uniform sampler2D image;
uniform bool colorize;
uniform vec4 bg;
uniform vec4 tint;

void main() {
	fragColor = vec4(0, 0, 0, 1);

	vec4 texel = texelFetch(image, ivec2(tilesetPosPx), 0);

	if (colorize) {
		texel.rgb = tint.a * tint.rgb + (1.0-tint.a) * texel.rgb;
		fragColor.rgb = texel.a*texel.rgb + (1.0-texel.a)*bg.rgb;
		fragColor.a = texel.a + (1.0-texel.a)*bg.a;
	} else {
		fragColor = texel;
	}
}`.trim();
    function createProgram(gl, vss, fss) {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vss);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(vs) || "");
        }
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fss);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(fs) || "");
        }
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(p) || "");
        }
        return p;
    }
    function createQuad(gl) {
        const pos = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    }
    function createTexture(gl, data) {
        let t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
        return t;
    }
    let colorCache = {};
    function parseColor(color) {
        if (!(color in colorCache)) {
            let parsed;
            if (color == "transparent") {
                parsed = [0, 0, 0, 0];
            }
            else if (color.indexOf("rgba") > -1) {
                parsed = (color.match(/[\d.]+/g) || []).map(Number);
                for (let i = 0; i < 3; i++) {
                    parsed[i] = parsed[i] / 255;
                }
            }
            else {
                parsed = fromString(color).map($ => $ / 255);
                parsed.push(1);
            }
            colorCache[color] = parsed;
        }
        return colorCache[color];
    }

    function clearToAnsi(bg) {
        return `\x1b[0;48;5;${termcolor(bg)}m\x1b[2J`;
    }
    function colorToAnsi(fg, bg) {
        return `\x1b[0;38;5;${termcolor(fg)};48;5;${termcolor(bg)}m`;
    }
    function positionToAnsi(x, y) {
        return `\x1b[${y + 1};${x + 1}H`;
    }
    function termcolor(color) {
        const SRC_COLORS = 256.0;
        const DST_COLORS = 6.0;
        const COLOR_RATIO = DST_COLORS / SRC_COLORS;
        let rgb = fromString(color);
        let r = Math.floor(rgb[0] * COLOR_RATIO);
        let g = Math.floor(rgb[1] * COLOR_RATIO);
        let b = Math.floor(rgb[2] * COLOR_RATIO);
        return r * 36 + g * 6 + b * 1 + 16;
    }
    class Term extends Backend {
        constructor() {
            super();
            this._offset = [0, 0];
            this._cursor = [-1, -1];
            this._lastColor = "";
        }
        schedule(cb) { setTimeout(cb, 1000 / 60); }
        setOptions(options) {
            super.setOptions(options);
            let size = [options.width, options.height];
            let avail = this.computeSize();
            this._offset = avail.map((val, index) => Math.floor((val - size[index]) / 2));
        }
        clear() {
            process.stdout.write(clearToAnsi(this._options.bg));
        }
        draw(data, clearBefore) {
            // determine where to draw what with what colors
            let [x, y, ch, fg, bg] = data;
            // determine if we need to move the terminal cursor
            let dx = this._offset[0] + x;
            let dy = this._offset[1] + y;
            let size = this.computeSize();
            if (dx < 0 || dx >= size[0]) {
                return;
            }
            if (dy < 0 || dy >= size[1]) {
                return;
            }
            if (dx !== this._cursor[0] || dy !== this._cursor[1]) {
                process.stdout.write(positionToAnsi(dx, dy));
                this._cursor[0] = dx;
                this._cursor[1] = dy;
            }
            // terminals automatically clear, but if we're clearing when we're
            // not otherwise provided with a character, just use a space instead
            if (clearBefore) {
                if (!ch) {
                    ch = " ";
                }
            }
            // if we're not clearing and not provided with a character, do nothing
            if (!ch) {
                return;
            }
            // determine if we need to change colors
            let newColor = colorToAnsi(fg, bg);
            if (newColor !== this._lastColor) {
                process.stdout.write(newColor);
                this._lastColor = newColor;
            }
            // write the provided symbol to the display
            let chars = [].concat(ch);
            process.stdout.write(chars[0]);
            // update our position, given that we wrote a character
            this._cursor[0]++;
            if (this._cursor[0] >= size[0]) {
                this._cursor[0] = 0;
                this._cursor[1]++;
            }
        }
        computeFontSize() { throw new Error("Terminal backend has no notion of font size"); }
        eventToPosition(x, y) { return [x, y]; }
        computeSize() { return [process.stdout.columns, process.stdout.rows]; }
    }

    /**
     * @namespace
     * Contains text tokenization and breaking routines
     */
    const RE_COLORS = /%([bc]){([^}]*)}/g;
    // token types
    const TYPE_TEXT = 0;
    const TYPE_NEWLINE = 1;
    const TYPE_FG = 2;
    const TYPE_BG = 3;
    /**
     * Convert string to a series of a formatting commands
     */
    function tokenize(str, maxWidth) {
        let result = [];
        /* first tokenization pass - split texts and color formatting commands */
        let offset = 0;
        str.replace(RE_COLORS, function (match, type, name, index) {
            /* string before */
            let part = str.substring(offset, index);
            if (part.length) {
                result.push({
                    type: TYPE_TEXT,
                    value: part
                });
            }
            /* color command */
            result.push({
                type: (type == "c" ? TYPE_FG : TYPE_BG),
                value: name.trim()
            });
            offset = index + match.length;
            return "";
        });
        /* last remaining part */
        let part = str.substring(offset);
        if (part.length) {
            result.push({
                type: TYPE_TEXT,
                value: part
            });
        }
        return breakLines(result, maxWidth);
    }
    /* insert line breaks into first-pass tokenized data */
    function breakLines(tokens, maxWidth) {
        if (!maxWidth) {
            maxWidth = Infinity;
        }
        let i = 0;
        let lineLength = 0;
        let lastTokenWithSpace = -1;
        while (i < tokens.length) { /* take all text tokens, remove space, apply linebreaks */
            let token = tokens[i];
            if (token.type == TYPE_NEWLINE) { /* reset */
                lineLength = 0;
                lastTokenWithSpace = -1;
            }
            if (token.type != TYPE_TEXT) { /* skip non-text tokens */
                i++;
                continue;
            }
            /* remove spaces at the beginning of line */
            while (lineLength == 0 && token.value.charAt(0) == " ") {
                token.value = token.value.substring(1);
            }
            /* forced newline? insert two new tokens after this one */
            let index = token.value.indexOf("\n");
            if (index != -1) {
                token.value = breakInsideToken(tokens, i, index, true);
                /* if there are spaces at the end, we must remove them (we do not want the line too long) */
                let arr = token.value.split("");
                while (arr.length && arr[arr.length - 1] == " ") {
                    arr.pop();
                }
                token.value = arr.join("");
            }
            /* token degenerated? */
            if (!token.value.length) {
                tokens.splice(i, 1);
                continue;
            }
            if (lineLength + token.value.length > maxWidth) { /* line too long, find a suitable breaking spot */
                /* is it possible to break within this token? */
                let index = -1;
                while (1) {
                    let nextIndex = token.value.indexOf(" ", index + 1);
                    if (nextIndex == -1) {
                        break;
                    }
                    if (lineLength + nextIndex > maxWidth) {
                        break;
                    }
                    index = nextIndex;
                }
                if (index != -1) { /* break at space within this one */
                    token.value = breakInsideToken(tokens, i, index, true);
                }
                else if (lastTokenWithSpace != -1) { /* is there a previous token where a break can occur? */
                    let token = tokens[lastTokenWithSpace];
                    let breakIndex = token.value.lastIndexOf(" ");
                    token.value = breakInsideToken(tokens, lastTokenWithSpace, breakIndex, true);
                    i = lastTokenWithSpace;
                }
                else { /* force break in this token */
                    token.value = breakInsideToken(tokens, i, maxWidth - lineLength, false);
                }
            }
            else { /* line not long, continue */
                lineLength += token.value.length;
                if (token.value.indexOf(" ") != -1) {
                    lastTokenWithSpace = i;
                }
            }
            i++; /* advance to next token */
        }
        tokens.push({ type: TYPE_NEWLINE }); /* insert fake newline to fix the last text line */
        /* remove trailing space from text tokens before newlines */
        let lastTextToken = null;
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            switch (token.type) {
                case TYPE_TEXT:
                    lastTextToken = token;
                    break;
                case TYPE_NEWLINE:
                    if (lastTextToken) { /* remove trailing space */
                        let arr = lastTextToken.value.split("");
                        while (arr.length && arr[arr.length - 1] == " ") {
                            arr.pop();
                        }
                        lastTextToken.value = arr.join("");
                    }
                    lastTextToken = null;
                    break;
            }
        }
        tokens.pop(); /* remove fake token */
        return tokens;
    }
    /**
     * Create new tokens and insert them into the stream
     * @param {object[]} tokens
     * @param {int} tokenIndex Token being processed
     * @param {int} breakIndex Index within current token's value
     * @param {bool} removeBreakChar Do we want to remove the breaking character?
     * @returns {string} remaining unbroken token value
     */
    function breakInsideToken(tokens, tokenIndex, breakIndex, removeBreakChar) {
        let newBreakToken = {
            type: TYPE_NEWLINE
        };
        let newTextToken = {
            type: TYPE_TEXT,
            value: tokens[tokenIndex].value.substring(breakIndex + (removeBreakChar ? 1 : 0))
        };
        tokens.splice(tokenIndex + 1, 0, newBreakToken, newTextToken);
        return tokens[tokenIndex].value.substring(0, breakIndex);
    }

    /** Default with for display and map generators */
    let DEFAULT_WIDTH = 80;
    /** Default height for display and map generators */
    let DEFAULT_HEIGHT = 25;

    const BACKENDS = {
        "hex": Hex,
        "rect": Rect,
        "tile": Tile,
        "tile-gl": TileGL,
        "term": Term
    };
    const DEFAULT_OPTIONS = {
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        transpose: false,
        layout: "rect",
        fontSize: 15,
        spacing: 1,
        border: 0,
        forceSquareRatio: false,
        fontFamily: "monospace",
        fontStyle: "",
        fg: "#ccc",
        bg: "#000",
        tileWidth: 32,
        tileHeight: 32,
        tileMap: {},
        tileSet: null,
        tileColorize: false
    };
    /**
     * @class Visual map display
     */
    class Display {
        constructor(options = {}) {
            this._data = {};
            this._dirty = false; // false = nothing, true = all, object = dirty cells
            this._options = {};
            options = Object.assign({}, DEFAULT_OPTIONS, options);
            this.setOptions(options);
            this.DEBUG = this.DEBUG.bind(this);
            this._tick = this._tick.bind(this);
            this._backend.schedule(this._tick);
        }
        /**
         * Debug helper, ideal as a map generator callback. Always bound to this.
         * @param {int} x
         * @param {int} y
         * @param {int} what
         */
        DEBUG(x, y, what) {
            let colors = [this._options.bg, this._options.fg];
            this.draw(x, y, null, null, colors[what % colors.length]);
        }
        /**
         * Clear the whole display (cover it with background color)
         */
        clear() {
            this._data = {};
            this._dirty = true;
        }
        /**
         * @see ROT.Display
         */
        setOptions(options) {
            Object.assign(this._options, options);
            if (options.width || options.height || options.fontSize || options.fontFamily || options.spacing || options.layout) {
                if (options.layout) {
                    let ctor = BACKENDS[options.layout];
                    this._backend = new ctor();
                }
                this._backend.setOptions(this._options);
                this._dirty = true;
            }
            return this;
        }
        /**
         * Returns currently set options
         */
        getOptions() { return this._options; }
        /**
         * Returns the DOM node of this display
         */
        getContainer() { return this._backend.getContainer(); }
        /**
         * Compute the maximum width/height to fit into a set of given constraints
         * @param {int} availWidth Maximum allowed pixel width
         * @param {int} availHeight Maximum allowed pixel height
         * @returns {int[2]} cellWidth,cellHeight
         */
        computeSize(availWidth, availHeight) {
            return this._backend.computeSize(availWidth, availHeight);
        }
        /**
         * Compute the maximum font size to fit into a set of given constraints
         * @param {int} availWidth Maximum allowed pixel width
         * @param {int} availHeight Maximum allowed pixel height
         * @returns {int} fontSize
         */
        computeFontSize(availWidth, availHeight) {
            return this._backend.computeFontSize(availWidth, availHeight);
        }
        computeTileSize(availWidth, availHeight) {
            let width = Math.floor(availWidth / this._options.width);
            let height = Math.floor(availHeight / this._options.height);
            return [width, height];
        }
        /**
         * Convert a DOM event (mouse or touch) to map coordinates. Uses first touch for multi-touch.
         * @param {Event} e event
         * @returns {int[2]} -1 for values outside of the canvas
         */
        eventToPosition(e) {
            let x, y;
            if ("touches" in e) {
                x = e.touches[0].clientX;
                y = e.touches[0].clientY;
            }
            else {
                x = e.clientX;
                y = e.clientY;
            }
            return this._backend.eventToPosition(x, y);
        }
        /**
         * @param {int} x
         * @param {int} y
         * @param {string || string[]} ch One or more chars (will be overlapping themselves)
         * @param {string} [fg] foreground color
         * @param {string} [bg] background color
         */
        draw(x, y, ch, fg, bg) {
            if (!fg) {
                fg = this._options.fg;
            }
            if (!bg) {
                bg = this._options.bg;
            }
            let key = `${x},${y}`;
            this._data[key] = [x, y, ch, fg, bg];
            if (this._dirty === true) {
                return;
            } // will already redraw everything 
            if (!this._dirty) {
                this._dirty = {};
            } // first!
            this._dirty[key] = true;
        }
        /**
         * Draws a text at given position. Optionally wraps at a maximum length. Currently does not work with hex layout.
         * @param {int} x
         * @param {int} y
         * @param {string} text May contain color/background format specifiers, %c{name}/%b{name}, both optional. %c{}/%b{} resets to default.
         * @param {int} [maxWidth] wrap at what width?
         * @returns {int} lines drawn
         */
        drawText(x, y, text, maxWidth) {
            let fg = null;
            let bg = null;
            let cx = x;
            let cy = y;
            let lines = 1;
            if (!maxWidth) {
                maxWidth = this._options.width - x;
            }
            let tokens = tokenize(text, maxWidth);
            while (tokens.length) { // interpret tokenized opcode stream
                let token = tokens.shift();
                switch (token.type) {
                    case TYPE_TEXT:
                        let isSpace = false, isPrevSpace = false, isFullWidth = false, isPrevFullWidth = false;
                        for (let i = 0; i < token.value.length; i++) {
                            let cc = token.value.charCodeAt(i);
                            let c = token.value.charAt(i);
                            // Assign to `true` when the current char is full-width.
                            isFullWidth = (cc > 0xff00 && cc < 0xff61) || (cc > 0xffdc && cc < 0xffe8) || cc > 0xffee;
                            // Current char is space, whatever full-width or half-width both are OK.
                            isSpace = (c.charCodeAt(0) == 0x20 || c.charCodeAt(0) == 0x3000);
                            // The previous char is full-width and
                            // current char is nether half-width nor a space.
                            if (isPrevFullWidth && !isFullWidth && !isSpace) {
                                cx++;
                            } // add an extra position
                            // The current char is full-width and
                            // the previous char is not a space.
                            if (isFullWidth && !isPrevSpace) {
                                cx++;
                            } // add an extra position
                            this.draw(cx++, cy, c, fg, bg);
                            isPrevSpace = isSpace;
                            isPrevFullWidth = isFullWidth;
                        }
                        break;
                    case TYPE_FG:
                        fg = token.value || null;
                        break;
                    case TYPE_BG:
                        bg = token.value || null;
                        break;
                    case TYPE_NEWLINE:
                        cx = x;
                        cy++;
                        lines++;
                        break;
                }
            }
            return lines;
        }
        /**
         * Timer tick: update dirty parts
         */
        _tick() {
            this._backend.schedule(this._tick);
            if (!this._dirty) {
                return;
            }
            if (this._dirty === true) { // draw all
                this._backend.clear();
                for (let id in this._data) {
                    this._draw(id, false);
                } // redraw cached data 
            }
            else { // draw only dirty 
                for (let key in this._dirty) {
                    this._draw(key, true);
                }
            }
            this._dirty = false;
        }
        /**
         * @param {string} key What to draw
         * @param {bool} clearBefore Is it necessary to clean before?
         */
        _draw(key, clearBefore) {
            let data = this._data[key];
            if (data[4] != this._options.bg) {
                clearBefore = true;
            }
            this._backend.draw(data, clearBefore);
        }
    }
    Display.Rect = Rect;
    Display.Hex = Hex;
    Display.Tile = Tile;
    Display.TileGL = TileGL;
    Display.Term = Term;

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    var t;!function(t){t[t.NotStarted=0]="NotStarted",t[t.Running=1]="Running",t[t.Stopped=2]="Stopped";}(t||(t={}));var n={type:"xstate.init"},e="xstate.assign";function r(t){return void 0===t?[]:[].concat(t)}function o(t,n){return "string"==typeof(t="string"==typeof t&&n&&n[t]?n[t]:t)?{type:t}:"function"==typeof t?{type:t.name,exec:t}:t}function a(t){return function(n){return t===n}}function u(t){return "string"==typeof t?{type:t}:t}function c(t,n){return {value:t,context:n,actions:[],changed:!1,matches:a(t)}}function f(t,n){void 0===n&&(n={});var i={config:t,_options:n,initialState:{value:t.initial,actions:r(t.states[t.initial].entry).map((function(t){return o(t,n.actions)})),context:t.context,matches:a(t.initial)},transition:function(n,f){var s,l,v="string"==typeof n?{value:n,context:t.context}:n,p=v.value,g=v.context,y=u(f),d=t.states[p];if(d.on){var x=r(d.on[y.type]),m=function(n){if(void 0===n)return {value:c(p,g)};var r="string"==typeof n?{target:n}:n,u=r.target,f=void 0===u?p:u,s=r.actions,l=void 0===s?[]:s,v=r.cond,x=g;if((void 0===v?function(){return !0}:v)(g,y)){var m=t.states[f],h=!1,S=[].concat(d.exit,l,m.entry).filter((function(t){return t})).map((function(t){return o(t,i._options.actions)})).filter((function(t){if(t.type===e){h=!0;var n=Object.assign({},x);return "function"==typeof t.assignment?n=t.assignment(x,y):Object.keys(t.assignment).forEach((function(e){n[e]="function"==typeof t.assignment[e]?t.assignment[e](x,y):t.assignment[e];})),x=n,!1}return !0}));return {value:{value:f,context:x,actions:S,changed:f!==p||S.length>0||h,matches:a(f)}}}};try{for(var h=function(t){var n="function"==typeof Symbol&&t[Symbol.iterator],e=0;return n?n.call(t):{next:function(){return t&&e>=t.length&&(t=void 0),{value:t&&t[e++],done:!t}}}}(x),S=h.next();!S.done;S=h.next()){var b=m(S.value);if("object"==typeof b)return b.value}}catch(t){s={error:t};}finally{try{S&&!S.done&&(l=h.return)&&l.call(h);}finally{if(s)throw s.error}}}return c(p,g)}};return i}var s=function(t,n){return t.actions.forEach((function(e){var r=e.exec;return r&&r(t.context,n)}))};function l(e){var r=e.initialState,i=t.NotStarted,o=new Set,a={_machine:e,send:function(n){i===t.Running&&(r=e.transition(r,n),s(r,u(n)),o.forEach((function(t){return t(r)})));},subscribe:function(t){return o.add(t),t(r),{unsubscribe:function(){return o.delete(t)}}},start:function(){return i=t.Running,s(r,n),a},stop:function(){return i=t.Stopped,o.forEach((function(t){return o.delete(t)})),a},get status(){return i}};return a}

    // given a start position and end position, generate a path of points
    // @param string side which side of the box the line emits from
    function pathLine (side, start, end) {
        const { col, row } = start;
        const col2 = end.col;
        const row2 = end.row;

        const path = [ [ col, row ] ];

        const dx = col2 - col;
        const dy = row2 - row;

        if (dx !== 0 && dy !== 0) {
            // determine where the elbow joint should go
            if (side === 'top' || side === 'bottom')
                path.push([ col, row2 ]);
            else
                path.push([ col2, row ]);
        }

        path.push([ col2, row2 ]);

        return path
    }


    function getPathCells (line) {
        const { start, end } = line;
        // render the line using the relative line start if connected box is present
        const startPoint = start.box ? ({ col: start.box.minCol + start.point.col, row: start.box.minRow + start.point.row }) : start.point;

        const endPoint = end.box ? ({ col: end.box.minCol + end.point.col, row: end.box.minRow + end.point.row }) : end.point;

        const path = pathLine(start.point.side, startPoint, endPoint);

        // convert each line in the path into a set of cells
        const cells = [ ];

        for (let i=0; i < path.length-1; i++) {
            const start = path[i];
            const end = path[i+1];

            const dx = end[0] - start[0];
            const dy = end[1] - start[1];
            let direction;

            if (dx !== 0)
                direction = (dx > 0) ? 'right' : 'left';

            if (dy !== 0)
                direction = (dy > 0) ? 'down' : 'up';

            if (direction === 'right')
                for (let c=start[0]; c < end[0]; c++)
                    cells.push({ col: c, row: start[1], direction });

            if (direction === 'left')
                for (let c=start[0]; c >= end[0]; c--)
                    cells.push({ col: c, row: start[1], direction });

            if (direction === 'down')
                for (let r=start[1]; r < end[1]; r++)
                    cells.push({ col: end[0], row: r, direction });

            if (direction === 'up')
                for (let r=start[1]; r >= end[1]; r--)
                    cells.push({ col: end[0], row: r, direction });
        }

        return cells
    }

    function expandBox (box, point) {
        if (point[0] < box.minCol)
            box.minCol = point[0];

        if (point[1] < box.minRow)
            box.minRow = point[1];

        if (point[0] > box.maxCol)
            box.maxCol = point[0];

        if (point[1] > box.maxRow)
            box.maxRow = point[1];
    }


    function getBoundingBox (context) {
       const boundingBox = { };

        for (const box of context.boxes) {
            if (boundingBox.minCol === undefined) {
                boundingBox.minCol = box.minCol;
                boundingBox.minRow = box.minRow;
                boundingBox.maxCol = box.maxCol;
                boundingBox.maxRow = box.maxRow;
            }

            expandBox(boundingBox, [ box.minCol, box.minRow ]);
            expandBox(boundingBox, [ box.maxCol, box.maxRow ]);
        }

        for (const line of context.lines) {

            const start = [
                line.start.box.minCol + line.start.point[0],
                line.start.box.minRow + line.start.point[1],
            ];

            const end = line.end.box ? [
                line.end.box.minCol + line.end.point[0],
                line.end.box.minRow + line.end.point[1],
            ] : [ line.end.point.col, line.end.point.row ];

            if (boundingBox.minCol === undefined) {
                boundingBox.minCol = start[0];
                boundingBox.minRow = start[1];
                boundingBox.maxCol = start[0];
                boundingBox.maxRow = start[1];
            }

            expandBox(boundingBox, start);
            expandBox(boundingBox, end);
        }

        return boundingBox
    }


    function replaceAt (input, index, replacement) {
        return input.substr(0, index) + replacement + input.substr(index + replacement.length)
    }


    function exportToAscii (context, model) {
        let result = '';

        const toIndex = function (col, row) {
            const newlineCount = row;
            return (row * model.columns) + col + newlineCount
        };

        const write = function (col, row, char) {
            result = replaceAt(result, toIndex(col, row), char);
        };

        const exportLabel = function (label) {
            let startCol, startRow;
            if (label.box) {
                startCol = label.box.minCol + label.point[0];
                startRow = label.box.minRow + label.point[1];
            } else {
                const { line } = label;
                startCol = line.start.box.minCol + line.start.point.col + label.point[0];
                startRow = line.start.box.minRow + line.start.point.row + label.point[1];
            }

            const rows = label.text.split('\n');
            let currentRow = startRow;

            for (const row of rows) {
                for (let i=0; i < row.length; i++)
                    write(startCol + i, currentRow, row[i]);

                currentRow++;
            }
        };

        // find the bounding box that includes all non-whitespace cells
        const boundingBox = getBoundingBox(context);

        for (let row=0; row < model.rows; row++) {
            for (let col=0; col < model.columns; col++) {
                const idx = row * model.columns + col;
                result += ' ';
            }
            result += '\n';
        }

        for (const b of context.boxes) {
            const { minCol, minRow, maxCol, maxRow, labels } = b;

            write(minCol, minRow, '┌');
            write(maxCol, maxRow, '┘');
            write(maxCol, minRow, '┐');
            write(minCol, maxRow, '└');

            for (let c=minCol+1; c < maxCol; c++) {
                write(c, maxRow, '-');
                write(c, minRow, '-');
            }

            for (let r=minRow+1; r < maxRow; r++) {
                write(minCol, r, '│');
                write(maxCol, r, '│');
            }

            for (const label of labels)
                exportLabel(label);
        }

        for (const line of context.lines) {
            const cells = getPathCells(line);

            if (!cells.length)
                continue

            let lastDirection = cells[0].direction;

            cells.forEach(function (cell, idx) {
                let char;

                if (idx === 0) {

                    // TODO: move this to the box drawing code to avoid double rendering characters
                    if (cell.direction === 'left')
                        char = '┤'; //CharCode.boxDrawingsLightVerticalAndLeft //
                    if (cell.direction === 'right')
                        char = '├'; //CharCode.boxDrawingsLightVerticalAndRight //
                    if (cell.direction === 'up')
                        char = '┴'; //CharCode.boxDrawingsLightUpAndHorizontal //
                    if (cell.direction === 'down')
                        char = '┬'; //CharCode.boxDrawingsLightDownAndHorizontal //


                } else if (idx === cells.length - 1) {
                    if (cell.direction === 'left')
                        char = '◀'; //CharCode.blackLeftPointingPointer //
                    if (cell.direction === 'right')
                        char = '▶'; //CharCode.blackRightPointingPointer //
                    if (cell.direction === 'up')
                        char = '▲'; //CharCode.blackUpPointingTriangle //
                    if (cell.direction === 'down')
                        char = '▼'; // CharCode.blackDownPointingTriangle //

                } else if (lastDirection !== cell.direction) {
                    if (lastDirection === 'right' && cell.direction === 'up')
                        char = '┘'; //CharCode.boxDrawingsLightUpAndLeft //
                    if (lastDirection === 'down' && cell.direction === 'left')
                        char = '┘'; //CharCode.boxDrawingsLightUpAndLeft //

                    if (lastDirection === 'left' && cell.direction === 'up')
                        char = '└'; // CharCode.boxDrawingsLightUpAndRight //char =
                    if (lastDirection === 'down' && cell.direction === 'right')
                        char = '└'; // CharCode.boxDrawingsLightUpAndRight //char =

                    if (lastDirection === 'left' && cell.direction === 'down')
                        char = '┌'; //CharCode.boxDrawingsLightDownAndRight //
                    if (lastDirection === 'up' && cell.direction === 'right')
                        char = '┌'; // CharCode.boxDrawingsLightDownAndRight //

                    if (lastDirection === 'right' && cell.direction === 'down')
                        char = '┐'; // CharCode.boxDrawingsLightDownAndLeft //
                    if (lastDirection === 'up' && cell.direction === 'left')
                        char = '┐'; //CharCode.boxDrawingsLightDownAndLeft //
                } else {
                    if (cell.direction === 'left' || cell.direction === 'right')
                        char = '─'; // CharCode.boxDrawingsLightHorizontal //
                    if (cell.direction === 'up' || cell.direction === 'down')
                        char = '│'; // CharCode.boxDrawingsLightVertical //
                }

                lastDirection = cell.direction;
                write(cell.col, cell.row, char);
            });

            for (const label of line.labels)
                exportLabel(label);
        }

        // trim whitespace
        let out = '';

        for (let r = boundingBox.minRow; r <= boundingBox.maxRow; r++) {
            out += result.substring(toIndex(boundingBox.minCol, r), toIndex(boundingBox.maxCol+1, r) );
            out += '\n';
        }

        return out
    }

    // given a box and a point on the box, determine the
    // point on the edge of the box closest to the provided point
    //
    // @param Object box { minCol, minRow, maxCol, maxRow }
    function findClosestPointOnBox (col, row, box) {
        // determine the box side that is closest
        let delta = Math.abs(col - box.minCol);
        let side = 'left';

        if (Math.abs(col - box.maxCol) < delta) {
            delta = Math.abs(col - box.maxCol);
            side = 'right';
        }

        if (Math.abs(row - box.maxRow) < delta) {
            delta = Math.abs(row - box.maxRow);
            side = 'bottom';
        }

        if (Math.abs(row - box.minRow) < delta) {
            delta = Math.abs(row - box.minRow);
            side = 'top';
        }

        if (side === 'left')
            return { col: box.minCol, row, side }

        if (side === 'right')
            return { col: box.maxCol, row, side }

        if (side === 'bottom')
            return { col, row: box.maxRow, side }

        return { col, row: box.minRow, side }
    }

    var tileMap = {
        '☺': 1,
        '☻': 2,
        '♥': 3,
        '♦': 4,
        '♣': 5,
        '♠': 6,
        '•': 7,
        '◘': 8,
        '○': 9,
        '◙': 10,
        '♂': 11,
        '♀': 12,
        '♪': 13,
        '♫': 14,
        '☼': 15,
        '▶': 16,
        '◀': 17,
        '↕': 18,
        '‼': 19,
        '¶': 20,
        '§': 21,
        '▬': 22,
        '↨': 23,
        '↑': 24,
        '↓': 25,
        '→': 26,
        '←': 27,
        '∟': 28,
        '↔': 29,
        '▲': 30,
        '▼': 31,
        ' ': 32,
        '!': 33,
        '"': 34,
        '#': 35,
        '$': 36,
        '%': 37,
        '&': 38,
        '\'': 39,
        '(': 40,
        ')': 41,
        '*': 42,
        '+': 43,
        ',': 44,
        '-': 45,
        '.': 46,
        '/': 47,
        '0': 48,
        '1': 49,
        '2': 50,
        '3': 51,
        '4': 52,
        '5': 53,
        '6': 54,
        '7': 55,
        '8': 56,
        '9': 57,
        ':': 58,
        ';': 59,
        '<': 60,
        '=': 61,
        '>': 62,
        '?': 63,
        '@': 64,
        'A': 65,
        'B': 66,
        'C': 67,
        'D': 68,
        'E': 69,
        'F': 70,
        'G': 71,
        'H': 72,
        'I': 73,
        'J': 74,
        'K': 75,
        'L': 76,
        'M': 77,
        'N': 78,
        'O': 79,
        'P': 80,
        'Q': 81,
        'R': 82,
        'S': 83,
        'T': 84,
        'U': 85,
        'V': 86,
        'W': 87,
        'X': 88,
        'Y': 89,
        'Z': 90,
        '[': 91,
        '\\': 92,
        ']': 93,
        '^': 94,
        '_': 95,
        '`': 96,
        'a': 97,
        'b': 98,
        'c': 99,
        'd': 100,
        'e': 101,
        'f': 102,
        'g': 103,
        'h': 104,
        'i': 105,
        'j': 106,
        'k': 107,
        'l': 108,
        'm': 109,
        'n': 110,
        'o': 111,
        'p': 112,
        'q': 113,
        'r': 114,
        's': 115,
        't': 116,
        'u': 117,
        'v': 118,
        'w': 119,
        'x': 120,
        'y': 121,
        'z': 122,
        '{': 123,
        '|': 124,
        '}': 125,
        '~': 126,
        '⌂': 127,
        'Ç': 128,
        'ü': 129,
        'é': 130,
        'â': 131,
        'ä': 132,
        'à': 133,
        'å': 134,
        'ç': 135,
        'ê': 136,
        'ë': 137,
        'è': 138,
        'ï': 139,
        'î': 140,
        'ì': 141,
        'Ä': 142,
        'Å': 143,
        'É': 144,
        'æ': 145,
        'Æ': 146,
        'ô': 147,
        'ö': 148,
        'ò': 149,
        'û': 150,
        'ù': 151,
        'ÿ': 152,
        'Ö': 153,
        'Ü': 154,
        '¢': 155,
        '£': 156,
        '¥': 157,
        '₧': 158,
        'ƒ': 159,
        'á': 160,
        'í': 161,
        'ó': 162,
        'ú': 163,
        'ñ': 164,
        'Ñ': 165,
        'ª': 166,
        'º': 167,
        '¿': 168,
        '⌐': 169,
        '¬': 170,
        '½': 171,
        '¼': 172,
        '¡': 173,
        '«': 174,
        '»': 175,
        '░': 176,
        '▒': 177,
        '▓': 178,
        '│': 179,
        '┤': 180,
        '╡': 181,
        '╢': 182,
        '╖': 183,
        '╕': 184,
        '╣': 185,
        '║': 186,
        '╗': 187,
        '╝': 188,
        '╜': 189,
        '╛': 190,
        '┐': 191,
        '└': 192,
        '┴': 193,
        '┬': 194,
        '├': 195,
        '─': 196,
        '┼': 197,
        '╞': 198,
        '╟': 199,
        '╚': 200,
        '╔': 201,
        '╩': 202,
        '╦': 203,
        '╠': 204,
        '═': 205,
        '╬': 206,
        '╧': 207,
        '╨': 208,
        '╤': 209,
        '╥': 210,
        '╙': 211,
        '╘': 212,
        '╒': 213,
        '╓': 214,
        '╫': 215,
        '╪': 216,
        '┘': 217,
        '┌': 218,
        '█': 219,
        '▄': 220,
        '▌': 221,
        '▐': 222,
        '▀': 223,
        'α': 224,
        'ß': 225,
        'Γ': 226,
        'π': 227,
        'Σ': 228,
        'σ': 229,
        'µ': 230,
        'τ': 231,
        'Φ': 232,
        'Θ': 233,
        'Ω': 234,
        'δ': 235,
        '∞': 236,
        'φ': 237,
        'ε': 238,
        '∩': 239,
        '≡': 240,
        '±': 241,
        '≥': 242,
        '≤': 243,
        '⌠': 244,
        '⌡': 245,
        '÷': 246,
        '≈': 247,
        '°': 248,
        '∙': 249,
        '·': 250,
        '√': 251,
        'ⁿ': 252,
        '²': 253,
        '■': 254
    };

    const model = {
        columns: 150,
        rows: 80
    };

    let display, container;

    const [ exportButton, deleteButton, moveToggle, boxToggle, labelToggle, lineToggle ] = document.querySelectorAll('button');

    lineToggle.onclick = function () {
        asciiService.send('TOGGLE_LINEDRAW');
    };

    moveToggle.onclick = function () {
        asciiService.send('TOGGLE_MOVE');
    };

    boxToggle.onclick = function () {
        asciiService.send('TOGGLE_BOXDRAW');
    };

    labelToggle.onclick = function () {
        asciiService.send('TOGGLE_LABEL');
    };

    deleteButton.onclick = function () {
        asciiService.send('DELETE');
    };

    exportButton.onclick = function () {
        asciiService.send('EXPORT');
    };


    const asciiMachine = f({
    	initial: 'normal',

        // object containing all shared state for this machine
        context: {
            activeBox: undefined,
            activeLine: undefined,

            movingBox: undefined,

            labelingBox: undefined,

            boxes: [ ],
            lines: [ ],
    	    currentPos: undefined
        },

        states: {
            normal: {
                on: {
                    EXPORT: 'exporting',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                	TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    DELETE: 'delete',
                	DRAW_BOX: 'drawing_box'
                }
            },

            exporting: {
                entry: function (context) {
                    exportButton.style.color = 'dodgerblue';
                    const dialog = document.querySelector('dialog');

                    const textarea = dialog.querySelector('textarea');
                    const exportedResult = exportToAscii(context, model);
                    const columnCount = exportedResult.indexOf('\n');
                    textarea.setAttribute('cols', columnCount);
                    textarea.value = exportedResult;

                    dialog.show();
                },
                exit: function (context) {
                    exportButton.style.color = '';
                    const dialog = document.querySelector('dialog');
                    dialog.close();
                },
                on: {
                    EXPORT: 'normal',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    DELETE: 'delete',
                    DRAW_BOX: 'drawing_box'
                }
            },

            delete: {
                entry: function (context) {
                    deleteButton.style.color = 'dodgerblue';

                    container.onmousedown = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev);
                        const line = findLine(col, row, context.lines);
                        if (line) {
                            const idx = context.lines.indexOf(line);
                            context.lines.splice(idx, 1);
                            return
                        }

                        const box = findBox(col, row, context.boxes);
                        if (box) {
                           const idx = context.boxes.indexOf(box);
                            context.boxes.splice(idx, 1);
                            for (let i=context.lines.length-1; i >= 0; i--) {
                                const line = context.lines[i];
                                if (line.start.box === box || line.end.box === box)
                                    context.lines.splice(i, 1);
                            }
                        }
                    };
                },
                exit: function (context) {
                    deleteButton.style.color = '';
                },
                on: {
                    EXPORT: 'exporting',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    DELETE: 'normal',
                    DRAW_BOX: 'drawing_box'
                }
            },

            drawing_line: {
            	entry: function (context) {
                    lineToggle.style.color = 'dodgerblue';

            		container.onmousedown = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev);
                        const box = findBox(col, row, context.boxes);
                        if (!box)
                            return

                        const point = findClosestPointOnBox(col, row, box);

            			context.activeLine = {
                            start: {
                                box,
                                point: {
                                    col: point.col - box.minCol,
                                    row: point.row - box.minRow,
                                    side: point.side
                                }
                            },
                            end: {
                                box,
                                point: {
                                    // store position of line point relative to the
                                    //  top left corner of the box it connects with
                                    col: point.col - box.minCol,
                                    row: point.row - box.minRow,
                                    side: point.side
                                }
                            },
                            labels: [ ]
            			};

            			container.onmousemove = function (ev) {
                            const [ col, row ] = display.eventToPosition(ev);
                            const box = findBox(col, row, context.boxes);

                            if (box) {
                                const point = findClosestPointOnBox(col, row, box);
                                context.activeLine.end.point = {
                                    col: point.col - box.minCol,
                                    row: point.row - box.minRow,
                                    side: point.side
                                };
                            } else {
                               context.activeLine.end.point = { col, row };
                            }

                            context.activeLine.end.box = box;
    	        		};
            		};

            		container.onmouseup = function (ev) {
                        if (context.activeLine)
            			     context.lines.push({ ...context.activeLine });
            			context.activeLine = undefined;
            			container.onmousemove = undefined;
            		};

            	},
            	exit: function (context) {
                    lineToggle.style.color = '';
            		context.activeLine = undefined;
            		container.onmousemove = undefined;
            	},
            	on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
            		TOGGLE_LINEDRAW: 'normal',
                    TOGGLE_MOVE: 'moving_box'
            	}
            },
            labeling: {
                entry: function (context) {
                    labelToggle.style.color = 'dodgerblue';

                    const textarea = document.querySelector('textarea');

                    container.onmousedown = function (ev) {
                        if (context.labelingBox) {
                            asciiService.send('TOGGLE_LABEL');
                            return
                        }

                        const [ col, row ] = display.eventToPosition(ev);
                        const box = findBox(col, row, context.boxes);

                        const line = box ? undefined : findLine(col, row, context.lines);

                        textarea.style.display = (box || line) ? '' : 'none';
                        if (textarea.style.display === 'none') {
                            if (context.labelingBox) {
                                if (context.labelingBox.box)
                                    context.labelingBox.box.labels.push(context.labelingBox);
                                else
                                    context.labelingBox.line.labels.push(context.labelingBox);
                            }
                            context.labelingBox = undefined;
                            textarea.value = '';
                            return
                        }

                        // TODO: unclear why I need to do this on the next event tick...
                        setTimeout(function () {
                           textarea.focus();
                        }, 0);

                        if (box) {
                            const relativeCol = col - box.minCol;
                            const relativeRow = row - box.minRow;

                            context.labelingBox = {
                                box,
                                point: [ relativeCol, relativeRow ],
                                text: ''
                            };
                        } else {
                            const lineStartCol = line.start.box.minCol + line.start.point.col;
                            const lineStartRow = line.start.box.minRow + line.start.point.row;

                            const relativeCol = col - lineStartCol;
                            const relativeRow = row - lineStartRow;

                            context.labelingBox = {
                                line,
                                point: [ relativeCol, relativeRow ],
                                text: ''
                            };
                        }
                    };

                    textarea.onkeyup = function () {
                        if (!context.labelingBox)
                            return
                        context.labelingBox.text = textarea.value;
                    };

                },
                exit: function (context) {
                    if (context.labelingBox) {
                        if (context.labelingBox.box)
                            context.labelingBox.box.labels.push(context.labelingBox);
                        else
                            context.labelingBox.line.labels.push(context.labelingBox);
                    }

                    const textarea = document.querySelector('textarea');
                    textarea.value = '';
                    textarea.onkeyup = undefined;
                    textarea.style.display = 'none';
                    container.onmousedown = undefined;
                    context.labelingBox = undefined;
                    labelToggle.style.color = '';
                },
                on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'normal',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box',
                    DRAW_BOX: 'drawing_box'
                }
            },
            moving_box: {
                entry: function (context) {
                    moveToggle.style.color = 'dodgerblue';

                    container.onmousedown = function (ev) {
                        const [ col, row ] = display.eventToPosition(ev);
                        const box = findBox(col, row, context.boxes);
                        if (box)
                            context.movingBox = {
                                box,
                                point: [ box.minCol - col, box.minRow - row ]
                            };
                    };

                    container.onmousemove = function (ev) {
                        if (!context.movingBox)
                            return

                        const [ col, row ] = display.eventToPosition(ev);

                        const dx = col - context.movingBox.box.minCol + context.movingBox.point[0];
                        const dy = row - context.movingBox.box.minRow + context.movingBox.point[1];

                        context.movingBox.box.minCol += dx;
                        context.movingBox.box.minRow += dy;

                        context.movingBox.box.maxCol += dx;
                        context.movingBox.box.maxRow += dy;
                    };

                    container.onmouseup = function (ev) {
                        context.movingBox = undefined;
                    };

                },
                exit: function (context) {
                    container.onmouseup = container.onmousedown = container.onmousemove = undefined;
                    moveToggle.style.color = '';
                },
                on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
                    TOGGLE_BOXDRAW: 'drawing_box',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'normal',
                }
            },
            drawing_box: {
            	entry: function (context) {
                    boxToggle.style.color = 'dodgerblue';

                    container.onmousedown = function (ev) {
                        context.activeBox = {
                            currentPos: display.eventToPosition(ev),
                            downPos: display.eventToPosition(ev)
                        };

                        asciiService.send('DRAW_BOX');
                    };

            		container.onmousemove = function (ev) {
                        if (!context.activeBox)
                            return

            			context.activeBox.currentPos = display.eventToPosition(ev);
            		};

            		container.onmouseup = function (ev) {
                        if (!context.activeBox)
                            return

    					const currentPos = display.eventToPosition(ev);

    					const [ col, row ] = currentPos;

    					const minCol = Math.min(col, context.activeBox.downPos[0]);
    					const maxCol = Math.max(col, context.activeBox.downPos[0]);

    					const minRow = Math.min(row, context.activeBox.downPos[1]);
    					const maxRow = Math.max(row, context.activeBox.downPos[1]);

    					if (maxCol - minCol >=1 && maxRow - minRow >= 1)
    						context.boxes.push({  minCol, minRow, maxCol, maxRow, labels: [ ] });

                        context.activeBox = undefined;
    				};
            	},
            	exit: function (context) {
                    boxToggle.style.color = '';
                    container.onmousedown = undefined;
            		container.onmousemove = undefined;
            		container.onmouseup = undefined;
            		context.activeBox = undefined;
            	},
            	on: {
                    EXPORT: 'exporting',
                    DELETE: 'delete',
            		TOGGLE_BOXDRAW: 'normal',
                    TOGGLE_LABEL: 'labeling',
                    TOGGLE_LINEDRAW: 'drawing_line',
                    TOGGLE_MOVE: 'moving_box'
            	}
            }
        }
    });

    const asciiService = l(asciiMachine).start();


    function findBox (col, row, boxes) {
        return boxes.find((b) => col >= b.minCol && col <= b.maxCol && row >= b.minRow && row <= b.maxRow)
    }


    function findLine (col, row, lines) {
        for (const line of lines) {
            const cells = getPathCells(line);
            for (const cell of cells)
                if (cell.row === row && cell.col === col)
                    return line
        }
    }


    function drawBox ({ minCol, minRow, maxCol, maxRow, fill, labels }) {
    	const borderColor = '#333';

    	display.draw(minCol, minRow, '┌', borderColor);
    	display.draw(maxCol, maxRow, '┘', borderColor);
    	display.draw(maxCol, minRow, '┐', borderColor);
    	display.draw(minCol, maxRow, '└', borderColor);

    	for (let c=minCol+1; c < maxCol; c++) {
    		display.draw(c, maxRow, '─', borderColor);
    		display.draw(c, minRow, '─', borderColor);
    	}

    	for (let r=minRow+1; r < maxRow; r++) {
    		display.draw(minCol, r, '│', borderColor);
    		display.draw(maxCol, r, '│', borderColor);
    	}

    	if (fill)
    		for (let r=minRow+1; r < maxRow; r++)
    			for (let c=minCol+1; c < maxCol; c++)
    				display.draw(c, r, '█', 'white'); // CharCode.fullBlock

        for (const label of labels)
            drawLabel(label);
    }


    function drawPath (line) {
        const cells = getPathCells(line);

        if (!cells.length)
            return

        let lastDirection = cells[0].direction;

        cells.forEach(function (cell, idx) {
            let char;

            if (idx === 0) {

                // TODO: move this to the box drawing code to avoid double rendering characters
                if (cell.direction === 'left')
                    char = '┤'; //CharCode.boxDrawingsLightVerticalAndLeft //
                if (cell.direction === 'right')
                    char = '├'; //CharCode.boxDrawingsLightVerticalAndRight //
                if (cell.direction === 'up')
                    char = '┴'; //CharCode.boxDrawingsLightUpAndHorizontal //
                if (cell.direction === 'down')
                    char = '┬'; //CharCode.boxDrawingsLightDownAndHorizontal //


            } else if (idx === cells.length - 1) {
                if (cell.direction === 'left')
                    char = '◀'; //CharCode.blackLeftPointingPointer //
                if (cell.direction === 'right')
                    char = '▶'; //CharCode.blackRightPointingPointer //
                if (cell.direction === 'up')
                    char = '▲'; //CharCode.blackUpPointingTriangle //
                if (cell.direction === 'down')
                    char = '▼'; // CharCode.blackDownPointingTriangle //

            } else if (lastDirection !== cell.direction) {
                if (lastDirection === 'right' && cell.direction === 'up')
                    char = '┘'; //CharCode.boxDrawingsLightUpAndLeft //
                if (lastDirection === 'down' && cell.direction === 'left')
                    char = '┘'; //CharCode.boxDrawingsLightUpAndLeft //

                if (lastDirection === 'left' && cell.direction === 'up')
                    char = '└'; // CharCode.boxDrawingsLightUpAndRight //char =
                if (lastDirection === 'down' && cell.direction === 'right')
                    char = '└'; // CharCode.boxDrawingsLightUpAndRight //char =

                if (lastDirection === 'left' && cell.direction === 'down')
                    char = '┌'; //CharCode.boxDrawingsLightDownAndRight //
                if (lastDirection === 'up' && cell.direction === 'right')
                    char = '┌'; // CharCode.boxDrawingsLightDownAndRight //

                if (lastDirection === 'right' && cell.direction === 'down')
                    char = '┐'; // CharCode.boxDrawingsLightDownAndLeft //
                if (lastDirection === 'up' && cell.direction === 'left')
                    char = '┐'; //CharCode.boxDrawingsLightDownAndLeft //
            } else {
                if (cell.direction === 'left' || cell.direction === 'right')
                    char = '─'; // CharCode.boxDrawingsLightHorizontal //
                if (cell.direction === 'up' || cell.direction === 'down')
                    char = '│'; // CharCode.boxDrawingsLightVertical //
            }

            lastDirection = cell.direction;
            display.draw(cell.col, cell.row, char, '#333');
        });

        for (const label of line.labels)
            drawLabel(label);
    }


    function drawLabel (label) {
        let startCol, startRow;
        if (label.box) {
            startCol = label.box.minCol + label.point[0];
            startRow = label.box.minRow + label.point[1];
        } else {
            const { line } = label;
            startCol = line.start.box.minCol + line.start.point.col + label.point[0];
            startRow = line.start.box.minRow + line.start.point.row + label.point[1];
        }

        drawText(startCol, startRow, label.text, '#333');
    }


    function drawText (startCol, startRow, str, fg) {
        const rows = str.split('\n');
        let currentRow = startRow;

        for (const row of rows) {
            for (let i=0; i < row.length; i++)
                display.draw(startCol + i, currentRow, row[i], fg);

            currentRow++;
        }
    }


    function draw (context) {
        display.clear();

    	for (const box of context.boxes)
    		drawBox({ ...box, fill: true });

    	if (context.activeBox) {
    		const [ col, row ] = context.activeBox.currentPos;

    		const minCol = Math.min(col, context.activeBox.downPos[0]);
    		const maxCol = Math.max(col, context.activeBox.downPos[0]);

    		const minRow = Math.min(row, context.activeBox.downPos[1]);
    		const maxRow = Math.max(row, context.activeBox.downPos[1]);

    		drawBox({ minCol, minRow, maxCol, maxRow, labels: [ ], fill: true });
    	}

        for (const line of context.lines)
            drawPath(line);

    	if (context.activeLine)
    		drawPath(context.activeLine);

        if (context.labelingBox)
            drawLabel(context.labelingBox);
    }


    function animate () {
    	draw(asciiMachine.initialState.context);
    	requestAnimationFrame(animate);
    }


    const font = {
        width: 8,
        height: 10
    };

    const img = new Image();
    img.src = `/font/font_${font.width}_${font.height}.png`;
    img.onload = _ => {

        for (const glyph in tileMap) {
            const idx = tileMap[glyph];

            // the font files always have 32 columns
            const sx = (idx % 32) * font.width;
            const sy = (idx / 32 | 0) * font.height;

            tileMap[glyph] = [ sx, sy ];
        }

        display = new Display({
            bg: 'white',
            layout: 'tile-gl',
            tileColorize: true,
            tileWidth: font.width,
            tileHeight: font.height,
            tileSet: img,
            tileMap,

            // defaults to 80x25
            width: model.columns,
            height: model.rows
        });

        container = display.getContainer();
        container.style.imageRendering = 'pixelated';
        document.body.appendChild(container);
        animate();
    };


    /*
    function getArrowDirection (path) {
        const [ col, row ] = path[path.length-2]
        const [ col2, row2 ] = path[path.length-1]

        const dx = col2 - col
        const dy = row2 - row

        if (dx > 0)
            return 'right'

        if (dx < 0)
            return 'left'

        if (dy > 0)
            return 'bottom'

        return 'top'
    }


    window.addEventListener('resize', function () {
        // TODO: resize the grid based on screen dimensions
    })
    */

}());
