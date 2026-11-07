// Original single-cell strokes inspired by the supplied typography references.
// Both layers keep a stable slot for a future per-character pixel morph.
const PIXEL_GLYPHS = {
  A: ['001100', '010010', '100001', '100001', '011110', '100001', '100001'],
  D: ['111100', '100010', '100001', '100001', '100001', '100010', '111100'],
  E: ['111111', '100000', '100000', '111110', '100000', '100000', '111111'],
  H: ['100001', '100001', '100001', '011110', '100001', '100001', '100001'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  J: ['000111', '000001', '000001', '000001', '100001', '010010', '001100'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['1000001', '1100011', '1010101', '1001001', '1000001', '1000001', '1000001'],
  N: ['100001', '110001', '101001', '101001', '100101', '100011', '100001'],
  O: ['0011100', '0100010', '1000001', '1000001', '1000001', '0100010', '0011100'],
  S: ['011110', '100001', '100000', '011110', '000001', '100001', '011110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  '.': ['000', '000', '000', '000', '000', '000', '010'],
}

const PIXEL_PATHS = Object.fromEntries(
  Object.entries(PIXEL_GLYPHS).map(([character, rows]) => [
    character,
    {
      columns: rows[0].length,
      rows: rows.length,
      path: rows.flatMap((row, y) =>
        Array.from(row.matchAll(/1+/g), ({ index, 0: run }) =>
          `M${index} ${y}h${run.length}v1h-${run.length}z`,
        ),
      ).join(''),
    },
  ]),
)

export default function HybridText({ text, pixelIndices = [] }) {
  return (
    <span className="hybrid-text">
      <span className="sr-only">{text}</span>
      <span className="hybrid-text__visual" aria-hidden="true">
        {Array.from(text).map((character, index) => {
          if (character === ' ') return <span className="type-space" key={index}>{' '}</span>

          const glyph = PIXEL_PATHS[character]
          const isPixel = pixelIndices.includes(index) && Boolean(glyph)

          return (
            <span
              key={index}
              className={`type-glyph${isPixel ? ' type-glyph--pixel' : ''}`}
              data-character={character}
              data-letter-index={index}
            >
              <span className="type-glyph__clean">{character}</span>
              {glyph && (
                <svg
                  className="type-glyph__pixel"
                  viewBox={`0 0 ${glyph.columns} ${glyph.rows}`}
                  style={{ '--pixel-ratio': glyph.columns / glyph.rows }}
                  focusable="false"
                  aria-hidden="true"
                >
                  <path d={glyph.path} fill="currentColor" />
                </svg>
              )}
            </span>
          )
        })}
      </span>
    </span>
  )
}
