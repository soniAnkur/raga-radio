import { NextResponse } from 'next/server';
import features from '@/src/features.js';
import { isApiKeyRequired } from '@/src/utils/apiKey.js';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      features: { ...features, requiresKey: isApiKeyRequired() },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
