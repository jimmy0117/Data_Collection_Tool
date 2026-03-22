import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

function RecordingPage() {
  const navigate = useNavigate()
  const API_BASE = 'http://localhost:8000/api'
  const vowelPrompts = ['/a/', '/i/', '/u/', '/ɛ/', '/ə/']
  const phraseGroups = [
    '請讀出鼻音 /m/, /n/ 各 2–3 秒 × 2；再連續念 6–10 次「pa-ta-ka」。',
    '請依序念：媽媽、奶奶、哥哥、爸爸，各 2 次，保持清晰與正常語速。',
    '請自然語速數數 1–40，保持穩定。',
  ]

  const [noiseChecked, setNoiseChecked] = useState(false)
  const [noiseStatus, setNoiseStatus] = useState('未檢測')
  const [noiseChecking, setNoiseChecking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [phase, setPhase] = useState(1)
  const [promptIndex, setPromptIndex] = useState(0) // for vowels
  const [phraseIndex, setPhraseIndex] = useState(0) // for grouped tasks
  const [clips, setClips] = useState([])
  const [stepReady, setStepReady] = useState(false)
  const deleteClip = useMemo(() => handleDeleteClipFactory(setClips), [])
  const [promptDone, setPromptDone] = useState(new Set())

  const noiseStreamRef = useRef(null)
  const noiseCheckingRef = useRef(false)
  const recorderRef = useRef(null)
  const recordStreamRef = useRef(null)
  const chunksRef = useRef([])
  const sessionIdRef = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`)
  const clipCountRef = useRef(0)

  const uploadClip = async (blob, promptText, phaseValue) => {
    const formData = new FormData()
    formData.append('audio_file', blob, `${promptText.replace(/\W+/g, '') || 'clip'}.webm`)
    formData.append('prompt', promptText)
    formData.append('phase', phaseValue)
    formData.append('session_id', sessionIdRef.current)

    try {
      await fetch(`${API_BASE}/recordings/`, {
        method: 'POST',
        body: formData,
      })
    } catch (err) {
      console.error('錄音上傳失敗', err)
    }
  }

  const submitSessionLog = async (clipCount) => {
    try {
      await fetch(`${API_BASE}/recording-sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          clip_count: clipCount,
        }),
      })
    } catch (err) {
      console.error('紀錄錄音流程失敗', err)
    }
  }

  useEffect(() => () => {
    noiseStreamRef.current?.getTracks().forEach((t) => t.stop())
    recordStreamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const handleNoiseCheck = async () => {
    setNoiseChecking(true)
    noiseCheckingRef.current = true
    setNoiseStatus('檢測中，請保持安靜（3 秒）')
    setNoiseChecked(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      noiseStreamRef.current = stream
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.fftSize)

      const threshold = 30 // slightly higher容忍環境底噪
      let quietMs = 0
      const interval = 120

      const cleanup = () => {
        noiseStreamRef.current?.getTracks().forEach((t) => t.stop())
        noiseStreamRef.current = null
        audioCtx.close()
        setNoiseChecking(false)
        noiseCheckingRef.current = false
      }

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray)
        let max = 0
        for (let i = 0; i < dataArray.length; i += 1) {
          const v = Math.abs(dataArray[i] - 128)
          if (v > max) max = v
        }
        if (max < threshold) {
          quietMs += interval
          setNoiseStatus(`保持安靜中 (${Math.min(quietMs / 1000, 3).toFixed(1)}s/3s) ...`)
        } else {
          quietMs = 0
          setNoiseStatus('偵測到雜音，請保持安靜重新計時')
        }
        if (quietMs >= 3000) {
          setNoiseChecked(true)
          setNoiseStatus('環境安靜，通過檢測')
          cleanup()
        } else if (noiseCheckingRef.current) {
          window.setTimeout(tick, interval)
        }
      }

      tick()
      // safety timeout 10s
      setTimeout(() => {
        if (!noiseCheckingRef.current && !noiseChecked) return
        if (!noiseChecked) {
          setNoiseStatus('檢測逾時，請重試')
          cleanup()
        }
      }, 10000)
    } catch (err) {
      console.error(err)
      setNoiseStatus('麥克風無法使用，請檢查權限')
      setNoiseChecking(false)
      noiseCheckingRef.current = false
    }
  }

  const promptList = phase === 1 ? vowelPrompts : phraseGroups
  const currentPrompt = phase === 1 ? vowelPrompts[promptIndex] : phraseGroups[phraseIndex]
  const allDoneCurrentPhase = phase === 1 ? promptDone.size >= promptList.length : promptDone.has(currentPrompt)
  const allDoneAll = phase === 2 && phraseIndex === phraseGroups.length - 1 && promptDone.has(currentPrompt)
  const canAdvancePrompt = promptDone.has(currentPrompt)

  const handleStart = async () => {
    if (!noiseChecked || isRecording || !stepReady || promptDone.has(currentPrompt)) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordStreamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      recorderRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const promptText = currentPrompt
        setClips((prev) => [...prev, { url, blob, prompt: promptText, createdAt: new Date().toISOString(), phase }])
        setPromptDone((prev) => new Set([...prev, promptText]))
        clipCountRef.current += 1
        uploadClip(blob, promptText, phase)
        // auto-advance after recording when there is another vowel prompt
        if (phase === 1) {
          setPromptIndex((prev) => (prev + 1 < vowelPrompts.length ? prev + 1 : prev))
        }
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error(err)
      setNoiseStatus('錄音啟動失敗，請檢查麥克風權限')
    }
  }

  const handleStop = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop()
    }
    recordStreamRef.current?.getTracks().forEach((t) => t.stop())
    recordStreamRef.current = null
    setIsRecording(false)
  }

  const handleNextPrompt = () => {
    if (phase === 1) {
      setPromptIndex((prev) => (prev + 1) % vowelPrompts.length)
    } else {
      if (!promptDone.has(currentPrompt)) return
      if (phraseIndex < phraseGroups.length - 1) {
        setPhraseIndex((prev) => prev + 1)
        setPromptDone(new Set())
        setClips([])
      }
    }
  }

  return (
    <div className="panel">
      <h2>錄音收案</h2>
      <p>流程示意：先檢測環境噪音，通過後開始錄製，介面會逐一提示要念的內容。後續可串接麥克風錄音、分段儲存與檔案上傳。</p>

      <div className="recording-grid">
        {!stepReady && (
          <div className="task-card">
            <div className="task-index">步驟 1</div>
            <div className="task-body">
              <div className="task-title">環境噪音檢測</div>
              <div className="task-detail">按下檢測後連續 3 秒保持安靜，通過後才允許開始錄音。</div>
              <div className="status-row" style={{ gap: '10px', alignItems: 'center' }}>
                <span className={`status-pill ${noiseChecked ? 'ok' : 'pending'}`}>{noiseStatus}</span>
                <button type="button" onClick={handleNoiseCheck} disabled={noiseChecking}>
                  {noiseChecking ? '檢測中…' : '檢測環境噪音'}
                </button>
                <button type="button" className="ghost-btn" disabled={!noiseChecked} onClick={() => setStepReady(true)}>
                  下一步
                </button>
              </div>
            </div>
          </div>
        )}

        {stepReady && (
          <div className="task-card">
            <div className="task-index">步驟 2</div>
            <div className="task-body">
              <div className="task-title">錄音 + 朗讀提示</div>
              <div className="prompt-box">
                <div className="prompt-label">提示 {phase === 1 ? `#${promptIndex + 1} (元音)` : `#${phraseIndex + 1} (其他題目)`}</div>
                <p className="prompt-text">{currentPrompt}</p>
              </div>
              <div className="controls-row">
                <button
                  type="button"
                  disabled={!noiseChecked || !stepReady || promptDone.has(currentPrompt)}
                  onMouseDown={handleStart}
                  onMouseUp={handleStop}
                  onMouseLeave={handleStop}
                  onTouchStart={(e) => { e.preventDefault(); handleStart() }}
                  onTouchEnd={(e) => { e.preventDefault(); handleStop() }}
                >
                  按住錄製
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleNextPrompt}
                  disabled={isRecording || (phase === 2 && (!canAdvancePrompt || phraseIndex === phraseGroups.length - 1))}
                >
                  {phase === 1 ? '下一個提示' : '下一個題目'}
                </button>
                <span className={`status-pill ${isRecording ? 'recording' : 'pending'}`}>
                  {isRecording ? '錄音中…' : '待錄音'}
                </span>
                {!canAdvancePrompt && <span className="status-pill">請先錄製此提示</span>}
                {phase === 1 && allDoneCurrentPhase && (
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={isRecording}
                    onClick={() => {
                      setPhase(2)
                      setPromptIndex(0)
                      setPhraseIndex(0)
                      setPromptDone(new Set())
                      setClips([])
                    }}
                  >
                    下一步：進入其他題目
                  </button>
                )}
                {phase === 2 && canAdvancePrompt && phraseIndex < phraseGroups.length - 1 && (
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={isRecording}
                    onClick={handleNextPrompt}
                  >
                    下一個題目
                  </button>
                )}
                {allDoneAll && (
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={isRecording}
                    onClick={async () => {
                      await submitSessionLog(clipCountRef.current)
                      navigate('/dashboard')
                    }}
                  >
                    完成並返回儀表板
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {stepReady && (
          <div className="task-card">
              <div className="task-index">已錄製</div>
            <div className="task-body">
                <div className="task-title">已錄製嗓音</div>
              {clips.length === 0 ? (
                <div className="placeholder-desc">尚未有錄音片段</div>
              ) : (
                <div className="clip-list">
                  {clips.map((clip, idx) => (
                    <div key={clip.createdAt + idx} className="clip-row">
                      <div>
                        <div className="clip-title">片段 #{idx + 1}</div>
                        <div className="clip-sub">{clip.prompt}</div>
                      </div>
                      <div className="clip-actions">
                        <audio controls src={clip.url} />
                        <button type="button" className="ghost-btn" onClick={() => deleteClip(idx)}>
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

  function handleDeleteClipFactory(setClips) {
    return (idx) => {
      setClips((prev) => {
        const next = [...prev]
        const [removed] = next.splice(idx, 1)
        if (removed?.url) URL.revokeObjectURL(removed.url)
        return next
      })
    }
  }

export default RecordingPage
