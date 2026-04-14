import { NextResponse } from 'next/server';
import { instruments } from '@/src/data/instruments.js';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      instruments: Object.values(instruments).map((i: any) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        role: i.role,
        sunoDesc: i.sunoDesc,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
