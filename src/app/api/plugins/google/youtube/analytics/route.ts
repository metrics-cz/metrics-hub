import { NextRequest } from 'next/server'

/**
 * YOUTUBE ANALYTICS API ROUTE
 * 
 * Purpose: Access YouTube channel and video performance data
 * What YouTube Analytics provides:
 * - Video views, watch time, subscribers gained/lost
 * - Audience demographics and geography
 * - Traffic sources (how viewers find your videos)
 * - Revenue data (for monetized channels)
 * - Engagement metrics (likes, comments, shares)
 * 
 * This is essential for video marketing and content strategy plugins
 */

interface YouTubeAnalyticsRequest {
  channelId?: string          // YouTube channel ID (starts with "UC...")
  videoId?: string           // Specific video ID
  startDate: string          // Format: "YYYY-MM-DD"
  endDate: string            // Format: "YYYY-MM-DD" 
  metrics: string[]          // What to measure: ["views", "estimatedMinutesWatched", "subscribersGained"]
  dimensions?: string[]      // How to group: ["day", "country", "ageGroup", "gender"]
  filters?: string           // Optional filters like "country==US"
  maxResults?: number        // Max results (default: 200)
  sort?: string             // Sort by metric (e.g., "-views" for descending)
}

interface YouTubeChannelsResponse {
  items: Array<{
    id: string                // Channel ID
    snippet: {
      title: string           // Channel name
      description: string
      customUrl?: string      // Custom channel URL
      thumbnails: {
        default: { url: string }
        medium: { url: string }
        high: { url: string }
      }
    }
    statistics: {
      viewCount: string       // Total views across all videos
      subscriberCount: string // Total subscribers (may be hidden)
      videoCount: string      // Total uploaded videos
    }
  }>
}

interface YouTubeAnalyticsResponse {
  columnHeaders: Array<{
    name: string              // Column name like "day", "views"
    columnType: string        // "DIMENSION" or "METRIC"
    dataType: string          // "STRING", "INTEGER", etc.
  }>
  rows: Array<string[]>       // Data rows as arrays of strings
}

/**
 * GET ENDPOINT - Get YouTube channel information and basic analytics
 * 
 * URL: /api/plugins/google/youtube/analytics?channelId=UC123456&startDate=2024-01-01&endDate=2024-01-31
 * Returns: Channel info + basic performance metrics for date range
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract query parameters
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!startDate || !endDate) {
      return Response.json({ 
        error: 'startDate and endDate are required' 
      }, { status: 400 })
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return Response.json({ 
        error: 'Dates must be in YYYY-MM-DD format' 
      }, { status: 400 })
    }

    // TODO: Get OAuth access token from database
    const accessToken = 'ya29.a0...' // Your stored YouTube OAuth token

    // STEP 2: Get channel information first (if channelId provided)
    let channelInfo = null
    let targetChannelId = channelId

    if (channelId) {
      // Get specific channel info
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )

      if (channelResponse.ok) {
        const channelData: YouTubeChannelsResponse = await channelResponse.json()
        channelInfo = channelData.items[0] || null
      }
    } else {
      // Get user's own channel
      const myChannelResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )

      if (myChannelResponse.ok) {
        const channelData: YouTubeChannelsResponse = await myChannelResponse.json()
        channelInfo = channelData.items[0] || null
        targetChannelId = channelInfo?.id || null
      }
    }

    if (!targetChannelId) {
      return Response.json({ 
        error: 'No channel found or channel access denied' 
      }, { status: 404 })
    }

    // STEP 3: Get analytics data for the channel
    // Build the analytics API request
    const metricsParam = 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares'
    const dimensionsParam = 'day'
    
    const analyticsResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${targetChannelId}&startDate=${startDate}&endDate=${endDate}&metrics=${metricsParam}&dimensions=${dimensionsParam}&sort=day`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    if (!analyticsResponse.ok) {
      const error = await analyticsResponse.json()
      return Response.json({ 
        error: 'YouTube Analytics API error', 
        details: error 
      }, { status: analyticsResponse.status })
    }

    // STEP 4: Parse analytics response
    const analyticsData: YouTubeAnalyticsResponse = await analyticsResponse.json()

    // STEP 5: Transform to plugin-friendly format
    const headers = analyticsData.columnHeaders || []
    const dailyAnalytics = analyticsData.rows?.map(row => {
      const dayData: any = {}
      headers.forEach((header, index) => {
        const value = row[index]
        switch (header.name) {
          case 'day':
            dayData.date = value
            break
          case 'views':
            dayData.views = parseInt(value || '0')
            break
          case 'estimatedMinutesWatched':
            dayData.watchTimeMinutes = parseInt(value || '0')
            dayData.watchTimeHours = Math.round(parseInt(value || '0') / 60 * 100) / 100
            break
          case 'subscribersGained':
            dayData.subscribersGained = parseInt(value || '0')
            break
          case 'subscribersLost':
            dayData.subscribersLost = parseInt(value || '0')
            break
          case 'likes':
            dayData.likes = parseInt(value || '0')
            break
          case 'comments':
            dayData.comments = parseInt(value || '0')
            break
          case 'shares':
            dayData.shares = parseInt(value || '0')
            break
          default:
            dayData[header.name] = value
        }
      })
      return dayData
    }) || []

    // STEP 6: Calculate summary statistics
    const summary = {
      totalViews: dailyAnalytics.reduce((sum, day) => sum + (day.views || 0), 0),
      totalWatchTimeHours: dailyAnalytics.reduce((sum, day) => sum + (day.watchTimeHours || 0), 0),
      netSubscribers: dailyAnalytics.reduce((sum, day) => sum + (day.subscribersGained || 0) - (day.subscribersLost || 0), 0),
      totalLikes: dailyAnalytics.reduce((sum, day) => sum + (day.likes || 0), 0),
      totalComments: dailyAnalytics.reduce((sum, day) => sum + (day.comments || 0), 0),
      totalShares: dailyAnalytics.reduce((sum, day) => sum + (day.shares || 0), 0),
      averageViewDuration: dailyAnalytics.length > 0 ? 
        dailyAnalytics.reduce((sum, day) => sum + (day.watchTimeMinutes || 0), 0) / 
        dailyAnalytics.reduce((sum, day) => sum + (day.views || 0), 0) : 0
    }

    return Response.json({
      success: true,
      channel: channelInfo ? {
        id: channelInfo.id,
        name: channelInfo.snippet.title,
        description: channelInfo.snippet.description.substring(0, 200),
        customUrl: channelInfo.snippet.customUrl,
        thumbnail: channelInfo.snippet.thumbnails.medium?.url,
        totalViews: parseInt(channelInfo.statistics.viewCount || '0'),
        totalSubscribers: channelInfo.statistics.subscriberCount !== 'hidden' ? 
          parseInt(channelInfo.statistics.subscriberCount || '0') : null,
        totalVideos: parseInt(channelInfo.statistics.videoCount || '0')
      } : null,
      dateRange: { startDate, endDate },
      dailyAnalytics,
      summary,
      totalDays: dailyAnalytics.length
    })

  } catch (error) {
    console.error('YouTube Analytics API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Custom YouTube analytics queries
 * 
 * Usage: Complex analytics with custom metrics, dimensions, and filters
 * Body: { 
 *   channelId: "UC123456", 
 *   startDate: "2024-01-01", 
 *   endDate: "2024-01-31",
 *   metrics: ["views", "estimatedMinutesWatched"],
 *   dimensions: ["country", "ageGroup"],
 *   filters: "country==US"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: YouTubeAnalyticsRequest = await request.json()
    const { 
      channelId, 
      videoId,
      startDate, 
      endDate, 
      metrics,
      dimensions = [],
      filters,
      maxResults = 200,
      sort
    } = body

    if (!startDate || !endDate || !metrics || metrics.length === 0) {
      return Response.json({ 
        error: 'startDate, endDate, and metrics are required' 
      }, { status: 400 })
    }

    // TODO: Get OAuth access token from database
    const accessToken = 'ya29.a0...'

    // STEP 1: Determine the target (channel or video)
    let ids = ''
    if (channelId) {
      ids = `channel==${channelId}`
    } else if (videoId) {
      ids = `video==${videoId}`
    } else {
      return Response.json({ 
        error: 'Either channelId or videoId is required' 
      }, { status: 400 })
    }

    // STEP 2: Build query parameters
    const queryParams = new URLSearchParams({
      ids,
      startDate,
      endDate,
      metrics: metrics.join(','),
      maxResults: maxResults.toString()
    })

    if (dimensions.length > 0) {
      queryParams.append('dimensions', dimensions.join(','))
    }
    if (filters) {
      queryParams.append('filters', filters)
    }
    if (sort) {
      queryParams.append('sort', sort)
    }

    // STEP 3: Make analytics API call
    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${queryParams}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'YouTube Analytics API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 4: Return raw analytics response for custom queries
    const data = await response.json()
    return Response.json({
      success: true,
      query: { channelId, videoId, startDate, endDate, metrics, dimensions, filters },
      data
    })

  } catch (error) {
    console.error('YouTube Custom Analytics Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}