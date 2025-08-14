"use client"

import { useState } from 'react'

export default function BlogPage() {
  const [topic, setTopic] = useState('')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ id: number; title: string; slug: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [tone, setTone] = useState('')
  const [audience, setAudience] = useState('')
  const [keywords, setKeywords] = useState('')
  const [outline, setOutline] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [frequency, setFrequency] = useState<'off' | 'weekly' | 'biweekly'>('weekly')
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [timeLocal, setTimeLocal] = useState('10:00')
  const [timezone, setTimezone] = useState('America/Chicago')

  async function saveInstructions() {
    setSaving(true)
    setSaveMsg(null)
    setError(null)
    try {
      const res = await fetch('/api/blog/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions,
          config: {
            category,
            tone,
            audience,
            keywords: keywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean),
            outline: outline
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean),
            guidelines: instructions || undefined,
          },
          enabled,
          frequency,
          dayOfWeek,
          timeLocal,
          timezone,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || 'Failed to save settings')
      }
      setSaveMsg('Instructions saved')
    } catch (e: any) {
      setError(e?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicHint: topic || undefined,
          instructions: instructions || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to generate')
      }
      const data = await res.json()
      setResult({ id: data?.post?.id, title: data?.post?.title, slug: data?.post?.slug })
    } catch (e: any) {
      setError(e?.message || 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Blog Management</h1>
          <p className="text-gray-600 mb-6">Create, edit, and manage your blog content</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Generate a new blog post</h2>
            <p className="text-blue-800 text-sm mb-4">
              Provide optional topic and instructions to guide the draft. The post will be generated with ChatGPT and saved in the database.
            </p>

            <form onSubmit={handleGenerate} className="flex flex-col gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Optional topic (e.g., outbound automation)"
                className="w-full border rounded px-3 py-2"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category (e.g., Product, Engineering)"
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="Tone (e.g., practical, data-driven)"
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Audience (e.g., founders & operators)"
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Keywords (comma-separated)"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Optional instructions (tone, audience, outline, keywords, CTA...)"
                className="w-full border rounded px-3 py-2 min-h-[120px]"
              />
              <textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder={'Outline (one item per line)'}
                className="w-full border rounded px-3 py-2 min-h-[100px]"
              />
              <div className="flex gap-3 flex-wrap">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {loading ? 'Generating…' : 'Generate'}
                </button>
                <button
                  type="button"
                  onClick={saveInstructions}
                  disabled={saving}
                  className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Instructions'}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
                >
                  {loading ? 'Publishing…' : 'Publish Blog Now'}
                </button>
              </div>
            </form>

            {error && <div className="mt-3 text-red-700 text-sm">{error}</div>}
            {saveMsg && <div className="mt-3 text-green-700 text-sm">{saveMsg}</div>}
            {result && (
              <div className="mt-3 text-green-700 text-sm">
                Created: <span className="font-medium">{result.title}</span> ({result.slug})
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Scheduling</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Enabled
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="border rounded px-2 py-1"
              >
                <option value="off">Off</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
              </select>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
              <input
                type="text"
                value={timeLocal}
                onChange={(e) => setTimeLocal(e.target.value)}
                placeholder="Time (HH:MM)"
                className="border rounded px-2 py-1"
              />
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Timezone"
                className="border rounded px-2 py-1"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">🚧 Deployment in Progress</h2>
            <p className="text-blue-800 text-sm">
              Blog management temporarily simplified during deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}