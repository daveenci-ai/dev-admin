'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Brain, Send, Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react'

interface QueryResult {
  query: string
  sql: string
  explanation: string
  results: any[]
  resultCount: number
  executedAt: string
}

interface QueryInterfaceProps {
  onQueryExecuted: () => void
}

export function QueryInterface({ onQueryExecuted }: QueryInterfaceProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: query.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        onQueryExecuted()
      } else {
        setError(data.error || 'Failed to execute query')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Query error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Natural Language Query
          </CardTitle>
          <CardDescription>
            Ask questions about your data in plain English
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your data..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            
            <Button 
              type="submit" 
              disabled={!query.trim() || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Execute Query
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Query Failed</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Query Executed Successfully
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-green-800">Generated SQL:</label>
                  <div className="bg-green-100 p-3 rounded-lg mt-1">
                    <code className="text-sm text-green-900 font-mono break-all">
                      {result.sql}
                    </code>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-green-800">Explanation:</label>
                  <p className="text-green-700 text-sm mt-1">{result.explanation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Query Results ({result.resultCount} rows)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.results.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No results found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        {Object.keys(result.results[0]).map((header) => (
                          <th
                            key={header}
                            className="border border-gray-200 px-4 py-2 text-left text-sm font-medium"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.slice(0, 20).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {Object.values(row).map((value, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="border border-gray-200 px-4 py-2 text-sm"
                            >
                              {value !== null ? String(value) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 