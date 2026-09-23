import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/apiGuards';
import { saveUploadedImage, UploadValidationError } from '@/lib/uploads';

export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard.error) return guard.error;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const image = await saveUploadedImage(buffer);
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
