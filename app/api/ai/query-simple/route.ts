import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { geminiClient } from '@/lib/ai/gemini-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { documentId, query } = body

    if (!documentId || !query) {
      return NextResponse.json(
        { success: false, error: 'Document ID and query are required' },
        { status: 400 }
      )
    }

    // Fetch document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    if (!document.extractedText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document text not available. Please ensure the document has been processed.',
        },
        { status: 400 }
      )
    }

    // Generate AI response
    const prompt = `Based on the following document content, please answer this question: "${query}"

Document Content:
${document.extractedText.substring(0, 50000)} ${/* Limit to 50k chars */ ''}

Please provide a clear and concise answer.`

    const result = await geminiClient.generate(prompt)
    const response = result.response.text()

    // Save query to database
    const savedQuery = await prisma.aIQuery.create({
      data: {
        documentId,
        userId: user.id,
        query: query.trim(),
        response,
        model: 'gemini-2.0-flash-exp',
      },
    })

    return NextResponse.json({
      success: true,
      queryId: savedQuery.id,
      response,
    })
  } catch (error) {
    console.error('AI query error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process query',
      },
      { status: 500 }
    )
  }
}

