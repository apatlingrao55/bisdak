'use client'

import { useState, useRef, useEffect } from 'react'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

type Step = 'upload' | 'crop' | 'done'

export default function PassportPhotoTool() {
  const [step, setStep] = useState<Step>('upload')
  const [src, setSrc] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const croppedBlobRef = useRef<Blob | null>(null)
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      alert('File is too large. Maximum size is 20MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setSrc(e.target.result)
        setStep('crop')
      }
    }
    reader.readAsDataURL(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  useEffect(() => {
    if (step !== 'crop' || !src || !imgRef.current) return

    const cropper = new Cropper(imgRef.current, {
      aspectRatio: 3 / 4,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.85,
      cropBoxMovable: false,
      cropBoxResizable: false,
      toggleDragModeOnDblclick: false,
      ready() {
        // Inject eye-level guide line into the fixed crop box
        const container = imgRef.current?.closest('.cropper-container')
        const cropBox = container?.querySelector('.cropper-crop-box') as HTMLElement | null
        if (cropBox) {
          const line = document.createElement('div')
          line.setAttribute('data-guide', 'eyes')
          line.style.cssText =
            'position:absolute;left:0;right:0;top:38%;border-top:1px dashed rgba(251,191,36,0.7);pointer-events:none;z-index:10;'
          const label = document.createElement('span')
          label.textContent = 'eyes'
          label.style.cssText =
            'position:absolute;right:6px;top:-14px;font-size:10px;color:rgba(251,191,36,0.85);font-family:sans-serif;background:rgba(0,0,0,0.4);padding:1px 4px;border-radius:3px;'
          line.appendChild(label)
          cropBox.appendChild(line)
        }
      },
    })
    cropperRef.current = cropper

    return () => {
      cropper.destroy()
      cropperRef.current = null
    }
  }, [step, src])

  function handleCrop() {
    const cropper = cropperRef.current
    if (!cropper) return
    const canvas = cropper.getCroppedCanvas({ width: 900, height: 1200 })
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        croppedBlobRef.current = blob
        setCroppedUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
        setStep('done')
      },
      'image/jpeg',
      0.92,
    )
  }

  function downloadSingle() {
    const blob = croppedBlobRef.current
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'passport-photo.jpg'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function downloadPrintSheet() {
    const blob = croppedBlobRef.current
    if (!blob) return
    const blobUrl = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const CANVAS_W = 1795
      const CANVAS_H = 1205
      const PHOTO_W = 413  // 35mm @ 300 DPI
      const PHOTO_H = 532  // 45mm @ 300 DPI
      const GAP = 35       // 3mm @ 300 DPI
      const LABEL_H = 22

      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      const left = Math.floor((CANVAS_W - 2 * PHOTO_W - GAP) / 2)
      const top = Math.floor((CANVAS_H - 2 * (PHOTO_H + LABEL_H) - GAP) / 2)
      const xs = [left, left + PHOTO_W + GAP]
      const ys = [top, top + PHOTO_H + LABEL_H + GAP]

      ctx.fillStyle = '#9ca3af'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      for (const x of xs) {
        for (const y of ys) {
          ctx.drawImage(img, x, y, PHOTO_W, PHOTO_H)
          ctx.fillText('35×45mm — NZ/AU Passport', x + PHOTO_W / 2, y + PHOTO_H + 16)
        }
      }

      URL.revokeObjectURL(blobUrl)
      canvas.toBlob(
        (b) => {
          if (!b) return
          const a = document.createElement('a')
          a.href = URL.createObjectURL(b)
          a.download = 'passport-photo-print.jpg'
          a.click()
        },
        'image/jpeg',
        0.95,
      )
    }
    img.src = blobUrl
  }

  function reset() {
    setCroppedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    croppedBlobRef.current = null
    setSrc(null)
    setStep('upload')
  }

  const currentStep = step === 'upload' ? 1 : step === 'crop' ? 2 : 3

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {(['Upload', 'Crop', 'Download'] as const).map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: currentStep > i + 1 ? '#36F4A4' : currentStep === i + 1 ? '#36F4A4' : '#27272A',
                  color: currentStep >= i + 1 ? '#000' : '#71717A',
                  fontSize: 13, fontWeight: 600, flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <span style={{ color: currentStep >= i + 1 ? '#D4D4D8' : '#71717A', fontSize: 14 }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: 1, background: '#27272A', margin: '0 12px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
          role="button"
          tabIndex={0}
          aria-label="Upload a passport photo"
          style={{
            border: `2px dashed ${isDragging ? '#36F4A4' : '#3F3F46'}`,
            borderRadius: 12,
            padding: 'clamp(32px, 8vw, 56px) 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 200ms ease, background 200ms ease',
            background: isDragging ? 'rgba(54,244,164,0.04)' : 'transparent',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>📷</div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            Drag photo here, or tap to upload
          </div>
          <div style={{ color: '#71717A', fontSize: 14 }}>
            JPG, PNG, or HEIC · max 20MB · stays on your device
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,.heic,.heif"
            style={{ display: 'none' }}
            onChange={handleFileInput}
            tabIndex={-1}
          />
        </div>
      )}

      {/* Step 2: Crop */}
      {step === 'crop' && src && (
        <div>
          <p style={{ color: '#A1A1AA', fontSize: 14, marginBottom: 12 }}>
            Drag to reposition · Pinch or scroll to zoom · Align your face within the frame
          </p>
          <div style={{ maxWidth: '100%', borderRadius: 8, overflow: 'hidden', background: '#111' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Your photo — drag to position your face"
              style={{ display: 'block', maxWidth: '100%', maxHeight: '65vh' }}
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCrop}
              style={{
                background: '#36F4A4', color: '#000', border: 'none',
                borderRadius: 8, padding: '12px 32px', fontSize: 16,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Use this crop →
            </button>
            <button
              type="button"
              onClick={reset}
              style={{
                background: 'transparent', color: '#71717A', border: '1px solid #3F3F46',
                borderRadius: 8, padding: '12px 20px', fontSize: 14, cursor: 'pointer',
              }}
            >
              Change photo
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Download */}
      {step === 'done' && croppedUrl && (
        <div>
          <p style={{ color: '#A1A1AA', marginBottom: 24, fontSize: 15 }}>
            Your photo is ready.
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <button
              type="button"
              onClick={downloadSingle}
              style={{
                flex: '1 1 200px', background: '#061A1C', border: '1px solid #1E2C31',
                borderRadius: 12, padding: '24px 20px', textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>⬇</div>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                Download Single Photo
              </div>
              <div style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 1.6 }}>
                For online application portals<br />
                JPG · 900×1200 px
              </div>
            </button>

            <button
              type="button"
              onClick={downloadPrintSheet}
              style={{
                flex: '1 1 200px', background: '#061A1C', border: '1px solid #1E2C31',
                borderRadius: 12, padding: '24px 20px', textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>🖨</div>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                Download Print Sheet
              </div>
              <div style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 1.6 }}>
                4 photos on 6×4&quot; paper<br />
                Take to a photo lab or home printer
              </div>
            </button>
          </div>

          <p style={{ color: '#52525B', fontSize: 13 }}>
            ✓ Works for NZ &amp; AU passport applications
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16, background: 'transparent', color: '#71717A',
              border: '1px solid #3F3F46', borderRadius: 8,
              padding: '10px 20px', fontSize: 14, cursor: 'pointer',
            }}
          >
            Start over
          </button>
        </div>
      )}

      <p style={{ color: '#52525B', fontSize: 12, marginTop: 32, lineHeight: 1.6 }}>
        All processing happens in your browser — we never see your photo.
        This tool helps you crop to the correct size. Always check your country&apos;s official
        requirements before applying.
      </p>
    </div>
  )
}
