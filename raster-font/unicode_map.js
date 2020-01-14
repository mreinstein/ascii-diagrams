import CharCode from './char_code.js'


// Maps Unicode codepoints to their codepage 432 index.
//
// Does not include codepoints whose codepage 432 index is the same.
const unicodeMap = { }

// 1 - 15.
unicodeMap[CharCode.whiteSmilingFace] = 1
unicodeMap[CharCode.blackSmilingFace] = 2
unicodeMap[CharCode.blackHeartSuit] = 3
unicodeMap[CharCode.blackDiamondSuit] = 4
unicodeMap[CharCode.blackClubSuit] = 5
unicodeMap[CharCode.blackSpadeSuit] = 6
unicodeMap[CharCode.bullet] = 7
unicodeMap[CharCode.inverseBullet] = 8
unicodeMap[CharCode.whiteCircle] = 9
unicodeMap[CharCode.inverseWhiteCircle] = 10
unicodeMap[CharCode.maleSign] = 11
unicodeMap[CharCode.femaleSign] = 12
unicodeMap[CharCode.eighthNote] = 13
unicodeMap[CharCode.beamedEighthNotes] = 14
unicodeMap[CharCode.whiteSunWithRays] = 15

// 16 - 31.
unicodeMap[CharCode.blackRightPointingPointer] = 16
unicodeMap[CharCode.blackLeftPointingPointer] = 17
unicodeMap[CharCode.upDownArrow] = 18
unicodeMap[CharCode.doubleExclamationMark] = 19
unicodeMap[CharCode.pilcrow] = 20
unicodeMap[CharCode.sectionSign] = 21
unicodeMap[CharCode.blackRectangle] = 22
unicodeMap[CharCode.upDownArrowWithBase] = 23
unicodeMap[CharCode.upwardsArrow] = 24
unicodeMap[CharCode.downwardsArrow] = 25
unicodeMap[CharCode.rightwardsArrow] = 26
unicodeMap[CharCode.leftwardsArrow] = 27
unicodeMap[CharCode.rightAngle] = 28
unicodeMap[CharCode.leftRightArrow] = 29
unicodeMap[CharCode.blackUpPointingTriangle] = 30
unicodeMap[CharCode.blackDownPointingTriangle] = 31

// 127.
unicodeMap[CharCode.house] = 127

// 128 - 143.
unicodeMap[CharCode.latinCapitalLetterCWithCedilla] = 128
unicodeMap[CharCode.latinSmallLetterUWithDiaeresis] = 129
unicodeMap[CharCode.latinSmallLetterEWithAcute] = 130
unicodeMap[CharCode.latinSmallLetterAWithCircumflex] = 131
unicodeMap[CharCode.latinSmallLetterAWithDiaeresis] = 132
unicodeMap[CharCode.latinSmallLetterAWithGrave] = 133
unicodeMap[CharCode.latinSmallLetterAWithRingAbove] = 134
unicodeMap[CharCode.latinSmallLetterCWithCedilla] = 135
unicodeMap[CharCode.latinSmallLetterEWithCircumflex] = 136
unicodeMap[CharCode.latinSmallLetterEWithDiaeresis] = 137
unicodeMap[CharCode.latinSmallLetterEWithGrave] = 138
unicodeMap[CharCode.latinSmallLetterIWithDiaeresis] = 139
unicodeMap[CharCode.latinSmallLetterIWithCircumflex] = 140
unicodeMap[CharCode.latinSmallLetterIWithGrave] = 141
unicodeMap[CharCode.latinCapitalLetterAWithDiaeresis] = 142
unicodeMap[CharCode.latinCapitalLetterAWithRingAbove] = 143

