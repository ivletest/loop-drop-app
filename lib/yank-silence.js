var Observ = require('mutant/value')
var destroySourceNode = require('lib/destroy-source-node')

module.exports = function (audioContext, input) {
  var output = audioContext.createGain()
  var analyser = audioContext.createAnalyser()

  // prevent stalling at quick end
  var signal = audioContext.createConstantSource()
  signal.offset.value = 0
  signal.start()
  signal.connect(analyser)

  analyser.fftSize = 128
  analyser.minDecibels = -120
  analyser.maxDecibels = -50
  analyser.smoothingTimeConstant = 0.1
  output.connect(analyser)

  var yank = audioContext.createGain()
  input.connect(yank)

  var fft = new Uint8Array(analyser.frequencyBinCount)
  var stopWaiting = null
  var timeout = null

  output.active = Observ(false)

  output.trigger = function () {
    clearTimeout(timeout)
    clearInterval(stopWaiting)
    yank.connect(output)

    if (!output.active()) {
      output.active.set(true)
    }

    timeout = setTimeout(waitForSilence, 5000)
  }

  output.destroy = function () {
    destroySourceNode(signal)
    yank.disconnect()
  }

  return output

  // scoped

  function waitForSilence () {
    clearInterval(stopWaiting)
    stopWaiting = setInterval(() => {
      analyser.getByteFrequencyData(fft)
      var sum = 0
      for (var i = 0; i < fft.length; i++) {
        sum += fft[i]
      }

      if (sum === 0) {
        clearInterval(stopWaiting)
        yank.disconnect()
        output.active.set(false)
      }
    }, 1000)
  }
}
