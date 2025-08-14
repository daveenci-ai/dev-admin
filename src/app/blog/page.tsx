"use client"

import { useEffect, useMemo, useState } from 'react'

// Prefill categories for quick topic selection
const TOPIC_CATEGORIES: Record<string, string[]> = {
	energy_automation: [
		"AI-powered equipment monitoring for energy companies",
		"Predictive maintenance in oil and gas operations",
		"Automated compliance reporting for energy sector",
		"Smart grid management with AI technology",
		"Energy trading automation platforms",
		"Industrial IoT for energy infrastructure",
		"Automated safety monitoring systems",
	],
	energy_operations: [
		"Digital transformation for EPC contractors",
		"Project management automation for energy projects",
		"Asset management systems for utilities",
		"Energy consumption optimization strategies",
		"Industrial process automation solutions",
		"Renewable energy project coordination",
		"Energy facility maintenance scheduling",
	],
	energy_compliance: [
		"OSHA compliance automation for energy companies",
		"Environmental reporting automation systems",
		"Safety incident tracking and analysis",
		"Regulatory compliance management platforms",
		"ISO certification process automation",
		"Energy sector audit preparation tools",
		"Automated safety training management",
	],
	energy_business: [
		"RFP management automation for energy contractors",
		"Bid tracking systems for EPC companies",
		"Lead scoring for energy sector sales",
		"Customer relationship management for utilities",
		"Proposal generation automation tools",
		"Energy market analysis and forecasting",
		"Contract management for energy projects",
	],
	energy_tech: [
		"Machine learning for energy demand forecasting",
		"AI applications in renewable energy",
		"Smart sensor networks for oil and gas",
		"Automated data analysis for energy companies",
		"Digital twin technology for energy assets",
		"Blockchain applications in energy trading",
		"Cloud computing for energy sector operations",
	],
	energy_data: [
		"Document automation for energy contractors",
		"Data integration platforms for utilities",
		"Electronic records management for energy firms",
		"Automated reporting for energy operations",
		"Knowledge management systems for energy sector",
		"Digital workflows for energy project documentation",
		"Automated invoice processing for energy companies",
	],
}

// Prefill content guidelines/time slots
const CONTENT_GUIDELINES: Record<string, {
	type: string
	description: string
	core_categories: string[]
	industry_categories: string[]
	industry_probability: number
}> = {
	early_morning: {
		type: "Quick Start Guides & Fundamentals",
		description: "Essential basics and quick implementation guides for busy professionals starting their day.",
		core_categories: ["energy_automation", "energy_operations"],
		industry_categories: ["energy_compliance", "energy_business"],
		industry_probability: 0.3,
	},
	morning: {
		type: "How-To Guides & Implementation",
		description: "Practical, step-by-step guides that solve specific business problems across AI, marketing, CRM, and operations.",
		core_categories: ["energy_automation", "energy_operations", "energy_compliance"],
		industry_categories: ["energy_business", "energy_tech", "energy_data"],
		industry_probability: 0.4,
	},
	afternoon: {
		type: "Comparisons & Analysis",
		description: "Deep comparisons, tool evaluations, and strategic analysis for business decision makers.",
		core_categories: ["energy_business", "energy_tech"],
		industry_categories: ["energy_compliance", "energy_data"],
		industry_probability: 0.35,
	},
	evening: {
		type: "Trends & Strategic Insights",
		description: "Industry trends, future predictions, and strategic insights about technology and business.",
		core_categories: ["energy_automation", "energy_business", "energy_operations"],
		industry_categories: ["energy_compliance", "energy_data"],
		industry_probability: 0.45,
	},
	late_evening: {
		type: "Deep Dives & Advanced Strategies",
		description: "Comprehensive analysis and advanced strategies for serious business leaders and decision makers.",
		core_categories: ["energy_operations", "energy_business", "energy_compliance"],
		industry_categories: ["energy_data"],
		industry_probability: 0.5,
	},
}