// 144 - 159.
unicodeMap[CharCode.latinCapitalLetterEWithAcute] = 144
unicodeMap[CharCode.latinSmallLetterAe] = 145
unicodeMap[CharCode.latinCapitalLetterAe] = 146
unicodeMap[CharCode.latinSmallLetterOWithCircumflex] = 147
unicodeMap[CharCode.latinSmallLetterOWithDiaeresis] = 148
unicodeMap[CharCode.latinSmallLetterOWithGrave] = 149
unicodeMap[CharCode.latinSmallLetterUWithCircumflex] = 150
unicodeMap[CharCode.latinSmallLetterUWithGrave] = 151
unicodeMap[CharCode.latinSmallLetterYWithDiaeresis] = 152
unicodeMap[CharCode.latinCapitalLetterOWithDiaeresis] = 153
unicodeMap[CharCode.latinCapitalLetterUWithDiaeresis] = 154
unicodeMap[CharCode.centSign] = 155
unicodeMap[CharCode.poundSign] = 156
unicodeMap[CharCode.yenSign] = 157
unicodeMap[CharCode.pesetaSign] = 158
unicodeMap[CharCode.latinSmallLetterFWithHook] = 159

// 160 - 175.
unicodeMap[CharCode.latinSmallLetterAWithAcute] = 160
unicodeMap[CharCode.latinSmallLetterIWithAcute] = 161
unicodeMap[CharCode.latinSmallLetterOWithAcute] = 162
unicodeMap[CharCode.latinSmallLetterUWithAcute] = 163
unicodeMap[CharCode.latinSmallLetterNWithTilde] = 164
unicodeMap[CharCode.latinCapitalLetterNWithTilde] = 165
unicodeMap[CharCode.feminineOrdinalIndicator] = 166
unicodeMap[CharCode.masculineOrdinalIndicator] = 167
unicodeMap[CharCode.invertedQuestionMark] = 168
unicodeMap[CharCode.reversedNotSign] = 169
unicodeMap[CharCode.notSign] = 170
unicodeMap[CharCode.vulgarFractionOneHalf] = 171
unicodeMap[CharCode.vulgarFractionOneQuarter] = 172
unicodeMap[CharCode.invertedExclamationMark] = 173
unicodeMap[CharCode.leftPointingDoubleAngleQuotationMark] = 174
unicodeMap[CharCode.rightPointingDoubleAngleQuotationMark] = 175

// 176 - 191.
unicodeMap[CharCode.lightShade] = 176
unicodeMap[CharCode.mediumShade] = 177
unicodeMap[CharCode.darkShade] = 178
unicodeMap[CharCode.boxDrawingsLightVertical] = 179
unicodeMap[CharCode.boxDrawingsLightVerticalAndLeft] = 180
unicodeMap[CharCode.boxDrawingsVerticalSingleAndLeftDouble] = 181
unicodeMap[CharCode.boxDrawingsVerticalDoubleAndLeftSingle] = 182
unicodeMap[CharCode.boxDrawingsDownDoubleAndLeftSingle] = 183
unicodeMap[CharCode.boxDrawingsDownSingleAndLeftDouble] = 184
unicodeMap[CharCode.boxDrawingsDoubleVerticalAndLeft] = 185
unicodeMap[CharCode.boxDrawingsDoubleVertical] = 186
unicodeMap[CharCode.boxDrawingsDoubleDownAndLeft] = 187
unicodeMap[CharCode.boxDrawingsDoubleUpAndLeft] = 188
unicodeMap[CharCode.boxDrawingsUpDoubleAndLeftSingle] = 189
unicodeMap[CharCode.boxDrawingsUpSingleAndLeftDouble] = 190
unicodeMap[CharCode.boxDrawingsLightDownAndLeft] = 191

// 192 - 207.
unicodeMap[CharCode.boxDrawingsLightUpAndRight] = 192
unicodeMap[CharCode.boxDrawingsLightUpAndHorizontal] = 193
unicodeMap[CharCode.boxDrawingsLightDownAndHorizontal] = 194
unicodeMap[CharCode.boxDrawingsLightVerticalAndRight] = 195
unicodeMap[CharCode.boxDrawingsLightHorizontal] = 196
unicodeMap[CharCode.boxDrawingsLightVerticalAndHorizontal] = 197
unicodeMap[CharCode.boxDrawingsVerticalSingleAndRightDouble] = 198
unicodeMap[CharCode.boxDrawingsVerticalDoubleAndRightSingle] = 199
unicodeMap[CharCode.boxDrawingsDoubleUpAndRight] = 200
unicodeMap[CharCode.boxDrawingsDoubleDownAndRight] = 201
unicodeMap[CharCode.boxDrawingsDoubleUpAndHorizontal] = 202
unicodeMap[CharCode.boxDrawingsDoubleDownAndHorizontal] = 203
unicodeMap[CharCode.boxDrawingsDoubleVerticalAndRight] = 204
unicodeMap[CharCode.boxDrawingsDoubleHorizontal] = 205
unicodeMap[CharCode.boxDrawingsDoubleVerticalAndHorizontal] = 206
unicodeMap[CharCode.boxDrawingsUpSingleAndHorizontalDouble] = 207

