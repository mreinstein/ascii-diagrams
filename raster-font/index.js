import CharCode   from './char_code.js'
import unicodeMap from './unicode_map.js'


const _font = {
    charWidth: 8,
    charHeight: 10,
    width: 0,
    height: 0
}

// A cache of the tinted font images. Each key is a color, and the image
// will is the font in that color.
const _fontColorCache = { };

// the drawing scale, used to adapt to Retina displays.
const _scale = window.devicePixelRatio | 0

const canvas = document.createElement('canvas')
const _context = canvas.getContext('2d', { alpha: false })


export default function Display ({ bg, columns, rows }) {

    const bgs = [ ]
    const fgs = [ ]
    const data = [ ]

    const flags = [ ]
    const changed = [ ]
    let renderIdx = 1
    let lastRenderIdx = 0

    for (let row = 0; row < rows; row++) {
        for (let col=0; col < columns; col++) {
            const cell = (row * columns) + col
            data[cell] = CharCode.period
            flags[cell] = lastRenderIdx
            changed[cell] = false
            fgs[cell] = bg
            bgs[cell] = bg
        }
    }

    const fontImage = new Image()
    fontImage.style.imageRendering = 'pixelated'

    fontImage.onload = function () {
        _font.width = fontImage.width
        _font.height = fontImage.height

        // Handle high-resolution (i.e. retina) displays.
        const canvasWidth = _font.charWidth * columns
        const canvasHeight = _font.charHeight * rows
        canvas.width = canvasWidth * _scale
        canvas.height = canvasHeight * _scale
        canvas.style.width = `${canvasWidth}px`
        canvas.style.height = `${canvasHeight}px`
        //clear()
    }

    fontImage.src = `/font/font_${_font.charWidth}_${_font.charHeight}.png`


    const _getColorFont = function (color) {
        const cached = _fontColorCache[color]
        if (cached != null)
            return cached

        // Create a font using the given color.
        const tint = document.createElement('canvas')
        tint.width = _font.width
        tint.height = _font.height
        const context = tint.getContext('2d')

        // draw the font
        context.drawImage(fontImage, 0, 0)

        // Tint it by filling in the existing alpha with the color.
        context.globalCompositeOperation = 'source-atop'
        context.fillStyle = color
        context.fillRect(0, 0, _font.width, _font.height)

        _fontColorCache[color] = tint
        return tint
    }


    const drawText = function (startCol, startRow, str, fg, bgColor=bg) {
        const rows = str.split('\n')
        let currentRow = startRow

        for (const row of rows) {
            for (let i=0; i < row.length; i++)
                draw(startCol + i, currentRow, row[i], fg, bgColor)

            currentRow++
        }
    }


    const eventToPosition = function (e) {
        let x, y

        if ('touches' in e) {
            x = e.touches[0].clientX
            y = e.touches[0].clientY
        } else {
            x = e.clientX
            y = e.clientY
        }

        return [ x / _font.charWidth | 0, y / _font.charHeight | 0]
    }


    const draw = function (col, row, glyph, fg, bgColor=bg) {
        const idx = Math.floor(row * columns + col)

        const char = glyph

        // Remap it if it's a Unicode character
        //const char = unicodeMap[glyph] || glyph.charCodeAt(0)

        flags[idx] = renderIdx

        changed[idx] = (fgs[idx] !== fg) || (bgs[idx] !== bgColor) || (data[idx] !== char)

        fgs[idx] = fg
        bgs[idx] = bgColor
        data[idx] = char
    }


    const render = function () {
        let drawCount = 0
        let clearCount = 0

        for (let idx=0; idx < flags.length; idx++) {

            let char, bgColor, fg

            if (flags[idx] === renderIdx && changed[idx]) {
                // draw the cell
                char = unicodeMap[data[idx]] || data[idx].charCodeAt(0)
                bgColor = bgs[idx]
                fg = fgs[idx]
                drawCount++

            } else if (flags[idx] === lastRenderIdx) {
                // clear the cell
                char = '.'.charCodeAt(0)
                bgColor = 'white'
                fg = '#e0e0e0'
                data[idx] = CharCode.period
                clearCount++
            } else {
                // cell hasn't changed, ignore it
                continue
            }

            const col = idx % columns
            const row = idx / columns | 0

            // the font files always have 32 columns
            const sx = (char % 32) * _font.charWidth
            const sy = (char / 32 | 0) * _font.charHeight

            // Fill the background
            _context.fillStyle = bgColor

            _context.fillRect(
              col * _font.charWidth * _scale,
              row * _font.charHeight * _scale,
              _font.charWidth * _scale,
              _font.charHeight * _scale
            )

            // Don't bother drawing empty characters
            if (char == 0 || char == CharCode.space)
                continue

            const color = _getColorFont(fg)

            _context.mozImageSmoothingEnabled = false
            _context.webkitImageSmoothingEnabled = false
            _context.msImageSmoothingEnabled = false
            _context.imageSmoothingEnabled = false

            _context.drawImage(
                color,
                sx,
                sy,
                _font.charWidth,
                _font.charHeight,
                col * _font.charWidth * _scale,
                row * _font.charHeight * _scale,
                _font.charWidth * _scale,
                _font.charHeight * _scale
            )
        }

        //if (drawCount || clearCount)
        //    console.log('drawn:', drawCount, 'cleared:', clearCount)
        
        lastRenderIdx = renderIdx
        renderIdx++
    }


    return {
        draw,
        drawText,
        export: () =>  [ ...data ],
        getContainer: () => canvas,
        eventToPosition,
        render
    }
}
