"use client"

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'

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
	const [negativeInstructions, setNegativeInstructions] = useState('')
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
  // Category plans (5 rows)
  const [categoryConfigs, setCategoryConfigs] = useState<Array<{
    category: string
    topics: string[]
    schedule: { frequency: 'daily' | 'weekly' | 'monthly'; dayOfWeek?: number; dayOfMonth?: number; timeLocal: string; timezone?: string }
  }>>([
    { category: '', topics: ['', '', '', '', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
    { category: '', topics: ['', '', '', '', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
    { category: '', topics: ['', '', '', '', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
    { category: '', topics: ['', '', '', '', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
    { category: '', topics: ['', '', '', '', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } },
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
					if (typeof cfg.negativeInstructions === 'string') setNegativeInstructions(cfg.negativeInstructions)
					if (cfg.slot && CONTENT_GUIDELINES[cfg.slot]) setSlot(cfg.slot)
					if (Array.isArray(cfg.categoryConfigs)) {
						const existingConfigs = cfg.categoryConfigs
						const padded = [...existingConfigs]
						while (padded.length < 5) {
							padded.push({ category: '', topics: ['', '', '', '', ''], schedule: { frequency: 'weekly', dayOfWeek: 1, timeLocal: '10:00', timezone: 'America/Chicago' } })
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
						negativeInstructions: negativeInstructions || undefined,
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

	// Per-row publish using the row's topic/example
	async function publishRow(idx: number) {
		const topics = categoryConfigs[idx]?.topics || []
		const primary = topics[0]?.trim()
		if (!primary) return
		setTopic(primary)
		await handleGenerate({ preventDefault: () => {} } as any)
	}

	// Per-row save (saves all configs, but keeps UX local)
	async function saveRow(idx: number) {
		await saveInstructions()
	}

  return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<PageHeader title="Blog" />

				{/* 1) Rows at the top */}
				<div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
					<h3 className="text-base font-semibold text-gray-900 mb-3">Category Plans (5 rows)</h3>
					<div className="grid grid-cols-1 gap-3">
						{categoryConfigs.map((cfg, idx) => {
							const t = (i: number) => cfg.topics[i] || ''
							return (
								<div key={idx} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-start border rounded p-3">
									<input type="text" value={cfg.category} onChange={(e) => { const next = [...categoryConfigs]; next[idx] = { ...cfg, category: e.target.value }; setCategoryConfigs(next) }} placeholder="Category" className="border rounded px-2 py-2" />
									<input type="text" value={t(0)} onChange={(e) => { const next = [...categoryConfigs]; const topics = [...cfg.topics]; topics[0] = e.target.value; next[idx] = { ...cfg, topics }; setCategoryConfigs(next) }} placeholder="Topic a" className="border rounded px-2 py-2" />
									<input type="text" value={t(1)} onChange={(e) => { const next = [...categoryConfigs]; const topics = [...cfg.topics]; topics[1] = e.target.value; next[idx] = { ...cfg, topics }; setCategoryConfigs(next) }} placeholder="Topic b" className="border rounded px-2 py-2" />
									<input type="text" value={t(2)} onChange={(e) => { const next = [...categoryConfigs]; const topics = [...cfg.topics]; topics[2] = e.target.value; next[idx] = { ...cfg, topics }; setCategoryConfigs(next) }} placeholder="Topic c" className="border rounded px-2 py-2" />
									<input type="text" value={t(3)} onChange={(e) => { const next = [...categoryConfigs]; const topics = [...cfg.topics]; topics[3] = e.target.value; next[idx] = { ...cfg, topics }; setCategoryConfigs(next) }} placeholder="Topic d" className="border rounded px-2 py-2" />
									<input type="text" value={t(4)} onChange={(e) => { const next = [...categoryConfigs]; const topics = [...cfg.topics]; topics[4] = e.target.value; next[idx] = { ...cfg, topics }; setCategoryConfigs(next) }} placeholder="Topic e" className="border rounded px-2 py-2" />
									<select value={cfg.schedule.frequency} onChange={(e) => { const next = [...categoryConfigs]; next[idx] = { ...cfg, schedule: { ...cfg.schedule, frequency: e.target.value as any } }; setCategoryConfigs(next) }} className="border rounded px-2 py-2">
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
										<option value="monthly">Monthly</option>
									</select>
									{cfg.schedule.frequency === 'weekly' ? (
										<select value={cfg.schedule.dayOfWeek ?? 1} onChange={(e) => { const next = [...categoryConfigs]; next[idx] = { ...cfg, schedule: { ...cfg.schedule, dayOfWeek: Number(e.target.value) } }; setCategoryConfigs(next) }} className="border rounded px-2 py-2">
											<option value={0}>Sun</option>
											<option value={1}>Mon</option>
											<option value={2}>Tue</option>
											<option value={3}>Wed</option>
											<option value={4}>Thu</option>
											<option value={5}>Fri</option>
											<option value={6}>Sat</option>
										</select>
									) : cfg.schedule.frequency === 'monthly' ? (
										<input type="number" min={1} max={28} value={cfg.schedule.dayOfMonth ?? 1} onChange={(e) => { const next = [...categoryConfigs]; next[idx] = { ...cfg, schedule: { ...cfg.schedule, dayOfMonth: Number(e.target.value) } }; setCategoryConfigs(next) }} placeholder="Day" className="border rounded px-2 py-2" />
									) : null}
									<input type="text" value={cfg.schedule.timeLocal} onChange={(e) => { const next = [...categoryConfigs]; next[idx] = { ...cfg, schedule: { ...cfg.schedule, timeLocal: e.target.value } }; setCategoryConfigs(next) }} placeholder="Time (HH:MM)" className="border rounded px-2 py-2" />
									<input type="text" value={cfg.schedule.timezone || 'America/Chicago'} onChange={(e) => { const next = [...categoryConfigs]; next[idx] = { ...cfg, schedule: { ...cfg.schedule, timezone: e.target.value } }; setCategoryConfigs(next) }} placeholder="Timezone" className="border rounded px-2 py-2" />
									<div className="flex gap-2 md:col-span-2">
										<button type="button" onClick={() => saveRow(idx)} className="px-3 py-2 rounded bg-gray-700 text-white">Save</button>
										<button type="button" onClick={() => publishRow(idx)} className="px-3 py-2 rounded bg-emerald-600 text-white">Publish</button>
									</div>
								</div>
							)
						})}
          </div>
        </div>

				{/* 2) Additional instructions below rows */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<h2 className="text-base font-semibold text-blue-900 mb-2">General configuration</h2>
					<p className="text-blue-800 text-xs mb-3">Saved settings will be used by default.</p>

					<form onSubmit={handleGenerate} className="flex flex-col gap-3">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							<select value={slot} onChange={(e) => setSlot(e.target.value as any)} className="border rounded px-2 py-2">
								{Object.keys(CONTENT_GUIDELINES).map((k) => (
									<option key={k} value={k}>{k}</option>
								))}
							</select>
							<input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Default category" className="border rounded px-2 py-2" />
						</div>
						<p className="text-xs text-gray-600">{CONTENT_GUIDELINES[slot]?.type}: {CONTENT_GUIDELINES[slot]?.description}</p>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<input type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Tone (e.g., practical)" className="w-full border rounded px-3 py-2" />
							<input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience (e.g., founders)" className="w-full border rounded px-3 py-2" />
							<input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Keywords (comma-separated)" className="w-full border rounded px-3 py-2" />
						</div>

						<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Generic instructions (style, CTA, must-have)" className="w-full border rounded px-3 py-2 min-h-[100px]" />
						<textarea value={negativeInstructions} onChange={(e) => setNegativeInstructions(e.target.value)} placeholder="Negative instructions (avoid, exclude)" className="w-full border rounded px-3 py-2 min-h-[80px]" />
						<textarea value={outline} onChange={(e) => setOutline(e.target.value)} placeholder={'Outline (one item per line)'} className="w-full border rounded px-3 py-2 min-h-[100px]" />

						<div className="flex gap-3 flex-wrap">
							<button type="button" onClick={saveInstructions} disabled={saving} className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
							<button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">{loading ? 'Generating…' : 'Publish Now'}</button>
						</div>
					</form>
				</div>

			</div>
		</div>
  )
} 