export default function BlogPage() {
	const [topic, setTopic] = useState('')
	const [instructions, setInstructions] = useState('')
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [result, setResult] = useState<{ id: number; title: string; slug: string } | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [saveMsg, setSaveMsg] = useState<string | null>(null)

	// Config
	const [category, setCategory] = useState('')
	const [tone, setTone] = useState('')
	const [audience, setAudience] = useState('')
	const [keywords, setKeywords] = useState('')
	const [outline, setOutline] = useState('')
  const [slot, setSlot] = useState<keyof typeof CONTENT_GUIDELINES>('morning')
  // Category plans (up to 5)
  const [categoryConfigs, setCategoryConfigs] = useState<Array<{
    category: string
    topics: string[]
    schedule: { frequency: 'daily' | 'weekly' | 'monthly'; dayOfWeek?: number; dayOfMonth?: number; timeLocal: string; timezone?: string }
  }>>([
    { category: '', topics: ['', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
    { category: '', topics: ['', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
    { category: '', topics: ['', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
    { category: '', topics: ['', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
  ])

	// Scheduling
	const [enabled, setEnabled] = useState(true)
	const [frequency, setFrequency] = useState<'off' | 'weekly' | 'biweekly'>('weekly')
	const [dayOfWeek, setDayOfWeek] = useState<number>(1)
	const [timeLocal, setTimeLocal] = useState('10:00')
	const [timezone, setTimezone] = useState('America/Chicago')

	// Load existing settings
	useEffect(() => {
		(async () => {
			try {
				const res = await fetch('/api/blog/settings')
				if (!res.ok) return
				const { setting } = await res.json()
				if (setting) {
					setInstructions(setting.instructions || '')
					const cfg = setting.config || {}
					setCategory(cfg.category || '')
					setTone(cfg.tone || '')
					setAudience(cfg.audience || '')
					setKeywords(Array.isArray(cfg.keywords) ? cfg.keywords.join(', ') : (cfg.keywords || ''))
					setOutline(Array.isArray(cfg.outline) ? cfg.outline.join('\n') : (cfg.outline || ''))
					if (cfg.slot && CONTENT_GUIDELINES[cfg.slot]) setSlot(cfg.slot)
          if (Array.isArray(cfg.categoryConfigs)) {
            const existingConfigs = cfg.categoryConfigs
            const padded = [...existingConfigs]
            while (padded.length < 5) {
              padded.push({ category: '', topics: ['', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } })
            }
            setCategoryConfigs(padded.slice(0, 5))
          }
					if (typeof setting.enabled === 'boolean') setEnabled(setting.enabled)
					if (setting.frequency) setFrequency(setting.frequency)
					if (typeof setting.dayOfWeek === 'number') setDayOfWeek(setting.dayOfWeek)
					if (setting.timeLocal) setTimeLocal(setting.timeLocal)
					if (setting.timezone) setTimezone(setting.timezone)
				}
			} catch {}
		})()
	}, [])

	const suggestedTopics = useMemo(() => TOPIC_CATEGORIES[category] || [], [category])

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
						keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
						outline: outline.split('\n').map((l) => l.trim()).filter(Boolean),
						guidelines: instructions || undefined,
						slot,
            categoryConfigs,
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
    <div className="h-screen bg-gray-50">
      <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Blog Management</h1>
					<p className="text-gray-600 mb-4">Configure generation and publish</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
						<h2 className="text-base font-semibold text-blue-900 mb-2">Generate a new blog post</h2>
						<p className="text-blue-800 text-xs mb-3">Provide optional topic and instructions. Saved settings will be used by default.</p>

						<form onSubmit={handleGenerate} className="flex flex-col gap-3">
							<input
								type="text"
								value={topic}
								onChange={(e) => setTopic(e.target.value)}
								placeholder="Optional topic (e.g., outbound automation)"
								className="w-full border rounded px-3 py-2"
							/>

              <div className="grid grid-cols-2 gap-2">
                <select value={slot} onChange={(e) => setSlot(e.target.value as any)} className="border rounded px-2 py-2">
                  {Object.keys(CONTENT_GUIDELINES).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-2 py-2">
                  <option value="">Select default category</option>
                  {Object.keys(TOPIC_CATEGORIES).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-600">{CONTENT_GUIDELINES[slot]?.type}: {CONTENT_GUIDELINES[slot]?.description}</p>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<input type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Tone (e.g., practical)" className="w-full border rounded px-3 py-2" />
								<input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience (e.g., founders)" className="w-full border rounded px-3 py-2" />
								<input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Keywords (comma-separated)" className="w-full border rounded px-3 py-2" />
							</div>

							<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Optional instructions (style, CTA...)" className="w-full border rounded px-3 py-2 min-h-[100px]" />
							<textarea value={outline} onChange={(e) => setOutline(e.target.value)} placeholder={'Outline (one item per line)'} className="w-full border rounded px-3 py-2 min-h-[100px]" />

							<div className="flex gap-2 flex-wrap">
								{suggestedTopics.slice(0, 6).map((t) => (
									<button key={t} type="button" className="px-2 py-1 rounded bg-gray-100 text-gray-800 border" onClick={() => setTopic(t)}>{t}</button>
								))}
							</div>

							<div className="flex gap-3 flex-wrap">
								<button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">{loading ? 'Generating…' : 'Generate'}</button>
								<button type="button" onClick={saveInstructions} disabled={saving} className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save Instructions'}</button>
								<button type="button" onClick={handleGenerate} disabled={loading} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60">{loading ? 'Publishing…' : 'Publish Blog Now'}</button>
							</div>
						</form>

						{error && <div className="mt-3 text-red-700 text-sm">{error}</div>}
						{saveMsg && <div className="mt-3 text-green-700 text-sm">{saveMsg}</div>}
						{result && (
							<div className="mt-3 text-green-700 text-sm">Created: <span className="font-medium">{result.title}</span> ({result.slug})</div>
						)}
					</div>

					<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
						<h3 className="text-base font-semibold text-gray-900 mb-2">Scheduling</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled</label>
							<select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className="border rounded px-2 py-1">
								<option value="off">Off</option>
								<option value="weekly">Weekly</option>
								<option value="biweekly">Biweekly</option>
							</select>
							<select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="border rounded px-2 py-1">
								<option value={0}>Sunday</option>
								<option value={1}>Monday</option>
								<option value={2}>Tuesday</option>
								<option value={3}>Wednesday</option>
								<option value={4}>Thursday</option>
								<option value={5}>Friday</option>
								<option value={6}>Saturday</option>
							</select>
							<input type="text" value={timeLocal} onChange={(e) => setTimeLocal(e.target.value)} placeholder="Time (HH:MM)" className="border rounded px-2 py-1" />
							<input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Timezone" className="border rounded px-2 py-1" />
						</div>
          </div>

		  <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6">
				<h3 className="text-base font-semibold text-gray-900 mb-3">Category Plans (5 rows)</h3>
				<div className="grid grid-cols-1 gap-3">
					{categoryConfigs.map((cfg, idx) => {
						const topic0 = cfg.topics[0] || ''
						const topic1 = cfg.topics[1] || ''
						return (
							<div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start border rounded p-3">
								<select
									value={cfg.category}
									onChange={(e) => {
										const next = [...categoryConfigs]
										next[idx] = { ...cfg, category: e.target.value }
										setCategoryConfigs(next)
									}}
									className="border rounded px-2 py-2"
								>
									<option value="">Category</option>
									{Object.keys(TOPIC_CATEGORIES).map((k) => (
										<option key={k} value={k}>{k}</option>
									))}
								</select>
								<input
									type="text"
									value={topic0}
									onChange={(e) => {
										const next = [...categoryConfigs]
										const topics = [...(cfg.topics || ['', ''])]
										topics[0] = e.target.value
										next[idx] = { ...cfg, topics }
										setCategoryConfigs(next)
									}}
									placeholder="Topic"
									className="border rounded px-2 py-2"
								/>
								<input
									type="text"
									value={topic1}
									onChange={(e) => {
										const next = [...categoryConfigs]
										const topics = [...(cfg.topics || ['', ''])]
										topics[1] = e.target.value
										next[idx] = { ...cfg, topics }
										setCategoryConfigs(next)
									}}
									placeholder="Example"
									className="border rounded px-2 py-2"
								/>
								<select
									value={cfg.schedule.frequency}
									onChange={(e) => {
										const next = [...categoryConfigs]
										next[idx] = { ...cfg, schedule: { ...cfg.schedule, frequency: e.target.value as any } }
										setCategoryConfigs(next)
									}}
									className="border rounded px-2 py-2"
								>
									<option value="daily">Daily</option>
									<option value="weekly">Weekly</option>
									<option value="monthly">Monthly</option>
								</select>
								{cfg.schedule.frequency === 'weekly' ? (
									<select
										value={cfg.schedule.dayOfWeek ?? 1}
										onChange={(e) => {
											const next = [...categoryConfigs]
											next[idx] = { ...cfg, schedule: { ...cfg.schedule, dayOfWeek: Number(e.target.value) } }
											setCategoryConfigs(next)
										}}
										className="border rounded px-2 py-2"
									>
										<option value={0}>Sun</option>
										<option value={1}>Mon</option>
										<option value={2}>Tue</option>
										<option value={3}>Wed</option>
										<option value={4}>Thu</option>
										<option value={5}>Fri</option>
										<option value={6}>Sat</option>
									</select>
								) : cfg.schedule.frequency === 'monthly' ? (
									<input
										type="number"
										min={1}
										max={28}
										value={cfg.schedule.dayOfMonth ?? 1}
										onChange={(e) => {
											const next = [...categoryConfigs]
											next[idx] = { ...cfg, schedule: { ...cfg.schedule, dayOfMonth: Number(e.target.value) } }
											setCategoryConfigs(next)
										}}
										placeholder="Day"
										className="border rounded px-2 py-2"
									/>
								) : (
									<div className="h-10" />
								)}
								<div className="grid grid-cols-2 gap-2 md:col-span-2 md:grid-cols-2">
									<input
										type="text"
										value={cfg.schedule.timeLocal}
										onChange={(e) => {
											const next = [...categoryConfigs]
											next[idx] = { ...cfg, schedule: { ...cfg.schedule, timeLocal: e.target.value } }
											setCategoryConfigs(next)
										}}
										placeholder="Time (HH:MM)"
										className="border rounded px-2 py-2"
									/>
									<input
										type="text"
										value={cfg.schedule.timezone || 'America/Chicago'}
										onChange={(e) => {
											const next = [...categoryConfigs]
											next[idx] = { ...cfg, schedule: { ...cfg.schedule, timezone: e.target.value } }
											setCategoryConfigs(next)
										}}
										placeholder="Timezone"
										className="border rounded px-2 py-2"
									/>
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	</div>
	)
}