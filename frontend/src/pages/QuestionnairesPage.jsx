import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE, authedFetch, fetchRespondents, getSessionUser } from '../utils/api'

const VHI_ITEMS = [
  '說話時會上氣不接下氣',
  '我的嗓音一天內有不同的變化',
  '大家會問我「你的聲音怎麼了」',
  '我的聲音聽起來沙啞、乾澀',
  '我覺得我必須要用力才能發出聲音',
  '我聲音的清晰度是無法預測、變化多端的',
  '我試著改變我的聲音使他聽起來不同',
  '說話使我感到吃力',
  '傍晚過後我的聲音聽起來更糟',
  '說話說到一半時、聲音會失控失聲',
]

const STOP_BANG_ITEMS = [
  '你是否經常打鼾（聲音大到可透過門外聽見）？',
  '你是否常在白天感到疲倦、嗜睡或精神不濟？',
  '是否有人觀察到你睡覺時會停止呼吸？',
  '你是否有高血壓，或正在服用高血壓藥物？',
  '你的 BMI 是否大於 35？',
  '你的年齡是否大於 50 歲？',
  '你的頸圍是否大於 40 公分？',
]

const RSI_ITEMS = [
  '聲音沙啞或音質異常',
  '經常清喉嚨',
  '喉嚨有過多黏液或鼻涕倒流',
  '吞嚥食物、水或藥物困難',
  '吃東西或躺下後咳嗽',
  '呼吸困難或喘鳴發作',
  '惱人的咳嗽',
  '喉嚨有異物感',
  '胸口灼熱、胸痛、消化不良或胃酸逆流',
]

const RSI_OPTIONS = [
  { score: 0, label: '無問題' },
  { score: 1, label: '極輕微' },
  { score: 2, label: '輕微' },
  { score: 3, label: '中等' },
  { score: 4, label: '明顯嚴重' },
  { score: 5, label: '非常嚴重' },
]

const RFS_ITEMS = [
  {
    question: '聲帶下水腫（Subglottic edema）',
    options: [
      { score: 0, label: '無' },
      { score: 2, label: '有' },
    ],
  },
  {
    question: '聲門閉合（Ventricular obliteration）',
    options: [
      { score: 0, label: '無' },
      { score: 2, label: '部分' },
      { score: 4, label: '完全' },
    ],
  },
  {
    question: '聲帶紅腫（Erythema / hyperemia）',
    options: [
      { score: 0, label: '無' },
      { score: 2, label: '聲帶' },
      { score: 4, label: '擴及整個喉部' },
    ],
  },
  {
    question: '聲帶水腫（Vocal fold edema）',
    options: [
      { score: 0, label: '無' },
      { score: 1, label: '輕微' },
      { score: 2, label: '中等' },
      { score: 3, label: '嚴重' },
      { score: 4, label: '息肉樣' },
    ],
  },
  {
    question: '喉部瀰漫性水腫（Diffuse laryngeal edema）',
    options: [
      { score: 0, label: '無' },
      { score: 1, label: '輕微' },
      { score: 2, label: '中等' },
      { score: 3, label: '嚴重' },
      { score: 4, label: '非常嚴重' },
    ],
  },
  {
    question: '後聯合肥厚（Posterior commissure hypertrophy）',
    options: [
      { score: 0, label: '無' },
      { score: 1, label: '輕微' },
      { score: 2, label: '中等' },
      { score: 3, label: '嚴重' },
      { score: 4, label: '非常嚴重' },
    ],
  },
  {
    question: '肉芽或肉芽瘤（Granuloma / granulation tissue）',
    options: [
      { score: 0, label: '無' },
      { score: 2, label: '有' },
    ],
  },
  {
    question: '喉部黏液（Thick endolaryngeal mucus）',
    options: [
      { score: 0, label: '無' },
      { score: 2, label: '有' },
    ],
  },
]

function QuestionnairesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [sessionUser, setSessionUser] = useState(null)
  const [respondents, setRespondents] = useState([])
  const [targetUserId, setTargetUserId] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const initialVhiAnswers = useMemo(() => {
    const obj = {}
    VHI_ITEMS.forEach((_, idx) => { obj[idx] = '0' })
    obj.age = ''
    return obj
  }, [])
  const initialStopBangAnswers = useMemo(() => {
    const obj = {}
    STOP_BANG_ITEMS.forEach((_, idx) => { obj[idx] = '0' })
    return obj
  }, [])
  const initialRsiAnswers = useMemo(() => {
    const obj = {}
    RSI_ITEMS.forEach((_, idx) => { obj[idx] = '0' })
    return obj
  }, [])
  const initialRfsAnswers = useMemo(() => {
    const obj = {}
    RFS_ITEMS.forEach((item, idx) => { obj[idx] = String(item.options[0].score) })
    return obj
  }, [])

  const [vhiAnswers, setVhiAnswers] = useState(initialVhiAnswers)
  const [stopBangAnswers, setStopBangAnswers] = useState(initialStopBangAnswers)
  const [rsiAnswers, setRsiAnswers] = useState(initialRsiAnswers)
  const [rfsAnswers, setRfsAnswers] = useState(initialRfsAnswers)
  const [vhiSubmitted, setVhiSubmitted] = useState(false)
  const [stopBangSubmitted, setStopBangSubmitted] = useState(false)
  const [rsiSubmitted, setRsiSubmitted] = useState(false)
  const [rfsSubmitted, setRfsSubmitted] = useState(false)

  const [vhiStatus, setVhiStatus] = useState('')
  const [stopBangStatus, setStopBangStatus] = useState('')
  const [rsiStatus, setRsiStatus] = useState('')
  const [rfsStatus, setRfsStatus] = useState('')

  const [vhiSubmitting, setVhiSubmitting] = useState(false)
  const [stopBangSubmitting, setStopBangSubmitting] = useState(false)
  const [rsiSubmitting, setRsiSubmitting] = useState(false)
  const [rfsSubmitting, setRfsSubmitting] = useState(false)

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
          setVhiStatus('受測者清單載入失敗')
          setStopBangStatus('受測者清單載入失敗')
          setRsiStatus('受測者清單載入失敗')
          setRfsStatus('受測者清單載入失敗')
        })
    }
  }, [searchParams])

  const submitQuestionnaire = async (payload) => {
    const nextPayload = { ...payload }
    if (sessionUser?.role === 'admin' && targetUserId) {
      nextPayload.target_user_id = targetUserId
    }
    const res = await authedFetch(`${API_BASE}/questionnaires/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextPayload),
    })
    if (!res.ok) throw new Error('submit failed')
  }

  const buildSuccessText = () => {
    if (sessionUser?.role === 'admin' && targetUserId) {
      const selected = respondents.find((item) => String(item.id) === String(targetUserId))
      return `已送出並加入 ${selected?.username || '受測者'} 的紀錄`
    }
    return '已送出'
  }

  const ensureAdminTarget = () => {
    if (sessionUser?.role === 'admin' && !targetUserId) {
      throw new Error('請先選擇受測者')
    }
  }

  const handleSubmitVhi = async () => {
    setVhiSubmitting(true)
    setVhiStatus('')
    try {
      ensureAdminTarget()
      const payload = {
        questionnaire_id: 'VHI-10',
        answers: {
          age: vhiAnswers.age || '',
          responses: VHI_ITEMS.map((q, idx) => ({ question: q, score: Number(vhiAnswers[idx] || 0) })),
        },
      }
      await submitQuestionnaire(payload)
      setVhiStatus(buildSuccessText())
      setVhiSubmitted(true)
    } catch (err) {
      console.error(err)
      setVhiStatus(err?.message || '提交失敗，請稍後再試')
    } finally {
      setVhiSubmitting(false)
    }
  }

  const handleSubmitStopBang = async () => {
    setStopBangSubmitting(true)
    setStopBangStatus('')
    try {
      ensureAdminTarget()
      const responses = STOP_BANG_ITEMS.map((q, idx) => {
        const score = Number(stopBangAnswers[idx] || 0)
        return {
          question: q,
          answer: score === 1 ? '是' : '否',
          score,
        }
      })
      const totalScore = responses.reduce((sum, item) => sum + (item.score || 0), 0)
      const payload = {
        questionnaire_id: '病史調查', 
        answers: {
          note: 'gender 已由系統資料帶入，不另行提問',
          total_score: totalScore,
          responses,
        },
      }
      await submitQuestionnaire(payload)
      setStopBangStatus(`${buildSuccessText()}`)
      setStopBangSubmitted(true)
    } catch (err) {
      console.error(err)
      setStopBangStatus(err?.message || '提交失敗，請稍後再試')
    } finally {
      setStopBangSubmitting(false)
    }
  }

  const handleSubmitRsi = async () => {
    setRsiSubmitting(true)
    setRsiStatus('')
    try {
      ensureAdminTarget()
      const responses = RSI_ITEMS.map((q, idx) => ({
        question: q,
        score: Number(rsiAnswers[idx] || 0),
      }))
      const totalScore = responses.reduce((sum, item) => sum + (item.score || 0), 0)
      const payload = {
        questionnaire_id: 'rsi',
        answers: {
          total_score: totalScore,
          responses,
        },
      }
      await submitQuestionnaire(payload)
      setRsiStatus(`${buildSuccessText()}（總分：${totalScore}）`)
      setRsiSubmitted(true)
    } catch (err) {
      console.error(err)
      setRsiStatus(err?.message || '提交失敗，請稍後再試')
    } finally {
      setRsiSubmitting(false)
    }
  }

  const handleSubmitRfs = async () => {
    setRfsSubmitting(true)
    setRfsStatus('')
    try {
      ensureAdminTarget()
      const responses = RFS_ITEMS.map((item, idx) => ({
        question: item.question,
        score: Number(rfsAnswers[idx] || 0),
      }))
      const totalScore = responses.reduce((sum, item) => sum + (item.score || 0), 0)
      const payload = {
        questionnaire_id: 'rfs',
        answers: {
          total_score: totalScore,
          responses,
        },
      }
      await submitQuestionnaire(payload)
      setRfsStatus(`${buildSuccessText()}（總分：${totalScore}）`)
      setRfsSubmitted(true)
    } catch (err) {
      console.error(err)
      setRfsStatus(err?.message || '提交失敗，請稍後再試')
    } finally {
      setRfsSubmitting(false)
    }
  }

  const goToStep = (step) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNextFromSelect = () => {
    try {
      ensureAdminTarget()
      goToStep(1)
    } catch (err) {
      setVhiStatus(err?.message || '請先完成必要欄位')
    }
  }

  const handleBackToDashboard = () => {
    if (sessionUser?.role === 'admin') {
      navigate('/admin/dashboard')
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="grid" style={{ gap: '16px' }}>
      {currentStep === 0 && (
        <div className="panel">
          <h2>步驟 1：開始填寫</h2>
          <p>此頁採分步驟填寫，完成一個 panel 後可按下一步進入下一份問卷。</p>

          <div className="form-grid" style={{ maxWidth: '800px' }}>
            {sessionUser?.role === 'admin' && (
              <label>
                <span>代填受測者 *</span>
                <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
                  <option value="">請選擇受測者</option>
                  {respondents.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.username}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="form-actions">
              <button type="button" onClick={handleNextFromSelect}>下一步：VHI-10</button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="panel">
        <h2>VHI-10 嗓音障礙指標</h2>
        <p>請依目前狀況，為每題選擇嚴重程度 0（不嚴重）到 4（最嚴重）。</p>

        <div className="form-grid" style={{ maxWidth: '800px' }}>
          <label>
            <span>年齡</span>
            <input
              type="number"
              min="0"
              max="120"
              value={vhiAnswers.age}
              onChange={(e) => setVhiAnswers((p) => ({ ...p, age: e.target.value }))}
              placeholder="請輸入年齡"
            />
          </label>
          {VHI_ITEMS.map((q, idx) => (
            <label key={q} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <span>{`${idx + 1}. ${q}`}</span>
              <div className="radio-row">
                {[0, 1, 2, 3, 4].map((n) => (
                  <label key={n} className="radio-item">
                    <input
                      type="radio"
                      name={`vhi-${idx}`}
                      value={String(n)}
                      checked={vhiAnswers[idx] === String(n)}
                      onChange={(e) => setVhiAnswers((p) => ({ ...p, [idx]: e.target.value }))}
                    />
                    <span>{n}</span>
                  </label>
                ))}
              </div>
            </label>
          ))}
          <div className="form-actions">
            <button type="button" disabled={vhiSubmitting} onClick={handleSubmitVhi}>
              {vhiSubmitting ? '送出中…' : '送出 VHI-10'}
            </button>
            {vhiStatus && <span className="status-pill">{vhiStatus}</span>}
          </div>
          {vhiSubmitted && (
            <div className="form-actions" style={{ marginTop: '8px' }}>
              <button type="button" onClick={() => goToStep(2)}>下一步：病史調查</button>
            </div>
          )}
        </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="panel">
        <h2>病史調查</h2>

        <div className="form-grid" style={{ maxWidth: '800px' }}>
          {STOP_BANG_ITEMS.map((q, idx) => (
            <label key={q} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <span>{`${idx + 1}. ${q}`}</span>
              <div className="radio-row">
                {[
                  { value: '1', label: '是' },
                  { value: '0', label: '否' },
                ].map((item) => (
                  <label key={item.label} className="radio-item">
                    <input
                      type="radio"
                      name={`stop-bang-${idx}`}
                      value={item.value}
                      checked={stopBangAnswers[idx] === item.value}
                      onChange={(e) => setStopBangAnswers((p) => ({ ...p, [idx]: e.target.value }))}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </label>
          ))}
          <div className="form-actions">
            <button type="button" disabled={stopBangSubmitting} onClick={handleSubmitStopBang}>
              {stopBangSubmitting ? '送出中…' : '送出病史調查'}
            </button>
            {stopBangStatus && <span className="status-pill">{stopBangStatus}</span>}
          </div>
          {stopBangSubmitted && (
            <div className="form-actions" style={{ marginTop: '8px' }}>
              <button type="button" onClick={() => goToStep(3)}>下一步：RSI</button>
            </div>
          )}
        </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="panel">
        <h2>RSI 咽喉逆流症狀指數</h2>
        <p>請依近一個月症狀嚴重度評分：0（無）到 5（非常嚴重）。</p>

        <div className="form-grid" style={{ maxWidth: '800px' }}>
          {RSI_ITEMS.map((q, idx) => (
            <label key={q} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <span>{`${idx + 1}. ${q}`}</span>
              <div className="radio-row">
                {RSI_OPTIONS.map((item) => (
                  <label key={`${q}-${item.score}`} className="radio-item">
                    <input
                      type="radio"
                      name={`rsi-${idx}`}
                      value={String(item.score)}
                      checked={rsiAnswers[idx] === String(item.score)}
                      onChange={(e) => setRsiAnswers((p) => ({ ...p, [idx]: e.target.value }))}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </label>
          ))}
          <div className="form-actions">
            <button type="button" disabled={rsiSubmitting} onClick={handleSubmitRsi}>
              {rsiSubmitting ? '送出中…' : '送出 RSI'}
            </button>
            {rsiStatus && <span className="status-pill">{rsiStatus}</span>}
          </div>
          {rsiSubmitted && (
            <div className="form-actions" style={{ marginTop: '8px' }}>
              <button type="button" onClick={() => goToStep(4)}>下一步：RFS</button>
            </div>
          )}
        </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="panel">
        <h2>RFS 咽喉逆流檢查評分</h2>
        <p>請依檢查結果為各項指標評分。</p>

        <div className="form-grid" style={{ maxWidth: '800px' }}>
          {RFS_ITEMS.map((item, idx) => (
            <label key={item.question} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
              <span>{`${idx + 1}. ${item.question}`}</span>
              <div className="radio-row">
                {item.options.map((option) => (
                  <label key={`${item.question}-${option.score}`} className="radio-item">
                    <input
                      type="radio"
                      name={`rfs-${idx}`}
                      value={String(option.score)}
                      checked={rfsAnswers[idx] === String(option.score)}
                      onChange={(e) => setRfsAnswers((p) => ({ ...p, [idx]: e.target.value }))}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </label>
          ))}
          <div className="form-actions">
            <button type="button" disabled={rfsSubmitting} onClick={handleSubmitRfs}>
              {rfsSubmitting ? '送出中…' : '送出 RFS'}
            </button>
            {rfsStatus && <span className="status-pill">{rfsStatus}</span>}
          </div>
          {vhiSubmitted && stopBangSubmitted && rsiSubmitted && rfsSubmitted && (
            <>
              <div className="placeholder-desc">問卷填寫完成，感謝您。</div>
              <div className="form-actions" style={{ marginTop: '8px' }}>
                <button type="button" onClick={handleBackToDashboard}>回到儀表板</button>
              </div>
            </>
          )}
        </div>
        </div>
      )}
    </div>
  )
}

export default QuestionnairesPage
