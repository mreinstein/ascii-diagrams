import CharCode   from './char_code.js'
import unicodeMap from './unicode_map.js'


const _font = {
    charWidth: 16,
    charHeight: 16,
    width: 0,
    height: 0
}

const _display = {
    columns: 80,
    rows: 25
}


// A cache of the tinted font images. Each key is a color, and the image
// will is the font in that color.
const _fontColorCache = { };


// the drawing scale, used to adapt to Retina displays.
const _scale = window.devicePixelRatio | 0

const canvas = document.createElement('canvas')
const _context = canvas.getContext('2d', { alpha: false })
document.body.appendChild(canvas)


const fontImage = new Image()

fontImage.onload = function () {
    _font.width = fontImage.width
    _font.height = fontImage.height

    // Handle high-resolution (i.e. retina) displays.
    const canvasWidth = _font.charWidth * _display.columns
    const canvasHeight = _font.charHeight * _display.rows
    canvas.width = canvasWidth * _scale
    canvas.height = canvasHeight * _scale
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`

    const glyph = {
        char: 'X',
        back: {
            cssColor: 'black'
        },
        fore: 'orange'
    }
    render(0, 0, glyph)

    glyph.char = '+'
    glyph.fore = 'gray'
    render(1, 0, glyph)
}

fontImage.src = `font_${_font.charWidth}_${_font.charHeight}.png`


function render (col, row, glyph) {
    let char = glyph.char

    // Remap it if it's a Unicode character.
    char = unicodeMap[char] || char.charCodeAt(0)

    // the font files always have 32 columns
    const sx = (char % 32) * _font.charWidth
    const sy = (char / 32 | 0) * _font.charHeight

    // Fill the background.
    _context.fillStyle = glyph.back.cssColor

    _context.fillRect(
      col * _font.charWidth * _scale,
      row * _font.charHeight * _scale,
      _font.charWidth * _scale,
      _font.charHeight * _scale
    )

    // Don't bother drawing empty characters.
    if (char == 0 || char == CharCode.space)
        return

    const color = _getColorFont(glyph.fore)

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


function _getColorFont (color) {
    const cached = _fontColorCache[color]
    if (cached != null)
        return cached

    // Create a font using the given color.
    const tint = document.createElement('canvas')
    tint.width = _font.width
    tint.height = _font.height
    const context = tint.getContext('2d')

    // draw the font
    context.imageSmoothingEnabled = false
    context.drawImage(fontImage, 0, 0)

    // Tint it by filling in the existing alpha with the color.
    context.globalCompositeOperation = 'source-atop'
    context.fillStyle = color
    context.fillRect(0, 0, _font.width, _font.height)

    _fontColorCache[color] = tint
    return tint
}
