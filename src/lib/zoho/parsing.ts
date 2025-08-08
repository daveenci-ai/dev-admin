// Extracted helpers concerned with cleaning/parsing email content

export function cleanEmailText(text: string): string {
  let cleaned = text
  const utf8Fixes: Record<string, string> = {
    'â€™': "'",
    'â€œ': '"',
    'â€': '"',
    'â€"': '—',
    'â€¦': '...',
    'â€¢': '•',
    'â€š': ',',
    'â€ž': '"',
    'â€º': '›',
    'â€¹': '‹',
    'Â ': ' ',
    'Â': '',
    'â': '',
    'â€™ll': "'ll",
    'â€™t': "'t",
    'â€™s': "'s",
    'â€™re': "'re",
    'â€™ve': "'ve",
    'â€™d': "'d",
    'weâ€™ll': "we'll",
    'youâ€™ll': "you'll",
    'Iâ€™ll': "I'll",
    'itâ€™s': "it's",
    'thatâ€™s': "that's",
    'donâ€™t': "don't",
    'canâ€™t': "can't",
    'wonâ€™t': "won't",
    'â€‹': '',
    'â€Œ': '',
    'â€¯': ' ',
    'âˆ': '',
    'â†': '',
    'â„': '',
    'âœ': '',
    'â˜': '',
  }
  for (const [bad, good] of Object.entries(utf8Fixes)) cleaned = cleaned.replace(new RegExp(bad, 'gi'), good)

  cleaned = cleaned
    .replace(/<br\s*\/?>(?=\s|$)/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
  cleaned = cleaned.replace(/style\s*=\s*"[^"]*"/gi, '')
  cleaned = cleaned.replace(/class\s*=\s*"[^"]*"/gi, '')
  cleaned = cleaned.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16))
    } catch {
      return match
    }
  })
  cleaned = cleaned.replace(/=\s*$/gm, '')

  const htmlEntities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '...',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
  }
  for (const [entity, char] of Object.entries(htmlEntities)) cleaned = cleaned.replace(new RegExp(entity, 'gi'), char)

  cleaned = cleaned.replace(/&#(\d+);/g, (match, num) => {
    try {
      return String.fromCharCode(parseInt(num))
    } catch {
      return match
    }
  })

  cleaned = cleaned
    .replace(/\u00A0/g, ' ')
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '—')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '•')

  cleaned = cleaned.replace(/(<img[^>]*>|cid:\S+)/gi, '[Image]')
  cleaned = cleaned.replace(/mailto:\S+/gi, '[Email Link]')
  cleaned = cleaned.replace(/={10,}/g, '---')
  cleaned = cleaned.replace(/Forwarded message/gi, 'Forwarded message')
  cleaned = cleaned.replace(/--[\w\-_]+(\r?\n|$)/g, '')
  cleaned = cleaned.replace(/Content-[^:]+:[^\r\n]*/gi, '')
  cleaned = cleaned.replace(/MIME-[^:]+:[^\r\n]*/gi, '')
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .replace(/(\w)\n([a-z])/g, '$1 $2')
    .replace(/(\w)\n(\w)/g, '$1 $2')
    .replace(/([,.;:])\n([A-Z])/g, '$1 $2')
    .trim()
  return cleaned
}

export function extractEmailPreview(emailSource: string): string {
  try {
    const lines = emailSource.split('\n')
    let bodyStartIndex = -1
    let inHeaders = true
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (inHeaders && line.trim() === '') {
        bodyStartIndex = i + 1
        inHeaders = false
        break
      }
    }
    if (bodyStartIndex === -1 || bodyStartIndex >= lines.length) return ''

    const contentLines: string[] = []
    let foundContentLines = 0
    for (let i = bodyStartIndex; i < lines.length && foundContentLines < 3; i++) {
      const line = lines[i].trim()
      if (
        line === '' ||
        line.startsWith('--') ||
        line.startsWith('Content-') ||
        line.startsWith('MIME-') ||
        line.includes('boundary=') ||
        line.match(/^[a-zA-Z-]+:/) ||
        (line.startsWith('<') && line.endsWith('>'))
      )
        continue
      const cleanLine = cleanEmailText(line)
      if (cleanLine && cleanLine.length > 2 && /[a-zA-Z0-9]/.test(cleanLine)) {
        contentLines.push(cleanLine)
        foundContentLines++
      }
    }
    const preview = contentLines.join(' ').substring(0, 200)
    return preview.length === 200 ? preview + '...' : preview
  } catch (err) {
    return ''
  }
}

export function extractFullEmailContent(emailSource: string): string {
  try {
    const lines = emailSource.split('\n')
    let bodyStartIndex = -1
    let inHeaders = true
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (inHeaders && line.trim() === '') {
        bodyStartIndex = i + 1
        inHeaders = false
        break
      }
    }
    if (bodyStartIndex === -1 || bodyStartIndex >= lines.length) return 'No content available'

    let inHTMLBody = false
    let htmlContent = ''
    const plainContent: string[] = []
    for (let i = bodyStartIndex; i < lines.length; i++) {
      const line = lines[i]
      if (
        line.startsWith('--') ||
        line.startsWith('Content-') ||
        line.startsWith('MIME-') ||
        line.includes('boundary=')
      )
        continue
      if (
        line.includes('<html') ||
        line.includes('<body') ||
        line.includes('<div') ||
        line.includes('<p>') ||
        line.includes('<h1') ||
        line.includes('<h2') ||
        line.includes('<h3') ||
        line.includes('<ul>') ||
        line.includes('<li>')
      )
        inHTMLBody = true
      if (inHTMLBody) htmlContent += line + '\n'
      else {
        const trimmedLine = line.trim()
        if (trimmedLine && !trimmedLine.match(/^[a-zA-Z-]+:/) && /[a-zA-Z0-9]/.test(trimmedLine)) {
          const cleanLine = cleanEmailText(trimmedLine)
          if (cleanLine) plainContent.push(cleanLine)
        }
      }
    }
    if (inHTMLBody && htmlContent.trim()) {
      return htmlContent.replace(/style="[^"]*"/gi, '').replace(/on\w+="[^"]*"/gi, '').trim()
    } else {
      return enhancePlainTextFormatting(plainContent.join('\n'))
    }
  } catch (err) {
    return 'Error loading content'
  }
}

export function enhancePlainTextFormatting(text: string): string {
  if (!text || text.trim() === '') return 'No content available'
  let enhanced = text
  enhanced = enhanced.replace(/^[\s]*[•·*-]\s+(.+)$/gm, '<li>$1</li>')
  if (enhanced.includes('<li>')) enhanced = enhanced.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
  enhanced = enhanced.replace(/^(.+):[\s]*$/gm, '<h3>$1:</h3>')
  enhanced = enhanced.replace(/\n\n+/g, '</p><p>')
  enhanced = '<p>' + enhanced + '</p>'
  enhanced = enhanced.replace(/<p><\/p>/g, '').replace(/<p>\s*<\/p>/g, '')
  return enhanced.trim()
}


