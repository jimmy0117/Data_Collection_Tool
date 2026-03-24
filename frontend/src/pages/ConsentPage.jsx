import { useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'
import mockUser from '../data/mockUser'
import consentPdf from '../assets/資料授權同意書.pdf'

const API_BASE = 'http://localhost:8000/api'

function ConsentSection({ label, items, prefix, onSign, onPreview, canSign, onDelete, isSigned }) {
  return (
    <div className="consent-section">
      <div className="section-label">{label}</div>
      <div className="task-list">
        {items.map((doc, idx) => (
          <div key={doc.key} className="task-card">
            <div className="task-index">{prefix}-{idx + 1}</div>
            <div className="task-body">
              <div className="task-title">{doc.title}</div>
              <div className="task-detail">{doc.detail}</div>
            </div>
            <div className="consent-actions">
              {isSigned(doc.key) ? (
                <div className="consent-actions" style={{ gap: '6px' }}>
                  <span className="status-pill ok">已簽署</span>
                  <button type="button" className="ghost-btn" onClick={() => onDelete(doc.key)}>
                    刪除紀錄
                  </button>
                </div>
              ) : canSign(doc.key) ? (
                <button type="button" onClick={() => onSign({ ...doc, prefix, idx })}>
                  簽署/同意
                </button>
              ) : (
                <button type="button" disabled>
                  簽署/同意
                </button>
              )}
              <button type="button" className="ghost-btn" onClick={() => onPreview(doc, doc.key)}>
                下載/預覽
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConsentPage() {
  const irbDocs = [
    {
      key: 'IRB-1',
      title: 'IRB 資料授權同意書',
      detail: '說明研究目的、資料使用範圍、保存期限與撤回權利。',
      pdf: consentPdf,
    },
  ]

  const otherDocs = [
    {
      key: 'OTH-1',
      title: '平台服務條款',
      detail: '一般使用者條款，說明服務內容、責任限制與聯絡窗口。',
      pdf: consentPdf,
    },
  ]

  const [showModal, setShowModal] = useState(false)
  const [activeDoc, setActiveDoc] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [readDocs, setReadDocs] = useState(new Set())
  const [signedDocs, setSignedDocs] = useState(new Set())
  const [signatureMap, setSignatureMap] = useState(new Map())
  const [showPreview, setShowPreview] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)
  const canvasRef = useRef(null)
  const padRef = useRef(null)

  useEffect(() => {
    if (showModal && canvasRef.current) {
      const pad = new SignaturePad(canvasRef.current, {
        backgroundColor: '#ffffff',
        penColor: '#0f172a',
      })
      padRef.current = pad
      resizeCanvas()
    }
    return () => {
      if (padRef.current) padRef.current.off()
    }
  }, [showModal])

  const resizeCanvas = () => {
    if (!canvasRef.current) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const canvas = canvasRef.current
    const { width } = canvas.getBoundingClientRect()
    canvas.width = width * ratio
    canvas.height = 240 * ratio
    canvas.getContext('2d').scale(ratio, ratio)
    padRef.current?.clear()
  }

  const handlePreview = (doc, key) => {
    if (!doc?.pdf) return
    setPreviewDoc({ ...doc, url: doc.pdf })
    setShowPreview(true)
    setReadDocs((prev) => new Set([...prev, key]))
  }

  const canSign = (key) => !signedDocs.has(key) && readDocs.has(key)
  const isSigned = (key) => signedDocs.has(key)

  const handleOpen = (doc) => {
    setActiveDoc(doc)
    setShowModal(true)
    setStatusMsg('')
  }

  const handleClear = () => {
    padRef.current?.clear()
  }

  const handleSave = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      setStatusMsg('請先完成簽名')
      return
    }
    try {
      const dataUrl = padRef.current.toDataURL('image/png')
      const blob = await (await fetch(dataUrl)).blob()
      const formData = new FormData()
      formData.append('signature_file', blob, 'signature.png')
      formData.append('doc_label', activeDoc?.key || activeDoc?.title || '同意書')
      formData.append('signer_name', mockUser.name)
      formData.append('signer_email', mockUser.email)

      const res = await fetch(`${API_BASE}/signatures/`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }
      const saved = await res.json()
      setStatusMsg('簽名已上傳')
      if (activeDoc?.key) {
        setSignedDocs((prev) => new Set([...prev, activeDoc.key]))
        if (saved?.id) {
          setSignatureMap((prev) => {
            const next = new Map(prev)
            next.set(activeDoc.key, saved.id)
            return next
          })
        }
      }
      setShowModal(false)
    } catch (err) {
      setStatusMsg('上傳失敗，請稍後再試')
      console.error(err)
    }
  }

  const handleDelete = async (key) => {
    const sigId = signatureMap.get(key)
    if (!sigId) return
    try {
      const res = await fetch(`${API_BASE}/signatures/${sigId}/`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('delete failed')
      setSignedDocs((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      setSignatureMap((prev) => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      setStatusMsg('已刪除簽署紀錄')
    } catch (err) {
      console.error(err)
      setStatusMsg('刪除失敗')
    }
  }

  useEffect(() => {
    fetch(`${API_BASE}/signatures/`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        const signed = new Set()
        const map = new Map()
        const allDocs = [...irbDocs, ...otherDocs]
        data.forEach((item) => {
          const label = (item.doc_label || '').toLowerCase()
          allDocs.forEach((doc) => {
            if (label === doc.key.toLowerCase() || label === doc.title.toLowerCase()) {
              signed.add(doc.key)
              map.set(doc.key, item.id)
            }
          })
        })
        setSignedDocs(signed)
        setSignatureMap(map)
      })
      .catch((err) => console.warn('fetch signatures failed', err))
  }, [])

  return (
    <div className="panel">
      <h2>資料授權</h2>
      <p>請閱讀並確認以下文件，同意後再進行問卷與錄音。此處為介面示意，之後可串接電子簽名與 PDF 下載/上傳。</p>

      <ConsentSection
        label="研究倫理"
        items={irbDocs}
        prefix="IRB"
        onSign={handleOpen}
        onPreview={handlePreview}
        canSign={canSign}
        isSigned={isSigned}
        onDelete={handleDelete}
      />
      <ConsentSection
        label="其他"
        items={otherDocs}
        prefix="OTH"
        onSign={handleOpen}
        onPreview={handlePreview}
        canSign={canSign}
        isSigned={isSigned}
        onDelete={handleDelete}
      />

      {/* <div className="placeholder-card" style={{ marginTop: '14px' }}>
        <div className="placeholder-title">簽署方式（之後可串接）</div>
        <p className="placeholder-desc">1) 內嵌 PDF + 手寫/打勾簽署；2) 上傳已簽紙本掃描；3) 透過第三方電子簽章服務。完成後更新簽署狀態。</p>
      </div> */}

      {showModal && (
        <div className="consent-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="consent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="consent-modal-header">
              <div>
                <div className="consent-modal-title">簽署：{activeDoc?.title}</div>
                <div className="consent-modal-sub">使用平板可直接手寫；完成後送出儲存圖片。</div>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setShowModal(false)}>
                關閉
              </button>
            </div>
            <div className="signature-box">
              <canvas ref={canvasRef} className="signature-canvas" />
            </div>
            <div className="controls-row">
              <button type="button" onClick={handleSave}>送出簽名</button>
              <button type="button" className="ghost-btn" onClick={handleClear}>
                清除重寫
              </button>
              {statusMsg && <span className="status-pill">{statusMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div
          className="consent-modal-backdrop"
          onClick={() => {
            setShowPreview(false)
            setPreviewDoc(null)
          }}
        >
          <div className="consent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="consent-modal-header">
              <div>
                <div className="consent-modal-title">預覽：{previewDoc?.title}</div>
                <div className="consent-modal-sub">閱讀完畢後即可啟用簽署按鈕。</div>
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setShowPreview(false)
                  setPreviewDoc(null)
                }}
              >
                關閉
              </button>
            </div>
            <div className="preview-box">
              {previewDoc?.url ? (
                <iframe title="doc-preview" src={previewDoc.url} className="preview-frame" />
              ) : (
                <div className="placeholder-desc">無法載入文件</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConsentPage
