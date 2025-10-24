import { geminiClient } from './gemini-client'
import sharp from 'sharp'
import {
  VisualizationRequest,
  VisualizationResult,
  AIError,
} from '@/types/ai'

/**
 * Generate visualizations from document data
 * Uses Gemini 2.0 Flash for image generation
 */

/**
 * Generate a chart or infographic from data
 */
export async function generateVisualization(
  request: VisualizationRequest
): Promise<VisualizationResult> {
  try {
    if (request.type === 'chart') {
      return await generateChart(request)
    } else if (request.type === 'infographic') {
      return await generateInfographic(request)
    } else {
      return await generateDiagram(request)
    }
  } catch (error) {
    console.error('Visualization generation error:', error)
    throw new AIError(
      error instanceof Error ? error.message : 'Failed to generate visualization',
      'VISUALIZATION_ERROR',
      false,
      error
    )
  }
}

/**
 * Generate a chart using SVG and sharp
 */
async function generateChart(request: VisualizationRequest): Promise<VisualizationResult> {
  const { data, chartType = 'bar', style = 'modern', colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] } = request

  // Generate SVG based on chart type
  let svg: string

  switch (chartType) {
    case 'bar':
      svg = generateBarChartSVG(data, { style, colors })
      break
    case 'line':
      svg = generateLineChartSVG(data, { style, colors })
      break
    case 'pie':
      svg = generatePieChartSVG(data, { style, colors })
      break
    default:
      svg = generateBarChartSVG(data, { style, colors })
  }

  // Convert SVG to PNG using sharp
  const imageBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()

  const metadata = await sharp(imageBuffer).metadata()

  return {
    imageBuffer,
    metadata: {
      width: metadata.width || 800,
      height: metadata.height || 600,
      format: 'png',
      generated: new Date().toISOString(),
    },
  }
}

/**
 * Generate bar chart SVG
 */
function generateBarChartSVG(
  data: any,
  options: { style: string; colors: string[] }
): string {
  const width = 800
  const height = 600
  const padding = 60
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  // Extract data
  const items = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ label: key, value }))
  const maxValue = Math.max(...items.map((item: any) => Number(item.value) || 0))
  const barWidth = chartWidth / items.length * 0.8

  // Generate bars
  const bars = items.map((item: any, index: number) => {
    const value = Number(item.value) || 0
    const barHeight = (value / maxValue) * chartHeight
    const x = padding + (index * chartWidth / items.length) + (chartWidth / items.length - barWidth) / 2
    const y = height - padding - barHeight
    const color = options.colors[index % options.colors.length]

    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4"/>
      <text x="${x + barWidth / 2}" y="${height - padding + 20}" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
        ${String(item.label).substring(0, 10)}
      </text>
      <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#333">
        ${value}
      </text>
    `
  }).join('')

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Y-axis -->
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ccc" stroke-width="2"/>
      
      <!-- X-axis -->
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ccc" stroke-width="2"/>
      
      <!-- Bars -->
      ${bars}
      
      <!-- Title -->
      <text x="${width / 2}" y="30" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#333">
        Chart
      </text>
    </svg>
  `
}

/**
 * Generate line chart SVG
 */
function generateLineChartSVG(
  data: any,
  options: { style: string; colors: string[] }
): string {
  const width = 800
  const height = 600
  const padding = 60
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  const items = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ label: key, value }))
  const maxValue = Math.max(...items.map((item: any) => Number(item.value) || 0))

  // Generate points
  const points = items.map((item: any, index: number) => {
    const value = Number(item.value) || 0
    const x = padding + (index / (items.length - 1)) * chartWidth
    const y = height - padding - (value / maxValue) * chartHeight
    return `${x},${y}`
  }).join(' ')

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Axes -->
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ccc" stroke-width="2"/>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ccc" stroke-width="2"/>
      
      <!-- Line -->
      <polyline points="${points}" fill="none" stroke="${options.colors[0]}" stroke-width="3"/>
      
      <!-- Points -->
      ${items.map((item: any, index: number) => {
        const value = Number(item.value) || 0
        const x = padding + (index / (items.length - 1)) * chartWidth
        const y = height - padding - (value / maxValue) * chartHeight
        return `<circle cx="${x}" cy="${y}" r="4" fill="${options.colors[0]}"/>`
      }).join('')}
      
      <!-- Title -->
      <text x="${width / 2}" y="30" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#333">
        Line Chart
      </text>
    </svg>
  `
}

/**
 * Generate pie chart SVG
 */
function generatePieChartSVG(
  data: any,
  options: { style: string; colors: string[] }
): string {
  const width = 800
  const height = 600
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3

  const items = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ label: key, value }))
  const total = items.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0)

  let currentAngle = -90 // Start at top

  const slices = items.map((item: any, index: number) => {
    const value = Number(item.value) || 0
    const angle = (value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle

    const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
    const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
    const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
    const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)

    const largeArc = angle > 180 ? 1 : 0
    const color = options.colors[index % options.colors.length]

    currentAngle = endAngle

    const midAngle = (startAngle + endAngle) / 2
    const labelX = centerX + (radius * 0.7) * Math.cos((midAngle * Math.PI) / 180)
    const labelY = centerY + (radius * 0.7) * Math.sin((midAngle * Math.PI) / 180)

    return `
      <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="#fff" stroke-width="2"/>
      <text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#fff">
        ${Math.round((value / total) * 100)}%
      </text>
    `
  }).join('')

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      ${slices}
      <text x="${width / 2}" y="30" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#333">
        Pie Chart
      </text>
    </svg>
  `
}

/**
 * Generate infographic using Gemini
 */
async function generateInfographic(request: VisualizationRequest): Promise<VisualizationResult> {
  // For infographics, we'll create a descriptive SVG
  // In production, you might use Gemini's image generation capabilities
  const svg = `
    <svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="1200" fill="#f0f9ff"/>
      <text x="400" y="60" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="#0369a1">
        Infographic
      </text>
      <text x="400" y="100" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">
        Generated from document data
      </text>
      <!-- Add more infographic elements here -->
    </svg>
  `

  const imageBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()

  const metadata = await sharp(imageBuffer).metadata()

  return {
    imageBuffer,
    metadata: {
      width: metadata.width || 800,
      height: metadata.height || 1200,
      format: 'png',
      generated: new Date().toISOString(),
    },
  }
}

/**
 * Generate diagram
 */
async function generateDiagram(request: VisualizationRequest): Promise<VisualizationResult> {
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#ffffff"/>
      <text x="400" y="300" text-anchor="middle" font-family="Arial" font-size="24" fill="#333">
        Diagram Generation
      </text>
    </svg>
  `

  const imageBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()

  const metadata = await sharp(imageBuffer).metadata()

  return {
    imageBuffer,
    metadata: {
      width: metadata.width || 800,
      height: metadata.height || 600,
      format: 'png',
      generated: new Date().toISOString(),
    },
  }
}

