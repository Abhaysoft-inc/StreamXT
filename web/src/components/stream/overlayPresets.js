export const DEFAULT_OVERLAYS = {
  // Active scene overlay ('none' | 'starting' | 'brb' | 'ending')
  sceneMode: 'none',
  sceneTitle: 'Stream Starting Soon',
  sceneSubtitle: 'Grab a coffee — going live shortly',
  sceneDimOpacity: 0.85,

  // Countdown timer (used in scene or standalone widget)
  countdownSeconds: 300,
  countdownRunning: false,

  // Lower-third banner
  showLowerThird: false,
  lowerThirdTitle: 'Live on StreamXT',
  lowerThirdSubtitle: 'Drop your questions in chat',
  lowerThirdStyle: 'modern', // 'modern' | 'glass' | 'minimal' | 'block' | 'broadcast'
  lowerThirdAlign: 'left', // 'left' | 'center' | 'right'

  // Scrolling ticker
  showTicker: false,
  tickerText: 'Welcome to the stream! Subscribe and drop your questions in chat.',
  tickerSpeed: 'normal', // 'slow' | 'normal' | 'fast'
  tickerPosition: 'bottom', // 'bottom' | 'top'

  // CTA / Promo banner
  showCta: false,
  ctaLabel: 'Subscribe',
  ctaText: '@streamxt · New streams every week',

  // Status & clock widgets
  showLiveBadge: false,
  liveBadgeLabel: 'LIVE', // 'LIVE' | 'ON AIR' | 'REC'
  showClockWidget: false,
  clockMode: 'elapsed', // 'elapsed' | 'clock' | 'countdown'
  clockPosition: 'top-right', // 'top-left' | 'top-right' | 'bottom-right'

  // Camera PIP (screen layout)
  pipPosition: 'bottom-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  pipSize: 'md', // 'sm' | 'md' | 'lg'
  pipShape: 'rounded', // 'rounded' | 'square' | 'circle'

  // Stage visual style
  videoFilter: 'none', // 'none' | 'warm' | 'cool' | 'bw' | 'contrast'
  stageBackground: 'solid', // 'solid' | 'grid' | 'stripes' | 'glow'

  // Custom uploaded image / PNG frame layers
  // Each item: { id, name, dataUrl, position, scale, opacity, visible }
  imageLayers: [],
}

export const OVERLAY_PRESETS = [
  {
    id: 'clean',
    name: 'Clean Stage',
    description: 'Reset all banners, scenes, and widgets',
    patch: {
      sceneMode: 'none',
      countdownRunning: false,
      showLowerThird: false,
      showTicker: false,
      showCta: false,
      showLiveBadge: false,
      showClockWidget: false,
    },
  },
  {
    id: 'broadcast-news',
    name: 'Broadcast Desk',
    description: 'Lower-third headline + bottom ticker + LIVE badge',
    patch: {
      sceneMode: 'none',
      showLowerThird: true,
      lowerThirdStyle: 'broadcast',
      lowerThirdAlign: 'left',
      lowerThirdTitle: 'Live Stream Session',
      lowerThirdSubtitle: 'Ask questions anytime in the chat',
      showTicker: true,
      tickerPosition: 'bottom',
      tickerSpeed: 'normal',
      showLiveBadge: true,
      liveBadgeLabel: 'LIVE',
      showClockWidget: true,
      clockMode: 'elapsed',
      clockPosition: 'top-right',
    },
  },
  {
    id: 'qa-ama',
    name: 'Q&A / AMA',
    description: 'Centered glass banner + CTA promo card',
    patch: {
      sceneMode: 'none',
      showLowerThird: true,
      lowerThirdStyle: 'glass',
      lowerThirdAlign: 'center',
      lowerThirdTitle: 'Ask Me Anything',
      lowerThirdSubtitle: 'Drop your questions in chat to get featured',
      showCta: true,
      ctaLabel: 'Join In',
      ctaText: 'Chat is open — questions featured live',
      showTicker: false,
      showLiveBadge: true,
      liveBadgeLabel: 'ON AIR',
    },
  },
  {
    id: 'starting-soon',
    name: 'Starting Soon Scene',
    description: 'Full-screen intro card with 5:00 countdown',
    patch: {
      sceneMode: 'starting',
      sceneTitle: 'Stream Starting Soon',
      sceneSubtitle: 'Sit tight — we are getting everything ready',
      countdownSeconds: 300,
      countdownRunning: true,
    },
  },
  {
    id: 'brb-scene',
    name: 'Be Right Back Scene',
    description: 'Full-screen intermission overlay',
    patch: {
      sceneMode: 'brb',
      sceneTitle: 'Be Right Back',
      sceneSubtitle: 'Taking a short break — stay tuned!',
      countdownRunning: false,
    },
  },
  {
    id: 'ending-scene',
    name: 'Stream Ending Scene',
    description: 'Closing thank-you screen overlay',
    patch: {
      sceneMode: 'ending',
      sceneTitle: 'Thanks for Watching',
      sceneSubtitle: 'Subscribe and catch the next stream!',
      countdownRunning: false,
    },
  },
]
