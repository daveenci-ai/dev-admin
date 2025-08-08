import { NextResponse } from 'next/server'

export function ok<T>(data: T) {
  return NextResponse.json(data)
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status: 400 })
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function notFound(message = 'Not Found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal server error', details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status: 500 })
}


