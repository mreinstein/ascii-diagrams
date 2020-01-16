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
/*
_context.mozImageSmoothingEnabled = false
_context.webkitImageSmoothingEnabled = false
_context.msImageSmoothingEnabled = false
_context.imageSmoothingEnabled = false
*/


export default function Display ({ bg, columns, rows }) {

    const bgs = [ ]
    const fgs = [ ]
    const data = [ ]
    //const changed = [ ]

    for (let row = 0; row < rows; row++) {
        for (let col=0; col < columns; col++) {
            const cell = (row * columns) + col
            data[cell] = ' '
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
        clear()
    }

    fontImage.src = `font_${_font.charWidth}_${_font.charHeight}.png`


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
        /*
        context.mozImageSmoothingEnabled = false
        context.webkitImageSmoothingEnabled = false
        context.msImageSmoothingEnabled = false
        context.imageSmoothingEnabled = false
        */
        context.drawImage(fontImage, 0, 0)

        // Tint it by filling in the existing alpha with the color.
        context.globalCompositeOperation = 'source-atop'
        context.fillStyle = color
        context.fillRect(0, 0, _font.width, _font.height)

        _fontColorCache[color] = tint
        return tint
    }


    const draw = function (col, row, glyph, fg, bgColor=bg) {
        const idx = Math.floor(row * columns + col)

        if (fgs[idx] === fg && bgs[idx] === bgColor && data[idx] === glyph)
            return

        fgs[idx] = fg
        bgs[idx] = bgColor
        data[idx] = glyph
        //changed.push(idx)

        let char = glyph

        // Remap it if it's a Unicode character.
        char = unicodeMap[char] || char.charCodeAt(0)

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
            return

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


    const clear = function () {
        //_context.fillStyle = 'whitesmoke'
        //_context.fillRect(0, 0, canvas.width, canvas.height)
    }


    return {
        clear,
        draw,
        drawText,
        export: () => data,
        getContainer: () => canvas,
        eventToPosition,
        render: function () {
            /*
            for (let i=0; i < changed.length; i++) {
                const idx = changed[i]
                //const col = idx % columns
                //const row = idx / columns | 0
                cellEls[idx].style.backgroundColor = bgs[idx]
                cellEls[idx].style.color = fgs[idx]
                cellEls[idx].innerText = data[idx]
            }

            changed.length = 0
            */
        }
    }
}