// 208 - 223.
unicodeMap[CharCode.boxDrawingsUpDoubleAndHorizontalSingle] = 208
unicodeMap[CharCode.boxDrawingsDownSingleAndHorizontalDouble] = 209
unicodeMap[CharCode.boxDrawingsDownDoubleAndHorizontalSingle] = 210
unicodeMap[CharCode.boxDrawingsUpDoubleAndRightSingle] = 211
unicodeMap[CharCode.boxDrawingsUpSingleAndRightDouble] = 212
unicodeMap[CharCode.boxDrawingsDownSingleAndRightDouble] = 213
unicodeMap[CharCode.boxDrawingsDownDoubleAndRightSingle] = 214
unicodeMap[CharCode.boxDrawingsVerticalDoubleAndHorizontalSingle] = 215
unicodeMap[CharCode.boxDrawingsVerticalSingleAndHorizontalDouble] = 216
unicodeMap[CharCode.boxDrawingsLightUpAndLeft] = 217
unicodeMap[CharCode.boxDrawingsLightDownAndRight] = 218
unicodeMap[CharCode.fullBlock] = 219
unicodeMap[CharCode.lowerHalfBlock] = 220
unicodeMap[CharCode.leftHalfBlock] = 221
unicodeMap[CharCode.rightHalfBlock] = 222
unicodeMap[CharCode.upperHalfBlock] = 223

// 224 - 239.
unicodeMap[CharCode.greekSmallLetterAlpha] = 224
unicodeMap[CharCode.latinSmallLetterSharpS] = 225
unicodeMap[CharCode.greekCapitalLetterGamma] = 226
unicodeMap[CharCode.greekSmallLetterPi] = 227
unicodeMap[CharCode.greekCapitalLetterSigma] = 228
unicodeMap[CharCode.greekSmallLetterSigma] = 229
unicodeMap[CharCode.microSign] = 230
unicodeMap[CharCode.greekSmallLetterTau] = 231
unicodeMap[CharCode.greekCapitalLetterPhi] = 232
unicodeMap[CharCode.greekCapitalLetterTheta] = 233
unicodeMap[CharCode.greekCapitalLetterOmega] = 234
unicodeMap[CharCode.greekSmallLetterDelta] = 235
unicodeMap[CharCode.infinity] = 236
unicodeMap[CharCode.greekSmallLetterPhi] = 237
unicodeMap[CharCode.greekSmallLetterEpsilon] = 238
unicodeMap[CharCode.intersection] = 239

// 240 - 255.
unicodeMap[CharCode.identicalTo] = 240
unicodeMap[CharCode.plusMinusSign] = 241
unicodeMap[CharCode.greaterThanOrEqualTo] = 242
unicodeMap[CharCode.lessThanOrEqualTo] = 243
unicodeMap[CharCode.topHalfIntegral] = 244
unicodeMap[CharCode.bottomHalfIntegral] = 245
unicodeMap[CharCode.divisionSign] = 246
unicodeMap[CharCode.almostEqualTo] = 247
unicodeMap[CharCode.degreeSign] = 248
unicodeMap[CharCode.bulletOperator] = 249
unicodeMap[CharCode.middleDot] = 250
unicodeMap[CharCode.squareRoot] = 251
unicodeMap[CharCode.superscriptLatinSmallLetterN] = 252
unicodeMap[CharCode.superscriptTwo] = 253
unicodeMap[CharCode.blackSquare] = 254

export default unicodeMap
