import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'

export function initAnalytics() {
  if (!key) return
  posthog.init(key, {
    api_host: host,
    capture_pageview: false,  // on gere manuellement via usePageView
    persistence: 'localStorage',
    autocapture: true,
    session_recording: {
      maskAllInputs: true,     // securite: masquer les champs de saisie
    },
  })
}

export function identifyUser(userId, traits = {}) {
  if (!key) return
  posthog.identify(userId, traits)
}

export function resetUser() {
  if (!key) return
  posthog.reset()
}

export { posthog }
