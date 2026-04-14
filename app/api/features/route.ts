import { NextResponse } from 'next/server';
import features from '@/src/features.js';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      features,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
