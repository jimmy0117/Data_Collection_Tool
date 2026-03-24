import { useEffect, useState } from 'react'
import { API_BASE, authedFetch } from '../utils/api'

function AccountPage() {
  const emptyProfile = { name: '', phone: '', role: '' }

  const [profile, setProfile] = useState(emptyProfile)
  const [status, setStatus] = useState('載入中…')
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    authedFetch(`${API_BASE}/profile/`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setProfile({
          name: data?.user?.first_name || data?.user?.username || '',
          phone: data?.phone || '',
          role: data?.role || '',
        })
        setStatus('已載入')
      })
      .catch((err) => {
        console.warn('Profile fetch failed', err)
        setStatus('載入失敗，請稍後重試')
      })
  }, [])

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setStatus('')
  }

  const handleSave = async () => {
    if (!profile.name) {
      setStatus('請填寫姓名')
      return
    }
    setSaving(true)
    try {
      const payload = {
        first_name: profile.name,
        phone: profile.phone,
        role: profile.role,
      }
      const res = await authedFetch(`${API_BASE}/profile/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('save failed')
      setStatus('已儲存並同步後端')
    } catch (err) {
      console.error(err)
      setStatus('後端儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setProfile(emptyProfile)
    setStatus('已清空表單')
  }

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0]
    setFile(selected || null)
    setUploadStatus('')
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected))
    } else {
      setPreviewUrl('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('請先選擇已簽署的圖檔')
      return
    }
    setUploading(true)
    setUploadStatus('')
    try {
      const formData = new FormData()
      formData.append('signature_file', file)
      formData.append('doc_label', '上傳簽署同意圖檔')
      formData.append('signer_name', profile.name || '未填寫姓名')
      formData.append('signer_email', '')

      const res = await authedFetch(`${API_BASE}/signatures/`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText)
      }

      setUploadStatus('已上傳並儲存')
      setFile(null)
      setPreviewUrl('')
    } catch (err) {
      console.error(err)
      setUploadStatus('上傳失敗，請稍後再試')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="panel">
      <h2>帳號管理</h2>
      <p>維護個人基本資料（直接串接後端資料表）。</p>

      <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span>姓名 *</span>
          <input type="text" value={profile.name} onChange={(e) => handleChange('name', e.target.value)} />
        </label>
        <label>
          <span>電話</span>
          <input type="tel" value={profile.phone} onChange={(e) => handleChange('phone', e.target.value)} />
        </label>
        <label>
          <span>角色</span>
          <input type="text" value={profile.role} disabled readOnly />
        </label>
        <div className="form-actions">
          <button type="button" disabled={saving} onClick={handleSave}>
            {saving ? '儲存中…' : '儲存暫存'}
          </button>
          <button type="button" className="ghost-btn" onClick={handleReset}>
            重設
          </button>
          {status && <span className="status-pill">{status}</span>}
        </div>
      </form>

      {/* <div className="upload-card">
        <div className="upload-head">
          <div>
            <div className="upload-title">上傳已簽署的同意書圖片</div>
            <div className="upload-sub">支援 png/jpg 等圖檔，會透過後端儲存。</div>
          </div>
          {uploadStatus && <span className="status-pill">{uploadStatus}</span>}
        </div>
        <div className="upload-body">
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {previewUrl && (
            <div className="upload-preview">
              <img src={previewUrl} alt="簽名預覽" />
            </div>
          )}
        </div>
        <div className="form-actions">
          <button type="button" disabled={uploading} onClick={handleUpload}>
            {uploading ? '上傳中…' : '上傳並儲存'}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setFile(null)
              setPreviewUrl('')
              setUploadStatus('已清除選擇')
            }}
          >
            清除檔案
          </button>
        </div>
      </div> */}
    </div>
  )
}

export default AccountPage
