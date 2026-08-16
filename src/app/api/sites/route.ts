import { NextResponse } from 'next/server'
import { getSites } from '@/lib/aggregate'
import { DokployApiError } from '@/lib/dokploy'

export async function GET() {
  try {
    const data = await getSites()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof DokployApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 })
  }
}
