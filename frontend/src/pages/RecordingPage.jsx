import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE, authedFetch, fetchRespondents, getSessionUser } from '../utils/api'

function RecordingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const vowelPrompts = ['a(/a/)', 'i(/i/)', 'u(/u/)', 'e(/ɛ/)', 'o(/ə/)']
  const phraseGroups = [
    '請讀出鼻音 /m/(閉嘴)， 2–3 秒 × 2',
    '請讀出鼻音 /n/(張嘴)， 2–3 秒 × 2',
    '連續念 6–10 次「pa-ta-ka」',
    '請依序念：媽媽、奶奶、哥哥、爸爸，各 2 次，保持清晰與正常語速。',
    '請自然語速數數 1–40，保持穩定。',
  ]
  const naturalSentencePrompts = [
    '爸爸帶弟弟去公園跑步',
    '哥哥幫媽媽搬東西',
    '媽媽明天要買牛奶',
    '妹妹拿麵包給奶奶',
    '今天下午我和朋友一起去市場買水果',
    '放學後我和同學一起去打球',
  ]

  const [noiseChecked, setNoiseChecked] = useState(false)
  const [noiseStatus, setNoiseStatus] = useState('未檢測')
  const [noiseChecking, setNoiseChecking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [phase, setPhase] = useState(1)
  const [promptIndex, setPromptIndex] = useState(0) // for vowels
  const [phraseIndex, setPhraseIndex] = useState(0) // for grouped tasks
  const [sentenceIndex, setSentenceIndex] = useState(0) // for natural sentences
  const [clips, setClips] = useState([])
  const [stepReady, setStepReady] = useState(false)
  const [sessionUser, setSessionUser] = useState(null)
  const [respondents, setRespondents] = useState([])
  const [targetUserId, setTargetUserId] = useState('')
  const [delegateStatus, setDelegateStatus] = useState('')

  const noiseStreamRef = useRef(null)
  const noiseCheckingRef = useRef(false)
  const recorderRef = useRef(null)
  const recordStreamRef = useRef(null)
  const chunksRef = useRef([])
  const holdToRecordPressedRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const sessionIdRef = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`)
  const clipCountRef = useRef(0)

  const deleteClip = useCallback(
    (idx) => {
      let removedPrompt = null
      let removedPhase = null

      setClips((prev) => {
        const next = [...prev]
        const [removed] = next.splice(idx, 1)
        if (removed?.url) URL.revokeObjectURL(removed.url)
        removedPrompt = removed?.prompt
        removedPhase = removed?.phase
        return next
      })

      if (removedPrompt) {
        if (removedPhase === 1) {
          const idxInVowel = vowelPrompts.indexOf(removedPrompt)
          if (idxInVowel >= 0) setPromptIndex(idxInVowel)
          setPhase(1)
        } else if (removedPhase === 2) {
          const idxInPhrase = phraseGroups.indexOf(removedPrompt)
          if (idxInPhrase >= 0) setPhraseIndex(idxInPhrase)
          setPhase(2)
        } else if (removedPhase === 3) {
          const idxInSentence = naturalSentencePrompts.indexOf(removedPrompt)
          if (idxInSentence >= 0) setSentenceIndex(idxInSentence)
          setPhase(3)
        }
      }
    },
    [
      naturalSentencePrompts,
      phraseGroups,
      setClips,
      setPhraseIndex,
      setPhase,
      setPromptIndex,
      setSentenceIndex,
      vowelPrompts,
    ],
  )

  const uploadClip = async (blob, promptText, phaseValue) => {
    const formData = new FormData()
    formData.append('audio_file', blob, `${promptText.replace(/\W+/g, '') || 'clip'}.mp4`)
    formData.append('prompt', promptText)
    formData.append('phase', phaseValue)
    formData.append('session_id', sessionIdRef.current)
    if (sessionUser?.role === 'admin' && targetUserId) {
      formData.append('target_user_id', targetUserId)
    }

    try {
      await authedFetch(`${API_BASE}/recordings/`, {
        method: 'POST',
        body: formData,
      })
    } catch (err) {
      console.error('錄音上傳失敗', err)
    }
  }

  const submitSessionLog = async (clipCount) => {
    try {
      const payload = {
        session_id: sessionIdRef.current,
        clip_count: clipCount,
      }
      if (sessionUser?.role === 'admin' && targetUserId) {
        payload.target_user_id = targetUserId
      }
      await authedFetch(`${API_BASE}/recording-sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('紀錄錄音流程失敗', err)
    }
  }

  useEffect(() => {
    const user = getSessionUser()
    setSessionUser(user)
    if (user?.role === 'admin') {
      fetchRespondents()
        .then((data) => {
          setRespondents(data)
          const subjectId = searchParams.get('subject')
          if (subjectId && data.some((item) => String(item.id) === String(subjectId))) {
            setTargetUserId(String(subjectId))
          }
        })
        .catch((err) => {
          console.error(err)
          setDelegateStatus('受測者清單載入失敗')
        })
    }

    return () => {
    noiseStreamRef.current?.getTracks().forEach((t) => t.stop())
    recordStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [searchParams])

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

  const promptList = phase === 1 ? vowelPrompts : phase === 2 ? phraseGroups : naturalSentencePrompts
  const promptDone = new Set(clips.filter((clip) => clip.phase === phase).map((clip) => clip.prompt))
  const currentPrompt =
    phase === 1 ? vowelPrompts[promptIndex] : phase === 2 ? phraseGroups[phraseIndex] : naturalSentencePrompts[sentenceIndex]
  const phase2SingleTakePrompts = new Set([
    '連續念 6–10 次「pa-ta-ka」',
    '請自然語速數數 1–40，保持穩定。',
  ])
  const currentPromptRecordCount = clips.filter((clip) => clip.phase === phase && clip.prompt === currentPrompt).length
  const requiredPromptRecordCount =
    phase === 1
      ? 2
      : phase === 2
        ? (phase2SingleTakePrompts.has(currentPrompt) ? 1 : 2)
        : 1
  const currentPromptCompleted = currentPromptRecordCount >= requiredPromptRecordCount
  const allDoneCurrentPhase =
    phase === 1
      ? vowelPrompts.every((prompt) => clips.filter((clip) => clip.phase === 1 && clip.prompt === prompt).length >= 2)
      : currentPromptCompleted
  const allDonePhase2 = phase === 2 && phraseIndex === phraseGroups.length - 1 && currentPromptCompleted
  const allDoneAll = phase === 3 && sentenceIndex === naturalSentencePrompts.length - 1 && currentPromptCompleted
  const canAdvancePrompt = currentPromptCompleted
  const isLastPromptInPhase =
    (phase === 2 && phraseIndex === phraseGroups.length - 1) ||
    (phase === 3 && sentenceIndex === naturalSentencePrompts.length - 1)

  const handleStart = async () => {
    if (sessionUser?.role === 'admin' && !targetUserId) {
      setDelegateStatus('請先選擇受測者')
      return
    }
    if (!noiseChecked || isRecording || !stepReady || currentPromptCompleted) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordStreamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/mp4' })
      recorderRef.current = mediaRecorder
      chunksRef.current = []
      stopRequestedRef.current = false
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mp4' })
        chunksRef.current = []
        recorderRef.current = null
        stopRequestedRef.current = false

        if (blob.size === 0) {
          return
        }

        const url = URL.createObjectURL(blob)
        const promptText = currentPrompt
        setClips((prev) => [...prev, { url, blob, prompt: promptText, createdAt: new Date().toISOString(), phase }])
        clipCountRef.current += 1
        uploadClip(blob, promptText, phase)
        // auto-advance after recording when there is another vowel prompt
        if (phase === 1) {
          setPromptIndex((prev) => {
            const currentCount = clips.filter((clip) => clip.phase === 1 && clip.prompt === promptText).length + 1
            if (currentCount >= 2 && prev + 1 < vowelPrompts.length) {
              return prev + 1
            }
            return prev
          })
        }
      }
      mediaRecorder.start()
      setIsRecording(true)

      // If the user already released before recorder initialization finished, stop immediately.
      if (!holdToRecordPressedRef.current) {
        mediaRecorder.stop()
        recordStreamRef.current?.getTracks().forEach((t) => t.stop())
        recordStreamRef.current = null
        setIsRecording(false)
      }
    } catch (err) {
      console.error(err)
      setNoiseStatus('錄音啟動失敗，請檢查麥克風權限')
    }
  }

  const handleStop = () => {
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording' && !stopRequestedRef.current) {
      stopRequestedRef.current = true
      recorder.stop()
    }
    recordStreamRef.current?.getTracks().forEach((t) => t.stop())
    recordStreamRef.current = null
    setIsRecording(false)
  }

  const handleHoldStart = () => {
    holdToRecordPressedRef.current = true
    handleStart()
  }

  const handleHoldEnd = () => {
    holdToRecordPressedRef.current = false
    handleStop()
  }

  const handleNextPrompt = () => {
    if (phase === 1) {
      if (!currentPromptCompleted) return
      setPromptIndex((prev) => (prev + 1) % vowelPrompts.length)
    } else if (phase === 2) {
      if (!currentPromptCompleted) return
      if (phraseIndex < phraseGroups.length - 1) {
        setPhraseIndex((prev) => prev + 1)
        setClips([])
      }
    } else {
      if (!currentPromptCompleted) return
      if (sentenceIndex < naturalSentencePrompts.length - 1) {
        setSentenceIndex((prev) => prev + 1)
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
              {sessionUser?.role === 'admin' && (
                <div className="form-grid" style={{ maxWidth: '600px', marginBottom: '12px' }}>
                  <label>
                    <span>代收錄音受測者 *</span>
                    <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
                      <option value="">請選擇受測者</option>
                      {respondents.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.username}</option>
                      ))}
                    </select>
                  </label>
                  {delegateStatus && <span className="status-pill">{delegateStatus}</span>}
                </div>
              )}
              <div className="task-title">環境噪音檢測</div>
              <div className="task-detail">按下檢測後連續 3 秒保持安靜，通過後才允許開始錄音。</div>
              <div className="status-row" style={{ gap: '10px', alignItems: 'center' }}>
                <span className={`status-pill ${noiseChecked ? 'ok' : 'pending'}`}>{noiseStatus}</span>
                <button type="button" onClick={handleNoiseCheck} disabled={noiseChecking}>
                  {noiseChecking ? '檢測中…' : '檢測環境噪音'}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={!noiseChecked || (sessionUser?.role === 'admin' && !targetUserId)}
                  onClick={() => setStepReady(true)}
                >
                  下一步
                </button>
              </div>
            </div>
          </div>
        )}

        {stepReady && (
          <div className="task-card">
            <div className="task-index">步驟 {phase + 1}</div>
            <div className="task-body">
              <div className="task-title">錄音 + 朗讀提示</div>
              <div className="prompt-box">
                <div className="prompt-label">
                  提示 {phase === 1 ? `#${promptIndex + 1} (元音)` : phase === 2 ? `#${phraseIndex + 1} (其他題目)` : `#${sentenceIndex + 1} (自然語句)`}
                </div>
                <p className="prompt-text">{currentPrompt}</p>
                <div className="placeholder-desc">
                  {phase === 2
                    ? `此題需錄滿 ${requiredPromptRecordCount} 次，目前已錄 ${currentPromptRecordCount} 次`
                    : `此題目前已錄 ${currentPromptRecordCount} 次`}
                </div>
              </div>
              <div className="controls-row">
                <button
                  type="button"
                  className="hold-record-btn"
                  disabled={!noiseChecked || !stepReady || currentPromptCompleted}
                  onMouseDown={handleHoldStart}
                  onMouseUp={handleHoldEnd}
                  onMouseLeave={handleHoldEnd}
                  onTouchStart={(e) => { e.preventDefault(); handleHoldStart() }}
                  onTouchMove={(e) => { e.preventDefault() }}
                  onTouchEnd={(e) => { e.preventDefault(); handleHoldEnd() }}
                  onContextMenu={(e) => e.preventDefault()}
                  onSelectStart={(e) => e.preventDefault()}
                >
                  按住錄製
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleNextPrompt}
                  disabled={isRecording || !canAdvancePrompt || (phase !== 1 && isLastPromptInPhase)}
                >
                  {phase === 1 ? '下一個提示' : '下一個題目'}
                </button>
                <span className={`status-pill ${isRecording ? 'recording' : 'pending'}`}>
                  {isRecording ? '錄音中…' : '待錄音'}
                </span>
                {!canAdvancePrompt && (
                  <span className="status-pill">
                    {phase === 2 ? `請先錄滿 ${requiredPromptRecordCount} 次` : '請先錄製此提示'}
                  </span>
                )}
                {phase === 1 && allDoneCurrentPhase && (
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={isRecording}
                    onClick={() => {
                      setPhase(2)
                      setPromptIndex(0)
                      setPhraseIndex(0)
                      setSentenceIndex(0)
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
                {allDonePhase2 && (
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={isRecording}
                    onClick={() => {
                      setPhase(3)
                      setSentenceIndex(0)
                      setClips([])
                    }}
                  >
                    下一步：進入自然語句
                  </button>
                )}
                {phase === 3 && canAdvancePrompt && sentenceIndex < naturalSentencePrompts.length - 1 && (
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
                      if (sessionUser?.role === 'admin') {
                        const selected = respondents.find((item) => String(item.id) === String(targetUserId))
                        setDelegateStatus(`已加入 ${selected?.username || '受測者'} 的錄音紀錄`)
                        navigate('/admin/subjects')
                      } else {
                        navigate('/dashboard')
                      }
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
export default RecordingPage
