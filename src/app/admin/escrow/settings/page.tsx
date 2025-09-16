"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

interface EscrowSettings {
  id: string
  feePercentage: number
  feeFixed: number
  minAmount: number
  maxAmount: number
  enabled: boolean
  autoApprove: boolean
  disputeWindowDays: number
  termsAndConditions: string
  updatedAt: string
}

export default function EscrowSettingsPage() {
  const [settings, setSettings] = useState<EscrowSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/escrow/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
      } else {
        // Jika tidak ada pengaturan, buat default
        const defaultSettings: EscrowSettings = {
          id: 'default',
          feePercentage: 2.5, // 2.5%
          feeFixed: 1000, // Rp 1,000
          minAmount: 10000, // Rp 10,000
          maxAmount: 10000000, // Rp 10,000,000
          enabled: true,
          autoApprove: false,
          disputeWindowDays: 7,
          termsAndConditions: `Syarat dan Ketentuan Rekber:

1. Rekber adalah sistem jaminan untuk transaksi jual beli
2. Biaya rekber akan ditambahkan ke total pembayaran
3. Dana akan ditahan sampai kedua belah pihak setuju
4. Sengketa dapat dilaporkan dalam waktu 7 hari
5. Admin berhak memutuskan dalam kasus sengketa`,
          updatedAt: new Date().toISOString()
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Gagal memuat pengaturan rekber:', error)
      toast.error('Gagal memuat pengaturan rekber')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/escrow/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
        toast.success('Pengaturan rekber berhasil disimpan')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Gagal menyimpan pengaturan')
      }
    } catch (error) {
      console.error('Gagal menyimpan pengaturan rekber:', error)
      toast.error('Gagal menyimpan pengaturan rekber')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof EscrowSettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  const translateToIndonesian = async () => {
    if (!settings?.termsAndConditions) return

    setTranslating(true)
    try {
      const res = await fetch('/api/admin/escrow/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: settings.termsAndConditions })
      })

      if (res.ok) {
        const data = await res.json()
        updateSetting('termsAndConditions', data.translatedText)
        toast.success('Teks berhasil diterjemahkan ke Bahasa Indonesia')
      } else {
        toast.error('Gagal menerjemahkan teks')
      }
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Gagal menerjemahkan teks')
    } finally {
      setTranslating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Gagal memuat pengaturan rekber</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/escrow" className="text-sm text-muted-foreground hover:text-foreground">
              ← Kembali ke Kasus Rekber
            </Link>
          </div>
          <h1 className="text-xl font-semibold">Pengaturan Rekber</h1>
          <p className="text-sm text-muted-foreground">Konfigurasi biaya dan kebijakan rekber</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Konfigurasi Biaya */}
        <Card>
          <CardHeader>
            <CardTitle>Konfigurasi Biaya</CardTitle>
            <CardDescription>
              Atur cara perhitungan biaya rekber untuk transaksi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feePercentage">Persentase Biaya (%)</Label>
                <Input
                  id="feePercentage"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={settings.feePercentage}
                  onChange={(e) => updateSetting('feePercentage', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Persentase dari jumlah transaksi yang dikenakan sebagai biaya rekber
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feeFixed">Biaya Tetap (Rp)</Label>
                <Input
                  id="feeFixed"
                  type="number"
                  min="0"
                  value={settings.feeFixed}
                  onChange={(e) => updateSetting('feeFixed', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Jumlah tetap yang ditambahkan ke biaya persentase
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batas Transaksi */}
        <Card>
          <CardHeader>
            <CardTitle>Batas Transaksi</CardTitle>
            <CardDescription>
              Atur jumlah minimum dan maksimum untuk transaksi rekber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minAmount">Jumlah Minimum (Rp)</Label>
                <Input
                  id="minAmount"
                  type="number"
                  min="0"
                  value={settings.minAmount}
                  onChange={(e) => updateSetting('minAmount', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Jumlah minimum transaksi yang diizinkan untuk rekber
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Jumlah Maksimum (Rp)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  min="0"
                  value={settings.maxAmount}
                  onChange={(e) => updateSetting('maxAmount', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Jumlah maksimum transaksi yang diizinkan untuk rekber
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pengaturan Kebijakan */}
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Kebijakan</CardTitle>
            <CardDescription>
              Konfigurasi perilaku rekber dan kebijakan penyelesaian sengketa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aktifkan Sistem Rekber</Label>
                <p className="text-xs text-muted-foreground">
                  Izinkan pengguna membuat transaksi rekber
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Setujui Otomatis Penjual Terpercaya</Label>
                <p className="text-xs text-muted-foreground">
                  Otomatis setujui rekber untuk penjual dengan rating tinggi
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoApprove}
                onChange={(e) => updateSetting('autoApprove', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="disputeWindowDays">Jendela Sengketa (Hari)</Label>
              <Input
                id="disputeWindowDays"
                type="number"
                min="1"
                max="30"
                value={settings.disputeWindowDays}
                onChange={(e) => updateSetting('disputeWindowDays', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Jumlah hari setelah penyelesaian transaksi untuk melaporkan sengketa
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Syarat dan Ketentuan */}
        <Card>
          <CardHeader>
            <CardTitle>Syarat dan Ketentuan Rekber</CardTitle>
            <CardDescription>
              Atur syarat dan ketentuan yang akan ditampilkan kepada pengguna
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="termsAndConditions">Teks Syarat dan Ketentuan</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={translateToIndonesian}
                disabled={translating || !settings.termsAndConditions}
              >
                {translating ? 'Menerjemahkan...' : '🔄 Terjemahkan ke Indonesia'}
              </Button>
            </div>
            <Textarea
              id="termsAndConditions"
              value={settings.termsAndConditions}
              onChange={(e) => updateSetting('termsAndConditions', e.target.value)}
              rows={12}
              placeholder="Masukkan syarat dan ketentuan rekber di sini..."
            />
            <p className="text-xs text-muted-foreground">
              Teks ini akan ditampilkan kepada pengguna saat membuat transaksi rekber
            </p>
          </CardContent>
        </Card>

        {/* Pratinjau Biaya */}
        <Card>
          <CardHeader>
            <CardTitle>Pratinjau Biaya</CardTitle>
            <CardDescription>
              Lihat bagaimana biaya akan dihitung untuk berbagai jumlah transaksi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[50000, 100000, 500000, 1000000].map(amount => {
                const percentageFee = (amount * settings.feePercentage) / 100
                const totalFee = percentageFee + settings.feeFixed
                return (
                  <div key={amount} className="flex justify-between text-sm">
                    <span>Rp {amount.toLocaleString()}</span>
                    <span>Rp {Math.round(totalFee).toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
